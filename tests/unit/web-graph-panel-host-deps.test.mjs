import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphPanelPrototypeHostDeps,
  createGraphPanelPrototypeRuntimeDepsProvider
} from "../../apps/web/src/graph-panel-host-deps.js";

test("graph panel prototype host deps keeps shell-owned helpers in one mapping", () => {
  const host = {};
  const keys = [
    "syncGraphDisclosureState",
    "syncAllNoteRelationNetworkStatuses",
    "buildGraphPanelState",
    "renderGraphPanelForRuntime",
    "graphRelationStatusCountsAsNetworkEdge",
    "graphScopedItems",
    "normalizeGraphRelationTypeFilter",
    "graphEdgeMatchesFilters",
    "graphFocusedItems",
    "graphNodeIdsInScope",
    "graphRelationTouchesNodeScope",
    "graphRelationInNodeScope",
    "graphRelationVisual",
    "graphMergeRelationsByKey",
    "graphConflictItemInNodeScope",
    "graphReviewQueueInNodeScope",
    "graphBridgeGapInNodeScope",
    "graphHasMeaningfulStructureEdges",
    "graphStructureFallbackEdges",
    "graphComputedIsolatedNotes",
    "graphMarkIsolatedNodes",
    "graphBuildIsolatedVisualNodes",
    "graphBuildFocusedRelationTypeStats",
    "normalizeGraphSelectionForVisibleItems",
    "formatClockTime",
    "graphPotentialRelationNodeMap",
    "graphWeakRelationClues",
    "graphClueSummaryState",
    "buildGraphThinkingItems",
    "buildGraphQuestionSpotSummaryFromItems",
    "graphIsolatedQueueItems",
    "escapeHtml",
    "renderGraphErrorState",
    "renderGraphIsolatedQueue",
    "renderGraphIsolatedQueueStrip",
    "renderGraphBridgeGapSection",
    "renderGraphWeakRelationClueSection",
    "renderRelationReviewQueueSection",
    "renderGraphAiAnalysisCard",
    "renderGraphWorkbenchEntryPills",
    "renderGraphWorkbenchPanel",
    "renderGraphRelationTypeFilter",
    "renderGraphInlineNotice",
    "renderGraphVisualMap"
  ];
  for (const key of keys) host[key] = { key };

  const deps = buildGraphPanelPrototypeHostDeps(host);

  assert.notEqual(deps, host);
  assert.deepEqual(Object.keys(deps), keys);
  for (const key of keys) {
    assert.equal(deps[key], host[key]);
  }
});

test("graph panel runtime deps provider reads current prototype host deps", () => {
  const marker = (name) => Object.assign(() => name, { marker: name });
  let scopedItems = marker("scoped-a");
  const provider = createGraphPanelPrototypeRuntimeDepsProvider(() => ({
    syncGraphDisclosureState: marker("sync-disclosure"),
    syncAllNoteRelationNetworkStatuses: marker("sync-status"),
    buildGraphPanelState: marker("build-state"),
    renderGraphPanelForRuntime: marker("render-panel"),
    graphScopedItems: scopedItems,
    renderGraphVisualMap: marker("visual-map")
  }));

  const first = provider();
  scopedItems = marker("scoped-b");
  const second = provider();

  assert.notEqual(first, second);
  assert.equal(first.stateBuilderDeps.graphScopedItems.marker, "scoped-a");
  assert.equal(second.stateBuilderDeps.graphScopedItems.marker, "scoped-b");
  assert.equal(first.rendererDeps.renderGraphVisualMap.marker, "visual-map");
  assert.equal(typeof second.rendererDeps.renderGraphVisualMap, "function");
});
