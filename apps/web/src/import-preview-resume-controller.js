import { canResumeImportPreview, importPreviewInputKey, importRequestMatches } from "./import-preview-resume-model.js";
import { candidatePreviewItemIds, confirmableCandidateIds } from "./import-candidate-preview-model.js";

export function createImportPreviewResumeController({ importState = {}, getToolbarValues = () => ({}),
  getVaultPath = () => "", readImportRecord, showImportResult = () => {}, setStatus = () => {},
  checkpoint = () => {}, clearCache = () => {} } = {}) {
  let pending = null;
  return function resume(values, request, { restart = false } = {}) {
    if (!canResumeImportPreview(importState, values)) return Promise.resolve(null);
    const id = values.importRecordId, vault = getVaultPath(), key = importPreviewInputKey(values);
    const context = JSON.stringify([id, vault, key]);
    if (pending?.context === context) return pending.promise;
    const isCurrent = () => getVaultPath() === vault && importState.lastPreview?.importRecordId === id
      && getToolbarValues().importRecordId === id && importPreviewInputKey(getToolbarValues()) === key;
    importState.previewResumeBusy = true;
    checkpoint();
    const promise = Promise.resolve().then(async () => {
      try {
        const record = await readImportRecord(id);
        if (!isCurrent()) return { handled: true };
        if (!record || record.importRecordId !== id || !importRequestMatches(record, request)) {
          throw new Error("这条预览与当前来源不一致，不能恢复。请重新选择来源并预览。");
        }
        if (record.status === "preview") {
          if (!record.candidatePreview) throw new Error("导入预览缺少笔记清单，请检查本地服务后重试。");
          if (restart) return null;
          const valid = new Set(confirmableCandidateIds(record.candidatePreview, record.originalityGuard));
          const seen = importState.lastPreview.candidatePreview?.truncated
            ? new Set(candidatePreviewItemIds(importState.lastPreview.candidatePreview)) : null;
          importState.selectedCandidateIds = new Set([...(importState.selectedCandidateIds || [])].filter(id => valid.has(id) && (!seen || seen.has(id))));
          importState.selectionImportRecordId = id;
          importState.lastPreview = record;
          showImportResult({ ...record, stage: "preview" });
          checkpoint();
          setStatus("已恢复上次预览与勾选。", "ok");
        } else {
          importState.lastPreview = record;
          showImportResult({ stage: "record", importRecord: record });
          if (["completed", "rolled_back", "cancelled"].includes(record.status)) {
            importState.lastPreview = null;
            importState.previewRequest = null;
            clearCache();
          } else checkpoint();
          setStatus("已核对导入状态，没有重复导入。", "ok");
        }
        return { handled: true, record };
      } catch (error) {
        if (isCurrent()) {
          showImportResult({ stage: "preview_error", importRecordId: id,
            message: `无法恢复上次预览：${String(error?.message || error)}`, code: error?.code || null });
          setStatus("预览恢复失败，勾选已保留；请检查服务后重试。", "bad");
        }
        return { handled: true };
      } finally {
        if (pending?.context === context) {
          pending = null;
          importState.previewResumeBusy = false;
          checkpoint();
        }
      }
    });
    pending = { context, promise };
    return promise;
  };
}
