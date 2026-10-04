import test from "node:test";
import assert from "node:assert/strict";
import { renderRelationPairPreview } from "../../apps/web/src/relation-pair-preview.js";

const note = { id: "a", title: "当前观点", thesis: "判断需要证据" };
const target = { id: "b", title: "已有观点", thesis: "证据需要核对来源" };

test("relation pair shows real excerpts and outgoing direction", () => {
  const html = renderRelationPairPreview({ note, target, relationType: "supports" });
  assert.match(html, /判断需要证据/);
  assert.match(html, /证据需要核对来源/);
  assert.match(html, /当前观点 &rarr; <span data-relation-pair-type>支持<\/span> &rarr; 已有观点/);
});

test("editing an incoming relation preserves the original endpoints", () => {
  const html = renderRelationPairPreview({ note, target, existing: { from_note_id: "b", to_note_id: "a" }, relationType: "qualifies" });
  assert.match(html, /已有观点 &rarr; <span data-relation-pair-type>限定<\/span> &rarr; 当前观点/);
});

test("missing content is not replaced with an invented viewpoint and titles are escaped", () => {
  const html = renderRelationPairPreview({ note: { id: "a", title: "<script>" }, target: { id: "b" } });
  assert.doesNotMatch(html, /<script>|<p>/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(renderRelationPairPreview({ note }), "");
});
