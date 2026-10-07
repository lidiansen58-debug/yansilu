import test from "node:test";
import assert from "node:assert/strict";

import {
  renderGraphClusterSelectionPanelView
} from "../../apps/web/src/graph-cluster-selection-panel.js";
import { renderGraphSelectionShellView } from "../../apps/web/src/graph-selection-panel.js";

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
    renderGraphSelectionShell: (props) => {
      calls.push(["shell", props.className, props.title, props.roleLabel]);
      assert.equal(props.meta, "3 条笔记 · 2 条组内关系");
      return `<shell>${props.body}${props.actions}</shell>`;
    }
  });

  assert.doesNotMatch(html, /<theme-workspace>|关键笔记/);
  assert.match(html, /data-open-note="n1"/);
  assert.match(html, /data-graph-create-theme-index/);
  assert.match(html, /data-graph-theme-note-ids="n1,n2,n3"/);
  assert.equal((html.match(/data-graph-create-theme-index/g) || []).length, 1);
  assert.match(html, />整理主题<\/button>/);
  assert.match(html, /data-graph-open-relation-form data-graph-relation-source="n1"/);
  assert.equal((html.match(/data-open-note="n1"/g) || []).length, 1);
  assert.doesNotMatch(html, /下一步判断|思考提示|阅读首条笔记|Testing|Needs a boundary/);
  assert.match(html, /<summary class="graph-collapsible-summary">关系概况<\/summary>/);
  assert.match(html, /<dt>与组外笔记的关联<\/dt><dd>1 条/);
  assert.match(html, /<dt>反驳与限定关系<\/dt><dd>1 条/);
  assert.deepEqual(calls, [
    ["normalize", 1, 1, 1],
    ["unique", 1],
    ["meta", "c1", true, 1],
    ["shell", "is-cluster", "Theme A", undefined]
  ]);
});

function renderMemberPanel({ size = 7, clusterKey = "cluster-1", anchorId = "anchor/one", disclosureState = {} } = {}) {
  const notes = Array.from({ length: size }, (_, i) => ({ id: `n${i + 1}`, title: `Note ${i + 1}`, degree: size - i }));
  const escapeHtml = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return renderGraphClusterSelectionPanelView({
    selection: { kind: "cluster", clusterKey, anchorId, title: 'A <real> "group"' },
    clusterMeta: [{ clusterKey, anchorId }], disclosureState
  }, {
    escapeHtml,
    graphClusterResearchMeta: () => ({
      memberIds: notes.map(note => note.id), coreNotes: notes, memberEdges: [], externalEdges: [], counts: {},
      label: "可以成题", detail: "Computed maturity", next: "Generic next step"
    }),
    renderGraphSelectionShell: props => renderGraphSelectionShellView(props)
  });
}

test("all group members are reachable, with five notes first and the remainder collapsed", () => {
  const html = renderMemberPanel();
  const beforeDisclosure = html.slice(0, html.indexOf('<details class="graph-cluster-disclosure graph-cluster-more-notes"'));
  assert.equal((beforeDisclosure.match(/data-open-note=/g) || []).length, 5);
  assert.equal((html.match(/data-open-note=/g) || []).length, 7);
  assert.match(html, /其余 2 条笔记/);
  assert.match(html, /data-graph-section="cluster-anchor%2Fone-notes">/);
  assert.match(html, /data-graph-section="cluster-anchor%2Fone-relations">/);
  assert.doesNotMatch(html, /graph-selection-role|graph-selection-metrics|graph-selection-reason|graph-selection-prompts/);
  assert.match(html, /A &lt;real&gt; &quot;group&quot;/);
  assert.equal((html.match(/graph-selection-action is-primary/g) || []).length, 1);
  assert.match(html, /data-graph-theme-note-ids="n1,n2,n3,n4,n5,n6,n7"/);
});

test("native disclosure state follows the actual anchor, not the transient cluster number", () => {
  const disclosureState = { "cluster-anchor%2Fone-notes": true, "cluster-anchor%2Fone-relations": true };
  const html = renderMemberPanel({ clusterKey: "cluster-8", disclosureState });
  assert.match(html, /data-graph-section="cluster-anchor%2Fone-notes" open>/);
  assert.match(html, /data-graph-section="cluster-anchor%2Fone-relations" open>/);
  const other = renderMemberPanel({ clusterKey: "cluster-1", anchorId: "another-anchor", disclosureState });
  assert.doesNotMatch(other, /data-graph-section="[^"]+" open>/);
});

test("small groups have no empty extra-note disclosure and retain the theme minimum", () => {
  const html = renderMemberPanel({ size: 2 });
  assert.doesNotMatch(html, /graph-cluster-more-notes/);
  assert.equal((html.match(/data-open-note=/g) || []).length, 2);
  assert.match(html, /data-graph-theme-title="[^"]+" disabled>整理主题/);
  assert.doesNotMatch(html, /data-graph-relation-source="n1" disabled/);
});

test("graph cluster selection panel returns empty output for non-cluster selections", () => {
  assert.equal(renderGraphClusterSelectionPanelView({
    selection: { kind: "node", nodeId: "n1" }
  }, {
    normalizeGraphSelectionForVisibleItems: (selection) => selection
  }), "");
});
