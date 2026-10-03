import { uniqueStrings } from "./prototype-collection-utils.js";
import { parseWritingBasketIdsForRuntime, setWritingBasketIdsForRuntime } from "./writing-basket-state.js";

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
