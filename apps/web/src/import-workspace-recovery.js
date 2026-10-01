const storageKey = vault => `yansilu:import-workspace:v1:${encodeURIComponent(vault)}`;

export function restoreImportWorkspace(storage, vault, state) {
  const raw = storage?.getItem(storageKey(vault));
  if (!raw) return null;
  const saved = JSON.parse(raw);
  if (!saved || typeof saved.values?.importRecordId !== "string" || !Array.isArray(saved.selectedIds)
    || saved.preview?.importRecordId !== saved.values.importRecordId) throw new Error("导入恢复记录不完整，请重新核对预览。");
  state.importRecordId = saved.values.importRecordId;
  state.directoryId = saved.values.directoryId || "dir_original_default";
  state.lastPreview = saved.preview;
  state.lastResultPayload = { ...saved.preview, stage: "preview" };
  state.selectionImportRecordId = saved.values.importRecordId;
  state.selectedCandidateIds = new Set(saved.selectedIds.filter(id => typeof id === "string"));
  return saved.values;
}

export function persistImportWorkspace(storage, vault, state, values) {
  if (!values.importRecordId || state.lastPreview?.importRecordId !== values.importRecordId) return;
  storage?.setItem(storageKey(vault), JSON.stringify({ values, preview: state.lastPreview,
    selectedIds: [...(state.selectedCandidateIds || [])] }));
}
