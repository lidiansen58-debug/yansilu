import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphPanelRendererDeps
} from "../../apps/web/src/graph-panel-renderer-deps.js";
import {
  buildGraphPanelStateBuilderDeps
} from "../../apps/web/src/graph-panel-state-builder-deps.js";

test("graph panel state builder deps keeps graph derivation helpers separate from render helpers", () => {
  const marker = (name) => Object.assign(() => name, { marker: name });
  const deps = {
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
    renderGraphVisualMap: marker("visual-map")
  };

  const grouped = buildGraphPanelStateBuilderDeps(deps);

  assert.equal(grouped.graphScopedItems, deps.graphScopedItems);
  assert.equal(grouped.graphComputedIsolatedNotes, deps.graphComputedIsolatedNotes);
  assert.equal(grouped.graphIsolatedQueueItems, deps.graphIsolatedQueueItems);
  assert.equal(grouped.buildGraphQuestionSpotSummaryFromItems, deps.buildGraphQuestionSpotSummaryFromItems);
  assert.equal("renderGraphVisualMap" in grouped, false);
});

test("graph panel renderer deps keeps view helpers separate from graph derivation helpers", () => {
  const marker = (name) => Object.assign(() => name, { marker: name });
  const deps = {
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
    renderGraphVisualMap: marker("visual-map"),
    graphScopedItems: marker("scoped-items")
  };

  const grouped = buildGraphPanelRendererDeps(deps);

  assert.equal(grouped.escapeHtml, deps.escapeHtml);
  assert.equal(grouped.renderGraphWorkbenchPanel, deps.renderGraphWorkbenchPanel);
  assert.equal(grouped.renderGraphVisualMap, deps.renderGraphVisualMap);
  assert.equal(grouped.renderGraphRelationTypeFilter, deps.renderGraphRelationTypeFilter);
  assert.equal("graphScopedItems" in grouped, false);
});
