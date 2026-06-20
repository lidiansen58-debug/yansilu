import test from "node:test";
import assert from "node:assert/strict";
import {
  readComponentsEditorPaneSource,
  readPrototypeAppSource,
  readPrototypeHtmlSource
} from "./copy-source-helpers.mjs";

test("writing center primary buttons use current project and 草稿骨架 wording", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /id="btnWritingUseCurrent">把当前笔记加入写作篮</);
  assert.match(html, /id="btnWritingAddVisible">把当前目录观点加入写作篮</);
  assert.match(html, /id="btnWritingCreateProject">创建项目</);
  assert.match(html, /id="btnWritingCreateScaffold">生成草稿骨架</);
  assert.match(html, /<h4>草稿骨架预览<\/h4>/);
  assert.match(html, /id="writingResult">尚未开始项目/);
});

test("writing center static flow placeholder keeps the create-project to 草稿骨架 sequence", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /<strong>创建项目<\/strong><small>先明确题目和读者，再创建项目<\/small>/);
  assert.match(html, /<strong>生成草稿骨架<\/strong><small>检查证据和缺口<\/small>/);
  assert.match(html, /<strong>保存草稿<\/strong><small>生成草稿骨架后再保存<\/small>/);
  assert.match(html, /看项目是否已创建、草稿骨架是否已生成，以及下一步能否导出或保存草稿。/);
});

test("writing center overview layout supports five status cards and a compact top summary", async () => {
  const html = await readPrototypeHtmlSource();
  const source = await readPrototypeAppSource();

  assert.match(html, /id="writingToplineMetrics"/);
  assert.match(html, /\.writing-status-strip\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(164px,\s*1fr\)\)/);
  assert.match(html, /class="writing-theme-detail-panel"/);
  assert.match(html, /class="writing-section writing-output-card"/);
  assert.match(source, /function renderWritingToplineMetric/);
  assert.match(source, /renderWritingToplineMetric\(\s*"写作篮"/);
  assert.match(source, /renderWritingStatusCard\("草稿"/);
});

test("writing basket manual edits refresh readiness and clear stale project context", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /function handleWritingBasketManualInput\(\) \{/);
  assert.match(source, /resetWritingStrongModelState\(\);/);
  assert.match(source, /clearWritingSourceIndexIds\(\);/);
  assert.match(source, /resetWritingProjectContext\(\{ title, goal, audience, tone \}\);/);
  assert.match(source, /refreshWritingRelationCounts\(parseWritingBasketIds\(\)\)/);
  assert.match(source, /\$\("writingBasketNoteIds"\)\?\.addEventListener\("input", handleWritingBasketManualInput\);/);
});

test("writing note cards use 写作篮 wording for add and remove actions", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /actionLabel = "加入写作篮/);
  assert.match(source, /renderWritingNoteCard\(entry, \{ selected: true, action: "remove", actionLabel: "移出写作篮" \}\)/);
  assert.match(source, /actionLabel: basketIdSet\.has\(entry\.id\) \? "移出写作篮" : "加入写作篮"/);
});

test("writing entry surfaces consistently use 写作中心, 项目, and 草稿骨架 wording", async () => {
  const appSource = await readPrototypeAppSource();
  const editorSource = await readComponentsEditorPaneSource();

  assert.match(appSource, /进入写作中心/);
  assert.match(appSource, /可进入写作中心/);
  assert.match(appSource, /从成熟笔记进入写作中心。/);
  assert.match(appSource, /草稿骨架预览/);
  assert.match(appSource, /当前版本/);
  assert.match(appSource, /设为当前版本/);
  assert.match(appSource, /后续就能从这里继续一条可续接的写作入口。/);
  assert.match(editorSource, /可进入写作中心/);
  assert.match(editorSource, /先确认观点，再进入写作中心/);
});
