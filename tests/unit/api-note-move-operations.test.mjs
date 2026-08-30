import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createNoteMoveOperations } from "../../apps/api/src/note-move-operations.mjs";

test("checking an undelivered move fences both late preparation and execution", async () => {
  const operations = createNoteMoveOperations(), id = randomUUID();
  assert.equal(operations.check(id, "n").state, "cancelled");
  const prepared = operations.prepare(id, "n");
  assert.equal(prepared.state, "cancelled");
  await assert.rejects(operations.run(id, "n", () => assert.fail("must not move"), prepared.instanceId), { code: "NOTE_MOVE_CANCELLED" });
});

test("a prepared but unsent move is cancelled and cannot execute later", async () => {
  const operations = createNoteMoveOperations(), id = randomUUID();
  const prepared = operations.prepare(id, "n");
  assert.equal(operations.check(id, "n", prepared.instanceId).state, "cancelled");
  await assert.rejects(operations.run(id, "n", () => assert.fail("must not move"), prepared.instanceId), { code: "NOTE_MOVE_CANCELLED" });
});

test("verification never cancels an active move and duplicate POSTs never execute twice", async () => {
  const operations = createNoteMoveOperations(), id = randomUUID();
  const { instanceId } = operations.prepare(id, "n");
  let finish, calls = 0;
  const running = operations.run(id, "n", () => { calls++; return new Promise(resolve => { finish = resolve; }); }, instanceId);
  assert.equal(operations.check(id, "n", instanceId).state, "pending");
  await assert.rejects(operations.run(id, "n", () => { calls++; }, instanceId), { code: "NOTE_MOVE_ALREADY_STARTED" });
  finish({ id: "n" });
  await running;
  assert.equal(operations.check(id, "n", instanceId).state, "succeeded");
  await assert.rejects(operations.run(id, "n", () => { calls++; }, instanceId), { code: "NOTE_MOVE_ALREADY_STARTED" });
  assert.equal(calls, 1);
});

test("failed move status preserves recovery details", async () => {
  const operations = createNoteMoveOperations(), id = randomUUID();
  const { instanceId } = operations.prepare(id, "n");
  const error = Object.assign(new Error("Recovery required"), { code: "NOTE_MOVE_RECOVERY_REQUIRED", details: { remainingPath: "original" } });
  await assert.rejects(operations.run(id, "n", async () => { throw error; }, instanceId));
  assert.deepEqual(operations.check(id, "n", instanceId), { state: "failed", error: { code: error.code, message: error.message, details: error.details } });
});

test("old process requests remain fenced after restart", async () => {
  const previous = createNoteMoveOperations(), id = randomUUID();
  const { instanceId } = previous.prepare(id, "n");
  previous.check(id, "n", instanceId);
  const restarted = createNoteMoveOperations();
  assert.equal(restarted.check(id, "n", instanceId).state, "interrupted");
  await assert.rejects(restarted.run(id, "n", () => assert.fail("old request must not run"), instanceId), { code: "NOTE_MOVE_SERVICE_CHANGED" });
});

test("invalid and mismatched IDs cannot mutate notes", async () => {
  const operations = createNoteMoveOperations(), id = randomUUID();
  assert.throws(() => operations.check("invalid", "n"), { code: "NOTE_MOVE_OPERATION_INVALID" });
  const { instanceId } = operations.prepare(id, "n");
  assert.throws(() => operations.check(id, "other"), { code: "NOTE_MOVE_OPERATION_INVALID" });
  await assert.rejects(operations.run(id, "other", () => assert.fail("wrong note"), instanceId), { code: "NOTE_MOVE_OPERATION_INVALID" });
});

test("capacity exhaustion does not evict cancellation tombstones", async () => {
  const operations = createNoteMoveOperations({ maxEntries: 1 }), id = randomUUID();
  operations.check(id, "n");
  assert.throws(() => operations.prepare(randomUUID(), "n"), { code: "NOTE_MOVE_TRACKER_FULL" });
  assert.equal(operations.check(id, "n").state, "cancelled");
});
