import test from "node:test";
import assert from "node:assert/strict";

import {
  generatedOriginalNoteIdFromBody,
  notePersistenceFieldsForSave,
  stripGeneratedOriginalMarker,
  withGeneratedOriginalMarker,
  withGeneratedOriginalReference
} from "../../apps/web/src/note-persistence-policy.js";

test("note persistence policy extracts and strips generated-original markers", () => {
  const body = [
    "Draft body",
    "",
    "<!-- yansilu:generated-original=pn_123 -->",
    "",
    "Tail"
  ].join("\n");

  assert.equal(generatedOriginalNoteIdFromBody(body), "pn_123");
  assert.equal(stripGeneratedOriginalMarker(body), "Draft body\n\nTail");
});

test("note persistence policy rewrites generated-original marker without duplicates", () => {
  const body = [
    "Draft body",
    "",
    "<!-- yansilu:generated-original=old_note -->"
  ].join("\n");

  assert.equal(
    withGeneratedOriginalMarker(body, " pn_new "),
    "Draft body\n\n<!-- yansilu:generated-original=pn_new -->"
  );
  assert.equal(withGeneratedOriginalMarker(body, ""), "Draft body");
});

test("note persistence policy appends a visible generated-original reference once", () => {
  const first = withGeneratedOriginalReference("Draft body", "Original Note");
  const second = withGeneratedOriginalReference(first, "Original Note");

  assert.equal(first, "Draft body\n\n关联永久笔记：[[Original Note]]");
  assert.equal(second, first);
});

test("note persistence policy keeps only persistable save fields", () => {
  assert.deepEqual(notePersistenceFieldsForSave({ generatedOriginalNoteId: "pn_1", relationNetworkStatus: "isolated" }), {
    generatedOriginalNoteId: "pn_1",
    relationNetworkStatus: "isolated"
  });
  assert.deepEqual(notePersistenceFieldsForSave({ generatedOriginalNoteId: "", relationNetworkStatus: "unknown" }), {
    generatedOriginalNoteId: undefined,
    relationNetworkStatus: undefined
  });
});
