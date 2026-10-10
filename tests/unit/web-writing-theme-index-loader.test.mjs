import assert from "node:assert/strict";
import test from "node:test";
import { loadWritingThemeIndexesForRuntime } from "../../apps/web/src/writing-theme-index-loader.js";

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
