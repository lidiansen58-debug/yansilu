import assert from "node:assert/strict";
import test from "node:test";

import { renderImportToolbarPanel } from "../../apps/web/src/import-toolbar-panel.js";

test("import toolbar defaults to the beginner Obsidian import path", () => {
  const html = renderImportToolbarPanel({
    path: "",
    payload: "{\"path\":\"E:/Notes\"}",
    options: "{\"detectWikilinks\":true}",
    directoryOptions: [{ value: "dir_original_default", label: "永久笔记目录" }],
    directoryId: "dir_original_default"
  });

  assert.match(html, /来源仓库/);
  assert.match(html, /先预览确认：默认不修改原 Vault；导入后的笔记可随时导回 Markdown/);
  assert.match(html, /第 2 步：生成预览/);
  assert.match(html, /确认导入/);
  assert.match(html, /<details class="import-compat-details">/);
  assert.match(html, /<summary>高级导入设置<\/summary>/);
  assert.doesNotMatch(html, /<details class="import-compat-details" open>/);
  assert.match(html, /detectWikilinks/);
});
