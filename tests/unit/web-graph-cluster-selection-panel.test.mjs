import test from "node:test";
import assert from "node:assert/strict";

import {
  renderGraphClusterSelectionPanelView
} from "../../apps/web/src/graph-cluster-selection-panel.js";

test("graph cluster selection panel renders cluster summary actions and core notes", () => {
  const calls = [];
  const html = renderGraphClusterSelectionPanelView({
    selection: { kind: "cluster", clusterKey: "c1", title: "Theme A" },
    clusterMeta: [{ clusterKey: "c1", title: "Cluster A" }],
    nodeMap: new Map([["n1", { id: "n1", title: "Note One", degree: 3 }]]),
    edges: [{ id: "e1" }]
  }, {
    normalizeGraphSelectionForVisibleItems: (selection, context) => {
      calls.push(["normalize", context.nodes.length, context.edges.length, context.clusterMeta.length]);
      return selection;
    },
    graphUniqueClusterMeta: (items) => {
      calls.push(["unique", items.length]);
      return items;
    },
    graphClusterResearchMeta: (cluster, context) => {
      calls.push(["meta", cluster.clusterKey, context.nodeMap.has("n1"), context.edges.length]);
      return {
        memberIds: ["n1", "n2", "n3"],
        memberEdges: [{ id: "e1" }, { id: "e2" }],
        externalEdges: [{ id: "e3" }],
        counts: { boundary: 1, conflict: 0 },
        coreNotes: [{ id: "n1", title: "Note One", degree: 3 }],
        label: "Testing",
        detail: "Needs a boundary",
        next: "Check whether this can become an argument.",
        tone: "testing"
      };
    },
    escapeHtml: (value) => String(value ?? "").replace(/"/g, "&quot;"),
    renderGraphSelectionMetrics: (items) => {
      calls.push(["metrics", items.map((item) => item.label).join("|")]);
      return `<metrics>${items.map((item) => item.value).join(",")}</metrics>`;
    },
    renderGraphThemeIndexWorkspace: (noteIds, options) => {
      calls.push(["theme", noteIds.join(","), options.title, options.relationCount, options.tone]);
      return "<theme-workspace></theme-workspace>";
    },
    renderGraphPromptDetails: (title, prompts) => {
      calls.push(["prompts", title, prompts.length]);
      return `<prompts>${prompts.join("|")}</prompts>`;
    },
    renderGraphSelectionShell: (props) => {
      calls.push(["shell", props.className, props.title, props.roleLabel]);
      return `<shell>${props.body}${props.actions}</shell>`;
    }
  });

  assert.match(html, /<theme-workspace><\/theme-workspace>/);
  assert.match(html, /data-open-note="n1"/);
  assert.match(html, /data-graph-create-theme-index/);
  assert.match(html, /data-graph-theme-note-ids="n1,n2,n3"/);
  assert.match(html, /data-graph-open-relation-form data-graph-relation-source="n1"/);
  assert.deepEqual(calls, [
    ["normalize", 1, 1, 1],
    ["unique", 1],
    ["meta", "c1", true, 1],
    ["metrics", "笔记|组内关系|外部连接|反方/边界"],
    ["theme", "n1,n2,n3", "Theme A", 2, "testing"],
    ["prompts", "思考提示（可选）", 3],
    ["shell", "is-cluster", "Theme A", "Testing"]
  ]);
});

test("graph cluster selection panel returns empty output for non-cluster selections", () => {
  assert.equal(renderGraphClusterSelectionPanelView({
    selection: { kind: "node", nodeId: "n1" }
  }, {
    normalizeGraphSelectionForVisibleItems: (selection) => selection
  }), "");
});
