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
  assert.match(html, /<details class="writing-advanced-details" id="writingBasketDetails">/);
  assert.match(html, /<details class="writing-advanced-details" id="writingBasketActionsDetails">/);
  assert.match(html, /<details class="writing-advanced-details" id="writingOutputActionsDetails">/);
  assert.match(html, /<details class="writing-advanced-details">\s*<summary>高级：AI 写作检查<\/summary>/);
  assert.match(html, /<details class="writing-advanced-details">[\s\S]*<summary>更多写作工具：书稿方向、最近写作和版本历史<\/summary>/);
  assert.match(html, /id="writingThemeIndexList"/);
  assert.match(html, /id="writingThemeDetail"/);
  assert.match(html, /<details class="writing-advanced-details writing-section" id="writingCandidateDetails">\s*<summary>更多选择：当前目录永久笔记<\/summary>/);
  assert.doesNotMatch(html, /<details class="writing-advanced-details" open>/);
  assert.doesNotMatch(statusStrip, /renderWritingStatusCard\("AI 辅助"/);
  assert.ok(
    html.indexOf('id="btnWritingAddVisible"') > html.indexOf('id="writingBasketActionsDetails"'),
    "bulk note action should be behind folded related-note actions"
  );
  assert.ok(
    html.indexOf('id="btnWritingRefreshProjects"') > html.indexOf("更多：最近写作和版本记录"),
    "writing record refresh should stay in the folded recent-writing area"
  );
});

test("writing center lazy-loads the full candidate note list", () => {
  const controller = fs.readFileSync("apps/web/src/writing-panel-controller.js", "utf8");
  const events = fs.readFileSync("apps/web/src/writing-panel-events.js", "utf8");
  const deps = fs.readFileSync("apps/web/src/writing-panel-deps.js", "utf8");
  const hostDeps = fs.readFileSync("apps/web/src/writing-panel-host-deps.js", "utf8");
  const prototypeApp = fs.readFileSync("apps/web/src/prototype-app.js", "utf8");

  assert.match(controller, /const candidateDetails = \$\("writingCandidateDetails"\)/);
  assert.match(controller, /writing-actions-secondary/);
  assert.match(controller, /classList\.toggle\("hidden", !hasScaffold\)/);
  assert.match(controller, /candidateDetails\?\.open/);
  assert.match(controller, /Math\.min\(candidates\.length, 12\)/);
  assert.match(controller, /加入已加载候选/);
  assert.match(controller, /展开本区块后会加载完整列表/);
  assert.match(events, /add\("writingCandidateDetails", "toggle"/);
  assert.match(events, /isWritingCandidateDetailsExpanded/);
  assert.match(events, /renderWritingPanel\?\.\(\)/);
  assert.match(deps, /isWritingCandidateDetailsExpanded/);
  assert.match(hostDeps, /isWritingCandidateDetailsExpanded/);
  assert.match(prototypeApp, /installWritingPanelBasketEventHandlers\(\{[\s\S]*isWritingCandidateDetailsExpanded: \(\) => Boolean\(\$\("writingCandidateDetails"\)\?\.open\)/);
});
