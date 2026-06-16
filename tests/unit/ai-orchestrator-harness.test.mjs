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
  createInMemoryAiProviderConfigStore,
  createInMemoryProviderHealthStore,
  createInMemoryArtifactStore,
  createAgentRuntimeRequest,
  createRuntimeToolBridge,
  createContextPack,
  createMockProviderAdapter,
  createOpenAiAgentsSdkRuntime,
  buildOpenAiAgentsSdkRunSpec,
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
  resolveModelRoute,
  artifactTypes,
  buildAgentMessages
} from "../../packages/ai-orchestrator/src/index.mjs";
import {
  createDirectory,
  createNoteRelation,
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

test("artifact schema supports insight and writing artifact types", () => {
  const store = createInMemoryArtifactStore();
  const expectedTypes = ["InsightCard", "BridgeCard", "TensionCard", "SourceGap", "WritingMove"];
  assert.deepEqual(expectedTypes.every((type) => artifactTypes().includes(type)), true);

  for (const type of expectedTypes) {
    const artifact = store.createArtifact({
      id: `artifact_${type}`,
      type,
      title: `${type} example`,
      agentRunId: "run_insight_types",
      sources: { noteIds: ["note_insight"], sourceDocIds: [], artifactIds: [], externalUrls: [] },
      payload: { suggestedAction: "review" }
    });
    assert.equal(artifact.type, type);
    assert.equal(artifact.status, "pending_review");
  }

  assert.equal(store.listArtifacts({ sourceNoteId: "note_insight" }).length, expectedTypes.length);
});

test("writing bridge agent prepares review-only writing move prompts", () => {
  const registry = createAgentRegistry();
  const agent = registry.get("writing_bridge_agent");
  const contextPack = createContextPack({
    contextPackId: "ctx_writing_bridge",
    taskId: "task_writing_bridge",
    agentRunId: "run_writing_bridge",
    privacyMode: "normal",
    items: [
      {
        kind: "note",
        sourceId: "note_claim",
        title: "Claim note",
        content: "Spaced repetition helps only after the learner can name the target skill.",
        origin: "human_authored",
        includedReason: "selected_note"
      }
    ]
  });
  const messages = buildAgentMessages({
    agent,
    contextPack,
    expectedArtifactType: "WritingMove",
    userInstruction: "Prepare a claim move for the draft."
  });

  assert.deepEqual(agent.outputArtifactTypes, ["WritingMove", "OutlineDraft", "SourceGap"]);
  assert.equal(agent.canWriteHumanNote, false);
  assert.equal(agent.canRunInBackground, false);
  assert.match(messages[1].content, /Every artifact\.type must be "WritingMove"/);
  assert.match(messages[2].content, /find source-grounded writing moves/);
  assert.match(messages[2].content, /Do not write a full essay/);
  assert.match(messages[2].content, /sourceNoteIds/);
});

test("writing bridge agent stores WritingMove artifacts without mutating notes", async () => {
  const agentRuntime = createOpenAiAgentsSdkRuntime({
    async execute(request) {
      return {
        status: "succeeded",
        providerId: "writing_runtime",
        modelRef: request.modelRef,
        output: {
          type: "json",
          json: {
            artifacts: [
              {
                type: request.expectedArtifactType,
                title: "Claim move",
                summary: "A reviewable writing move from the selected note.",
                body: "Use the note as a bounded claim, not as a finished paragraph.",
                payload: {
                  moveType: "claim",
                  text: "Spaced repetition helps only after the target skill is clear.",
                  sourceNoteIds: ["note_writing_bridge"],
                  suggestedLocation: "argument",
                  whyItMatters: "It gives the draft a testable boundary.",
                  suggestedAction: "insert_after_review"
                }
              }
            ]
          }
        },
        usage: { inputTokens: 12, outputTokens: 18, totalTokens: 30, estimatedCost: 0, currency: "USD" }
      };
    }
  });
  const harness = createAiHarness({ agentRuntime, providerAdapter: createMockProviderAdapter() });

  const result = await harness.runTask({
    taskId: "task_writing_bridge_run",
    agentId: "writing_bridge_agent",
    currentNote: {
      id: "note_writing_bridge",
      title: "Skill boundary",
      body: "Spaced repetition helps only after the learner can name the target skill."
    }
  });

  assert.equal(result.run.status, "succeeded");
  assert.equal(result.run.agentId, "writing_bridge_agent");
  assert.equal(result.artifacts[0].type, "WritingMove");
  assert.equal(result.artifacts[0].status, "pending_review");
  assert.equal(result.artifacts[0].sources.noteIds[0], "note_writing_bridge");
  assert.equal(harness.artifactInbox.listItems({ view: "pending" })[0].type, "WritingMove");
  assert.equal(harness.artifactStore.getArtifact(result.artifacts[0].id).payload.suggestedAction, "insert_after_review");
});

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

test("harness exposes a default provider adapter runtime boundary", async () => {
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({ providerAdapter: provider });

  const result = await harness.runTask({
    taskId: "task_provider_runtime",
    currentNote: {
      id: "note_provider_runtime",
      title: "Provider runtime note",
      body: "Provider runtime note\n\nThe default runtime should still delegate to the provider adapter."
    }
  });
  const runtimeEvent = result.run.events.find((event) => event.eventType === "agent_runtime_selected");
  const modelEvent = result.run.events.find((event) => event.eventType === "model_call");

  assert.equal(result.run.status, "succeeded");
  assert.equal(provider.callCount, 1);
  assert.equal(harness.agentRuntime.runtimeType, "provider_adapter");
  assert.equal(runtimeEvent.summary.runtimeType, "provider_adapter");
  assert.equal(modelEvent.summary.runtimeType, "provider_adapter");
});

test("harness can execute through an OpenAI Agents SDK runtime adapter", async () => {
  const provider = createMockProviderAdapter();
  let capturedRequest = null;
  const agentRuntime = createOpenAiAgentsSdkRuntime({
    async execute(request) {
      capturedRequest = request;
      return {
        status: "succeeded",
        providerId: "agents_sdk_provider",
        modelRef: request.modelRef,
        output: {
          type: "json",
          json: {
            artifacts: [
              {
                type: request.expectedArtifactType,
                title: "Runtime artifact",
                summary: "Artifact returned by a custom agent runtime.",
                body: "This output came through the runtime boundary rather than direct provider adapter execution.",
                payload: { prompt: "Which assumption should be tested next?", relatedNoteIds: ["note_agents_runtime"] }
              }
            ]
          }
        },
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30, estimatedCost: 0, currency: "USD" }
      };
    }
  });
  const harness = createAiHarness({ providerAdapter: provider, agentRuntime });

  const result = await harness.runTask({
    taskId: "task_agents_runtime",
    currentNote: {
      id: "note_agents_runtime",
      title: "Agents runtime note",
      body: "Agents runtime note\n\nThe harness should allow an SDK runtime to own execution."
    }
  });
  const runtimeEvent = result.run.events.find((event) => event.eventType === "agent_runtime_selected");
  const modelEvent = result.run.events.find((event) => event.eventType === "model_call");

  assert.equal(result.run.status, "succeeded");
  assert.equal(provider.callCount, 0);
  assert.equal(capturedRequest.runtimeType, "agents_sdk");
  assert.equal(capturedRequest.runtimeRequest.agent.agentId, "reflection_agent");
  assert.equal(capturedRequest.sdkRunSpec.agent.name, "reflection_agent");
  assert.equal(capturedRequest.sdkRunSpec.metadata.contextPackId, result.contextPack.contextPackId);
  assert.equal(capturedRequest.providerDescriptor.providerId, "mock_provider");
  assert.equal(runtimeEvent.summary.runtimeType, "agents_sdk");
  assert.equal(modelEvent.summary.providerId, "agents_sdk_provider");
  assert.equal(result.artifacts[0].model.provider, "agents_sdk_provider");
});

test("agent runtime request maps harness state into a portable SDK run spec", () => {
  const contextPack = createContextPack({
    contextPackId: "ctx_runtime_spec",
    taskId: "task_runtime_spec",
    privacyMode: "normal",
    items: [{ kind: "note", sourceId: "note_runtime_spec", title: "Runtime spec", content: "Runtime mapping context." }]
  });
  const runtimeRequest = createAgentRuntimeRequest({
    requestId: "req_runtime_spec",
    agentRunId: "run_runtime_spec",
    runtimeId: "openai_agents_sdk_runtime",
    runtimeType: "agents_sdk",
    purpose: "agent_reasoning",
    agent: {
      agentId: "reflection_agent",
      agentVersion: "v1",
      purpose: "Create reflection prompts.",
      requiredCapabilities: ["structured_output"],
      outputArtifactTypes: ["ReflectionPrompt"]
    },
    providerDescriptor: getProviderPreset("platform_managed_openai"),
    modelRoute: {
      modelRef: "platform_managed_openai:standard",
      selectedTier: "standard",
      requestedTier: "strong_reasoning",
      userMode: "Balanced",
      modelPack: "Starter Auto"
    },
    contextPack,
    messages: [
      { role: "system", content: "System instruction" },
      { role: "developer", content: "Developer instruction" },
      { role: "user", content: "User task" }
    ],
    tools: [
      {
        name: "search_notes",
        description: "Search notes",
        permissionLevel: "read_public",
        dataBoundary: "workspace"
      }
    ],
    output: { mode: "schema", schema: { artifactType: "ReflectionPrompt" } },
    policy: { privacyMode: "normal", allowCloud: true, allowFallback: true }
  });
  const sdkSpec = buildOpenAiAgentsSdkRunSpec({ runtimeRequest });

  assert.equal(runtimeRequest.agent.agentId, "reflection_agent");
  assert.equal(runtimeRequest.model.modelRef, "platform_managed_openai:standard");
  assert.equal(runtimeRequest.provider.runtimeModelMap["platform_managed_openai:standard"], "gpt-5.4");
  assert.equal(runtimeRequest.context.contextPackId, "ctx_runtime_spec");
  assert.equal(runtimeRequest.tools[0].name, "search_notes");
  assert.equal(sdkSpec.agent.name, "reflection_agent");
  assert.equal(sdkSpec.agent.instructions, "System instruction");
  assert.equal(sdkSpec.agent.developerInstructions, "Developer instruction");
  assert.equal(sdkSpec.model.modelRef, "gpt-5.4");
  assert.equal(sdkSpec.model.logicalModelRef, "platform_managed_openai:standard");
  assert.equal(sdkSpec.model.providerId, "platform_managed_openai");
  assert.equal(sdkSpec.input.context.itemCount, 1);
  assert.equal(sdkSpec.policy.allowCloud, true);
  assert.equal(sdkSpec.metadata.agentRunId, "run_runtime_spec");
});

test("runtime tool bridge exposes only allowed tool metadata and blocks unknown calls", async () => {
  const registry = createToolRegistry([
    {
      name: "runtime_echo",
      description: "Echo a runtime payload",
      permissionLevel: "read_public",
      dataBoundary: "workspace",
      async handler(input) {
        return { echoed: input.value };
      }
    }
  ]);
  const calls = [];
  const bridge = createRuntimeToolBridge({
    toolRegistry: registry,
    allowedToolNames: ["runtime_echo", "missing_tool"],
    toolContext: { trigger: "user_command", privacyMode: "normal" },
    onToolCall(call) {
      calls.push(call);
    }
  });

  const allowed = await bridge.callTool("runtime_echo", { value: "hello" });
  const denied = await bridge.callTool("read_note", { noteId: "note_blocked" });

  assert.deepEqual(bridge.tools.map((tool) => tool.name), ["runtime_echo"]);
  assert.equal(bridge.tools[0].parameters, null);
  assert.equal(allowed.status, "succeeded");
  assert.equal(allowed.output.echoed, "hello");
  assert.equal(denied.status, "failed");
  assert.equal(denied.error.errorType, "AI_RUNTIME_TOOL_NOT_ALLOWED");
  assert.equal(calls.length, 2);
});

test("tool registry exposes parameter schemas to agent runtimes", () => {
  const registry = createToolRegistry([
    {
      name: "runtime_echo",
      description: "Echo a runtime payload",
      permissionLevel: "read_public",
      dataBoundary: "workspace",
      parameters: {
        type: "object",
        properties: { value: { type: "string" } },
        required: ["value"],
        additionalProperties: false
      },
      async handler(input) {
        return { echoed: input.value };
      }
    }
  ]);
  const bridge = createRuntimeToolBridge({
    toolRegistry: registry,
    allowedToolNames: ["runtime_echo"],
    toolContext: { trigger: "user_command", privacyMode: "normal" }
  });

  assert.deepEqual(bridge.tools[0].parameters.properties.value, { type: "string" });
  assert.deepEqual(registry.list()[0].parameters.required, ["value"]);
});

test("agent runtime tool calls are routed through the harness tool registry and run log", async () => {
  let runtimeToolOutput = null;
  const agentRuntime = createOpenAiAgentsSdkRuntime({
    async execute(request) {
      const toolCall = await request.toolBridge.callTool("runtime_echo", { value: "from_runtime" });
      runtimeToolOutput = toolCall.output;
      return {
        status: "succeeded",
        providerId: "agents_sdk_provider",
        modelRef: request.modelRef,
        output: {
          type: "json",
          json: {
            artifacts: [
              {
                type: request.expectedArtifactType,
                title: "Runtime tool artifact",
                summary: "Artifact created after a runtime tool call.",
                body: "The runtime used a harness-approved tool before returning this artifact.",
                payload: { prompt: "What did the runtime tool return?", relatedNoteIds: ["note_runtime_tool"] }
              }
            ]
          }
        },
        usage: { inputTokens: 4, outputTokens: 8, totalTokens: 12, estimatedCost: 0, currency: "USD" }
      };
    }
  });
  const harness = createAiHarness({
    agentRuntime,
    agentDefinitions: [
      {
        agentId: "runtime_tool_agent",
        agentVersion: "v1",
        defaultModelTier: "standard",
        requiredCapabilities: ["structured_output", "tool_calling"],
        allowedTools: ["runtime_echo"],
        outputArtifactTypes: ["ReflectionPrompt"]
      }
    ],
    tools: [
      {
        name: "runtime_echo",
        description: "Echo runtime input",
        permissionLevel: "read_public",
        dataBoundary: "workspace",
        async handler(input) {
          return { echoed: input.value };
        }
      }
    ]
  });

  const result = await harness.runTask({
    taskId: "task_runtime_tool",
    agentId: "runtime_tool_agent",
    currentNote: {
      id: "note_runtime_tool",
      title: "Runtime tool note",
      body: "Runtime tool note\n\nThe SDK runtime should call tools through the harness boundary."
    }
  });
  const runtimeToolEvent = result.run.events.find((event) => event.eventType === "tool_call" && event.summary.runtimeTool === true);

  assert.equal(result.run.status, "succeeded");
  assert.equal(runtimeToolOutput.echoed, "from_runtime");
  assert.equal(runtimeToolEvent.summary.toolName, "runtime_echo");
  assert.equal(runtimeToolEvent.status, "succeeded");
  assert.equal(result.artifacts[0].type, "ReflectionPrompt");
});

test("OpenAI Agents SDK runtime builds an SDK agent and normalizes final output", async () => {
  let capturedAgentConfig = null;
  let capturedInput = null;
  let capturedRunOptions = null;
  let capturedRunnerConfig = null;
  let capturedToolOutput = null;
  const fakeSdk = {
    Agent: class {
      constructor(config) {
        this.name = config.name;
        this.config = config;
        capturedAgentConfig = config;
      }
    },
    tool(options) {
      return options;
    },
    Runner: class {
      constructor(config) {
        capturedRunnerConfig = config;
      }

      async run(agent, input, options) {
        return fakeSdk.run(agent, input, options);
      }
    },
    async run(agent, input, options) {
      capturedInput = input;
      capturedRunOptions = options;
      capturedToolOutput = await agent.config.tools[0].execute({ value: "via_sdk" });
      return {
        finalOutput: JSON.stringify({
          artifacts: [
            {
              type: "ReflectionPrompt",
              title: "SDK artifact",
              summary: "Artifact returned by the SDK runtime.",
              body: "The fake SDK run produced a provider-compatible artifact envelope.",
              payload: { prompt: "What should be inspected next?", relatedNoteIds: ["note_sdk_runtime"] }
            }
          ]
        }),
        rawResponses: [
          {
            responseId: "resp_fake_sdk",
            usage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 }
          }
        ],
        lastResponseId: "resp_fake_sdk"
      };
    }
  };
  const agentRuntime = createOpenAiAgentsSdkRuntime({
    sdk: fakeSdk
  });
  const harness = createAiHarness({
    agentRuntime,
    agentDefinitions: [
      {
        agentId: "sdk_runtime_agent",
        agentVersion: "v1",
        defaultModelTier: "standard",
        requiredCapabilities: ["structured_output", "tool_calling"],
        allowedTools: ["runtime_echo"],
        outputArtifactTypes: ["ReflectionPrompt"]
      }
    ],
    tools: [
      {
        name: "runtime_echo",
        description: "Echo runtime input",
        permissionLevel: "read_public",
        dataBoundary: "workspace",
        parameters: {
          type: "object",
          properties: { value: { type: "string" } },
          required: ["value"],
          additionalProperties: false
        },
        async handler(input) {
          return { echoed: input.value };
        }
      }
    ]
  });

  const result = await harness.runTask({
    taskId: "task_openai_sdk_runtime",
    agentId: "sdk_runtime_agent",
    currentNote: {
      id: "note_sdk_runtime",
      title: "SDK runtime note",
      body: "SDK runtime note\n\nThe OpenAI Agents SDK runtime should normalize final output into artifacts."
    }
  });
  const modelEvent = result.run.events.find((event) => event.eventType === "model_call");

  assert.equal(result.run.status, "succeeded");
  assert.equal(capturedAgentConfig.name, "sdk_runtime_agent");
  assert.equal(capturedAgentConfig.model, "gpt-5.4");
  assert.equal(capturedAgentConfig.tools[0].parameters.properties.value.type, "string");
  assert.match(capturedAgentConfig.instructions, /Human-authored notes are the user's source of truth/);
  assert.match(capturedInput, /Context index/);
  assert.equal(capturedRunOptions.stream, false);
  assert.equal(capturedRunnerConfig.traceIncludeSensitiveData, false);
  assert.equal(capturedRunnerConfig.toolExecution.maxFunctionToolConcurrency, 1);
  assert.match(capturedToolOutput, /via_sdk/);
  assert.equal(modelEvent.summary.runtimeType, "agents_sdk");
  assert.equal(modelEvent.usage.totalTokens, 18);
  assert.equal(result.run.modelRef, "gpt-5.4");
  assert.equal(result.artifacts[0].type, "ReflectionPrompt");
});

test("OpenAI Agents SDK runtime constructs real SDK tools without a network call", async () => {
  const realSdk = await import("@openai/agents");
  let capturedSdkAgent = null;
  const sdk = {
    Agent: realSdk.Agent,
    tool: realSdk.tool,
    Runner: class {
      async run(agent) {
        capturedSdkAgent = agent;
        return {
          finalOutput: JSON.stringify({
            artifacts: [
              {
                type: "ReflectionPrompt",
                title: "Real SDK construction",
                summary: "The real SDK accepted the bridged tool definition.",
                body: "No model request was made in this test.",
                payload: { prompt: "Which SDK boundary should be verified next?", relatedNoteIds: ["note_real_sdk_construct"] }
              }
            ]
          }),
          rawResponses: []
        };
      }
    }
  };
  const agentRuntime = createOpenAiAgentsSdkRuntime({
    sdk,
    modelAliases: { "platform_managed_openai:standard": "gpt-test-standard" }
  });
  const harness = createAiHarness({
    agentRuntime,
    agentDefinitions: [
      {
        agentId: "real_sdk_construct_agent",
        agentVersion: "v1",
        defaultModelTier: "standard",
        requiredCapabilities: ["structured_output", "tool_calling"],
        allowedTools: ["runtime_echo"],
        outputArtifactTypes: ["ReflectionPrompt"]
      }
    ],
    tools: [
      {
        name: "runtime_echo",
        description: "Echo runtime input",
        permissionLevel: "read_public",
        dataBoundary: "workspace",
        parameters: {
          type: "object",
          properties: { value: { type: "string" } },
          required: ["value"],
          additionalProperties: false
        },
        async handler(input) {
          return { echoed: input.value };
        }
      }
    ]
  });

  const result = await harness.runTask({
    taskId: "task_real_sdk_construct",
    agentId: "real_sdk_construct_agent",
    currentNote: {
      id: "note_real_sdk_construct",
      title: "Real SDK construct note",
      body: "Real SDK construct note\n\nThis test should instantiate actual SDK tool definitions only."
    }
  });

  assert.equal(result.run.status, "succeeded");
  assert.equal(capturedSdkAgent.model, "gpt-test-standard");
  assert.equal(capturedSdkAgent.tools[0].name, "runtime_echo");
  assert.equal(capturedSdkAgent.tools[0].parameters.type, "object");
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
  const ollamaLocal = getProviderPreset("ollama_local_gateway");
  const minicpmLocal = getProviderPreset("minicpm_local_gateway");
  const minicpmRemote = getProviderPreset("minicpm_remote_gateway");
  const gateway = getProviderPreset("openai_compatible_gateway");
  const openai = getProviderPreset("platform_managed_openai");

  assert.deepEqual(
    ids,
    [
      "china_optimized_gateway",
      "local_private_gateway",
      "minicpm_local_gateway",
      "minicpm_remote_gateway",
      "ollama_local_gateway",
      "openai_compatible_gateway",
      "platform_managed_openai"
    ].sort()
  );
  assert.equal(local.adapterType, "local_gateway");
  assert.equal(local.localExecution, true);
  assert.equal(local.modelMap.local_private, "local_private_gateway:local_private");
  assert.equal(ollamaLocal.adapterType, "local_gateway");
  assert.equal(ollamaLocal.localExecution, true);
  assert.equal(ollamaLocal.endpointUrl, "http://localhost:11434/v1/chat/completions");
  assert.equal(ollamaLocal.runtimeModelMap["ollama_local_gateway:local_private"], "qwen3:4b");
  assert.equal(minicpmLocal.adapterType, "local_gateway");
  assert.equal(minicpmLocal.localExecution, true);
  assert.equal(minicpmLocal.modelMap.local_private, "minicpm_local_gateway:local_private");
  assert.equal(minicpmLocal.runtimeModelMap["minicpm_local_gateway:standard"], "minicpm");
  assert.equal(minicpmRemote.adapterType, "aggregated_gateway");
  assert.equal(minicpmRemote.localExecution, false);
  assert.equal(minicpmRemote.runtimeModelMap["minicpm_remote_gateway:standard"], "minicpm");
  assert.equal(gateway.adapterType, "aggregated_gateway");
  assert.equal(gateway.modelMap.standard, "openai_compatible_gateway:standard");
  assert.equal(openai.runtimeModelMap["platform_managed_openai:strong_reasoning"], "gpt-5.5");
  assert.ok(gateway.authModes.includes("byok_advanced"));
});

test("model packs compile simple user choices into provider policy", () => {
  const packIds = listModelPacks().map((pack) => pack.modelPackId).sort();
  const starter = getModelPack("Starter Auto");
  const china = resolveAiUserSettings({ modelPack: "China Optimized" });
  const localMode = resolveAiUserSettings({ userMode: "local" });
  const ollamaLocal = resolveAiUserSettings({ modelPack: "Ollama Local" });
  const minicpmLocal = resolveAiUserSettings({ modelPack: "MiniCPM Local" });
  const minicpmRemote = resolveAiUserSettings({ modelPack: "MiniCPM Remote" });
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
  assert.equal(ollamaLocal.providerPreset, "ollama_local_gateway");
  assert.equal(ollamaLocal.privacy.defaultMode, "local_only");
  assert.equal(ollamaLocal.fallbackPolicy.allowCloudFallback, false);
  assert.equal(minicpmLocal.providerPreset, "minicpm_local_gateway");
  assert.equal(minicpmLocal.privacy.defaultMode, "local_only");
  assert.equal(minicpmLocal.fallbackPolicy.allowCloudFallback, false);
  assert.equal(minicpmRemote.providerPreset, "minicpm_remote_gateway");
  assert.equal(minicpmRemote.privacy.allowCloud, true);
  assert.equal(descriptor.providerId, "local_private_gateway");
  assert.equal(descriptor.authMode, "local_no_key");
});

test("provider adapter registry creates adapters from model pack presets", () => {
  const registry = createProviderAdapterRegistry();
  const china = registry.getAdapter({ modelPack: "China Optimized" });
  const local = registry.getAdapter({ userMode: "Local / Private" });
  const ollama = registry.getAdapter({ modelPack: "Ollama Local" });
  const adapters = registry.listAdapters().map((entry) => entry.providerId).sort();

  assert.equal(china.source, "factory");
  assert.equal(china.adapter.descriptor.providerId, "china_optimized_gateway");
  assert.equal(china.adapter.descriptor.adapterType, "aggregated_gateway");
  assert.equal(local.adapter.descriptor.providerId, "local_private_gateway");
  assert.equal(local.adapter.descriptor.localExecution, true);
  assert.equal(ollama.adapter.descriptor.providerId, "ollama_local_gateway");
  assert.equal(ollama.adapter.descriptor.localExecution, true);
  assert.deepEqual(adapters, ["china_optimized_gateway", "local_private_gateway", "ollama_local_gateway"].sort());
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

test("hybrid runtime routes lightweight tasks to local model and keeps deep tasks on cloud", async () => {
  const aiPreferencesStore = createInMemoryAiPreferencesStore();
  aiPreferencesStore.setUserPreferences({
    workspaceId: "local_workspace",
    userId: "local_user",
    userMode: "Auto",
    modelPack: "Starter Auto",
    privacy: { defaultMode: "normal", allowCloud: true, localPreferred: true },
    advancedSettings: {
      runtimeMode: "hybrid",
      localModel: "qwen2.5:3b"
    }
  });
  const harness = createAiHarness({ aiPreferencesStore });

  const relation = await harness.runTask({
    taskId: "task_hybrid_relation",
    agentId: "connection_agent",
    taskType: "relation_scan",
    currentNote: {
      id: "note_hybrid_relation",
      title: "Hybrid relation note",
      body: "Hybrid local routing should handle lightweight relation scans."
    }
  });
  const relationProvider = relation.run.events.find((event) => event.eventType === "provider_adapter_selected");
  const relationRoute = relation.run.events.find((event) => event.eventType === "model_route_selected");
  assert.equal(relationProvider.summary.providerId, "local_private_gateway");
  assert.equal(relationProvider.summary.hybridRoutingReason, "lightweight_agent");
  assert.equal(relationRoute.summary.modelRef, "local_private_gateway:qwen2.5:3b");

  const reflection = await harness.runTask({
    taskId: "task_hybrid_reflection",
    agentId: "reflection_agent",
    taskType: "reflection",
    currentNote: {
      id: "note_hybrid_reflection",
      title: "Hybrid reflection note",
      body: "Hybrid mode should keep deep reflection on the cloud route."
    }
  });
  const reflectionProvider = reflection.run.events.find((event) => event.eventType === "provider_adapter_selected");
  const reflectionRoute = reflection.run.events.find((event) => event.eventType === "model_route_selected");
  assert.equal(reflectionProvider.summary.providerId, "platform_managed_openai");
  assert.equal(reflectionProvider.summary.hybridRoutingReason, "");
  assert.equal(reflectionRoute.summary.selectedTier, "strong_reasoning");
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

test("harness applies stored advanced model override from AI preferences", async () => {
  const provider = createMockProviderAdapter({
    descriptor: {
      modelMap: {
        standard: "mock_provider:standard-model"
      }
    }
  });
  const aiPreferencesStore = createInMemoryAiPreferencesStore();
  aiPreferencesStore.setUserPreferences({
    userId: "user_advanced_model",
    workspaceId: "workspace_advanced_model",
    userMode: "Balanced",
    advancedSettings: { modelRef: "mock_provider:manual-model" }
  });
  const harness = createAiHarness({ providerAdapter: provider, aiPreferencesStore });

  const result = await harness.runTask({
    taskId: "task_advanced_model_pref",
    userId: "user_advanced_model",
    workspaceId: "workspace_advanced_model",
    currentNote: {
      id: "note_advanced_model_pref",
      title: "Advanced model preference note",
      body: "Advanced model preference note\n\nA stored advanced model ID should override automatic tier routing."
    }
  });
  const routeEvent = result.run.events.find((event) => event.eventType === "model_route_selected");

  assert.equal(result.run.status, "succeeded");
  assert.equal(routeEvent.summary.modelRef, "mock_provider:manual-model");
  assert.equal(routeEvent.summary.advancedOverride, true);
  assert.equal(provider.lastRequest.modelRef, "mock_provider:manual-model");
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

test("harness applies stored provider config to runtime adapter selection", async () => {
  const aiPreferencesStore = createInMemoryAiPreferencesStore();
  aiPreferencesStore.setUserPreferences({
    userId: "user_provider_config",
    workspaceId: "workspace_provider_config",
    modelPack: "Global Optimized",
    budget: { monthlyLimit: 10, confirmationThresholdPerRun: 10 }
  });
  const providerConfigStore = createInMemoryAiProviderConfigStore();
  providerConfigStore.setProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_gateway",
    endpointUrl: "https://gateway.example.test/v1/chat/completions",
    modelMap: {
      strong_reasoning: "openai_compatible_gateway:strong_override"
    },
    runtimeModelMap: {
      "openai_compatible_gateway:strong_override": "gateway-strong-model"
    }
  });
  const harness = createAiHarness({ aiPreferencesStore, providerConfigStore });

  const result = await harness.runTask({
    taskId: "task_provider_config_runtime",
    userId: "user_provider_config",
    workspaceId: "workspace_provider_config",
    currentNote: {
      id: "note_provider_config_runtime",
      title: "Provider config note",
      body: "Provider config note\n\nA stored provider config should drive runtime adapter selection."
    }
  });
  const adapterEvent = result.run.events.find((event) => event.eventType === "provider_adapter_selected");
  const configEvent = result.run.events.find((event) => event.eventType === "ai_provider_config_loaded");
  const routeEvent = result.run.events.find((event) => event.eventType === "model_route_selected");

  assert.equal(result.run.status, "succeeded");
  assert.equal(harness.providerAdapter.descriptor.providerId, "openai_compatible_gateway");
  assert.equal(harness.providerAdapter.descriptor.endpointUrl, "https://gateway.example.test/v1/chat/completions");
  assert.equal(harness.providerAdapter.descriptor.secretRef, "secret_gateway");
  assert.equal(adapterEvent.summary.providerConfigId, "provider_openai_compatible_gateway");
  assert.equal(adapterEvent.summary.endpointConfigured, true);
  assert.equal(adapterEvent.summary.secretRefConfigured, true);
  assert.equal(configEvent.summary.providerConfigId, "provider_openai_compatible_gateway");
  assert.equal(routeEvent.summary.modelRef, "openai_compatible_gateway:strong_override");
  assert.equal(providerConfigStore.getProviderConfig({ providerId: "openai_compatible_gateway" }).secretRef, "secret_gateway");
});

test("harness blocks disabled stored provider config before model call", async () => {
  const aiPreferencesStore = createInMemoryAiPreferencesStore();
  aiPreferencesStore.setUserPreferences({
    userId: "user_provider_config_disabled",
    workspaceId: "workspace_provider_config_disabled",
    modelPack: "Global Optimized",
    budget: { monthlyLimit: 10, confirmationThresholdPerRun: 10 }
  });
  const providerConfigStore = createInMemoryAiProviderConfigStore();
  providerConfigStore.setProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    status: "disabled",
    secretRef: "",
    endpointUrl: "",
    runtimeModelMap: {},
    healthCheck: {
      enabled: false,
      endpointUrl: "",
      method: "GET",
      timeoutMs: 5000,
      expectedStatus: 200,
      intervalSeconds: 300
    }
  });
  const harness = createAiHarness({ aiPreferencesStore, providerConfigStore });

  const result = await harness.runTask({
    taskId: "task_provider_config_disabled",
    userId: "user_provider_config_disabled",
    workspaceId: "workspace_provider_config_disabled",
    currentNote: {
      id: "note_provider_config_disabled",
      title: "Disabled provider config note",
      body: "Disabled provider config note\n\nA disabled provider config should block runtime calls."
    }
  });
  const guardEvent = result.run.events.find((event) => event.eventType === "run_guardrail");
  const failedEvent = result.run.events.find((event) => event.eventType === "run_failed");
  const modelCallEvent = result.run.events.find((event) => event.eventType === "model_call");

  assert.equal(result.run.status, "blocked");
  assert.equal(guardEvent?.error?.errorType, "AI_PROVIDER_CONFIG_DISABLED");
  assert.equal(failedEvent?.summary?.code, "AI_PROVIDER_CONFIG_DISABLED");
  assert.equal(modelCallEvent, undefined);
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

test("harness blocks scheduled runs when latest provider health is down", async () => {
  const provider = createMockProviderAdapter();
  const providerHealthStore = createInMemoryProviderHealthStore({
    records: [
      {
        id: "health_mock_down",
        providerId: "mock_provider",
        status: "down",
        checkedAt: "2026-05-12T01:00:00.000Z",
        errorType: "provider_unavailable"
      }
    ]
  });
  const harness = createAiHarness({ providerAdapter: provider, providerHealthStore });

  const result = await harness.runTask({
    taskId: "task_provider_health_blocked",
    trigger: "scheduled_task",
    currentNote: {
      id: "note_provider_health_blocked",
      title: "Provider health blocked note",
      body: "Provider health blocked note\n\nA down provider should stop scheduled work before model calls."
    }
  });
  const healthEvent = result.run.events.find((event) => event.eventType === "provider_health_observed");

  assert.equal(result.run.status, "skipped");
  assert.equal(result.run.error.errorType, "AI_PROVIDER_HEALTH_BLOCKED");
  assert.equal(provider.callCount, 0);
  assert.equal(healthEvent.status, "down");
  assert.equal(healthEvent.summary.errorType, "provider_unavailable");
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
  assert.equal(request.body.max_tokens, 500);
  assert.equal(request.metadata.allowFallback, true);
});

test("openai-compatible adapter maps snake_case output token settings at runtime", () => {
  const request = buildOpenAiCompatibleRequest(
    {
      requestId: "req_compatible_snake",
      agentRunId: "run_compatible_snake",
      purpose: "agent_reasoning",
      modelRef: "openai_compatible_gateway:standard",
      messages: [{ role: "user", content: "User question." }],
      settings: { stream: false, max_output_tokens: 320 }
    },
    {
      endpointUrl: "https://gateway.example.test/v1/chat/completions",
      authMode: "byok_advanced",
      secretRef: "secret_gateway"
    }
  );

  assert.equal(request.body.max_tokens, 320);
});

test("openai-compatible adapter applies runtime model map for MiniCPM gateways", () => {
  const request = buildOpenAiCompatibleRequest(
    {
      requestId: "req_minicpm",
      agentRunId: "run_minicpm",
      purpose: "agent_reasoning",
      modelRef: "minicpm_local_gateway:local_private",
      messages: [{ role: "user", content: "Hello MiniCPM." }]
    },
    {
      descriptor: getProviderPreset("minicpm_local_gateway"),
      endpointUrl: "http://localhost:11434/v1/chat/completions",
      authMode: "local_no_key"
    }
  );

  assert.equal(request.endpointUrl, "http://localhost:11434/v1/chat/completions");
  assert.equal(request.auth.authMode, "local_no_key");
  assert.equal(request.body.model, "minicpm");
  assert.equal(request.metadata.modelRef, "minicpm_local_gateway:local_private");
  assert.equal(request.metadata.runtimeModelRef, "minicpm");
});

test("openai-compatible adapter applies Ollama local defaults", () => {
  const request = buildOpenAiCompatibleRequest(
    {
      requestId: "req_ollama",
      agentRunId: "run_ollama",
      purpose: "ai_inbox_summarize",
      modelRef: "ollama_local_gateway:local_private",
      messages: [{ role: "user", content: "Summarize this local inbox item." }]
    },
    {
      descriptor: getProviderPreset("ollama_local_gateway"),
      authMode: "local_no_key"
    }
  );

  assert.equal(request.endpointUrl, "http://localhost:11434/v1/chat/completions");
  assert.equal(request.auth.authMode, "local_no_key");
  assert.equal(request.body.model, "qwen3:4b");
  assert.equal(request.metadata.providerId, "ollama_local_gateway");
  assert.equal(request.metadata.modelRef, "ollama_local_gateway:local_private");
  assert.equal(request.metadata.runtimeModelRef, "qwen3:4b");
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
    comment: "Useful prompt.",
    feedback: {
      useful: true,
      already_known: true
    }
  });

  assert.equal(updated.status, "accepted");
  assert.equal(updated.provenance.humanAccepted, true);
  assert.equal(updated.userDecisions.length, 1);
  assert.deepEqual(updated.userDecisions[0].feedback, {
    useful: true,
    noisy: false,
    wrong: false,
    alreadyKnown: true,
    privacyConcern: false
  });
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

test("AI inbox applies view filters before the artifact store page cap", () => {
  const store = createInMemoryArtifactStore();
  const pending = store.createArtifact({
    id: "artifact_old_pending",
    type: "ReflectionPrompt",
    title: "Old pending prompt",
    agentRunId: "run_inbox_limit",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sources: { noteIds: ["note_old"], sourceDocIds: [], artifactIds: [], externalUrls: [] }
  });

  for (let i = 0; i < 205; i += 1) {
    const createdAt = `2026-05-${String(1 + (i % 28)).padStart(2, "0")}T${String(Math.floor(i / 28)).padStart(2, "0")}:00:00.000Z`;
    const artifact = store.createArtifact({
      id: `artifact_reviewed_${i}`,
      type: "ReflectionPrompt",
      title: `Reviewed prompt ${i}`,
      agentRunId: "run_inbox_limit",
      createdAt,
      updatedAt: createdAt,
      sources: { noteIds: [`note_reviewed_${i}`], sourceDocIds: [], artifactIds: [], externalUrls: [] }
    });
    store.recordDecision(artifact.id, { decision: "accepted", userId: "user_1" });
  }

  const inbox = createAiInbox({ artifactStore: store });
  assert.deepEqual(inbox.listItems({ view: "pending" }).map((item) => item.artifactId), [pending.id]);
  assert.equal(inbox.counts().pending, 1);
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
    comment: "Keep this.",
    privacy_concern: true
  });
  const inbox = createAiInbox({ artifactStore: store });

  assert.equal(updated.status, "accepted");
  assert.equal(updated.userDecisions[0].feedback.privacyConcern, true);
  assert.equal(inbox.counts().reviewed, 1);
  assert.equal(inbox.listItems({ view: "reviewed", sourceNoteId: "note_sqlite" })[0].artifactId, artifact.id);

  store.close();
  store = await createSqliteArtifactStore({ vaultPath });
  const persisted = store.getArtifact(artifact.id);

  assert.equal(persisted.status, "accepted");
  assert.equal(persisted.payload.prompt, "What should be tested next?");
  assert.equal(persisted.userDecisions.length, 1);
  assert.equal(persisted.userDecisions[0].decision, "accepted");
  assert.deepEqual(persisted.userDecisions[0].feedback, {
    useful: false,
    noisy: false,
    wrong: false,
    alreadyKnown: false,
    privacyConcern: true
  });
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
    fallbackPolicy: { allowCrossProviderFallback: false },
    advancedSettings: {
      modelRef: "china_optimized_gateway:manual-model",
      secretRef: "secret_china_gateway"
    }
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
  assert.equal(persisted.advancedSettings.modelRef, "china_optimized_gateway:manual-model");
  assert.equal(persisted.advancedSettings.secretRef, "secret_china_gateway");
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
  stores.providerConfigStore.setProviderConfig({
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "secret_gateway",
    endpointUrl: "https://gateway.example.test/v1/chat/completions"
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
  assert.equal(stores.providerConfigStore.getProviderConfig({ providerId: "openai_compatible_gateway" }).secretRef, "secret_gateway");
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
    body: "Retrieval target\n\nThis note contains the bridge concept for agent retrieval and a shared scope marker."
  });
  const secondDirectory = await createDirectory(vaultPath, {
    parentDirectoryId: originalDirectory.id,
    title: "Scheduled scope",
    fsPath: path.join(vaultPath, "notes", "original", "scheduled-scope")
  });
  const scopedTarget = await createNoteInDirectory(vaultPath, {
    directoryId: secondDirectory.id,
    title: "Scoped retrieval target",
    body: "Scoped retrieval target\n\nThis note contains a shared scope marker for multi-directory retrieval. #ai-scope"
  });
  await createNoteInDirectory(vaultPath, {
    directoryId: originalDirectory.id,
    title: "Unrelated note",
    body: "Unrelated note\n\nThis one should not be returned for the query."
  });
  const registry = createToolRegistry(createCoreNoteTools({ vaultPath }));

  const result = await registry.call("search_notes", { query: "agent retrieval", limit: 5 }, { privacyMode: "normal" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.output.total, 1);
  assert.equal(result.output.results[0].noteId, target.id);
  assert.equal(result.output.results[0].matchedReason, "body");

  const scopedResult = await registry.call(
    "search_notes",
    { query: "shared scope marker", directoryIds: [originalDirectory.id, secondDirectory.id], limit: 5 },
    { privacyMode: "normal" }
  );
  assert.equal(scopedResult.status, "succeeded");
  assert.deepEqual(
    scopedResult.output.results.map((item) => item.noteId).sort(),
    [target.id, scopedTarget.id].sort()
  );

  const tagResult = await registry.call(
    "search_notes",
    { tag: ["ai-scope"], rootDirectoryIds: [originalDirectory.id], limit: 5 },
    { privacyMode: "normal" }
  );
  assert.equal(tagResult.status, "succeeded");
  assert.equal(tagResult.output.results[0].noteId, scopedTarget.id);
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

test("harness can enrich connection context with graph neighborhoods", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const first = await createOriginalNote(vaultPath, {
    title: "Graph bridge alpha",
    body: "Graph bridge alpha\n\nThis note mentions the graph bridge concept. #shared"
  });
  const second = await createOriginalNote(vaultPath, {
    title: "Graph bridge beta",
    body: "Graph bridge beta\n\nA second note mentions the graph bridge concept."
  });
  const backlink = await createOriginalNote(vaultPath, {
    title: "Backlink source",
    body: "Backlink source\n\nThis note does not match the retrieval query."
  });
  await createNoteRelation(vaultPath, {
    fromNoteId: first.id,
    toNoteId: second.id,
    relationType: "supports",
    rationale: "Alpha supports beta."
  });
  await createNoteRelation(vaultPath, {
    fromNoteId: backlink.id,
    toNoteId: first.id,
    relationType: "asks",
    rationale: "Backlink asks about alpha."
  });
  const provider = createMockProviderAdapter();
  const harness = createAiHarness({
    providerAdapter: provider,
    tools: createCoreNoteTools({ vaultPath })
  });

  const result = await harness.runTask({
    taskId: "task_graph_context",
    agentId: "connection_agent",
    searchNotes: { query: "graph bridge concept", limit: 10 },
    maxContextNotes: 2,
    graphContext: {
      includeTags: true,
      includeOutgoingLinks: true,
      includeBacklinks: true,
      maxLinksPerNote: 5
    }
  });

  assert.equal(result.run.status, "succeeded");
  const graphItems = result.contextPack.items.filter((item) => item.kind === "graph_neighborhood");
  assert.equal(graphItems.length, 2);
  const firstGraph = graphItems.find((item) => item.sourceId === first.id);
  const firstPayload = JSON.parse(firstGraph.content);

  assert.ok(firstPayload.tags.some((tag) => tag.name === "shared"));
  assert.ok(firstPayload.outgoingLinks.some((link) => link.toNoteId === second.id && link.relationType === "supports"));
  assert.ok(firstPayload.backlinks.some((link) => link.fromNoteId === backlink.id && link.relationType === "asks"));
  assert.ok(result.run.events.some((event) => event.eventType === "tool_call" && event.summary.toolName === "list_note_relations"));
  assert.match(provider.lastRequest.messages[2].content, /"kind": "graph_neighborhood"/);
});
