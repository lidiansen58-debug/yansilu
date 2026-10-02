const invalid = (code, message) => Object.assign(new Error(message), { code });

export function createNoteSaveOperations({ now = Date.now, limit = 64, ttlMs = 15 * 60 * 1000, journal = null } = {}) {
  const records = new Map();
  const prune = () => {
    for (const [id, record] of records) if (record.state !== "pending" && now() - record.finishedAt > ttlMs) records.delete(id);
  };
  return {
    async run(operationId, noteId, vaultPath, save) {
      if (typeof operationId !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(operationId)) throw invalid("NOTE_SAVE_OPERATION_INVALID", "保存操作编号无效。");
      prune();
      if (records.has(operationId) || journal?.read(operationId, vaultPath)) throw invalid("NOTE_SAVE_OPERATION_REUSED", "此保存操作已执行，请先核查结果，不要重复写入。");
      if (records.size >= limit) {
        for (const [id, record] of records) {
          if (record.state !== "pending") { records.delete(id); break; }
        }
      }
      if (records.size >= limit) throw invalid("NOTE_SAVE_OPERATIONS_FULL", "保存结果记录已满，请稍后再试。");
      const record = { noteId, vaultPath, state: "pending" };
      journal?.write(operationId, record);
      records.set(operationId, record);
      try {
        const note = await save();
        record.state = "completed";
        record.fileRevision = note.fileRevision;
        record.finishedAt = now();
        journal?.write(operationId, record);
        return note;
      } catch (error) {
        record.state = "failed";
        record.code = error?.code || "NOTE_UPDATE_INVALID";
        record.message = String(error?.message || error);
        record.finishedAt = now();
        journal?.write(operationId, record);
        throw error;
      } finally {
        record.finishedAt = now();
      }
    },
    check(operationId, noteId, vaultPath) {
      prune();
      const active = records.get(operationId);
      const record = active || journal?.read(operationId, vaultPath);
      if (!record) return { state: "unknown" };
      if (record.noteId !== noteId || record.vaultPath !== vaultPath) throw invalid("NOTE_SAVE_VAULT_CHANGED", "保存对应的笔记库已变化，不能确认本次结果。");
      if (!active && record.state === "pending") return { state: "unknown" };
      // Cache expiry must not invalidate a durable receipt; the API checks the current file hash.
      return { state: record.state, fileRevision: record.fileRevision, code: record.code, message: record.message };
    }
  };
}
