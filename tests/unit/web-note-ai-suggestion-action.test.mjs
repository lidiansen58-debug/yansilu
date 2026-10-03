import test from "node:test";
import assert from "node:assert/strict";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function fixture() {
  const pane = Object.create(EditorPane.prototype);
  const note = { id: "note", thesis: "User judgement" };
  pane.state = { noteMoveVaultScope: "vault-a" };
  pane.noteAiSuggestionsRequestSerial = 0;
  pane.activeNote = () => note;
  pane.isActiveNoteId = id => pane.activeNote()?.id === id;
  pane.renderEmbeddedAiWorkspaceMount = () => {};
  pane.onStatus = () => {};
  pane.refreshNoteAiSuggestions = async () => {};
  pane.currentNoteSuggestionReviewContent = () => ({ thesis: note.thesis });
  pane.noteAiSuggestionsState = {
    noteId: note.id, items: [{ id: "suggestion", sourceArtifactId: "artifact" }]
  };
  return pane;
}

function response(item = {}) {
  return new Response(JSON.stringify({ item }), { headers: { "Content-Type": "application/json" } });
}

test("switching vault during suggestion detail lookup prevents confirmation writes", async t => {
  const pane = fixture();
  const calls = [];
  let finish;
  t.mock.method(globalThis, "fetch", (url, options = {}) => {
    calls.push(options.method || "GET");
    if (calls.length === 1) return new Promise(resolve => { finish = resolve; });
    return Promise.resolve(response());
  });
  const pending = pane.applyNoteAiSuggestionAction("confirmed", "suggestion", "artifact");
  await new Promise(resolve => setImmediate(resolve));
  pane.state.noteMoveVaultScope = "vault-b";
  const replacement = { noteId: "note", items: [], loading: true };
  pane.noteAiSuggestionsState = replacement;
  finish(response({ id: "suggestion" }));
  await pending;
  assert.deepEqual(calls, ["GET"]);
  assert.equal(pane.noteAiSuggestionsState, replacement);
});

test("duplicate suggestion confirmation clicks do not start duplicate writes", async t => {
  const pane = fixture();
  let finish;
  const calls = [];
  t.mock.method(globalThis, "fetch", (url, options = {}) => {
    calls.push(options.method || "GET");
    if (calls.length === 1) return new Promise(resolve => { finish = resolve; });
    return Promise.resolve(response());
  });
  const first = pane.applyNoteAiSuggestionAction("confirmed", "suggestion", "artifact");
  const second = pane.applyNoteAiSuggestionAction("confirmed", "suggestion", "artifact");
  await new Promise(resolve => setImmediate(resolve));
  finish(response({ id: "suggestion" }));
  await Promise.all([first, second]);
  assert.deepEqual(calls, ["GET", "PATCH"]);
});

test("a late suggestion failure cannot replace a newer AI workspace state", async t => {
  const pane = fixture();
  let fail;
  t.mock.method(globalThis, "fetch", () => new Promise((resolve, reject) => { fail = reject; }));
  const pending = pane.applyNoteAiSuggestionAction("confirmed", "suggestion", "artifact");
  await new Promise(resolve => setImmediate(resolve));
  const replacement = { noteId: "note", items: [], loading: true };
  pane.noteAiSuggestionsState = replacement;
  fail(new Error("Old request failed"));
  await pending;
  assert.equal(pane.noteAiSuggestionsState, replacement);
});

test("failed suggestion confirmation releases its lock and can retry", async t => {
  const pane = fixture();
  let fail = true;
  const methods = [];
  t.mock.method(globalThis, "fetch", async (url, options = {}) => {
    methods.push(options.method || "GET");
    if (fail) throw new Error("Temporary failure");
    return response({ id: "suggestion" });
  });
  await pane.applyNoteAiSuggestionAction("confirmed", "suggestion", "artifact");
  assert.equal(pane.noteAiSuggestionsState.actionLoading, false);
  assert.match(pane.noteAiSuggestionsState.actionError, /Temporary failure/);
  fail = false;
  await pane.applyNoteAiSuggestionAction("confirmed", "suggestion", "artifact");
  assert.deepEqual(methods, ["GET", "GET", "PATCH"]);
  assert.equal(pane.noteAiSuggestionsState.actionError, "");
});

test("suggestion refresh does not publish results after a vault switch with the same note id", async t => {
  const pane = fixture();
  pane.refreshNoteAiSuggestions = EditorPane.prototype.refreshNoteAiSuggestions;
  let finish;
  t.mock.method(globalThis, "fetch", () => new Promise(resolve => { finish = resolve; }));
  const pending = pane.refreshNoteAiSuggestions("note");
  await new Promise(resolve => setImmediate(resolve));
  pane.state.noteMoveVaultScope = "vault-b";
  const replacement = { noteId: "note", items: [], loading: true };
  pane.noteAiSuggestionsState = replacement;
  finish(new Response(JSON.stringify({ items: [{ id: "old-suggestion" }] }), { headers: { "Content-Type": "application/json" } }));
  await pending;
  assert.equal(pane.noteAiSuggestionsState, replacement);
});
