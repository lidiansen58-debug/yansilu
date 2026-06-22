import test from "node:test";
import assert from "node:assert/strict";
import {
  graphVisualNodeViewState,
  renderGraphVisualNodeView,
  renderGraphVisualNodeViews
} from "../../apps/web/src/graph-visual-node-view.js";
import {
  graphVisualEdgeViewState,
  renderGraphVisualEdgeView,
  renderGraphVisualEdgeViews
} from "../../apps/web/src/graph-visual-edge-view.js";

const nodeDeps = {
  graphNodeClass: (type) => `is-${type || "unknown"}`,
  graphNodeStarRank: (tier) => ({ focus: 5, core: 4, major: 3, medium: 2, minor: 1, dust: 0 }[tier] ?? 0),
  graphShortTitle: (title, limit) => String(title).length > limit ? `${String(title).slice(0, limit - 1)}…` : title,
  noteTypeLabel: (type) => type === "permanent" ? "Permanent" : "Note",
  graphNodeAttentionReasons: (_node, flags) => flags.selected ? ["selected"] : [],
  graphNodeShowsAsPoint: (node) => ["dust", "minor"].includes(String(node.starTier || ""))
};

const edgeDeps = {
  graphRelationTypeLabel: (type) => type === "supports" ? "Supports" : "Related",
  graphRelationSourceLabel: (source) => source === "ai" ? "AI" : "Manual",
  graphRelationGroupMeta: (type) => ({ label: type === "supports" ? "Support" : "Other" }),
  graphEdgeSelectionKey: (edge) => `${edge.fromNoteId}->${edge.toNoteId}`,
  graphEdgeVisibleAtFit: (_edge, _nodeMap, options) => options.denseMode ? options.intercluster : true,
  graphEdgeShouldRender: ({ fitVisible, selected, lensPriority }) => fitVisible || selected || lensPriority
};

test("graph visual node view exposes selection, lens, and label state", () => {
  const node = {
    id: "n1",
    title: "Important permanent note",
    noteType: "permanent",
    starTier: "major",
    x: 10,
    y: 20,
    radius: 6,
    degree: 4
  };
  const context = {
    selectedNodeId: "n1",
    selectedNodeNeighborhood: new Set(["n1", "n2"]),
    readingLensState: { active: true, priorityNodeIds: new Set(["n1"]) },
    zoomKey: "fit"
  };

  const state = graphVisualNodeViewState(node, 0, context, nodeDeps);
  const markup = renderGraphVisualNodeView(node, 0, context, nodeDeps);

  assert.equal(state.selected, true);
  assert.equal(state.lensPriority, true);
  assert.equal(state.showLabel, true);
  assert.match(markup, /class="graph-map-node graph-node is-permanent is-star-major/);
  assert.match(markup, /is-selected/);
  assert.match(markup, /is-lens-priority/);
  assert.match(markup, /data-node-neighbors=""/);
  assert.match(markup, /graph-map-node-label/);
});

test("graph visual node view keeps dense low-rank nodes point-like", () => {
  const node = {
    id: "dust",
    title: "Dust node",
    noteType: "permanent",
    starTier: "dust",
    x: 5,
    y: 6,
    radius: 1,
    clusterArmDepth: 0.5
  };
  const context = {
    denseGalaxyMode: true,
    zoomKey: "fit"
  };

  const state = graphVisualNodeViewState(node, 9, context, nodeDeps);
  const markup = renderGraphVisualNodeView(node, 9, context, nodeDeps);

  assert.equal(state.pointLike, true);
  assert.equal(state.showLabel, false);
  assert.doesNotMatch(markup, /graph-map-node-glint/);
  assert.match(markup, /--graph-node-core-alpha:0\.70/);
});

test("graph visual node view renders batches without prototype helpers", () => {
  const markup = renderGraphVisualNodeViews(
    [
      { id: "a", title: "A", noteType: "permanent", starTier: "focus", x: 1, y: 1, radius: 8, degree: 2, isFocused: true },
      { id: "b", title: "B", noteType: "permanent", starTier: "minor", x: 2, y: 2, radius: 2, degree: 1 }
    ],
    { zoomKey: "read", denseDirectoryMode: true },
    nodeDeps
  );

  assert.equal((markup.match(/class="graph-map-node graph-node/g) || []).length, 2);
  assert.match(markup, /data-node-id="a"/);
  assert.match(markup, /data-node-id="b"/);
});

test("graph visual edge view exposes fit, dense, selection, and lens state", () => {
  const edge = { id: "e1", fromNoteId: "a", toNoteId: "b", fromTitle: "A", toTitle: "B", relationType: "supports", createdBy: "ai", rationale: "Because" };
  const item = {
    edge,
    path: { d: "M 0 0 L 10 10", titleX: 5, titleY: 5 },
    visual: { key: "support", className: "is-support" },
    connectsFocus: true
  };
  const layoutNodeMap = new Map([
    ["a", { clusterIndex: 1 }],
    ["b", { clusterIndex: 2 }]
  ]);
  const context = {
    layoutNodeMap,
    selectedEdgeKey: "a->b",
    selectedNodeId: "a",
    selectedThemeNoteIds: new Set(["a", "b"]),
    selectedBridgeNoteIds: new Set(["a", "b"]),
    readingLensState: { active: true, priorityEdgeKeys: new Set(["a->b"]) },
    denseGalaxyMode: true,
    zoomKey: "fit"
  };

  const state = graphVisualEdgeViewState(item, context, edgeDeps);
  const markup = renderGraphVisualEdgeView(item, context, edgeDeps);

  assert.equal(state.fitVisible, true);
  assert.equal(state.intercluster, true);
  assert.equal(state.selected, true);
  assert.equal(state.lensPriority, true);
  assert.match(markup, /is-fit-visible/);
  assert.match(markup, /is-selected/);
  assert.match(markup, /is-lens-priority/);
  assert.match(markup, /is-theme-selected/);
  assert.match(markup, /is-bridge-selected/);
  assert.doesNotMatch(markup, /graph-map-edge-pin/);
});

test("graph visual edge view can hide fit edges unless selected or lens-priority", () => {
  const item = {
    edge: { fromNoteId: "a", toNoteId: "b", relationType: "supports" },
    path: { d: "M 0 0 L 10 10", titleX: 5, titleY: 5 },
    visual: { key: "support", className: "is-support" }
  };
  const layoutNodeMap = new Map([
    ["a", { clusterIndex: 1 }],
    ["b", { clusterIndex: 1 }]
  ]);

  assert.equal(renderGraphVisualEdgeView(item, { layoutNodeMap, denseGalaxyMode: true }, edgeDeps), "");

  const selectedMarkup = renderGraphVisualEdgeView(
    item,
    { layoutNodeMap, denseGalaxyMode: true, selectedEdgeKey: "a->b" },
    edgeDeps
  );
  assert.match(selectedMarkup, /is-fit-hidden/);
  assert.match(selectedMarkup, /is-selected/);
});

test("graph visual edge view renders batch output and detail pins", () => {
  const markup = renderGraphVisualEdgeViews(
    [
      {
        edge: { fromNoteId: "a", toNoteId: "b", relationType: "supports" },
        path: { d: "M 0 0 L 10 10", titleX: 5, titleY: 5 },
        visual: { key: "support", className: "is-support" }
      }
    ],
    { zoomKey: "detail" },
    edgeDeps
  );

  assert.equal((markup.match(/class="graph-map-edge-group graph-edge/g) || []).length, 1);
  assert.match(markup, /graph-map-edge-pin/);
});
