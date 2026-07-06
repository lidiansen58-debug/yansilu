export function createExplorerPaneHostDeps(deps = {}) {
  const {
    $ = () => null,
    state = {},
    contextMenu = null,
    createBoxDialog = null,
    desktopCommands = {},
    openNoteById = () => {},
    setStatus = () => {},
    handleStateChange = () => {},
    selectPermanentDirectory = async () => "",
    selectNoteMoveDirectory = async () => "",
    requestTextInput = async () => "",
    resolveNotePath = () => ""
  } = deps;

  return {
    state,
    elements: {
      searchInput: $("searchInput"),
      searchBar: $("searchBar"),
      toggleSearchBtn: $("btnToggleSearch"),
      openNewBoxBtn: $("btnOpenNewBoxDialog"),
      newNoteBtn: $("btnNewNote"),
      listArea: $("listArea")
    },
    contextMenu,
    createBoxDialog,
    onOpenNote: openNoteById,
    onStatus: setStatus,
    onStateChange: handleStateChange,
    pickDirectory: desktopCommands.browseDirectory,
    selectPermanentDirectory,
    selectNoteMoveDirectory,
    requestTextInput,
    desktopFile: {
      revealPath: desktopCommands.revealInFileManager,
      openPath: desktopCommands.openDirectory
    },
    resolveNotePath
  };
}
