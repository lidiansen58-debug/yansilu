import test from "node:test";
import assert from "node:assert/strict";

import {
  createGraphReadingLensStateController,
  graphBuildReadingLensStateForRuntime,
  graphEdgeMatchesReadingLensForRuntime
} from "../../apps/web/src/graph-reading-lens-state.js";

const relationGroups = {
  supports: "support",
  contradicts: "conflict",
  qualifies: "boundary",
  bridges: "bridge",
  associated_with: "associated"
};

function deps() {
  return {
    graphReadingLensMeta: (value = "insight") => ({ key: value || "insight" }),
    graphEdgeSelectionKey: (edge = {}) => edge.id,
    graphRelationVisual: (type = "") => ({ key: relationGroups[type] || "associated" }),
    graphNodeStarRank: (tier = "") => ({ bright: 3, medium: 2, dim: 1 }[tier] || 0)
  };
}

test("graph reading lens state classifies relation groups by active lens", () => {
  const runtimeDeps = deps();

  assert.equal(graphEdgeMatchesReadingLensForRuntime({ relationType: "bridges" }, "bridge", runtimeDeps), true);
  assert.equal(graphEdgeMatchesReadingLensForRuntime({ relationType: "supports" }, "bridge", runtimeDeps), false);
  assert.equal(graphEdgeMatchesReadingLensForRuntime({ relationType: "qualifies" }, "argument", runtimeDeps), true);
  assert.equal(graphEdgeMatchesReadingLensForRuntime({ relationType: "associated_with" }, "argument", runtimeDeps), false);
  assert.equal(graphEdgeMatchesReadingLensForRuntime({ relationType: "contradicts" }, "insight", runtimeDeps), true);
});

test("graph reading lens state highlights bridge gaps and isolated candidates", () => {
  const state = graphBuildReadingLensStateForRuntime(
    {
      nodes: [
        { id: "a" },
        { id: "b" },
        { id: "c", isGraphIsolatedCandidate: true }
      ],
      visibleEdges: [
        { edge: { id: "e1", relationType: "supports", fromNoteId: "a", toNoteId: "b" } },
        { edge: { id: "e2", relationType: "bridges", fromNoteId: "b", toNoteId: "c" } }
      ],
      bridgeGaps: [{ noteIds: ["a"], targetNoteIds: ["c"] }],
      lens: "bridge"
    },
    deps()
  );

  assert.equal(state.lens, "bridge");
  assert.deepEqual([...state.priorityEdgeKeys], ["e2"]);
  assert.deepEqual([...state.priorityNodeIds].sort(), ["a", "b", "c"]);
  assert.equal(state.active, true);
});

test("graph reading lens state caps large dense maps to the strongest edges", () => {
  const nodes = Array.from({ length: 80 }, (_, index) => ({
    id: `n${index}`,
    title: `Note ${index}`,
    degree: index % 5,
    starTier: index % 2 === 0 ? "bright" : "dim"
  }));
  const visibleEdges = Array.from({ length: 120 }, (_, index) => ({
    edge: {
      id: `e${index}`,
      relationType: index % 3 === 0 ? "bridges" : "supports",
      fromNoteId: `n${index % 80}`,
      toNoteId: `n${(index + 1) % 80}`
    }
  }));

  const state = graphBuildReadingLensStateForRuntime({ nodes, visibleEdges, lens: "argument" }, deps());

  assert.equal(state.priorityEdgeKeys.size, 12);
  assert.ok(state.priorityNodeIds.size > 0);
  assert.equal(state.active, true);
});

test("graph reading lens state controller binds shared deps once", () => {
  const controller = createGraphReadingLensStateController(deps());
  const state = controller.graphBuildReadingLensState({
    nodes: [{ id: "a", degree: 3 }],
    visibleEdges: [],
    lens: "insight"
  });

  assert.equal(controller.graphEdgeMatchesReadingLens({ relationType: "supports" }, "argument"), true);
  assert.deepEqual([...state.priorityNodeIds], ["a"]);
});
