import test from "node:test";
import assert from "node:assert/strict";
import { aiTestReply } from "../../apps/web/src/ai-test-result.js";

test("test readiness requires a real reply, not response metadata", () => {
  for (const response of [null, {}, { status: "succeeded", providerId: "local", output: {} }, { output: { content: "  ", json: {} } }]) {
    assert.throws(() => aiTestReply(response), /没有返回回复/);
  }
  assert.equal(aiTestReply({ status: "succeeded", output: { content: "  已连接  " } }), "已连接");
  assert.equal(aiTestReply({ output: { json: { reply: "ok" } } }), '{\n  "reply": "ok"\n}');
});

test("failed provider status cannot certify readiness even with response text", () => {
  assert.throws(() => aiTestReply({ status: "failed", output: { content: "cached" }, error: { error_type: "auth_error", message: "invalid key" } }), error => {
    assert.deepEqual(error.details, { providerErrorType: "auth_error" });
    return error.message === "invalid key";
  });
});
