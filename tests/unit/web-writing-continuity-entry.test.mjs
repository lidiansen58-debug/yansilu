import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describeWritingContinuationAction } from "../../apps/web/src/writing-center-flow.js";

test("writing continuation action prefers opening the current draft when one already exists", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: true,
    scopeLabel: "当前主题"
  });

  assert.equal(entry.level, "current_draft");
  assert.equal(entry.status, "打开当前草稿");
  assert.equal(entry.actionLabel, "打开当前草稿");
  assert.equal(entry.action, "open-draft");
  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.canCreateProject, true);
  assert.match(entry.hint, /wp_existing/);
});

test("current writing continuity only reuses the open project when it still matches the basket or theme context", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  assert.match(source, /function writingProjectMatchesContext\(project, \{ themeId = "", noteIds = \[\] \} = \{\}\) \{/);
  assert.match(source, /if \(normalizedThemeId && relatedIndexIds\.includes\(normalizedThemeId\)\) return true;/);
  assert.match(source, /return normalizedNoteIds\.length > 0 && sameUniqueStringSet\(basketNoteIds, normalizedNoteIds\);/);
});

test("currentWritingEntryProject no longer returns the open project unconditionally", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  const match = source.match(/function currentWritingEntryProject\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, "expected currentWritingEntryProject() to exist");

  const fnBody = match[1];
  assert.doesNotMatch(fnBody, /if \(writingState\.project\?\.id\) return writingState\.project;/);
  assert.match(fnBody, /if \(\s*writingProjectMatchesContext\(writingState\.project,/);
  assert.match(fnBody, /return findExistingWritingProjectForTheme\(sourceTheme, basketNoteIds\);/);
});

test("writing continuation action prefers resuming scaffold when draft is not ready yet", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: false,
    scopeLabel: "当前写作篮"
  });

  assert.equal(entry.level, "current_scaffold");
  assert.equal(entry.status, "继续草稿骨架");
  assert.equal(entry.actionLabel, "继续草稿骨架");
  assert.equal(entry.action, "resume-scaffold");
  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.canCreateProject, true);
  assert.match(entry.hint, /wp_existing/);
});

test("theme detail primary action follows the computed continuity action instead of always creating a project", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  assert.match(source, /const primaryThemeAction = String\(projectEntry\.action \|\| "create-project"\)\.trim\(\) \|\| "create-project";/);
  assert.match(source, /data-writing-theme-action="\$\{escapeHtml\(primaryThemeAction\)\}"/);
  assert.match(source, /data-writing-project-id="\$\{escapeHtml\(primaryThemeProjectId\)\}"/);
});

test("writing-center project entry button reuses current continuity when the basket already maps to a project", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  assert.match(source, /const continuation = currentWritingContinuationEntry\("当前写作篮"\);/);
  assert.match(source, /if \(continuation\?\.projectId\) \{/);
  assert.match(source, /await continueWritingProjectEntry\(continuation\.projectId,/);
});

test("note main-path project entry still funnels through the unified writing-center continuity gate", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  const match = source.match(/if \(reason === "open-note-main-route"\) \{([\s\S]*?)\n  \}/);
  assert.ok(match, "expected open-note-main-route handler to exist");

  const fnBody = match[1];
  assert.match(fnBody, /if \(mode === "project"\) \{\s*await openWritingModule\(\{ statusMessage: "" \}\);\s*await createWritingProjectFromCurrentBasket\(\);/);
});

test("note main-path writing entry resumes an existing continuity target before opening the generic writing center", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  const match = source.match(/if \(reason === "open-note-main-route"\) \{([\s\S]*?)\n  \}/);
  assert.ok(match, "expected open-note-main-route handler to exist");

  const fnBody = match[1];
  assert.match(fnBody, /const continuation = currentWritingContinuationEntry\("当前笔记"\);/);
  assert.match(fnBody, /if \(continuation\?\.projectId\) \{\s*await continueWritingProjectEntry\(continuation\.projectId,/);
  assert.match(fnBody, /await openWritingModule\(\{ statusMessage \}\);/);
});

test("createWritingProjectFromCurrentBasket resumes an existing project before creating a new one", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  const match = source.match(/async function createWritingProjectFromCurrentBasket\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, "expected createWritingProjectFromCurrentBasket() to exist");

  const fnBody = match[1];
  assert.match(fnBody, /const continuation = currentWritingContinuationEntry\("当前写作篮"\);/);
  assert.match(fnBody, /if \(continuation\?\.projectId\) \{/);
  assert.match(fnBody, /return continueWritingProjectEntry\(continuation\.projectId,/);
});
