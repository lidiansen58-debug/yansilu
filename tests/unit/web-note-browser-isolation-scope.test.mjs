import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function readGraphPanelStateBuilder() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-panel-state-builder.js"), "utf8");
}

test("graph panel keeps explorer isolation badges based on the full original-note network", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const networkDirectoryId = GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID;/);
  assert.match(source, /fetchDirectoryGraph\(networkDirectoryId, \{ includeDescendants: true, timeoutMs: 15000 \}\)/);
  assert.match(source, /graphState\.lastLoadedDirectoryId = graph \? networkDirectoryId : "";/);
});

test("graph panel derives connected note ids from all loaded graph edges instead of the current scoped folder", async () => {
  const source = await readPrototypeAppSource();
  const panelStateBuilderSource = readGraphPanelStateBuilder();

  assert.match(panelStateBuilderSource, /const allGraphEdges = Array\.isArray\(graph\?\.edges\) \? graph\.edges : \[\];/);
  assert.match(panelStateBuilderSource, /const connectedNoteIds = new Set\(\s*allGraphEdges\s*\.filter\(\(edge\) => graphRelationStatusCountsAsNetworkEdge\(edge\?\.status\)\)\s*\.flatMap/);
  assert.match(source, /state\.graphConnectedNoteIds = panelState\.connectedNoteIds \|\| new Set\(\);/);
  assert.doesNotMatch(source, /state\.graphConnectedNoteIds = new Set\(scoped\.nodes\.map\(\(node\) => node\.id\)\);/);
});
