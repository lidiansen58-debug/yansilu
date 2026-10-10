import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { initVault, createNoteInDirectory, getNoteById, updateNoteContent } from "../../packages/domain/src/index.mjs";
import { createSqliteSuggestionStore } from "../../packages/ai-orchestrator/src/sqlite-suggestion-store.mjs";
import { createSqliteArtifactStore } from "../../packages/ai-orchestrator/src/sqlite-artifact-store.mjs";
import { confirmSuggestionIntoNote, suggestionNoteWriteBase } from "../../apps/api/src/ai-suggestion-note-confirmation.mjs";
import { aiSuggestionDetailFromResponse } from "../../apps/web/src/ai-suggestions-model.js";
import { applyAiSuggestionStatusForRuntime } from "../../apps/web/src/ai-suggestions-runtime-controller.js";

async function fixture(t) {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-confirm-race-"));
  await initVault(vaultPath);
  const note = await createNoteInDirectory(vaultPath, { directoryId: "dir_original_default", noteType: "permanent",
    title: "Review race", body: "# Review race\n\nOriginal body." });
  const suggestionStore = await createSqliteSuggestionStore({ vaultPath });
  const artifactStore = await createSqliteArtifactStore({ vaultPath });
  t.after(() => { suggestionStore.close(); artifactStore.close(); });
  const suggested = suggestionStore.create({ target: { type: "permanent_note", id: note.id, field: "thesis" },
    scope: "note_field", content: { thesis: "Suggested thesis" } });
  suggestionStore.transition(suggested.id, "adopted_as_draft");
  const item = suggestionStore.transition(suggested.id, "edited", { content: { thesis: "Human edit" } });
  const writeBase = await suggestionNoteWriteBase(vaultPath, item);
  return { vaultPath, note, suggestionStore, artifactStore, item, sourceArtifact: null,
    body: { status: "confirmed", userConfirmed: true, content: item.content, writeBase }, file: path.join(vaultPath, note.markdownPath) };
}

test("vault switching during note validation prevents writeback to either vault and leaves review edited", async t => {
  const f = await fixture(t);
  const bytes = await fs.readFile(f.file);
  let currentVault = f.vaultPath;
  const readFile = fs.readFile.bind(fs);
  t.mock.method(fs, "readFile", async (...args) => {
    const result = await readFile(...args);
    if (path.resolve(String(args[0])) === f.file) currentVault = path.join(f.vaultPath, "different");
    return result;
  });
  await assert.rejects(confirmSuggestionIntoNote({ ...f, currentVaultPath: () => currentVault }), { code: "AI_SUGGESTION_WRITE_VAULT_CHANGED" });
  assert.deepEqual(await readFile(f.file), bytes);
  assert.deepEqual(f.suggestionStore.get(f.item.id), f.item);
});

test("a concurrent review transition inside the save queue rolls back the note instead of confirming stale review", async t => {
  const f = await fixture(t);
  const bytes = await fs.readFile(f.file);
  const readFile = fs.readFile.bind(fs);
  let reads = 0;
  t.mock.method(fs, "readFile", async (...args) => {
    const result = await readFile(...args);
    if (path.resolve(String(args[0])) === f.file && ++reads === 2) {
      f.suggestionStore.transition(f.item.id, "confirmed", { userConfirmed: true, content: { thesis: "Other reviewer" } });
    }
    return result;
  });
  await assert.rejects(confirmSuggestionIntoNote({ ...f, currentVaultPath: () => f.vaultPath }), { code: "AI_SUGGESTION_WRITE_REVIEW_CHANGED" });
  assert.deepEqual(await readFile(f.file), bytes);
  assert.equal(f.suggestionStore.get(f.item.id).content.thesis, "Other reviewer");
});

test("note transaction rollback preserves newer external bytes instead of restoring stale Markdown", async t => {
  const f = await fixture(t);
  const external = f.note.markdown.replace("Original body.", "External body during persistence.");
  await assert.rejects(updateNoteContent(f.vaultPath, f.note.id, { expectedRevision: f.note.fileRevision, thesis: "Pending write" }, {
    commitTransaction() { writeFileSync(f.file, external, "utf8"); throw new Error("Persistence failed"); }
  }), /Persistence failed/);
  assert.equal(await fs.readFile(f.file, "utf8"), external);
  assert.match((await getNoteById(f.vaultPath, f.note.id)).body, /External body/);
});

test("the review model and confirmation action retain the displayed note baseline", async () => {
  const writeBase = { noteId: "note", vaultPath: "vault", fileRevision: "a".repeat(64), suggestionRevision: "b".repeat(64) };
  const item = { id: "suggestion", status: "edited", target: { type: "permanent_note", id: "note", field: "thesis" }, content: { thesis: "Human edit" } };
  const detail = aiSuggestionDetailFromResponse({ item, canonical: { write_base: writeBase } });
  assert.deepEqual(detail.writeBase, writeBase);
  const aiState = { suggestions: [item], suggestionDetail: detail, selectedSuggestionId: item.id };
  let submitted;
  await applyAiSuggestionStatusForRuntime({ aiState, suggestionDetailFromResponse: aiSuggestionDetailFromResponse,
    aiSuggestionReviewedContent: () => item.content, updateAiSuggestion: async (_, payload) => {
      submitted = payload; return { ...item, status: "confirmed" };
    }, refreshAiSuggestions: async () => {}, loadAiSuggestionDetail: async () => {}
  }, item.id, "confirmed");
  assert.equal(submitted.applyToNote, true);
  assert.equal(submitted.userConfirmed, true);
  assert.deepEqual(submitted.writeBase, writeBase);
});
