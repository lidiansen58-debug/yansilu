import test from "node:test";
import assert from "node:assert/strict";

import {
  createGraphEdgeSelectionRuntimeDeps,
  createGraphNodeSelectionRuntimeDeps,
  createGraphSelectionDispatcherRuntime
} from "../../apps/web/src/graph-selection-host-deps.js";

function marker(name) {
  return Object.assign(() => name, { marker: name });
}

test("graph selection host deps builds dispatcher runtime from prototype renderers", () => {
  const host = {
    renderGraphClusterSelectionPanel: marker("cluster"),
    renderGraphThemeSelectionPanel: marker("theme"),
    renderGraphIsolatedSelectionPanel: marker("isolated"),
    renderGraphIsolatedCompletePanel: marker("isolated-complete"),
    renderGraphBridgeSelectionPanel: marker("bridge"),
    renderGraphNodeSelectionPanel: marker("node"),
    renderGraphEdgeSelectionPanel: marker("edge"),
    normalizeGraphSelectionForVisibleItems: marker("normalize")
  };

  const runtime = createGraphSelectionDispatcherRuntime(host);

  assert.equal(runtime.renderers.renderClusterPanel, host.renderGraphClusterSelectionPanel);
  assert.equal("renderRelationFormPanel" in runtime.renderers, false);
  assert.equal(runtime.renderers.renderNodePanel, host.renderGraphNodeSelectionPanel);
  assert.equal(runtime.renderers.renderEdgePanel, host.renderGraphEdgeSelectionPanel);
  assert.equal(runtime.deps.normalizeSelection, host.normalizeGraphSelectionForVisibleItems);
});

test("graph selection host deps derives node and edge runtime state from graphState", () => {
  const graphState = {
    aiAnalysisLoading: true,
    focusContextMode: "reading",
    relationAdjustmentFocusById: { r1: "strengthen" }
  };
  const host = {
    escapeHtml: marker("escape"),
    graphRelationStatusCountsAsNetworkEdge: marker("status"),
    graphNodeNeedsRelationWorkflow: marker("needs"),
    renderGraphIsolatedSelectionPanel: marker("isolated"),
    graphRelationGroupCounts: marker("counts"),
    graphNodeRoleMeta: marker("role"),
    graphNodeInsightMeta: marker("insight"),
    renderGraphNodeInsightPanel: marker("insight-panel"),
    renderGraphRelationWorkspaceForNote: marker("workspace"),
    renderGraphAiConnectCandidates: marker("candidates"),
    graphThemeCandidateNoteIdsForNode: marker("theme-notes"),
    suggestedThemeIndexTitle: marker("theme-title"),
    renderGraphSelectionMetrics: marker("metrics"),
    renderGraphPromptDetails: marker("prompts"),
    renderGraphSelectionShell: marker("shell"),
    noteTypeLabel: marker("note-type"),
    graphEdgeSelectionKey: marker("edge-key"),
    graphNodeTitle: marker("title"),
    graphRelationTypeLabel: marker("type-label"),
    graphRelationGroupMeta: marker("group"),
    graphEdgeReviewMeta: marker("review"),
    graphEdgeAdjustmentPlan: marker("adjustment"),
    graphFocusCardActionMeta: marker("action"),
    graphRelationSourceLabel: marker("source"),
    graphRelationStatusLabel: marker("status-label"),
    graphState
  };

  const nodeDeps = createGraphNodeSelectionRuntimeDeps(host);
  const edgeDeps = createGraphEdgeSelectionRuntimeDeps(host);

  assert.equal(nodeDeps.aiAnalysisLoading, true);
  assert.equal(nodeDeps.renderGraphRelationWorkspaceForNote, host.renderGraphRelationWorkspaceForNote);
  assert.equal(edgeDeps.focusContextMode, "reading");
  assert.equal(edgeDeps.relationAdjustmentFocusById, graphState.relationAdjustmentFocusById);
  assert.equal(edgeDeps.graphEdgeSelectionKey, host.graphEdgeSelectionKey);
});
