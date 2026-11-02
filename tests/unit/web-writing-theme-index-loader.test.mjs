import assert from "node:assert/strict";
import test from "node:test";
import { loadWritingThemeIndexesForRuntime } from "../../apps/web/src/writing-theme-index-loader.js";

test("the theme library includes saved themes outside the materials folder even when that folder has themes", async () => {
  const queries = [], writingState = {};
  const items = [{ id: "saved-graph-theme" }, { id: "folder-theme" }];
  const result = await loadWritingThemeIndexesForRuntime({ writingState, directoryId: "materials-folder",
    listIndexCards: async query => { queries.push(query); return query.directoryId ? [items[1]] : items; },
    renderWritingPanel: () => {} });
  assert.deepEqual(result, items);
  assert.deepEqual(queries, [
    { includeDescendants: true, indexType: "topic", limit: 50 }
  ]);
  assert.deepEqual(writingState.themeIndexes, result);
});

test("the Vault library does not need a second query for an empty selected folder", async () => {
  let calls = 0;
  const items = [{ id: "local-theme" }];
  assert.deepEqual(await loadWritingThemeIndexesForRuntime({ writingState: {}, directoryId: "has-themes",
    listIndexCards: async () => { calls++; return items; }, renderWritingPanel: () => {} }), items);
  assert.equal(calls, 1);
});

test("a changed Vault stops a library request before publishing its result", async () => {
  let current = true, calls = 0;
  const writingState = { themeIndexes: ["keep"] };
  assert.deepEqual(await loadWritingThemeIndexesForRuntime({ writingState, directoryId: "empty-folder",
    listIndexCards: async () => { calls++; current = false; return []; },
    renderWritingPanel: () => {}, isCurrent: () => current }), []);
  assert.equal(calls, 1);
  assert.deepEqual(writingState.themeIndexes, ["keep"]);
});

test("a late Vault-wide load cannot replace a newer picker", async () => {
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

test("the Vault library reads past fifty and deduplicates moving rows", async () => {
  const items = Array.from({ length: 53 }, (_, i) => ({ id: `theme-${i}` }));
  const queries = [], writingState = {};
  const loaded = await loadWritingThemeIndexesForRuntime({ writingState, directoryId: "current-folder",
    listIndexCards: async query => { queries.push(query); return query.offset ? [items[49], ...items.slice(50)] : items.slice(0, 50); },
    renderWritingPanel: () => {} });
  assert.deepEqual(loaded, items);
  assert.equal(queries.length, 2);
  assert.deepEqual(queries[1], { includeDescendants: true, indexType: "topic", limit: 50, offset: 50 });
});

test("a changed Vault during a later page cannot publish partial old themes or continue paging", async () => {
  let release, current = true;
  const queries = [], writingState = { themeIndexes: ["current"] };
  const work = loadWritingThemeIndexesForRuntime({ writingState, directoryId: "old",
    listIndexCards: query => { queries.push(query); return query.offset ? new Promise(resolve => { release = resolve; }) : Array.from({ length: 50 }, (_, i) => ({ id: `old-${i}` })); },
    renderWritingPanel: () => {}, isCurrent: () => current });
  await new Promise(resolve => setImmediate(resolve));
  current = false; release(Array.from({ length: 50 }, (_, i) => ({ id: `late-${i}` })));
  assert.deepEqual(await work, []);
  assert.deepEqual(writingState.themeIndexes, ["current"]);
  assert.equal(queries.length, 2);
});

test("a server ignoring offsets fails instead of looping or presenting a partial library", async () => {
  const items = Array.from({ length: 50 }, (_, i) => ({ id: `theme-${i}` }));
  let calls = 0;
  const writingState = { themeIndexes: ["keep"] };
  await assert.rejects(loadWritingThemeIndexesForRuntime({ writingState,
    listIndexCards: async () => { calls++; return items; }, renderWritingPanel: () => {} }), /未能完整读取/);
  assert.equal(calls, 2);
  assert.deepEqual(writingState.themeIndexes, ["keep"]);
  assert.equal(writingState.loadingThemeIndexes, false);
});
