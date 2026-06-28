import test from "node:test";
import assert from "node:assert/strict";

import {
  renderGraphMapPreviewView
} from "../../apps/web/src/graph-map-preview-view.js";

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const deps = {
  escapeHtml,
  graphRelationGroupMeta: (type) => type === "supports"
    ? { label: "支持", className: "is-support" }
    : { label: "", className: "" },
  graphRelationTypeLabel: (type) => type === "supports" ? "支持" : "关联"
};

test("graph map preview renders an empty note state", () => {
  const html = renderGraphMapPreviewView([], [], new Set(), deps);

  assert.match(html, /结构预览/);
  assert.match(html, /当前范围暂无笔记/);
  assert.match(html, /graph-empty/);
});

test("graph map preview renders relation rows with linked node state", () => {
  const html = renderGraphMapPreviewView(
    [
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" }
    ],
    [{ fromNoteId: "a", toNoteId: "b", relationType: "supports" }],
    new Set(["a"]),
    deps
  );

  assert.match(html, /展示前 1 条关系/);
  assert.match(html, /data-state="linked">Alpha/);
  assert.match(html, /data-state="">Beta/);
  assert.match(html, /graph-map-link is-support/);
  assert.match(html, /<small>支持<\/small>/);
});

test("graph map preview renders isolated rows when there are no edges", () => {
  const html = renderGraphMapPreviewView(
    [{ id: "a", title: "Alpha" }],
    [],
    new Set(),
    deps
  );

  assert.match(html, /当前主要是待关联笔记/);
  assert.match(html, /data-state="isolated">Alpha/);
  assert.match(html, /未连接/);
});

test("graph map preview limits visible edges and reports the remainder", () => {
  const nodes = Array.from({ length: 8 }, (_, index) => ({ id: `n${index}`, title: `Node ${index}` }));
  const edges = Array.from({ length: 7 }, (_, index) => ({
    fromNoteId: `n${index}`,
    toNoteId: `n${index + 1}`,
    relationType: "supports"
  }));

  const html = renderGraphMapPreviewView(nodes, edges, new Set(), deps);

  assert.match(html, /展示前 5 条关系/);
  assert.match(html, /还有 2 条关系在下方列表中/);
  assert.equal((html.match(/graph-map-node-row/g) || []).length, 5);
});
