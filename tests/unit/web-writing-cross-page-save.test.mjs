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
