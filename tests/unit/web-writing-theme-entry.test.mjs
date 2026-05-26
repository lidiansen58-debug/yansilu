import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describeWritingThemeProjectEntryState } from "../../apps/web/src/writing-center-flow.js";

function repoSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

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

test("writing theme project entry resumes the current scaffold when a matching theme project already has one", () => {
  const entry = describeWritingThemeProjectEntryState({
    notesLoaded: true,
    loadingNoteDetails: false,
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "project_ready"
  });

  assert.equal(entry.level, "current_project");
  assert.equal(entry.action, "resume-scaffold");
  assert.equal(entry.actionLabel, "继续草稿骨架");
  assert.equal(entry.canCreateProject, true);
  assert.match(entry.hint, /wp_existing/);
});

test("writing theme project entry opens the current draft when the matching theme project already has one", () => {
  const entry = describeWritingThemeProjectEntryState({
    notesLoaded: true,
    loadingNoteDetails: false,
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: true,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "project_ready"
  });

  assert.equal(entry.level, "current_project");
  assert.equal(entry.action, "open-draft");
  assert.equal(entry.actionLabel, "打开当前草稿");
  assert.equal(entry.canCreateProject, true);
  assert.match(entry.hint, /wp_existing/);
});

test("theme detail create-project fallback reuses theme-scoped continuity success copy", () => {
  const source = repoSource();

  assert.match(source, /if \(action === "create-project"\) \{/);
  assert.match(source, /openDraft: Boolean\(existingProject\.draft_note_id\)/);
  assert.match(source, /已从主题打开当前草稿：\$\{existingProject\.id\}/);
  assert.match(source, /已从主题回到草稿骨架：\$\{existingProject\.id\}/);
  assert.match(source, /已从主题继续当前项目：\$\{existingProject\.id\}/);
});

test("theme detail hint follows the computed project entry instead of always saying create-project", () => {
  const source = repoSource();

  assert.match(source, /function writingThemeDetailHintText\(indexCard\) \{/);
  assert.match(source, /const \{ readiness, projectEntry \} = writingThemeProjectEntry\(indexCard\);/);
  assert.match(source, /当前主题入口：\$\{projectEntry\.status\}/);
  assert.match(source, /继续当前项目还是创建项目/);
});

test("theme detail summary describes a resumable writing entry", () => {
  const source = repoSource();

  assert.match(source, /可续接的写作入口/);
});

test("theme detail empty hint no longer hardcodes create-project wording", () => {
  const source = repoSource();

  assert.match(source, /查看中心问题、主题压缩、相关永久笔记，并确认一条可续接的写作入口。/);
});

test("theme index card fallback summary also uses resumable-entry wording", () => {
  const source = repoSource();

  assert.match(source, /把一组成熟永久笔记当成后续可续接的写作入口。/);
});

test("theme index save prompt seed also uses resumable-entry wording", () => {
  const source = repoSource();

  assert.match(source, /把这一组成熟永久笔记保留为后续可续接的写作入口。/);
  assert.doesNotMatch(source, /把这一组成熟永久笔记保留为后续写作中心入口。/);
});

test("theme index empty state also uses resumable-entry wording", () => {
  const source = repoSource();

  assert.match(source, /还没有主题索引。用当前写作篮里的成熟永久笔记保存一个，后续就能从这里继续一条可续接的写作入口。/);
  assert.doesNotMatch(source, /还没有主题索引。用当前写作篮里的成熟永久笔记保存一个，后续就能从这里直接进入写作中心。/);
});

test("theme index hint also describes existing indexes as resumable writing entries", () => {
  const source = repoSource();

  assert.match(source, /当前范围内有 \$\{writingState\.themeIndexes\.length\} 个主题索引可作为可续接的写作入口。/);
  assert.doesNotMatch(source, /当前范围内有 \$\{writingState\.themeIndexes\.length\} 个主题索引可作为写作中心入口。/);
});
