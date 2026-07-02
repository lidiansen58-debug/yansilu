export function parseJsonOrEmpty(raw, label) {
  const text = String(raw || "").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${String(error?.message || error)}`);
  }
}

export function buildImportPayload({ connector = "obsidian", path = "", payloadText = "" } = {}) {
  const cleanConnector = String(connector || "obsidian").trim() || "obsidian";
  const cleanPath = String(path || "").trim();
  const cleanPayloadText = String(payloadText || "").trim();
  if (cleanPayloadText) return parseJsonOrEmpty(cleanPayloadText, "Payload");
  if (cleanConnector === "obsidian" && !cleanPath) {
    throw new Error("Obsidian preview needs a vault path or payload JSON.");
  }
  return cleanPath ? { path: cleanPath } : {};
}

function resolveImportRecordId(values = {}, fallbackImportRecordId = "") {
  return String(values.importRecordId || fallbackImportRecordId || "").trim();
}

export function validateImportDirectorySelection() {
  return null;
}

export function createImportToolbarActions({
  getToolbarValues,
  getFallbackImportRecordId,
  getActivePreview,
  selectionSummary,
  previewImport,
  confirmImport,
  onPreviewSuccess,
  onConfirmSuccess,
  showImportResult,
  refreshImportHistory,
  refreshImportedNotesView,
  setStatus
} = {}) {
  async function handlePreview() {
    const values = getToolbarValues();
    const connector = String(values.connector || "obsidian").trim() || "obsidian";
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
      setStatus?.(`导入预览已生成：${preview.importRecordId}`, "ok");
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
      setStatus?.("请先完成导入预览。", "warn");
      return null;
    }
    try {
      const preview = getActivePreview?.() || null;
      const summary = preview?.candidatePreview ? selectionSummary(preview.candidatePreview, importRecordId) : null;
      const selectedIds = summary ? [...summary.selectedIds] : null;
      if (summary && selectedIds.length === 0) {
        const message = Number(summary.totalCount || 0) === 0 ? "当前预览没有可导入内容。" : "请先至少选择一条导入内容。";
        setStatus?.(message, "warn");
        return null;
      }
      const confirmPayload = selectedIds ? { selectedCandidateIds: selectedIds } : {};
      const directoryId = String(values.directoryId || "").trim();
      if (directoryId) confirmPayload.directoryId = directoryId;
      const options = parseJsonOrEmpty(values.options, "Options");
      if (options.originalityPlan) confirmPayload.originalityPlan = options.originalityPlan;
      if (options.overrideOriginality === true) confirmPayload.overrideOriginality = true;
      const result = await confirmImport(importRecordId, confirmPayload);
      setStatus?.(`导入完成：${importRecordId}`, "ok");
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
      setStatus?.(`导入失败：${String(error?.message || error)}`, "bad");
      return null;
    }
  }

  async function handleCancel() {
    setStatus?.("简化导入模式暂不支持取消。", "warn");
    return null;
  }

  async function handleRefresh() {
    setStatus?.("简化导入模式暂不支持刷新。", "warn");
    return null;
  }

  async function handleRollback() {
    setStatus?.("简化导入模式暂不支持回滚。", "warn");
    return null;
  }

  return {
    handlePreview,
    handleConfirm,
    handleCancel,
    handleRefresh,
    handleRollback
  };
}
