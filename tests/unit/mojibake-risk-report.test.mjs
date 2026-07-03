import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyMojibakeFileText,
  classifyMojibakeText
} from "../../scripts/mojibake-risk-report.mjs";

test("mojibake risk report detects replacement character corruption", () => {
  const result = classifyMojibakeText(`标题${String.fromCharCode(0xfffd)}正文`);

  assert.equal(result.replacementCount, 1);
  assert.equal(result.total >= result.replacementCount, true);
});

test("mojibake risk report detects common UTF-8 shown as Latin-1 copy", () => {
  const result = classifyMojibakeText("Ã¦Âµâ€™"); // mojibake-risk-allow test fixture

  assert.equal(result.utf8AsLatin1Count > 0, true);
  assert.equal(result.total >= result.utf8AsLatin1Count, true);
});

test("mojibake risk report detects short CJK-garbled UI labels", () => {
  const result = classifyMojibakeText("æµ‹è¯•"); // mojibake-risk-allow test fixture

  assert.equal(result.utf8AsCjkCount > 0, true);
  assert.equal(result.total >= result.utf8AsCjkCount, true);
});

test("mojibake risk report detects UTF-8 shown as GBK-style Chinese copy", () => {
  const result = classifyMojibakeText("\u934f\u5d07\u90f4\u5bb8\u8e6d\u7e5a\u701b\u6a38\u20ac?"); // mojibake-risk-allow test fixture

  assert.equal(result.utf8AsCjkCount > 0, true);
  assert.equal(result.total >= result.utf8AsCjkCount, true);
});

test("mojibake risk report detects GBK-style mojibake in app title copy", () => {
  const result = classifyMojibakeText("\u942e\u65c0\u20ac\u6fc6\u7d8d\u5bb8\u30e4\u7d94\u9359?"); // mojibake-risk-allow test fixture

  assert.equal(result.utf8AsCjkCount > 0, true);
  assert.equal(result.total >= result.utf8AsCjkCount, true);
});

test("mojibake risk report does not flag ordinary Chinese copy", () => {
  const result = classifyMojibakeText("关系已经保存，可以继续整理下一条笔记。");

  assert.deepEqual(result, {
    replacementCount: 0,
    utf8AsLatin1Count: 0,
    utf8AsCjkCount: 0,
    total: 0
  });
});

test("mojibake risk report does not flag legitimate uncommon CJK words", () => {
  for (const text of ["\u942e\u5200", "\u934f\u5b50", "\u6fc6\u6c5f", "\u951b\u5b50", "\u9418\u8868\u4fee\u7406"]) {
    assert.deepEqual(classifyMojibakeText(text), {
      replacementCount: 0,
      utf8AsLatin1Count: 0,
      utf8AsCjkCount: 0,
      total: 0
    });
  }
});

test("mojibake risk report ignores explicit detector fixtures in file scans", () => {
  const result = classifyMojibakeFileText([
    "const sample = 'Ã¦Âµâ€™'; // mojibake-risk-allow",
    "关系已经保存"
  ].join("\n"));

  assert.deepEqual(result, {
    replacementCount: 0,
    utf8AsLatin1Count: 0,
    utf8AsCjkCount: 0,
    total: 0
  });
});
