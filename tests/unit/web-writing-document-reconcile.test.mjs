import test from "node:test";
import assert from "node:assert/strict";
import { reconcileWritingDocumentValue } from "../../apps/web/src/writing-document-reconcile.js";

for (const after of ["body\n", "body\n\n", "body\r\n"]) {
  test(`a final newline change does not replace content or inspect selection: ${JSON.stringify(after)}`, () => {
    reconcileWritingDocumentValue({}, {}, "body", after);
  });
}

function setup({ focused = true, markdown = "before body", selection = { from: 9, to: 10 } } = {}) {
  const scrollNode = { scrollTop: 80, scrollLeft: 12 }, calls = [];
  const host = { ownerDocument: { activeElement: {} }, contains: () => focused,
    querySelectorAll: () => [scrollNode], scrollTop: 5, scrollLeft: 0 };
  const editor = { getValue: () => markdown, selection: () => {
    assert.ok(focused, "Do not read an inactive editor's selection"); return selection;
  }, setValue: value => { markdown = value; scrollNode.scrollTop = 0; },
  setSelectionRange: (...args) => { calls.push(args); scrollNode.scrollTop = 100; } };
  return { host, editor, scrollNode, calls };
}

test("a real prefix change maps both selection endpoints and restores scroll without requesting focus", () => {
  const s = setup();
  reconcileWritingDocumentValue(s.editor, s.host, "before body", "new before body");
  assert.equal(s.editor.getValue(), "new before body");
  assert.deepEqual(s.calls, [[13, 14, { focus: false }]]);
  assert.deepEqual([s.scrollNode.scrollTop, s.scrollNode.scrollLeft], [80, 12]);
});

test("selection mapping uses the actual serialized widget offsets", () => {
  const raw = "$$widget0 [[n_source|来源]]$$\n\nbody";
  const s = setup({ markdown: raw, selection: { from: raw.length - 2, to: raw.length } });
  reconcileWritingDocumentValue(s.editor, s.host, "[[n_source|来源]]\n\nbody", `prefix ${raw}`);
  assert.deepEqual(s.calls, [[raw.length + 5, raw.length + 7, { focus: false }]]);
});

test("a Markdown edit does not steal focus from the source editor", () => {
  const s = setup({ focused: false });
  reconcileWritingDocumentValue(s.editor, s.host, "before body", "edited body");
  assert.equal(s.editor.getValue(), "edited body");
  assert.deepEqual(s.calls, []);
});

test("meaningful trailing spaces and a cleared document are still applied", () => {
  const s = setup();
  reconcileWritingDocumentValue(s.editor, s.host, "before body", "before body  \n");
  assert.equal(s.editor.getValue(), "before body  \n");
  reconcileWritingDocumentValue(s.editor, s.host, "before body  \n", "");
  assert.equal(s.editor.getValue(), "");
});
