import { candidatePreviewItems } from "./import-candidate-preview-model.js";

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

export function selectedCandidateGroups(candidatePreview = null, selectedIds = []) {
  const selectedIdSet = selectedIds instanceof Set ? selectedIds : new Set((Array.isArray(selectedIds) ? selectedIds : []).map((item) => String(item || "").trim()).filter(Boolean));
  return [
    ...new Set(
      candidatePreviewItems(candidatePreview)
        .filter((item) => selectedIdSet.has(String(item.id || "").trim()))
        .map((item) => String(item.candidateGroup || "").trim())
        .filter(Boolean)
    )
  ];
}

function selectedCandidateGroupsFromSelection(candidateSelection = null, selectedIds = []) {
  const selectedIdSet = selectedIds instanceof Set ? selectedIds : new Set((Array.isArray(selectedIds) ? selectedIds : []).map((item) => String(item || "").trim()).filter(Boolean));
  if (!selectedIdSet.size || !candidateSelection || typeof candidateSelection !== "object") return [];
  const groups = [];
  if ((Array.isArray(candidateSelection.sources) ? candidateSelection.sources : []).some((id) => selectedIdSet.has(String(id || "").trim()))) {
    groups.push("Source");
  }
  if ((Array.isArray(candidateSelection.literatureNotes) ? candidateSelection.literatureNotes : []).some((id) => selectedIdSet.has(String(id || "").trim()))) {
    groups.push("LiteratureNote");
  }
  if ((Array.isArray(candidateSelection.permanentNotes) ? candidateSelection.permanentNotes : []).some((id) => selectedIdSet.has(String(id || "").trim()))) {
    groups.push("PermanentNote");
  }
  return groups;
}

export function validateImportDirectorySelection({
  candidatePreview = null,
  candidateSelection = null,
  selectedIds = [],
  directoryId = "",
  resolveDirectoryRootId
} = {}) {
  const cleanDirectoryId = String(directoryId || "").trim();
  if (!cleanDirectoryId) return null;
  const groups = (selectedCandidateGroupsFromSelection(candidateSelection, selectedIds).length
    ? selectedCandidateGroupsFromSelection(candidateSelection, selectedIds)
    : selectedCandidateGroups(candidatePreview, selectedIds)
  ).filter((group) => group !== "Source");
  if (!groups.length) return null;
  if (groups.includes("LiteratureNote") && groups.includes("PermanentNote")) {
    return {
      code: "IMPORT_DIRECTORY_SCOPE_INVALID",
      message: "当前一次确认只能给同一根目录的一批笔记选择“导入到”。请把文献笔记和永久笔记分开确认。"
    };
  }
  const rootDirectoryId = typeof resolveDirectoryRootId === "function" ? String(resolveDirectoryRootId(cleanDirectoryId) || "").trim() : "";
  if (!rootDirectoryId) return null;
  if (groups.includes("LiteratureNote") && rootDirectoryId !== "dir_literature_default") {
    return {
      code: "IMPORT_DIRECTORY_SCOPE_INVALID",
      message: "当前选择的是文献笔记，请改选文献卡片盒目录后再确认。"
    };
  }
  if (groups.includes("PermanentNote") && rootDirectoryId !== "dir_original_default") {
    return {
      code: "IMPORT_DIRECTORY_SCOPE_INVALID",
      message: "当前选择的是永久笔记，请改选永久笔记盒目录后再确认。"
    };
  }
  return null;
}

export function createImportToolbarActions({
  getToolbarValues,
  getFallbackImportRecordId,
  getActivePreview,
  selectionSummary,
  resolveDirectoryRootId,
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
      const confirmPayload = selectedIds ? { selectedCandidateIds: selectedIds } : {};
      const directoryId = String(values.directoryId || "").trim();
      const directoryValidationError = validateImportDirectorySelection({
        candidatePreview: preview?.candidatePreview || null,
        candidateSelection: preview?.candidateSelection || null,
        selectedIds,
        directoryId,
        resolveDirectoryRootId
      });
      if (directoryValidationError) {
        showImportResult?.({
          stage: "confirm_error",
          importRecordId,
          message: directoryValidationError.message,
          code: directoryValidationError.code,
          details: null
        });
        setStatus?.(directoryValidationError.message, "warn");
        return null;
      }
      if (directoryId) confirmPayload.directoryId = directoryId;
      const result = await confirmImport(importRecordId, confirmPayload);
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
