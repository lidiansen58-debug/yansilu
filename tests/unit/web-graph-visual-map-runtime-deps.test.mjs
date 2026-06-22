import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapRuntimeDeps
} from "../../apps/web/src/graph-visual-map-runtime-deps.js";

test("graph visual map runtime deps maps prototype host render helpers to controller deps", () => {
  const host = {
    GRAPH_RELATION_GROUP_META: { support: { label: "Support" } },
    GRAPH_RELATION_MARKER_COLORS: { support: "#fff" },
    GRAPH_VISUAL_ZOOM_OPTIONS: { fit: { key: "fit" } },
    graphState: { zoom: "fit" },
    graphRelationTypeFilter: () => "<filter>",
    graphThemeBoundary: () => "<theme>",
    graphStarfield: () => "<stars>",
    graphNebulaField: () => "<nebula>",
    graphClusterGlow: () => "<cluster>",
    graphFocusContextPanel: () => "<focus>",
    graphSelectionPanel: () => "<selection>",
    graphResearchNavigatorPanel: () => "<research>",
    graphResearchNavigatorEntry: () => "<entry>",
    graphIcon: () => "<icon>",
    graphViewModeSwitcher: () => "<mode>",
    graphReadingLensControls: () => "<lens>"
  };

  const deps = buildGraphVisualMapRuntimeDeps(host);

  assert.notEqual(deps, host);
  assert.equal(deps.graphState, host.graphState);
  assert.equal(deps.zoomOptions, host.GRAPH_VISUAL_ZOOM_OPTIONS);
  assert.equal(deps.relationGroupMeta, host.GRAPH_RELATION_GROUP_META);
  assert.equal(deps.markerColors, host.GRAPH_RELATION_MARKER_COLORS);
  assert.equal(deps.renderGraphRelationTypeFilter, host.graphRelationTypeFilter);
  assert.equal(deps.renderGraphThemeBoundary, host.graphThemeBoundary);
  assert.equal(deps.renderGraphStarfield, host.graphStarfield);
  assert.equal(deps.renderGraphNebulaField, host.graphNebulaField);
  assert.equal(deps.renderGraphClusterGlow, host.graphClusterGlow);
  assert.equal(deps.renderGraphFocusContextPanel, host.graphFocusContextPanel);
  assert.equal(deps.renderGraphSelectionPanel, host.graphSelectionPanel);
  assert.equal(deps.renderGraphResearchNavigatorPanel, host.graphResearchNavigatorPanel);
  assert.equal(deps.renderGraphResearchNavigatorEntry, host.graphResearchNavigatorEntry);
  assert.equal(deps.renderGraphIcon, host.graphIcon);
  assert.equal(deps.renderGraphViewModeSwitcher, host.graphViewModeSwitcher);
  assert.equal(deps.renderGraphReadingLensControls, host.graphReadingLensControls);
});

test("graph visual map runtime deps maps graph layout, selection, and label helpers", () => {
  const host = {
    graphBuildVisualLayout: () => ({ nodes: [], edges: [] }),
    graphZoomOption: () => ({ key: "fit" }),
    graphEdgePath: () => "M0 0",
    graphRelationVisual: () => ({ key: "support" }),
    graphDenseGalaxyMode: () => false,
    shouldShowGraphDensityHint: () => false,
    normalizeGraphSelectionForVisibleItems: (selection) => selection,
    graphNodeNeedsRelationWorkflow: () => true,
    graphBuildReadingLensState: () => ({ active: true }),
    graphNodeClass: () => "node",
    graphNodeStarRank: () => 1,
    graphShortTitle: () => "Short",
    noteTypeLabel: () => "永久笔记",
    graphNodeAttentionReasons: () => ["bridge"],
    graphNodeShowsAsPoint: () => false,
    graphRelationTypeLabel: () => "支持",
    graphRelationSourceLabel: () => "手动",
    graphRelationGroupMeta: () => ({ key: "support" }),
    graphEdgeSelectionKey: () => "edge",
    graphEdgeVisibleAtFit: () => true,
    graphEdgeShouldRender: () => true
  };

  const deps = buildGraphVisualMapRuntimeDeps(host);

  for (const key of Object.keys(host)) {
    if (key === "shouldShowGraphDensityHint" || key === "noteTypeLabel") continue;
    assert.equal(deps[key], host[key]);
  }
  assert.equal(deps.shouldShowGraphDensityHint, host.shouldShowGraphDensityHint);
  assert.equal(deps.noteTypeLabel, host.noteTypeLabel);
});
