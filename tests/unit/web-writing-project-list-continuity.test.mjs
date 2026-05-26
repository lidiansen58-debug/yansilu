import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function repoSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

test("writing project cards reuse continuity actions based on draft and scaffold state", () => {
  const source = repoSource();
  const match = source.match(/function renderWritingProjectCard\(project\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected renderWritingProjectCard() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const continuation = describeWritingContinuationAction\(\{/);
  assert.match(fnBody, /existingProjectHasScaffold: hasScaffold/);
  assert.match(fnBody, /existingProjectHasDraft: Boolean\(project\?\.draft_note_id\)/);
  assert.match(fnBody, /const primaryProjectStatus = String\(continuation\?\.status \|\| "打开项目"\)\.trim\(\) \|\| "打开项目";/);
  assert.match(fnBody, /当前入口：\$\{escapeHtml\(primaryProjectStatus\)\}/);
  assert.match(fnBody, /data-writing-project-action="\$\{escapeHtml\(primaryProjectAction\)\}"/);
  assert.match(fnBody, /\$\{escapeHtml\(primaryProjectActionLabel\)\}/);
});

test("theme index cards reuse continuity actions based on draft and scaffold state", () => {
  const source = repoSource();
  const match = source.match(/function renderWritingThemeIndexCard\(indexCard\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected renderWritingThemeIndexCard() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const themeContinuation = describeWritingContinuationAction\(\{/);
  assert.match(fnBody, /existingProjectHasScaffold: Boolean\(existingProject\?\.scaffold_id\)/);
  assert.match(fnBody, /existingProjectHasDraft: Boolean\(existingProject\?\.draft_note_id\)/);
  assert.match(fnBody, /data-writing-index-action="\$\{escapeHtml\(themeContinuation\?\.action \|\| "resume-project"\)\}"/);
  assert.match(fnBody, /\$\{escapeHtml\(themeContinuation\?\.actionLabel \|\| "继续当前项目"\)\}/);
});

test("theme index list actions keep scoped continuity success and failure copy", () => {
  const source = repoSource();
  const match = source.match(/\$\("writingThemeIndexList"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writingThemeIndexList click handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(action === "open-draft" \|\| action === "resume-project" \|\| action === "resume-scaffold"\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(projectId, \{/);
  assert.match(fnBody, /openDraft: action === "open-draft"/);
  assert.match(fnBody, /已从主题索引打开当前草稿：\$\{projectId\}/);
  assert.match(fnBody, /已从主题索引回到草稿骨架：\$\{projectId\}/);
  assert.match(fnBody, /已从主题索引继续当前项目：\$\{projectId\}/);
  assert.match(fnBody, /action === "open-draft" \? "从主题索引打开当前草稿" : action === "resume-scaffold" \? "从主题索引回到草稿骨架" : "从主题索引继续当前项目"/);
});

test("writing project list actions keep scoped continuity success and failure copy", () => {
  const source = repoSource();
  const match = source.match(/\$\("writingProjectsList"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writingProjectsList click handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(action === "open-draft" \|\| action === "resume-project" \|\| action === "resume-scaffold"\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(projectId, \{/);
  assert.match(fnBody, /openDraft: action === "open-draft"/);
  assert.match(fnBody, /已从项目列表打开当前草稿：\$\{projectId\}/);
  assert.match(fnBody, /已从项目列表回到草稿骨架：\$\{projectId\}/);
  assert.match(fnBody, /已从项目列表继续当前项目：\$\{projectId\}/);
  assert.match(fnBody, /action === "open-draft" \? "从项目列表打开当前草稿" : action === "resume-scaffold" \? "从项目列表回到草稿骨架" : "从项目列表继续当前项目"/);
});
