export function buildAppShellFileStateChangeDeps(host = {}) {
  const {
    deleteDirectory = async () => null,
    deleteNote = async () => null,
    getVaultPath = () => "",
    editor = null,
    descendantDirectoryIds = () => [],
    folderById = () => null,
    movedDirectoryFsPath = () => "",
    moveNote = async () => null,
    checkNoteMove = null,
    fetchNote = async () => null,
    moveNoteInClientState = () => {},
    removeNoteFromClientState = () => {},
    renamedDirectoryFsPath = () => "",
    renderAll = () => {},
    refreshDirectoryGraph = async () => {},
    rootBoxIdFromFolder = () => "",
    setStatus = () => {},
    state = {},
    syncDirectoriesFromApi = async () => {},
    syncLoadedNotesForDirectories = async () => {},
    updateDirectory = async () => null,
    usingLocalFallbackData = false
  } = host;

  return {
    noteMove: {
      editor,
      state,
      refreshDirectoryGraph,
      usingLocalFallbackData,
      moveNote,
      checkNoteMove,
      fetchNote,
      moveNoteInClientState,
      setStatus,
      renderAll
    },
    noteDelete: {
      state,
      getVaultPath,
      usingLocalFallbackData,
      deleteNote,
      removeNoteFromClientState,
      setStatus,
      renderAll
    },
    directoryUpdate: {
      state,
      descendantDirectoryIds,
      renamedDirectoryFsPath,
      rootBoxIdFromFolder,
      updateDirectory,
      syncDirectoriesFromApi,
      syncLoadedNotesForDirectories,
      setStatus,
      renderAll
    },
    directoryDelete: {
      state,
      getVaultPath,
      deleteDirectory,
      setStatus,
      renderAll
    },
    directoryMove: {
      state,
      descendantDirectoryIds,
      folderById,
      movedDirectoryFsPath,
      rootBoxIdFromFolder,
      updateDirectory,
      syncDirectoriesFromApi,
      syncLoadedNotesForDirectories,
      setStatus,
      renderAll
    }
  };
}
