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

test("theme index continuity keeps success copy theme-index-scoped for every continuity action", () => {
  const source = repoSource();
  const match = source.match(/const action = String\(button\.getAttribute\("data-writing-index-action"\) \|\| ""\);([\s\S]*?)if \(!indexId\) return;/);

  assert.ok(match, "expected theme index continuity handler to exist");
  assert.match(match[1], /已从主题索引打开当前草稿：\$\{projectId\}/);
  assert.match(match[1], /已从主题索引回到草稿骨架：\$\{projectId\}/);
  assert.match(match[1], /已从主题索引继续当前项目：\$\{projectId\}/);
});

test("theme detail continuity keeps success copy theme-scoped for every continuity action", () => {
  const source = repoSource();
  const match = source.match(/\$\("writingThemeDetail"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected theme detail continuity handler to exist");
  assert.match(match[1], /已从主题打开当前草稿：\$\{projectId\}/);
  assert.match(match[1], /已从主题回到草稿骨架：\$\{projectId\}/);
  assert.match(match[1], /已从主题继续当前项目：\$\{projectId\}/);
  assert.match(match[1], /已从主题打开当前草稿：\$\{existingProject\.id\}/);
  assert.match(match[1], /已从主题回到草稿骨架：\$\{existingProject\.id\}/);
  assert.match(match[1], /已从主题继续当前项目：\$\{existingProject\.id\}/);
});
