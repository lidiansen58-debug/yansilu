import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("writing center keeps beginner four-step path above folded advanced areas", () => {
  const html = fs.readFileSync("apps/web/src/prototype.html", "utf8");
  const statusStrip = fs.readFileSync("apps/web/src/writing-status-strip-panel.js", "utf8");
  const mainlineIndex = html.indexOf("writingBeginnerMainline");
  const aiAdvancedIndex = html.indexOf("高级：AI 写作检查");
  const bookAdvancedIndex = html.indexOf("高级：书稿方向、最近写作和版本历史");

  assert.ok(mainlineIndex > 0, "writing beginner mainline should exist");
  assert.ok(aiAdvancedIndex > mainlineIndex, "AI writing check should be below the beginner mainline");
  assert.ok(bookAdvancedIndex > aiAdvancedIndex, "book direction should be in a later advanced area");
  assert.match(html, /<details class="writing-advanced-details">\s*<summary>高级：AI 写作检查<\/summary>/);
  assert.match(html, /<details class="writing-advanced-details">[\s\S]*<summary>高级：书稿方向、最近写作和版本历史<\/summary>/);
  assert.doesNotMatch(html, /<details class="writing-advanced-details" open>/);
  assert.doesNotMatch(statusStrip, /renderWritingStatusCard\("AI 辅助"/);
});
