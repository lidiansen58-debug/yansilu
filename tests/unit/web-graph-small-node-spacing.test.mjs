import assert from "node:assert/strict";
import test from "node:test";
import { separateSmallGraphNodes } from "../../apps/web/src/graph-small-node-spacing.js";
import { graphBuildVisualLayout } from "../../apps/web/src/graph-visual-layout.js";
import { graphVisualNodeViewState } from "../../apps/web/src/graph-visual-node-view.js";
import { graphHash, graphShortTitle } from "../../apps/web/src/graph-visual-geometry.js";

function assertLabelsDoNotCoverHits(nodes, edges = []) {
  const map = new Map(nodes.map(node => [node.id, node]));
  const adjacency = new Map(nodes.map(node => [node.id, new Set()]));
  for (const edge of edges) {
    adjacency.get(edge.fromNoteId).add(edge.toNoteId);
    adjacency.get(edge.toNoteId).add(edge.fromNoteId);
  }
  for (const node of nodes) {
    const view = graphVisualNodeViewState(node, 0, { smallGraph: true, adjacencyMap: adjacency, layoutNodeMap: map }, { graphShortTitle });
    const baseline = view.labelY + (view.labelAbove ? -8 : 20);
    const halfWidth = view.label.length * 13 + 3;
    for (const other of nodes) {
      if (node === other) continue;
      const dx = Math.max(0, Math.abs(other.x - node.x) - halfWidth);
      const dy = Math.max(baseline - 29 - other.y, other.y - baseline - 9, 0);
      assert.ok(Math.hypot(dx, dy) >= Math.max(44, other.radius + 6),
        `Mobile label intercepts another hit region: ${node.id}, ${other.id}`);
    }
  }
}

function assertSeparate(nodes) {
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
    assert.ok(Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) >= 88,
      `Hit areas overlap: ${nodes[a].id}, ${nodes[b].id}`);
  }
}

test("close graph hit regions separate without changing the selected anchor or relation metadata", () => {
  const nodes = [{ id: "anchor", x: 576, y: 94, radius: 8, degree: 1 },
    { id: "isolated", x: 548, y: 95, radius: 8, degree: 0 }];
  separateSmallGraphNodes(nodes, { width: 1080, height: 560, fixedNoteId: "anchor" });
  assertSeparate(nodes);
  assert.deepEqual(nodes[0], { id: "anchor", x: 576, y: 94, radius: 8, degree: 1 });
  assert.equal(nodes[1].degree, 0);
});

test("coincident small graph nodes separate deterministically and stay within the canvas", () => {
  const input = Array.from({ length: 12 }, (_, id) => ({ id: String(id), x: 20, y: 20, radius: 8 }));
  const first = structuredClone(input), second = structuredClone(input);
  separateSmallGraphNodes(first, { width: 1080, height: 560 });
  separateSmallGraphNodes(second, { width: 1080, height: 560 });
  assert.deepEqual(first, second); assertSeparate(first);
  assert.ok(first.every(n => n.x >= 52 && n.x <= 1028 && n.y >= 52 && n.y <= 508));
});

test("three-note linked and isolated layouts retain accessible hit regions across deterministic seed variations", () => {
  const nodes = [{ id: "source", title: "AI 关联来源" }, { id: "target", title: "AI 推荐目标" }, { id: "other", title: "迟到的推荐目标" }];
  const edges = [{ fromNoteId: "source", toNoteId: "target", relationType: "supports" }];
  for (let seed = 0; seed < 80; seed++) {
    const layout = graphBuildVisualLayout(nodes, edges, {}, { graphHash: id => seed + id.length });
    assertSeparate(layout.nodes);
    assert.equal(layout.nodeMap.get("source").degree, 1);
    assert.equal(layout.nodeMap.get("other").degree, 0);
    assert.deepEqual(layout.nodes.map(n => n.id).sort(), ["other", "source", "target"]);
  }
});

test("a mobile title cannot cover its neighbour despite already separate hit circles", () => {
  const nodes = [{ id: "target", title: "AI 推荐目标", x: 576, y: 94, radius: 8 },
    { id: "other", title: "迟到的推荐目标", x: 665.0165, y: 55.4522, radius: 8 }];
  separateSmallGraphNodes(nodes, { width: 1080, height: 560, fixedNoteId: "target" });
  assertSeparate(nodes);
  assertLabelsDoNotCoverHits(nodes);
  assert.equal(nodes[0].x, 576);
  assert.equal(nodes[0].y, 94);
});

test("twelve long titles retain distinct mobile hit regions and deterministic positions", () => {
  const input = Array.from({ length: 12 }, (_, id) => ({ id: String(id), title: "一条用于验证完整可点击区域的长标题", x: 20, y: 20, radius: 8 }));
  const first = structuredClone(input), second = structuredClone(input);
  separateSmallGraphNodes(first, { width: 1080, height: 560 });
  separateSmallGraphNodes(second, { width: 1080, height: 560 });
  assert.deepEqual(first, second);
  assertSeparate(first);
  assertLabelsDoNotCoverHits(first);
  assert.ok(first.every(n => n.x >= 52 && n.x <= 1028 && n.y >= 52 && n.y <= 508));
});

test("linked and isolated titles cannot intercept mobile node hits across seed variations", () => {
  const nodes = [{ id: "source", title: "AI 关联来源" }, { id: "target", title: "AI 推荐目标" }, { id: "other", title: "迟到的推荐目标" }];
  const edges = [{ fromNoteId: "source", toNoteId: "target", relationType: "supports" }];
  for (let seed = 0; seed < 80; seed++) {
    const layout = graphBuildVisualLayout(nodes, edges, {}, { graphHash: id => seed + id.length });
    assertLabelsDoNotCoverHits(layout.nodes, edges);
  }
});

test("twelve linked long-title notes fit without label interception for ordinary and focused layouts", () => {
  for (let seed = 0; seed < 25; seed++) for (const focused of [false, true]) {
    const nodes = Array.from({ length: 12 }, (_, i) => ({ id: `note-${seed}-${i}`, title: "这是用于验证小图标题布局的长标题" }));
    const edges = nodes.slice(1).map((node, i) => ({ fromNoteId: nodes[i].id, toNoteId: node.id, relationType: "supports" }));
    const layout = graphBuildVisualLayout(nodes, edges, focused ? { focusedNoteId: nodes[4].id } : {}, { graphHash });
    assertSeparate(layout.nodes);
    assertLabelsDoNotCoverHits(layout.nodes, edges);
    assert.ok(layout.nodes.every(node => node.x >= 52 && node.x <= 1028 && node.y >= 52 && node.y <= 508));
    if (focused) {
      assert.equal(layout.nodeMap.get(nodes[4].id).x, 540);
      assert.equal(layout.nodeMap.get(nodes[4].id).y, 280);
    }
  }
});
