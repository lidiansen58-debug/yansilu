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

test("graph review queue consistently frames missing-rationale work as relation explanations", () => {
  const source = readPrototypeAppSource();

  assert.match(source, /empty: "缺说明"/);
  assert.match(source, /missing_rationale: "补关系说明"/);
  assert.match(source, /graph-section-title">需要补充说明的关系</);
  assert.match(source, /缺说明 \$\{emptyCount\} 条；说明太粗 \$\{basicCount\} 条/);
  assert.match(source, /点卡片可以回到源笔记补充说明/);
  assert.match(source, /没有缺说明或说明太粗的关系/);
  assert.match(source, /label: "关系待复核", count: Math\.max\(Number\(reviewQueueTotal \|\| 0\), reviewCandidateCount\)/);
  assert.match(source, /reviewCount > 0 \? `<span>待补说明 \$\{escapeHtml\(String\(reviewCount\)\)\}<\/span>` : ""/);
  assert.match(source, /<strong>\$\{renderGraphIcon\("clue"\)\}稍后处理<\/strong>/);
  assert.match(source, /<span>把暂时不急着处理的候选、理由缺口和主题苗头先收在这里，需要时再展开。<\/span>/);
  assert.match(source, /已从图谱打开笔记，继续完善当前关系说明/);
  assert.match(source, /已从图谱打开笔记，继续写关系说明/);
  assert.match(source, /已从图谱打开笔记，继续补反例、边界或例外条件/);
  assert.doesNotMatch(source, /empty: "缺理由"/);
  assert.doesNotMatch(source, /missing_rationale: "补关系理由"/);
  assert.doesNotMatch(source, /graph-section-title">待补关系理由</);
  assert.doesNotMatch(source, /待补强/);
  assert.doesNotMatch(source, /继续补当前关系的理由或类型/);
  assert.doesNotMatch(source, /继续补反例、边界或张力说明/);
});
