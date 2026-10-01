import test from "node:test";
import assert from "node:assert/strict";
import { createNoteSaveOperations } from "../../apps/api/src/note-save-operations.mjs";

test("save operations expose pending/completed receipt and bind it to vault and note", async () => {
  const operations = createNoteSaveOperations();
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const saving = operations.run("operation-1", "n", "vault", async () => { await wait; return { fileRevision: "version" }; });
  assert.equal(operations.check("operation-1", "n", "vault").state, "pending");
  assert.throws(() => operations.check("operation-1", "n", "other"), { code: "NOTE_SAVE_VAULT_CHANGED" });
  await assert.rejects(operations.run("operation-1", "n", "vault", () => {}), { code: "NOTE_SAVE_OPERATION_REUSED" });
  release();
  await saving;
  assert.equal(operations.check("operation-1", "n", "vault").fileRevision, "version");
});

test("failed, expired and evicted receipts do not claim success or block later saves", async () => {
  let time = 0;
  const operations = createNoteSaveOperations({ now: () => time, ttlMs: 10, limit: 1 });
  await assert.rejects(operations.run("operation-1", "n", "vault", () => { throw new Error("disk"); }), /disk/);
  assert.equal(operations.check("operation-1", "n", "vault").state, "failed");
  await operations.run("operation-2", "n", "vault", () => ({ fileRevision: "v" }));
  assert.equal(operations.check("operation-1", "n", "vault").state, "unknown");
  time = 11;
  assert.equal(operations.check("operation-2", "n", "vault").state, "unknown");
});
