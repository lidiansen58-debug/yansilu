import test from "node:test";
import assert from "node:assert/strict";
import {
  createGraphVisualMapController,
  renderGraphVisualMapForRuntime
} from "../../apps/web/src/graph-visual-map-controller.js";
import { composeGraphVisualMapForRuntime } from "../../apps/web/src/graph-visual-map-composer.js";

function layoutFor(nodes = []) {
  const visualNodes = nodes.map((node, index) => ({
    ...node,
    x: 120 + index * 120,
    y: 140,
    radius: 24,
    relationCount: node.relationCount ?? 1
  }));
  return {
    nodes: visualNodes,
    edges: [],
    width: 420,
    height: 280,
    nodeMap: new Map(visualNodes.map((node) => [node.id, node])),
    clusterMeta: []
  };
}

function renderMap(args = {}, extraDeps = {}) {
  return renderGraphVisualMapForRuntime(args, graphMapDeps(extraDeps));
}

function graphMapDeps(extraDeps = {}) {
  return {
    graphState: {
      zoom: "fit",
      readingLens: "overview",
      lastLoadedAt: "test",
      ...(extraDeps.graphState || {})
    },
    graphBuildVisualLayout: layoutFor,
    graphZoomOption: () => ({ key: "fit", scale: 1 }),
    graphReadingLensMeta: () => ({ key: "overview" }),
    graphReadingModeMeta: () => ({ key: "argument", label: "Argument" }),
    graphViewModeForRelationType: () => "argument",
    graphEdgePath: () => ({ d: "M 120 140 L 240 140", labelX: 180, labelY: 128, titleX: 180, titleY: 140 }),
    graphRelationVisual: () => ({ key: "support" }),
    graphRelationGroupMeta: () => ({ key: "support", label: "Support" }),
    relationGroupMeta: {
      support: { label: "Support", detail: "supports" }
    },
    graphEdgeSelectionKey: (edge) => edge.id || `${edge.fromNoteId}:${edge.toNoteId}`,
    graphEdgeVisibleAtFit: () => true,
    graphEdgeShouldRender: () => true,
    graphBuildReadingLensState: () => ({ active: false, nodeIds: new Set(), edgeKeys: new Set() }),
    zoomOptions: {
      fit: { key: "fit", label: "Fit", note: "Fit graph", icon: "fit" }
    },
    markerColors: { support: "#38a169" },
    renderGraphIcon: (name) => `<i>${name}</i>`,
    renderGraphViewModeSwitcher: () => "<nav data-test-view-mode></nav>",
    renderGraphReadingLensControls: () => "<div data-test-reading-lens></div>",
    renderGraphRelationTypeFilter: () => "<div data-test-filter></div>",
    renderGraphResearchNavigatorPanel: () => "<aside data-test-research></aside>",
    renderGraphResearchNavigatorEntry: (open) => open ? "<button data-test-research-entry></button>" : "",
    graphNodeClass: () => "permanent",
    graphNodeStarRank: () => 3,
    graphShortTitle: (value) => value,
    noteTypeLabel: () => "Permanent",
    graphNodeAttentionReasons: () => [],
    graphNodeShowsAsPoint: () => false,
    ...(extraDeps || {})
  };
}

test("graph visual map controller composes runtime state into shell, node, and edge markup", () => {
  const html = renderMap({
    nodes: [
      { id: "n1", title: "Alpha", noteType: "permanent" },
      { id: "n2", title: "Beta", noteType: "permanent" }
    ],
    edges: [
      { id: "e1", fromNoteId: "n1", toNoteId: "n2", relationType: "supports", rationale: "because" }
    ],
    relationFilterEdges: [],
    toolbarMarkup: "<div data-test-toolbar></div>"
  });

  assert.match(html, /class="graph-map-panel/);
  assert.match(html, /data-test-toolbar/);
  assert.match(html, /class="graph-map-node/);
  assert.match(html, /class="graph-map-edge-group/);
  assert.doesNotMatch(html, /data-test-reading-lens/);
});

test("graph visual map controller keeps isolated relation workflow in the selection overlay", () => {
  const html = renderMap({
    nodes: [
      { id: "n1", title: "Alpha", noteType: "permanent" }
    ],
    edges: [],
    relationFilterEdges: []
  }, {
    graphState: {
      selection: { kind: "isolated", noteId: "n1" }
    },
    normalizeGraphSelectionForVisibleItems: (selection) => selection,
    renderGraphSelectionPanel: () => "<section data-test-selection-panel></section>"
  });

  assert.match(html, /class="graph-selection-overlay"/);
  assert.match(html, /data-test-selection-panel/);
  assert.doesNotMatch(html, /class="graph-side-stack"><section data-test-selection-panel/);
});

test("graph visual map controller renders from current deps provider", () => {
  const calls = [];
  const controller = createGraphVisualMapController({
    depsProvider: () => {
      calls.push("deps");
      return graphMapDeps({
        graphState: { zoom: "fit", lastLoadedAt: String(calls.length) }
      });
    }
  });

  const html = controller.renderGraphVisualMap({
    nodes: [{ id: "n1", title: "Alpha", noteType: "permanent" }],
    edges: [],
    relationFilterEdges: []
  });

  assert.match(html, /class="graph-map-node/);
  assert.deepEqual(calls, ["deps"]);
});

test("graph visual map composer builds shell props from runtime, chrome, and svg view layers", () => {
  const { graphShellProps, shellDeps } = composeGraphVisualMapForRuntime({
    nodes: [
      { id: "n1", title: "Alpha", noteType: "permanent" }
    ],
    edges: [],
    relationFilterEdges: [],
    toolbarMarkup: "<div data-test-toolbar></div>"
  }, graphMapDeps({
    graphState: {
      selection: { kind: "isolated", noteId: "n1" }
    },
    normalizeGraphSelectionForVisibleItems: (selection) => selection,
    renderGraphSelectionPanel: () => "<section data-test-selection-panel></section>"
  }));

  assert.match(graphShellProps.toolbarMarkup, /data-test-toolbar/);
  assert.match(graphShellProps.nodeMarkup, /class="graph-map-node/);
  assert.match(graphShellProps.selectionOverlayMarkup, /data-test-selection-panel/);
  assert.equal(graphShellProps.sidePanelMarkup.includes("data-test-selection-panel"), false);
  assert.equal(typeof shellDeps.escapeHtml, "function");
});
