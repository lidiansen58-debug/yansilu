import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const help = await readFile(new URL("../../apps/web/src/help/quick-start.html", import.meta.url), "utf8");
const writing = await readFile(new URL("../../apps/web/src/prototype.html", import.meta.url), "utf8");

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

for (const name of ["tauri.conf.json", "tauri.conf.no-updater-artifacts.json"]) {
  test(`desktop ${name} includes the standalone help resource`, async () => {
    const configUrl = new URL(`../../apps/desktop/src-tauri/${name}`, import.meta.url);
    const config = JSON.parse(await readFile(configUrl, "utf8"));
    const entry = Object.entries(config.bundle.resources).find(([, destination]) => destination === "help/");
    assert.ok(entry, "desktop bundle must include the help directory");
    const resourcePath = path.resolve(path.dirname(fileURLToPath(configUrl)), entry[0], "quick-start.html");
    assert.equal(await readFile(resourcePath, "utf8"), help);
  });
}
