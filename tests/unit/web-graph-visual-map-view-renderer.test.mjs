import test from "node:test";
import assert from "node:assert/strict";

import {
  GRAPH_VISUAL_EDGE_LABELS,
  GRAPH_VISUAL_LEGEND_NOTE,
  GRAPH_VISUAL_NODE_LABELS,
  buildGraphVisualEdgeViewContext,
  buildGraphVisualNodeViewContext,
  renderGraphVisualEdgeMarkupForRuntime,
  renderGraphVisualLegendMarkupForRuntime,
  renderGraphVisualNodeMarkupForRuntime
} from "../../apps/web/src/graph-visual-map-view-renderer.js";

const baseRuntimeState = {
  layout: {
    nodes: [
      {
        id: "n1",
        title: "Alpha",
        noteType: "permanent",
        starTier: "focus",
        x: 10,
        y: 20,
        radius: 8,
        degree: 2,
        isGraphIsolatedCandidate: true
      }
    ],
    nodeMap: new Map([["n1", { clusterIndex: 0 }], ["n2", { clusterIndex: 1 }]])
  },
  visibleEdges: [
    {
      edge: { id: "e1", fromNoteId: "n1", toNoteId: "n2", relationType: "supports", rationale: "Because" },
      path: { d: "M 0 0 L 10 10", titleX: 5, titleY: 5 },
      visual: { key: "support", className: "is-support" }
    }
  ],
  zoom: { key: "detail" },
  activeSelection: { kind: "node", nodeId: "n1" },
  selectedNodeId: "n1",
  selectedNodeNeighborhood: new Set(["n1", "n2"]),
  selectedThemeNoteIds: new Set(["n1", "n2"]),
  selectedBridgeNoteIds: new Set(["n1", "n2"]),
  selectedIsolatedNodeId: "n1",
  selectedEdgeKey: "n1->n2",
  adjacencyMap: new Map([["n1", ["n2"]]]),
  readingLensState: { active: false },
  filterActive: false,
  denseGalaxyMode: false,
  denseDirectoryMode: false,
  legendOpen: true,
  legendGroups: [{ key: "support", label: "Support", detail: "supports" }]
};

test("graph visual map view renderer builds node and edge contexts from runtime state", () => {
  const nodeContext = buildGraphVisualNodeViewContext(baseRuntimeState);
  const edgeContext = buildGraphVisualEdgeViewContext(baseRuntimeState, "supports");

  assert.equal(nodeContext.zoomKey, "detail");
  assert.equal(nodeContext.selectedNodeId, "n1");
  assert.equal(nodeContext.selectedThemeNoteIds.has("n2"), true);
  assert.equal(edgeContext.zoomKey, "detail");
  assert.equal(edgeContext.relationType, "supports");
  assert.equal(edgeContext.layoutNodeMap.get("n2").clusterIndex, 1);
});

test("graph visual map view renderer supplies graph-specific Chinese node, edge, and legend labels", () => {
  const deps = {
    graphNodeClass: () => "is-permanent",
    graphNodeStarRank: () => 5,
    graphShortTitle: (title) => title,
    noteTypeLabel: () => "永久笔记",
    graphNodeAttentionReasons: () => [],
    graphNodeShowsAsPoint: () => false,
    graphRelationTypeLabel: () => "支持",
    graphRelationSourceLabel: () => "手动",
    graphRelationGroupMeta: () => ({ label: "支持" }),
    graphEdgeSelectionKey: (edge) => `${edge.fromNoteId}->${edge.toNoteId}`,
    graphEdgeVisibleAtFit: () => true,
    graphEdgeShouldRender: () => true
  };

  const nodeMarkup = renderGraphVisualNodeMarkupForRuntime(baseRuntimeState, deps);
  const edgeMarkup = renderGraphVisualEdgeMarkupForRuntime(baseRuntimeState, "supports", deps);
  const legendMarkup = renderGraphVisualLegendMarkupForRuntime(baseRuntimeState, {
    escapeHtml: (value) => String(value ?? ""),
    renderGraphIcon: (name) => `<i>${name}</i>`
  });

  assert.equal(GRAPH_VISUAL_NODE_LABELS.isolatedNodeType, "待关联笔记");
  assert.equal(GRAPH_VISUAL_EDGE_LABELS.sourceFallback, "源笔记");
  assert.match(nodeMarkup, /整理待关联笔记 Alpha/);
  assert.match(edgeMarkup, /查看关系确认 n1 到 n2/);
  assert.match(legendMarkup, new RegExp(GRAPH_VISUAL_LEGEND_NOTE));
});
