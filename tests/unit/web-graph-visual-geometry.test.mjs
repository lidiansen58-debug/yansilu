import test from "node:test";
import assert from "node:assert/strict";
import {
  graphDenseGalaxyMode,
  graphEdgeShouldRender,
  graphEdgeVisibleAtFit,
  graphHash,
  graphNodeAttentionReasons,
  graphNodeRadiusByTier,
  graphNodeShowsAsPoint,
  graphNodeStarRank,
  graphNodeStarTier,
  graphShortTitle,
  graphThemeBoundaryMeta,
  renderGraphThemeBoundary
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

test("graph visual geometry decides edge render visibility from zoom and density policy", () => {
  const deps = {
    graphViewModeForRelationType: (relationType) => relationType === "tagged" ? "structure" : "meaningful"
  };
  assert.equal(graphEdgeShouldRender({ zoomKey: "detail" }, deps), true);
  assert.equal(graphEdgeShouldRender({ filterActive: true }, deps), true);
  assert.equal(graphEdgeShouldRender({ relationType: "tagged", selected: true }, deps), true);
  assert.equal(graphEdgeShouldRender({ relationType: "tagged", inSelectedNodeNeighborhood: true }, deps), false);
  assert.equal(graphEdgeShouldRender({ denseMode: true, intercluster: true, connectsFocus: true }, deps), true);
  assert.equal(graphEdgeShouldRender({ denseMode: true, connectsFocus: true }, deps), false);
  assert.equal(graphEdgeShouldRender({ lensPriority: true }, deps), true);
});

test("graph visual geometry builds theme boundary metadata around member nodes", () => {
  const meta = graphThemeBoundaryMeta({
    nodes: [
      { id: "n1", x: 100, y: 100, radius: 8 },
      { id: "n2", x: 180, y: 140, radius: 10 },
      { id: "outside", x: 900, y: 900, radius: 20 }
    ],
    noteIds: [" n1 ", "n2", ""],
    title: " 主题 ",
    layoutWidth: 400,
    layoutHeight: 300
  });

  assert.equal(meta.count, 2);
  assert.equal(meta.title, "主题");
  assert.equal(meta.label, "小型主题候选");
  assert.equal(meta.tone, "is-compact");
  assert.ok(meta.width >= 96);
  assert.ok(meta.height >= 78);
});

test("graph visual geometry renders escaped theme boundary markup", () => {
  const html = renderGraphThemeBoundary({
    x: 10,
    y: 12,
    width: 100,
    height: 80,
    rx: 18,
    labelX: 20,
    labelY: 30,
    label: "<主题>",
    tone: "is-test",
    count: 3
  }, {
    escapeHtml: (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  });

  assert.match(html, /graph-theme-boundary is-test/);
  assert.match(html, /&lt;主题&gt; · 3 条/);
});
