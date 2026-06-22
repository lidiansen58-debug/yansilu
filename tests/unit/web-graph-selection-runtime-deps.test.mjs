import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphEdgeSelectionRuntimeDeps,
  buildGraphNodeSelectionRuntimeDeps,
  buildGraphSelectionDispatcherDeps
} from "../../apps/web/src/graph-selection-runtime-deps.js";

function marker(name) {
  return Object.assign(() => name, { marker: name });
}

test("graph selection dispatcher deps groups panel renderers and normalization", () => {
  const host = {
    renderGraphClusterSelectionPanel: marker("cluster"),
    renderGraphThemeSelectionPanel: marker("theme"),
    renderGraphIsolatedSelectionPanel: marker("isolated"),
    renderGraphIsolatedCompletePanel: marker("isolated-complete"),
    renderGraphRelationFormSelectionPanel: marker("relation-form"),
    renderGraphBridgeSelectionPanel: marker("bridge"),
    renderGraphNodeSelectionPanel: marker("node"),
    renderGraphEdgeSelectionPanel: marker("edge"),
    normalizeGraphSelectionForVisibleItems: marker("normalize")
  };

  const runtime = buildGraphSelectionDispatcherDeps(host);

  assert.equal(runtime.renderers.renderClusterPanel, host.renderGraphClusterSelectionPanel);
  assert.equal(runtime.renderers.renderThemePanel, host.renderGraphThemeSelectionPanel);
  assert.equal(runtime.renderers.renderIsolatedPanel, host.renderGraphIsolatedSelectionPanel);
  assert.equal(runtime.renderers.renderIsolatedCompletePanel, host.renderGraphIsolatedCompletePanel);
  assert.equal(runtime.renderers.renderRelationFormPanel, host.renderGraphRelationFormSelectionPanel);
  assert.equal(runtime.renderers.renderBridgePanel, host.renderGraphBridgeSelectionPanel);
  assert.equal(runtime.renderers.renderNodePanel, host.renderGraphNodeSelectionPanel);
  assert.equal(runtime.renderers.renderEdgePanel, host.renderGraphEdgeSelectionPanel);
  assert.equal(runtime.deps.normalizeSelection, host.normalizeGraphSelectionForVisibleItems);
});

test("graph node selection runtime deps keeps node panel helpers together", () => {
  const host = {
    escapeHtml: marker("escape"),
    graphRelationStatusCountsAsNetworkEdge: marker("status"),
    graphNodeNeedsRelationWorkflow: marker("needs-workflow"),
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
    aiAnalysisLoading: true
  };

  const deps = buildGraphNodeSelectionRuntimeDeps(host);

  for (const key of Object.keys(host)) {
    assert.equal(deps[key], host[key]);
  }
});

test("graph edge selection runtime deps keeps edge panel helpers together", () => {
  const host = {
    escapeHtml: marker("escape"),
    graphEdgeSelectionKey: marker("edge-key"),
    graphNodeTitle: marker("title"),
    graphRelationTypeLabel: marker("type-label"),
    graphRelationGroupMeta: marker("group"),
    graphEdgeReviewMeta: marker("review"),
    graphEdgeAdjustmentPlan: marker("adjustment"),
    graphFocusCardActionMeta: marker("action"),
    graphRelationSourceLabel: marker("source"),
    graphRelationStatusLabel: marker("status-label"),
    renderGraphSelectionMetrics: marker("metrics"),
    renderGraphPromptDetails: marker("prompts"),
    renderGraphSelectionShell: marker("shell"),
    focusContextMode: "reading",
    relationAdjustmentFocusById: { relation1: "strengthen" }
  };

  const deps = buildGraphEdgeSelectionRuntimeDeps(host);

  for (const key of Object.keys(host)) {
    assert.equal(deps[key], host[key]);
  }
});
