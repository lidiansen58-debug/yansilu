import { buildGraphVisualMapShellProps } from "./graph-visual-map-shell-props.js";

export function buildGraphVisualMapContextMarkup({
  runtimeState = {},
  filterActive = false,
  relationType = "meaningful",
  relationFilterEdges = [],
  questionSpotSummary = null,
  topicCandidates = [],
  isolatedNotes = [],
  bridgeGaps = [],
  clueSummary = null,
  workbenchPanelMarkup = "",
  workbenchEntryMarkup = "",
  isolatedQueueStripMarkup = "",
  structureFallback = false,
  edges = []
} = {}, deps = {}) {
  const {
    graphState = {},
    renderGraphRelationTypeFilter = () => "",
    graphThemeBoundaryMeta = () => null,
    renderGraphThemeBoundary = () => "",
    renderGraphStarfield = () => "",
    renderGraphNebulaField = () => "",
    renderGraphClusterGlow = () => "",
    renderGraphFocusContextPanel = () => "",
    renderGraphSelectionPanel = () => "",
    renderGraphResearchNavigatorPanel = () => "",
    renderGraphResearchNavigatorEntry = () => ""
  } = deps;
  const {
    normalizedFocusedNoteId = "",
    layout = { nodes: [], edges: [], width: 0, height: 0, nodeMap: new Map(), clusterMeta: [] },
    zoom = { key: "fit" },
    compactRelationFilterStats = null,
    activeSelection = null,
    contextualSelectionEdges = [],
    contextualNodeMap = new Map(),
    focusContextAvailable = false,
    focusContextCollapsed = false,
    researchNavigatorCanOpen = false
  } = runtimeState;

  const compactRelationFilterMarkup = !filterActive
    ? renderGraphRelationTypeFilter(relationFilterEdges, relationType, true, compactRelationFilterStats)
    : "";
  const themeBoundaryMarkup = renderGraphThemeBoundary(
    activeSelection?.kind === "theme"
      ? graphThemeBoundaryMeta({
          nodes: layout.nodes,
          noteIds: activeSelection.noteIds,
          title: activeSelection.title,
          layoutWidth: layout.width,
          layoutHeight: layout.height
        })
      : null
  );
  const visualSeed = `${graphState.lastLoadedAt}:${relationType}:${zoom.key}`;
  const starfieldMarkup = renderGraphStarfield(layout.width, layout.height, visualSeed);
  const nebulaMarkup = renderGraphNebulaField(layout.width, layout.height, visualSeed);
  const clusterGlowMarkup = renderGraphClusterGlow(layout.clusterMeta);
  const focusContextMarkup = focusContextAvailable && !focusContextCollapsed
    ? renderGraphFocusContextPanel({
        focusedNoteId: normalizedFocusedNoteId,
        nodeMap: layout.nodeMap,
        edges
    })
    : "";
  const selectionContextMarkup = renderGraphSelectionPanel({
    selection: activeSelection,
    nodeMap: contextualNodeMap,
    edges: contextualSelectionEdges,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clusterMeta: layout.clusterMeta
  });
  const researchNavigatorMarkup = renderGraphResearchNavigatorPanel({
    nodes: layout.nodes,
    edges,
    topicCandidates,
    bridgeGaps,
    clusterMeta: layout.clusterMeta,
    clueSummary,
    questionSummary: questionSpotSummary
  });
  const researchNavigatorEntryMarkup = renderGraphResearchNavigatorEntry(researchNavigatorCanOpen && !selectionContextMarkup);
  const graphShellPreviewProps = buildGraphVisualMapShellProps({
    runtimeState,
    filterActive,
    workbenchPanelMarkup,
    workbenchEntryMarkup,
    focusContextMarkup,
    selectionContextMarkup,
    researchNavigatorMarkup,
    researchNavigatorEntryMarkup
  });

  return {
    compactRelationFilterMarkup,
    themeBoundaryMarkup,
    starfieldMarkup,
    nebulaMarkup,
    clusterGlowMarkup,
    focusContextMarkup,
    selectionContextMarkup,
    researchNavigatorMarkup,
    researchNavigatorEntryMarkup,
    isolatedQueueStripMarkup,
    structureFallback,
    graphShellPreviewProps
  };
}
