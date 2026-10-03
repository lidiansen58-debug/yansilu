import { uniqueStrings } from "./prototype-collection-utils.js";

export function writingBasketIdsFromRaw(raw = "") {
  return uniqueStrings(String(raw || "").split(/[\s,;\u3001\uFF0C\uFF1B]+/));
}

export function parseWritingBasketIdsForRuntime(deps = {}) {
  const $ = deps.$ || (() => null);
  return writingBasketIdsFromRaw($("writingBasketNoteIds")?.value || "");
}

export function setWritingBasketIdsForRuntime(noteIds = [], deps = {}) {
  const $ = deps.$ || (() => null);
  const ids = uniqueStrings(noteIds);
  const input = $("writingBasketNoteIds");
  if (input) input.value = ids.join("\n");
  return ids;
}

export function addWritingBasketIdsForRuntime(noteIds = [], deps = {}) {
  const parseWritingBasketIds = deps.parseWritingBasketIds || (() => []);
  const setWritingBasketIds = deps.setWritingBasketIds || (() => []);
  const resetWritingProjectContextForBasketChange = deps.resetWritingProjectContextForBasketChange || (() => {});
  const refreshWritingRelationCounts = deps.refreshWritingRelationCounts || (() => {});
  const merged = uniqueStrings([...parseWritingBasketIds(), ...noteIds]);
  setWritingBasketIds(merged);
  resetWritingProjectContextForBasketChange();
  void refreshWritingRelationCounts(merged);
  return merged;
}

export function removeWritingBasketIdForRuntime(noteId = "", deps = {}) {
  const parseWritingBasketIds = deps.parseWritingBasketIds || (() => []);
  const setWritingBasketIds = deps.setWritingBasketIds || (() => []);
  const resetWritingProjectContextForBasketChange = deps.resetWritingProjectContextForBasketChange || (() => {});
  const refreshWritingRelationCounts = deps.refreshWritingRelationCounts || (() => {});
  const writingState = deps.writingState || {};
  const removedId = String(noteId || "").trim();
  const remaining = parseWritingBasketIds().filter((item) => item !== removedId);
  setWritingBasketIds(remaining);
  resetWritingProjectContextForBasketChange();
  if (writingState.relationCounts && removedId) delete writingState.relationCounts[removedId];
  void refreshWritingRelationCounts(remaining);
  return remaining;
}

export function clearWritingBasketForRuntime(deps = {}) {
  const setWritingBasketIds = deps.setWritingBasketIds || (() => []);
  const resetWritingLocalBookIdeas = deps.resetWritingLocalBookIdeas || (() => {});
  const writingState = deps.writingState || {};
  setWritingBasketIds([]);
  resetWritingLocalBookIdeas();
  writingState.relationCounts = {};
  writingState.relationCountErrors = {};
  writingState.loadingRelationCounts = false;
  return [];
}
