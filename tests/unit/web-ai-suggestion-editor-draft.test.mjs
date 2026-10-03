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
