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
    zoomHeight = 0
  } = runtimeState;

  const selectionKind = activeSelection?.kind || "";
  const selectionOverlayMarkup = graphSelectionUsesOverlay(selectionKind, selectionNodeNeedsRelationWorkflow)
    ? selectionContextMarkup
    : "";
  const sideSelectionContextMarkup = selectionOverlayMarkup ? "" : selectionContextMarkup;
  const navigatorOpen = (researchNavigatorOpen === true || researchNavigatorCanOpen === true) && !selectionContextMarkup;
  const visibleResearchNavigatorMarkup = navigatorOpen ? researchNavigatorMarkup : "";
  const visibleResearchNavigatorEntryMarkup = !filterActive && !selectionContextMarkup ? researchNavigatorEntryMarkup : "";
  const readingLensTrailingMarkup = `${workbenchEntryMarkup}${visibleResearchNavigatorEntryMarkup}`;
  const sidePanelParts = [
    !filterActive ? workbenchPanelMarkup : "",
    sideSelectionContextMarkup || focusContextMarkup || visibleResearchNavigatorMarkup
  ].filter(Boolean);

  return {
    expanded,
    readingLensActive: !filterActive && readingLensState.active,
    readingLensKey: readingLens.key,
    selectionKind,
    toolbarMarkup,
    headContentMarkup,
    legendMarkup,
    hasNodes: Array.isArray(layout.nodes) && layout.nodes.length > 0,
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
