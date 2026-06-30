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
        setStatus("已停留在关系图谱", "ok");
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
      setStatus(`已切换到 ${displayFolderName(folderById(state, state.browserRootId))} 入口`, "ok");
      renderAll();
    });
  });

  documentRef?.querySelectorAll?.("[data-action='open-handoff']")?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = `${windowRef.location.origin}/app/handoff`;
      windowRef.open(url, "_blank", "noopener,noreferrer");
      setStatus("已打开工作台交付板", "ok");
    });
  });
}
