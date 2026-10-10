import test from "node:test";
import assert from "node:assert/strict";
import { syncRichEditorValue } from "../../apps/web/src/editor-rich-render-sync.js";

function host() {
  return { state: { previewMode: "wysiwyg" }, noteId: "bad-note", statuses: [], calls: 0,
    suppressEditorChange: false, suppressRichEditorChange: false,
    activeTab() { return { noteId: this.noteId, body: "原文", dirty: false }; },
    onStatus(...status) { this.statuses.push(status); },
    richEditor: { getValue: () => "", setValue: () => { throw new Error("unsafe raw internal details"); } }
  };
}

test("a failed rich render leaves document data alone and makes source editing available", () => {
  const h = host();
  assert.equal(syncRichEditorValue(h, "畸形 HTML 原文"), false);
  assert.equal(h.state.previewMode, "source");
  assert.equal(h.state.forcedSourcePreviewNoteId, "bad-note");
  assert.equal(h.activeTab().body, "原文");
  assert.equal(h.activeTab().dirty, false);
  assert.equal(h.suppressEditorChange, false);
  assert.equal(h.suppressRichEditorChange, false);
  assert.match(h.statuses[0][0], /已切换到源码/);
  assert.doesNotMatch(h.statuses[0][0], /unsafe raw internal details/);
});

test("a failed body is not reparsed repeatedly, but corrected input can render again", () => {
  const h = host();
  h.richEditor.setValue = () => { h.calls++; throw new Error("invalid HTML"); };
  syncRichEditorValue(h, "bad");
  syncRichEditorValue(h, "bad");
  assert.equal(h.calls, 1);
  h.richEditor.setValue = () => { h.calls++; };
  h.state.previewMode = "wysiwyg";
  h.state.forcedSourcePreviewNoteId = "";
  assert.equal(syncRichEditorValue(h, "corrected"), true);
  assert.equal(h.calls, 2);
  assert.equal(h.state.previewMode, "wysiwyg");
});

test("fallback does not follow another note or override an explicitly selected source mode", () => {
  const h = host();
  syncRichEditorValue(h, "bad");
  h.noteId = "normal-note";
  h.richEditor.setValue = () => {};
  assert.equal(syncRichEditorValue(h, "normal"), true);
  assert.equal(h.state.previewMode, "wysiwyg");
  h.state.previewMode = "source";
  h.state.forcedSourcePreviewNoteId = "";
  syncRichEditorValue(h, "user chose source");
  assert.equal(h.state.previewMode, "source");
});

test("rich synchronization restores existing suppression while forcing a document refresh", () => {
  const h = host();
  h.suppressEditorChange = true;
  h.suppressRichEditorChange = true;
  let refreshed;
  h.richEditor.editor = { setMarkdown: (text, cursor) => { refreshed = [text, cursor]; } };
  assert.equal(syncRichEditorValue(h, "refreshed", { force: true }), true);
  assert.deepEqual(refreshed, ["refreshed", false]);
  assert.equal(h.suppressEditorChange, true);
  assert.equal(h.suppressRichEditorChange, true);
});
