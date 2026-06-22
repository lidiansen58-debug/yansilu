import test from "node:test";
import assert from "node:assert/strict";
import { graphBuildVisualLayout } from "../../apps/web/src/graph-visual-layout.js";

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
