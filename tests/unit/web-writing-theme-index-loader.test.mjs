import assert from "node:assert/strict";
import test from "node:test";
import { loadWritingThemeIndexesForRuntime } from "../../apps/web/src/writing-theme-index-loader.js";

test("a folder without themes offers the current Vault themes without changing the folder", async () => {
  const queries = [], writingState = {};
  const result = await loadWritingThemeIndexesForRuntime({ writingState, directoryId: "usage-notes",
    listIndexCards: async query => { queries.push(query); return query.directoryId ? [] : [{ id: "existing-theme" }]; },
    renderWritingPanel: () => {} });
  assert.deepEqual(result, [{ id: "existing-theme" }]);
  assert.deepEqual(queries, [
    { directoryId: "usage-notes", includeDescendants: true, indexType: "topic", limit: 12 },
    { includeDescendants: true, indexType: "topic", limit: 12 }
  ]);
  assert.deepEqual(writingState.themeIndexes, result);
});

test("an existing folder theme keeps the picker scoped", async () => {
  let calls = 0;
  const items = [{ id: "local-theme" }];
  assert.deepEqual(await loadWritingThemeIndexesForRuntime({ writingState: {}, directoryId: "has-themes",
    listIndexCards: async () => { calls++; return items; }, renderWritingPanel: () => {} }), items);
  assert.equal(calls, 1);
});

test("a changed Vault stops the empty-folder fallback before a second query", async () => {
  let current = true, calls = 0;
  const writingState = { themeIndexes: ["keep"] };
  assert.deepEqual(await loadWritingThemeIndexesForRuntime({ writingState, directoryId: "empty-folder",
    listIndexCards: async () => { calls++; current = false; return []; },
    renderWritingPanel: () => {}, isCurrent: () => current }), []);
  assert.equal(calls, 1);
  assert.deepEqual(writingState.themeIndexes, ["keep"]);
});

test("a late Vault-wide fallback cannot replace a newer picker", async () => {
  let release, current = true, renders = 0;
  const writingState = { themeIndexes: ["keep"] };
  const work = loadWritingThemeIndexesForRuntime({ writingState, directoryId: "empty-folder",
    listIndexCards: async query => query.directoryId ? [] : new Promise(resolve => { release = resolve; }),
    renderWritingPanel: () => renders++, isCurrent: () => current });
  await new Promise(resolve => setImmediate(resolve));
  current = false; release(["old-vault-theme"]);
  assert.deepEqual(await work, []);
  assert.deepEqual(writingState.themeIndexes, ["keep"]);
  assert.equal(renders, 1);
  assert.equal(writingState.loadingThemeIndexes, false);
});

test("late themes neither replace the current themes nor render a changed page", async () => {
  let resolve, current = true, renders = 0;
  const writingState = { themeIndexes: ["keep"] };
  const work = loadWritingThemeIndexesForRuntime({ writingState, directoryId: "original",
    listIndexCards: () => new Promise(done => { resolve = done; }),
    renderWritingPanel: () => renders++, isCurrent: () => current });
  current = false; resolve(["stale"]);
  assert.deepEqual(await work, []);
  assert.deepEqual(writingState.themeIndexes, ["keep"]);
  assert.equal(writingState.loadingThemeIndexes, false);
  assert.equal(renders, 1);
});

test("newer themes own loading and results even when an old request completes first", async () => {
  const pending = [], writingState = {};
  const deps = { writingState, listIndexCards: () => new Promise(resolve => pending.push(resolve)), renderWritingPanel: () => {} };
  const first = loadWritingThemeIndexesForRuntime(deps), second = loadWritingThemeIndexesForRuntime(deps);
  pending[0](["old"]); await first;
  assert.equal(writingState.loadingThemeIndexes, true);
  assert.equal(writingState.themeIndexes, undefined);
  pending[1](["new"]); assert.deepEqual(await second, ["new"]);
  assert.equal(writingState.loadingThemeIndexes, false);
});
