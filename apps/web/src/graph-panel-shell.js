export function renderGraphPanelShell({
  appState = {},
  graphState = {},
  dom = {},
  folder = null,
  scopeDirectoryId = "",
  canReuseScopedGraph = false
} = {}, deps = {}) {
  const {
    syncGraphDisclosureState = () => {},
    syncAllNoteRelationNetworkStatuses = () => {},
    buildGraphPanelState = () => null,
    renderGraphPanelForRuntime = () => false,
    stateBuilderDeps = {},
    rendererDeps = {}
  } = deps;
  const { summary = null, canvas = null, backButton = null } = dom;
  if (!summary || !canvas) return false;

  syncGraphDisclosureState(canvas);
  const panelState = buildGraphPanelState({
    appState,
    graphState,
    folder,
    scopeDirectoryId,
    canReuseScopedGraph
  }, stateBuilderDeps);

  appState.graphConnectivityReady = panelState?.connectivityReady === true;
  appState.graphConnectedNoteIds = panelState?.connectedNoteIds || new Set();
  appState.graphVisibleNoteIds = panelState?.visibleNoteIds || new Set();
  appState.graphVisibleNoteIdsReady = panelState?.visibleNoteIdsReady !== false;
  syncAllNoteRelationNetworkStatuses({
    connectivityReady: appState.graphConnectivityReady,
    connectedIds: appState.graphConnectivityReady ? appState.graphConnectedNoteIds : null
  });

  return renderGraphPanelForRuntime({ summary, canvas, backButton, panelState }, {
    graphState,
    ...rendererDeps
  });
}
