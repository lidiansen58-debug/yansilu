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

function toolMetadata(tool = {}) {
  return {
    name: cleanText(tool.name),
    description: cleanText(tool.description),
    permissionLevel: cleanText(tool.permissionLevel || tool.permission_level),
    dataBoundary: cleanText(tool.dataBoundary || tool.data_boundary),
    requiresNetwork: tool.requiresNetwork === true || tool.requires_network === true,
    requiresCloud: tool.requiresCloud === true || tool.requires_cloud === true
  };
}

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
      modelRef: request.model.modelRef,
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
      const sdkRunSpec = buildOpenAiAgentsSdkRunSpec({ runtimeRequest });
      if (typeof options.execute === "function") {
        return normalizeModelResponse(await options.execute({ ...request, runtimeRequest, sdkRunSpec }), request);
      }

      const error = new Error("OpenAI Agents SDK runtime is not wired yet; provide execute(request) to enable it.");
      error.code = "AI_OPENAI_AGENTS_SDK_RUNTIME_NOT_CONFIGURED";
      throw error;
    }
  });
}

export function agentRuntimeTypes() {
  return ["provider_adapter", "agents_sdk"];
}
