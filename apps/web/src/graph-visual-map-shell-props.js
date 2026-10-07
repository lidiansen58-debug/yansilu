export function graphSelectionUsesOverlay(selectionKind = "", selectionNodeNeedsRelationWorkflow = false) {
  return (
    selectionKind === "isolated" ||
    selectionKind === "isolatedComplete" ||
    selectionNodeNeedsRelationWorkflow === true
  );
}

export function buildGraphVisualMapShellProps({
  runtimeState = {},
  filterActive = false,
  toolbarMarkup = "",
  headContentMarkup = "",
  legendMarkup = "",
  workbenchPanelMarkup = "",
  workbenchEntryMarkup = "",
  focusContextMarkup = "",
  selectionContextMarkup = "",
  researchNavigatorMarkup = "",
  researchNavigatorEntryMarkup = "",
  zoomStepperMarkup = "",
  svgDefsMarkup = "",
  nebulaMarkup = "",
  clusterGlowMarkup = "",
  starfieldMarkup = "",
  themeBoundaryMarkup = "",
  edgeMarkup = "",
  nodeMarkup = "",
  emptyStateMarkup = ""
} = {}) {
  const {
    expanded = false,
    readingLens = { key: "" },
    readingLensState = { active: false },
    activeSelection = null,
    selectionNodeNeedsRelationWorkflow = false,
    researchNavigatorCanOpen = false,
    researchNavigatorOpen = false,
    layout = { nodes: [], width: 0, height: 0 },
    zoom = { key: "fit" },
    zoomWidth = 0,
    zoomHeight = 0,
    canvasHelpHintVisible = false
  } = runtimeState;

  const smallGraph = Boolean(layout.smallGraph && !runtimeState.denseGalaxyMode && layout.nodes?.length);
  let viewBox = `0 0 ${layout.width} ${layout.height}`;
  if (smallGraph && zoom.key === "fit") {
    const xs = layout.nodes.map(node => node.x), ys = layout.nodes.map(node => node.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const width = Math.max(480, maxX - minX + 280), height = Math.max(440, maxY - minY + 180);
    viewBox = `${(minX + maxX - width) / 2} ${(minY + maxY - height) / 2} ${width} ${height}`;
  }

  const selectionKind = activeSelection?.kind || "";
  const selectionOverlayMarkup = graphSelectionUsesOverlay(selectionKind, selectionNodeNeedsRelationWorkflow)
    ? selectionContextMarkup
    : "";
  const sideSelectionContextMarkup = selectionOverlayMarkup ? "" : selectionContextMarkup;
  const navigatorOpen = (researchNavigatorOpen === true || researchNavigatorCanOpen === true) && !selectionContextMarkup;
  const visibleResearchNavigatorMarkup = navigatorOpen ? researchNavigatorMarkup : "";
  const readingLensTrailingMarkup = "";
  const sidePanelParts = [
    !filterActive ? workbenchPanelMarkup : "",
    sideSelectionContextMarkup || focusContextMarkup || visibleResearchNavigatorMarkup
  ].filter(Boolean);

  return {
    expanded,
    smallGraph,
    viewBox,
    readingLensActive: !filterActive && readingLensState.active,
    readingLensKey: readingLens.key,
    selectionKind,
    toolbarMarkup,
    headContentMarkup,
    legendMarkup,
    hasNodes: Array.isArray(layout.nodes) && layout.nodes.length > 0,
    canvasHelpHintVisible,
    sidePanelMarkup: sidePanelParts.length ? `<div class="graph-side-stack">${sidePanelParts.join("")}</div>` : "",
    selectionOverlayMarkup,
    zoomKey: zoom.key,
    zoomWidth,
    zoomHeight,
    layoutWidth: layout.width,
    layoutHeight: layout.height,
    zoomStepperMarkup,
    svgDefsMarkup,
    nebulaMarkup,
    clusterGlowMarkup,
    starfieldMarkup,
    themeBoundaryMarkup,
    edgeMarkup,
    nodeMarkup,
    emptyStateMarkup,
    readingLensTrailingMarkup,
    researchNavigatorOpen: navigatorOpen
  };
}
