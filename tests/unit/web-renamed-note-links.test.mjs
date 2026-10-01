import test from "node:test";
import assert from "node:assert/strict";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function pane(notes = []) {
  const instance = Object.create(EditorPane.prototype);
  instance.state = { notes };
  instance.activeNote = () => ({ id: "reference" });
  instance.onStatus = () => {};
  return instance;
}

const renamed = { id: "source", title: "New title", markdownPath: "notes/fleeting/New title.md", linkAliases: ["Old title", "notes/fleeting/Old title.md", "Old title.md"] };

test("old title and path links resolve to the renamed stable note", () => {
  const editor = pane([renamed]);
  for (const token of ["Old title", "Old title#Section|Read source", "notes/fleeting/Old title.md", "fleeting/Old title.md", "Old title.md"]) {
    const result = editor.resolveLinkToken(token);
    assert.equal(result.note.id, "source");
    assert.equal(result.ambiguous, false);
  }
});

test("current titles and historic aliases collide safely", () => {
  const editor = pane([renamed, { id: "new-source", title: "Old title", markdownPath: "notes/fleeting/Old title.md" }]);
  assert.equal(editor.resolveLinkToken("Old title").ambiguous, true);
  assert.equal(editor.resolveLinkToken("notes/fleeting/Old title.md").ambiguous, true);
  assert.equal(editor.resolveLinkToken("source").ambiguous, false);
});

test("preview loads renamed notes not yet present in frontend metadata", async () => {
  const editor = pane();
  editor.searchNotesForResolution = async () => ({ items: [renamed] });
  assert.equal((await editor.resolvePreviewLinkToken("Old title")).note.id, "source");
  assert.deepEqual(editor.state.notes[0].linkAliases, renamed.linkAliases);
});

test("preview checks for unloaded aliases before trusting a current title", async () => {
  const replacement = { id: "replacement", title: "Old title" };
  const editor = pane([replacement]);
  editor.searchNotesForResolution = async () => ({ items: [replacement, renamed] });
  assert.equal((await editor.resolvePreviewLinkToken("Old title")).ambiguous, true);
});

test("metadata refresh retains unsaved body while updating aliases", () => {
  const editor = pane([{ ...renamed, body: "Unsaved edits", linkAliases: [] }]);
  editor.upsertApiNotes([renamed]);
  assert.equal(editor.state.notes[0].body, "Unsaved edits");
  assert.deepEqual(editor.state.notes[0].linkAliases, renamed.linkAliases);
});

test("ambiguous links do not open an arbitrary preview", async () => {
  const editor = pane([renamed, { id: "replacement", title: "Old title" }]);
  const messages = [];
  editor.onStatus = message => messages.push(message);
  editor.showNotePreviewInInspector = () => { throw new Error("Must not open an arbitrary match"); };
  await editor.handleTokenAction("[[Old title]]");
  assert.match(messages[0], /多个匹配/);
});

for (const change of ["note", "vault"]) test(`late preview lookup does not mutate a changed ${change} context`, async () => {
  const editor = pane();
  let currentNoteId = "reference";
  let vaultScope = "vault-a";
  editor.activeNote = () => ({ id: currentNoteId });
  editor.vaultScope = () => vaultScope;
  editor.searchNotesForResolution = async () => {
    if (change === "note") currentNoteId = "other-reference";
    else vaultScope = "vault-b";
    return { items: [renamed] };
  };
  assert.equal(await editor.resolvePreviewLinkToken("Old title"), null);
  assert.deepEqual(editor.state.notes, []);
});
