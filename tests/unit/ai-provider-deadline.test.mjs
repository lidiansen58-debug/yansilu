import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { buildOpenAiCompatibleRequest } from "../../packages/ai-orchestrator/src/openai-compatible-adapter.mjs";
import { createOpenAiCompatibleExecutor } from "../../packages/ai-orchestrator/src/openai-compatible-executor.mjs";
import { runWritingStrongModelAnalysis } from "../../packages/ai-orchestrator/src/analysis-executor.mjs";

test("writing execution carries the requested output budget into adapter settings", async () => {
  let seen;
  await runWritingStrongModelAnalysis({ privacy: { mode: "local_only" }, executionDefaults: { maxOutputTokens: 700 } }, {
    complete: async request => { seen = request; return { status: "succeeded", output: { json: { writingMoves: [] } } }; }
  });
  assert.equal(buildOpenAiCompatibleRequest(seen).body.max_tokens, 700);
});

for (const phase of ["headers", "body"]) {
  test(`external cancellation aborts stalled provider ${phase} without waiting for the deadline`, async () => {
    const controller = new AbortController();
    let started;
    let signal;
    const ready = new Promise(resolve => { started = resolve; });
    const execute = createOpenAiCompatibleExecutor({ networkEnabled: true, timeoutMs: 10000,
      fetchImpl: async (_url, options) => {
        signal = options.signal;
        started();
        return phase === "headers" ? new Promise(() => {}) : { ok: true, text: () => new Promise(() => {}) };
      }
    });
    const pending = execute({ endpointUrl: "http://127.0.0.1/v1" }, { signal: controller.signal });
    await ready;
    controller.abort();
    const error = await boundedResult(pending);
    assert.equal(error.code, "cancelled");
    assert.equal(signal.aborted, true);
  });
}

async function boundedResult(promise) {
  let timer;
  try {
    return await Promise.race([promise.catch(error => error), new Promise(resolve => {
      timer = setTimeout(() => resolve({ code: "test_guard" }), 100);
    })]);
  } finally { clearTimeout(timer); }
}

test("analysis timeout is carried as executor metadata, not a provider body field", () => {
  const request = buildOpenAiCompatibleRequest({ settings: { timeoutMs: 60000 } });
  assert.equal(request.metadata.timeoutMs, 60000);
  assert.equal(request.body.timeoutMs, undefined);
});

for (const phase of ["headers", "body"]) {
  test(`provider deadline bounds stalled ${phase} even when the transport ignores abort`, async () => {
    let signal;
    const executor = createOpenAiCompatibleExecutor({ networkEnabled: true, timeoutMs: 10,
      fetchImpl: async (_url, init) => {
        signal = init.signal;
        if (phase === "headers") return new Promise(() => {});
        return { ok: true, text: () => new Promise(() => {}) };
      }
    });
    const result = await boundedResult(executor({ endpointUrl: "http://127.0.0.1/v1", body: {} }));
    assert.equal(result.code, "timeout");
    assert.equal(result.status, 408);
    assert.equal(signal.aborted, true);
  });
}

test("per-request timeout overrides the executor default and success clears the deadline", async () => {
  const executor = createOpenAiCompatibleExecutor({ networkEnabled: true, timeoutMs: 1,
    fetchImpl: async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return { ok: true, text: async () => '{"ok":true}' };
    }
  });
  assert.deepEqual(await executor({ endpointUrl: "http://127.0.0.1/v1", metadata: { timeoutMs: 50 } }), { ok: true });
});

for (const phase of ["headers", "body"]) {
  test(`real HTTP transport is aborted when ${phase} stalls`, async () => {
    const server = http.createServer((_req, res) => {
      if (phase === "body") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.flushHeaders();
        res.write('{"pending":');
      }
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const executor = createOpenAiCompatibleExecutor({ networkEnabled: true, timeoutMs: 100 });
      await assert.rejects(executor({ endpointUrl: `http://127.0.0.1:${server.address().port}/v1` }),
        error => error.code === "timeout" && error.status === 408);
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  });
}
