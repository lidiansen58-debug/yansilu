import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapHostDeps
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
