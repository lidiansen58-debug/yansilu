import test from "node:test";
import assert from "node:assert/strict";

import {
  GRAPH_RELATION_MARKER_COLORS,
  graphEdgeSelectionKey,
  graphRelationGroupMeta,
  graphRelationVisual
} from "../../apps/web/src/graph-relation-visual-state.js";

test("graph relation visual state maps relation types to visual groups", () => {
  assert.deepEqual(graphRelationVisual("supports"), { key: "support", className: "is-support" });
  assert.deepEqual(graphRelationVisual("contradicts"), { key: "conflict", className: "is-conflict" });
  assert.deepEqual(graphRelationVisual("belongs_to_topic"), { key: "index", className: "is-index" });
  assert.deepEqual(graphRelationVisual("unknown"), { key: "neutral", className: "is-neutral" });
});

test("graph relation visual state merges group copy with class metadata", () => {
  assert.deepEqual(graphRelationGroupMeta("bridges"), {
    key: "bridge",
    className: "is-bridge",
    label: "桥接关系",
    shortLabel: "桥接",
    detail: "把当前笔记连到另一个主题、问题或过渡概念。"
  });
  assert.equal(graphRelationGroupMeta("free_link").shortLabel, "链接");
});

test("graph relation visual state derives stable edge selection keys", () => {
  assert.equal(graphEdgeSelectionKey({ id: "rel-1" }), "id:rel-1");
  assert.equal(
    graphEdgeSelectionKey({
      fromNoteId: "a",
      toNoteId: "b",
      relationType: "Supports",
      createdBy: "AI"
    }),
    "pair::a::b::supports::ai"
  );
});

test("graph relation visual state exposes marker colors for every group", () => {
  for (const key of ["index", "neutral", "support", "flow", "conflict", "boundary", "bridge"]) {
    assert.match(GRAPH_RELATION_MARKER_COLORS[key], /^#[0-9a-f]{6}$/i);
  }
});
