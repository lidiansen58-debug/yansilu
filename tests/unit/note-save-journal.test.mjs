import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createNoteSaveJournal } from "../../apps/api/src/note-save-journal.mjs";
import { createNoteSaveOperations } from "../../apps/api/src/note-save-operations.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-save-journal-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test("completed receipts survive a new service instance and prevent replay", async t => {
  const root = await fixture(t);
  let time = 0;
  const first = createNoteSaveOperations({ journal: createNoteSaveJournal(), now: () => time });
  await first.run("operation-1", "note-1", root, async () => ({ fileRevision: "sha256-original" }));
  time = 2 * 24 * 60 * 60 * 1000;
  assert.equal(first.check("operation-1", "note-1", root).state, "completed");
  const restarted = createNoteSaveOperations({ journal: createNoteSaveJournal(), now: () => time });
  assert.equal(restarted.check("operation-1", "note-1", root).fileRevision, "sha256-original");
  assert.equal(restarted.check("operation-1", "note-1", root).state, "completed");
  await assert.rejects(restarted.run("operation-1", "note-1", root, () => assert.fail("No replay")), { code: "NOTE_SAVE_OPERATION_REUSED" });
  assert.throws(() => restarted.check("operation-1", "different-note", root), { code: "NOTE_SAVE_VAULT_CHANGED" });
});

test("interrupted receipts stay unknown after restart and remain fenced", async t => {
  const root = await fixture(t);
  createNoteSaveJournal().write("operation-1", { noteId: "note-1", vaultPath: root, state: "pending" });
  const restarted = createNoteSaveOperations({ journal: createNoteSaveJournal() });
  assert.deepEqual(restarted.check("operation-1", "note-1", root), { state: "unknown" });
  await assert.rejects(restarted.run("operation-1", "note-1", root, () => assert.fail("No replay")), { code: "NOTE_SAVE_OPERATION_REUSED" });
});

test("corrupt journal cannot authorize a save or claim completion", async t => {
  const root = await fixture(t);
  const journal = createNoteSaveJournal();
  journal.write("operation-1", { noteId: "note-1", vaultPath: root, state: "pending" });
  await fs.writeFile(path.join(root, ".yansilu", "save-operations", "operation-1.json"), "{broken", "utf8");
  const restarted = createNoteSaveOperations({ journal });
  assert.throws(() => restarted.check("operation-1", "note-1", root), { code: "NOTE_SAVE_JOURNAL_INVALID" });
  await assert.rejects(restarted.run("operation-1", "note-1", root, () => assert.fail("No write")), { code: "NOTE_SAVE_JOURNAL_INVALID" });
  assert.throws(() => journal.read("../../escape", root), { code: "NOTE_SAVE_JOURNAL_INVALID" });
});

test("journal failure before saving leaves the note untouched", async () => {
  const operations = createNoteSaveOperations({ journal: { read: () => null, write: () => { throw new Error("Disk full"); } } });
  await assert.rejects(operations.run("operation-1", "note-1", "vault", () => assert.fail("No write")), /Disk full/);
});

test("a failed completion receipt cannot report successful confirmation", async () => {
  let diskRecord, writes = 0;
  const operations = createNoteSaveOperations({ journal: {
    read: () => diskRecord,
    write: (_id, record) => {
      if (++writes > 1) throw new Error("Disk full");
      diskRecord = { ...record };
    }
  } });
  await assert.rejects(operations.run("operation-1", "note-1", "vault", () => ({ fileRevision: "saved" })), /Disk full/);
  assert.equal(operations.check("operation-1", "note-1", "vault").state, "failed");
  const restarted = createNoteSaveOperations({ journal: { read: () => diskRecord } });
  assert.equal(restarted.check("operation-1", "note-1", "vault").state, "unknown");
  await assert.rejects(restarted.run("operation-1", "note-1", "vault", () => assert.fail("No replay")), { code: "NOTE_SAVE_OPERATION_REUSED" });
});
