const invalid = () => Object.assign(new Error("本机创建恢复记录无法读取，请先保留当前输入并核对笔记库。"), { code: "WRITING_RECOVERY_STORAGE_FAILED" });

export function writingCreationStorage(deps, vaultPath, contextId) {
  const storage = deps.recoveryStorage === undefined
    ? (typeof window === "undefined" ? null : window.localStorage) : deps.recoveryStorage;
  if (!storage || !vaultPath || !contextId) return null;
  const key = `yansilu:writing-creation:v1:${encodeURIComponent(vaultPath)}:${encodeURIComponent(contextId)}`;
  return {
    read() {
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const record = JSON.parse(raw);
        if (record.vaultPath !== vaultPath || record.contextId !== contextId
          || typeof record.id !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(record.id)
          || typeof record.payload?.directoryId !== "string" || !record.payload.directoryId
          || typeof record.payload?.body !== "string") throw invalid();
        return record;
      } catch { throw invalid(); }
    },
    write(record) {
      try {
        storage.setItem(key, JSON.stringify({ id: record.id, vaultPath, contextId, payload: record.payload }));
      } catch { throw invalid(); }
    },
    clear() {
      try { storage.removeItem(key); } catch { throw invalid(); }
    }
  };
}
