import test from "node:test";
import assert from "node:assert/strict";
import { saveEditorNoteWithRecovery } from "../../apps/web/src/editor-save-recovery.js";

const note = { id: "n", body: "OLD SUBMISSION", fileRevision: "a".repeat(64) };
function fixture() {
  const records = new Map();
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  let writes = 0, result = null, vault = "A";
  const deps = { getVaultPath: () => vault, getStorage: () => storage, createSaveOperationId: () => "operation-1",
    updateNote: async (_id, payload, options) => {
      writes++;
      assert.equal(payload.expectedVaultPath, vault);
      assert.equal(options.operationId, "operation-1");
      throw Object.assign(new Error("lost"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
    },
    checkNoteSave: async (id, op, options) => {
      assert.equal(id, "n"); assert.equal(op, "operation-1"); assert.equal(options.expectedVaultPath, vault);
      return result;
    } };
  return { deps, records, storage, writes: () => writes, result: value => { result = value; }, vault: value => { vault = value; } };
}

test("a refreshed save recovers the original operation without submitting newer input", async () => {
  const f = fixture();
  await assert.rejects(saveEditorNoteWithRecovery(f.deps, "n", { body: note.body }), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  assert.equal(f.records.size, 1);
  f.result({ state: "completed", note, fileRevision: note.fileRevision });
  const recovered = await saveEditorNoteWithRecovery({ ...f.deps }, "n", { body: "NEWER INPUT" });
  assert.equal(recovered.body, note.body);
  assert.equal(recovered.recoveredSave, true);
  assert.equal(f.writes(), 1);
  assert.equal(f.records.size, 0);
});

for (const state of ["pending", "unknown", "failed", "changed"]) test(`${state} receipt cannot resubmit after refresh`, async () => {
  const f = fixture();
  await assert.rejects(saveEditorNoteWithRecovery(f.deps, "n", { body: note.body }));
  f.result({ state });
  await assert.rejects(saveEditorNoteWithRecovery({ ...f.deps }, "n", { body: "NEWER" }),
    { code: state === "changed" ? "NOTE_SAVE_CONFLICT" : "NOTE_SAVE_RESULT_UNCERTAIN" });
  assert.equal(f.writes(), 1);
  assert.equal(f.records.size, 1);
});

test("save records are vault isolated and malformed storage fails before writing", async () => {
  const f = fixture();
  await assert.rejects(saveEditorNoteWithRecovery(f.deps, "n", { body: note.body }));
  f.vault("B");
  await assert.rejects(saveEditorNoteWithRecovery(f.deps, "n", { body: "B input" }));
  assert.equal(f.writes(), 2);
  assert.equal(f.records.size, 2);
  const corrupt = { ...f.deps, getStorage: () => ({ getItem: () => "null" }) };
  await assert.rejects(saveEditorNoteWithRecovery(corrupt, "n", { body: "input" }), { code: "NOTE_SAVE_RECOVERY_STORAGE_FAILED" });
  assert.equal(f.writes(), 2);
});

test("storage quota failure prevents saving and explicit prewrite conflict clears the record", async () => {
  const f = fixture();
  await assert.rejects(saveEditorNoteWithRecovery({ ...f.deps, getStorage: () => ({ getItem: () => null, setItem: () => { throw new Error("quota"); } }) }, "n", { body: "input" }), { code: "NOTE_SAVE_RECOVERY_STORAGE_FAILED" });
  assert.equal(f.writes(), 0);
  await assert.rejects(saveEditorNoteWithRecovery({ ...f.deps, updateNote: async () => {
    throw Object.assign(new Error("conflict"), { code: "NOTE_SAVE_CONFLICT" });
  } }, "n", { body: "input" }), { code: "NOTE_SAVE_CONFLICT" });
  assert.equal(f.records.size, 0);
});

test("a switch during receipt verification cannot return old data to the new vault", async () => {
  const f = fixture();
  await assert.rejects(saveEditorNoteWithRecovery(f.deps, "n", { body: note.body }));
  await assert.rejects(saveEditorNoteWithRecovery({ ...f.deps, checkNoteSave: async () => {
    f.vault("B"); return { state: "completed", note, fileRevision: note.fileRevision };
  } }, "n", { body: "NEWER" }), { code: "NOTE_SAVE_VAULT_CHANGED" });
  assert.equal(f.writes(), 1);
  assert.equal(f.records.size, 1);
});
