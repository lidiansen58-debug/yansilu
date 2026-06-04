import test from "node:test";
import assert from "node:assert/strict";

import { renderImportToolbarPanel } from "../../apps/web/src/import-toolbar-panel.js";

test("import toolbar panel renders a simplified obsidian form with tucked-away compatibility settings", () => {
  const html = renderImportToolbarPanel({
    connector: "obsidian",
    directoryId: "dir_literature_default",
    directoryOptions: [
      { value: "dir_literature_default", label: "文献笔记目录" },
      { value: "dir_original_default", label: "永久笔记目录 / 写作方法" }
    ],
    path: "C:\\vault",
    payload: '{"path":"C:\\\\vault"}',
    options: '{"detectAliases":true}',
    importRecordId: "imp_123",
    confirmButton: {
      disabled: true,
      label: "确认导入（2/3）"
    }
  });

  assert.match(html, /导入/);
  assert.match(html, /从 Obsidian 导入笔记/);
  assert.match(html, /Obsidian 仓库/);
  assert.match(html, /普通导入只需要填写来源仓库和导入位置/);
  assert.match(html, /来源仓库/);
  assert.match(html, /导入到/);
  assert.match(html, /兼容设置（通常不用填）/);
  assert.match(html, /覆盖请求（可选）/);
  assert.match(html, /兼容规则（可选）/);
  assert.match(html, /detectWikilinks/);
  assert.match(html, /id="importDirectoryId"/);
  assert.match(html, /文献笔记目录/);
  assert.match(html, /永久笔记目录 \/ 写作方法/);
  assert.match(html, /id="importConnector"/);
  assert.match(html, /option value="obsidian" selected/);
  assert.match(html, /id="importPath"/);
  assert.ok(html.includes('value="C:\\vault"'));
  assert.match(html, /选择目录/);
  assert.match(html, /id="importPayload"/);
  assert.match(html, /id="importOptions"/);
  assert.match(html, /<details class="import-compat-details">/);
  assert.match(html, /id="importRecordId"/);
  assert.match(html, /id="btnImportPreview"/);
  assert.match(html, />生成预览</);
  assert.match(html, /id="btnImportConfirm" disabled/);
  assert.match(html, /确认导入（2\/3）/);
  assert.doesNotMatch(html, /导入参数 JSON/);
  assert.doesNotMatch(html, /导入选项 JSON/);
  assert.doesNotMatch(html, /id="importAdvanced"/);
  assert.doesNotMatch(html, /id="btnImportCancel"/);
  assert.doesNotMatch(html, /id="btnImportRefresh"/);
  assert.doesNotMatch(html, /id="btnImportRollback"/);
});
