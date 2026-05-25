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

test("writing-center create-project button keeps continuity-aware failure copy", () => {
  const source = readPrototypeAppSource();
  const match = source.match(/\$\("btnWritingCreateProject"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing create-project handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const continuation = currentWritingContinuationEntry\("当前写作篮"\);/);
  assert.match(fnBody, /if \(continuation\?\.projectId\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(continuation\.projectId,/);
  assert.match(fnBody, /catch \(error\) \{/);
  assert.match(fnBody, /continuation\.action === "open-draft" \? "打开当前草稿" : continuation\.action === "resume-scaffold" \? "回到草稿骨架" : "继续当前项目"/);
  assert.match(fnBody, /从写作中心创建项目失败：\$\{String\(error\?\.message \|\| error\)\}/);
});
