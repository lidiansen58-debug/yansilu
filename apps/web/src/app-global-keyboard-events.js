export function installAppGlobalKeyboardEvents(deps = {}) {
  const {
    documentRef = globalThis.document,
    state = {},
    explorer = {},
    editor = {},
    handleSystemMessageEscapeKey = () => ({ handled: false }),
    systemMessageEventDeps = () => ({}),
    noteDeleteKeyRoute = () => ({ handled: false }),
    syncExplorerContextToActiveTab = () => {},
    folderById = () => null,
    childFolders = () => [],
    notesInFolder = () => [],
    openNoteById = () => {},
    renderAll = () => {},
    setStatus = () => {}
  } = deps;

  documentRef?.addEventListener?.("keydown", (event) => {
    if (handleSystemMessageEscapeKey(event, systemMessageEventDeps()).handled) return;

    const tag = (event.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || event.target?.isContentEditable || event.isComposing) return;

    if (event.key === "F2") {
      if (state.selectedFileId) {
        explorer.handleContextAction?.("rename", { kind: "file", id: state.selectedFileId });
        renderAll();
        event.preventDefault();
        return;
      }
      if (state.selectedFolderId) {
        explorer.handleContextAction?.("rename", { kind: "folder", id: state.selectedFolderId });
        renderAll();
        event.preventDefault();
        return;
      }
    }

    if (event.key === "Delete" && !event.ctrlKey && !event.altKey && !event.metaKey && state.module === "explorer") {
      const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
      const route = noteDeleteKeyRoute({
        module: state.module,
        selectedFileId: state.selectedFileId,
        activeTabNoteId: activeTab?.noteId
      });
      const noteId = route.handled ? route.noteId : "";
      if (noteId && state.notes.some((note) => note.id === noteId)) {
        void explorer.handleContextAction?.("delete", { kind: "file", id: noteId });
        event.preventDefault();
        return;
      }
    }

    if (event.ctrlKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const index = state.tabs.findIndex((tab) => tab.id === state.activeTabId);
      if (index >= 0 && state.tabs.length > 1) {
        const next = event.key === "ArrowLeft" ? (index - 1 + state.tabs.length) % state.tabs.length : (index + 1) % state.tabs.length;
        state.activeTabId = state.tabs[next].id;
        editor.fillEditorFromTab?.();
        syncExplorerContextToActiveTab();
        renderAll();
        event.preventDefault();
      }
      return;
    }

    if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      if (event.key === "ArrowLeft") {
        const currentFolder = folderById(state, state.selectedFolderId);
        if (currentFolder?.parentId) {
          state.selectedFolderId = currentFolder.parentId;
          setStatus("宸插畾浣嶅埌涓婄骇鐩綍", "ok");
        } else {
          setStatus("褰撳墠宸插湪椤跺眰鐩綍", "warn");
        }
      } else {
        const children = childFolders(state, state.selectedFolderId);
        if (children.length) {
          state.selectedFolderId = children[0].id;
          setStatus("宸茶繘鍏ュ瓙鐩綍", "ok");
        } else {
          const files = notesInFolder(state, state.selectedFolderId);
          if (files.length) {
            openNoteById(files[0].id);
            setStatus("宸叉墦寮€褰撳墠鐩綍棣栦釜鏂囦欢", "ok");
          } else {
            setStatus("褰撳墠鐩綍鏃犳枃浠?", "warn");
          }
        }
      }
      renderAll();
      event.preventDefault();
    }
  });
}
