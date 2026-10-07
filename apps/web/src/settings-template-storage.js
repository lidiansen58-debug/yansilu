export function persistTemplateEntry({ getStorage, key, historyKey, source, history }) {
  let storage;
  let previousHistory;
  let historyWritten = false;
  try {
    storage = getStorage();
    if (!storage) throw new Error("本地存储不可用");
    previousHistory = storage.getItem(historyKey);
    storage.setItem(historyKey, JSON.stringify(history));
    historyWritten = true;
    // Write the active template last, so a history failure never changes it.
    storage.setItem(key, source);
    return { ok: true };
  } catch (error) {
    if (historyWritten) {
      try {
        if (previousHistory === null) storage.removeItem(historyKey);
        else storage.setItem(historyKey, previousHistory);
      } catch {}
    }
    return { ok: false, message: String(error?.message || error) };
  }
}
