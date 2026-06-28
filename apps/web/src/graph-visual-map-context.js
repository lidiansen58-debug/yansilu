import { buildGraphVisualMapShellProps } from "./graph-visual-map-shell-props.js";
import { buildGraphVisualMapBackdropMarkup } from "./graph-visual-map-backdrop.js";
import { buildGraphVisualMapPanelMarkup } from "./graph-visual-map-panels.js";

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
    layout = { nodes: [], edges: [], width: 0, height: 0, nodeMap: new Map(), clusterMeta: [] },
    compactRelationFilterStats = null,
  } = runtimeState;

  const compactRelationFilterMarkup = !filterActive
    ? renderGraphRelationTypeFilter(relationFilterEdges, relationType, true, compactRelationFilterStats)
    : "";
  const {
    themeBoundaryMarkup,
    starfieldMarkup,
    nebulaMarkup,
    clusterGlowMarkup
  } = buildGraphVisualMapBackdropMarkup({
    runtimeState,
    graphState,
    relationType
  }, {
    graphThemeBoundaryMeta,
    renderGraphThemeBoundary,
    renderGraphStarfield,
    renderGraphNebulaField,
    renderGraphClusterGlow
  });
  const {
    focusContextMarkup,
    selectionContextMarkup,
    researchNavigatorMarkup,
    researchNavigatorEntryMarkup
  } = buildGraphVisualMapPanelMarkup({
    runtimeState,
    questionSpotSummary,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clueSummary,
    edges
  }, {
    renderGraphFocusContextPanel,
    renderGraphSelectionPanel,
    renderGraphResearchNavigatorPanel,
    renderGraphResearchNavigatorEntry
  });
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
