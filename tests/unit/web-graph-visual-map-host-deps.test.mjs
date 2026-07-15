import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapHostDeps,
  createGraphVisualMapPrototypeDepsProvider
} from "../../apps/web/src/graph-visual-map-host-deps.js";

test("graph visual map host deps keeps shell-owned helpers in one mapping", () => {
  const host = {};
  const keys = [
    "GRAPH_RELATION_GROUP_META",
    "GRAPH_RELATION_MARKER_COLORS",
    "GRAPH_VISUAL_ZOOM_OPTIONS",
    "escapeHtml",
    "graphBuildReadingLensState",
    "graphBuildVisualLayout",
    "graphClusterGlow",
    "graphDenseGalaxyMode",
    "graphEdgePath",
    "graphEdgeSelectionKey",
    "graphEdgeShouldRender",
    "graphEdgeVisibleAtFit",
    "graphFocusContextPanel",
    "graphFocusDepthMeta",
    "graphIcon",
    "graphNebulaField",
    "graphNodeAttentionReasons",
    "graphNodeClass",
    "graphNodeNeedsRelationWorkflow",
    "graphNodeShowsAsPoint",
    "graphNodeStarRank",
    "graphReadingLensControls",
    "graphReadingLensMeta",
    "graphReadingModeMeta",
    "graphRelationGroupMeta",
    "graphRelationSourceLabel",
    "graphRelationTypeFilter",
    "graphRelationTypeLabel",
    "graphRelationVisual",
    "graphResearchNavigatorEntry",
    "graphResearchNavigatorPanel",
    "graphSelectionPanel",
    "graphShortTitle",
    "graphStarfield",
    "graphState",
    "graphThemeBoundary",
    "graphThemeBoundaryMeta",
    "graphViewModeForRelationType",
    "graphViewModeSwitcher",
    "graphZoomOption",
    "normalizeGraphSelectionForVisibleItems",
    "noteTypeLabel",
    "shouldShowGraphCanvasHelpHint",
    "shouldShowGraphDensityHint"
  ];
  for (const key of keys) host[key] = { key };

  const deps = buildGraphVisualMapHostDeps(host);

  assert.notEqual(deps, host);
  assert.deepEqual(Object.keys(deps), keys);
  for (const key of keys) {
    assert.equal(deps[key], host[key]);
  }
});

test("graph visual map prototype deps provider normalizes runtime deps on demand", () => {
  let graphState = { zoom: "fit" };
  const provider = createGraphVisualMapPrototypeDepsProvider(() => ({
    graphState,
    escapeHtml: (value) => String(value ?? ""),
    graphBuildVisualLayout: () => ({ nodes: [], edges: [] }),
    graphIcon: () => "<svg></svg>"
  }));

  const first = provider();
  graphState = { zoom: "dense" };
  const second = provider();

  assert.notEqual(first, second);
  assert.equal(first.graphState.zoom, "fit");
  assert.equal(second.graphState.zoom, "dense");
  assert.equal(typeof first.graphBuildVisualLayout, "function");
  assert.equal(typeof second.renderGraphIcon, "function");
  assert.equal(typeof second.graphNodeClass, "function");
});
