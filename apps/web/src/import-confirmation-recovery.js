import { withMoveDeadline } from "./note-move-recovery.js";

const unknown = cause => Object.assign(new Error("导入结果尚未确认。再次确认只会核查原记录，不会重复导入；请检查本地服务。"), {
  code: "IMPORT_CONFIRM_UNCERTAIN", cause
});
const recoveryKey = id => `yansilu:import-confirm:v1:${encodeURIComponent(id)}`;
const validResult = value => Array.isArray(value?.createdFiles) && ["sources", "literatureNotes", "permanentNotes"]
  .every(key => Number.isInteger(value?.created?.[key]) && value.created[key] >= 0);
const completed = (value, id) => value?.importRecordId === id && value.status === "completed" && validResult(value.result);

export function createImportConfirmationRecovery({ write, read, getStorage = () => null, limit = 64, timeoutMs = 30000, verifyTimeoutMs = 5000 }) {
  const records = new Map();
  async function verify(id, entry) {
    let record;
    try { record = await withMoveDeadline(() => read(id), verifyTimeoutMs); }
    catch (error) { throw unknown(error); }
    if (record?.importRecordId !== id) throw unknown();
    if (record.status === "completed" && validResult(record.confirmResult)) {
      entry.result = { importRecordId: id, status: "completed", result: record.confirmResult,
        originalityGuard: record.originalityGuard, finishedAt: record.confirmResult.finishedAt };
      return entry.result;
    }
    if (record.status === "confirming") throw Object.assign(new Error("仍在导入。再次确认只会核查进度，不会重复提交。"), { code: "IMPORT_CONFIRM_PENDING" });
    if (record.status === "preview") throw Object.assign(new Error("服务端确认尚未开始写入；再次点击确认可以安全重试。"), { code: "IMPORT_CONFIRM_RETRYABLE" });
    if (record.status === "interrupted") {
      const files = record.recoveryResult?.files || [];
      const summary = record.recoveryResult?.checkpointAvailable
        ? `已核对 ${files.filter(item => item.status === "verified").length} 个文件，${files.filter(item => item.status !== "verified").length} 个文件变化或缺失${record.recoveryResult.pending ? "，另有一项结果未确认" : ""}。`
        : "旧记录没有逐项检查点。";
      throw Object.assign(new Error(`本地服务曾在导入期间停止。${summary}请核对下方文件清单，不会重复导入。`), { code: "IMPORT_CONFIRM_UNCERTAIN", details: record.recoveryResult, importRecord: record });
    }
    if (["failed", "cancelled"].includes(record.status)) throw Object.assign(new Error(
      record.failureResult?.message || (record.status === "cancelled" ? "导入已取消。" : "导入失败，请核查导入记录与已写入文件。")),
    { code: "IMPORT_CONFIRM_FAILED", details: record.failureResult });
    throw unknown();
  }
  return function confirm(id, payload) {
    let entry = records.get(id);
    if (entry?.promise) return entry.promise;
    if (entry?.result) return Promise.resolve(entry.result);
    const isNew = !entry;
    let first = isNew;
    let storage, key;
    if (isNew) {
      if (records.size >= limit) {
        for (const [key, value] of records) if (value.result) { records.delete(key); break; }
      }
      if (records.size >= limit) return Promise.reject(unknown());
      try {
        storage = getStorage();
        key = recoveryKey(id);
        const marker = storage?.getItem(key);
        if (marker !== null && marker !== undefined && marker !== "submitted") throw new Error("Invalid recovery marker");
        first = marker !== "submitted";
        if (first) storage?.setItem(key, "submitted");
      } catch {
        return Promise.reject(Object.assign(new Error("本机导入恢复记录无法保存或读取，请核对本地存储后重试；尚未提交导入。"), { code: "IMPORT_RECOVERY_STORAGE_FAILED" }));
      }
      entry = {};
      records.set(id, entry);
    }
    entry.promise = Promise.resolve().then(async () => {
      if (first) {
        try {
          const result = await withMoveDeadline(() => write(id, payload), timeoutMs);
          if (completed(result, id)) { entry.result = result; return result; }
        } catch (error) {
          if (["IMPORT_SELECTED_CANDIDATES_INVALID", "IMPORT_SELECTION_EMPTY", "IMPORT_CONFIRM_REQUIRED",
            "IMPORT_ORIGINALITY_BLOCKED", "IMPORT_DIRECTORY_INVALID", "IMPORT_VAULT_CHANGED", "IMPORT_RECORD_NOT_FOUND"].includes(error?.code)) {
            storage?.removeItem(key);
            records.delete(id);
            throw error;
          }
        }
      }
      try { return await verify(id, entry); }
      catch (error) {
        if (error?.code === "IMPORT_CONFIRM_RETRYABLE") {
          try { (storage || getStorage())?.removeItem(key || recoveryKey(id)); }
          catch (cause) {
            throw Object.assign(new Error("服务端确认尚未开始写入，但本机恢复标记无法清除；请检查本地存储后重试。"), {
              code: "IMPORT_RECOVERY_STORAGE_FAILED", cause
            });
          }
          records.delete(id);
        }
        throw error;
      }
    }).finally(() => { entry.promise = null; });
    return entry.promise;
  };
}
