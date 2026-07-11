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

test("writing topic screen starts from a concrete next action", () => {
  const html = repoHtml();

  assert.match(html, /选一个主题，写完一篇文章。/);
  assert.match(html, /选择一个可写主题/);
  assert.doesNotMatch(html, /查看中心问题、主题压缩、相关永久笔记，并从主题直接确定可写主题。/);
});
