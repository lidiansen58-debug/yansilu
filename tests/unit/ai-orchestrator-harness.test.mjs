import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createAgentRegistry,
  createAiHarnessRuntime,
  createAiHarness,
  createAiInbox,
  createCoreNoteTools,
  createInMemoryAiPreferencesStore,
  createInMemoryArtifactStore,
  createContextPack,
  createMockProviderAdapter,
  createProviderAdapterRegistry,
  buildOpenAiCompatibleFetchRequest,
  buildOpenAiCompatibleRequest,
  createOpenAiCompatibleExecutor,
  createOpenAiCompatibleProviderAdapter,
  createSqliteAiStores,
  createSqliteAiPreferencesStore,
  createSqliteArtifactStore,
  createSqliteContextPackStore,
  createSqliteRunLog,
  createToolRegistry,
  evaluateBudgetPrecheck,
  getModelPack,
  getProviderPreset,
  listModelPacks,
  listProviderPresets,
  resolveAiUserSettings,
  normalizeOpenAiCompatibleError,
  normalizeOpenAiCompatibleResponse,
  resolveProviderDescriptor,
  resolveModelRoute
} from "../../packages/ai-orchestrator/src/index.mjs";
import {
  createNoteInDirectory,
  initVault,
  listDirectories
} from "../../packages/domain/src/index.mjs";

async function hasNodeSqlite() {
  try {
    await import("node:sqlite");
    return true;
  } catch {
    return false;
  }
}

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-orchestrator-"));
}

async function createOriginalNote(vaultPath, input = {}) {
  const directories = await listDirectories(vaultPath);
  const originalDirectory = directories.find((item) => item.directoryType === "original_default");
  return createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    ...input
  });
}

test("mock harness creates a reflection artifact and run log without note mutation", async () => {
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({ providerAdapter: provider });

  const result = await harness.runTask({
    taskId: "task_reflect",
    currentNote: {
      id: "note_1",
      title: "A draft idea",
      body: "I keep returning to the difference between collecting notes and forming judgment."
    }
  });

  assert.equal(result.run.status, "succeeded");
  assert.equal(result.artifacts.length, 1);
  assert.equal(result.artifacts[0].type, "ReflectionPrompt");
  assert.equal(result.artifacts[0].status, "pending_review");
  assert.equal(result.artifacts[0].sources.noteIds[0], "note_1");
  assert.deepEqual(result.run.artifactIds, [result.artifacts[0].id]);
  assert.ok(result.run.events.some((event) => event.eventType === "model_call"));
  assert.ok(result.run.events.some((event) => event.eventType === "prompt_prepared"));
  assert.ok(result.run.events.some((event) => event.eventType === "artifact_created"));
  assert.ok(result.run.events.some((event) => event.eventType === "artifacts_stored"));
  assert.equal(harness.artifactStore.getArtifact(result.artifacts[0].id).id, result.artifacts[0].id);
  assert.equal(harness.artifactStore.listArtifacts({ agentRunId: result.run.agentRunId }).length, 1);
  assert.equal(harness.artifactStore.listArtifacts({ sourceNoteId: "note_1" }).length, 1);
  assert.equal(harness.artifactInbox.listItems({ view: "pending" }).length, 1);
  assert.equal(harness.artifactInbox.listItems({ view: "pending" })[0].artifactId, result.artifacts[0].id);
  assert.equal(provider.lastRequest.messages.length, 3);
  assert.match(provider.lastRequest.messages[0].content, /Human-authored notes are the user's source of truth/);
});

test("runtime factory creates memory harness with audit stores", async () => {
  const provider = createMockProviderAdapter();
  const harness = await createAiHarnessRuntime({
    storageMode: "memory",
    providerAdapter: provider
  });

  const result = await harness.runTask({
    taskId: "task_runtime_memory",
    currentNote: {
      id: "note_runtime_memory",
      title: "Runtime memory note",
      body: "Runtime memory note\n\nThis should use in-memory stores with the same harness shape."
    }
  });

  assert.equal(harness.storageMode, "memory");
  assert.equal(result.run.status, "succeeded");
  assert.equal(harness.contextPackStore.getContextPack(result.contextPack.contextPackId).items[0].sourceId, "note_runtime_memory");
  assert.equal(harness.artifactInbox.listItems({ view: "pending" })[0].artifactId, result.artifacts[0].id);
  assert.equal(harness.runLog.getRun(result.run.agentRunId).artifactIds[0], result.artifacts[0].id);
  harness.close();
});

test("model router maps simple user modes to model tiers", () => {
  const providerDescriptor = {
    providerId: "mock_provider",
    modelMap: {
      cheap_fast: "mock_provider:cheap",
      standard: "mock_provider:standard",
      strong_reasoning: "mock_provider:strong",
      local_private: "mock_provider:local"
    }
  };
  const contextPack = createContextPack({
    taskId: "task_route",
    privacyMode: "normal",
    items: [{ kind: "note", sourceId: "note_route", content: "Routing context." }]
  });
  const agent = {
    agentId: "reflection_agent",
    defaultModelTier: "strong_reasoning",
    requiredCapabilities: ["structured_output"]
  };

  const auto = resolveModelRoute({ agent, contextPack, providerDescriptor, userMode: "Auto" });
  const economy = resolveModelRoute({ agent, contextPack, providerDescriptor, userMode: "Economy" });
  const balanced = resolveModelRoute({ agent, contextPack, providerDescriptor, userMode: "Balanced" });
  const deep = resolveModelRoute({
    agent: { ...agent, defaultModelTier: "cheap_fast" },
    contextPack,
    providerDescriptor,
    userMode: "Deep"
  });
  const local = resolveModelRoute({ agent, contextPack, providerDescriptor, userMode: "Local / Private" });

  assert.equal(auto.selectedTier, "strong_reasoning");
  assert.equal(auto.modelRef, "mock_provider:strong");
  assert.equal(economy.selectedTier, "standard");
  assert.equal(economy.confirmationRequired, true);
  assert.equal(balanced.selectedTier, "standard");
  assert.equal(deep.selectedTier, "strong_reasoning");
  assert.equal(local.selectedTier, "local_private");
  assert.equal(local.cloudAllowed, false);
});

test("provider presets expose normalized descriptors and model maps", () => {
  const presets = listProviderPresets();
  const ids = presets.map((preset) => preset.providerId).sort();
  const local = getProviderPreset("local_private_gateway");
  const gateway = getProviderPreset("openai_compatible_gateway");

  assert.deepEqual(
    ids,
    ["china_optimized_gateway", "local_private_gateway", "openai_compatible_gateway", "platform_managed_openai"].sort()
  );
  assert.equal(local.adapterType, "local_gateway");
  assert.equal(local.localExecution, true);
  assert.equal(local.modelMap.local_private, "local_private_gateway:local_private");
  assert.equal(gateway.adapterType, "aggregated_gateway");
  assert.equal(gateway.modelMap.standard, "openai_compatible_gateway:standard");
  assert.ok(gateway.authModes.includes("byok_advanced"));
});

test("model packs compile simple user choices into provider policy", () => {
  const packIds = listModelPacks().map((pack) => pack.modelPackId).sort();
  const starter = getModelPack("Starter Auto");
  const china = resolveAiUserSettings({ modelPack: "China Optimized" });
  const localMode = resolveAiUserSettings({ userMode: "local" });
  const descriptor = resolveProviderDescriptor({ userMode: "Local / Private" });

  assert.ok(packIds.includes("starter_auto"));
  assert.ok(packIds.includes("privacy_first"));
  assert.equal(starter.providerVisibility, "hidden");
  assert.equal(starter.authMode, "platform_managed");
  assert.equal(china.providerPreset, "china_optimized_gateway");
  assert.equal(china.userMode, "Auto");
  assert.equal(localMode.modelPack, "Privacy First");
  assert.equal(localMode.providerPreset, "local_private_gateway");
  assert.equal(localMode.privacy.defaultMode, "local_only");
  assert.equal(localMode.fallbackPolicy.allowCloudFallback, false);
  assert.equal(descriptor.providerId, "local_private_gateway");
  assert.equal(descriptor.authMode, "local_no_key");
});

test("provider adapter registry creates adapters from model pack presets", () => {
  const registry = createProviderAdapterRegistry();
  const china = registry.getAdapter({ modelPack: "China Optimized" });
  const local = registry.getAdapter({ userMode: "Local / Private" });
  const adapters = registry.listAdapters().map((entry) => entry.providerId).sort();

  assert.equal(china.source, "factory");
  assert.equal(china.adapter.descriptor.providerId, "china_optimized_gateway");
  assert.equal(china.adapter.descriptor.adapterType, "aggregated_gateway");
  assert.equal(local.adapter.descriptor.providerId, "local_private_gateway");
  assert.equal(local.adapter.descriptor.localExecution, true);
  assert.deepEqual(adapters, ["china_optimized_gateway", "local_private_gateway"].sort());
});

test("model router applies model pack defaults without exposing raw provider details", () => {
  const providerDescriptor = getProviderPreset("local_private_gateway");
  const contextPack = createContextPack({
    taskId: "task_pack_route",
    items: [{ kind: "note", sourceId: "note_pack_route", content: "Private routing context." }]
  });

  const route = resolveModelRoute({
    agent: { agentId: "reflection_agent", defaultModelTier: "strong_reasoning" },
    contextPack,
    providerDescriptor,
    modelPack: "Privacy First"
  });

  assert.equal(route.userMode, "Local / Private");
  assert.equal(route.modelPackId, "privacy_first");
  assert.equal(route.providerPreset, "local_private_gateway");
  assert.equal(route.selectedTier, "local_private");
  assert.equal(route.cloudAllowed, false);
  assert.equal(route.fallbackPolicy.allowCloudFallback, false);
  assert.equal(route.budget.monthlyLimit, 0);
});

test("budget precheck estimates cost and requests confirmation above threshold", () => {
  const contextPack = createContextPack({
    taskId: "task_budget_precheck",
    items: [{ kind: "note", sourceId: "note_budget", content: "Budget context".repeat(200) }]
  });
  const route = resolveModelRoute({
    agent: { agentId: "reflection_agent", defaultModelTier: "strong_reasoning" },
    contextPack,
    providerDescriptor: getProviderPreset("platform_managed_openai"),
    budget: { monthlyLimit: 10, confirmationThresholdPerRun: 0.00001 }
  });
  const precheck = evaluateBudgetPrecheck({ contextPack, modelRoute: route });

  assert.equal(precheck.status, "requires_confirmation");
  assert.equal(precheck.confirmationRequired, true);
  assert.equal(precheck.reasons[0], "expensive_run");
  assert.ok(precheck.estimatedUsage.estimatedCost > 0.00001);
});

test("harness logs model route and uses selected tier", async () => {
  const provider = createMockProviderAdapter({
    descriptor: {
      modelMap: {
        standard: "mock_provider:standard-model",
        strong_reasoning: "mock_provider:strong-model"
      }
    }
  });
  const harness = createAiHarness({ providerAdapter: provider });

  const result = await harness.runTask({
    taskId: "task_route_harness",
    userMode: "Economy",
    currentNote: {
      id: "note_route_harness",
      title: "Route harness note",
      body: "Route harness note\n\nEconomy mode should avoid strong reasoning by default."
    }
  });
  const routeEvent = result.run.events.find((event) => event.eventType === "model_route_selected");

  assert.equal(result.run.status, "succeeded");
  assert.equal(routeEvent.summary.userMode, "Economy");
  assert.equal(routeEvent.summary.requestedTier, "strong_reasoning");
  assert.equal(routeEvent.summary.selectedTier, "standard");
  assert.equal(provider.lastRequest.modelRef, "mock_provider:standard-model");
  assert.equal(result.run.modelTier, "standard");
  assert.equal(result.artifacts[0].model.tier, "standard");
});

test("harness pauses expensive runs before provider calls until budget is confirmed", async () => {
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({ providerAdapter: provider });

  const result = await harness.runTask({
    taskId: "task_budget_confirm_required",
    budget: { monthlyLimit: 10, confirmationThresholdPerRun: 0.00001 },
    currentNote: {
      id: "note_budget_confirm",
      title: "Budget confirmation note",
      body: "Budget confirmation note\n\n" + "Expensive reflection context. ".repeat(200)
    }
  });
  const budgetEvent = result.run.events.find((event) => event.eventType === "budget_precheck");
  const confirmationEvent = result.run.events.find((event) => event.eventType === "user_confirmation");

  assert.equal(result.run.status, "requires_confirmation");
  assert.equal(result.run.error.errorType, "AI_BUDGET_CONFIRMATION_REQUIRED");
  assert.equal(provider.callCount, 0);
  assert.equal(budgetEvent.status, "requires_confirmation");
  assert.equal(budgetEvent.summary.decision, "requires_confirmation");
  assert.equal(confirmationEvent.summary.reason, "expensive_run");
  assert.equal(confirmationEvent.summary.decision, "required");
  assert.deepEqual(result.artifacts, []);
});

test("harness proceeds with approved expensive budget confirmation", async () => {
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({ providerAdapter: provider });

  const result = await harness.runTask({
    taskId: "task_budget_confirm_approved",
    budget: { monthlyLimit: 10, confirmationThresholdPerRun: 0.00001 },
    budgetConfirmation: { approved: true, userId: "user_budget" },
    currentNote: {
      id: "note_budget_approved",
      title: "Approved budget note",
      body: "Approved budget note\n\n" + "Confirmed expensive reflection context. ".repeat(200)
    }
  });
  const budgetEvent = result.run.events.find((event) => event.eventType === "budget_precheck");
  const confirmationEvent = result.run.events.find((event) => event.eventType === "user_confirmation");

  assert.equal(result.run.status, "succeeded");
  assert.equal(provider.callCount, 1);
  assert.equal(budgetEvent.summary.confirmationRequired, true);
  assert.equal(budgetEvent.summary.confirmationApproved, true);
  assert.equal(confirmationEvent.status, "approved");
  assert.equal(confirmationEvent.summary.decision, "approved");
  assert.equal(provider.lastRequest.policy.budgetPrecheck.decision, "allowed");
});

test("harness loads user AI preferences for model mode and budget state", async () => {
  const provider = createMockProviderAdapter({
    descriptor: {
      modelMap: {
        cheap_fast: "mock_provider:cheap-model",
        standard: "mock_provider:standard-model"
      }
    }
  });
  const aiPreferencesStore = createInMemoryAiPreferencesStore();
  aiPreferencesStore.setUserPreferences({
    userId: "user_pref",
    workspaceId: "workspace_pref",
    modelPack: "Low Cost Research",
    userMode: "Economy",
    budget: { monthlyLimit: 10, confirmationThresholdPerRun: 10 },
    budgetState: { monthlySpent: 3.25 }
  });
  const harness = createAiHarness({ providerAdapter: provider, aiPreferencesStore });

  const result = await harness.runTask({
    taskId: "task_preferences_loaded",
    userId: "user_pref",
    workspaceId: "workspace_pref",
    currentNote: {
      id: "note_preferences",
      title: "Preferences note",
      body: "Preferences note\n\nStored AI settings should drive routing without per-run options."
    }
  });
  const preferencesEvent = result.run.events.find((event) => event.eventType === "user_ai_preferences_loaded");
  const routeEvent = result.run.events.find((event) => event.eventType === "model_route_selected");
  const budgetEvent = result.run.events.find((event) => event.eventType === "budget_precheck");

  assert.equal(result.run.status, "succeeded");
  assert.equal(result.run.userMode, "Economy");
  assert.equal(result.run.modelPack, "Low Cost Research");
  assert.equal(preferencesEvent.summary.userId, "user_pref");
  assert.equal(routeEvent.summary.modelPack, "Low Cost Research");
  assert.equal(routeEvent.summary.selectedTier, "standard");
  assert.equal(provider.lastRequest.modelRef, "mock_provider:standard-model");
  assert.equal(budgetEvent.summary.monthlySpent, 3.25);
});

test("harness dynamically selects provider adapter from stored model pack", async () => {
  const aiPreferencesStore = createInMemoryAiPreferencesStore();
  aiPreferencesStore.setUserPreferences({
    userId: "user_dynamic_provider",
    workspaceId: "workspace_dynamic_provider",
    modelPack: "China Optimized",
    budget: { monthlyLimit: 10, confirmationThresholdPerRun: 10 }
  });
  const harness = createAiHarness({ aiPreferencesStore });

  const result = await harness.runTask({
    taskId: "task_dynamic_provider",
    userId: "user_dynamic_provider",
    workspaceId: "workspace_dynamic_provider",
    currentNote: {
      id: "note_dynamic_provider",
      title: "Dynamic provider note",
      body: "Dynamic provider note\n\nThe stored model pack should choose the provider adapter."
    }
  });
  const adapterEvent = result.run.events.find((event) => event.eventType === "provider_adapter_selected");
  const routeEvent = result.run.events.find((event) => event.eventType === "model_route_selected");

  assert.equal(result.run.status, "succeeded");
  assert.equal(harness.providerAdapter.descriptor.providerId, "china_optimized_gateway");
  assert.equal(adapterEvent.summary.providerId, "china_optimized_gateway");
  assert.equal(adapterEvent.summary.adapterSource, "factory");
  assert.equal(routeEvent.summary.providerId, "china_optimized_gateway");
  assert.equal(routeEvent.summary.modelRef, "china_optimized_gateway:strong_reasoning");
});

test("harness can switch provider adapters between users", async () => {
  const aiPreferencesStore = createInMemoryAiPreferencesStore({
    preferences: [
      {
        userId: "user_china",
        workspaceId: "workspace_switch",
        modelPack: "China Optimized",
        budget: { monthlyLimit: 10, confirmationThresholdPerRun: 10 }
      },
      {
        userId: "user_local",
        workspaceId: "workspace_switch",
        userMode: "Local / Private"
      }
    ]
  });
  const harness = createAiHarness({ aiPreferencesStore });

  const chinaResult = await harness.runTask({
    taskId: "task_switch_china",
    userId: "user_china",
    workspaceId: "workspace_switch",
    currentNote: {
      id: "note_switch_china",
      title: "China switch note",
      body: "China switch note\n\nFirst run should use the China gateway."
    }
  });
  const localResult = await harness.runTask({
    taskId: "task_switch_local",
    userId: "user_local",
    workspaceId: "workspace_switch",
    currentNote: {
      id: "note_switch_local",
      title: "Local switch note",
      body: "Local switch note\n\nSecond run should use the local private gateway."
    }
  });
  const chinaAdapterEvent = chinaResult.run.events.find((event) => event.eventType === "provider_adapter_selected");
  const localAdapterEvent = localResult.run.events.find((event) => event.eventType === "provider_adapter_selected");

  assert.equal(chinaResult.run.status, "succeeded");
  assert.equal(localResult.run.status, "succeeded");
  assert.equal(chinaAdapterEvent.summary.providerId, "china_optimized_gateway");
  assert.equal(localAdapterEvent.summary.providerId, "local_private_gateway");
  assert.equal(localResult.contextPack.privacy.mode, "local_only");
  assert.equal(harness.providerAdapter.descriptor.providerId, "local_private_gateway");
});

test("per-run model settings override stored AI preferences", async () => {
  const provider = createMockProviderAdapter({
    descriptor: {
      modelMap: {
        standard: "mock_provider:standard-model",
        strong_reasoning: "mock_provider:strong-model"
      }
    }
  });
  const aiPreferencesStore = createInMemoryAiPreferencesStore({
    preferences: [
      {
        userId: "user_override",
        workspaceId: "workspace_override",
        modelPack: "Low Cost Research",
        userMode: "Economy"
      }
    ]
  });
  const harness = createAiHarness({ providerAdapter: provider, aiPreferencesStore });

  const result = await harness.runTask({
    taskId: "task_preferences_override",
    userId: "user_override",
    workspaceId: "workspace_override",
    userMode: "Deep Thinking",
    budget: { monthlyLimit: 10, confirmationThresholdPerRun: 10 },
    currentNote: {
      id: "note_preferences_override",
      title: "Override note",
      body: "Override note\n\nThe run should be allowed to temporarily request stronger reasoning."
    }
  });
  const routeEvent = result.run.events.find((event) => event.eventType === "model_route_selected");

  assert.equal(result.run.status, "succeeded");
  assert.equal(result.run.userMode, "Deep Thinking");
  assert.equal(result.run.modelPack, "Low Cost Research");
  assert.equal(routeEvent.summary.selectedTier, "strong_reasoning");
  assert.equal(provider.lastRequest.modelRef, "mock_provider:strong-model");
});

test("harness blocks runs that exceed remaining monthly budget", async () => {
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({ providerAdapter: provider });

  const result = await harness.runTask({
    taskId: "task_budget_blocked",
    budget: { monthlyLimit: 0.00001, monthlySpent: 0.00001, confirmationThresholdPerRun: 10 },
    budgetConfirmation: { approved: true },
    currentNote: {
      id: "note_budget_blocked",
      title: "Blocked budget note",
      body: "Blocked budget note\n\n" + "This should not reach the provider. ".repeat(200)
    }
  });
  const budgetEvent = result.run.events.find((event) => event.eventType === "budget_precheck");
  const guardrailEvent = result.run.events.find((event) => event.eventType === "run_guardrail");

  assert.equal(result.run.status, "failed");
  assert.equal(result.run.error.errorType, "AI_BUDGET_EXCEEDED");
  assert.equal(provider.callCount, 0);
  assert.equal(budgetEvent.status, "blocked");
  assert.equal(budgetEvent.summary.reasons[0], "monthly_budget_exceeded");
  assert.equal(guardrailEvent.error.errorType, "AI_BUDGET_EXCEEDED");
});

test("harness can run a simple model pack selection through provider presets", async () => {
  const harness = await createAiHarnessRuntime({
    storageMode: "memory",
    modelPack: "China Optimized"
  });

  const result = await harness.runTask({
    taskId: "task_china_pack",
    currentNote: {
      id: "note_china_pack",
      title: "China pack note",
      body: "China pack note\n\nThe user only selected a model pack, not a raw provider."
    }
  });
  const routeEvent = result.run.events.find((event) => event.eventType === "model_route_selected");

  assert.equal(result.run.status, "succeeded");
  assert.equal(harness.providerAdapter.descriptor.providerId, "china_optimized_gateway");
  assert.equal(result.run.modelPack, "China Optimized");
  assert.equal(routeEvent.summary.modelPackId, "china_optimized");
  assert.equal(routeEvent.summary.providerPreset, "china_optimized_gateway");
  assert.equal(routeEvent.summary.authMode, "workspace_managed");
  assert.equal(routeEvent.summary.providerId, "china_optimized_gateway");
  harness.close();
});

test("runtime factory can use provider preset without a real adapter", async () => {
  const harness = await createAiHarnessRuntime({
    storageMode: "memory",
    providerPreset: "openai_compatible_gateway"
  });

  const result = await harness.runTask({
    taskId: "task_provider_preset",
    userMode: "Economy",
    currentNote: {
      id: "note_provider_preset",
      title: "Provider preset note",
      body: "Provider preset note\n\nThe preset should supply provider metadata and model refs."
    }
  });
  const routeEvent = result.run.events.find((event) => event.eventType === "model_route_selected");

  assert.equal(harness.providerAdapter.descriptor.providerId, "openai_compatible_gateway");
  assert.equal(routeEvent.summary.providerId, "openai_compatible_gateway");
  assert.equal(routeEvent.summary.selectedTier, "standard");
  assert.equal(harness.providerAdapter.lastRequest.modelRef, "openai_compatible_gateway:standard");
  harness.close();
});

test("openai-compatible adapter builds request shape without network", () => {
  const request = buildOpenAiCompatibleRequest(
    {
      requestId: "req_compatible",
      agentRunId: "run_compatible",
      purpose: "agent_reasoning",
      modelRef: "openai_compatible_gateway:standard",
      messages: [
        { role: "system", content: "System instruction." },
        { role: "developer", content: "Developer instruction." },
        { role: "user", content: "User question." }
      ],
      tools: [
        {
          name: "search_notes",
          description: "Search notes.",
          schema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"]
          }
        }
      ],
      output: {
        mode: "schema",
        schema: {
          type: "object",
          properties: { artifacts: { type: "array" } },
          required: ["artifacts"]
        }
      },
      settings: { stream: false, temperature: 0.2, maxOutputTokens: 500 },
      policy: { privacyMode: "normal", allowCloud: true, allowFallback: true }
    },
    {
      endpointUrl: "https://gateway.example.test/v1/chat/completions",
      authMode: "byok_advanced",
      secretRef: "secret_gateway"
    }
  );

  assert.equal(request.method, "POST");
  assert.equal(request.endpointUrl, "https://gateway.example.test/v1/chat/completions");
  assert.equal(request.auth.secretRef, "secret_gateway");
  assert.equal(request.body.model, "standard");
  assert.equal(request.body.messages[1].role, "system");
  assert.match(request.body.messages[1].content, /Developer instructions/);
  assert.equal(request.body.tools[0].function.name, "search_notes");
  assert.equal(request.body.response_format.type, "json_schema");
  assert.equal(request.metadata.allowFallback, true);
});

test("openai-compatible executor builds authenticated fetch requests through secret refs", async () => {
  const compatibleRequest = buildOpenAiCompatibleRequest(
    {
      requestId: "req_fetch",
      agentRunId: "run_fetch",
      purpose: "agent_reasoning",
      modelRef: "openai_compatible_gateway:standard",
      messages: [{ role: "user", content: "Hello" }]
    },
    {
      endpointUrl: "https://gateway.example.test/v1/chat/completions",
      authMode: "byok_advanced",
      secretRef: "secret_gateway"
    }
  );
  const fetchRequest = await buildOpenAiCompatibleFetchRequest(compatibleRequest, {
    secretResolver: async ({ secretRef }) => {
      assert.equal(secretRef, "secret_gateway");
      return "test-secret-value";
    },
    extraHeaders: { "x-app": "yansilu" }
  });

  assert.equal(fetchRequest.url, "https://gateway.example.test/v1/chat/completions");
  assert.equal(fetchRequest.init.headers.authorization, "Bearer test-secret-value");
  assert.equal(fetchRequest.init.headers["x-app"], "yansilu");
  assert.equal(fetchRequest.metadata.secretRef, "secret_gateway");
  assert.equal(fetchRequest.metadata.secretConfigured, true);
  assert.equal(JSON.parse(fetchRequest.init.body).model, "standard");
});

test("openai-compatible adapter normalizes responses and errors", async () => {
  const adapter = createOpenAiCompatibleProviderAdapter({
    providerPreset: "openai_compatible_gateway",
    executor: async () => ({
      id: "provider_req_1",
      choices: [
        {
          message: {
            content: JSON.stringify({
              artifacts: [{ type: "ReflectionPrompt", title: "Prompt", body: "Body" }]
            })
          }
        }
      ],
      usage: {
        prompt_tokens: 11,
        completion_tokens: 7,
        total_tokens: 18
      }
    })
  });
  const request = {
    requestId: "req_response",
    agentRunId: "run_response",
    modelRef: "openai_compatible_gateway:standard",
    messages: [{ role: "user", content: "Return JSON." }],
    output: { mode: "json" },
    settings: { stream: false }
  };
  const response = await adapter.complete(request);
  const mappedError = normalizeOpenAiCompatibleError({ status: 429, code: "rate_limit", message: "Too many requests" });
  const normalizedResponse = normalizeOpenAiCompatibleResponse(
    {
      id: "provider_req_2",
      choices: [{ message: { content: "{\"ok\":true}" } }],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
    },
    request,
    adapter.descriptor
  );

  assert.equal(response.status, "succeeded");
  assert.equal(response.output.type, "json");
  assert.equal(response.output.json.artifacts[0].title, "Prompt");
  assert.equal(response.usage.totalTokens, 18);
  assert.equal(adapter.lastCompatibleRequest.body.model, "standard");
  assert.equal(mappedError.error_type, "rate_limit");
  assert.equal(mappedError.retryable, true);
  assert.equal(normalizedResponse.output.json.ok, true);
});

test("openai-compatible executor fetches through injected transport", async () => {
  const calls = [];
  const executor = createOpenAiCompatibleExecutor({
    networkEnabled: true,
    secretResolver: async () => "transport-secret",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        headers: { get: () => "provider_req_fetch" },
        async text() {
          return JSON.stringify({
            id: "provider_req_fetch",
            choices: [{ message: { content: "{\"ok\":true}" } }],
            usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }
          });
        }
      };
    }
  });
  const adapter = createOpenAiCompatibleProviderAdapter({
    providerPreset: "openai_compatible_gateway",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    authMode: "byok_advanced",
    secretRef: "secret_gateway",
    executor
  });
  const response = await adapter.complete({
    requestId: "req_executor",
    agentRunId: "run_executor",
    modelRef: "openai_compatible_gateway:standard",
    messages: [{ role: "user", content: "Return JSON." }],
    output: { mode: "json" }
  });

  assert.equal(response.status, "succeeded");
  assert.equal(response.output.json.ok, true);
  assert.equal(response.usage.totalTokens, 5);
  assert.equal(calls[0].url, "https://gateway.example.test/v1/chat/completions");
  assert.equal(calls[0].init.headers.authorization, "Bearer transport-secret");
});

test("openai-compatible executor reports missing secret as auth error", async () => {
  const adapter = createOpenAiCompatibleProviderAdapter({
    providerPreset: "openai_compatible_gateway",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    authMode: "byok_advanced",
    secretRef: "missing_secret",
    createExecutor: true,
    networkEnabled: true,
    fetchImpl: async () => {
      throw new Error("fetch should not run without a secret");
    }
  });
  const response = await adapter.complete({
    requestId: "req_missing_secret",
    agentRunId: "run_missing_secret",
    modelRef: "openai_compatible_gateway:standard",
    messages: [{ role: "user", content: "No key." }]
  });

  assert.equal(response.status, "failed");
  assert.equal(response.error.error_type, "auth_error");
  assert.equal(response.error.error_code, "missing_secret");
});

test("openai-compatible adapter dry-run complete fails safely", async () => {
  const adapter = createOpenAiCompatibleProviderAdapter({ providerPreset: "china_optimized_gateway" });
  const response = await adapter.complete({
    requestId: "req_dry_run",
    agentRunId: "run_dry_run",
    modelRef: "china_optimized_gateway:standard",
    messages: [{ role: "user", content: "No network call." }]
  });

  assert.equal(response.status, "failed");
  assert.equal(response.providerId, "china_optimized_gateway");
  assert.equal(response.error.error_type, "provider_unavailable");
  assert.equal(response.error.error_code, "adapter_dry_run");
  assert.equal(adapter.callCount, 1);
  assert.equal(adapter.lastCompatibleRequest.body.model, "standard");
});

test("artifact store records review decisions without mutating source notes", () => {
  const store = createInMemoryArtifactStore();
  const artifact = store.createArtifact({
    type: "ReflectionPrompt",
    title: "Reviewable question",
    agentRunId: "run_review",
    contextPackId: "ctx_review",
    sources: {
      noteIds: ["note_review"],
      sourceDocIds: [],
      artifactIds: [],
      externalUrls: []
    }
  });

  const updated = store.recordDecision(artifact.id, {
    decision: "accepted",
    userId: "user_1",
    noteId: "note_review",
    comment: "Useful prompt."
  });

  assert.equal(updated.status, "accepted");
  assert.equal(updated.provenance.humanAccepted, true);
  assert.equal(updated.userDecisions.length, 1);
  assert.deepEqual(updated.sources.noteIds, ["note_review"]);
  assert.equal(store.listArtifacts({ status: "accepted" }).length, 1);
});

test("AI inbox groups artifacts into pending reviewed and archived views", () => {
  const store = createInMemoryArtifactStore();
  const pending = store.createArtifact({
    type: "ReflectionPrompt",
    title: "Pending prompt",
    agentRunId: "run_inbox",
    sources: { noteIds: ["note_a"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });
  const reviewed = store.createArtifact({
    type: "LinkSuggestion",
    title: "Reviewed link",
    agentRunId: "run_inbox",
    sources: { noteIds: ["note_b"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });
  const archived = store.createArtifact({
    type: "QuestionCard",
    title: "Archived question",
    agentRunId: "run_inbox",
    sources: { noteIds: ["note_a"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });
  store.recordDecision(reviewed.id, { decision: "accepted", userId: "user_1" });
  store.recordDecision(archived.id, { decision: "archived", userId: "user_1" });
  const inbox = createAiInbox({ artifactStore: store });

  assert.deepEqual(inbox.listItems({ view: "pending" }).map((item) => item.artifactId), [pending.id]);
  assert.deepEqual(inbox.listItems({ view: "reviewed" }).map((item) => item.artifactId), [reviewed.id]);
  assert.deepEqual(inbox.listItems({ view: "archived" }).map((item) => item.artifactId), [archived.id]);
  assert.equal(inbox.listItems({ view: "all", sourceNoteId: "note_a" }).length, 2);
  assert.deepEqual(inbox.counts(), { pending: 1, reviewed: 1, archived: 1, all: 3 });
  assert.equal(inbox.getItem(reviewed.id).latestDecision.decision, "accepted");
});

test("sqlite artifact store persists artifacts decisions and inbox views", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let store = await createSqliteArtifactStore({ vaultPath });
  const artifact = store.createArtifact({
    id: "artifact_sqlite_1",
    type: "ReflectionPrompt",
    title: "Persistent prompt",
    summary: "Stored outside human-authored notes.",
    agentRunId: "run_sqlite",
    contextPackId: "ctx_sqlite",
    sources: { noteIds: ["note_sqlite"], sourceDocIds: [], artifactIds: [], externalUrls: [] },
    payload: { prompt: "What should be tested next?" }
  });
  const updated = store.recordDecision(artifact.id, {
    decision: "accepted",
    userId: "user_1",
    noteId: "note_sqlite",
    comment: "Keep this."
  });
  const inbox = createAiInbox({ artifactStore: store });

  assert.equal(updated.status, "accepted");
  assert.equal(inbox.counts().reviewed, 1);
  assert.equal(inbox.listItems({ view: "reviewed", sourceNoteId: "note_sqlite" })[0].artifactId, artifact.id);

  store.close();
  store = await createSqliteArtifactStore({ vaultPath });
  const persisted = store.getArtifact(artifact.id);

  assert.equal(persisted.status, "accepted");
  assert.equal(persisted.payload.prompt, "What should be tested next?");
  assert.equal(persisted.userDecisions.length, 1);
  assert.equal(persisted.userDecisions[0].decision, "accepted");
  assert.equal(store.listArtifacts({ sourceNoteId: "note_sqlite" }).length, 1);
  store.close();
});

test("sqlite run log persists runs events usage and artifacts", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let runLog = await createSqliteRunLog({ vaultPath });
  const started = runLog.startRun({
    agentRunId: "run_sqlite_1",
    taskId: "task_sqlite",
    agentId: "reflection_agent",
    trigger: "user_command",
    modelPack: "China Optimized",
    privacyMode: "normal"
  });
  const event = runLog.addEvent(started.agentRunId, {
    eventType: "model_call",
    summary: { providerId: "mock_provider" },
    usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 }
  });
  const finished = runLog.finishRun(started.agentRunId, {
    status: "succeeded",
    providerId: "mock_provider",
    modelRef: "mock_provider:standard",
    contextPackId: "ctx_sqlite",
    usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8, estimatedCost: 0 },
    artifactIds: ["artifact_sqlite_run"]
  });

  assert.equal(event.eventOrder, 1);
  assert.equal(finished.status, "succeeded");
  assert.deepEqual(finished.artifactIds, ["artifact_sqlite_run"]);
  runLog.close();

  runLog = await createSqliteRunLog({ vaultPath });
  const persisted = runLog.getRun(started.agentRunId);

  assert.equal(persisted.providerId, "mock_provider");
  assert.equal(persisted.modelPack, "China Optimized");
  assert.equal(persisted.contextPackId, "ctx_sqlite");
  assert.equal(persisted.usage.totalTokens, 8);
  assert.equal(persisted.events.length, 1);
  assert.equal(persisted.events[0].summary.providerId, "mock_provider");
  assert.equal(runLog.listRuns({ status: "succeeded" }).length, 1);
  runLog.close();
});

test("sqlite AI preferences store persists user settings", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let store = await createSqliteAiPreferencesStore({ vaultPath });
  const saved = store.setUserPreferences({
    userId: "user_sqlite_pref",
    workspaceId: "workspace_sqlite_pref",
    userMode: "Balanced",
    modelPack: "China Optimized",
    monthlyBudget: 12,
    confirmationThreshold: 0.5,
    budgetState: { monthlySpent: 4.75 },
    fallbackPolicy: { allowCrossProviderFallback: false }
  });

  assert.equal(saved.userMode, "Balanced");
  assert.equal(saved.modelPack, "China Optimized");
  assert.equal(saved.budget.monthlyLimit, 12);
  assert.equal(saved.budget.confirmationThresholdPerRun, 0.5);
  store.close();

  store = await createSqliteAiPreferencesStore({ vaultPath });
  const persisted = store.getUserPreferences({
    userId: "user_sqlite_pref",
    workspaceId: "workspace_sqlite_pref"
  });

  assert.equal(persisted.modelPack, "China Optimized");
  assert.equal(persisted.budgetState.monthlySpent, 4.75);
  assert.equal(persisted.fallbackPolicy.allowCrossProviderFallback, false);
  assert.equal(store.listUserPreferences({ workspaceId: "workspace_sqlite_pref" }).length, 1);
  store.close();
});

test("sqlite context pack store persists envelope items omissions and trace", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let contextPackStore = await createSqliteContextPackStore({ vaultPath });
  const contextPack = createContextPack({
    contextPackId: "ctx_sqlite_1",
    taskId: "task_context_sqlite",
    agentRunId: "run_context_sqlite",
    privacyMode: "normal",
    task: {
      taskType: "connection",
      agentId: "connection_agent",
      trigger: "user_command"
    },
    items: [
      {
        kind: "note",
        sourceId: "note_context_a",
        title: "Context A",
        content: "The exact note content should not be stored as a full audit blob.",
        includedReason: "search_notes",
        relevance: { score: 0.91, method: "search_notes" }
      }
    ],
    omitted: [
      {
        kind: "note",
        sourceId: "note_context_omitted",
        reason: "context_item_limit",
        score: 0.42
      }
    ],
    retrievalTrace: [{ step: "search_notes", tool: "search_notes", selectedCount: 1 }]
  });
  const stored = contextPackStore.createContextPack(contextPack);

  assert.equal(stored.contextPackId, "ctx_sqlite_1");
  assert.equal(stored.items.length, 1);
  assert.equal(stored.items[0].sourceId, "note_context_a");
  assert.equal(stored.items[0].content, "");
  assert.ok(stored.items[0].contentHash.length > 20);
  assert.match(stored.items[0].contentExcerpt, /exact note content/);
  assert.equal(stored.omitted[0].sourceId, "note_context_omitted");
  assert.equal(stored.retrievalTrace[0].tool, "search_notes");

  contextPackStore.close();
  contextPackStore = await createSqliteContextPackStore({ vaultPath });
  const persisted = contextPackStore.getContextPack("ctx_sqlite_1");

  assert.equal(persisted.agentRunId, "run_context_sqlite");
  assert.equal(persisted.budget.estimatedInputTokens, contextPack.budget.estimatedInputTokens);
  assert.equal(contextPackStore.listContextPacks({ agentRunId: "run_context_sqlite" }).length, 1);
  contextPackStore.close();
});

test("harness can persist run log artifacts and context packs to sqlite stores", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let runLog = await createSqliteRunLog({ vaultPath });
  let artifactStore = await createSqliteArtifactStore({ vaultPath });
  let contextPackStore = await createSqliteContextPackStore({ vaultPath });
  const harness = createAiHarness({
    runLog,
    artifactStore,
    contextPackStore,
    providerAdapter: createMockProviderAdapter()
  });

  const result = await harness.runTask({
    taskId: "task_sqlite_harness",
    currentNote: {
      id: "note_sqlite_harness",
      title: "SQLite harness note",
      body: "SQLite harness note\n\nThis run should be auditable after reopening the stores."
    }
  });

  const artifactId = result.artifacts[0].id;
  assert.equal(result.run.status, "succeeded");
  assert.equal(contextPackStore.getContextPack(result.contextPack.contextPackId).agentRunId, result.run.agentRunId);
  assert.equal(runLog.getRun(result.run.agentRunId).events.some((event) => event.eventType === "artifacts_stored"), true);
  assert.equal(runLog.getRun(result.run.agentRunId).events.some((event) => event.eventType === "context_pack_stored"), true);
  assert.equal(artifactStore.getArtifact(artifactId).agentRunId, result.run.agentRunId);

  runLog.close();
  artifactStore.close();
  contextPackStore.close();
  runLog = await createSqliteRunLog({ vaultPath });
  artifactStore = await createSqliteArtifactStore({ vaultPath });
  contextPackStore = await createSqliteContextPackStore({ vaultPath });
  const persistedRun = runLog.getRun(result.run.agentRunId);
  const persistedArtifact = artifactStore.getArtifact(artifactId);
  const persistedContextPack = contextPackStore.getContextPack(result.contextPack.contextPackId);

  assert.equal(persistedRun.status, "succeeded");
  assert.deepEqual(persistedRun.artifactIds, [artifactId]);
  assert.ok(persistedRun.events.some((event) => event.eventType === "model_call"));
  assert.equal(persistedArtifact.sources.noteIds[0], "note_sqlite_harness");
  assert.equal(persistedContextPack.items[0].sourceId, "note_sqlite_harness");
  assert.equal(persistedContextPack.items[0].content, "");
  runLog.close();
  artifactStore.close();
  contextPackStore.close();
});

test("sqlite ai stores factory wires harness audit stores and inbox", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let stores = await createSqliteAiStores({ vaultPath });
  const harness = createAiHarness({
    ...stores,
    providerAdapter: createMockProviderAdapter()
  });

  const result = await harness.runTask({
    taskId: "task_sqlite_factory",
    currentNote: {
      id: "note_sqlite_factory",
      title: "SQLite factory note",
      body: "SQLite factory note\n\nThe aggregate store should make harness setup boring in the best way."
    }
  });
  const artifactId = result.artifacts[0].id;

  assert.equal(result.run.status, "succeeded");
  assert.equal(stores.runLog.getRun(result.run.agentRunId).contextPackId, result.contextPack.contextPackId);
  assert.equal(stores.contextPackStore.getContextPack(result.contextPack.contextPackId).items[0].sourceId, "note_sqlite_factory");
  assert.equal(stores.artifactInbox.listItems({ view: "pending" })[0].artifactId, artifactId);
  assert.equal(stores.artifactStore.getArtifact(artifactId).contextPackId, result.contextPack.contextPackId);
  stores.aiPreferencesStore.setUserPreferences({
    userId: "user_factory_pref",
    workspaceId: "workspace_factory_pref",
    userMode: "Economy",
    modelPack: "Low Cost Research"
  });

  const dbPath = stores.dbPath;
  stores.close();
  stores = await createSqliteAiStores({ dbPath });

  assert.equal(stores.runLog.getRun(result.run.agentRunId).artifactIds[0], artifactId);
  assert.equal(stores.contextPackStore.getContextPack(result.contextPack.contextPackId).agentRunId, result.run.agentRunId);
  assert.equal(stores.artifactInbox.getItem(artifactId).primarySourceNoteId, "note_sqlite_factory");
  assert.equal(
    stores.aiPreferencesStore.getUserPreferences({ userId: "user_factory_pref", workspaceId: "workspace_factory_pref" }).modelPack,
    "Low Cost Research"
  );
  stores.close();
});

test("runtime factory creates sqlite harness from storage mode", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  let harness = await createAiHarnessRuntime({
    storageMode: "sqlite",
    vaultPath,
    providerAdapter: createMockProviderAdapter()
  });

  const result = await harness.runTask({
    taskId: "task_runtime_sqlite",
    currentNote: {
      id: "note_runtime_sqlite",
      title: "Runtime SQLite note",
      body: "Runtime SQLite note\n\nThis should be readable after reopening by dbPath."
    }
  });
  const dbPath = harness.stores.dbPath;
  const artifactId = result.artifacts[0].id;
  const contextPackId = result.contextPack.contextPackId;
  const agentRunId = result.run.agentRunId;

  assert.equal(harness.storageMode, "sqlite");
  assert.equal(harness.runLog.getRun(agentRunId).contextPackId, contextPackId);
  harness.close();

  harness = await createAiHarnessRuntime({
    storageMode: "sqlite",
    dbPath,
    providerAdapter: createMockProviderAdapter()
  });

  assert.equal(harness.runLog.getRun(agentRunId).artifactIds[0], artifactId);
  assert.equal(harness.contextPackStore.getContextPack(contextPackId).items[0].sourceId, "note_runtime_sqlite");
  assert.equal(harness.artifactInbox.getItem(artifactId).primarySourceNoteId, "note_runtime_sqlite");
  harness.close();
});

test("local_only context blocks cloud mock provider before model call", async () => {
  const provider = createMockProviderAdapter({ localExecution: false });
  const harness = createAiHarness({ providerAdapter: provider });
  const contextPack = createContextPack({
    taskId: "task_private",
    privacyMode: "local_only",
    items: [
      {
        kind: "note",
        sourceId: "note_private",
        title: "Private note",
        content: "Sensitive local-only content."
      }
    ]
  });

  const result = await harness.runTask({
    taskId: "task_private",
    contextPack
  });

  assert.equal(result.run.status, "failed");
  assert.equal(provider.callCount, 0);
  assert.equal(result.run.error.errorType, "AI_PRIVACY_CLOUD_PROVIDER_BLOCKED");
  assert.deepEqual(result.artifacts, []);
});

test("invalid provider artifact output fails safely", async () => {
  const provider = createMockProviderAdapter({
    responses: [
      {
        status: "succeeded",
        providerId: "mock_provider",
        modelRef: "mock_provider:bad-output",
        output: {
          type: "json",
          json: {
            artifacts: [{ type: "UnknownArtifact", title: "Bad artifact" }]
          }
        }
      }
    ]
  });
  const harness = createAiHarness({ providerAdapter: provider });

  const result = await harness.runTask({
    taskId: "task_bad_artifact",
    currentNote: { id: "note_1", title: "Note", body: "Body" }
  });

  assert.equal(result.run.status, "failed");
  assert.equal(result.run.error.errorType, "AI_ARTIFACT_TYPE_INVALID");
  assert.deepEqual(result.artifacts, []);
});

test("agent registry rejects write_human_note in MVP", () => {
  assert.throws(
    () =>
      createAgentRegistry([
        {
          agentId: "unsafe_agent",
          allowedTools: ["write_human_note"],
          canWriteHumanNote: true
        }
      ]),
    { code: "AI_AGENT_WRITE_HUMAN_NOTE_FORBIDDEN" }
  );
});

test("tool registry blocks network tools for local_only privacy", async () => {
  const registry = createToolRegistry([
    {
      name: "fetch_external_source",
      permissionLevel: "read_source",
      dataBoundary: "external",
      requiresNetwork: true,
      async handler() {
        return { ok: true };
      }
    }
  ]);

  const result = await registry.call("fetch_external_source", {}, { privacyMode: "local_only" });

  assert.equal(result.status, "failed");
  assert.equal(result.error.errorType, "AI_TOOL_PRIVACY_BLOCKED");
});

test("harness can build context through read_note core tool", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const directories = await listDirectories(vaultPath);
  const originalDirectory = directories.find((item) => item.directoryType === "original_default");
  const note = await createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    title: "Tool context note",
    body: "Tool context note\n\nThis note should be read through the AI tool boundary."
  });

  const harness = createAiHarness({
    tools: createCoreNoteTools({ vaultPath })
  });

  const result = await harness.runTask({
    taskId: "task_tool_context",
    noteId: note.id
  });

  assert.equal(result.run.status, "succeeded");
  assert.equal(result.contextPack.items[0].sourceId, note.id);
  assert.equal(result.artifacts[0].sources.noteIds[0], note.id);
  assert.ok(result.run.events.some((event) => event.eventType === "tool_call"));
});

test("background sensitive run cannot read full note through tool boundary", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const directories = await listDirectories(vaultPath);
  const originalDirectory = directories.find((item) => item.directoryType === "original_default");
  const note = await createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    title: "Private background note",
    body: "Private background note\n\nThis note should require foreground approval."
  });
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({
    providerAdapter: provider,
    tools: createCoreNoteTools({ vaultPath })
  });

  const result = await harness.runTask({
    taskId: "task_background_sensitive",
    trigger: "scheduled",
    privacyMode: "private_project",
    noteId: note.id
  });

  assert.equal(result.run.status, "failed");
  assert.equal(result.run.error.errorType, "AI_TOOL_BACKGROUND_READ_NOTE_BLOCKED");
  assert.equal(provider.callCount, 0);
});

test("search_notes core tool finds note content without mutating notes", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const directories = await listDirectories(vaultPath);
  const originalDirectory = directories.find((item) => item.directoryType === "original_default");
  const target = await createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    title: "Retrieval target",
    body: "Retrieval target\n\nThis note contains the bridge concept for agent retrieval."
  });
  await createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    title: "Unrelated note",
    body: "Unrelated note\n\nThis one should not be returned for the query."
  });
  const registry = createToolRegistry(createCoreNoteTools({ vaultPath }));

  const result = await registry.call("search_notes", { query: "bridge concept", limit: 5 }, { privacyMode: "normal" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.output.total, 1);
  assert.equal(result.output.results[0].noteId, target.id);
  assert.equal(result.output.results[0].matchedReason, "body");
});

test("harness builds bounded context pack from selected note ids", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const first = await createOriginalNote(vaultPath, {
    title: "Selected context one",
    body: "Selected context one\n\nThe first selected note is included."
  });
  const second = await createOriginalNote(vaultPath, {
    title: "Selected context two",
    body: "Selected context two\n\nThe second selected note is included."
  });
  const omitted = await createOriginalNote(vaultPath, {
    title: "Selected context three",
    body: "Selected context three\n\nThis note should be omitted by the max context limit."
  });
  const harness = createAiHarness({
    tools: createCoreNoteTools({ vaultPath })
  });

  const result = await harness.runTask({
    taskId: "task_selected_notes",
    noteIds: [first.id, second.id, omitted.id],
    maxContextNotes: 2
  });

  assert.equal(result.run.status, "succeeded");
  assert.deepEqual(
    result.contextPack.items.map((item) => item.sourceId).sort(),
    [first.id, second.id].sort()
  );
  assert.equal(result.contextPack.omitted.length, 1);
  assert.equal(result.contextPack.omitted[0].sourceId, omitted.id);
  assert.equal(result.run.events.filter((event) => event.eventType === "tool_call").length, 2);
});

test("harness builds connection context through search_notes then read_note", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const first = await createOriginalNote(vaultPath, {
    title: "Bridge concept alpha",
    body: "Bridge concept alpha\n\nThis note mentions the bridge concept for relation discovery."
  });
  const second = await createOriginalNote(vaultPath, {
    title: "Bridge concept beta",
    body: "Bridge concept beta\n\nAnother note uses the bridge concept from a different angle."
  });
  await createOriginalNote(vaultPath, {
    title: "Unmatched context",
    body: "Unmatched context\n\nThis one should not join the connection context."
  });
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({
    providerAdapter: provider,
    tools: createCoreNoteTools({ vaultPath })
  });

  const result = await harness.runTask({
    taskId: "task_search_context",
    agentId: "connection_agent",
    searchNotes: { query: "bridge concept", limit: 10 },
    maxContextNotes: 2
  });

  assert.equal(result.run.status, "succeeded");
  assert.equal(result.artifacts[0].type, "LinkSuggestion");
  assert.deepEqual(
    result.contextPack.items.map((item) => item.sourceId).sort(),
    [first.id, second.id].sort()
  );
  assert.deepEqual(result.artifacts[0].sources.noteIds.sort(), [first.id, second.id].sort());
  assert.deepEqual([result.artifacts[0].payload.from.id, result.artifacts[0].payload.to.id].sort(), [first.id, second.id].sort());
  assert.match(provider.lastRequest.messages[1].content, /"expectedArtifactType": "LinkSuggestion"/);
  assert.match(provider.lastRequest.messages[2].content, /find candidate relationships/);
  assert.ok(result.run.events.some((event) => event.eventType === "tool_call" && event.summary.toolName === "search_notes"));
  assert.equal(result.run.events.filter((event) => event.eventType === "tool_call" && event.summary.toolName === "read_note").length, 2);
});
