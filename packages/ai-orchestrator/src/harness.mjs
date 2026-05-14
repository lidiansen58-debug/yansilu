import { createAgentRegistry } from "./agent-registry.mjs";
import { buildAgentMessages } from "./agent-prompts.mjs";
import { createProviderAgentRuntime, createRuntimeToolBridge, normalizeAgentRuntime } from "./agent-runtime.mjs";
import { providerConfigToSettingsInput } from "./ai-provider-configs.mjs";
import { preferencesToSettingsInput } from "./ai-preferences.mjs";
import { createAiInbox } from "./artifact-inbox.mjs";
import { createInMemoryArtifactStore } from "./artifact-store.mjs";
import { normalizeArtifacts } from "./artifacts.mjs";
import { evaluateBudgetPrecheck } from "./budget-policy.mjs";
import { createCurrentNoteContextPack, createContextItem, createContextPack, createNotesContextPack } from "./context-pack.mjs";
import { resolveAiUserSettings } from "./model-packs.mjs";
import { resolveModelRoute } from "./model-router.mjs";
import { createProviderAdapterRegistry } from "./provider-adapter-registry.mjs";
import { assertProviderAllowedForContext } from "./provider-adapter.mjs";
import { createInMemoryRunLog } from "./run-log.mjs";
import { createToolRegistry } from "./tools.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function normalizeLimit(value, fallback = 8) {
  const limit = Number(value || fallback);
  if (!Number.isFinite(limit)) return fallback;
  return Math.max(1, Math.min(24, Math.floor(limit)));
}

function generatedId(prefix = "task") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function expectedArtifactTypeForAgent(agent) {
  return agent.outputArtifactTypes[0] || "ReflectionPrompt";
}

function budgetApprovalInput(input = {}) {
  return {
    confirmBudget: input.confirmBudget,
    confirm_budget: input.confirm_budget,
    confirmationApproved: input.confirmationApproved,
    confirmation_approved: input.confirmation_approved,
    budgetConfirmation: input.budgetConfirmation || input.budget_confirmation
  };
}

function throwBudgetPrecheckError(precheck) {
  if (precheck.status === "blocked") {
    const error = new Error("AI budget limit blocks this agent run.");
    error.code = "AI_BUDGET_EXCEEDED";
    error.budgetPrecheck = precheck;
    return error;
  }

  const error = new Error("This agent run requires cost confirmation before calling a model.");
  error.code = "AI_BUDGET_CONFIRMATION_REQUIRED";
  error.runStatus = "requires_confirmation";
  error.budgetPrecheck = precheck;
  return error;
}

function noteFromToolOutput(output = {}, relevance = null) {
  return {
    id: output.noteId || output.note_id || output.id,
    title: output.title,
    body: output.body || output.content || "",
    origin: output.origin || "human_authored",
    privacyMode: output.privacyMode || output.privacy_mode || "normal",
    relevance: relevance || { score: 1, method: "explicit" }
  };
}

function selectedNoteIds(input = {}) {
  return toArray(input.noteIds || input.note_ids || input.selectedNoteIds || input.selected_note_ids)
    .map(cleanText)
    .filter(Boolean);
}

function searchSpecFromInput(input = {}) {
  if (input.searchNotes || input.search_notes) return input.searchNotes || input.search_notes;
  const query = cleanText(input.searchQuery || input.search_query);
  return query ? { query } : null;
}

function graphContextSpecFromInput(input = {}) {
  const raw = input.graphContext || input.graph_context;
  const requested = raw || input.includeGraphContext === true || input.include_graph_context === true;
  if (!requested) return null;
  const spec = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    includeTags: spec.includeTags !== false && spec.include_tags !== false,
    includeOutgoingLinks: spec.includeOutgoingLinks !== false && spec.include_outgoing_links !== false,
    includeBacklinks: spec.includeBacklinks !== false && spec.include_backlinks !== false,
    maxLinksPerNote: normalizeLimit(spec.maxLinksPerNote || spec.max_links_per_note, 12),
    maxSourceNotes: normalizeLimit(spec.maxSourceNotes || spec.max_source_notes || spec.maxGraphNotes || spec.max_graph_notes, 12)
  };
}

function mergeObjects(...values) {
  return Object.assign({}, ...values.filter((value) => value && typeof value === "object" && !Array.isArray(value)));
}

function modelRefFromSettings(input = {}) {
  return cleanText(input.modelRef || input.model_ref || input.advancedSettings?.modelRef || input.advancedSettings?.model_ref);
}

function localModelFromSettings(input = {}) {
  return cleanText(input.localModel || input.local_model || input.advancedSettings?.localModel || input.advancedSettings?.local_model);
}

function runtimeModeFromSettings(input = {}) {
  return cleanText(input.runtimeMode || input.runtime_mode || input.advancedSettings?.runtimeMode || input.advancedSettings?.runtime_mode)
    .toLowerCase()
    .replace(/[\s/-]+/g, "_");
}

function requestedModelTier(input = {}, agent = {}) {
  return cleanText(input.modelTier || input.model_tier || agent.defaultModelTier) || "standard";
}

function shouldPreferLocalForHybridRun({ settingsInput = {}, userSettings = {}, input = {}, agent = {}, privacyMode = "normal" } = {}) {
  if (privacyMode === "local_only") return { preferLocal: true, reason: "privacy_local_only" };
  if (input.forceCloud === true || input.force_cloud === true) return { preferLocal: false, reason: "force_cloud" };
  if (input.forceLocal === true || input.force_local === true) return { preferLocal: true, reason: "force_local" };

  const runtimeMode = runtimeModeFromSettings(settingsInput);
  const hybridEnabled = runtimeMode === "hybrid" || (userSettings.privacy?.localPreferred === true && userSettings.privacy?.allowCloud !== false);
  if (!hybridEnabled) return { preferLocal: false, reason: "hybrid_disabled" };
  if (!localModelFromSettings(settingsInput)) return { preferLocal: false, reason: "local_model_missing" };

  const agentId = cleanText(agent.agentId || agent.agent_id);
  const taskType = cleanText(input.taskType || input.task_type).toLowerCase();
  const tier = requestedModelTier(input, agent);
  if (agentId === "connection_agent") return { preferLocal: true, reason: "lightweight_agent" };
  if (["router_fast", "cheap_fast", "guardrail", "local_private"].includes(tier)) return { preferLocal: true, reason: "lightweight_tier" };
  if (/relation|link|tag|classif|summar|summary|title|quick/.test(taskType)) return { preferLocal: true, reason: "lightweight_task" };
  return { preferLocal: false, reason: "cloud_preferred_task" };
}

function settingsForHybridRun({ settingsInput = {}, userSettings = {}, input = {}, agent = {}, privacyMode = "normal" } = {}) {
  const decision = shouldPreferLocalForHybridRun({ settingsInput, userSettings, input, agent, privacyMode });
  if (!decision.preferLocal) return { settingsInput, decision };

  const localProviderPreset =
    cleanText(settingsInput.localProviderPreset || settingsInput.local_provider_preset || settingsInput.advancedSettings?.localProviderPreset || settingsInput.advancedSettings?.local_provider_preset) ||
    "local_private_gateway";
  const localModel = localModelFromSettings(settingsInput);
  const modelRef = localModel ? `${localProviderPreset}:${localModel}` : modelRefFromSettings(settingsInput);
  return {
    settingsInput: {
      ...settingsInput,
      providerPreset: localProviderPreset,
      provider_preset: localProviderPreset,
      authMode: cleanText(settingsInput.authMode || settingsInput.auth_mode) || "local_no_key",
      ...(modelRef ? { modelRef } : {}),
      advancedSettings: {
        ...(settingsInput.advancedSettings || settingsInput.advanced_settings || {}),
        ...(modelRef ? { modelRef } : {})
      }
    },
    decision: {
      ...decision,
      providerPreset: localProviderPreset,
      modelRef
    }
  };
}

function runIdentity(input = {}, options = {}) {
  return {
    userId: cleanText(input.userId || input.user_id || options.userId || options.user_id) || "local_user",
    workspaceId: cleanText(input.workspaceId || input.workspace_id || options.workspaceId || options.workspace_id) || "local_workspace"
  };
}

function explicitSettingsInput(input = {}) {
  const result = { ...input };
  for (const key of [
    "taskId",
    "task_id",
    "agentId",
    "agent_id",
    "currentNote",
    "current_note",
    "contextPack",
    "context_pack",
    "noteId",
    "note_id",
    "noteIds",
    "note_ids",
    "searchNotes",
    "search_notes",
    "graphContext",
    "graph_context",
    "includeGraphContext",
    "include_graph_context"
  ]) {
    delete result[key];
  }
  return result;
}

function relationSummary(link = {}, direction = "outgoing") {
  const adjacent = direction === "backlink" ? link.source || {} : link.target || {};
  return {
    id: cleanText(link.id),
    fromNoteId: cleanText(link.fromNoteId || link.from_note_id),
    toNoteId: cleanText(link.toNoteId || link.to_note_id),
    relationType: cleanText(link.relationType || link.relation_type),
    rationale: cleanText(link.rationale),
    confidence: link.confidence ?? null,
    adjacentNote: {
      id: cleanText(adjacent.id),
      title: cleanText(adjacent.title),
      noteType: cleanText(adjacent.noteType || adjacent.note_type),
      status: cleanText(adjacent.status)
    }
  };
}

function graphPayloadFromRelations(relations = {}, spec = {}) {
  const maxLinks = spec.maxLinksPerNote;
  return {
    noteId: cleanText(relations.noteId || relations.note_id),
    tags: spec.includeTags ? relations.tags || [] : [],
    outgoingLinks: spec.includeOutgoingLinks
      ? (relations.outgoingLinks || relations.outgoing_links || []).slice(0, maxLinks).map((link) => relationSummary(link, "outgoing"))
      : [],
    backlinks: spec.includeBacklinks
      ? (relations.backlinks || []).slice(0, maxLinks).map((link) => relationSummary(link, "backlink"))
      : []
  };
}

function graphContextItem(relations = {}, spec = {}, privacyMode = "normal") {
  const payload = graphPayloadFromRelations(relations, spec);
  return createContextItem({
    kind: "graph_neighborhood",
    sourceId: payload.noteId,
    title: `Graph neighborhood for ${payload.noteId}`,
    content: JSON.stringify(payload, null, 2),
    contentFormat: "json",
    origin: "system_retrieved",
    includedReason: "graph_neighborhood",
    relevance: { score: 0.75, method: "graph_neighborhood" },
    privacyMode,
    sourcePointer: {
      noteId: payload.noteId,
      blockIds: [],
      sourceDocId: null,
      artifactId: null
    }
  });
}

function sourceNoteIdsForGraphContext(contextPack = {}) {
  const ids = new Set();
  for (const item of contextPack.items || []) {
    if (item.kind !== "note") continue;
    const sourceId = cleanText(item.sourceId || item.source_id);
    if (sourceId) ids.add(sourceId);
  }
  return [...ids];
}

async function enrichContextPackWithGraphContext({ contextPack, spec, callToolAndLog } = {}) {
  if (!spec) return contextPack;
  const noteIds = sourceNoteIdsForGraphContext(contextPack);
  const selectedNoteIds = noteIds.slice(0, spec.maxSourceNotes);
  const graphItems = [];
  for (const noteId of selectedNoteIds) {
    const toolCall = await callToolAndLog("list_note_relations", { noteId }, { noteId, includedReason: "graph_neighborhood" });
    graphItems.push(graphContextItem(toolCall.output, spec, contextPack.privacy?.mode || "normal"));
  }

  return createContextPack({
    ...contextPack,
    privacyMode: contextPack.privacy?.mode || "normal",
    targetInputTokens: contextPack.budget?.targetInputTokens,
    maxItems: contextPack.budget?.maxItems,
    items: [...(contextPack.items || []), ...graphItems],
    omitted: [
      ...(contextPack.omitted || []),
      ...noteIds.slice(spec.maxSourceNotes).map((noteId) => ({
        kind: "graph_neighborhood",
        sourceId: noteId,
        reason: "graph_context_item_limit"
      }))
    ],
    retrievalTrace: [
      ...(contextPack.retrievalTrace || []),
      {
        step: "graph_neighborhood",
        tool: "list_note_relations",
        resultCount: noteIds.length,
        selectedCount: graphItems.length,
        includeTags: spec.includeTags,
        includeOutgoingLinks: spec.includeOutgoingLinks,
        includeBacklinks: spec.includeBacklinks
      }
    ]
  });
}

async function loadStoredPreferences(aiPreferencesStore, identity) {
  if (!aiPreferencesStore || typeof aiPreferencesStore.getUserPreferences !== "function") return null;
  return aiPreferencesStore.getUserPreferences(identity);
}

async function resolveRunSettings({ options, input, aiPreferencesStore }) {
  const identity = runIdentity(input, options);
  const storedPreferences = await loadStoredPreferences(aiPreferencesStore, identity);
  const storedSettings = preferencesToSettingsInput(storedPreferences);
  const callSettings = explicitSettingsInput(input);

  return {
    identity,
    storedPreferences,
    settingsInput: {
      ...options,
      ...storedSettings,
      ...callSettings,
      budget: mergeObjects(options.budget, storedSettings.budget, callSettings.budget),
      budgetState: mergeObjects(options.budgetState || options.budget_state, storedSettings.budgetState, callSettings.budgetState || callSettings.budget_state),
      advancedSettings: mergeObjects(
        options.advancedSettings || options.advanced_settings,
        storedSettings.advancedSettings,
        callSettings.advancedSettings || callSettings.advanced_settings
      ),
      fallbackPolicy: mergeObjects(
        options.fallbackPolicy || options.fallback_policy,
        storedSettings.fallbackPolicy,
        callSettings.fallbackPolicy || callSettings.fallback_policy
      ),
      privacy: mergeObjects(options.privacy, storedSettings.privacy, callSettings.privacy)
    }
  };
}

async function loadProviderConfig(providerConfigStore, settingsInput = {}, userSettings = {}) {
  if (!providerConfigStore || typeof providerConfigStore.getProviderConfig !== "function") return null;
  const providerId = cleanText(settingsInput.providerId || settingsInput.provider_id || settingsInput.providerPreset || settingsInput.provider_preset || userSettings.providerPreset);
  if (!providerId) return null;
  return providerConfigStore.getProviderConfig({ providerId });
}

function settingsWithProviderConfig(settingsInput = {}, providerConfig = null) {
  if (!providerConfig) return settingsInput;
  const configSettings = providerConfigToSettingsInput(providerConfig);
  const secretRef = cleanText(settingsInput.secretRef || settingsInput.secret_ref) || configSettings.secretRef;
  return {
    ...settingsInput,
    ...configSettings,
    secretRef,
    providerDescriptor: {
      ...(configSettings.providerDescriptor || {}),
      secretRef
    },
    runtimeModelMap: {
      ...(configSettings.runtimeModelMap || {}),
      ...(settingsInput.runtimeModelMap || settingsInput.runtime_model_map || {})
    }
  };
}

function latestProviderHealth(providerHealthStore = null, providerDescriptor = {}) {
  if (!providerHealthStore || typeof providerHealthStore.getLatestProviderHealth !== "function") return null;
  const providerId = cleanText(providerDescriptor.providerId || providerDescriptor.provider_id);
  if (!providerId) return null;
  return providerHealthStore.getLatestProviderHealth({ providerId });
}

function shouldBlockForProviderHealth(health = null, input = {}) {
  if (!health || cleanText(health.status) !== "down") return false;
  const trigger = cleanText(input.trigger) || "user_command";
  return trigger === "scheduled_task" || input.background === true;
}

export function createAiHarness(options = {}) {
  const registry = options.agentRegistry || createAgentRegistry(options.agentDefinitions);
  const runLog = options.runLog || createInMemoryRunLog();
  const providerAdapterRegistry = options.providerAdapterRegistry || createProviderAdapterRegistry(options);
  const fixedProviderAdapter = options.providerAdapter || null;
  let activeProviderAdapter = fixedProviderAdapter || providerAdapterRegistry.getAdapter(options).adapter;
  const fixedAgentRuntime = options.agentRuntime || options.agent_runtime ? normalizeAgentRuntime(options.agentRuntime || options.agent_runtime) : null;
  let activeAgentRuntime = fixedAgentRuntime || createProviderAgentRuntime({ providerAdapter: activeProviderAdapter });
  const toolRegistry = options.toolRegistry || createToolRegistry(options.tools || []);
  const artifactStore = options.artifactStore || createInMemoryArtifactStore();
  const artifactInbox = options.artifactInbox || createAiInbox({ artifactStore });
  const contextPackStore = options.contextPackStore || null;
  const aiPreferencesStore = options.aiPreferencesStore || null;
  const providerConfigStore = options.providerConfigStore || null;
  const providerHealthStore = options.providerHealthStore || null;

  return {
    registry,
    runLog,
    get providerAdapter() {
      return activeProviderAdapter;
    },
    get agentRuntime() {
      return activeAgentRuntime;
    },
    providerAdapterRegistry,
    toolRegistry,
    artifactStore,
    artifactInbox,
    contextPackStore,
    aiPreferencesStore,
    providerConfigStore,
    providerHealthStore,
    async runTask(input = {}) {
      const taskId = cleanText(input.taskId || input.task_id) || generatedId("task");
      const agentId = cleanText(input.agentId || input.agent_id) || "reflection_agent";
      const agent = registry.get(agentId);
      const { identity, storedPreferences, settingsInput: baseSettingsInput } = await resolveRunSettings({ options, input, aiPreferencesStore });
      const baseUserSettings = resolveAiUserSettings(baseSettingsInput);
      const privacyMode =
        cleanText(input.contextPack?.privacy?.mode || input.privacyMode || input.privacy_mode) ||
        baseUserSettings.privacy.defaultMode ||
        "normal";
      const hybridRun = settingsForHybridRun({ settingsInput: baseSettingsInput, userSettings: baseUserSettings, input, agent, privacyMode });
      const providerConfig = fixedProviderAdapter ? null : await loadProviderConfig(providerConfigStore, hybridRun.settingsInput, baseUserSettings);
      const settingsInput = settingsWithProviderConfig(hybridRun.settingsInput, providerConfig);
      const userSettings = resolveAiUserSettings(settingsInput);
      const adapterSelection = fixedProviderAdapter
        ? { adapter: fixedProviderAdapter, source: "explicit", descriptor: fixedProviderAdapter.descriptor }
        : providerAdapterRegistry.getAdapter(settingsInput);
      const providerAdapter = adapterSelection.adapter;
      activeProviderAdapter = providerAdapter;
      const agentRuntime = fixedAgentRuntime || createProviderAgentRuntime({ providerAdapter });
      activeAgentRuntime = agentRuntime;
      const run = runLog.startRun({
        taskId,
        agentId: agent.agentId,
        agentVersion: agent.agentVersion,
        trigger: input.trigger || "user_command",
        taskType: input.taskType || "reflection",
        userMode: userSettings.userMode,
        modelPack: userSettings.modelPack,
        privacyMode,
        modelTier: input.modelTier || agent.defaultModelTier
      });

      try {
        runLog.addEvent(run.agentRunId, {
          eventType: "provider_adapter_selected",
          summary: {
            providerId: providerAdapter.descriptor.providerId,
            adapterType: providerAdapter.descriptor.adapterType,
            providerPreset: userSettings.providerPreset,
            hybridRoutingReason: hybridRun.decision?.preferLocal ? hybridRun.decision.reason : "",
            adapterSource: adapterSelection.source,
            authMode: providerAdapter.descriptor.authMode || userSettings.authMode,
            providerConfigId: providerConfig?.id || "",
            endpointConfigured: Boolean(providerAdapter.descriptor.endpointUrl),
            secretRefConfigured: Boolean(providerAdapter.descriptor.secretRef)
          }
        });
        if (providerConfig) {
          runLog.addEvent(run.agentRunId, {
            eventType: "ai_provider_config_loaded",
            summary: {
              providerConfigId: providerConfig.id,
              providerId: providerConfig.providerId,
              authMode: providerConfig.authMode,
              endpointConfigured: Boolean(providerConfig.endpointUrl),
              secretRefConfigured: Boolean(providerConfig.secretRef)
            }
          });
        }
        const providerHealth = latestProviderHealth(providerHealthStore, providerAdapter.descriptor);
        if (providerHealth) {
          runLog.addEvent(run.agentRunId, {
            eventType: "provider_health_observed",
            status: providerHealth.status,
            summary: {
              providerId: providerAdapter.descriptor.providerId,
              status: providerHealth.status,
              checkedAt: providerHealth.checkedAt,
              latencyMs: providerHealth.latencyMs,
              errorType: providerHealth.errorType,
              retryable: providerHealth.retryable === true
            }
          });
        }
        if (shouldBlockForProviderHealth(providerHealth, input)) {
          const error = new Error("Provider health is down; scheduled/background run skipped before model call.");
          error.code = "AI_PROVIDER_HEALTH_BLOCKED";
          error.runStatus = "skipped";
          throw error;
        }
        if (storedPreferences) {
          runLog.addEvent(run.agentRunId, {
            eventType: "user_ai_preferences_loaded",
            summary: {
              userId: identity.userId,
              workspaceId: identity.workspaceId,
              userMode: storedPreferences.userMode,
              modelPack: storedPreferences.modelPack,
              hasBudgetState: Object.keys(storedPreferences.budgetState || {}).length > 0
            }
          });
        }
        const toolContext = {
          agentRunId: run.agentRunId,
          taskId,
          trigger: input.trigger || "user_command",
          privacyMode,
          background: input.background === true
        };
        const logToolCall = (toolCall, summary = {}) =>
          runLog.addEvent(run.agentRunId, {
            eventType: "tool_call",
            status: toolCall.status,
            summary: {
              toolName: toolCall.toolName,
              permissionLevel: toolCall.permissionLevel,
              dataBoundary: toolCall.dataBoundary,
              ...summary
            },
            error: toolCall.error || null
          });
        const callToolAndLog = async (toolName, toolInput = {}, summary = {}) => {
          const toolCall = await toolRegistry.call(toolName, toolInput, toolContext);
          logToolCall(toolCall, summary);
          if (toolCall.status !== "succeeded") {
            const error = new Error(toolCall.error?.message || `${toolName} tool failed`);
            error.code = toolCall.error?.errorType || "AI_TOOL_CALL_FAILED";
            throw error;
          }
          return toolCall;
        };

        let contextPack = null;
        if (input.contextPack) {
          contextPack = createContextPack({
            ...input.contextPack,
            agentRunId: run.agentRunId,
            taskId,
            privacyMode: cleanText(input.contextPack.privacyMode || input.contextPack.privacy_mode || input.contextPack.privacy?.mode) || privacyMode
          });
        } else if (input.currentNote) {
          contextPack = createCurrentNoteContextPack({
            taskId,
            agentRunId: run.agentRunId,
            note: input.currentNote,
            privacyMode
          });
        } else if (selectedNoteIds(input).length) {
          const allNoteIds = selectedNoteIds(input);
          const maxItems = normalizeLimit(input.maxContextNotes || input.max_context_notes || input.maxItems || input.max_items, 8);
          const includedNoteIds = allNoteIds.slice(0, maxItems);
          const notes = [];
          for (const noteId of includedNoteIds) {
            const toolCall = await callToolAndLog("read_note", { noteId }, { noteId, includedReason: "selected_note" });
            notes.push(noteFromToolOutput(toolCall.output));
          }
          contextPack = createNotesContextPack({
            taskId,
            agentRunId: run.agentRunId,
            notes,
            privacyMode,
            includedReason: "selected_note",
            taskType: input.taskType || "reflection",
            agentId: agent.agentId,
            trigger: input.trigger || "user_command",
            retrievalTrace: [
              {
                step: "selected_notes",
                tool: "read_note",
                resultCount: allNoteIds.length,
                selectedCount: notes.length
              }
            ],
            omitted: allNoteIds.slice(maxItems).map((noteId) => ({
              kind: "note",
              sourceId: noteId,
              reason: "context_item_limit"
            }))
          });
        } else if (searchSpecFromInput(input)) {
          const searchSpec = searchSpecFromInput(input);
          const maxItems = normalizeLimit(
            searchSpec.maxContextNotes || searchSpec.max_context_notes || input.maxContextNotes || input.max_context_notes,
            6
          );
          const searchLimit = normalizeLimit(searchSpec.limit, Math.max(maxItems * 2, maxItems));
          const searchCall = await callToolAndLog(
            "search_notes",
            { ...searchSpec, limit: searchLimit },
            { query: cleanText(searchSpec.query), limit: searchLimit }
          );
          const results = Array.isArray(searchCall.output?.results) ? searchCall.output.results : [];
          const selectedResults = results.slice(0, maxItems);
          const notes = [];
          for (const result of selectedResults) {
            const noteId = cleanText(result.noteId || result.note_id);
            if (!noteId) continue;
            const toolCall = await callToolAndLog("read_note", { noteId }, { noteId, includedReason: "search_notes" });
            notes.push(
              noteFromToolOutput(toolCall.output, {
                score: result.score || 0,
                method: "search_notes",
                matchedReason: result.matchedReason || result.matched_reason || ""
              })
            );
          }
          contextPack = createNotesContextPack({
            taskId,
            agentRunId: run.agentRunId,
            notes,
            privacyMode,
            includedReason: "search_notes",
            taskType: input.taskType || "connection",
            agentId: agent.agentId,
            trigger: input.trigger || "user_command",
            retrievalTrace: [
              {
                step: "search_notes",
                tool: "search_notes",
                query: cleanText(searchSpec.query),
                resultCount: results.length,
                selectedCount: selectedResults.length
              },
              {
                step: "read_search_results",
                tool: "read_note",
                resultCount: selectedResults.length,
                selectedCount: notes.length
              }
            ],
            omitted: results.slice(maxItems).map((result) => ({
              kind: "note",
              sourceId: result.noteId || result.note_id,
              title: result.title || "",
              reason: "context_item_limit"
            }))
          });
        } else if (input.noteId) {
          const toolCall = await callToolAndLog("read_note", { noteId: input.noteId }, { noteId: input.noteId });
          contextPack = createCurrentNoteContextPack({
            taskId,
            agentRunId: run.agentRunId,
            note: {
              id: toolCall.output.noteId,
              title: toolCall.output.title,
              body: toolCall.output.body,
              origin: toolCall.output.origin
            },
            privacyMode: toolCall.output.privacyMode || privacyMode
          });
        } else {
          const error = new Error("currentNote, noteId, noteIds, searchNotes, or contextPack is required");
          error.code = "AI_CONTEXT_INPUT_REQUIRED";
          throw error;
        }

        contextPack = await enrichContextPackWithGraphContext({
          contextPack,
          spec: graphContextSpecFromInput(input),
          callToolAndLog
        });

        assertProviderAllowedForContext(providerAdapter.descriptor, contextPack);
        if (contextPackStore) {
          const storedContextPack = contextPackStore.createContextPack(contextPack);
          runLog.addEvent(run.agentRunId, {
            eventType: "context_pack_stored",
            summary: {
              contextPackId: storedContextPack.contextPackId,
              itemCount: storedContextPack.items.length,
              omittedCount: storedContextPack.omitted.length
            }
          });
        }
        runLog.addEvent(run.agentRunId, {
          eventType: "context_pack_created",
          summary: {
            contextPackId: contextPack.contextPackId,
            itemCount: contextPack.items.length,
            privacyMode: contextPack.privacy.mode
          }
        });

        const expectedArtifactType = cleanText(input.expectedArtifactType) || expectedArtifactTypeForAgent(agent);
        const modelRoute = resolveModelRoute({
          agent,
          contextPack,
          providerDescriptor: providerAdapter.descriptor,
          userMode: userSettings.userMode,
          modelPack: userSettings.modelPack,
          modelPackId: userSettings.modelPackId,
          modelTier: settingsInput.modelTier || settingsInput.model_tier || agent.defaultModelTier,
          modelRef: modelRefFromSettings(settingsInput),
          requiredCapabilities: agent.requiredCapabilities
        });
        runLog.addEvent(run.agentRunId, {
          eventType: "model_route_selected",
          summary: {
            routeId: modelRoute.routeId,
            userMode: modelRoute.userMode,
            modelPackId: modelRoute.modelPackId,
            modelPack: modelRoute.modelPack,
            authMode: modelRoute.authMode,
            providerPreset: modelRoute.providerPreset,
            providerId: modelRoute.providerId,
            modelRef: modelRoute.modelRef,
            requestedTier: modelRoute.requestedTier,
            selectedTier: modelRoute.selectedTier,
            privacyMode: modelRoute.privacyMode,
            cloudAllowed: modelRoute.cloudAllowed,
            confirmationRequired: modelRoute.confirmationRequired,
            advancedOverride: modelRoute.advancedOverride
          }
        });
        const budgetPrecheck = evaluateBudgetPrecheck({
          contextPack,
          modelRoute,
          budget: userSettings.budget,
          budgetState: settingsInput.budgetState || settingsInput.budget_state,
          trigger: input.trigger || "user_command",
          tierPrices: settingsInput.tierPrices || settingsInput.tier_prices,
          outputTokenEstimate: settingsInput.outputTokenEstimate || settingsInput.output_token_estimate,
          ...budgetApprovalInput(settingsInput)
        });
        runLog.addEvent(run.agentRunId, {
          eventType: "budget_precheck",
          status: budgetPrecheck.status === "allowed" ? "succeeded" : budgetPrecheck.status,
          summary: {
            decision: budgetPrecheck.decision,
            reasons: budgetPrecheck.reasons,
            estimatedCost: budgetPrecheck.estimatedUsage.estimatedCost,
            currency: budgetPrecheck.estimatedUsage.currency,
            estimatedInputTokens: budgetPrecheck.estimatedUsage.inputTokens,
            estimatedOutputTokens: budgetPrecheck.estimatedUsage.outputTokens,
            monthlyLimit: budgetPrecheck.budget.monthlyLimit,
            monthlySpent: budgetPrecheck.budget.monthlySpent,
            monthlyRemaining: budgetPrecheck.budget.monthlyRemaining,
            confirmationThresholdPerRun: budgetPrecheck.budget.confirmationThresholdPerRun,
            confirmationRequired: budgetPrecheck.confirmationRequired,
            confirmationApproved: budgetPrecheck.confirmationApproved
          }
        });
        if (budgetPrecheck.status !== "allowed") {
          runLog.addEvent(run.agentRunId, {
            eventType: budgetPrecheck.status === "requires_confirmation" ? "user_confirmation" : "run_guardrail",
            status: budgetPrecheck.status,
            summary: {
              reason: budgetPrecheck.confirmationReason || budgetPrecheck.reasons[0] || "budget_policy",
              decision: budgetPrecheck.status === "requires_confirmation" ? "required" : "blocked",
              estimatedCost: budgetPrecheck.estimatedUsage.estimatedCost,
              currency: budgetPrecheck.estimatedUsage.currency
            },
            error:
              budgetPrecheck.status === "blocked"
                ? {
                    errorType: "AI_BUDGET_EXCEEDED",
                    message: "Budget policy blocked the model call.",
                    retryable: false
                  }
                : null
          });
          throw throwBudgetPrecheckError(budgetPrecheck);
        }
        if (budgetPrecheck.confirmationRequired && budgetPrecheck.confirmationApproved) {
          runLog.addEvent(run.agentRunId, {
            eventType: "user_confirmation",
            status: "approved",
            summary: {
              reason: budgetPrecheck.confirmationReason,
              decision: "approved",
              estimatedCost: budgetPrecheck.estimatedUsage.estimatedCost,
              currency: budgetPrecheck.estimatedUsage.currency
            }
          });
        }
        const messages = buildAgentMessages({
          agent,
          contextPack,
          expectedArtifactType,
          userInstruction: input.userInstruction || input.user_instruction || input.instruction
        });
        runLog.addEvent(run.agentRunId, {
          eventType: "prompt_prepared",
          summary: {
            messageCount: messages.length,
            expectedArtifactType
          }
        });
        runLog.addEvent(run.agentRunId, {
          eventType: "agent_runtime_selected",
          summary: {
            runtimeId: agentRuntime.runtimeId,
            runtimeType: agentRuntime.runtimeType,
            sdk: agentRuntime.sdk || "",
            providerId: providerAdapter.descriptor.providerId
          }
        });
        const runtimeToolBridge = createRuntimeToolBridge({
          toolRegistry,
          allowedToolNames: agent.allowedTools,
          toolContext,
          onToolCall(toolCall) {
            logToolCall(toolCall, { runtimeTool: true });
          }
        });
        const providerResponse = await agentRuntime.execute({
          requestId: `${run.agentRunId}_model_1`,
          agentRunId: run.agentRunId,
          purpose: "agent_reasoning",
          runtimeId: agentRuntime.runtimeId,
          runtimeType: agentRuntime.runtimeType,
          providerAdapter,
          providerDescriptor: providerAdapter.descriptor,
          agent,
          modelRoute,
          modelRef: modelRoute.modelRef,
          expectedArtifactType,
          contextPack,
          messages,
          tools: runtimeToolBridge.tools,
          toolBridge: runtimeToolBridge,
          output: { mode: "schema", schema: { artifactType: expectedArtifactType } },
          settings: { stream: false },
          policy: {
            privacyMode: contextPack.privacy.mode,
            allowCloud: modelRoute.cloudAllowed,
            allowFallback: modelRoute.fallbackPolicy.allowSameProviderFallback,
            modelRoute,
            budgetPrecheck
          }
        });

        runLog.addEvent(run.agentRunId, {
          eventType: "model_call",
          status: providerResponse.status,
          summary: {
            providerId: providerResponse.providerId,
            modelRef: providerResponse.modelRef,
            purpose: "agent_reasoning",
            runtimeId: agentRuntime.runtimeId,
            runtimeType: agentRuntime.runtimeType
          },
          usage: providerResponse.usage,
          error: providerResponse.error
        });

        if (providerResponse.status !== "succeeded") {
          const error = new Error(providerResponse.error?.message || "provider response failed");
          error.code = providerResponse.error?.error_type || "AI_PROVIDER_RESPONSE_FAILED";
          throw error;
        }

        const rawArtifacts = providerResponse.output?.json?.artifacts || [];
        const artifacts = normalizeArtifacts(rawArtifacts, {
          agentRunId: run.agentRunId,
          contextPackId: contextPack.contextPackId,
          model: {
            provider: providerResponse.providerId || providerAdapter.descriptor.providerId,
            model: providerResponse.modelRef,
            tier: modelRoute.selectedTier,
            mode: modelRoute.userMode
          },
          privacy: {
            mode: contextPack.privacy.mode,
            cloudModelUsed: providerAdapter.descriptor.localExecution !== true
          },
          sources: {
            noteIds: contextPack.items.filter((item) => item.kind === "note").map((item) => item.sourceId),
            sourceDocIds: contextPack.items.filter((item) => item.kind === "source_doc").map((item) => item.sourceId),
            artifactIds: [],
            externalUrls: []
          }
        });

        const storedArtifacts = artifactStore.createMany(artifacts);
        for (const artifact of artifacts) {
          runLog.addEvent(run.agentRunId, {
            eventType: "artifact_created",
            summary: {
              artifactId: artifact.id,
              artifactType: artifact.type,
              status: artifact.status
            }
          });
        }
        runLog.addEvent(run.agentRunId, {
          eventType: "artifacts_stored",
          summary: {
            artifactIds: storedArtifacts.map((artifact) => artifact.id),
            artifactCount: storedArtifacts.length
          }
        });

        const finished = runLog.finishRun(run.agentRunId, {
          status: "succeeded",
          contextPackId: contextPack.contextPackId,
          providerId: providerAdapter.descriptor.providerId,
          modelRef: providerResponse.modelRef,
          modelTier: modelRoute.selectedTier,
          usage: providerResponse.usage,
          artifactIds: storedArtifacts.map((artifact) => artifact.id)
        });

        return { run: finished, contextPack, artifacts: storedArtifacts };
      } catch (error) {
        const failedStatus = cleanText(error?.runStatus) || "failed";
        runLog.addEvent(run.agentRunId, {
          eventType: "run_failed",
          status: failedStatus,
          summary: {
            code: error?.code || "AI_RUN_FAILED",
            message: String(error?.message || error)
          },
          error: {
            errorType: error?.code || "AI_RUN_FAILED",
            message: String(error?.message || error),
            retryable: false
          }
        });
        const failed = runLog.finishRun(run.agentRunId, {
          status: failedStatus,
          error: {
            errorType: error?.code || "AI_RUN_FAILED",
            message: String(error?.message || error)
          }
        });
        return { run: failed, contextPack: null, artifacts: [] };
      }
    }
  };
}
