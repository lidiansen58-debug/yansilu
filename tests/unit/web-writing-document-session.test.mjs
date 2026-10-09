import test from "node:test";
import assert from "node:assert/strict";
import { createWritingDocumentSession } from "../../apps/web/src/writing-document-session.js";

function setup() {
  const instances = [], changes = [];
  const deps = { state: { noteMoveVaultScope: {} }, getVaultPath: () => "vault",
    writingState: { project: { id: "project" }, bookChapter: { projectId: "project", id: "first" } } };
  const session = createWritingDocumentSession(options => {
    const editor = { options, destroyed: false, history: ["initial document load"],
      resetUndoHistory() { this.history = []; }, destroy() {
        this.destroyed = true;
        options.onChange("teardown notification");
      } };
    options.onChange("mount notification");
    instances.push(editor);
    return editor;
  }, { onChange: value => changes.push(value) });
  return { deps, session, instances, changes };
}

test("refreshes and initial note binding preserve the current document's undo history", () => {
  const s = setup(), editor = s.session.sync(s.deps, "body");
  editor.history.push("typing");
  s.deps.writingState.project = { id: "project", draft_note_id: "new-note" };
  s.deps.writingState.bookChapter = { projectId: "project", id: "first", noteId: "chapter-note" };
  assert.equal(s.session.sync(s.deps, "saved body"), editor);
  assert.deepEqual(editor.history, ["typing"]);
  assert.equal(s.instances.length, 1);
  assert.deepEqual(s.changes, [], "Mounting must not mark content dirty");
  editor.options.onChange("actual input");
  assert.deepEqual(s.changes, ["actual input"]);
});

for (const change of ["chapter", "article", "project", "vault path", "vault scope"]) {
  test(`changing ${change} creates a new history even when both documents have identical content`, () => {
    const s = setup(), previous = s.session.sync(s.deps, "same body");
    previous.history.push("other document");
    if (change === "chapter") s.deps.writingState.bookChapter.id = "second";
    if (change === "article") s.deps.writingState.bookChapter = null;
    if (change === "project") s.deps.writingState.project.id = "new-project";
    if (change === "vault path") s.deps.getVaultPath = () => "new-vault";
    if (change === "vault scope") s.deps.state.noteMoveVaultScope = {};
    const current = s.session.sync(s.deps, "same body");
    assert.notEqual(current, previous);
    assert.equal(previous.destroyed, true);
    assert.deepEqual(current.history, []);
    previous.options.onChange("late old input");
    assert.deepEqual(s.changes, []);
    current.options.onChange("current input");
    assert.deepEqual(s.changes, ["current input"]);
  });
}
