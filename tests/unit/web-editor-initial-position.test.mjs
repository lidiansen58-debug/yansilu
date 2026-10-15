import test from "node:test";
import assert from "node:assert/strict";
import { beginEditorInitialPosition, cancelEditorInitialPosition } from "../../apps/web/src/editor-initial-position.js";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function fixture() {
  const tab = { id: "tab", noteId: "note" };
  const root = new EventTarget();
  const document = new EventTarget();
  root.ownerDocument = document;
  let active = tab, vault = "vault";
  return { root, document, tab, host: { els: { editorWrap: root }, state: { previewMode: "wysiwyg" },
    activeTab: () => active, vaultScope: () => vault },
    setTab: next => { active = next; }, setVault: next => { vault = next; } };
}

for (const event of ["pointerdown", "keydown", "beforeinput", "input", "compositionstart", "paste", "drop", "wheel"]) {
  test(`initial positioning yields to ${event} without waiting for the note body to change`, () => {
    const f = fixture();
    const current = beginEditorInitialPosition(f.host, "focus");
    assert.equal(current(), true);
    f.root.dispatchEvent(new Event(event));
    assert.equal(current(), false);
  });
}

test("a new focus request replaces old focus without cancelling its viewport request", () => {
  const f = fixture();
  const viewport = beginEditorInitialPosition(f.host, "viewport");
  const oldFocus = beginEditorInitialPosition(f.host, "focus");
  const newFocus = beginEditorInitialPosition(f.host, "focus");
  assert.equal(oldFocus(), false);
  assert.equal(newFocus(), true);
  assert.equal(viewport(), true);
  f.root.dispatchEvent(new Event("pointerdown"));
  assert.equal(viewport(), false);
  assert.equal(newFocus(), false);
});

test("tab identity, note identity, vault and editing mode each reject old positioning", () => {
  for (const change of [f => f.setTab({ ...f.tab }), f => { f.tab.noteId = "other"; },
    f => f.setVault("other"), f => { f.host.state.previewMode = "source"; }]) {
    const f = fixture();
    const current = beginEditorInitialPosition(f.host, "focus");
    change(f);
    assert.equal(current(), false);
  }
});

test("filling the same tab again cancels prior requests and permits fresh positioning", () => {
  const f = fixture();
  const oldFocus = beginEditorInitialPosition(f.host, "focus");
  const oldViewport = beginEditorInitialPosition(f.host, "viewport");
  cancelEditorInitialPosition(f.host);
  assert.equal(oldFocus(), false);
  assert.equal(oldViewport(), false);
  assert.equal(beginEditorInitialPosition(f.host, "focus")(), true);
});

test("there is no pending positioning when no note is open", () => {
  const f = fixture();
  f.setTab(null);
  assert.equal(beginEditorInitialPosition(f.host, "focus")(), false);
});

function withScheduler(run) {
  const previous = globalThis.window;
  const queue = [];
  globalThis.window = { requestAnimationFrame: fn => { queue.push(fn); },
    setTimeout: fn => { queue.push(fn); } };
  const flush = () => {
    let remaining = 100;
    while (queue.length) { assert.ok(remaining-- > 0); queue.shift()(); }
  };
  try { run({ next: () => queue.shift()(), flush }); }
  finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

function paneFixture() {
  const f = fixture(), selections = [];
  const pane = Object.assign(Object.create(EditorPane.prototype), f.host);
  let focusCount = 0;
  Object.assign(pane, { pendingEditorFocus: "select-placeholder-title",
    isLiteratureWorkspaceActive: () => false, isWysiwygMode: () => true,
    placeholderTitleSelectionRange: () => ({ from: 2, to: 7 }),
    richEditor: { focus: () => { focusCount++; }, editor: { setSelection: (...range) => selections.push(range) } },
    setMarkdownSelectionOverride: () => {}, focusEditor: () => { focusCount++; } });
  return { ...f, pane, selections, focusCount: () => focusCount };
}

test("delayed placeholder selection cannot steal the caret after a paragraph click", () => withScheduler(({ next, flush }) => {
  const f = paneFixture();
  f.pane.applyPendingEditorFocus();
  next();
  assert.equal(f.selections.length, 1);
  f.root.dispatchEvent(new Event("pointerdown"));
  flush();
  assert.equal(f.selections.length, 1);
  assert.equal(f.focusCount(), 1);
}));

test("input before the first positioning frame prevents every initial focus callback", () => withScheduler(({ flush }) => {
  const f = paneFixture();
  f.pane.applyPendingEditorFocus();
  f.root.dispatchEvent(new Event("compositionstart"));
  flush();
  assert.equal(f.selections.length, 0);
  assert.equal(f.focusCount(), 0);
}));

test("untouched new notes keep readiness retries and title selection", () => withScheduler(({ flush }) => {
  const f = paneFixture();
  let reads = 0;
  f.pane.placeholderTitleSelectionRange = () => ++reads < 3 ? null : { from: 2, to: 7 };
  f.pane.applyPendingEditorFocus();
  flush();
  assert.equal(reads, 5);
  assert.equal(f.selections.length, 3);
  assert.equal(f.focusCount(), 3);
}));

test("readiness retries remain bounded and fall back to editor focus once", () => withScheduler(({ flush }) => {
  const f = paneFixture();
  let reads = 0;
  f.pane.placeholderTitleSelectionRange = () => { reads++; return null; };
  f.pane.applyPendingEditorFocus();
  flush();
  assert.equal(reads, 8);
  assert.equal(f.selections.length, 0);
  assert.equal(f.focusCount(), 1);
}));

test("a clicked source position survives delayed viewport resets", () => withScheduler(({ flush }) => {
  const f = paneFixture(), scroll = { scrollTop: 100, scrollLeft: 5 };
  let cursorMoves = 0;
  f.pane.editorScrollNodes = () => [scroll];
  f.pane.markdownEditor = { setSelectionRange: () => { cursorMoves++; } };
  f.pane.richEditor.editor.moveCursorToStart = () => { cursorMoves++; };
  f.pane.resetEditorViewportToStart();
  f.root.dispatchEvent(new Event("pointerdown"));
  flush();
  assert.deepEqual(scroll, { scrollTop: 100, scrollLeft: 5 });
  assert.equal(cursorMoves, 0);
}));

test("creating a note can hand off from today to explorer without losing initial title selection", () => withScheduler(({ flush }) => {
  const f = paneFixture();
  f.pane.state.module = "today";
  f.pane.applyPendingEditorFocus();
  f.pane.state.module = "explorer";
  flush();
  assert.equal(f.selections.length, 3);
  assert.equal(f.focusCount(), 3);
}));

test("user navigation outside the editor cancels delayed focus even when the tab remains open", () => withScheduler(({ next, flush }) => {
  for (const event of ["pointerdown", "keydown"]) {
    const f = paneFixture();
    f.pane.applyPendingEditorFocus();
    next();
    f.document.dispatchEvent(new Event(event));
    flush();
    assert.equal(f.selections.length, 1);
    assert.equal(f.focusCount(), 1);
  }
}));
