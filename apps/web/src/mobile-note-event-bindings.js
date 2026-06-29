export function installMobileNoteEventBindings(deps = {}) {
  const {
    $ = () => null,
    state = {},
    resolveExplorerNewNoteFolderId = () => "",
    folderById = () => null,
    rootBoxIdFromFolder = (_, folderId) => folderId,
    handleStateChange = () => {}
  } = deps;

  $("btnMobileNewNote")?.addEventListener("click", () => {
    const folderId = resolveExplorerNewNoteFolderId(state);
    if (folderById(state, folderId)) {
      state.selectedFolderId = folderId;
      state.browserRootId = rootBoxIdFromFolder(state, folderId);
      state.selectedFileId = null;
    }
    handleStateChange("create-note-in-selected-folder");
  });
}
