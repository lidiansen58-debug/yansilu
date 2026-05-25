import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readPrototypeAppSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

test("writing-center empty project surfaces reuse current basket continuity guidance", () => {
  const source = readPrototypeAppSource();

  assert.match(source, /const projectEntry =\s*\(!hasProject && currentWritingContinuationEntry\("当前写作篮"\)\)/);
  assert.match(source, /else if \(!hasProject && projectEntry\.projectId\) projectsHint\.textContent = `当前写作篮入口：\$\{projectEntry\.status\}\。\$\{projectEntry\.hint\}`;/);
  assert.match(source, /当前写作篮已经对应 \$\{escapeHtml\(projectEntry\.status\)\}\。直接用上面的“\$\{escapeHtml\(projectEntry\.actionLabel\)\}”继续，会比重新创建项目更连续。/);
});
