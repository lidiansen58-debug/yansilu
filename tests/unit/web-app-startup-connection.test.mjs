import test from "node:test";
import assert from "node:assert/strict";
import { initializeStartupConnection } from "../../apps/web/src/app-startup-connection.js";

function unavailable(status = "recovering") {
  return { connected: false, error: { code: "desktop_api_unavailable", serviceStatus: { services: { api: { status } } } } };
}

test("desktop startup retries initialization and discards stale recovery feedback after connecting", async () => {
  const statuses = [], waits = [];
  let attempts = 0, resets = 0;
  const result = await initializeStartupConnection({
    windowRef: { __TAURI__: {} },
    isApiConnectionError: error => error?.code === "desktop_api_unavailable",
    resetDesktopServiceStatusCache: () => { resets += 1; },
    waitForStartupRetry: async ms => waits.push(ms),
    setStatus: (...args) => statuses.push(args)
  }, async deps => {
    attempts += 1;
    if (attempts < 3) {
      deps.setStatus("旧的恢复提示", "bad");
      return unavailable();
    }
    deps.setStatus("已连接", "ok");
    return { connected: true };
  });
  assert.equal(result.connected, true);
  assert.equal(attempts, 3);
  assert.equal(resets, 2);
  assert.deepEqual(waits, [500, 1000]);
  assert.equal(statuses.some(([text]) => text === "旧的恢复提示"), false);
  assert.deepEqual(statuses.at(-1), ["已连接", "ok"]);
});

test("desktop startup stops retrying and gives a concrete next action", async () => {
  const statuses = [];
  let attempts = 0;
  const result = await initializeStartupConnection({
    windowRef: { __TAURI__: {} },
    isApiConnectionError: () => true,
    waitForStartupRetry: async () => {},
    setStatus: (...args) => statuses.push(args)
  }, async () => { attempts += 1; return unavailable(); });
  assert.equal(result.connected, false);
  assert.equal(attempts, 4);
  assert.match(statuses.at(-1)[0], /请点击重新连接/);
  assert.doesNotMatch(statuses.at(-1)[0], /自动重试|稍等/);
  assert.equal(statuses.at(-1)[1], "bad");
});

test("blocked desktop service and browser failures do not retry", async () => {
  for (const [windowRef, failure] of [[{ __TAURI__: {} }, unavailable("blocked")], [{}, unavailable()]]) {
    let attempts = 0;
    const statuses = [];
    await initializeStartupConnection({
      windowRef, isApiConnectionError: () => true,
      waitForStartupRetry: () => assert.fail("must not retry"),
      setStatus: (...args) => statuses.push(args)
    }, async deps => { attempts += 1; deps.setStatus("失败原因", "bad"); return failure; });
    assert.equal(attempts, 1);
    assert.deepEqual(statuses, [["失败原因", "bad"]]);
  }
});

test("startup exceptions propagate to the shell recovery handler", async () => {
  await assert.rejects(initializeStartupConnection({}, async () => { throw new Error("invalid state"); }), /invalid state/);
});

test("a native readiness deadline is not followed by repeated thirty-second waits", async () => {
  const failure = unavailable();
  failure.error.serviceStatus.startupWaitTimedOut = true;
  let attempts = 0;
  await initializeStartupConnection({
    windowRef: { __TAURI__: {} }, isApiConnectionError: () => true,
    waitForStartupRetry: () => assert.fail("native wait already timed out")
  }, async () => { attempts++; return failure; });
  assert.equal(attempts, 1);
});
