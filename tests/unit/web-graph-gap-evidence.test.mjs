import test from "node:test";
import assert from "node:assert/strict";
import { buildGraphThinkingItemsForGraph } from "../../apps/web/src/graph-thinking-items-model.js";

const nodes = [{ id: "a", title: "观点 A", thesis: "原始判断 A" }, { id: "b", title: "观点 B" }];
const deps = { graphSelectEdgeActionAttrs: (edge) => `data-graph-select-edge="${edge.id}"` };

test("local isolated notes are actionable without any AI analysis", () => {
  const items = buildGraphThinkingItemsForGraph({ nodes, isolatedNotes: [{ noteId: "a" }, { noteId: "deleted" }] });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "观点 A");
  assert.equal(items[0].detail, "原始判断 A");
  assert.equal(items[0].meta, "当前范围内没有已保存的关系");
  assert.match(items[0].actionAttrs, /data-graph-isolated-note="a"/);
  assert.match(items[0].question, /没有就保持独立/);
});

test("a stale isolated suggestion cannot override a real body relation", () => {
  const items = buildGraphThinkingItemsForGraph({ nodes, edges: [
    { id: "body", fromNoteId: "a", toNoteId: "b", rationale: "markdown_wikilink" }
  ], isolatedNotes: [{ noteId: "a" }] }, deps);
  assert.equal(items.length, 0);
});

test("one isolated note is not repeated as a targetless bridge gap", () => {
  const items = buildGraphThinkingItemsForGraph({ nodes,
    isolatedNotes: [{ noteId: "a" }],
    bridgeGaps: [{ id: "duplicate", noteIds: ["a"], targetNoteIds: [] }]
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].tone, "isolated");
});

test("missing explicit reason identifies the actual pair without judging its validity", () => {
  const items = buildGraphThinkingItemsForGraph({ nodes, edges: [
    { id: "real", fromNoteId: "a", toNoteId: "b", relationType: "supports", rationale: "" },
    { id: "deleted", fromNoteId: "a", toNoteId: "missing", rationale: "" }
  ] }, deps);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "观点 A -> 观点 B");
  assert.match(items[0].detail, /不代表关系不成立/);
  assert.equal(items[0].actionAttrs, 'data-graph-select-edge="real"');
});

test("reviewed body links retain their context rather than a weak-link accusation", () => {
  const items = buildGraphThinkingItemsForGraph({ nodes, reviewQueue: { items: [
    { id: "body", fromNoteId: "a", toNoteId: "b", rationale: "markdown_wikilink" }
  ] } }, deps);
  assert.match(items[0].meta, /正文关联/);
  assert.doesNotMatch(items[0].detail, /还没有写清|导航链接|markdown_wikilink/);
  assert.match(items[0].detail, /已有链接无需重复建立/);
});

test("bridge clues use actual endpoints and do not present generated diagnosis as proof", () => {
  const items = buildGraphThinkingItemsForGraph({ nodes, bridgeGaps: [
    { id: "gap", noteIds: ["a"], targetNoteIds: ["b"], rationale: "必须补证据", suggestedAction: "必须桥接" },
    { id: "bad", noteIds: ["a"], targetNoteIds: ["missing"] }
  ] });
  assert.equal(items.length, 1);
  assert.match(items[0].detail, /分处两组不代表必须关联/);
  assert.doesNotMatch(items[0].detail, /必须补证据|必须桥接/);
  assert.deepEqual(items[0].highlightNodeIds, ["a", "b"]);
});
