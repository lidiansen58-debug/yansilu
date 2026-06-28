import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  refreshDirectoryGraphForRuntime
} from "../../apps/web/src/graph-refresh-controller.js";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function readGraphPanelStateBuilder() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-panel-state-builder.js"), "utf8");
}

function readGraphPanelShell() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-panel-shell.js"), "utf8");
}

test("graph panel keeps explorer isolation badges based on the full original-note network", async () => {
  const calls = [];
  const graphState = {};
  const graph = { nodes: [{ id: "n1" }], edges: [] };

  await refreshDirectoryGraphForRuntime({
    graphState,
    graphScopeDirectoryId: () => "scoped-folder",
    graphOriginalScopeDirectoryId: "original-root",
    syncNotesForDirectoryTree: async (directoryId) => calls.push(["sync", directoryId]),
    fetchDirectoryGraph: async (directoryId, options) => {
      calls.push(["graph", directoryId, options]);
      return graph;
    },
    fetchGraphConflicts: async (options) => {
      calls.push(["conflicts", options]);
      return null;
    },
    fetchRelationReviewQueue: async (options) => {
      calls.push(["review", options]);
      return { items: [], total: 0 };
    }
  });

  assert.deepEqual(calls, [
    ["sync", "original-root"],
    ["graph", "original-root", { includeDescendants: true, timeoutMs: 15000 }],
    ["conflicts", { directoryId: "scoped-folder", includeDescendants: true }],
    ["review", { directoryId: "scoped-folder", includeDescendants: true, limit: 8 }]
  ]);
  assert.equal(graphState.lastLoadedDirectoryId, "original-root");
  assert.equal(graphState.item, graph);
});

test("graph panel derives connected note ids from all loaded graph edges instead of the current scoped folder", async () => {
  const panelShellSource = readGraphPanelShell();
  const panelStateBuilderSource = readGraphPanelStateBuilder();

  assert.match(panelStateBuilderSource, /const allGraphEdges = Array\.isArray\(graph\?\.edges\) \? graph\.edges : \[\];/);
  assert.match(panelStateBuilderSource, /const connectedNoteIds = new Set\(\s*allGraphEdges\s*\.filter\(\(edge\) => graphRelationStatusCountsAsNetworkEdge\(edge\?\.status\)\)\s*\.flatMap/);
  assert.match(panelShellSource, /appState\.graphConnectedNoteIds = panelState\?\.connectedNoteIds \|\| new Set\(\);/);
  assert.doesNotMatch(panelShellSource, /graphConnectedNoteIds = new Set\(scoped\.nodes\.map\(\(node\) => node\.id\)\);/);
});
