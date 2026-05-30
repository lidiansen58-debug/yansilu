import test from "node:test";
import assert from "node:assert/strict";
import { renderImportToolbarPanel } from "../../apps/web/src/import-toolbar-panel.js";

test("import toolbar panel prioritizes file-box directory and keeps source path in advanced options", () => {
  const html = renderImportToolbarPanel({
    connector: "obsidian",
    directoryId: "dir_literature_default",
    directoryOptions: [
      { value: "dir_literature_default", label: "文献盒" },
      { value: "dir_original_default", label: "永久笔记盒 / 方法论" }
    ],
    path: "C:\\vault",
    payload: '{"path":"C:\\\\vault"}',
    options: '{"detectAliases":true}',
    importRecordId: "imp_123",
    confirmButton: {
      disabled: true,
      label: "确认写入 1/3"
    }
  });

  assert.match(html, /id="importDirectoryId"/);
  assert.match(html, /文献盒/);
  assert.match(html, /永久笔记盒 \/ 方法论/);
  assert.match(html, /id="importConnector"/);
  assert.match(html, /option value="obsidian" selected/);
  assert.match(html, /id="importPath"/);
  assert.ok(html.includes('value="C:\\vault"'));
  assert.match(html, /id="importPayload"/);
  assert.match(html, /id="importOptions"/);
  assert.match(html, /id="importRecordId"/);
  assert.match(html, /id="btnImportPreview"/);
  assert.match(html, /生成预览/);
  assert.match(html, /id="btnImportConfirm" disabled/);
  assert.match(html, /确认写入 1\/3/);
  assert.match(html, /id="btnImportCancel"/);
  assert.match(html, /id="btnImportRefresh"/);
  assert.match(html, /id="btnImportRollback"/);
  assert.match(html, /导入资料/);
  assert.match(html, /导入到/);
  assert.match(html, /先选文件盒目录。物理路径只在高级选项里填写。/);
  assert.match(html, /来源目录/);
  assert.match(html, /高级选项/);
});
