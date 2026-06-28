import test from "node:test";
import assert from "node:assert/strict";

import {
  sameUniqueStringSetForRuntime,
  selectedWritingThemeIndexForRuntime,
  setSelectedWritingThemeIndexForRuntime,
  writingThemeIndexByIdForRuntime,
  writingThemeIndexNoteIdsForRuntime
} from "../../apps/web/src/writing-theme-state.js";

test("writing theme state resolves theme indexes by trimmed id", () => {
  const writingState = {
    themeIndexes: [
      { id: "theme-a", title: "A" },
      { id: "theme-b", title: "B" }
    ]
  };

  assert.equal(writingThemeIndexByIdForRuntime(writingState, " theme-b "), writingState.themeIndexes[1]);
  assert.equal(writingThemeIndexByIdForRuntime(writingState, "missing"), null);
  assert.equal(writingThemeIndexByIdForRuntime({}, "theme-a"), null);
});

test("writing theme state normalizes note ids from modern and legacy index cards", () => {
  assert.deepEqual(writingThemeIndexNoteIdsForRuntime({ item_note_ids: [" n1 ", "n2", "n1", ""] }), ["n1", "n2"]);
  assert.deepEqual(writingThemeIndexNoteIdsForRuntime({ items: [{ note_id: "n3" }, { note_id: " n4 " }, { note_id: "n3" }] }), ["n3", "n4"]);
  assert.deepEqual(writingThemeIndexNoteIdsForRuntime(null), []);
});

test("writing theme state compares arrays as unique string sets", () => {
  assert.equal(sameUniqueStringSetForRuntime(["a", "b", "a"], [" b ", "a"]), true);
  assert.equal(sameUniqueStringSetForRuntime(["a", "b"], ["a"]), false);
  assert.equal(sameUniqueStringSetForRuntime(["a"], ["a", "c"]), false);
});

test("writing theme state selects explicit theme then source fallback then first theme", () => {
  const writingState = {
    selectedThemeIndexId: "selected",
    sourceIndexIds: ["source"],
    themeIndexes: [
      { id: "first" },
      { id: "source" },
      { id: "selected" }
    ]
  };

  assert.equal(selectedWritingThemeIndexForRuntime(writingState).id, "selected");
  writingState.selectedThemeIndexId = "missing";
  assert.equal(selectedWritingThemeIndexForRuntime(writingState).id, "source");
  writingState.sourceIndexIds = ["missing"];
  assert.equal(selectedWritingThemeIndexForRuntime(writingState).id, "first");
  assert.equal(selectedWritingThemeIndexForRuntime({ themeIndexes: [] }), null);
});

test("writing theme state stores a trimmed selected index id", () => {
  const writingState = {};
  assert.equal(setSelectedWritingThemeIndexForRuntime(writingState, " theme-a "), "theme-a");
  assert.equal(writingState.selectedThemeIndexId, "theme-a");
});
