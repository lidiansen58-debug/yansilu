import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyMojibakeFileText,
  classifyMojibakeText
} from "../../scripts/mojibake-risk-report.mjs";

test("mojibake risk report detects replacement marker corruption", () => {
  const result = classifyMojibakeText("锟斤拷锟斤拷写锟斤拷"); // mojibake-risk-allow test fixture

  assert.equal(result.replacementCount > 0, true);
  assert.equal(result.total >= result.replacementCount, true);
});

test("mojibake risk report detects common UTF-8-as-GBK copy", () => {
  const result = classifyMojibakeText("鍏崇郴宸蹭繚瀛樸€?"); // mojibake-risk-allow test fixture

  assert.equal(result.utf8AsGbkCount > 0, true);
  assert.equal(result.total >= result.utf8AsGbkCount, true);
});

test("mojibake risk report does not flag ordinary Chinese copy", () => {
  const result = classifyMojibakeText("关系已保存，可以继续整理下一条笔记。");

  assert.deepEqual(result, {
    replacementCount: 0,
    utf8AsGbkCount: 0,
    total: 0
  });
});

test("mojibake risk report ignores explicit detector fixtures in file scans", () => {
  const result = classifyMojibakeFileText([
    "const sample = '锟斤拷'; // mojibake-risk-allow",
    "关系已保存"
  ].join("\n"));

  assert.deepEqual(result, {
    replacementCount: 0,
    utf8AsGbkCount: 0,
    total: 0
  });
});
