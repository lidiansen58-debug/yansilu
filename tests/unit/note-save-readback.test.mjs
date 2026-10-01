import test from "node:test";
import assert from "node:assert/strict";
import { saveNoteWithReadback } from "../../apps/web/src/note-save-readback.js";

const note = { id: "n", body: "Saved", fileRevision: "a".repeat(64) };
const timeout = () => Object.assign(new Error("timeout"), { code: "request_timeout" });

test("a lost acknowledgement is recovered only from a matching completed operation", async () => {
  let writes = 0, reads = 0;
  const saved = await saveNoteWithReadback({ noteId: "n", payload: { body: "Saved" }, operationId: "operation-1",
    write: async payload => { writes++; assert.equal(payload.operationId, "operation-1"); throw timeout(); },
    check: async id => { reads++; assert.equal(id, "operation-1"); return { state: "completed", note, fileRevision: note.fileRevision }; } });
  assert.equal(saved, note);
  assert.equal(writes, 1);
  assert.equal(reads, 1);
});

for (const state of ["pending", "unknown", "failed"]) test(`${state} result stays uncertain and never retries the write`, async () => {
  let writes = 0;
  await assert.rejects(saveNoteWithReadback({ noteId: "n", payload: {}, operationId: "operation-1",
    write: async () => { writes++; throw timeout(); }, check: async () => ({ state }) }), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  assert.equal(writes, 1);
});

test("changed files and mismatched readbacks cannot claim success", async () => {
  for (const result of [{ state: "changed" }, { state: "completed", note, fileRevision: "other" }]) {
    await assert.rejects(saveNoteWithReadback({ noteId: "n", operationId: "operation-1", write: async () => { throw timeout(); }, check: async () => result }),
      { code: result.state === "changed" ? "NOTE_SAVE_CONFLICT" : "NOTE_SAVE_RESULT_UNCERTAIN" });
  }
});

test("validation conflicts are not converted into a successful readback", async () => {
  let reads = 0;
  await assert.rejects(saveNoteWithReadback({ noteId: "n", write: async () => { throw Object.assign(new Error("conflict"), { code: "NOTE_SAVE_CONFLICT" }); },
    check: async () => { reads++; return { state: "completed", note }; } }), { code: "NOTE_SAVE_CONFLICT" });
  assert.equal(reads, 0);
});

test("missing or malformed revision cannot confirm a completed receipt", async () => {
  for (const fileRevision of [undefined, "invalid"]) {
    await assert.rejects(saveNoteWithReadback({ noteId: "n", write: async () => { throw timeout(); },
      check: async () => ({ state: "completed", note: { ...note, fileRevision }, fileRevision }) }),
    { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  }
});

test("a malformed write acknowledgement can recover without another write", async () => {
  let writes = 0;
  const saved = await saveNoteWithReadback({ noteId: "n", write: async () => { writes++; return null; },
    check: async () => ({ state: "completed", note, fileRevision: note.fileRevision }) });
  assert.equal(saved, note);
  assert.equal(writes, 1);
});

test("readback failure keeps the result uncertain", async () => {
  await assert.rejects(saveNoteWithReadback({ noteId: "n", write: async () => { throw timeout(); },
    check: async () => { throw new Error("service stopped"); } }), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
});
