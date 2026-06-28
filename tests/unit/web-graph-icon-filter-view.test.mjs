import test from "node:test";
import assert from "node:assert/strict";
import { graphFilterOptionsForRuntime } from "../../apps/web/src/graph-filter-options-view.js";
import { renderGraphIconView } from "../../apps/web/src/graph-icon-view.js";

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

test("graph icon view renders named and fallback icons", () => {
  assert.match(renderGraphIconView("close"), /M5\.5 5\.5L14\.5 14\.5/);
  assert.match(renderGraphIconView("unknown"), /M5 10H15/);
});

test("graph filter options render relation type groups and selected fallback", () => {
  const html = graphFilterOptionsForRuntime(
    [
      { relationType: "supports" },
      { relationType: "supports" },
      { relationType: "contrasts" },
      { relationType: "mentions" }
    ],
    "relationType",
    "missing_type",
    "全部关系",
    (value) => ({ supports: "支持", contrasts: "对照", mentions: "普通链接" }[value] || value),
    {
      counts: { supports: 2, contrasts: 1, mentions: 1 },
      meaningfulCount: 3,
      noisyCount: 1,
      indexCount: 0,
      totalCount: 4
    },
    {
      escapeHtml,
      normalizeGraphRelationTypeFilter: (value) => value || "meaningful",
      graphRelationGroupMeta: (value) => {
        if (value === "supports") return { key: "support" };
        if (value === "contrasts") return { key: "conflict" };
        return { key: "neutral" };
      },
      GRAPH_RELATION_GROUP_META: {
        support: { label: "支持" },
        conflict: { label: "冲突" },
        neutral: { label: "其他" }
      },
      GRAPH_MEANINGFUL_RELATION_TYPES: new Set(["supports", "contrasts"]),
      GRAPH_INDEX_RELATION_TYPES: new Set(["part_of"]),
      GRAPH_LINK_CLUE_RELATION_TYPES: new Set(["mentions"])
    }
  );

  assert.match(html, /先看正式关系 \(3\)/);
  assert.match(html, /只看普通链接 \(1\)/);
  assert.match(html, /value="missing_type" selected/);
  assert.match(html, /<optgroup label="支持 \(2\)">/);
  assert.match(html, /支持 \(2\)/);
});
