import {
  buildGraphPanelVisualMapProps,
  renderGraphPanelFocusedToolbar
} from "./graph-panel-visual-map-props.js";

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderGraphPanelForRuntime({
  summary = null,
  canvas = null,
  backButton = null,
  panelState = null
} = {}, deps = {}) {
  const {
    escapeHtml = defaultEscapeHtml,
    graphState = {},
    renderGraphErrorState = (error) => `<div class="graph-empty">${escapeHtml(error || "")}</div>`,
    renderGraphIsolatedQueue = () => "",
    renderGraphIsolatedQueueStrip = () => "",
    renderGraphBridgeGapSection = () => "",
    renderGraphWeakRelationClueSection = () => "",
    renderRelationReviewQueueSection = () => "",
    renderGraphAiAnalysisCard = () => "",
    renderGraphWorkbenchEntryPills = () => "",
    renderGraphWorkbenchPanel = () => "",
    renderGraphRelationTypeFilter = () => "",
    renderGraphInlineNotice = () => "",
    renderGraphVisualMap = () => ""
  } = deps;

  if (!summary || !canvas || !panelState) return false;
  summary.textContent = panelState.summaryText || "";

  if (panelState.kind === "loading") {
    canvas.innerHTML = `<div class="graph-empty">${escapeHtml(panelState.emptyMessage || "")}</div>`;
    return true;
  }
  if (panelState.kind === "error") {
    canvas.innerHTML = renderGraphErrorState(panelState.error);
    return true;
  }
  if (panelState.kind === "empty") {
    canvas.innerHTML = `<div class="graph-empty"></div>`;
    return true;
  }

  graphState.selection = panelState.normalizedSelection;
  if (backButton) backButton.classList.toggle("hidden", panelState.backButtonHidden !== false);

  const isolatedQueueMarkup = !panelState.showingFocusedNote
    ? renderGraphIsolatedQueue({
        isolatedNotes: panelState.isolatedNotes,
        nodeMap: panelState.graphRelationTargetNodeMap,
        edges: panelState.scopedNetworkEdges,
        currentNoteId: panelState.currentGraphQueueNoteId,
        limit: 6,
        queueItems: panelState.isolatedQueueItems
      })
    : "";
  const isolatedQueueStripMarkup = !panelState.showingFocusedNote
    ? renderGraphIsolatedQueueStrip({
        isolatedNotes: panelState.isolatedNotes,
        nodeMap: panelState.graphRelationTargetNodeMap,
        edges: panelState.scopedNetworkEdges,
        currentNoteId: panelState.currentGraphQueueNoteId,
        queueItems: panelState.isolatedQueueItems,
        collapsed: graphState.isolatedQueueStripCollapsed === true
      })
    : "";
  const supplementalSections = !panelState.showingFocusedNote
    ? `
      ${renderGraphBridgeGapSection(panelState.bridgeGaps, { open: panelState.sectionOpen["bridge-gaps"] === true })}
      ${renderGraphWeakRelationClueSection(panelState.edges, { open: panelState.sectionOpen["weak-relations"] === true })}
      ${renderRelationReviewQueueSection(panelState.scopedReviewQueue, { open: panelState.sectionOpen["review-queue"] === true })}
      ${renderGraphAiAnalysisCard({ open: panelState.sectionOpen["ai-analysis"] === true, nodes: panelState.scopedAllNodes, edges: panelState.scopedNetworkEdges })}
    `
    : "";
  const workbenchEntryMarkup = !panelState.showingFocusedNote
    ? renderGraphWorkbenchEntryPills({
        clueSummary: panelState.clueSummary,
        questionSummary: panelState.questionSpotSummary
      })
    : "";
  const workbenchPanelMarkup = !panelState.showingFocusedNote
    ? renderGraphWorkbenchPanel({
        clueSummary: panelState.clueSummary,
        questionSummary: panelState.questionSpotSummary,
        clueSectionsMarkup: supplementalSections,
        thinkingItems: panelState.thinkingItems,
        isolatedQueueMarkup
      })
    : "";
  const toolbarMarkup = renderGraphPanelFocusedToolbar(panelState, { renderGraphRelationTypeFilter });
  const noticeMarkup = (panelState.notices || []).map((notice) => renderGraphInlineNotice(notice)).join("");
  canvas.innerHTML = `
    ${noticeMarkup}
    ${renderGraphVisualMap(buildGraphPanelVisualMapProps(panelState, {
      workbenchPanelMarkup,
      workbenchEntryMarkup,
      isolatedQueueStripMarkup,
      toolbarMarkup
    }))}
  `;
  return true;
}
