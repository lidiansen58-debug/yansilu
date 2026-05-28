import test from "node:test";
import assert from "node:assert/strict";
import { renderImportToolbarPanel } from "../../apps/web/src/import-toolbar-panel.js";

test("import toolbar panel renders ids and selected connector", () => {
  const html = renderImportToolbarPanel({
    connector: "obsidian",
    path: "C:\\vault",
    payload: '{"path":"C:\\\\vault"}',
    options: '{"detectAliases":true}',
    importRecordId: "imp_123",
    confirmButton: {
      disabled: true,
      label: "确认写入（2/3）"
    }
  });

  assert.match(html, /id="importConnector"/);
  assert.match(html, /option value="obsidian" selected/);
  assert.match(html, />Obsidian<\/option>/);
  assert.match(html, /id="importPath"/);
  assert.ok(html.includes('value="C:\\vault"'));
  assert.match(html, /id="importPayload"/);
  assert.match(html, /id="importOptions"/);
  assert.match(html, /id="importRecordId"/);
  assert.match(html, /id="btnImportPreview"/);
  assert.match(html, /id="btnImportConfirm" disabled/);
  assert.match(html, /确认写入（2\/3）/);
  assert.match(html, /id="btnImportCancel"/);
  assert.match(html, /id="btnImportRefresh"/);
  assert.match(html, /id="btnImportRollback"/);
  assert.match(html, /导入/);
  assert.match(html, /预览后导入/);
  assert.match(html, /来源/);
  assert.match(html, /路径/);
  assert.match(html, /高级选项/);
});
