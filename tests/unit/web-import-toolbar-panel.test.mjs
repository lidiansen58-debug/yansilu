import test from "node:test";
import assert from "node:assert/strict";

import { renderImportToolbarPanel } from "../../apps/web/src/import-toolbar-panel.js";

test("import toolbar panel renders the redesigned Chinese-first obsidian workflow", () => {
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
      label: "确认导入（1/3）"
    }
  });

  assert.match(html, /导入工作台/);
  assert.match(html, /从 Obsidian 导入笔记/);
  assert.match(html, /仅支持 Obsidian/);
  assert.match(html, /先选择你的 Obsidian 仓库目录/);
  assert.match(html, /选择仓库/);
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
  assert.match(html, /id="importRecordId"/);
  assert.match(html, /id="btnImportPreview"/);
  assert.match(html, />生成预览</);
  assert.match(html, /id="btnImportConfirm" disabled/);
  assert.match(html, /确认导入（1\/3）/);
  assert.match(html, /高级选项（通常无需修改）/);
  assert.doesNotMatch(html, /id="btnImportCancel"/);
  assert.doesNotMatch(html, /id="btnImportRefresh"/);
  assert.doesNotMatch(html, /id="btnImportRollback"/);
});
