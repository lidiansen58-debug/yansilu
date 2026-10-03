import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequestAbortScope } from "../../apps/api/src/request-abort-scope.mjs";

test("client disconnect cancels a request and disposal removes listeners", () => {
  const req = new EventEmitter();
  const res = new EventEmitter();
  const scope = createRequestAbortScope(req, res);
  res.emit("close");
  assert.equal(scope.signal.aborted, true);
  scope.dispose();
  assert.equal(req.listenerCount("aborted"), 0);
  assert.equal(res.listenerCount("close"), 0);
});

test("normal response completion does not look like user cancellation", () => {
  const req = new EventEmitter();
  const res = new EventEmitter();
  res.writableEnded = true;
  const scope = createRequestAbortScope(req, res);
  res.emit("close");
  assert.equal(scope.signal.aborted, false);
  scope.dispose();
});
