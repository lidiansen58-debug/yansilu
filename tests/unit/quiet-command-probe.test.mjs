import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { execFileQuiet } from "../../apps/api/src/quiet-command-probe.mjs";

test("a synchronous executable launch failure becomes a failed probe", async () => {
  const error = Object.assign(new Error("spawn UNKNOWN"), { code: "UNKNOWN" });
  const result = await execFileQuiet("broken-ollama", ["--version"], {}, () => { throw error; });
  assert.equal(result.ok, false);
  assert.equal(result.code, "UNKNOWN");
  assert.equal(result.message, "spawn UNKNOWN");
});

test("command probes retain success output and quiet bounded launch options", async () => {
  const result = await execFileQuiet("ollama", ["--version"], { timeoutMs: 2500 }, (command, args, options, callback) => {
    assert.equal(options.windowsHide, true);
    assert.equal(options.timeout, 2500);
    callback(null, " ollama version test \n", "");
    return new EventEmitter();
  });
  assert.equal(result.ok, true);
  assert.equal(result.stdout, "ollama version test");
});

test("async launch errors settle the same probe without rejecting", async () => {
  const result = await execFileQuiet("missing", [], {}, () => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("error", Object.assign(new Error("not found"), { code: "ENOENT" })));
    return child;
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "ENOENT");
});
