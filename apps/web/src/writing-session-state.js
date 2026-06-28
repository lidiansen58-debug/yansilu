import { uniqueStrings } from "./prototype-collection-utils.js";

export function clearWritingThemeRelationCountsForRuntime(writingState = {}, noteIds = []) {
  writingState.themeRelationNoteIds = uniqueStrings(noteIds);
  writingState.themeRelationCounts = {};
  writingState.themeRelationCountErrors = {};
  writingState.loadingThemeRelationCounts = false;
  return writingState.themeRelationNoteIds;
}

export function setWritingFocusedCandidateScopeForRuntime(writingState = {}, noteIds = [], scopeLabel = "") {
  writingState.focusedCandidateNoteIds = uniqueStrings(noteIds);
  writingState.focusedCandidateScopeLabel = String(scopeLabel || "").trim();
  return {
    noteIds: writingState.focusedCandidateNoteIds,
    scopeLabel: writingState.focusedCandidateScopeLabel
  };
}

export function clearWritingFocusedCandidateScopeForRuntime(writingState = {}) {
  return setWritingFocusedCandidateScopeForRuntime(writingState, [], "");
}

export function clearWritingSourceIndexIdsForRuntime(writingState = {}) {
  writingState.sourceIndexIds = [];
  return writingState.sourceIndexIds;
}

export function setWritingSourceIndexIdsForRuntime(writingState = {}, indexIds = []) {
  writingState.sourceIndexIds = uniqueStrings(indexIds);
  return writingState.sourceIndexIds;
}

export function resetWritingStrongModelStateForRuntime(writingState = {}) {
  writingState.strongModelRevision = Number(writingState.strongModelRevision || 0) + 1;
  writingState.strongModelLoading = false;
  writingState.strongModelResult = null;
  writingState.strongModelError = "";
  return writingState.strongModelRevision;
}
