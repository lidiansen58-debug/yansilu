import test from "node:test";
import assert from "node:assert/strict";
import { buildOpenAiCompatibleRequest, normalizeOpenAiCompatibleError, normalizeOpenAiCompatibleResponse } from "../../packages/ai-orchestrator/src/openai-compatible-adapter.mjs";
import { createOpenAiCompatibleExecutor } from "../../packages/ai-orchestrator/src/openai-compatible-executor.mjs";

const options = { endpointUrl: "https://api.deepseek.com", descriptor: { providerId: "openai_compatible_gateway" } };

for (const [name, raw] of [["empty object", {}], ["null", null], ["array", []], ["empty choices", { choices: [] }],
  ["error envelope", { error: { message: "vendor failure" } }],
  ["whitespace", { choices: [{ message: { content: "  \n " } }] }],
  ["reasoning only", { choices: [{ message: { content: null, reasoning_content: "unfinished thoughts" } }] }],
  ["invalid content type", { choices: [{ message: { content: { text: "wrong shape" } } }] }],
  ["tool call without a connection reply", { choices: [{ message: { tool_calls: [{ function: { name: "read_note", arguments: '{}' } }] } }] }],
  ["invalid tool", { choices: [{ message: { tool_calls: [{}] } }] }]]) {
  test(`${name} cannot pass the remote connection test`, () => {
    const response = normalizeOpenAiCompatibleResponse(raw, { purpose: "test_chat" });
    assert.equal(response.status, "failed");
    assert.equal(response.error.error_type, "invalid_response");
    assert.equal(response.output.content, "");
    assert.deepEqual(response.output.toolCalls, []);
  });
}
test("compatible plain output_text remains supported", () => {
  const response = normalizeOpenAiCompatibleResponse({ output_text: "Connection ready" });
  assert.equal(response.status, "succeeded");
  assert.equal(response.output.content, "Connection ready");
});

for (const content of ['{"writingMoves":[]}', '{"writingMoves":[', "Partial text"]) {
  test(`output limit cannot be accepted as a complete result: ${content}`, () => {
    const response = normalizeOpenAiCompatibleResponse({ id: "limited", choices: [{ finish_reason: "length", message: { content } }],
      usage: { prompt_tokens: 60, completion_tokens: 400, total_tokens: 460 } });
    assert.equal(response.status, "failed");
    assert.equal(response.error.error_type, "output_incomplete");
    assert.equal(response.error.retryable, false);
    assert.equal(response.output.json, null);
    assert.equal(response.output.content, "");
    assert.equal(response.usage.outputTokens, 400);
    assert.equal(response.usage.totalTokens, 460);
    assert.equal(response.rawRef, "limited");
  });
}
for (const [reason, type, retryable] of [["content_filter", "content_policy", false],
  ["insufficient_system_resource", "provider_unavailable", true], ["aborted", "generation_interrupted", true]]) {
  test(`${reason} preserves usage without accepting generated JSON or tools`, () => {
    const response = normalizeOpenAiCompatibleResponse({ id: "interrupted",
      choices: [{ finish_reason: reason, message: { content: '{"writingMoves":[]}',
        tool_calls: [{ id: "call", function: { name: "read_note", arguments: '{}' } }] } }],
      usage: { prompt_tokens: 60, completion_tokens: 50, total_tokens: 110 } });
    assert.equal(response.status, "failed");
    assert.equal(response.error.error_type, type);
    assert.equal(response.error.retryable, retryable);
    assert.deepEqual(response.output, { type: "text", content: "", json: null, toolCalls: [] });
    assert.equal(response.usage.totalTokens, 110);
    assert.equal(response.rawRef, "interrupted");
  });
}
test("normal completion and gateways omitting finish_reason retain their output", () => {
  for (const finish_reason of ["stop", undefined]) {
    const response = normalizeOpenAiCompatibleResponse({ choices: [{ finish_reason, message: { content: '{"writingMoves":[]}' } }] });
    assert.equal(response.status, "succeeded");
    assert.deepEqual(response.output.json, { writingMoves: [] });
  }
});
test("successful tool calls retain their arguments and remain executable", () => {
  const response = normalizeOpenAiCompatibleResponse({ choices: [{ finish_reason: "tool_calls", message: {
    tool_calls: [{ id: "call", function: { name: "read_note", arguments: '{"noteId":"a"}' } }] }
  }] });
  assert.equal(response.status, "succeeded");
  assert.deepEqual(response.output.toolCalls[0].arguments, { noteId: "a" });
});

for (const mode of ["json", "schema"]) test(`DeepSeek ${mode} requests keep their contract and fit the final-answer budget`, () => {
  const schema = { type: "object", properties: { judgments: { type: "array" } } };
  const request = buildOpenAiCompatibleRequest({ purpose: "writing_analysis", modelRef: "deepseek-flash",
    messages: [{ role: "user", content: "Summarize my notes" }], output: { mode, schema },
    settings: { maxOutputTokens: 1200 } }, options);
  assert.deepEqual(request.body.response_format, { type: "json_object" });
  assert.deepEqual(request.body.thinking, { type: "disabled" });
  assert.equal(request.body.max_tokens, 1200);
  assert.match(request.body.messages.at(-1).content, /JSON/);
  assert.ok(request.body.messages.at(-1).content.includes(JSON.stringify(schema)));
});

test("connection probes limit generation while ordinary text calls retain their settings", () => {
  const probe = buildOpenAiCompatibleRequest({ purpose: "test_chat", settings: { maxOutputTokens: 8192 } }, options);
  assert.equal(probe.body.max_tokens, 256);
  assert.equal(probe.metadata.timeoutMs, 30000);
  assert.deepEqual(probe.body.thinking, { type: "disabled" });
  const shorter = buildOpenAiCompatibleRequest({ purpose: "test_chat", settings: { maxOutputTokens: 64 } }, options);
  assert.equal(shorter.body.max_tokens, 64);
  const ordinary = buildOpenAiCompatibleRequest({ purpose: "chat", settings: { maxOutputTokens: 8192 } }, options);
  assert.equal(ordinary.body.max_tokens, 8192);
  assert.equal(ordinary.body.thinking, undefined);
  const local = buildOpenAiCompatibleRequest({ purpose: "test_chat", settings: { maxOutputTokens: 2048 } },
    { descriptor: { providerId: "ollama_local_gateway", localExecution: true }, endpointUrl: "http://localhost:11434/v1" });
  assert.equal(local.body.max_tokens, 2048);
  assert.equal(local.metadata.timeoutMs, undefined);
});

test("other gateways retain schema format and never receive DeepSeek extensions", () => {
  for (const endpointUrl of ["https://api.openai.com/v1", "https://api.deepseek.com.example.test/v1"]) {
    const request = buildOpenAiCompatibleRequest({ output: { mode: "schema", schema: { type: "object" } } }, { ...options, endpointUrl });
    assert.equal(request.body.response_format.type, "json_schema");
    assert.equal(request.body.thinking, undefined);
  }
});

test("third-party gateways serving DeepSeek models use only generic compatible parameters", () => {
  const endpointUrl = "https://gateway.example.test/v1";
  const descriptor = { providerId: "openai_compatible_gateway",
    runtimeModelMap: { "openai_compatible_gateway:standard": "vendor/deepseek-flash" } };
  const request = buildOpenAiCompatibleRequest({ purpose: "test_chat", modelRef: "openai_compatible_gateway:standard",
    messages: [{ role: "user", content: "Connection test" }], output: { mode: "text" } }, { endpointUrl, descriptor });
  assert.equal(request.endpointUrl, endpointUrl);
  assert.equal(request.body.model, "vendor/deepseek-flash");
  assert.equal(request.body.thinking, undefined);
  assert.equal(request.body.reasoning_effort, undefined);
  assert.equal(request.body.max_tokens, 256);
  assert.equal(request.metadata.timeoutMs, 30000);
  assert.equal(request.body.messages.length, 1);
});

test("relation review also requests bounded non-thinking JSON from DeepSeek", () => {
  const request = buildOpenAiCompatibleRequest({ purpose: "potential_relation_refine", output: { mode: "text" },
    settings: { maxOutputTokens: 400, timeoutMs: 60000 } }, options);
  assert.equal(request.body.max_tokens, 400);
  assert.deepEqual(request.body.response_format, { type: "json_object" });
  assert.deepEqual(request.body.thinking, { type: "disabled" });
  assert.equal(request.metadata.timeoutMs, 60000);
});

for (const phase of ["before_credentials", "during_credentials"]) test(`cancelled ${phase} requests make zero network calls`, async () => {
  const controller = new AbortController();
  let calls = 0;
  if (phase === "before_credentials") controller.abort();
  const execute = createOpenAiCompatibleExecutor({ networkEnabled: true, authMode: "byok_advanced", secretRef: "test",
    secretResolver: async () => { controller.abort(); return "synthetic-key"; },
    fetchImpl: async () => { calls++; throw new Error("must not fetch"); } });
  await assert.rejects(execute({ endpointUrl: "https://api.deepseek.com", body: {} }, { signal: controller.signal }), { code: "cancelled" });
  assert.equal(calls, 0);
});

test("DeepSeek parameter failures are non-retryable", () => {
  const error = normalizeOpenAiCompatibleError({ status: 422, message: "Invalid parameter" });
  assert.equal(error.error_type, "validation_error");
  assert.equal(error.retryable, false);
});
