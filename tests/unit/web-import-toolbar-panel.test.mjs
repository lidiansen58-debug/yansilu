import test from "node:test";
import assert from "node:assert/strict";

import {
  preferredImportDirectoryIdFromOptions
} from "../../apps/web/src/import-toolbar-model.js";
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
      label: "确认导入（0/3）"
    }
  });

  assert.match(html, /导入/);
  assert.match(html, /从 Obsidian 导入/);
  assert.match(html, /Obsidian 仓库/);
  assert.doesNotMatch(html, /普通导入只需要填写来源仓库和导入位置/);
  assert.doesNotMatch(html, /当前任务/);
  assert.match(html, /来源仓库/);
  assert.match(html, /默认保存到/);
  assert.match(html, /默认选永久笔记目录；导入时仍会按笔记类型放入对应盒子。/);
  assert.match(html, /兼容设置（通常不用填）/);
  assert.match(html, /覆盖请求（可选）/);
  assert.match(html, /兼容规则（可选）/);
  assert.match(html, /detectWikilinks/);
  assert.match(html, /\[\[关联标题\]\]/);
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
  assert.match(html, /确认导入（0\/3）/);
  assert.doesNotMatch(html, /导入参数 JSON/);
  assert.doesNotMatch(html, /导入选项 JSON/);
  assert.doesNotMatch(html, /id="importAdvanced"/);
  assert.doesNotMatch(html, /id="btnImportCancel"/);
  assert.doesNotMatch(html, /id="btnImportRefresh"/);
  assert.doesNotMatch(html, /id="btnImportRollback"/);
});

test("import toolbar panel falls back to permanent note directory when directory options are not ready", () => {
  const html = renderImportToolbarPanel({
    connector: "obsidian",
    directoryOptions: []
  });

  assert.match(html, /<option value="dir_original_default">永久笔记目录<\/option>/);
  assert.doesNotMatch(html, /<option value="dir_literature_default">文献笔记目录<\/option>/);
});

test("import directory preference keeps permanent notes as the default landing choice", () => {
  const options = [
    { id: "dir_literature_default" },
    { id: "dir_original_default" },
    { id: "original_child" }
  ];
  const rootIdForDirectory = (directoryId = "") =>
    directoryId === "original_child" || directoryId === "dir_original_default"
      ? "dir_original_default"
      : "dir_literature_default";

  assert.equal(
    preferredImportDirectoryIdFromOptions({ directoryOptions: options, rootIdForDirectory }),
    "dir_original_default"
  );
  assert.equal(
    preferredImportDirectoryIdFromOptions({
      selectedFolderId: "original_child",
      directoryOptions: options,
      rootIdForDirectory
    }),
    "original_child"
  );
  assert.equal(
    preferredImportDirectoryIdFromOptions({
      selectedFolderId: "dir_literature_default",
      directoryOptions: options,
      rootIdForDirectory
    }),
    "dir_original_default"
  );
});
