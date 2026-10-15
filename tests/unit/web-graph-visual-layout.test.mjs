import test from "node:test";
import assert from "node:assert/strict";
import { graphBuildVisualLayout } from "../../apps/web/src/graph-visual-layout.js";
import { graphNodeRadiusByTier, graphNodeStarTier } from "../../apps/web/src/graph-visual-geometry.js";

const layoutDeps = {
  graphHash(value = "") {
    return String(value)
      .split("")
      .reduce((total, char) => total + char.charCodeAt(0), 0);
  },
  graphNodeStarTier(node = {}) {
    if (node.isFocused) return "focus";
    if (node.isGraphIsolatedCandidate) return "isolated";
    return Number(node.degree || 0) > 1 ? "major" : "minor";
  },
  graphNodeRadiusByTier(tier = "") {
    return tier === "focus" ? 16 : tier === "major" ? 11 : tier === "isolated" ? 7 : 5;
  }
};

test("dense reading layouts retain every real group, relation degree and deterministic note position", () => {
  const nodes = Array.from({ length: 121 }, (_, i) => ({ id: `dense-${i}`, title: `笔记 ${i}` }));
  const edges = nodes.slice(1).map((node, i) => ({ fromNoteId: nodes[i].id, toNoteId: node.id }));
  const input = structuredClone({ nodes, edges });
  const overview = graphBuildVisualLayout(nodes, edges, {}, layoutDeps);
  const read = graphBuildVisualLayout(nodes, edges, { zoomKey: "read" }, layoutDeps);
  const detail = graphBuildVisualLayout(nodes, edges, { zoomKey: "detail" }, layoutDeps);
  assert.deepEqual(read.nodes, detail.nodes, 'Reading levels keep stable positions');
  assert.deepEqual(graphBuildVisualLayout(nodes, edges, { zoomKey: "detail" }, layoutDeps), detail);
  assert.deepEqual({ nodes, edges }, input, 'Layout must not mutate saved graph inputs');
  assert.deepEqual(detail.nodes.map(({ id, title, degree, clusterIndex }) => ({ id, title, degree, clusterIndex })),
    overview.nodes.map(({ id, title, degree, clusterIndex }) => ({ id, title, degree, clusterIndex })));
  assert.deepEqual(detail.clusterMeta.map(({ memberIds }) => memberIds), overview.clusterMeta.map(({ memberIds }) => memberIds));
  assertRealClusterPaths(detail, edges);
  for (const [i, a] of detail.nodes.entries()) for (const b of detail.nodes.slice(i + 1)) {
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 60, `Distinct hit targets: ${a.id}/${b.id}`);
  }
  assert.ok(detail.nodes.every(node => node.x > 0 && node.x < detail.width && node.y > 0 && node.y < detail.height));
});

test("small graph and fit mode keep their existing positions", () => {
  const nodes = Array.from({ length: 8 }, (_, i) => ({ id: `small-${i}` }));
  const edges = nodes.slice(1).map(node => ({ fromNoteId: nodes[0].id, toNoteId: node.id }));
  const baseline = graphBuildVisualLayout(nodes, edges, {}, layoutDeps);
  assert.deepEqual(graphBuildVisualLayout(nodes, edges, { zoomKey: "fit" }, layoutDeps), baseline);
  assert.deepEqual(graphBuildVisualLayout(nodes, edges, { zoomKey: "detail" }, layoutDeps), baseline);
});

test("small maps give real low-degree endpoints a visible radius without enlarging dense graphs", () => {
  const nodes = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}` }));
  const edges = [{ fromNoteId: "n0", toNoteId: "n1" }];
  const deps = { ...layoutDeps, graphNodeRadiusByTier, graphNodeStarTier };
  const small = graphBuildVisualLayout(nodes, edges, {}, deps);
  assert.equal(small.smallGraph, true);
  assert.ok(small.nodes.every(node => node.radius >= 8));
  assert.equal(small.nodes.length, nodes.length);
  const larger = graphBuildVisualLayout([...nodes, { id: "n12" }], edges, {}, deps);
  assert.equal(larger.smallGraph, false);
  assert.equal(larger.nodeMap.get("n1").radius, graphNodeRadiusByTier("dust", 1));
  const dense = graphBuildVisualLayout(nodes, Array.from({ length: 140 }, () => edges[0]), {}, deps);
  assert.equal(dense.smallGraph, false);
  assert.equal(dense.nodeMap.get("n11").radius, graphNodeRadiusByTier("dust", 0));
});

function assertRealClusterPaths(layout, edges) {
  for (const cluster of layout.clusterMeta) {
    const members = new Set(cluster.memberIds);
    const reached = new Set([cluster.anchorId]);
    const queue = [cluster.anchorId];
    for (let i = 0; i < queue.length; i += 1) {
      for (const edge of edges) {
        const neighbor = edge.fromNoteId === queue[i] ? edge.toNoteId :
          edge.toNoteId === queue[i] ? edge.fromNoteId : null;
        if (neighbor && members.has(neighbor) && !reached.has(neighbor)) {
          reached.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    assert.deepEqual([...reached].sort(), [...members].sort(), `Unrelated members under ${cluster.anchorId}`);
  }
}

test("disconnected groups and zero-degree notes are not assigned to unrelated anchors", () => {
  const nodes = "abcdefghijk".split("").map(id => ({ id, title: id }));
  const pairs = [["a", "b"], ["a", "c"], ["a", "d"], ["b", "c"], ["b", "d"],
    ["c", "d"], ["e", "f"], ["g", "h"], ["i", "j"]];
  const edges = pairs.map(([fromNoteId, toNoteId]) => ({ fromNoteId, toNoteId }));
  const layout = graphBuildVisualLayout(nodes, edges, {}, layoutDeps);
  assertRealClusterPaths(layout, edges);
  for (const [from, to] of [["e", "f"], ["g", "h"], ["i", "j"]]) {
    assert.ok(layout.clusterMeta.some(cluster => cluster.memberIds.includes(from) && cluster.memberIds.includes(to)));
  }
  assert.equal(layout.nodeMap.get("k").clusterIndex, -1);
  assert.ok(layout.clusterMeta.every(cluster => !cluster.memberIds.includes("k")));
});

test("body and manual relations have equal influence on cluster membership", () => {
  const nodes = "abcdef".split("").map(id => ({ id, title: id }));
  const edges = [["a", "b"], ["b", "c"], ["d", "e"], ["e", "f"]]
    .map(([fromNoteId, toNoteId], i) => ({ fromNoteId, toNoteId, source: i % 2 ? "manual" : "body_wikilink" }));
  const first = graphBuildVisualLayout(nodes, edges, {}, layoutDeps);
  const swapped = graphBuildVisualLayout(nodes, edges.map(edge => ({ ...edge,
    source: edge.source === "manual" ? "body_wikilink" : "manual" })), {}, layoutDeps);
  assertRealClusterPaths(first, edges);
  assert.deepEqual(first.clusterMeta, swapped.clusterMeta);
  assert.deepEqual(first.nodes, swapped.nodes);
});

test("small real groups leave space between endpoint hit targets and relation midpoint", () => {
  const layout = graphBuildVisualLayout([{ id: "a" }, { id: "b" }], [{ fromNoteId: "a", toNoteId: "b" }], {}, layoutDeps);
  const a = layout.nodeMap.get("a"), b = layout.nodeMap.get("b");
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 44);
  assertRealClusterPaths(layout, [{ fromNoteId: "a", toNoteId: "b" }]);
});

test("more than four disconnected groups all retain their own real anchor", () => {
  const nodes = [], edges = [];
  for (let i = 0; i < 7; i += 1) {
    nodes.push({ id: `a${i}` }, { id: `b${i}` });
    edges.push({ fromNoteId: `a${i}`, toNoteId: `b${i}` });
  }
  const layout = graphBuildVisualLayout(nodes, edges, {}, layoutDeps);
  assert.equal(new Set(layout.clusterMeta.map(cluster => cluster.clusterKey)).size, 7);
  assertRealClusterPaths(layout, edges);
});

test("graph visual layout creates missing edge endpoint nodes and centers the focused note", () => {
  const layout = graphBuildVisualLayout(
    [{ id: "a", title: "Alpha" }],
    [{ fromNoteId: "a", toNoteId: "b", toTitle: "Beta", relationType: "supports" }],
    { focusedNoteId: "b" },
    layoutDeps
  );

  const focused = layout.nodeMap.get("b");
  const source = layout.nodeMap.get("a");

  assert.equal(layout.nodes[0].id, "b");
  assert.equal(focused.title, "Beta");
  assert.equal(focused.isFocused, true);
  assert.equal(focused.x, layout.width / 2);
  assert.equal(focused.y, layout.height / 2);
  assert.equal(source.isContext, true);
  assert.equal(source.outDegree, 1);
  assert.equal(focused.inDegree, 1);
});

test("graph visual layout groups connected notes into cluster metadata", () => {
  const layout = graphBuildVisualLayout(
    [
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" },
      { id: "c", title: "Gamma" },
      { id: "d", title: "Delta" },
      { id: "e", title: "Epsilon" },
      { id: "f", title: "Phi" }
    ],
    [
      { fromNoteId: "a", toNoteId: "b", relationType: "supports" },
      { fromNoteId: "a", toNoteId: "c", relationType: "extends" },
      { fromNoteId: "a", toNoteId: "d", relationType: "relates" },
      { fromNoteId: "a", toNoteId: "e", relationType: "supports" },
      { fromNoteId: "e", toNoteId: "f", relationType: "relates" }
    ],
    {},
    layoutDeps
  );

  const anchor = layout.nodes.find((node) => node.id === "a");
  const clustered = layout.nodes.find((node) => node.id === "f");

  assert.equal(anchor.isAnchor, true);
  assert.ok(Number.isInteger(clustered.clusterIndex));
  assert.ok(layout.clusterMeta.length > 0);
  assert.ok(layout.clusterMeta.some((cluster) => cluster.memberIds.includes("f")));
});

test("graph visual layout keeps isolated candidates out of clusters", () => {
  const layout = graphBuildVisualLayout(
    [
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" },
      { id: "iso", title: "Isolated", isGraphIsolatedCandidate: true }
    ],
    [{ fromNoteId: "a", toNoteId: "b", relationType: "supports" }],
    {},
    layoutDeps
  );

  const isolated = layout.nodeMap.get("iso");

  assert.equal(isolated.isGraphIsolatedCandidate, true);
  assert.equal(isolated.starTier, "isolated");
  assert.equal(isolated.clusterIndex, -1);
  assert.notEqual(isolated.y, layout.height / 2);
});
