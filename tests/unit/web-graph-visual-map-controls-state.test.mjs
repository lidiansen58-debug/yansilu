import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGraphVisualMapControlsState
} from "../../apps/web/src/graph-visual-map-controls-state.js";

test("graph visual map controls state derives zoom and lens state without legend controls", () => {
  const readingLensCalls = [];
  const state = buildGraphVisualMapControlsState({
    graphState: {
      zoom: "wide",
      readingLens: "questions",
      legendOpen: true
    },
    relationType: "index",
    layout: { width: 1000, height: 500, nodes: [{ id: "n1" }] },
    visibleEdges: [{ edge: { id: "e1" } }],
    bridgeGaps: [{ noteId: "n1", targetNoteId: "n2" }]
  }, {
    graphReadingModeMeta: (mode) => ({ key: mode, label: `Mode ${mode}` }),
    graphViewModeForRelationType: () => "structure",
    graphZoomOption: (key) => ({ key, scale: 1.25 }),
    graphReadingLensMeta: (key) => ({ key }),
    graphBuildReadingLensState: (payload) => {
      readingLensCalls.push(payload);
      return { active: true, lens: payload.lens };
    },
    zoomOptions: { fit: {}, wide: {}, close: {} },
    relationGroupMeta: {
      support: { label: "Support" },
      bridge: { label: "Bridge" }
    }
  });

  assert.equal(state.modeMeta.label, "Mode structure");
  assert.equal(state.zoomWidth, 1250);
  assert.equal(state.zoomHeight, 625);
  assert.equal(state.zoomIndex, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(state, "legendOpen"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(state, "legendGroups"), false);
  assert.deepEqual(readingLensCalls[0], {
    nodes: [{ id: "n1" }],
    visibleEdges: [{ edge: { id: "e1" } }],
    bridgeGaps: [{ noteId: "n1", targetNoteId: "n2" }],
    lens: "questions"
  });
  assert.equal(state.readingLensState.active, true);
});

test("graph visual map controls state derives focus and research navigator state", () => {
  const expanded = buildGraphVisualMapControlsState({
    graphState: {
      focusDepth: "2",
      focusContextCollapsed: true,
      researchNavigatorTouched: false
    },
    filterActive: true,
    normalizedFocusedNoteId: "n1",
    denseGalaxyMode: true
  }, {
    graphFocusDepthMeta: (value) => ({ key: value, label: `Depth ${value}`, note: "note" })
  });
  const navigatorVisible = buildGraphVisualMapControlsState({
    graphState: { researchNavigatorTouched: true },
    filterActive: false,
    denseGalaxyMode: true,
    workbenchPanelMarkup: ""
  });

  assert.equal(expanded.focusDepth.label, "Depth 2");
  assert.equal(expanded.focusContextAvailable, "n1");
  assert.equal(expanded.focusContextCollapsed, true);
  assert.equal(expanded.researchNavigatorAutoHidden, true);
  assert.equal(expanded.researchNavigatorHidden, true);
  assert.equal(expanded.researchNavigatorCanOpen, false);
  assert.equal(navigatorVisible.researchNavigatorHidden, false);
  assert.equal(navigatorVisible.researchNavigatorCanOpen, true);
});
