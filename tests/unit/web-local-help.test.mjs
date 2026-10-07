import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceNotePromotionState } from "../../apps/web/src/source-note-promotion-panel.js";
import { renderWritingThemeIndexCardDom } from "../../apps/web/src/writing-theme-card-panel.js";
import { allowedNextSuggestionStatuses } from "../../packages/ai-orchestrator/src/suggestions.mjs";
import { renderTodayOrganizingPanel } from "../../apps/web/src/today-organizing-panel.js";

const help = await readFile(new URL("../../apps/web/src/help/quick-start.html", import.meta.url), "utf8");
const writing = await readFile(new URL("../../apps/web/src/prototype.html", import.meta.url), "utf8");

test("local help names the actual empty-library primary action", () => {
  const home = renderTodayOrganizingPanel({ isEmptyLibrary: true });
  const label = home.match(/data-today-action="start-first-note"[^>]*>\s*([^<]+)<\/button>/)[1].trim();
  const firstStep = help.slice(help.indexOf("<ol>"), help.indexOf("</li>", help.indexOf("<ol>")));
  assert.ok(firstStep.includes(`“${label}”`));
});

test("local help uses the actual writing output labels", () => {
  for (const label of ["复制正文", "导出文章 .md", "导出整稿 .md"]) {
    assert.ok(help.includes(label));
    assert.ok(writing.includes(label));
  }
});

test("local help distinguishes current article content from saved book chapters", () => {
  assert.match(help, /使用当前编辑内容，不会替你保存草稿/);
  assert.match(help, /读取已保存章节/);
  assert.match(help, /提纲导出不是文章正文导出/);
  assert.match(help, /不会复制整套来源笔记/);
});

test("local help preserves import and uncertain-save boundaries", () => {
  assert.match(help, /先预览，再确认/);
  assert.match(help, /默认不修改原 Vault/);
  assert.match(help, /导回 Markdown/);
  assert.match(help, /未保存内容不保证在刷新或关闭后恢复/);
  assert.match(help, /结果未确认不等于未保存/);
});

test("local help requires no network resources or scripts", () => {
  assert.doesNotMatch(help, /<(?:script|iframe|link)\b|(?:src|href)\s*=\s*["'](?:https?:)?\/\//i);
  assert.match(help, /mailto:lidiansen58@gmail\.com/);
});

test("local help follows current practice, author confirmation and theme continuation", () => {
  for (const label of ["保存当前观点", "这次为什么改变", "形成过程", "笔记关联", "继续提纲", "继续草稿", "继续写", "标记已编辑", "测试连接", "保存远程设置"]) {
    assert.ok(help.includes(label), `missing current help action: ${label}`);
  }
  assert.match(help, /正文链接和手动保存的关联同样进入知识网络/);
  assert.match(help, /没有额外步骤、进度或解锁要求/);
  assert.match(help, /采用 AI 草稿不等于确认自己的观点/);
  assert.match(help, /测试成功只表示连接可用/);
  assert.match(help, /真实本地模型质量和延迟仍待改进/);
});

test("help generates and opens a permanent note before saving its viewpoint", () => {
  const create = sourceNotePromotionState({ note: { id: "f", noteType: "fleeting" } }).primaryActionLabel;
  const open = sourceNotePromotionState({ note: { id: "f", noteType: "fleeting" }, generatedOriginalId: "p" }).primaryActionLabel;
  const steps = help.slice(help.indexOf("<ol>"), help.indexOf("</ol>"));
  assert.ok(steps.indexOf(`“${create}”`) >= 0);
  assert.ok(steps.indexOf(`“${open}”`) > steps.indexOf(`“${create}”`));
  assert.ok(steps.indexOf("“保存当前观点”") > steps.indexOf(`“${open}”`));
});

test("help continuation labels match actual theme buttons", () => {
  for (const project of [{ id: "p" }, { id: "p", scaffold_id: "s" }, { id: "p", draft_note_id: "d" }]) {
    const html = renderWritingThemeIndexCardDom({ writingState: { sourceIndexIds: [] }, writingThemeIndexNoteIds: () => [],
      findExistingWritingProjectForTheme: () => project, describeWritingContinuationAction: () => ({ projectId: "p", action: "resume-project" }),
      escapeHtml: String }, { id: "t" });
    const label = html.match(/<button[^>]*>([^<]+)<\/button>/)[1];
    assert.ok(help.includes(`“${label}”`));
    assert.ok(writing.includes(`“${label}”`));
  }
  assert.doesNotMatch(help, /继续提纲\/草稿/);
});

test("AI help requires the edited state before confirmation and separates manual saving", () => {
  assert.deepEqual(allowedNextSuggestionStatuses("adopted_as_draft"), ["edited"]);
  assert.deepEqual(allowedNextSuggestionStatuses("edited"), ["confirmed"]);
  assert.match(help, /先“采纳为草稿”[\s\S]*再“标记已编辑”[\s\S]*最后“确认建议”/);
  assert.match(help, /不能跳过已编辑步骤/);
  assert.match(help, /手动写观点[\s\S]*不需要走 AI 建议审阅/);
  assert.doesNotMatch(help, /按需“标记已编辑”/);
});

for (const name of ["tauri.conf.json", "tauri.conf.no-updater-artifacts.json"]) {
  test(`desktop ${name} includes the standalone help resource`, async t => {
    const configUrl = new URL(`../../apps/desktop/src-tauri/${name}`, import.meta.url);
    let source;
    try { source = await readFile(configUrl, "utf8"); }
    catch (error) {
      if (name === "tauri.conf.no-updater-artifacts.json" && error.code === "ENOENT") {
        t.skip("Generated desktop configuration is checked when a bundle has been prepared.");
        return;
      }
      throw error;
    }
    const config = JSON.parse(source);
    const entry = Object.entries(config.bundle.resources).find(([, destination]) => destination === "help/");
    assert.ok(entry, "desktop bundle must include the help directory");
    const resourcePath = path.resolve(path.dirname(fileURLToPath(configUrl)), entry[0], "quick-start.html");
    assert.equal(await readFile(resourcePath, "utf8"), help);
  });
}
