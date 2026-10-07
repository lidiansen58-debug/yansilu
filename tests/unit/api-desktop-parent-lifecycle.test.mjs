import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { bindDesktopParentLifecycle } from "../../apps/api/src/desktop-parent-lifecycle.mjs";

function fixture(env = { YANSILU_DESKTOP_PARENT_CHANNEL: "stdin-eof" }, timeoutMs = 100) {
  const input = new PassThrough();
  const exits = [];
  let closes = 0, idleCloses = 0, complete;
  const server = { close(callback) { closes++; complete = callback; }, closeIdleConnections() { idleCloses++; } };
  bindDesktopParentLifecycle({ server, input, env, timeoutMs, exit: code => exits.push(code), log() {} });
  return { input, exits, get closes() { return closes; }, get idleCloses() { return idleCloses; }, complete: () => complete() };
}

test("ordinary APIs do not bind their lifetime to stdin", () => {
  const f = fixture({});
  assert.equal(f.input.listenerCount("end"), 0);
  assert.equal(f.input.listenerCount("error"), 0);
  assert.equal(f.input.readableFlowing, null);
});

test("parent EOF closes listening and idle connections, drains requests then exits", async () => {
  const f = fixture();
  f.input.end();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.closes, 1);
  assert.equal(f.idleCloses, 1);
  assert.deepEqual(f.exits, []);
  f.complete();
  assert.deepEqual(f.exits, [0]);
});

test("broken parent channel shuts down only once", () => {
  const f = fixture();
  f.input.emit("error", new Error("parent disappeared"));
  f.input.emit("end");
  assert.equal(f.closes, 1);
  f.complete();
  assert.deepEqual(f.exits, [0]);
});

test("stuck requests have bounded exit and a late close cannot exit twice", async () => {
  const f = fixture(undefined, 20);
  f.input.emit("end");
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.deepEqual(f.exits, [1]);
  f.complete();
  assert.deepEqual(f.exits, [1]);
});
