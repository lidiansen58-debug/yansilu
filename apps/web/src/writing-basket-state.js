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

export function createWritingBasketSession({ $ = () => null, getVaultPath = () => "", getStorage = () => null, onScopeChange = () => {} } = {}) {
  let scope = "";
  const keyFor = (value) => `yansilu.writing-basket.v1:${encodeURIComponent(value)}`;
  const readSaved = (key) => {
    try {
      const saved = JSON.parse(getStorage()?.getItem(key) || "[]");
      return Array.isArray(saved) && saved.every((id) => typeof id === "string") ? uniqueStrings(saved) : [];
    } catch { return []; }
  };
  const synchronize = () => {
    let next = String(getVaultPath() || "").trim().replaceAll("\\", "/").replace(/\/+$/, "");
    if (/^[a-z]:\//i.test(next)) next = next.toLowerCase();
    if (!next || next === scope) return;
    const previous = scope;
    scope = next;
    if (previous) onScopeChange();
    setWritingBasketIdsForRuntime(readSaved(keyFor(scope)), { $ });
  };
  const persist = () => {
    if (!scope) return;
    const ids = parseWritingBasketIdsForRuntime({ $ });
    try {
      const storage = getStorage();
      if (ids.length) storage?.setItem(keyFor(scope), JSON.stringify(ids));
      else storage?.removeItem(keyFor(scope));
    } catch { /* Storage restrictions must not prevent working with notes. */ }
  };
  return {
    read() { synchronize(); return parseWritingBasketIdsForRuntime({ $ }); },
    set(ids) { synchronize(); const result = setWritingBasketIdsForRuntime(ids, { $ }); persist(); return result; },
    persist() { synchronize(); persist(); }
  };
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
