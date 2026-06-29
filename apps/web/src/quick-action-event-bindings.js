export function installQuickActionEventBindings(deps = {}) {
  const {
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    state = {},
    editor = {},
    getGraphModuleActivationGuardUntil = () => 0,
    folderById = () => null,
    displayFolderName = () => "",
    syncNotesForDirectoryTree = async () => {},
    syncRailSelectionState = () => {},
    renderAll = () => {},
    setStatus = () => {},
    now = () => Date.now()
  } = deps;

  documentRef?.querySelectorAll?.("[data-action^='quick-']")?.forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const action = btn.dataset.action;
      if (action === "quick-original" && now() < getGraphModuleActivationGuardUntil()) {
        setStatus("宸插仠鐣欏湪鍏崇郴鍥捐氨", "ok");
        return;
      }
      const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
      if (activeTab?.dirty) {
        editor.updateActiveTabFromEditor?.();
        void editor.autoSaveTabById?.(activeTab.id, "switch-root");
      }
      if (action === "quick-fleeting") {
        state.browserRootId = "dir_fleeting_default";
        state.selectedFolderId = "dir_fleeting_default";
      }
      if (action === "quick-literature") {
        state.browserRootId = "dir_literature_default";
        state.selectedFolderId = "dir_literature_default";
      }
      if (action === "quick-original") {
        state.browserRootId = "dir_original_default";
        state.selectedFolderId = "dir_original_default";
      }
      state.module = "explorer";
      state.selectedFileId = null;
      await syncNotesForDirectoryTree(state.browserRootId);
      syncRailSelectionState();
      setStatus(`宸插垏鎹㈠埌 ${displayFolderName(folderById(state, state.browserRootId))} 鍏ュ彛`, "ok");
      renderAll();
    });
  });

  documentRef?.querySelectorAll?.("[data-action='open-handoff']")?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = `${windowRef.location.origin}/app/handoff`;
      windowRef.open(url, "_blank", "noopener,noreferrer");
      setStatus("宸叉墦寮€宸ヤ綔鍙颁氦浠樻澘", "ok");
    });
  });
}
