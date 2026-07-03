import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("writing center keeps beginner four-step path above folded advanced areas", () => {
  const html = fs.readFileSync("apps/web/src/prototype.html", "utf8");
  const statusStrip = fs.readFileSync("apps/web/src/writing-status-strip-panel.js", "utf8");
  const mainlineIndex = html.indexOf("writingBeginnerMainline");
  const aiAdvancedIndex = html.indexOf("高级：AI 写作检查");
  const bookAdvancedIndex = html.indexOf("更多写作工具：书稿方向、最近写作和版本历史");
  const basketIndex = html.indexOf("writingBasketSummary");
  const candidateAdvancedIndex = html.indexOf("更多选择：当前目录永久笔记");

  assert.ok(mainlineIndex > 0, "writing beginner mainline should exist");
  assert.ok(aiAdvancedIndex > mainlineIndex, "AI writing check should be below the beginner mainline");
  assert.ok(bookAdvancedIndex > aiAdvancedIndex, "book direction should be in a later advanced area");
  assert.ok(basketIndex > mainlineIndex, "selected note summary should stay in the beginner layer");
  assert.ok(candidateAdvancedIndex > basketIndex, "full candidate list should be folded below selected notes");
  assert.match(html, /<details class="writing-advanced-details">\s*<summary>高级：AI 写作检查<\/summary>/);
  assert.match(html, /<details class="writing-advanced-details">[\s\S]*<summary>更多写作工具：书稿方向、最近写作和版本历史<\/summary>/);
  assert.match(html, /<details class="writing-advanced-details writing-section">\s*<summary>更多选择：可写主题与主题详情<\/summary>/);
  assert.match(html, /<details class="writing-advanced-details writing-section">\s*<summary>更多选择：当前目录永久笔记<\/summary>/);
  assert.doesNotMatch(html, /<details class="writing-advanced-details" open>/);
  assert.doesNotMatch(statusStrip, /renderWritingStatusCard\("AI 辅助"/);
});
