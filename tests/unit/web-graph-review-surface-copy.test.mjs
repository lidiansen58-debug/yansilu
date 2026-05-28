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

test("graph review queue consistently frames missing-rationale work as relation reasons", () => {
  const source = readPrototypeAppSource();

  assert.match(source, /empty: "缺理由"/);
  assert.match(source, /missing_rationale: "补关系理由"/);
  assert.match(source, /graph-section-title">待补关系理由</);
  assert.match(source, /graph-section-note">这里列出“线已经连上，但为什么连还没说清楚”的关系。优先补这些，图谱才有解释力。/);
  assert.match(source, /缺理由 \$\{emptyCount\} 条；待补强 \$\{basicCount\} 条。点击卡片会回到源笔记，再补关系理由或追问。/);
  assert.match(source, /没有缺理由或理由偏薄的关系。/);
  assert.match(source, /已从图谱打开笔记，继续补当前关系理由/);
  assert.match(source, /已从图谱打开笔记，继续补关系理由/);
  assert.match(source, /已从图谱打开笔记，继续补反例、边界或例外条件/);
});
