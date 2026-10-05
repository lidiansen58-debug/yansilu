import test from "node:test";
import assert from "node:assert/strict";
import { renderGraphBridgeSelectionPanelView } from "../../apps/web/src/graph-bridge-selection-panel.js";
import { createGraphSelectionResidualView } from "../../apps/web/src/graph-selection-residual-view.js";
import { createGraphSelectionPanelRenderer } from "../../apps/web/src/graph-selection-panel-renderer.js";

const nodeMap = new Map([
  ["a", { id: "a", title: "现在的标题 A", thesis: "真实判断 A" }],
  ["b", { id: "b", title: "现在的标题 B", thesis: "真实判断 B" }]
]);
const bridge = { noteId: "a", targetNoteId: "b", title: "过期标题", item: { rationale: "缺乏证据", suggestedAction: "必须桥接" } };
const deps = { renderGraphSelectionShell: (props) => `${props.title}|${props.roleLabel}|${props.roleDetail}|${props.body}|${props.actions}`, graphEdgeSelectionKey: (edge) => edge.id };

test("unlinked bridge shows actual viewpoints without made-up direction or diagnosis", () => {
  const html = renderGraphBridgeSelectionPanelView({ bridge, nodeMap }, deps);
  assert.match(html, /真实判断 A/);
  assert.match(html, /真实判断 B/);
  assert.match(html, /也可以保持不关联/);
  assert.match(html, /判断是否关联/);
  assert.doesNotMatch(html, /过期标题|必须桥接|缺乏证据|关系方向|data-graph-relation-type="bridges"/);
});

test("existing reverse relationship uses its actual direction and saved reason instead of creating another", () => {
  const html = renderGraphBridgeSelectionPanelView({ bridge, nodeMap, edges: [{ id: "real", fromNoteId: "b", toNoteId: "a", relationType: "qualifies", rationale: "只适用于条件 X" }] }, deps);
  assert.match(html, /已有关系/);
  assert.match(html, /现在的标题 B &rarr;/);
  assert.match(html, /只适用于条件 X/);
  assert.match(html, /data-graph-select-edge="real"/);
  assert.doesNotMatch(html, /data-graph-open-relation-form/);
});

test("body-link detail directs reading to original context, not a weak relationship warning", () => {
  const html = renderGraphBridgeSelectionPanelView({ bridge, nodeMap, edges: [{ id: "body", fromNoteId: "a", toNoteId: "b", rationale: "markdown_wikilink" }] }, deps);
  assert.match(html, /关联上下文在来源正文中/);
  assert.doesNotMatch(html, /markdown_wikilink|弱|必须补理由/);
});

test("stale source or target cannot expose a save action", () => {
  assert.equal(renderGraphBridgeSelectionPanelView({ bridge: { ...bridge, noteId: "gone" }, nodeMap }, deps), "");
  assert.equal(renderGraphBridgeSelectionPanelView({ bridge: { ...bridge, targetNoteId: "gone" }, nodeMap }, deps), "");
});

test("real selection dispatcher passes the resolver and saved edges into bridge detail", () => {
  const renderer = createGraphSelectionResidualView({ ...deps, createGraphSelectionPanelRenderer, resolveGraphBridgeSelection: () => bridge, normalizeGraphSelectionForVisibleItems: (selection) => selection });
  const html = renderer.renderGraphSelectionPanel({ selection: { kind: "bridge" }, nodeMap, edges: [{ id: "real", fromNoteId: "a", toNoteId: "b", rationale: "真实理由" }] });
  assert.match(html, /真实理由/);
  assert.match(html, /data-graph-select-edge="real"/);
});
