import test from "node:test";
import assert from "node:assert/strict";
import {
  graphDenseGalaxyMode,
  graphEdgeVisibleAtFit,
  graphHash,
  graphNodeAttentionReasons,
  graphNodeRadiusByTier,
  graphNodeShowsAsPoint,
  graphNodeStarRank,
  graphNodeStarTier,
  graphShortTitle
} from "../../apps/web/src/graph-visual-geometry.js";

const relationVisual = (relationType = "") => ({
  key:
    relationType === "indexes"
      ? "index"
      : relationType === "supports"
        ? "support"
        : relationType === "bridges"
          ? "bridge"
          : relationType === "flows"
            ? "flow"
            : "neutral"
});

test("graph visual geometry hashes and shortens labels deterministically", () => {
  assert.equal(graphHash("abc"), graphHash("abc"));
  assert.notEqual(graphHash("abc"), graphHash("abd"));
  assert.equal(graphShortTitle("short", 8), "short");
  assert.equal(graphShortTitle("long-title", 6), "long-…");
});

test("graph visual geometry derives node tier rank radius and point rendering", () => {
  assert.equal(graphNodeStarTier({ isFocused: true, degree: 1 }), "focus");
  assert.equal(graphNodeStarTier({ isHub: true, degree: 1 }), "core");
  assert.equal(graphNodeStarTier({ isAnchor: true, degree: 1 }), "major");
  assert.equal(graphNodeStarTier({ isGraphIsolatedCandidate: true }), "isolated");
  assert.equal(graphNodeStarTier({ degree: 6 }), "medium");
  assert.equal(graphNodeStarTier({ degree: 0 }), "dust");
  assert.equal(graphNodeStarRank("core"), 4);
  assert.equal(graphNodeRadiusByTier("isolated", 0), 3.8);
  assert.equal(graphNodeShowsAsPoint({ starTier: "dust" }), true);
  assert.equal(graphNodeShowsAsPoint({ starTier: "core" }), false);
});

test("graph visual geometry reports attention reasons without duplicates", () => {
  assert.deepEqual(
    graphNodeAttentionReasons(
      { isFocused: true, isAnchor: true, degree: 5 },
      { selected: true, inSelectedTheme: true }
    ),
    ["当前选中", "当前焦点", "主题候选成员", "主题核心候选", "连接较多"]
  );
});

test("graph visual geometry detects dense galaxy mode only outside active filters", () => {
  assert.equal(graphDenseGalaxyMode({ nodes: Array.from({ length: 80 }), edges: Array.from({ length: 60 }) }), true);
  assert.equal(graphDenseGalaxyMode({ nodes: Array.from({ length: 80 }), edges: Array.from({ length: 60 }), filterActive: true }), false);
  assert.equal(graphDenseGalaxyMode({ nodes: Array.from({ length: 20 }), edges: Array.from({ length: 30 }) }), false);
});

test("graph visual geometry applies fit visibility from relation group and node rank", () => {
  const nodeMap = new Map([
    ["a", { starTier: "core" }],
    ["b", { starTier: "medium" }],
    ["c", { starTier: "minor" }]
  ]);
  assert.equal(graphEdgeVisibleAtFit({ fromNoteId: "a", toNoteId: "c", relationType: "indexes" }, nodeMap, {}, { graphRelationVisual: relationVisual }), true);
  assert.equal(graphEdgeVisibleAtFit({ fromNoteId: "b", toNoteId: "c", relationType: "bridges" }, nodeMap, {}, { graphRelationVisual: relationVisual }), false);
  assert.equal(graphEdgeVisibleAtFit({ fromNoteId: "a", toNoteId: "b", relationType: "supports" }, nodeMap, { denseMode: true }, { graphRelationVisual: relationVisual }), false);
  assert.equal(graphEdgeVisibleAtFit({ fromNoteId: "a", toNoteId: "b", relationType: "flows" }, nodeMap, { denseMode: true, intercluster: true }, { graphRelationVisual: relationVisual }), true);
});
