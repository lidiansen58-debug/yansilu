export function buildAppShellFileStateChangeDeps(host = {}) {
  const {
    deleteDirectory = async () => null,
    deleteNote = async () => null,
    descendantDirectoryIds = () => [],
    folderById = () => null,
    movedDirectoryFsPath = () => "",
    moveNote = async () => null,
    moveNoteInClientState = () => {},
    removeNoteFromClientState = () => {},
    renamedDirectoryFsPath = () => "",
    renderAll = () => {},
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
      usingLocalFallbackData,
      moveNote,
      moveNoteInClientState,
      setStatus,
      renderAll
    },
    noteDelete: {
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
