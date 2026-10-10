import test from "node:test";
import assert from "node:assert/strict";
import { captureNoteAiAdoptionBaseline, applyNoteAiAdoptionBaseline } from "../../apps/web/src/note-ai-adoption-baseline.js";
import { readAiFieldAdoptionContext } from "../../apps/api/src/ai-field-adoption-context.mjs";

function fixture() {
  const note = { id: "note", title: "Title", body: "Original body", thesis: "", fileRevision: "a".repeat(64) };
  const tab = { noteId: note.id, body: note.body, title: note.title, savedBody: note.body, savedTitle: note.title,
    savedFileRevision: note.fileRevision, dirty: false };
  let value = tab.body;
  let writes = 0;
  const host = { state: { noteMoveVaultScope: {} }, vaultScope: () => "vault-a", activeNote: () => note,
    activeTab: () => tab, getEditorValue: () => value, fillEditorFromTab: () => { value = tab.body; }, writeDraft: () => writes++ };
  const saved = { ...note, thesis: "Adopted draft", fileRevision: "b".repeat(64) };
  return { host, note, tab, saved, type: text => { value = text; }, writes: () => writes };
}

test("adoption advances the saved file version before the next metadata save", () => {
  const f = fixture();
  const context = captureNoteAiAdoptionBaseline(f.host, f.note);
  assert.equal(applyNoteAiAdoptionBaseline(f.host, f.note, f.saved, context), true);
  assert.equal(f.note.thesis, "Adopted draft");
  assert.equal(f.tab.savedFileRevision, f.saved.fileRevision);
  assert.equal(f.tab.savedBody, f.saved.body);
  assert.equal(f.tab.dirty, false);
});

for (const when of ["before", "during"]) test(`adoption retains unsaved prose and title typed ${when} the request`, () => {
  const f = fixture();
  const type = () => { f.tab.title = "Human title"; f.tab.body = "Original body plus local input"; f.tab.dirty = true; f.type(f.tab.body); };
  if (when === "before") type();
  const context = captureNoteAiAdoptionBaseline(f.host, f.note);
  if (when === "during") type();
  assert.equal(applyNoteAiAdoptionBaseline(f.host, f.note, f.saved, context), true);
  assert.equal(f.tab.body, "Original body plus local input");
  assert.equal(f.tab.title, "Human title");
  assert.equal(f.tab.savedTitle, "Title");
  assert.equal(f.tab.savedFileRevision, f.saved.fileRevision);
  assert.equal(f.tab.dirty, true);
  assert.equal(f.writes(), 1);
});

for (const changed of ["save", "tab", "vault"]) test(`adoption cannot replace a newer ${changed} context with the same note ID`, () => {
  const f = fixture();
  const context = captureNoteAiAdoptionBaseline(f.host, f.note);
  if (changed === "save") {
    f.note.thesis = "Later manual save"; f.note.fileRevision = "c".repeat(64); f.tab.savedFileRevision = f.note.fileRevision;
  } else if (changed === "tab") f.host.activeTab = () => ({ ...f.tab });
  else { f.host.state.noteMoveVaultScope = {}; f.host.vaultScope = () => "vault-b"; }
  const note = structuredClone(f.note), tab = structuredClone(f.tab);
  assert.equal(applyNoteAiAdoptionBaseline(f.host, f.note, f.saved, context), false);
  assert.deepEqual(f.note, note);
  assert.deepEqual(f.tab, tab);
});

test("overlapping remote prose changes preserve local input and the old conflict guard", () => {
  const f = fixture();
  const context = captureNoteAiAdoptionBaseline(f.host, f.note);
  f.type("LOCAL replacement");
  assert.equal(applyNoteAiAdoptionBaseline(f.host, f.note, { ...f.saved, body: "REMOTE replacement" }, context), false);
  assert.equal(f.tab.body, "LOCAL replacement");
  assert.equal(f.tab.savedFileRevision, context.baseline.savedFileRevision);
  assert.equal(f.tab.saveConflict, true);
});

test("an existing stale version cannot silently bypass adoption validation", () => {
  const f = fixture();
  f.tab.savedFileRevision = "c".repeat(64);
  assert.throws(() => captureNoteAiAdoptionBaseline(f.host, f.note), /笔记版本尚未核对/);
});

for (const stage of ["body", "init"]) test(`a vault switch during ${stage} rejects adoption before stores are opened`, async () => {
  let current = "vault-a", release;
  const gate = new Promise(resolve => { release = resolve; });
  let initialized = 0;
  const pending = readAiFieldAdoptionContext({}, { vaultPath: "vault-a", currentVaultPath: () => current,
    readJson: async () => { if (stage === "body") await gate; return { confirm: true }; },
    initVault: async () => { initialized++; if (stage === "init") await gate; } });
  await new Promise(resolve => setImmediate(resolve));
  current = "vault-b"; release();
  await assert.rejects(pending, { code: "VAULT_CHANGED" });
  assert.equal(initialized, stage === "body" ? 0 : 1);
});
