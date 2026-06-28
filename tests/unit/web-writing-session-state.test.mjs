import test from "node:test";
import assert from "node:assert/strict";

import {
  clearWritingFocusedCandidateScopeForRuntime,
  clearWritingSourceIndexIdsForRuntime,
  clearWritingThemeRelationCountsForRuntime,
  resetWritingStrongModelStateForRuntime,
  setWritingFocusedCandidateScopeForRuntime,
  setWritingSourceIndexIdsForRuntime
} from "../../apps/web/src/writing-session-state.js";

test("writing session state clears theme relation counts for a normalized note scope", () => {
  const writingState = {
    themeRelationNoteIds: ["old"],
    themeRelationCounts: { old: 2 },
    themeRelationCountErrors: { old: "failed" },
    loadingThemeRelationCounts: true
  };

  assert.deepEqual(clearWritingThemeRelationCountsForRuntime(writingState, [" n1 ", "n1", "n2"]), ["n1", "n2"]);
  assert.deepEqual(writingState.themeRelationCounts, {});
  assert.deepEqual(writingState.themeRelationCountErrors, {});
  assert.equal(writingState.loadingThemeRelationCounts, false);
});

test("writing session state stores and clears focused candidate scope", () => {
  const writingState = {};

  assert.deepEqual(setWritingFocusedCandidateScopeForRuntime(writingState, ["n1", " n2 ", "n1"], " 当前图谱 "), {
    noteIds: ["n1", "n2"],
    scopeLabel: "当前图谱"
  });
  assert.deepEqual(clearWritingFocusedCandidateScopeForRuntime(writingState), {
    noteIds: [],
    scopeLabel: ""
  });
});

test("writing session state stores and clears source index ids", () => {
  const writingState = {};

  assert.deepEqual(setWritingSourceIndexIdsForRuntime(writingState, ["idx1", " idx2 ", "idx1"]), ["idx1", "idx2"]);
  assert.deepEqual(clearWritingSourceIndexIdsForRuntime(writingState), []);
});

test("writing session state resets strong model state and increments revision", () => {
  const writingState = {
    strongModelRevision: 4,
    strongModelLoading: true,
    strongModelResult: { ok: true },
    strongModelError: "failed"
  };

  assert.equal(resetWritingStrongModelStateForRuntime(writingState), 5);
  assert.equal(writingState.strongModelLoading, false);
  assert.equal(writingState.strongModelResult, null);
  assert.equal(writingState.strongModelError, "");
});
