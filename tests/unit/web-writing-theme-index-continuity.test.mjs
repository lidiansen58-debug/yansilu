import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("theme index list actions reuse the unified writing continuity entry", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/const action = String\(button\.getAttribute\("data-writing-index-action"\) \|\| ""\);([\s\S]*?)if \(!indexId\) return;/);

  assert.ok(match, "expected writing index action handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(action === "open-draft" \|\| action === "resume-project" \|\| action === "resume-scaffold"\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(projectId, \{/);
  assert.match(fnBody, /openDraft: action === "open-draft"/);
});

test("theme detail continuity actions keep action-specific failure copy", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/\$\("writingThemeDetail"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing theme detail handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(action === "open-draft" \|\| action === "resume-project" \|\| action === "resume-scaffold"\) \{/);
  assert.match(fnBody, /action === "open-draft" \? "打开当前草稿" : action === "resume-scaffold" \? "回到草稿骨架" : "继续当前项目"/);
  assert.match(fnBody, /失败：\$\{String\(error\?\.message \|\| error\)\}/);
});
