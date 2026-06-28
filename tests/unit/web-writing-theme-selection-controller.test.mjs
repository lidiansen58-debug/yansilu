import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveWritingThemeSelectionForPanel
} from "../../apps/web/src/writing-theme-selection-controller.js";

test("writing theme selection hydrates selected theme details and relation counts", () => {
  const calls = [];
  const selectedTheme = { id: "theme-1" };
  const result = resolveWritingThemeSelectionForPanel({
    selectedWritingThemeIndex: () => selectedTheme,
    writingThemeIndexNoteIds: () => ["n1", "n2"],
    shouldHydrateWritingThemeNotes: (noteIds) => {
      calls.push(["shouldHydrate", noteIds]);
      return true;
    },
    hydrateWritingThemeNotes: (noteIds) => calls.push(["hydrate", noteIds]),
    shouldRefreshWritingThemeRelationCounts: (noteIds) => {
      calls.push(["shouldRefresh", noteIds]);
      return true;
    },
    refreshWritingThemeRelationCounts: (noteIds) => calls.push(["refresh", noteIds])
  });

  assert.equal(result, selectedTheme);
  assert.deepEqual(calls, [
    ["shouldHydrate", ["n1", "n2"]],
    ["hydrate", ["n1", "n2"]],
    ["shouldRefresh", ["n1", "n2"]],
    ["refresh", ["n1", "n2"]]
  ]);
});

test("writing theme selection leaves selected theme alone when refreshes are not needed", () => {
  const calls = [];
  const selectedTheme = { id: "theme-1" };
  const result = resolveWritingThemeSelectionForPanel({
    selectedWritingThemeIndex: () => selectedTheme,
    writingThemeIndexNoteIds: () => ["n1"],
    shouldHydrateWritingThemeNotes: () => false,
    hydrateWritingThemeNotes: () => calls.push("hydrate"),
    shouldRefreshWritingThemeRelationCounts: () => false,
    refreshWritingThemeRelationCounts: () => calls.push("refresh")
  });

  assert.equal(result, selectedTheme);
  assert.deepEqual(calls, []);
});

test("writing theme selection clears stale theme detail state when nothing is selected", () => {
  let cleared = 0;
  const writingState = {
    themeRelationNoteIds: ["n1"],
    themeRelationCounts: { n1: 2 },
    themeNoteDetailIds: ["n1"],
    loadingThemeNoteDetails: true
  };

  const result = resolveWritingThemeSelectionForPanel({
    writingState,
    selectedWritingThemeIndex: () => null,
    clearWritingThemeRelationCounts: () => {
      cleared += 1;
      writingState.themeRelationNoteIds = [];
      writingState.themeRelationCounts = {};
    }
  });

  assert.equal(result, null);
  assert.equal(cleared, 1);
  assert.deepEqual(writingState.themeNoteDetailIds, []);
  assert.equal(writingState.loadingThemeNoteDetails, false);
});
