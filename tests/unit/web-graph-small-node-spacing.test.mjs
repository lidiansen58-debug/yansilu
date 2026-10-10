import assert from "node:assert/strict";
import test from "node:test";
import { separateSmallGraphNodes } from "../../apps/web/src/graph-small-node-spacing.js";
import { graphBuildVisualLayout } from "../../apps/web/src/graph-visual-layout.js";

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
