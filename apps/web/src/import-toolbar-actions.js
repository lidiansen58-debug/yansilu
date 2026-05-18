export function parseJsonOrEmpty(raw, label) {
  const text = String(raw || "").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON：${String(error?.message || error)}`);
  }
}

export function buildImportPayload({ connector = "markdown", path = "", payloadText = "" } = {}) {
  const cleanConnector = String(connector || "markdown").trim() || "markdown";
  const cleanPath = String(path || "").trim();
  const cleanPayloadText = String(payloadText || "").trim();
  if (cleanPayloadText) return parseJsonOrEmpty(cleanPayloadText, "Payload");
  if ((cleanConnector === "markdown" || cleanConnector === "obsidian") && !cleanPath) {
    throw new Error("markdown/obsidian 预览需要“来源路径”或 Payload JSON");
  }
  return cleanPath ? { path: cleanPath } : {};
}

function resolveImportRecordId(values = {}, fallbackImportRecordId = "") {
  return String(values.importRecordId || fallbackImportRecordId || "").trim();
}

export function createImportToolbarActions({
  getToolbarValues,
  getFallbackImportRecordId,
  getActivePreview,
  selectionSummary,
  previewImport,
  confirmImport,
  cancelImport,
  loadImportRecordIntoUi,
  rollbackImportIntoUi,
  onPreviewSuccess,
  onConfirmSuccess,
  onCancelSuccess,
  onRefreshSuccess,
  onRollbackSuccess,
  showImportResult,
  refreshImportHistory,
  refreshImportedNotesView,
  setStatus
} = {}) {
  async function handlePreview() {
    const values = getToolbarValues();
    const connector = String(values.connector || "markdown").trim() || "markdown";
    try {
      const payload = buildImportPayload({
        connector,
        path: values.path,
        payloadText: values.payload
      });
      const options = parseJsonOrEmpty(values.options, "Options");
      const preview = await previewImport({ connector, payload, options });
      await onPreviewSuccess?.(preview);
      await refreshImportHistory?.({ silent: true });
      setStatus?.(`导入预览完成：${preview.importRecordId}`, "ok");
      return preview;
    } catch (error) {
      showImportResult?.({
        stage: "preview_error",
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus?.(`导入预览失败：${String(error?.message || error)}`, "bad");
      return null;
    }
  }

  async function handleConfirm() {
    const values = getToolbarValues();
    const importRecordId = resolveImportRecordId(values, getFallbackImportRecordId?.());
    if (!importRecordId) {
      setStatus?.("请先预览或填写 ImportRecord ID", "warn");
      return null;
    }
    try {
      const preview = getActivePreview?.() || null;
      const selectedIds = preview?.candidatePreview ? [...selectionSummary(preview.candidatePreview, importRecordId).selectedIds] : null;
      if (preview?.candidatePreview && selectedIds && selectedIds.length === 0) {
        setStatus?.("请至少勾选一个候选后再确认写入", "warn");
        return null;
      }
      const result = await confirmImport(importRecordId, selectedIds ? { selectedCandidateIds: selectedIds } : {});
      setStatus?.(`导入确认完成：${importRecordId}`, "ok");
      await onConfirmSuccess?.({ importRecordId, result, preview });
      await refreshImportHistory?.({ silent: true });
      await refreshImportedNotesView?.();
      return result;
    } catch (error) {
      showImportResult?.({
        stage: "confirm_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus?.(`导入确认失败：${String(error?.message || error)}`, "bad");
      return null;
    }
  }

  async function handleCancel() {
    const values = getToolbarValues();
    const importRecordId = resolveImportRecordId(values, getFallbackImportRecordId?.());
    if (!importRecordId) {
      setStatus?.("请先预览或填写 ImportRecord ID", "warn");
      return null;
    }
    try {
      const result = await cancelImport(importRecordId);
      await onCancelSuccess?.({ importRecordId, result });
      await refreshImportHistory?.({ silent: true });
      setStatus?.(`已取消导入：${importRecordId}`, "ok");
      return result;
    } catch (error) {
      showImportResult?.({
        stage: "cancel_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus?.(`取消导入失败：${String(error?.message || error)}`, "bad");
      return null;
    }
  }

  async function handleRefresh() {
    const values = getToolbarValues();
    const importRecordId = resolveImportRecordId(values, getFallbackImportRecordId?.());
    if (!importRecordId) {
      setStatus?.("请先填写 ImportRecord ID", "warn");
      return null;
    }
    try {
      const importRecord = await loadImportRecordIntoUi(importRecordId);
      await onRefreshSuccess?.({ importRecordId, importRecord });
      await refreshImportHistory?.({ silent: true });
      return importRecord;
    } catch (error) {
      showImportResult?.({
        stage: "record_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null
      });
      setStatus?.(`读取导入记录失败：${String(error?.message || error)}`, "bad");
      return null;
    }
  }

  async function handleRollback() {
    const values = getToolbarValues();
    const importRecordId = resolveImportRecordId(values, getFallbackImportRecordId?.());
    if (!importRecordId) {
      setStatus?.("请先填写 ImportRecord ID", "warn");
      return null;
    }
    try {
      const result = await rollbackImportIntoUi(importRecordId);
      await onRollbackSuccess?.({ importRecordId, result });
      return result;
    } catch (error) {
      showImportResult?.({
        stage: "rollback_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus?.(`回滚失败：${String(error?.message || error)}`, "bad");
      return null;
    }
  }

  return {
    handlePreview,
    handleConfirm,
    handleCancel,
    handleRefresh,
    handleRollback
  };
}
