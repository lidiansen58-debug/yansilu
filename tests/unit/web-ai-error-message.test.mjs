import test from "node:test";
import assert from "node:assert/strict";
import { aiErrorMessage } from "../../apps/web/src/ai-error-message.js";

test("AI errors use structured provider categories for actionable Chinese copy", () => {
  for (const type of ["timeout", "auth_error", "model_unavailable", "rate_limit", "provider_unavailable"]) {
    const message = aiErrorMessage({ message: "vendor raw error", details: { providerErrorType: type } });
    assert.notEqual(message, "vendor raw error");
    assert.match(message, /[\u4e00-\u9fff]/);
  }
  assert.match(aiErrorMessage({ providerResponse: { error: { error_type: "timeout" } } }), /响应超时/);
  assert.match(aiErrorMessage({ details: { providerError: { error_type: "auth_error" } } }), /认证失败/);
  assert.equal(aiErrorMessage(new Error("specific failure")), "specific failure");
});
