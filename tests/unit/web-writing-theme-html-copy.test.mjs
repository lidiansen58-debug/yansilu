import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function repoHtml() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype.html"), "utf8");
}

test("theme detail placeholder hint matches resumable-entry wording before runtime hydration", () => {
  const html = repoHtml();

  assert.match(html, /查看中心问题、主题压缩、相关永久笔记，并确认一条可继续接的写作入口。/);
  assert.doesNotMatch(html, /查看中心问题、主题压缩、相关永久笔记，并从主题直接创建项目。/);
});
