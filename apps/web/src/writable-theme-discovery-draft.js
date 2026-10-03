export function recordWritableThemeDiscoveryInput(event, writingState = {}) {
  const input = event?.target?.closest?.("[data-theme-discovery-field]");
  const card = input?.closest?.("[data-theme-discovery-suggestion-id]");
  const id = card?.getAttribute?.("data-theme-discovery-suggestion-id");
  const suggestion = writingState.themeDiscoverySuggestions?.find(item => item.id === id);
  if (!suggestion) return;
  const field = input.getAttribute("data-theme-discovery-field");
  const draft = suggestion.draft ||= {};
  if (["title", "centralQuestion", "membershipReason"].includes(field)) {
    draft[field] = input.value;
  } else if (field === "item-rationale") {
    const noteId = input.getAttribute("data-theme-discovery-note-id");
    draft.items = { ...draft.items, [noteId]: input.value };
  }
}

export function writableThemeDiscoveryDraftView(suggestion = {}) {
  const draft = suggestion.draft || {};
  return { ...suggestion, ...draft, items: (suggestion.items || []).map(item => ({
    ...item, rationale: draft.items?.[item.noteId] ?? item.rationale
  })) };
}

export function captureWritableThemeDiscoveryDrafts(mount, writingState = {}) {
  for (const input of mount?.querySelectorAll?.("[data-theme-discovery-field]") || []) {
    if (input.value !== input.defaultValue) recordWritableThemeDiscoveryInput({ target: input }, writingState);
  }
}
