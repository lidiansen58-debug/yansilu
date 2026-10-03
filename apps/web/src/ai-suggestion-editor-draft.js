// Keep unsaved text across background renders of the same canonical suggestion.
// A changed server baseline or a closed editor starts a fresh draft.
export function renderWithAiSuggestionEditorDrafts(mount, html) {
  const drafts = new Map();
  for (const editor of mount.querySelectorAll?.("[data-ai-suggestion-content-editor]") || []) {
    if (editor.value === editor.defaultValue) continue;
    drafts.set(editor.getAttribute("data-ai-suggestion-content-editor"), {
      baseline: editor.defaultValue, value: editor.value
    });
  }
  mount.innerHTML = html;
  for (const editor of mount.querySelectorAll?.("[data-ai-suggestion-content-editor]") || []) {
    const draft = drafts.get(editor.getAttribute("data-ai-suggestion-content-editor"));
    if (draft && draft.baseline === editor.defaultValue) editor.value = draft.value;
  }
}
