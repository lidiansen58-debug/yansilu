import test from "node:test";
import assert from "node:assert/strict";

import {
  refreshDirectoryGraphForRuntime
} from "../../apps/web/src/graph-refresh-controller.js";

test("graph refresh syncs the network scope and repaints the full shell after success", async () => {
  const calls = [];
  const graphState = {};
  const graph = { nodes: [{ id: "n1" }], edges: [] };
  const result = await refreshDirectoryGraphForRuntime({
    graphState,
    graphScopeDirectoryId: () => "selected-dir",
    graphOriginalScopeDirectoryId: "original-root",
    graphLoadedScopeCoversDirectory: () => false,
    syncNotesForDirectoryTree: async (directoryId) => calls.push(["sync", directoryId]),
    fetchDirectoryGraph: async (directoryId, options) => {
      calls.push(["graph", directoryId, options]);
      return graph;
    },
    fetchGraphConflicts: async (options) => {
      calls.push(["conflicts", options]);
      return { items: [] };
    },
    fetchRelationReviewQueue: async (options) => {
      calls.push(["review", options]);
      return { items: ["r1"], total: 1 };
    },
    upsertGraphNodeSummaries: (nodes) => calls.push(["summaries", nodes.map((node) => node.id)]),
    renderGraphPanel: () => calls.push(["panel"]),
    renderAll: () => calls.push(["all"]),
    nowIso: () => "2026-01-01T00:00:00.000Z"
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ["panel"],
    ["sync", "original-root"],
    ["graph", "original-root", { includeDescendants: true, timeoutMs: 15000 }],
    ["conflicts", { directoryId: "selected-dir", includeDescendants: true }],
    ["review", { directoryId: "selected-dir", includeDescendants: true, limit: 8 }],
    ["summaries", ["n1"]],
    ["all"]
  ]);
  assert.equal(graphState.loading, false);
  assert.equal(graphState.error, "");
  assert.equal(graphState.item, graph);
  assert.equal(graphState.lastLoadedDirectoryId, "original-root");
  assert.equal(graphState.lastLoadedAt, "2026-01-01T00:00:00.000Z");
  assert.deepEqual(graphState.reviewQueue, { items: ["r1"], total: 1 });
});

test("graph refresh clears stale graph data on failure when the loaded scope cannot be reused", async () => {
  const calls = [];
  const graphState = {
    item: { nodes: [{ id: "old" }] },
    lastLoadedDirectoryId: "old-dir",
    lastLoadedAt: "old",
    conflicts: { items: ["old"] },
    reviewQueue: { items: ["old"] }
  };

  const result = await refreshDirectoryGraphForRuntime({
    graphState,
    graphScopeDirectoryId: () => "selected-dir",
    graphOriginalScopeDirectoryId: "original-root",
    graphLoadedScopeCoversDirectory: () => false,
    syncNotesForDirectoryTree: async () => {},
    fetchDirectoryGraph: async () => {
      throw new Error("boom");
    },
    graphLoadErrorMessage: (error) => `friendly:${error.message}`,
    renderGraphPanel: () => calls.push("panel"),
    renderAll: () => calls.push("all"),
    nowIso: () => "2026-01-02T00:00:00.000Z"
  });

  assert.equal(result, false);
  assert.deepEqual(calls, ["panel", "all"]);
  assert.equal(graphState.loading, false);
  assert.equal(graphState.error, "friendly:boom");
  assert.equal(graphState.lastErrorAt, "2026-01-02T00:00:00.000Z");
  assert.equal(graphState.item, null);
  assert.equal(graphState.lastLoadedDirectoryId, "");
  assert.equal(graphState.lastLoadedAt, "");
  assert.equal(graphState.conflicts, null);
  assert.equal(graphState.reviewQueue, null);
});

test("graph refresh keeps reusable graph data on a transient failure", async () => {
  const graphState = {
    item: { nodes: [{ id: "old" }] },
    lastLoadedDirectoryId: "original-root",
    lastLoadedAt: "old",
    conflicts: { items: ["old"] },
    reviewQueue: { items: ["old"] }
  };

  await refreshDirectoryGraphForRuntime({
    graphState,
    graphScopeDirectoryId: () => "selected-dir",
    graphOriginalScopeDirectoryId: "original-root",
    graphLoadedScopeCoversDirectory: () => true,
    fetchDirectoryGraph: async () => {
      throw new Error("temporary");
    }
  });

  assert.deepEqual(graphState.item, { nodes: [{ id: "old" }] });
  assert.equal(graphState.lastLoadedDirectoryId, "original-root");
  assert.deepEqual(graphState.conflicts, { items: ["old"] });
  assert.deepEqual(graphState.reviewQueue, { items: ["old"] });
});
