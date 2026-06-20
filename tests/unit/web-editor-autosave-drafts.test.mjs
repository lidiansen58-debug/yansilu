import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTO_SAVE_IDLE_MS,
  AUTO_SAVE_INTERVAL_MS,
  createEditorDraftPayload,
  editorDraftKey,
  editorTemplatePreferenceKey,
  parseEditorDraft
} from "../../apps/web/src/editor-autosave-drafts.js";

test("editor autosave draft helpers keep storage keys stable", () => {
  assert.equal(AUTO_SAVE_IDLE_MS, 15000);
  assert.equal(AUTO_SAVE_INTERVAL_MS, 15000);
  assert.equal(editorDraftKey("note-1"), "yansilu:draft:note-1");
  assert.equal(editorTemplatePreferenceKey(" Relation "), "yansilu:template-variant:relation");
  assert.equal(editorTemplatePreferenceKey(""), "yansilu:template-variant:default");
});

test("editor autosave draft payload preserves persisted fields", () => {
  const payload = createEditorDraftPayload(
    {
      noteId: "note-1",
      title: "Current title",
      body: "# Current title\n\nBody",
      savedTitle: "Saved title",
      savedBody: "# Saved title\n\nOld body"
    },
    {
      claim: "Original claim",
      confirmed: true,
      confirmedBody: "# Current title\n\nBody"
    },
    "2026-06-21T01:02:03.000Z"
  );

  assert.deepEqual(payload, {
    noteId: "note-1",
    title: "Current title",
    body: "# Current title\n\nBody",
    savedTitle: "Saved title",
    savedBody: "# Saved title\n\nOld body",
    authorshipClaim: "Original claim",
    authorshipConfirmed: true,
    authorshipConfirmedBody: "# Current title\n\nBody",
    updatedAt: "2026-06-21T01:02:03.000Z"
  });
});

test("editor autosave draft parser rejects missing body and malformed JSON", () => {
  assert.deepEqual(parseEditorDraft('{"noteId":"note-1","body":"draft"}'), {
    noteId: "note-1",
    body: "draft"
  });
  assert.equal(parseEditorDraft('{"noteId":"note-1"}'), null);
  assert.equal(parseEditorDraft("{broken"), null);
  assert.equal(parseEditorDraft(""), null);
});
