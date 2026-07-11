import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("writing workbench keeps actions in the writing pane and the main task one-column", () => {
  const html = fs.readFileSync("apps/web/src/prototype.html", "utf8");
  const css = fs.readFileSync("apps/web/src/prototype.css", "utf8");
  const themePanelIndex = html.indexOf('id="writingThemePanel"');
  const outputIndex = html.indexOf('id="writingOutputActionsDetails"');

  assert.doesNotMatch(html, /writing-sidebar-actions/);
  assert.doesNotMatch(html, /writing-workbench-actions/);
  assert.doesNotMatch(html, />开始写<|>选笔记<|>用主题<|>高级工具</);
  assert.doesNotMatch(html, /writing-start-guide/);
  assert.doesNotMatch(html, /这个页面要干啥|现在最重要|后面流程/);
  assert.ok(themePanelIndex > 0);
  assert.doesNotMatch(css, /\.writing-workbench-actions/);
  assert.match(css, /\.writing-topic-layout\s*\{[\s\S]*grid-template-columns: minmax\(0, 760px\)/);
  assert.match(css, /\.writing-theme-detail-panel\s*\{[\s\S]*display: none;/);
  assert.ok(outputIndex < 0 || outputIndex > html.indexOf("writing-hidden-workbench"), "output controls should not be in the visible start panel");
  assert.match(html, /<textarea id="writingBasketNoteIds" hidden><\/textarea>/);
  assert.match(html, /<section class="writing-section writing-topic-panel" id="writingThemePanel">/);
  assert.doesNotMatch(html, /<details class="writing-advanced-details writing-section" id="writingThemePanel"/);
  assert.match(html, /id="writingThemeIndexList"/);
  assert.match(html, /id="writingThemeDetail"/);
  assert.ok(html.indexOf('id="btnWritingStartDraft"') < html.indexOf('id="writingScaffoldPreview"'), "start draft should stay above a long outline");
  assert.equal((html.match(/id="btnWritingStartDraft"/g) || []).length, 1);
  assert.doesNotMatch(html, /data-writing-tab-jump="theme">返回主题/);
  assert.doesNotMatch(html, /id="btnWritingUseCurrent"/);
  assert.doesNotMatch(html, />从主题库选择</);
  assert.doesNotMatch(html, />刷新主题</);
  assert.doesNotMatch(html, /<button class="mini-btn" id="btnWritingDiscoverThemes" type="button">发现可写主题<\/button>\s*<button class="mini-btn" id="btnWritingUseCurrent" type="button">使用当前笔记<\/button>\s*<\/div>\s*<div class="writing-note-list" id="writingThemeDiscoverySuggestions"/);
  assert.doesNotMatch(html, /<details class="writing-advanced-details" open>/);
});

test("writing center keeps adding material behind one clear action", () => {
  const html = fs.readFileSync("apps/web/src/prototype.html", "utf8");
  const controller = fs.readFileSync("apps/web/src/writing-panel-controller.js", "utf8");
  const events = fs.readFileSync("apps/web/src/writing-panel-events.js", "utf8");
  const deps = fs.readFileSync("apps/web/src/writing-panel-deps.js", "utf8");
  const hostDeps = fs.readFileSync("apps/web/src/writing-panel-host-deps.js", "utf8");
  const prototypeApp = fs.readFileSync("apps/web/src/prototype-app.js", "utf8");

  assert.match(controller, /const candidateDetails = \$\("writingCandidateDetails"\)/);
  assert.match(controller, /可添加 \$\{candidates\.length\} 条笔记/);
  assert.match(controller, /classList\.toggle\("hidden", !hasScaffold\)/);
  assert.match(controller, /createScaffoldButton\.disabled = !hasProject && !basketEntries\.length && !explicitSelectedTheme/);
  assert.doesNotMatch(controller, /createScaffoldButton\.disabled = hasProject/);
  assert.match(prototypeApp, /if \(themeId\) return relatedIndexIds\.includes\(themeId\);/);
  assert.match(prototypeApp, /if \(normalizedThemeId\) return relatedIndexIds\.includes\(normalizedThemeId\);/);
  assert.match(controller, /candidateDetails\?\.open/);
  assert.match(controller, /Math\.min\(candidates\.length, 12\)/);
  assert.match(html, /<details class="writing-advanced-details" id="writingCandidateDetails">/);
  assert.match(events, /add\("writingCandidateDetails", "toggle"/);
  assert.match(events, /isWritingCandidateDetailsExpanded/);
  assert.match(events, /renderWritingPanel\?\.\(\)/);
  assert.match(deps, /isWritingCandidateDetailsExpanded/);
  assert.match(hostDeps, /isWritingCandidateDetailsExpanded/);
  assert.match(prototypeApp, /installWritingPanelBasketEventHandlers\(\{[\s\S]*isWritingCandidateDetailsExpanded: \(\) => Boolean\(\$\("writingCandidateDetails"\)\?\.open\)/);
});

test("resuming a draft stays in the writing workbench", () => {
  const prototypeApp = fs.readFileSync("apps/web/src/prototype-app.js", "utf8");
  const continuationStart = prototypeApp.indexOf("async function continueWritingProjectEntry");
  const continuationEnd = prototypeApp.indexOf("async function prepareWritingStrongModelAnalysis", continuationStart);
  const continuation = prototypeApp.slice(continuationStart, continuationEnd);

  assert.match(continuation, /activateModule\("writing"\)/);
  assert.match(continuation, /route\.kind === "open-draft" \? "draft"/);
  assert.match(continuation, /applyWritingTab\(continuationTab/);
  assert.doesNotMatch(continuation, /openWritingDraftNoteById\(/);
});
