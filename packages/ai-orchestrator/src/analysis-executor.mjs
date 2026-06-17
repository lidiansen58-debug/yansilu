import { assertProviderAllowedForContext } from "./provider-adapter.mjs";
import { mergePermanentNoteLocalModelResponse } from "./note-analysis.mjs";
import { mergeWritingStrongModelResponse } from "./writing-analysis.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function modelRefFor(request = {}) {
  const model = request.model || {};
  return cleanText(model.modelRef || model.model_ref || model.model || model.id) || "analysis_model";
}

function responsePayload(response = {}) {
  if (response.output?.json) return response.output.json;
  if (response.output?.content) return response.output.content;
  if (response.content || response.text || response.output) return response;
  return response;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function executionSettingsFor(request = {}, context = {}) {
  const executionDefaults = request.executionDefaults || request.execution_defaults || {};
  const settings = {
    stream: false,
    temperature: Number(firstFiniteNumber(executionDefaults.temperature, context.temperature) ?? 0.1)
  };
  const tokenLimit = firstFiniteNumber(
    executionDefaults.numPredict,
    executionDefaults.num_predict,
    context.numPredict,
    context.num_predict
  );
  if (tokenLimit !== undefined) {
    settings.num_predict = tokenLimit;
    settings.maxOutputTokens = tokenLimit;
    settings.max_output_tokens = tokenLimit;
  }
  const timeoutMs = firstFiniteNumber(
    executionDefaults.timeoutMs,
    executionDefaults.timeout_ms,
    context.timeoutMs,
    context.timeout_ms
  );
  if (timeoutMs !== undefined) settings.timeoutMs = timeoutMs;
  return settings;
}

async function executeAnalysisRequest(request = {}, adapter = {}, context = {}) {
  if (!adapter || typeof adapter.complete !== "function") {
    const error = new Error("analysis model execution requires a provider adapter with complete()");
    error.code = "AI_ANALYSIS_EXECUTOR_ADAPTER_REQUIRED";
    throw error;
  }
  const privacyMode = cleanText(request.privacy?.mode || context.privacyMode || context.privacy_mode) || "normal";
  if (adapter.descriptor) {
    assertProviderAllowedForContext(adapter.descriptor, { privacy: { mode: privacyMode } });
  }
  const providerResponse = await adapter.complete({
    requestId: cleanText(context.requestId || context.request_id),
    agentRunId: cleanText(context.agentRunId || context.agent_run_id),
    purpose: cleanText(context.purpose) || request.requestType || "ai_analysis",
    modelRef: modelRefFor(request),
    messages: request.messages || [],
    output: {
      mode: "json",
      schema: request.responseContract || {}
    },
    settings: executionSettingsFor(request, context),
    policy: {
      privacyMode,
      allowCloud: request.privacy?.cloudModelAllowed === true || privacyMode !== "local_only",
      allowFallback: false,
      canAutoConfirm: false
    }
  });
  if (providerResponse.status !== "succeeded" && providerResponse.status !== "partial") {
    const error = new Error(providerResponse.error?.message || "analysis model execution failed");
    error.code = "AI_ANALYSIS_EXECUTOR_PROVIDER_FAILED";
    error.providerResponse = providerResponse;
    throw error;
  }
  return providerResponse;
}

export async function runPermanentNoteLocalModelAnalysis(request = {}, adapter = {}, context = {}) {
  const providerResponse = await executeAnalysisRequest(
    {
      ...request,
      privacy: {
        ...(request.privacy || {}),
        mode: "local_only",
        cloudModelAllowed: false,
        cloudModelUsed: false
      }
    },
    adapter,
    {
      ...context,
      privacyMode: "local_only",
      purpose: "permanent_note_local_model_analysis"
    }
  );
  return {
    providerResponse,
    ...mergePermanentNoteLocalModelResponse(request, responsePayload(providerResponse), {
      ...context,
      model: request.model,
      origin: "local_model"
    })
  };
}

export async function runWritingStrongModelAnalysis(request = {}, adapter = {}, context = {}) {
  if (request.privacy?.userConfirmed !== true) {
    const error = new Error("writing strong-model execution requires explicit user confirmation");
    error.code = "WRITING_REMOTE_MODEL_CONFIRMATION_REQUIRED";
    throw error;
  }
  const providerResponse = await executeAnalysisRequest(
    {
      ...request,
      privacy: {
        ...(request.privacy || {}),
        mode: "remote_after_confirmation",
        cloudModelAllowed: true
      }
    },
    adapter,
    {
      ...context,
      privacyMode: "remote_after_confirmation",
      purpose: "writing_strong_model_analysis"
    }
  );
  return {
    providerResponse,
    ...mergeWritingStrongModelResponse(request, responsePayload(providerResponse), {
      ...context,
      model: request.model
    })
  };
}
