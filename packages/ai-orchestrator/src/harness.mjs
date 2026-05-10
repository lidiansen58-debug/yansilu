import { createAgentRegistry } from "./agent-registry.mjs";
import { buildAgentMessages } from "./agent-prompts.mjs";
import { createAiInbox } from "./artifact-inbox.mjs";
import { createInMemoryArtifactStore } from "./artifact-store.mjs";
import { normalizeArtifacts } from "./artifacts.mjs";
import { createCurrentNoteContextPack, createContextPack, createNotesContextPack } from "./context-pack.mjs";
import { createMockProviderAdapter } from "./mock-provider-adapter.mjs";
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

export function createAiHarness(options = {}) {
  const registry = options.agentRegistry || createAgentRegistry(options.agentDefinitions);
  const runLog = options.runLog || createInMemoryRunLog();
  const providerAdapter = options.providerAdapter || createMockProviderAdapter();
  const toolRegistry = options.toolRegistry || createToolRegistry(options.tools || []);
  const artifactStore = options.artifactStore || createInMemoryArtifactStore();
  const artifactInbox = options.artifactInbox || createAiInbox({ artifactStore });

  return {
    registry,
    runLog,
    providerAdapter,
    toolRegistry,
    artifactStore,
    artifactInbox,
    async runTask(input = {}) {
      const taskId = cleanText(input.taskId || input.task_id) || generatedId("task");
      const agentId = cleanText(input.agentId || input.agent_id) || "reflection_agent";
      const agent = registry.get(agentId);
      const run = runLog.startRun({
        taskId,
        agentId: agent.agentId,
        agentVersion: agent.agentVersion,
        trigger: input.trigger || "user_command",
        taskType: input.taskType || "reflection",
        userMode: input.userMode || "Auto",
        privacyMode: input.privacyMode || input.contextPack?.privacy?.mode || "normal",
        modelTier: input.modelTier || agent.defaultModelTier
      });

      try {
        const toolContext = {
          agentRunId: run.agentRunId,
          taskId,
          trigger: input.trigger || "user_command",
          privacyMode: input.privacyMode || "normal",
          background: input.background === true
        };
        const callToolAndLog = async (toolName, toolInput = {}, summary = {}) => {
          const toolCall = await toolRegistry.call(toolName, toolInput, toolContext);
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
          if (toolCall.status !== "succeeded") {
            const error = new Error(toolCall.error?.message || `${toolName} tool failed`);
            error.code = toolCall.error?.errorType || "AI_TOOL_CALL_FAILED";
            throw error;
          }
          return toolCall;
        };

        let contextPack = null;
        if (input.contextPack) {
          contextPack = createContextPack({ ...input.contextPack, agentRunId: run.agentRunId, taskId });
        } else if (input.currentNote) {
          contextPack = createCurrentNoteContextPack({
            taskId,
            agentRunId: run.agentRunId,
            note: input.currentNote,
            privacyMode: input.privacyMode || "normal"
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
            privacyMode: input.privacyMode || "normal",
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
            privacyMode: input.privacyMode || "normal",
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
            privacyMode: toolCall.output.privacyMode || input.privacyMode || "normal"
          });
        } else {
          const error = new Error("currentNote, noteId, noteIds, searchNotes, or contextPack is required");
          error.code = "AI_CONTEXT_INPUT_REQUIRED";
          throw error;
        }

        assertProviderAllowedForContext(providerAdapter.descriptor, contextPack);
        runLog.addEvent(run.agentRunId, {
          eventType: "context_pack_created",
          summary: {
            contextPackId: contextPack.contextPackId,
            itemCount: contextPack.items.length,
            privacyMode: contextPack.privacy.mode
          }
        });

        const expectedArtifactType = cleanText(input.expectedArtifactType) || expectedArtifactTypeForAgent(agent);
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
        const providerResponse = await providerAdapter.complete({
          requestId: `${run.agentRunId}_model_1`,
          agentRunId: run.agentRunId,
          purpose: "agent_reasoning",
          modelRef: input.modelRef || `${providerAdapter.descriptor.providerId}:${agent.defaultModelTier}`,
          expectedArtifactType,
          contextPack,
          messages,
          tools: [],
          output: { mode: "schema", schema: { artifactType: expectedArtifactType } },
          settings: { stream: false },
          policy: {
            privacyMode: contextPack.privacy.mode,
            allowCloud: contextPack.privacy.cloudAllowed,
            allowFallback: false
          }
        });

        runLog.addEvent(run.agentRunId, {
          eventType: "model_call",
          status: providerResponse.status,
          summary: {
            providerId: providerResponse.providerId,
            modelRef: providerResponse.modelRef,
            purpose: "agent_reasoning"
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
            provider: providerAdapter.descriptor.providerId,
            model: providerResponse.modelRef,
            tier: agent.defaultModelTier,
            mode: input.userMode || "Auto"
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
          modelTier: agent.defaultModelTier,
          usage: providerResponse.usage,
          artifactIds: storedArtifacts.map((artifact) => artifact.id)
        });

        return { run: finished, contextPack, artifacts: storedArtifacts };
      } catch (error) {
        runLog.addEvent(run.agentRunId, {
          eventType: "run_failed",
          status: "failed",
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
          status: "failed",
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
