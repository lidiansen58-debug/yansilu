const invalid = () => Object.assign(new Error("本机创建恢复记录无法保存或读取，请保留当前输入并核对笔记库。"), { code: "CREATION_RECOVERY_STORAGE_FAILED" });

export function noteCreationStorage(storage, vaultPath) {
  if (!storage || !vaultPath) return null;
  const key = `yansilu:note-creation:v1:${encodeURIComponent(vaultPath)}`;
  return {
    read() {
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const record = JSON.parse(raw);
        if (record?.vaultPath !== vaultPath || typeof record.id !== "string"
          || !/^[a-zA-Z0-9_-]{8,80}$/.test(record.id)
          || typeof record.folderId !== "string" || !record.folderId
          || typeof record.body !== "string") throw invalid();
        return record;
      } catch { throw invalid(); }
    },
    write(op) {
      try {
        storage.setItem(key, JSON.stringify({ vaultPath, id: op.id, folderId: op.folderId, body: op.body }));
      } catch { throw invalid(); }
    },
    clear(id) {
      try {
        if (this.read()?.id === id) storage.removeItem(key);
      } catch { throw invalid(); }
    }
  };
}
