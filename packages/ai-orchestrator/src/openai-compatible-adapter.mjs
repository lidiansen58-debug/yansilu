import { normalizeModelResponse, normalizeProviderDescriptor } from "./provider-adapter.mjs";
import { createOpenAiCompatibleExecutor } from "./openai-compatible-executor.mjs";
import { getProviderPreset } from "./provider-presets.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function providerModelId(modelRef = "") {
  const value = cleanText(modelRef);
  const separatorIndex = value.indexOf(":");
  return separatorIndex >= 0 ? value.slice(separatorIndex + 1) : value;
}

function normalizeMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).map((message = {}) => {
    const role = cleanText(message.role) || "user";
    const content = String(message.content ?? "");
    if (role === "developer") {
      return { role: "system", content: `Developer instructions:\n${content}` };
    }
    if (["system", "user", "assistant", "tool"].includes(role)) return { role, content };
    return { role: "user", content };
  });
}

function emptyParametersSchema() {
  return { type: "object", properties: {}, additionalProperties: true };
}

function normalizeTool(tool = {}) {
  const name = cleanText(tool.name);
  if (!name) return null;
  return {
    type: "function",
    function: {
      name,
      description: cleanText(tool.description),
      parameters: tool.schema || tool.parameters || tool.inputSchema || tool.input_schema || emptyParametersSchema()
    }
  };
}

function normalizeTools(tools = []) {
  return (Array.isArray(tools) ? tools : []).map(normalizeTool).filter(Boolean);
}

function normalizeResponseSchema(schema = {}) {
  if (schema && typeof schema === "object" && cleanText(schema.type)) return schema;
  return {
    type: "object",
    additionalProperties: true
  };
}

function responseFormat(output = {}) {
  const mode = cleanText(output.mode);
  if (mode === "schema") {
    return {
      type: "json_schema",
      json_schema: {
        name: cleanText(output.name) || "ai_artifact_output",
        strict: output.strict !== false,
        schema: normalizeResponseSchema(output.schema)
      }
    };
  }
  if (mode === "json") return { type: "json_object" };
  return null;
}

function requestSettings(settings = {}) {
  const result = {
    stream: settings.stream === true
  };
  if (settings.temperature !== undefined) result.temperature = Number(settings.temperature);
  if (settings.maxOutputTokens !== undefined || settings.max_output_tokens !== undefined) {
    result.max_tokens = Number(settings.maxOutputTokens ?? settings.max_output_tokens);
  }
  return result;
}

export function buildOpenAiCompatibleRequest(request = {}, options = {}) {
  const descriptor = normalizeProviderDescriptor(
    options.descriptor || {
      ...getProviderPreset("openai_compatible_gateway"),
      ...(options.providerDescriptor || options.provider_descriptor || {})
    }
  );
  const tools = normalizeTools(request.tools);
  const format = responseFormat(request.output || {});
  const settings = requestSettings(request.settings || {});
  const body = {
    model: providerModelId(request.modelRef || request.model_ref),
    messages: normalizeMessages(request.messages),
    ...settings
  };

  if (tools.length) body.tools = tools;
  if (tools.length && request.toolChoice) body.tool_choice = request.toolChoice;
  if (format) body.response_format = format;

  return {
    endpointUrl: cleanText(options.endpointUrl || options.endpoint_url || descriptor.endpointUrl) || "https://api.openai-compatible.invalid/v1/chat/completions",
    method: "POST",
    auth: {
      authMode: cleanText(options.authMode || options.auth_mode || descriptor.authMode),
      secretRef: cleanText(options.secretRef || options.secret_ref || descriptor.secretRef)
    },
    headers: {
      "content-type": "application/json"
    },
    body,
    metadata: {
      requestId: cleanText(request.requestId || request.request_id),
      agentRunId: cleanText(request.agentRunId || request.agent_run_id),
      purpose: cleanText(request.purpose),
      providerId: descriptor.providerId,
      modelRef: cleanText(request.modelRef || request.model_ref),
      privacyMode: cleanText(request.policy?.privacyMode || request.policy?.privacy_mode),
      allowCloud: request.policy?.allowCloud === true || request.policy?.allow_cloud === true,
      allowFallback: request.policy?.allowFallback === true || request.policy?.allow_fallback === true
    }
  };
}

export function normalizeOpenAiCompatibleError(error = {}) {
  const status = Number(error.status || error.statusCode || error.provider_status_code || 0);
  const code = cleanText(error.code || error.error_code || error.type || error.error?.code || error.error?.type);
  const message = cleanText(error.message || error.error?.message) || "Provider request failed.";

  let errorType = "unknown";
  let retryable = false;
  if ([401, 403].includes(status) || ["auth_error", "invalid_api_key"].includes(code)) {
    errorType = "auth_error";
  } else if (status === 402 || code === "budget_exceeded") {
    errorType = "budget_exceeded";
  } else if (status === 404 || code === "model_not_found") {
    errorType = "model_unavailable";
  } else if (status === 408 || code === "timeout") {
    errorType = "timeout";
    retryable = true;
  } else if (status === 429 || code === "rate_limit") {
    errorType = "rate_limit";
    retryable = true;
  } else if (status >= 500 || code === "provider_unavailable") {
    errorType = "provider_unavailable";
    retryable = true;
  } else if (status === 400 || code === "validation_error") {
    errorType = "validation_error";
  } else if (code === "content_policy" || code === "content_filter") {
    errorType = "content_policy";
  }

  return {
    error_type: errorType,
    error_code: code,
    message,
    developer_message: cleanText(error.developerMessage || error.developer_message),
    retryable,
    provider_status_code: status || null,
    provider_request_id: cleanText(error.providerRequestId || error.provider_request_id)
  };
}

function parseJsonContent(content) {
  const text = String(content || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeToolCalls(toolCalls = []) {
  return (Array.isArray(toolCalls) ? toolCalls : []).map((toolCall) => ({
    toolCallId: cleanText(toolCall.id || toolCall.tool_call_id),
    name: cleanText(toolCall.function?.name || toolCall.name),
    arguments: parseJsonContent(toolCall.function?.arguments || toolCall.arguments) || {},
    status: "requested",
    providerRawName: cleanText(toolCall.function?.name || toolCall.name)
  }));
}

export function normalizeOpenAiCompatibleResponse(raw = {}, request = {}, descriptorInput = {}) {
  const descriptor = normalizeProviderDescriptor(
    descriptorInput.providerId || descriptorInput.provider_id ? descriptorInput : getProviderPreset("openai_compatible_gateway")
  );
  const choice = raw.choices?.[0] || {};
  const message = choice.message || {};
  const content = String(message.content ?? raw.output_text ?? "");
  const toolCalls = normalizeToolCalls(message.tool_calls || raw.tool_calls || []);
  const parsedJson = parseJsonContent(content);

  return normalizeModelResponse(
    {
      requestId: raw.id || request.requestId,
      agentRunId: request.agentRunId,
      status: "succeeded",
      providerId: descriptor.providerId,
      modelRef: request.modelRef,
      output: {
        type: parsedJson ? "json" : toolCalls.length ? "tool_calls" : "text",
        content,
        json: parsedJson,
        toolCalls
      },
      usage: {
        inputTokens: raw.usage?.prompt_tokens ?? raw.usage?.input_tokens ?? 0,
        outputTokens: raw.usage?.completion_tokens ?? raw.usage?.output_tokens ?? 0,
        cachedInputTokens: raw.usage?.prompt_tokens_details?.cached_tokens ?? 0,
        totalTokens: raw.usage?.total_tokens ?? 0,
        estimatedCost: 0,
        currency: "USD",
        usageSource: raw.usage ? "provider_reported" : "unavailable"
      },
      rawRef: cleanText(raw.id)
    },
    request
  );
}

export function createOpenAiCompatibleProviderAdapter(options = {}) {
  const descriptor = normalizeProviderDescriptor({
    ...getProviderPreset(options.providerPreset || options.provider_preset || "openai_compatible_gateway"),
    ...(options.descriptor || {})
  });
  let callCount = 0;
  let lastRequest = null;
  let lastCompatibleRequest = null;
  const executor =
    typeof options.executor === "function"
      ? options.executor
      : options.createExecutor === true || options.create_executor === true
        ? createOpenAiCompatibleExecutor(options)
        : null;

  return {
    descriptor,
    get callCount() {
      return callCount;
    },
    get lastRequest() {
      return lastRequest;
    },
    get lastCompatibleRequest() {
      return lastCompatibleRequest;
    },
    buildRequest(request = {}) {
      return buildOpenAiCompatibleRequest(request, options);
    },
    normalizeResponse(raw = {}, request = {}) {
      return normalizeOpenAiCompatibleResponse(raw, request, descriptor);
    },
    normalizeError(error = {}) {
      return normalizeOpenAiCompatibleError(error);
    },
    async complete(request = {}) {
      callCount += 1;
      lastRequest = request;
      lastCompatibleRequest = buildOpenAiCompatibleRequest(request, { ...options, descriptor });

      if (typeof executor === "function") {
        try {
          const raw = await executor(lastCompatibleRequest, request);
          return normalizeOpenAiCompatibleResponse(raw, request, descriptor);
        } catch (error) {
          return normalizeModelResponse(
            {
              status: "failed",
              providerId: descriptor.providerId,
              modelRef: request.modelRef,
              error: normalizeOpenAiCompatibleError(error)
            },
            request
          );
        }
      }

      return normalizeModelResponse(
        {
          status: "failed",
          providerId: descriptor.providerId,
          modelRef: request.modelRef,
          error: {
            error_type: "provider_unavailable",
            error_code: "adapter_dry_run",
            message: "OpenAI-compatible adapter skeleton is configured for request shaping only.",
            retryable: false
          }
        },
        request
      );
    }
  };
}
