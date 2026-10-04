import test from "node:test";
import assert from "node:assert/strict";
import { graphLocalThemeGroups } from "../../apps/web/src/graph-local-theme-groups.js";
import { buildGraphThinkingItemsForGraph } from "../../apps/web/src/graph-thinking-items-model.js";

const nodes = ["a", "b", "c", "d"].map((id) => ({ id, title: `真实观点 ${id}`, noteType: "permanent" }));
const edge = (fromNoteId, toNoteId, extra = {}) => ({ fromNoteId, toNoteId, relationType: "supports", rationale: "真实理由", status: "confirmed", ...extra });

test("local themes use direct saved relationships, with equal body and external associations", () => {
  const edges = [edge("a", "b", { rationale: "markdown_wikilink", createdBy: "markdown_wikilink" }), edge("c", "a")];
  const groups = graphLocalThemeGroups({ nodes, edges });
  assert.equal(groups.length, 1);
  assert.deepEqual(new Set(groups[0].noteIds), new Set(["a", "b", "c"]));
  assert.deepEqual(groups[0].edges, edges);
  assert.ok(!groups[0].noteIds.includes("d"));
});

test("title similarity, rejected or unconfirmed edges and absent endpoints cannot make a theme group", () => {
  assert.deepEqual(graphLocalThemeGroups({ nodes, edges: [edge("a", "b"), edge("a", "c", { status: "suggested" }), edge("a", "d", { status: "dismissed" }), edge("a", "missing")] }), []);
  assert.deepEqual(graphLocalThemeGroups({ nodes, edges: [] }), []);
});

test("duplicate pairs and equal member sets do not duplicate materials or groups", () => {
  const groups = graphLocalThemeGroups({ nodes, edges: [edge("a", "b"), edge("b", "a"), edge("b", "c"), edge("c", "a")] });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].noteIds.length, 3);
});

test("non-permanent and out-of-scope notes are not carried into local material groups", () => {
  assert.deepEqual(graphLocalThemeGroups({ nodes: [nodes[0], nodes[1], { ...nodes[2], noteType: "index" }], edges: [edge("a", "b"), edge("a", "c"), edge("a", "d")] }), []);
});

test("local material action works without AI and does not invent a question, reason or quality ranking", () => {
  const item = buildGraphThinkingItemsForGraph({ nodes, edges: [edge("a", "b"), edge("a", "c")] }).find((item) => item.view === "theme");
  assert.match(item.meta, /3 条笔记 · 2 条已保存关系/);
  assert.equal(item.detail, "真实观点 b、真实观点 c");
  assert.match(item.actionAttrs, /data-graph-create-theme-index/);
  assert.match(item.actionAttrs, /data-graph-theme-note-ids="a,b,c"/);
  assert.doesNotMatch(item.actionAttrs, /central-question|rationale|run-graph-ai/);
  assert.doesNotMatch(item.meta, /成熟|高质量|值得/);
});
