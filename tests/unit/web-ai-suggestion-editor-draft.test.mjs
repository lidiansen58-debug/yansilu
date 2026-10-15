import test from "node:test";
import assert from "node:assert/strict";
import { renderWithAiSuggestionEditorDrafts } from "../../apps/web/src/ai-suggestion-editor-draft.js";

function editor(id, baseline, value = baseline) {
  return { defaultValue: baseline, value, getAttribute: () => id };
}

test("AI suggestion draft survives background render but follows a new canonical baseline or selection", () => {
  let nodes = [editor("suggestion-a", "Original", "Human draft")];
  let next = [];
  const mount = {
    querySelectorAll: () => nodes,
    set innerHTML(_) { nodes = next; }
  };
  next = [editor("suggestion-a", "Original")];
  renderWithAiSuggestionEditorDrafts(mount, "background refresh");
  assert.equal(nodes[0].value, "Human draft");
  next = [editor("suggestion-a", "Saved revision")];
  renderWithAiSuggestionEditorDrafts(mount, "canonical save");
  assert.equal(nodes[0].value, "Saved revision");
  nodes[0].value = "Another draft";
  next = [editor("suggestion-b", "Saved revision")];
  renderWithAiSuggestionEditorDrafts(mount, "switch suggestion");
  assert.equal(nodes[0].value, "Saved revision");
  nodes[0].value = "Closed draft";
  next = [];
  renderWithAiSuggestionEditorDrafts(mount, "close modal or switch vault");
  next = [editor("suggestion-b", "Saved revision")];
  renderWithAiSuggestionEditorDrafts(mount, "reopen");
  assert.equal(nodes[0].value, "Saved revision");
});

for (const scope of ['original-vault', 'cloned-vault']) test('detached review text survives returning to its original library only: ' + scope, () => {
  const drafts = new Map([['same-id', { baseline: 'Original', value: 'Unsubmitted text', scope: 'original-vault' }]]);
  let nodes = [], next = [];
  const mount = { querySelectorAll: () => nodes, set innerHTML(_) { nodes = next; } };
  renderWithAiSuggestionEditorDrafts(mount, 'loading without an editor', drafts, '');
  next = [editor('same-id', 'Original')];
  renderWithAiSuggestionEditorDrafts(mount, 'reopen real detail', drafts, scope);
  assert.equal(nodes[0].value, scope === 'original-vault' ? 'Unsubmitted text' : 'Original');
  if (scope === 'cloned-vault') assert.equal(drafts.size, 0);
});

test('reverting detached input to its server baseline does not resurrect an old unsaved value', () => {
  const drafts = new Map([['a', { baseline: 'Original', value: 'Old draft', scope: 'vault' }]]);
  let nodes = [editor('a', 'Original')], next = [editor('a', 'Original')];
  const mount = { querySelectorAll: () => nodes, set innerHTML(_) { nodes = next; } };
  renderWithAiSuggestionEditorDrafts(mount, 'background update', drafts, 'vault');
  assert.equal(nodes[0].value, 'Original'); assert.equal(drafts.size, 0);
});

test('new canonical detail invalidates detached unsaved text', () => {
  const drafts = new Map([['a', { baseline: 'Original', value: 'Old draft', scope: 'vault' }]]);
  let nodes = [], next = [editor('a', 'New saved content')];
  const mount = { querySelectorAll: () => nodes, set innerHTML(_) { nodes = next; } };
  renderWithAiSuggestionEditorDrafts(mount, 'new server content', drafts, 'vault');
  assert.equal(nodes[0].value, 'New saved content'); assert.equal(drafts.size, 0);
});
