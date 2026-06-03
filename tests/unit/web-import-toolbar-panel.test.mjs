import test from "node:test";
import assert from "node:assert/strict";

import { renderImportToolbarPanel } from "../../apps/web/src/import-toolbar-panel.js";

test("import toolbar panel keeps obsidian path in advanced options and exposes preview plus confirm", () => {
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

  assert.match(html, /Obsidian Import/);
  assert.match(html, /Preview first/);
  assert.match(html, /Use the Obsidian vault path, preview the files, then confirm import\./);
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
  assert.match(html, />Preview</);
  assert.match(html, /id="btnImportConfirm" disabled/);
  assert.match(html, /确认写入 1\/3/);
  assert.doesNotMatch(html, /id="btnImportCancel"/);
  assert.doesNotMatch(html, /id="btnImportRefresh"/);
  assert.doesNotMatch(html, /id="btnImportRollback"/);
  assert.match(html, /Import Into/);
  assert.match(html, /Source/);
  assert.match(html, /Vault Path/);
  assert.match(html, /Advanced/);
});
