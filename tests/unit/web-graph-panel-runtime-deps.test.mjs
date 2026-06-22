import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphPanelRuntimeDeps
} from "../../apps/web/src/graph-panel-runtime-deps.js";

test("graph panel runtime deps groups shell, state builder, and renderer deps", () => {
  const marker = (name) => Object.assign(() => name, { marker: name });
  const deps = {
    syncGraphDisclosureState: marker("sync-disclosure"),
    syncAllNoteRelationNetworkStatuses: marker("sync-status"),
    buildGraphPanelState: marker("build-state"),
    renderGraphPanelForRuntime: marker("render-panel"),
    graphRelationStatusCountsAsNetworkEdge: marker("status-edge"),
    graphScopedItems: marker("scoped-items"),
    normalizeGraphRelationTypeFilter: marker("normalize-filter"),
    graphEdgeMatchesFilters: marker("edge-filter"),
    graphFocusedItems: marker("focused-items"),
    graphNodeIdsInScope: marker("node-ids"),
    graphRelationTouchesNodeScope: marker("touches-scope"),
    graphRelationInNodeScope: marker("in-scope"),
    graphRelationVisual: marker("relation-visual"),
    graphMergeRelationsByKey: marker("merge-relations"),
    graphConflictItemInNodeScope: marker("conflict-scope"),
    graphReviewQueueInNodeScope: marker("review-scope"),
    graphBridgeGapInNodeScope: marker("bridge-scope"),
    graphHasMeaningfulStructureEdges: marker("has-structure"),
    graphStructureFallbackEdges: marker("fallback-edges"),
    graphComputedIsolatedNotes: marker("isolated-notes"),
    graphMarkIsolatedNodes: marker("mark-isolated"),
    graphBuildIsolatedVisualNodes: marker("isolated-visual"),
    graphBuildFocusedRelationTypeStats: marker("focused-stats"),
    normalizeGraphSelectionForVisibleItems: marker("normalize-selection"),
    formatClockTime: marker("clock"),
    graphPotentialRelationNodeMap: marker("potential-map"),
    graphWeakRelationClues: marker("weak-clues"),
    graphClueSummaryState: marker("clue-summary"),
    buildGraphThinkingItems: marker("thinking-items"),
    buildGraphQuestionSpotSummaryFromItems: marker("question-summary"),
    graphIsolatedQueueItems: marker("queue-items"),
    escapeHtml: marker("escape"),
    renderGraphErrorState: marker("error"),
    renderGraphIsolatedQueue: marker("queue"),
    renderGraphIsolatedQueueStrip: marker("queue-strip"),
    renderGraphBridgeGapSection: marker("bridge-section"),
    renderGraphWeakRelationClueSection: marker("weak-section"),
    renderRelationReviewQueueSection: marker("review-section"),
    renderGraphAiAnalysisCard: marker("ai-card"),
    renderGraphWorkbenchEntryPills: marker("entry-pills"),
    renderGraphWorkbenchPanel: marker("workbench"),
    renderGraphRelationTypeFilter: marker("type-filter"),
    renderGraphInlineNotice: marker("notice"),
    renderGraphVisualMap: marker("visual-map")
  };

  const runtimeDeps = buildGraphPanelRuntimeDeps(deps);

  assert.equal(runtimeDeps.syncGraphDisclosureState, deps.syncGraphDisclosureState);
  assert.equal(runtimeDeps.syncAllNoteRelationNetworkStatuses, deps.syncAllNoteRelationNetworkStatuses);
  assert.equal(runtimeDeps.buildGraphPanelState, deps.buildGraphPanelState);
  assert.equal(runtimeDeps.renderGraphPanelForRuntime, deps.renderGraphPanelForRuntime);
  assert.equal(runtimeDeps.stateBuilderDeps.graphScopedItems, deps.graphScopedItems);
  assert.equal(runtimeDeps.stateBuilderDeps.graphComputedIsolatedNotes, deps.graphComputedIsolatedNotes);
  assert.equal(runtimeDeps.stateBuilderDeps.graphIsolatedQueueItems, deps.graphIsolatedQueueItems);
  assert.equal(runtimeDeps.rendererDeps.renderGraphErrorState, deps.renderGraphErrorState);
  assert.equal(runtimeDeps.rendererDeps.renderGraphWorkbenchPanel, deps.renderGraphWorkbenchPanel);
  assert.equal(runtimeDeps.rendererDeps.renderGraphVisualMap, deps.renderGraphVisualMap);
  assert.equal("renderGraphVisualMap" in runtimeDeps.stateBuilderDeps, false);
  assert.equal("graphScopedItems" in runtimeDeps.rendererDeps, false);
});
