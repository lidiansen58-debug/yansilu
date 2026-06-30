export function buildAppShellAiWritingStateChangeDeps(host = {}) {
  const {
    activateModule = () => {},
    addSystemMessage = () => {},
    aiInboxState = {},
    analyzePermanentNote = async () => null,
    continueWritingEntry = async () => false,
    continueWritingProjectEntry = async () => false,
    createWritingProjectFromCurrentBasket = async () => false,
    editor = null,
    ensureNoteBodyLoaded = async () => null,
    folderById = () => null,
    normalizeAiInboxFilters = (filters) => filters,
    normalizeWritingProjectTitleSeed = (value) => value,
    noteAnalysisSystemMessageForResult = () => null,
    noteMainPathWritingContinuationEntry = () => null,
    openAiInboxModule = async () => {},
    openNoteById = () => {},
    openSystemMessages = () => {},
    openWritingModule = async () => {},
    refreshDirectoryGraph = async () => false,
    rootBoxIdFromFolder = () => "",
    setStatus = () => {},
    state = {},
    syncNotesForDirectory = async () => {},
    windowRef = undefined,
    writingCenterContinuationFailureMessage = () => "",
    writingCenterContinuationStatusMessage = () => ""
  } = host;

  return {
    runNoteAiAnalysis: {
      state,
      aiInboxState,
      analyzePermanentNote,
      noteAnalysisSystemMessageForResult,
      addSystemMessage,
      normalizeAiInboxFilters,
      openSystemMessages,
      setStatus
    },
    openNoteAiInbox: {
      aiInboxState,
      normalizeAiInboxFilters,
      activateModule,
      openAiInboxModule,
      setStatus
    },
    openNoteMainRoute: {
      state,
      editor,
      windowRef,
      folderById,
      rootBoxIdFromFolder,
      syncNotesForDirectory,
      refreshDirectoryGraph,
      activateModule,
      openNoteById,
      ensureNoteBodyLoaded,
      openWritingModule,
      continueWritingEntry,
      normalizeWritingProjectTitleSeed,
      noteMainPathWritingContinuationEntry,
      continueWritingProjectEntry,
      createWritingProjectFromCurrentBasket,
      writingCenterContinuationStatusMessage,
      writingCenterContinuationFailureMessage,
      setStatus
    }
  };
}
