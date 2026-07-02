export function buildAppShellGraphStateChangeDeps(host = {}) {
  const {
    GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID = "",
    applyExplorerSelectionContext = () => {},
    expandGraphBrowserTree = () => {},
    explorer = null,
    graphAssociateNoteRoute = () => ({ kind: "" }),
    graphNodeNeedsRelationWorkflowFromCurrentGraph = () => false,
    graphRelationWorkflowController = null,
    graphState = {},
    handleStateChange = async () => false,
    openNoteRelationEditor = () => false,
    refreshDirectoryGraph = async () => false,
    renderAll = () => {},
    setGraphIsolatedWorkflowActiveTab = () => {},
    setStatus = () => {},
    state = {},
    syncNotesForDirectory = async () => {}
  } = host;

  return {
    refreshGraph: {
      graphState,
      refreshDirectoryGraph,
      setStatus
    },
    selectFolder: {
      state,
      explorer,
      applyExplorerSelectionContext,
      expandGraphBrowserTree,
      refreshDirectoryGraph,
      syncNotesForDirectory,
      setStatus,
      renderAll
    },
    graphFocusNote: {
      state,
      explorer,
      graphOriginalScopeDirectoryId: GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID,
      applyExplorerSelectionContext,
      setStatus,
      renderAll
    },
    graphAssociateNote: {
      state,
      graphState,
      explorer,
      graphOriginalScopeDirectoryId: GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID,
      graphRelationWorkflowController,
      graphAssociateNoteRoute,
      graphNodeNeedsRelationWorkflowFromCurrentGraph,
      applyExplorerSelectionContext,
      setGraphIsolatedWorkflowActiveTab,
      openGraphSelection: host.openGraphSelection || (() => {}),
      setStatus,
      handleStateChange
    },
    openNoteRelations: {
      openNoteRelationEditor,
      setStatus
    }
  };
}
