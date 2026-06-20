import test from "node:test";
import assert from "node:assert/strict";

import {
  graphOtherRelationEndpoint,
  graphThemeCandidateNoteIdsForNode,
  renderGraphRelationWorkspaceForNote,
  renderGraphThemeIndexWorkspace
} from "../../apps/web/src/prototype-graph-workspace.js";

const deps = {
  relationStatusCountsAsNetworkEdge: (status) => status !== "dismissed",
  relationGroupCounts: () => ({ support: 1, boundary: 1, bridge: 0 }),
  nodeTitle: (nodeMap, id, fallback = "") => nodeMap.get(id)?.title || fallback || id,
  suggestThemeIndexTitle: (ids) => `Theme ${ids.length}`,
  edgeSelectionKey: (edge) => `${edge.fromNoteId}->${edge.toNoteId}`,
  relationTypeLabel: (type) => `type:${type}`,
  renderSelectionMetrics: (items) => items.map((item) => `${item.label}:${item.value}`).join("|")
};

test("graph workspace helper finds the other relation endpoint", () => {
  assert.equal(graphOtherRelationEndpoint({ fromNoteId: "a", toNoteId: "b" }, "a"), "b");
  assert.equal(graphOtherRelationEndpoint({ fromNoteId: "a", toNoteId: "b" }, "b"), "a");
  assert.equal(graphOtherRelationEndpoint({ fromNoteId: "a", toNoteId: "b" }, "c"), "");
});

test("graph theme candidate ids combine current, formal, and AI candidate notes", () => {
  const ids = graphThemeCandidateNoteIdsForNode(
    "a",
    [
      { fromNoteId: "a", toNoteId: "b" },
      { fromNoteId: "c", toNoteId: "a" },
      { fromNoteId: "a", toNoteId: "b" }
    ],
    [{ counterpartNoteId: "d" }, { targetNoteId: "e" }]
  );

  assert.deepEqual(ids, ["a", "b", "c", "d", "e"]);
});

test("graph relation workspace renders saved relations and theme action metadata", () => {
  const nodeMap = new Map([
    ["a", { title: "Alpha" }],
    ["b", { title: "Beta" }],
    ["c", { title: "Gamma" }]
  ]);
  const html = renderGraphRelationWorkspaceForNote("a", {
    nodeMap,
    deps,
    edges: [
      { id: "e1", fromNoteId: "a", toNoteId: "b", relationType: "supports", rationale: "Because" },
      { id: "e2", fromNoteId: "c", toNoteId: "a", relationType: "bridges", status: "confirmed" },
      { id: "e3", fromNoteId: "a", toNoteId: "x", relationType: "same_topic", status: "dismissed" }
    ]
  });

  assert.match(html, /data-graph-select-edge="a-&gt;b"/);
  assert.match(html, /Beta/);
  assert.match(html, /Gamma/);
  assert.doesNotMatch(html, /data-graph-select-edge-to="x"/);
  assert.match(html, /data-graph-theme-note-ids="a,b,c"/);
  assert.doesNotMatch(html, /data-graph-create-theme-index[^>]* disabled/);
});

test("graph theme workspace disables creation until enough note ids exist", () => {
  const disabled = renderGraphThemeIndexWorkspace(["a", "b"], { deps });
  const enabled = renderGraphThemeIndexWorkspace(["a", "b", "c"], { deps, tone: "ready" });

  assert.match(disabled, /data-graph-create-theme-index[^>]* disabled/);
  assert.match(enabled, /is-ready/);
  assert.doesNotMatch(enabled, /data-graph-create-theme-index[^>]* disabled/);
});
