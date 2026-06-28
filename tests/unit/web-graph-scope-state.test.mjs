import test from "node:test";
import assert from "node:assert/strict";
import {
  graphBuildFocusedRelationTypeStatsForRuntime,
  graphFocusedItemsForRuntime,
  graphLoadedScopeCoversDirectoryForRuntime,
  graphScopedItemsForRuntime,
  graphScopeDirectoryIdForRuntime
} from "../../apps/web/src/graph-scope-state.js";

const descendantDirectoryIds = (id) => ({
  root: ["root", "child", "grandchild"],
  child: ["child", "grandchild"],
  other: ["other"]
}[id] || [id].filter(Boolean));

test("graph scope state resolves selected original folder or root fallback", () => {
  const deps = {
    graphOriginalScopeDirectoryId: "root",
    isDirectoryUnderOriginalRoot: (id) => id === "child"
  };

  assert.equal(graphScopeDirectoryIdForRuntime({ selectedFolderId: "child" }, deps), "child");
  assert.equal(graphScopeDirectoryIdForRuntime({ selectedFolderId: "other" }, deps), "root");
  assert.equal(graphScopeDirectoryIdForRuntime({}, deps), "root");
});

test("graph scope state checks whether loaded graph covers a requested directory", () => {
  assert.equal(graphLoadedScopeCoversDirectoryForRuntime({ item: {}, lastLoadedDirectoryId: "root" }, "grandchild", { descendantDirectoryIds }), true);
  assert.equal(graphLoadedScopeCoversDirectoryForRuntime({ item: {}, lastLoadedDirectoryId: "child" }, "root", { descendantDirectoryIds }), false);
  assert.equal(graphLoadedScopeCoversDirectoryForRuntime({ lastLoadedDirectoryId: "root" }, "child", { descendantDirectoryIds }), false);
});

test("graph scope state filters graph items and adds focused loaded note stubs", () => {
  const graph = {
    nodes: [
      { id: "a", directoryId: "child" },
      { id: "b", folderId: "grandchild" },
      { id: "outside", directoryId: "other" }
    ],
    edges: [
      { fromNoteId: "a", toNoteId: "b" },
      { fromNoteId: "a", toNoteId: "outside" },
      { fromNoteId: "focused", toNoteId: "a" }
    ]
  };
  const scoped = graphScopedItemsForRuntime(graph, {
    scopeDirectoryId: "root",
    focusedNoteId: "focused",
    notes: [{ id: "focused", folderId: "child", title: "Focused", status: "active" }]
  }, {
    descendantDirectoryIds,
    typeFromFolder: () => "original"
  });

  assert.deepEqual(scoped.allNodes.map((node) => node.id), ["a", "b", "focused"]);
  assert.deepEqual(scoped.edges.map((edge) => `${edge.fromNoteId}->${edge.toNoteId}`), ["a->b", "focused->a"]);
  assert.deepEqual(scoped.nodes.map((node) => node.id), ["a", "b", "focused"]);
  assert.equal(scoped.allNodes.find((node) => node.id === "focused").noteType, "original");
});

test("graph scope state focuses traversal by selected depth", () => {
  const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const edges = [
    { fromNoteId: "a", toNoteId: "b" },
    { fromNoteId: "b", toNoteId: "c" },
    { fromNoteId: "c", toNoteId: "d" }
  ];

  const depthOne = graphFocusedItemsForRuntime(nodes, edges, nodes, edges, { focusedNoteId: "a", focusDepth: "1" });
  assert.deepEqual(depthOne.nodes.map((node) => node.id), ["a", "b"]);
  assert.equal(depthOne.edges.length, 1);

  const all = graphFocusedItemsForRuntime(nodes, edges, nodes, edges, { focusedNoteId: "a", focusDepth: "all" });
  assert.deepEqual(all.nodes.map((node) => node.id), ["a", "b", "c", "d"]);
  assert.equal(all.edges.length, 3);
});

test("graph scope state builds focused relation type stats with selected zero buckets", () => {
  const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const edges = [
    { fromNoteId: "a", toNoteId: "b", relationType: "supports", status: "confirmed" },
    { fromNoteId: "b", toNoteId: "c", relationType: "conflicts", status: "draft" }
  ];
  const graphEdgeMatchesFilters = (edge, filters = {}) => {
    const relationType = String(filters.relationType || "all");
    if (relationType !== "all" && relationType !== "meaningful" && String(edge.relationType) !== relationType) return false;
    const status = String(filters.status || "all");
    return status === "all" || String(edge.status) === status;
  };

  const stats = graphBuildFocusedRelationTypeStatsForRuntime(nodes, edges, nodes, {
    relationType: "bridges",
    status: "confirmed"
  }, {
    focusedNoteId: "a",
    focusDepth: "all"
  }, {
    graphEdgeMatchesFilters,
    normalizeGraphRelationTypeFilter: (value) => value || "meaningful"
  });

  assert.equal(stats.totalCount, 1);
  assert.equal(stats.meaningfulCount, 1);
  assert.equal(stats.counts.supports, 1);
  assert.equal(stats.counts.bridges, 0);
});
