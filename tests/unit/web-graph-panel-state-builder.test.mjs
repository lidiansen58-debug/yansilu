import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGraphPanelState
} from "../../apps/web/src/graph-panel-state-builder.js";

test("graph panel state builder returns loading and error mount states without a graph", () => {
  const loading = buildGraphPanelState({
    graphState: { loading: true },
    folder: { name: "Permanent" },
    canReuseScopedGraph: false
  });
  assert.equal(loading.kind, "loading");
  assert.equal(loading.connectivityReady, false);
  assert.match(loading.summaryText, /Permanent/);
  assert.match(loading.emptyMessage, /永久笔记/);

  const error = buildGraphPanelState({
    graphState: { error: "Network failed" },
    canReuseScopedGraph: false
  });
  assert.equal(error.kind, "error");
  assert.equal(error.error, "Network failed");
  assert.equal(error.visibleNoteIdsReady, true);
});

test("graph panel state builder computes visible graph state for the mounted panel", () => {
  const nodes = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
    { id: "c", title: "C" }
  ];
  const edges = [
    { id: "e1", fromNoteId: "a", toNoteId: "b", relationType: "supports", status: "confirmed" },
    { id: "e2", fromNoteId: "b", toNoteId: "c", relationType: "associated_with", status: "suggested" }
  ];
  const graph = {
    nodes,
    edges,
    insights: {
      bridgeGaps: [{ noteId: "a", targetNoteId: "c" }],
      conflictingRelations: [{ id: "conflict", fromNoteId: "a", toNoteId: "b", relationType: "contradicts" }]
    }
  };
  const calls = [];
  const state = buildGraphPanelState({
    appState: { module: "graph", selectedFileId: "a" },
    graphState: {
      item: graph,
      filters: { relationType: "meaningful", status: "all" },
      selection: { kind: "node", nodeId: "a" },
      aiAnalysis: {
        analysis: {
          topicCandidates: [{ noteIds: ["a", "b", "c"] }],
          isolatedNotes: [{ noteId: "c" }]
        },
        reviewItems: { summary: { artifactCount: 2 } }
      },
      conflicts: { conflicts: [{ noteId: "a" }] },
      reviewQueue: { total: 1, items: [{ relationId: "e1" }] },
      lastLoadedAt: "2026-01-01T00:00:00.000Z",
      sectionOpen: {}
    },
    canReuseScopedGraph: true
  }, {
    graphRelationStatusCountsAsNetworkEdge: (status) => status === "confirmed",
    graphScopedItems: (item) => ({ nodes: item.nodes, allNodes: item.nodes, edges: item.edges }),
    normalizeGraphRelationTypeFilter: (value) => value,
    graphEdgeMatchesFilters: (edge) => edge.status !== "dismissed",
    graphFocusedItems: (scopedNodes, scopedEdges, allNodes) => ({ nodes: scopedNodes, edges: scopedEdges, allNodes, focused: false, focusedNoteId: "" }),
    graphNodeIdsInScope: (scopedNodes) => new Set(scopedNodes.map((node) => node.id)),
    graphRelationTouchesNodeScope: (edge, ids) => ids.has(edge.fromNoteId) || ids.has(edge.toNoteId),
    graphRelationInNodeScope: (edge, ids) => ids.has(edge.fromNoteId) || ids.has(edge.toNoteId),
    graphRelationVisual: (type) => ({ key: type === "contradicts" ? "conflict" : "support" }),
    graphMergeRelationsByKey: (a, b) => [...a, ...b],
    graphConflictItemInNodeScope: (item, ids) => ids.has(item.noteId),
    graphReviewQueueInNodeScope: (queue) => ({ ...queue, scoped: true }),
    graphBridgeGapInNodeScope: (gap, ids) => ids.has(gap.noteId),
    graphComputedIsolatedNotes: (_nodes, _edges, aiIsolatedNotes) => aiIsolatedNotes,
    graphMarkIsolatedNodes: (visibleNodes, isolatedNotes) => visibleNodes.map((node) => ({
      ...node,
      isolated: isolatedNotes.some((item) => item.noteId === node.id)
    })),
    graphBuildIsolatedVisualNodes: ({ isolatedNotes }) => isolatedNotes.map((item) => ({ id: `isolated:${item.noteId}`, sourceNoteId: item.noteId })),
    normalizeGraphSelectionForVisibleItems: (selection, context) => {
      calls.push(["normalize", context.nodes.length, context.isolatedNotes.length, context.bridgeGaps.length]);
      return { ...selection, normalized: true };
    },
    formatClockTime: () => "00:00",
    graphPotentialRelationNodeMap: () => new Map([["outside", { id: "outside" }]]),
    graphWeakRelationClues: () => [{ id: "weak" }],
    graphClueSummaryState: (input) => ({ bridgeGapCount: input.bridgeGapCount, weakRelationCount: input.weakRelationCount }),
    buildGraphThinkingItems: (input) => [{ count: input.isolatedNotes.length, hasLookup: input.nodeLookupMap.has("a") }],
    buildGraphQuestionSpotSummaryFromItems: (items, options) => ({ items: items.length, artifactCount: options.artifactCount }),
    graphIsolatedQueueItems: (input) => [{ currentNoteId: input.currentNoteId, total: input.isolatedNotes.length }]
  });

  assert.equal(state.kind, "ready");
  assert.equal(state.summaryText, "3 条永久笔记，2 条关系");
  assert.deepEqual([...state.connectedNoteIds].sort(), ["a", "b"]);
  assert.ok(state.visibleNoteIds.has("isolated:c"));
  assert.equal(state.edges.length, 2);
  assert.equal(state.isolatedNotes[0].noteId, "c");
  assert.equal(state.normalizedSelection.normalized, true);
  assert.deepEqual(calls[0], ["normalize", 4, 1, 1]);
  assert.equal(state.backButtonHidden, false);
  assert.equal(state.scopedReviewQueue.scoped, true);
  assert.equal(state.clueSummary.weakRelationCount, 1);
  assert.equal(state.questionSpotSummary.artifactCount, 2);
  assert.deepEqual(state.isolatedQueueItems, [{ currentNoteId: "a", total: 1 }]);
});

test("graph panel state builder preserves stale graph with refresh notices", () => {
  const state = buildGraphPanelState({
    graphState: {
      item: { nodes: [{ id: "a" }], edges: [] },
      loading: true,
      error: "Retry later",
      filters: { relationType: "meaningful" },
      lastLoadedAt: "2026-01-01T00:00:00.000Z",
      lastErrorAt: "2026-01-01T00:01:00.000Z",
      sectionOpen: {}
    },
    canReuseScopedGraph: true
  }, {
    graphScopedItems: (item) => ({ nodes: item.nodes, allNodes: item.nodes, edges: item.edges }),
    graphFocusedItems: (nodes, edges, allNodes) => ({ nodes, edges, allNodes, focused: false, focusedNoteId: "" }),
    graphNodeIdsInScope: (nodes) => new Set(nodes.map((node) => node.id)),
    normalizeGraphSelectionForVisibleItems: () => null,
    formatClockTime: () => "00:00"
  });

  assert.equal(state.kind, "ready");
  assert.match(state.summaryText, /刷新失败/);
  assert.equal(state.notices.length, 2);
  assert.equal(state.notices[0].tone, "info");
  assert.equal(state.notices[1].tone, "warn");
});
