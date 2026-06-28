import { uniqueStrings } from "./prototype-collection-utils.js";

export function writingThemeIndexByIdForRuntime(writingState = {}, indexId = "") {
  const id = String(indexId || "").trim();
  return (Array.isArray(writingState.themeIndexes) ? writingState.themeIndexes : []).find((item) => item.id === id) || null;
}

export function writingThemeIndexNoteIdsForRuntime(indexCard) {
  return uniqueStrings(indexCard?.item_note_ids || indexCard?.items?.map((item) => item.note_id) || []);
}

export function sameUniqueStringSetForRuntime(left = [], right = []) {
  const a = uniqueStrings(left);
  const b = uniqueStrings(right);
  return a.length === b.length && a.every((value) => b.includes(value));
}

export function selectedWritingThemeIndexForRuntime(writingState = {}, deps = {}) {
  const themeIndexById = deps.themeIndexById || ((indexId) => writingThemeIndexByIdForRuntime(writingState, indexId));
  const selectedId = String(writingState.selectedThemeIndexId || "").trim();
  if (selectedId) {
    const selected = themeIndexById(selectedId);
    if (selected) return selected;
  }
  const sourceId = uniqueStrings(writingState.sourceIndexIds)[0];
  if (sourceId) {
    const source = themeIndexById(sourceId);
    if (source) return source;
  }
  return (Array.isArray(writingState.themeIndexes) ? writingState.themeIndexes : [])[0] || null;
}

export function setSelectedWritingThemeIndexForRuntime(writingState = {}, indexId = "") {
  writingState.selectedThemeIndexId = String(indexId || "").trim();
  return writingState.selectedThemeIndexId;
}

export function writingThemeIndexScopeDirectoryIdForRuntime(state = {}, deps = {}) {
  const isDirectoryUnderOriginalRoot = deps.isDirectoryUnderOriginalRoot || (() => false);
  const writingDraftDirectoryId = deps.writingDraftDirectoryId || (() => "");
  const selectedFolderId = String(state.selectedFolderId || "").trim();
  if (selectedFolderId && isDirectoryUnderOriginalRoot(selectedFolderId)) return selectedFolderId;
  return writingDraftDirectoryId();
}
