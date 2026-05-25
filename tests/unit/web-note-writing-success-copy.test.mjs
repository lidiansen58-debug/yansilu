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

test("note main-path projected continuity keeps success copy note-scoped", () => {
  const source = repoSource();
  assert.match(source, /if \(reason === "open-note-main-route"\) \{/);
  assert.match(source, /已从主路径打开当前草稿：\$\{noteContinuation\.projectId\}/);
  assert.match(source, /已从主路径回到当前项目的草稿骨架：\$\{noteContinuation\.projectId\}/);
  assert.match(source, /已从主路径继续当前项目：\$\{noteContinuation\.projectId\}/);
});
