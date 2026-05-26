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

test("theme index list actions reuse the unified writing continuity entry", () => {
  const source = repoSource();
  const match = source.match(/const action = String\(button\.getAttribute\("data-writing-index-action"\) \|\| ""\);([\s\S]*?)if \(!indexId\) return;/);

  assert.ok(match, "expected writing index action handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(action === "open-draft" \|\| action === "resume-project" \|\| action === "resume-scaffold"\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(projectId, \{/);
  assert.match(fnBody, /openDraft: action === "open-draft"/);
});

test("theme index list continuity keeps failure copy theme-index-scoped", () => {
  const source = repoSource();
  const match = source.match(/const action = String\(button\.getAttribute\("data-writing-index-action"\) \|\| ""\);([\s\S]*?)if \(!indexId\) return;/);

  assert.ok(match, "expected writing index action handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /action === "open-draft" \? "从主题索引打开当前草稿" : action === "resume-scaffold" \? "从主题索引回到草稿骨架" : "从主题索引继续当前项目"/);
});

test("theme detail continuity keeps failure copy theme-scoped", () => {
  const source = repoSource();
  const match = source.match(/\$\("writingThemeDetail"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing theme detail handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /action === "open-draft" \? "从主题打开当前草稿" : action === "resume-scaffold" \? "从主题回到草稿骨架" : "从主题继续当前项目"/);
  assert.match(fnBody, /主题操作失败|失败：/);
});
