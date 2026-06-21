import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  describeWritingContinuationAction,
  describeWritingProjectStepState
} from "../../apps/web/src/writing-center-flow.js";

function repoSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

test("writing continuation action prefers opening the current draft when one already exists", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: true,
    scopeLabel: "current theme"
  });

  assert.equal(entry.level, "current_draft");
  assert.equal(entry.action, "open-draft");
  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.canCreateProject, true);
});

test("current writing continuity only reuses the open project when it still matches the basket or theme context", () => {
  const source = repoSource();

  assert.match(source, /function writingProjectMatchesContext\(project, \{ themeId = "", noteIds = \[\] \} = \{\}\) \{/);
  assert.match(source, /if \(normalizedThemeId && relatedIndexIds\.includes\(normalizedThemeId\)\) return true;/);
  assert.match(source, /return normalizedNoteIds\.length > 0 && sameUniqueStringSet\(basketNoteIds, normalizedNoteIds\);/);
});

test("currentWritingEntryProject no longer returns the open project unconditionally", () => {
  const source = repoSource();
  const match = source.match(/function currentWritingEntryProject\(\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected currentWritingEntryProject() to exist");
  const fnBody = match[1];

  assert.doesNotMatch(fnBody, /if \(writingState\.project\?\.id\) return writingState\.project;/);
  assert.match(fnBody, /return writingEntryProjectForContext\(\{/);
  assert.match(source, /function writingEntryProjectForContext\(\{ basketNoteIds = \[\], sourceIndexIds = \[\] \} = \{\}\) \{/);
  assert.match(source, /if \(\s*writingProjectMatchesContext\(writingState\.project,/);
  assert.match(source, /return findExistingWritingProjectForTheme\(sourceTheme, normalizedBasketNoteIds\);/);
});

test("writing continuation action prefers resuming scaffold when draft is not ready yet", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: false,
    scopeLabel: "current basket"
  });

  assert.equal(entry.level, "current_scaffold");
  assert.equal(entry.action, "resume-scaffold");
  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.canCreateProject, true);
});

test("theme detail primary action follows the computed continuity action instead of always creating a project", () => {
  const source = repoSource();

  assert.match(source, /const primaryThemeAction = String\(projectEntry\.action \|\| "create-project"\)\.trim\(\) \|\| "create-project";/);
  assert.match(source, /data-writing-theme-action="\$\{escapeHtml\(primaryThemeAction\)\}"/);
  assert.match(source, /data-writing-project-id="\$\{escapeHtml\(primaryThemeProjectId\)\}"/);
});

test("writing-center project entry state reuses current continuity when the basket already maps to a project", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    scopeLabel: "当前写作篮"
  });
  const step = describeWritingProjectStepState({
    basketCount: 3,
    hasProject: false,
    projectEntryStatus: entry.status,
    projectEntryHint: entry.hint,
    projectEntryProjectId: entry.projectId,
    projectEntryActionLabel: entry.actionLabel,
    canCreateProject: true
  });

  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.action, "resume-project");
  assert.match(step.note, /wp_existing/);
  assert.match(step.note, /比重新创建项目更连续/);
});

test("note main-path project entry uses projected note continuity before falling back to project creation", () => {
  const source = repoSource();
  const match = source.match(/if \(reason === "open-note-main-route"\) \{([\s\S]*?)\n  \}/);

  assert.ok(match, "expected open-note-main-route handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const noteContinuation = noteMainPathWritingContinuationEntry\(noteId,/);
  assert.match(fnBody, /if \(mode === "project"\) \{/);
  assert.match(fnBody, /await openWritingModule\(\{ statusMessage: "" \}\);/);
  assert.match(fnBody, /if \(noteContinuation\?\.projectId\) \{\s*await continueWritingProjectEntry\(noteContinuation\.projectId,/);
  assert.match(fnBody, /await createWritingProjectFromCurrentBasket\(\);/);
});

test("note main-path writing entry resumes projected note continuity before opening the generic writing center", () => {
  const source = repoSource();
  const match = source.match(/if \(reason === "open-note-main-route"\) \{([\s\S]*?)\n  \}/);

  assert.ok(match, "expected open-note-main-route handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(noteContinuation\?\.projectId\) \{\s*await continueWritingProjectEntry\(noteContinuation\.projectId,/);
  assert.match(fnBody, /await openWritingModule\(\{ statusMessage \}\);/);
});

test("note main-path writing entry keeps note-scoped continuity failure copy", () => {
  const source = repoSource();
  const match = source.match(/if \(reason === "open-note-main-route"\) \{([\s\S]*?)\n  \}/);

  assert.ok(match, "expected open-note-main-route handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /catch \(error\) \{/);
  assert.match(
    fnBody,
    /noteContinuation\.action === "open-draft" \? "从主路径打开当前草稿" : noteContinuation\.action === "resume-scaffold" \? "从主路径回到当前项目的草稿骨架" : "从主路径继续当前项目"/
  );
  assert.match(fnBody, /mode === "project" \? "从主路径创建项目" : "从主路径进入写作中心"/);
});

test("note main-path continuity preview reuses the same basket-entry planning before wiring labels into the editor pane", () => {
  const source = repoSource();

  assert.match(source, /function noteMainPathWritingContinuationEntry\(noteId, scopeLabel = "当前笔记"\) \{/);
  assert.match(source, /const plan = planWritingBasketEntry\(\{\s*existingNoteIds: parseWritingBasketIds\(\),\s*incomingNoteIds: \[cleanNoteId\]\s*\}\);/);
  assert.match(source, /resolveNoteWritingContinuation: \(note\) => noteMainPathWritingContinuationEntry\(note\?\.id \|\| "", "当前笔记"\)/);
});

test("writing continuation action carries the existing project target for callers", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: false,
    scopeLabel: "当前写作篮"
  });

  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.action, "resume-scaffold");
  assert.equal(entry.canCreateProject, true);
  assert.match(entry.hint, /当前写作篮/);
});
