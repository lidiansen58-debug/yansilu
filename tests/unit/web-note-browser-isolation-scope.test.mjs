import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("graph panel keeps explorer isolation badges based on the full original-note network", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const networkDirectoryId = GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID;/);
  assert.match(source, /fetchDirectoryGraph\(networkDirectoryId, \{ includeDescendants: true, timeoutMs: 15000 \}\)/);
  assert.match(source, /graphState\.lastLoadedDirectoryId = graph \? networkDirectoryId : "";/);
});

test("graph panel derives connected note ids from all loaded graph edges instead of the current scoped folder", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const allGraphEdges = Array\.isArray\(graph\?\.edges\) \? graph\.edges : \[\];/);
  assert.match(source, /state\.graphConnectedNoteIds = new Set\(\s*allGraphEdges\s*\.filter\(\(edge\) => graphRelationStatusCountsAsNetworkEdge\(edge\?\.status\)\)\s*\.flatMap/);
  assert.doesNotMatch(source, /state\.graphConnectedNoteIds = new Set\(scoped\.nodes\.map\(\(node\) => node\.id\)\);/);
});
