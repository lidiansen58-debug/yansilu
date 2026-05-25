import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("writing project cards reuse continuity actions based on draft and scaffold state", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
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

test("writing project list actions reuse the unified continuity entry handler", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/\$\("writingProjectsList"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writingProjectsList click handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(action === "open-draft" \|\| action === "resume-project" \|\| action === "resume-scaffold"\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(projectId, \{/);
  assert.match(fnBody, /openDraft: action === "open-draft"/);
  assert.match(fnBody, /action === "open-draft" \? "打开当前草稿" : action === "resume-scaffold" \? "回到草稿骨架" : "继续当前项目"/);
});
