import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingContinuationAction,
  describeWritingThemeProjectEntryState
} from "../../apps/web/src/writing-center-flow.js";

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
  assert.match(entry.hint, /永久笔记|主题/);
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

test("describeWritingContinuationAction prefers scaffold continuity before a generic project resume", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: false,
    scopeLabel: "当前主题"
  });

  assert.equal(entry?.level, "current_scaffold");
  assert.equal(entry?.status, "继续草稿骨架");
  assert.equal(entry?.actionLabel, "继续草稿骨架");
  assert.equal(entry?.action, "resume-scaffold");
  assert.equal(entry?.projectId, "wp_existing");
  assert.match(entry?.hint || "", /wp_existing/);
});

test("theme detail create-project fallback resumes scaffold continuity with scaffold-specific success copy", async () => {
  const { readFile } = await import("node:fs/promises");
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = resolve(dirname(currentFile), "../..");
  const source = await readFile(resolve(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  assert.match(source, /if \(action === "create-project"\) \{/);
  assert.match(source, /openDraft: Boolean\(existingProject\.draft_note_id\)/);
  assert.match(
    source,
    /statusMessage: existingProject\.draft_note_id\s*\?\s*""\s*:\s*existingProject\.scaffold_id\s*\?\s*`已回到草稿骨架：\$\{existingProject\.id\}`\s*:\s*`已继续当前项目：\$\{existingProject\.id\}`/
  );
});
