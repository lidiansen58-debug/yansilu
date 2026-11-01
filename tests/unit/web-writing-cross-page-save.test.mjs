import test from "node:test";
import assert from "node:assert/strict";
import { createWritingEntryRuntimeController } from "../../apps/web/src/writing-entry-runtime-controller.js";
import { handleWritingSaveDraftClick, recordWritingDraftInput } from "../../apps/web/src/writing-draft-save-controller.js";

for (const externalEdit of [false, true]) test(`returning to writing ${externalEdit ? "retains the conflict guard" : "retains a usable article save baseline"}`, async () => {
  const note = { id: "article", body: "# Article\n\nSaved", fileRevision: "opened-revision" };
  const project = { id: "p", title: "Article", entry_mode: "manual", draft_note_id: note.id, draft_note: note };
  const writingState = { project, projectFilters: {}, draftMarkdown: note.body, draftSaveState: "saved" };
  const editor = { value: note.body }, state = { notes: [] }, writes = [];
  const deps = { state, writingState,
    $: id => id === "writingDraftEditor" ? editor : null,
    fetchWritingProject: async () => ({ ...project, draft_note: { id: note.id, title: "Article" } }),
    writingDraftTitle: () => "Article", writingDraftBody: () => editor.value,
    updateNote: async (id, payload) => {
      writes.push(payload);
      assert.equal(payload.expectedBody, note.body);
      assert.equal(payload.expectedRevision, note.fileRevision);
      if (externalEdit) throw Object.assign(new Error("conflict"), { code: "NOTE_SAVE_CONFLICT" });
      return { id, body: payload.body, fileRevision: "saved-revision" };
    }
  };
  await createWritingEntryRuntimeController(() => deps).openWritingModule({ statusMessage: "" });
  editor.value = "# Article\n\nMy next paragraph";
  recordWritingDraftInput(deps, editor.value);
  await handleWritingSaveDraftClick(deps);
  assert.equal(writes.length, 1);
  assert.equal(writingState.draftSaveState, externalEdit ? "error" : "saved");
  assert.match(writingState.draftMarkdown, /My next paragraph/);
});

for (const remoteBinding of ["another-draft", null]) test(`returning to writing refuses a changed remote binding: ${remoteBinding}`, async () => {
  const note = { id: "old-article", body: "Keep my text", fileRevision: "old" };
  const writingState = { project: { id: "p", entry_mode: "manual", draft_note_id: note.id, draft_note: note },
    projectFilters: {}, draftMarkdown: note.body, draftSaveState: "saved" };
  let writes = 0;
  const messages = [], deps = { writingState, state: { notes: [] },
    fetchWritingProject: async () => ({ id: "p", entry_mode: "manual", draft_note_id: remoteBinding }),
    writingDraftTitle: () => "Article", writingDraftBody: () => writingState.draftMarkdown,
    updateNote: async () => { writes++; }, createNote: async () => { writes++; },
    setStatus: message => messages.push(message)
  };
  await createWritingEntryRuntimeController(() => deps).openWritingModule({ statusMessage: "" });
  assert.equal(writingState.draftSaveState, "error");
  assert.match(messages.at(-1), /其他地方切换.*输入仍保留/);
  assert.equal(writingState.draftMarkdown, note.body);
  await handleWritingSaveDraftClick(deps);
  assert.equal(writes, 0);
  assert.equal(writingState.draftSaveState, "error");
});
