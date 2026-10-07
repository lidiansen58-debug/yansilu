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
  state.previewRequest = saved.previewRequest || saved.values;
  state.lastResultPayload = { ...saved.preview, stage: "preview" };
  state.selectionImportRecordId = saved.values.importRecordId;
  state.selectedCandidateIds = new Set(saved.selectedIds.filter(id => typeof id === "string"));
  return saved.values;
}

export function persistImportWorkspace(storage, vault, state, values) {
  if (!values.importRecordId || state.lastPreview?.importRecordId !== values.importRecordId) return;
  storage?.setItem(storageKey(vault), JSON.stringify({ values, preview: state.lastPreview, previewRequest: state.previewRequest,
    selectedIds: [...(state.selectedCandidateIds || [])] }));
}

export function createImportWorkspaceRecovery({ getVaultPath = () => "", getStorage = () => null,
  importState = {}, setStatus = () => {} } = {}) {
  let loadedVault = "", restoredValues = null;
  function restore() {
    const vault = getVaultPath();
    if (!vault || vault === loadedVault) return null;
    if (loadedVault) {
      importState.importRecordId = "";
      importState.lastPreview = null;
      importState.previewRequest = null;
      importState.previewResumeBusy = false;
      importState.lastResultPayload = null;
      importState.lastExportResultPayload = null;
      importState.operationResultVisible = false;
      importState.selectionImportRecordId = "";
      importState.selectedCandidateIds = new Set();
    }
    loadedVault = vault;
    try { restoredValues = restoreImportWorkspace(getStorage(), vault, importState); }
    catch { setStatus("本机导入恢复记录无法读取，请重新核对预览。", "warn"); restoredValues = null; }
    return restoredValues || { importRecordId: "", path: "", payload: "", options: "", directoryId: "dir_original_default" };
  }
  function checkpoint(values) {
    const vault = getVaultPath();
    if (!vault) return;
    try { persistImportWorkspace(getStorage(), vault, importState, values); }
    catch { setStatus("导入页面的本机恢复记录保存失败，请勿刷新页面。", "warn"); }
  }
  function clear() {
    try { getStorage()?.removeItem(storageKey(getVaultPath())); }
    catch { setStatus("本机旧预览记录未能清除，下次继续时将重新核对导入状态。", "warn"); }
  }
  return { restore, checkpoint, clear };
}
