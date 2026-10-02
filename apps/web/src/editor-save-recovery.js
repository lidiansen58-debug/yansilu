const uncertain = cause => Object.assign(new Error("保存结果尚未确认，当前修改仍保留。再次同步会先核查原操作；若回执缺失且文件版本仍一致，会安全重试，否则保留修改并提示冲突。"), { code: "NOTE_SAVE_RESULT_UNCERTAIN", cause });
const storageFailure = () => Object.assign(new Error("本机保存恢复记录无法读取或写入，请保留当前修改，不要刷新页面。"), { code: "NOTE_SAVE_RECOVERY_STORAGE_FAILED" });
const validNote = (note, id) => note?.id === id && typeof note.body === "string"
  && typeof note.fileRevision === "string" && /^[a-f0-9]{64}$/.test(note.fileRevision);
const prewriteRejections = new Set([
  "NOTE_SAVE_CONFLICT", "NOTE_SAVE_BASE_INVALID", "NOTE_SAVE_VAULT_CHANGED", "VAULT_CHANGED", "desktop_api_unavailable",
  "LITERATURE_PARAPHRASE_REQUIRED", "PERMANENT_DISTILLATION_CONFIRMATION_REQUIRED", "VIEWPOINT_CHANGE_REASON_REQUIRED",
  "PERMANENT_ORIGINALITY_BLOCKED", "NOTE_SAVE_OPERATION_INVALID", "NOTE_SAVE_OPERATIONS_FULL"
]);

export async function saveEditorNoteWithRecovery(deps, noteId, payload) {
  // Non-browser callers may use the existing direct domain adapter.
  if (typeof deps.getVaultPath !== "function"
    || (typeof window === "undefined" && typeof deps.getStorage !== "function")) return deps.updateNote(noteId, payload);
  const vaultPath = deps.getVaultPath();
  let storage, record;
  const key = `yansilu:editor-save:v1:${encodeURIComponent(vaultPath)}:${encodeURIComponent(noteId)}`;
  try {
    storage = deps.getStorage ? deps.getStorage() : (typeof window === "undefined" ? null : window.localStorage);
    if (!vaultPath || !storage) throw storageFailure();
    const raw = storage.getItem(key);
    record = raw ? JSON.parse(raw) : null;
    if (raw && (!record || record.vaultPath !== vaultPath || record.noteId !== noteId
      || typeof record.operationId !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(record.operationId)
      || typeof record.payload?.body !== "string")) throw storageFailure();
  } catch { throw storageFailure(); }
  const clear = () => {
    try { storage.removeItem(key); } catch { throw storageFailure(); }
  };
  const assertCurrent = () => {
    if (deps.getVaultPath() !== vaultPath) throw Object.assign(new Error("笔记库已切换，保存结果不会应用到当前界面。"), { code: "NOTE_SAVE_VAULT_CHANGED" });
  };
  const recover = async (retryUnknown = false) => {
    let result;
    try { result = await deps.checkNoteSave(noteId, record.operationId, { expectedVaultPath: vaultPath }); }
    catch (error) { throw uncertain(error); }
    assertCurrent();
    if (result?.state === "failed" && prewriteRejections.has(result.code)) {
      clear();
      throw Object.assign(new Error(result.message || "这次保存未写入，请根据错误提示修正后重试。"), { code: result.code });
    }
    if (result?.state === "changed") throw Object.assign(new Error("上次保存后文件又发生变化，当前修改未覆盖文件，请保留输入并核对。"), { code: "NOTE_SAVE_CONFLICT" });
    if (result?.state === "unknown" && retryUnknown
      && typeof payload?.expectedRevision === "string" && /^[a-f0-9]{64}$/.test(payload.expectedRevision)) {
      // A fresh operation is safe only with a full-file compare-and-swap base.
      // If the old request actually wrote, the server rejects this retry as a conflict.
      return submitNewOperation();
    }
    if (result?.state !== "completed" || !validNote(result.note, noteId)
      || result.fileRevision !== result.note.fileRevision) throw uncertain();
    clear();
    return { ...result.note, recoveredSave: true };
  };
  async function submitNewOperation() {
    const operationId = deps.createSaveOperationId?.() || crypto.randomUUID();
    record = { noteId, vaultPath, operationId, payload: { ...payload, expectedVaultPath: vaultPath } };
    try { storage.setItem(key, JSON.stringify(record)); } catch { throw storageFailure(); }
    try {
      const note = await deps.updateNote(noteId, record.payload, { operationId });
      assertCurrent();
      if (!validNote(note, noteId)) return recover();
      clear();
      return note;
    } catch (error) {
      if (prewriteRejections.has(error?.code)) { clear(); throw error; }
      if (error?.code === "NOTE_SAVE_RECOVERY_STORAGE_FAILED") throw error;
      return recover();
    }
  }
  if (record) return recover(true);
  return submitNewOperation();
}
