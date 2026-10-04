import test from "node:test";
import assert from "node:assert/strict";
import { aiErrorMessage } from "../../apps/web/src/ai-error-message.js";
import { normalizeOpenAiCompatibleError } from "../../packages/ai-orchestrator/src/openai-compatible-adapter.mjs";

test("DeepSeek HTTP 402 reports account balance rather than an authentication failure", () => {
  const providerError = normalizeOpenAiCompatibleError({ status: 402, code: "insufficient_balance", message: "Insufficient Balance" });
  assert.equal(providerError.retryable, false);
  assert.match(aiErrorMessage({ details: { providerError } }), /余额不足/);
});

test("AI errors use structured provider categories for actionable Chinese copy", () => {
  assert.match(aiErrorMessage({ details: { providerErrorType: "output_incomplete" } }), /输出上限.*不完整/);
  assert.match(aiErrorMessage({ details: { providerErrorType: "generation_interrupted" } }), /中断.*不完整/);
  assert.match(aiErrorMessage({ details: { providerErrorType: "content_policy" } }), /过滤.*输入/);
  assert.match(aiErrorMessage({ details: { providerErrorType: "invalid_response" } }), /有效回复.*接口格式/);
  for (const type of ["timeout", "auth_error", "model_unavailable", "rate_limit", "provider_unavailable"]) {
    const message = aiErrorMessage({ message: "vendor raw error", details: { providerErrorType: type } });
    assert.notEqual(message, "vendor raw error");
    assert.match(message, /[\u4e00-\u9fff]/);
  }
  assert.match(aiErrorMessage({ providerResponse: { error: { error_type: "timeout" } } }), /响应超时/);
  assert.match(aiErrorMessage({ details: { providerError: { error_type: "auth_error" } } }), /认证失败/);
  assert.equal(aiErrorMessage(new Error("specific failure")), "specific failure");
});
