import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapChromeDeps
} from "../../apps/web/src/graph-visual-map-chrome-deps.js";
import {
  buildGraphVisualMapRuntimeStateDeps
} from "../../apps/web/src/graph-visual-map-runtime-state-deps.js";
import {
  buildGraphVisualMapViewDeps
} from "../../apps/web/src/graph-visual-map-view-deps.js";

test("graph visual map runtime state deps keeps layout and interaction state helpers together", () => {
  const marker = (name) => Object.assign(() => name, { marker: name });
  const host = {
    GRAPH_RELATION_GROUP_META: { support: { label: "Support" } },
    GRAPH_VISUAL_ZOOM_OPTIONS: { fit: { key: "fit" } },
    graphState: { zoom: "fit" },
    graphBuildVisualLayout: marker("layout"),
    graphZoomOption: marker("zoom"),
    graphReadingLensMeta: marker("lens-meta"),
    graphEdgePath: marker("edge-path"),
    graphRelationVisual: marker("relation-visual"),
    graphDenseGalaxyMode: marker("dense"),
    shouldShowGraphDensityHint: marker("density-hint"),
    normalizeGraphSelectionForVisibleItems: marker("selection"),
    graphNodeNeedsRelationWorkflow: marker("workflow"),
    graphBuildReadingLensState: marker("lens-state"),
    renderGraphVisualMap: marker("visual-map")
  };

  const deps = buildGraphVisualMapRuntimeStateDeps(host);

  assert.equal(deps.graphState, host.graphState);
  assert.equal(deps.graphBuildVisualLayout, host.graphBuildVisualLayout);
  assert.equal(deps.zoomOptions, host.GRAPH_VISUAL_ZOOM_OPTIONS);
  assert.equal(deps.relationGroupMeta, host.GRAPH_RELATION_GROUP_META);
  assert.equal(deps.graphNodeNeedsRelationWorkflow, host.graphNodeNeedsRelationWorkflow);
  assert.equal("renderGraphVisualMap" in deps, false);
});

test("graph visual map chrome deps keeps toolbar panels and shell renderer helpers together", () => {
  const marker = (name) => Object.assign(() => name, { marker: name });
  const host = {
    GRAPH_RELATION_MARKER_COLORS: { support: "#fff" },
    GRAPH_VISUAL_ZOOM_OPTIONS: { fit: { key: "fit" } },
    escapeHtml: marker("escape"),
    graphRelationTypeFilter: marker("filter"),
    graphThemeBoundary: marker("theme"),
    graphStarfield: marker("stars"),
    graphNebulaField: marker("nebula"),
    graphClusterGlow: marker("cluster"),
    graphFocusContextPanel: marker("focus"),
    graphSelectionPanel: marker("selection"),
    graphResearchNavigatorPanel: marker("research"),
    graphResearchNavigatorEntry: marker("entry"),
    graphIcon: marker("icon"),
    graphViewModeSwitcher: marker("view-mode"),
    graphReadingLensControls: marker("lens-controls"),
    graphNodeClass: marker("node-class")
  };

  const deps = buildGraphVisualMapChromeDeps(host);

  assert.equal(deps.renderGraphRelationTypeFilter, host.graphRelationTypeFilter);
  assert.equal(deps.renderGraphClusterGlow, host.graphClusterGlow);
  assert.equal(deps.renderGraphResearchNavigatorEntry, host.graphResearchNavigatorEntry);
  assert.equal(deps.renderGraphIcon, host.graphIcon);
  assert.equal(deps.markerColors, host.GRAPH_RELATION_MARKER_COLORS);
  assert.equal("graphNodeClass" in deps, false);
});

test("graph visual map view deps keeps node, edge, and map panel helpers separate from chrome helpers", () => {
  const marker = (name) => Object.assign(() => name, { marker: name });
  const host = {
    graphNodeClass: marker("node-class"),
    graphNodeStarRank: marker("rank"),
    graphShortTitle: marker("short-title"),
    noteTypeLabel: marker("note-type"),
    graphNodeAttentionReasons: marker("attention"),
    graphNodeShowsAsPoint: marker("point"),
    graphRelationTypeLabel: marker("relation-label"),
    graphRelationSourceLabel: marker("source-label"),
    graphRelationGroupMeta: marker("group-meta"),
    graphEdgeSelectionKey: marker("edge-key"),
    graphEdgeVisibleAtFit: marker("edge-visible"),
    graphEdgeShouldRender: marker("edge-render"),
    graphFocusContextPanel: marker("focus"),
    graphSelectionPanel: marker("selection"),
    graphResearchNavigatorPanel: marker("research"),
    graphResearchNavigatorEntry: marker("entry"),
    graphRelationTypeFilter: marker("filter")
  };

  const deps = buildGraphVisualMapViewDeps(host);

  assert.equal(deps.graphNodeClass, host.graphNodeClass);
  assert.equal(deps.graphNodeShowsAsPoint, host.graphNodeShowsAsPoint);
  assert.equal(deps.graphRelationTypeLabel, host.graphRelationTypeLabel);
  assert.equal(deps.graphEdgeShouldRender, host.graphEdgeShouldRender);
  assert.equal(deps.renderGraphFocusContextPanel, host.graphFocusContextPanel);
  assert.equal(deps.renderGraphSelectionPanel, host.graphSelectionPanel);
  assert.equal(deps.renderGraphResearchNavigatorPanel, host.graphResearchNavigatorPanel);
  assert.equal(deps.renderGraphResearchNavigatorEntry, host.graphResearchNavigatorEntry);
  assert.equal("graphRelationTypeFilter" in deps, false);
});
