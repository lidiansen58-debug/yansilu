import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingThemeProjectEntryState } from "../../apps/web/src/writing-center-flow.js";

test("writing theme project entry stays loading when theme note details are not loaded yet", () => {
  const entry = describeWritingThemeProjectEntryState({
    notesLoaded: false,
    loadingNoteDetails: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "strong_model_ready",
    readinessHint: "This should not leak through before theme notes are hydrated."
  });

  assert.equal(entry.level, "loading");
  assert.equal(entry.canCreateProject, false);
  assert.match(entry.hint, /永久笔记|涓婚/);
});

test("writing theme project entry stays loading while theme note hydration is in flight", () => {
  const entry = describeWritingThemeProjectEntryState({
    notesLoaded: true,
    loadingNoteDetails: true,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "project_ready"
  });

  assert.equal(entry.level, "loading");
  assert.equal(entry.canCreateProject, false);
});

test("writing theme project entry reuses normal project gating after theme notes are hydrated", () => {
  const entry = describeWritingThemeProjectEntryState({
    notesLoaded: true,
    loadingNoteDetails: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "project_ready"
  });

  assert.equal(entry.level, "ready");
  assert.equal(entry.canCreateProject, true);
});
