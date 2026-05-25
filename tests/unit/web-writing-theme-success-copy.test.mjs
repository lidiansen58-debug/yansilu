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

test("theme index continuity keeps open-draft success copy theme-scoped", () => {
  const source = repoSource();
  const match = source.match(/const action = String\(button\.getAttribute\("data-writing-index-action"\) \|\| ""\);([\s\S]*?)if \(!indexId\) return;/);

  assert.ok(match, "expected theme index continuity handler to exist");
  assert.match(match[1], /已从主题索引打开当前草稿：\$\{projectId\}/);
});

test("theme detail continuity keeps open-draft success copy theme-scoped", () => {
  const source = repoSource();
  const match = source.match(/\$\("writingThemeDetail"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected theme detail continuity handler to exist");
  assert.match(match[1], /已从主题打开当前草稿：\$\{projectId\}/);
  assert.match(match[1], /已从主题打开当前草稿：\$\{existingProject\.id\}/);
});
