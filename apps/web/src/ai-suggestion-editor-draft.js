// Keep unsaved text across background renders of the same canonical suggestion.
// Explicit close discards it; returning from a note may retain a scoped draft through loading.
export function captureAiSuggestionEditorDrafts(mount, drafts = new Map()) {
  for (const editor of mount.querySelectorAll?.("[data-ai-suggestion-content-editor]") || []) {
    const id = editor.getAttribute("data-ai-suggestion-content-editor");
    if (editor.value === editor.defaultValue) { drafts.delete(id); continue; }
    drafts.set(id, {
      ...drafts.get(id),
      baseline: editor.defaultValue, value: editor.value
    });
  }
  return drafts;
}

export function renderWithAiSuggestionEditorDrafts(mount, html, preservedDrafts, currentScope = "") {
  const drafts = captureAiSuggestionEditorDrafts(mount, preservedDrafts || new Map());
  mount.innerHTML = html;
  for (const editor of mount.querySelectorAll?.("[data-ai-suggestion-content-editor]") || []) {
    const draft = drafts.get(editor.getAttribute("data-ai-suggestion-content-editor"));
    if (draft && draft.baseline === editor.defaultValue && (!draft.scope || draft.scope === currentScope)) editor.value = draft.value;
    else drafts.delete(editor.getAttribute("data-ai-suggestion-content-editor"));
  }
}
