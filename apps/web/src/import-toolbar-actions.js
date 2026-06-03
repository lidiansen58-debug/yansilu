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
      setStatus?.(`Import preview ready: ${preview.importRecordId}`, "ok");
      return preview;
    } catch (error) {
      showImportResult?.({
        stage: "preview_error",
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus?.(`Import preview failed: ${String(error?.message || error)}`, "bad");
      return null;
    }
  }

  async function handleConfirm() {
    const values = getToolbarValues();
    const importRecordId = resolveImportRecordId(values, getFallbackImportRecordId?.());
    if (!importRecordId) {
      setStatus?.("Preview the import first.", "warn");
      return null;
    }
    try {
      const preview = getActivePreview?.() || null;
      const selectedIds = preview?.candidatePreview ? [...selectionSummary(preview.candidatePreview, importRecordId).selectedIds] : null;
      const confirmPayload = selectedIds ? { selectedCandidateIds: selectedIds } : {};
      const directoryId = String(values.directoryId || "").trim();
      if (directoryId) confirmPayload.directoryId = directoryId;
      const result = await confirmImport(importRecordId, confirmPayload);
      setStatus?.(`Import completed: ${importRecordId}`, "ok");
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
      setStatus?.(`Import failed: ${String(error?.message || error)}`, "bad");
      return null;
    }
  }

  async function handleCancel() {
    setStatus?.("Cancel is not available in the simplified importer.", "warn");
    return null;
  }

  async function handleRefresh() {
    setStatus?.("Refresh is not available in the simplified importer.", "warn");
    return null;
  }

  async function handleRollback() {
    setStatus?.("Rollback is not available in the simplified importer.", "warn");
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
