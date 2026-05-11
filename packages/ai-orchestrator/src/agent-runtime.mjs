import { normalizeModelResponse } from "./provider-adapter.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function runtimeId(input = {}) {
  return cleanText(input.runtimeId || input.runtime_id || input.id) || "provider_adapter_runtime";
}

function runtimeType(input = {}) {
  return cleanText(input.runtimeType || input.runtime_type || input.type) || "provider_adapter";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function cloneObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return JSON.parse(JSON.stringify(value));
}

function openObjectSchema() {
  return {
    type: "object",
    properties: {},
    additionalProperties: true
  };
}

function toolMetadata(tool = {}) {
  return {
    name: cleanText(tool.name),
    description: cleanText(tool.description),
    permissionLevel: cleanText(tool.permissionLevel || tool.permission_level),
    dataBoundary: cleanText(tool.dataBoundary || tool.data_boundary),
    requiresNetwork: tool.requiresNetwork === true || tool.requires_network === true,
    requiresCloud: tool.requiresCloud === true || tool.requires_cloud === true,
    parameters: cloneObject(tool.parameters || tool.inputSchema || tool.input_schema)
  };
}

const DEFAULT_OPENAI_MODEL_ALIASES = {
  "platform_managed_openai:router_fast": "gpt-5.4-mini",
  "platform_managed_openai:cheap_fast": "gpt-5.4-mini",
  "platform_managed_openai:standard": "gpt-5.4",
  "platform_managed_openai:strong_reasoning": "gpt-5.5",
  "platform_managed_openai:guardrail": "gpt-5.4-mini"
};

function allowedToolSet(input = {}) {
  const names = Array.isArray(input.allowedToolNames || input.allowed_tool_names || input.allowedTools || input.allowed_tools)
    ? input.allowedToolNames || input.allowed_tool_names || input.allowedTools || input.allowed_tools
    : [];
  return new Set(names.map(cleanText).filter(Boolean));
}

function contextSummary(contextPack = {}) {
  return {
    contextPackId: cleanText(contextPack.contextPackId || contextPack.context_pack_id),
    taskId: cleanText(contextPack.taskId || contextPack.task_id),
    privacyMode: cleanText(contextPack.privacy?.mode) || "normal",
    cloudAllowed: contextPack.privacy?.cloudAllowed === true,
    itemCount: Array.isArray(contextPack.items) ? contextPack.items.length : 0,
    omittedCount: Array.isArray(contextPack.omitted) ? contextPack.omitted.length : 0,
    estimatedInputTokens: Number(contextPack.budget?.estimatedInputTokens || contextPack.budget?.estimated_input_tokens || 0)
  };
}

export function createRuntimeToolBridge(input = {}) {
  const toolRegistry = input.toolRegistry || input.tool_registry;
  const allowed = allowedToolSet(input);
  const toolContext = input.toolContext || input.tool_context || {};
  const onToolCall = typeof input.onToolCall === "function" ? input.onToolCall : null;
  const tools =
    toolRegistry && typeof toolRegistry.get === "function"
      ? [...allowed]
          .map((name) => {
            try {
              return toolMetadata(toolRegistry.get(name));
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      : [];
  const executable = new Set(tools.map((tool) => tool.name));

  async function callTool(name, toolInput = {}) {
    const toolName = cleanText(name);
    if (!allowed.has(toolName) || !executable.has(toolName)) {
      const failed = {
        toolName,
        permissionLevel: "",
        dataBoundary: "",
        status: "failed",
        input: toolInput,
        output: null,
        durationMs: 0,
        error: {
          errorType: "AI_RUNTIME_TOOL_NOT_ALLOWED",
          message: `runtime tool is not allowed: ${toolName}`
        }
      };
      onToolCall?.(failed);
      return failed;
    }

    const result = await toolRegistry.call(toolName, toolInput, toolContext);
    onToolCall?.(result);
    return result;
  }

  return {
    tools,
    toolContext: clone(toolContext),
    callTool
  };
}

export function normalizeAgentRuntime(input = {}) {
  if (typeof input.execute !== "function") {
    const error = new Error("agent runtime execute(request) is required");
    error.code = "AI_AGENT_RUNTIME_EXECUTE_REQUIRED";
    throw error;
  }

  return {
    runtimeId: runtimeId(input),
    runtimeType: runtimeType(input),
    displayName: cleanText(input.displayName || input.display_name) || runtimeId(input),
    sdk: cleanText(input.sdk),
    execute: input.execute
  };
}

export function createAgentRuntimeRequest(input = {}) {
  const providerAdapter = input.providerAdapter || input.provider_adapter || null;
  const providerDescriptor = input.providerDescriptor || input.provider_descriptor || providerAdapter?.descriptor || {};
  const modelRoute = input.modelRoute || input.model_route || input.policy?.modelRoute || input.policy?.model_route || {};
  const contextPack = input.contextPack || input.context_pack || {};
  const agent = input.agent || {};
  const runtimeRequest = {
    requestId: cleanText(input.requestId || input.request_id),
    agentRunId: cleanText(input.agentRunId || input.agent_run_id),
    purpose: cleanText(input.purpose) || "agent_reasoning",
    runtimeId: runtimeId(input),
    runtimeType: runtimeType(input),
    agent: {
      agentId: cleanText(agent.agentId || agent.agent_id),
      agentVersion: cleanText(agent.agentVersion || agent.agent_version) || "v1",
      purpose: cleanText(agent.purpose),
      allowedTools: Array.isArray(agent.allowedTools || agent.allowed_tools) ? [...(agent.allowedTools || agent.allowed_tools)] : [],
      outputArtifactTypes: Array.isArray(agent.outputArtifactTypes || agent.output_artifact_types)
        ? [...(agent.outputArtifactTypes || agent.output_artifact_types)]
        : [],
      requiredCapabilities: Array.isArray(agent.requiredCapabilities || agent.required_capabilities)
        ? [...(agent.requiredCapabilities || agent.required_capabilities)]
        : []
    },
    provider: {
      providerId: cleanText(providerDescriptor.providerId || providerDescriptor.provider_id),
      adapterType: cleanText(providerDescriptor.adapterType || providerDescriptor.adapter_type),
      authMode: cleanText(providerDescriptor.authMode || providerDescriptor.auth_mode),
      localExecution: providerDescriptor.localExecution === true || providerDescriptor.local_execution === true
    },
    model: {
      modelRef: cleanText(input.modelRef || input.model_ref || modelRoute.modelRef || modelRoute.model_ref),
      selectedTier: cleanText(modelRoute.selectedTier || modelRoute.selected_tier),
      requestedTier: cleanText(modelRoute.requestedTier || modelRoute.requested_tier),
      userMode: cleanText(modelRoute.userMode || modelRoute.user_mode),
      modelPack: cleanText(modelRoute.modelPack || modelRoute.model_pack)
    },
    context: contextSummary(contextPack),
    messages: Array.isArray(input.messages) ? clone(input.messages) : [],
    tools: Array.isArray(input.tools) ? input.tools.map(toolMetadata).filter((tool) => tool.name) : [],
    output: clone(input.output || null),
    settings: clone(input.settings || {}),
    policy: clone(input.policy || {}),
    providerAdapter
  };

  return runtimeRequest;
}

export function buildOpenAiAgentsSdkRunSpec(input = {}) {
  const request = input.runtimeRequest || input.runtime_request || createAgentRuntimeRequest(input);
  const modelAliases = {
    ...DEFAULT_OPENAI_MODEL_ALIASES,
    ...(input.modelAliases || input.model_aliases || {})
  };
  const modelRef = cleanText(modelAliases[request.model.modelRef]) || request.model.modelRef;
  return {
    runtimeType: "agents_sdk",
    agent: {
      name: request.agent.agentId || "yansilu_agent",
      version: request.agent.agentVersion,
      instructions: request.messages.find((message) => message.role === "system")?.content || "",
      developerInstructions: request.messages.find((message) => message.role === "developer")?.content || "",
      outputArtifactTypes: request.agent.outputArtifactTypes,
      requiredCapabilities: request.agent.requiredCapabilities
    },
    model: {
      modelRef,
      logicalModelRef: request.model.modelRef,
      tier: request.model.selectedTier,
      userMode: request.model.userMode,
      providerId: request.provider.providerId
    },
    input: {
      messages: request.messages,
      context: request.context
    },
    tools: request.tools,
    output: request.output,
    settings: request.settings,
    policy: {
      privacyMode: request.policy?.privacyMode || request.context.privacyMode,
      allowCloud: request.policy?.allowCloud === true,
      allowFallback: request.policy?.allowFallback === true
    },
    metadata: {
      requestId: request.requestId,
      agentRunId: request.agentRunId,
      contextPackId: request.context.contextPackId,
      purpose: request.purpose
    }
  };
}

async function loadOpenAiAgentsSdk(options = {}) {
  const injected = options.sdk || options.sdkModule || options.sdk_module;
  if (injected?.Agent && injected?.tool && (injected?.run || injected?.Runner)) return injected;

  try {
    return await import("@openai/agents");
  } catch (error) {
    const missing = new Error("OpenAI Agents SDK dependency is unavailable. Install @openai/agents to enable this runtime.");
    missing.code = "AI_OPENAI_AGENTS_SDK_MISSING";
    missing.cause = error;
    throw missing;
  }
}

function agentInstructions(sdkRunSpec = {}) {
  return [sdkRunSpec.agent?.instructions, sdkRunSpec.agent?.developerInstructions].map(cleanText).filter(Boolean).join("\n\n");
}

function agentInput(sdkRunSpec = {}) {
  const messages = Array.isArray(sdkRunSpec.input?.messages) ? sdkRunSpec.input.messages : [];
  return messages
    .filter((message) => !["system", "developer"].includes(cleanText(message.role)))
    .map((message) => cleanText(message.content))
    .filter(Boolean)
    .join("\n\n");
}

function modelSettingsFromSpec(sdkRunSpec = {}, options = {}) {
  return {
    ...(options.modelSettings || options.model_settings || {}),
    ...(sdkRunSpec.settings?.modelSettings || sdkRunSpec.settings?.model_settings || {})
  };
}

function sdkRunOptions(sdkRunSpec = {}, options = {}) {
  return {
    stream: false,
    maxTurns: Number(options.maxTurns || options.max_turns || sdkRunSpec.settings?.maxTurns || sdkRunSpec.settings?.max_turns || 8),
    signal: options.signal
  };
}

function sdkRunnerConfig(sdkRunSpec = {}, options = {}) {
  const privacyMode = cleanText(sdkRunSpec.policy?.privacyMode) || "normal";
  const tracingDisabled =
    options.tracingDisabled === true ||
    options.tracing_disabled === true ||
    (options.tracingDisabled !== false && options.tracing_disabled !== false && privacyMode !== "normal");
  return {
    tracingDisabled,
    workflowName: cleanText(options.workflowName || options.workflow_name) || "yansilu_agent_run",
    groupId: sdkRunSpec.metadata?.agentRunId,
    traceIncludeSensitiveData:
      (options.traceIncludeSensitiveData === true || options.trace_include_sensitive_data === true) && privacyMode === "normal",
    traceMetadata: {
      requestId: cleanText(sdkRunSpec.metadata?.requestId),
      agentRunId: cleanText(sdkRunSpec.metadata?.agentRunId),
      contextPackId: cleanText(sdkRunSpec.metadata?.contextPackId),
      purpose: cleanText(sdkRunSpec.metadata?.purpose)
    },
    toolExecution: {
      maxFunctionToolConcurrency: Number(options.maxFunctionToolConcurrency || options.max_function_tool_concurrency || 1)
    }
  };
}

function parseJsonOutput(value) {
  if (value && typeof value === "object") return value;
  const text = cleanText(value);
  if (!text) return null;
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function usageFromSdkResult(result = {}) {
  const responses = Array.isArray(result.rawResponses) ? result.rawResponses : [];
  const usageItems = responses.map((response) => response?.usage).filter(Boolean);
  const sum = (key, altKey) => usageItems.reduce((total, usage) => total + Number(usage?.[key] ?? usage?.[altKey] ?? 0), 0);
  return {
    inputTokens: sum("inputTokens", "input_tokens"),
    outputTokens: sum("outputTokens", "output_tokens"),
    totalTokens: sum("totalTokens", "total_tokens"),
    estimatedCost: 0,
    currency: "USD",
    usageSource: "openai_agents_sdk"
  };
}

function normalizeSdkToolOutput(toolCall = {}) {
  return JSON.stringify({
    status: toolCall.status,
    output: toolCall.output,
    error: toolCall.error || null
  });
}

function createOpenAiAgentsSdkTools({ sdk, sdkRunSpec, toolBridge, options = {} } = {}) {
  if (!toolBridge || typeof toolBridge.callTool !== "function") return [];
  const tools = Array.isArray(sdkRunSpec.tools) ? sdkRunSpec.tools : [];
  return tools.map((toolInfo) =>
    sdk.tool({
      name: toolInfo.name,
      description: toolInfo.description || `Call the ${toolInfo.name} product tool through the Yansilu harness boundary.`,
      parameters: toolInfo.parameters || openObjectSchema(),
      strict: false,
      async execute(input = {}) {
        const toolCall = await toolBridge.callTool(toolInfo.name, input);
        if (typeof options.formatToolOutput === "function") return options.formatToolOutput(toolCall);
        return normalizeSdkToolOutput(toolCall);
      }
    })
  );
}

function normalizeOpenAiAgentsSdkResult({ result, sdkRunSpec, request }) {
  const parsed = parseJsonOutput(result?.finalOutput);
  const rawRef = cleanText(result?.lastResponseId || result?.rawResponses?.at?.(-1)?.responseId);
  return {
    status: "succeeded",
    providerId: sdkRunSpec.model.providerId || request.providerDescriptor?.providerId || "platform_managed_openai",
    modelRef: sdkRunSpec.model.modelRef || request.modelRef,
    output: {
      type: parsed ? "json" : "text",
      content: parsed ? "" : cleanText(result?.finalOutput),
      json: parsed,
      toolCalls: []
    },
    usage: usageFromSdkResult(result),
    rawRef
  };
}

export function createProviderAgentRuntime(options = {}) {
  return normalizeAgentRuntime({
    runtimeId: options.runtimeId || "provider_adapter_runtime",
    runtimeType: "provider_adapter",
    displayName: options.displayName || "Provider Adapter Runtime",
    async execute(request = {}) {
      const runtimeRequest = createAgentRuntimeRequest({ ...request, runtimeId: "provider_adapter_runtime", runtimeType: "provider_adapter" });
      const providerAdapter = runtimeRequest.providerAdapter || options.providerAdapter || options.provider_adapter;
      if (!providerAdapter || typeof providerAdapter.complete !== "function") {
        const error = new Error("providerAdapter.complete(request) is required for provider adapter runtime");
        error.code = "AI_PROVIDER_ADAPTER_RUNTIME_MISSING_PROVIDER";
        throw error;
      }
      return normalizeModelResponse(await providerAdapter.complete({ ...request, runtimeRequest }), request);
    }
  });
}

export function createOpenAiAgentsSdkRuntime(options = {}) {
  return normalizeAgentRuntime({
    runtimeId: options.runtimeId || "openai_agents_sdk_runtime",
    runtimeType: "agents_sdk",
    displayName: options.displayName || "OpenAI Agents SDK Runtime",
    sdk: "openai_agents_sdk",
    async execute(request = {}) {
      const runtimeRequest = createAgentRuntimeRequest({ ...request, runtimeId: "openai_agents_sdk_runtime", runtimeType: "agents_sdk" });
      const sdkRunSpec = buildOpenAiAgentsSdkRunSpec({ runtimeRequest, modelAliases: options.modelAliases || options.model_aliases });
      if (typeof options.execute === "function") {
        return normalizeModelResponse(await options.execute({ ...request, runtimeRequest, sdkRunSpec }), request);
      }

      const sdk = await loadOpenAiAgentsSdk(options);
      const sdkTools = createOpenAiAgentsSdkTools({ sdk, sdkRunSpec, toolBridge: request.toolBridge, options });
      const agent = new sdk.Agent({
        name: sdkRunSpec.agent.name,
        instructions: agentInstructions(sdkRunSpec),
        model: sdkRunSpec.model.modelRef,
        modelSettings: modelSettingsFromSpec(sdkRunSpec, options),
        tools: sdkTools
      });
      const runner = typeof sdk.Runner === "function" ? new sdk.Runner(sdkRunnerConfig(sdkRunSpec, options)) : null;
      const result = runner
        ? await runner.run(agent, agentInput(sdkRunSpec), sdkRunOptions(sdkRunSpec, options))
        : await sdk.run(agent, agentInput(sdkRunSpec), sdkRunOptions(sdkRunSpec, options));

      return normalizeModelResponse(normalizeOpenAiAgentsSdkResult({ result, sdkRunSpec, request }), request);
    }
  });
}

export function agentRuntimeTypes() {
  return ["provider_adapter", "agents_sdk"];
}
