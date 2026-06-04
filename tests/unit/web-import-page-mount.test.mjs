import test from "node:test";
import assert from "node:assert/strict";
import { renderImportPageMount } from "../../apps/web/src/import-page-mount.js";

test("import page mount renders current import export workspace and result placeholder", () => {
  const html = renderImportPageMount({
    toolbar: {
      connector: "obsidian",
      path: "E:\\vault"
    },
    activeTab: "import"
  });

  assert.match(html, /导入导出/);
  assert.doesNotMatch(html, /导入与导出/);
  assert.doesNotMatch(html, /选择导入或导出/);
  assert.match(html, /data-import-workspace-tab="import"/);
  assert.match(html, /id="importWorkspaceTabImport"/);
  assert.match(html, /id="importWorkspaceTabExport"/);
  assert.match(html, /id="importToolbarMount"/);
  assert.match(html, /id="exportCardMount"/);
  assert.match(html, /导入 Obsidian/);
  assert.match(html, /导出 Markdown/);
  assert.match(html, /当前结果/);
  assert.doesNotMatch(html, /最近一次操作/);
  assert.match(html, /还没有执行操作/);
});

test("import page mount can render a composed result card", () => {
  const html = renderImportPageMount({
    result: {
      data: {
        stage: "preview",
        importRecordId: "imp_page",
        connector: "obsidian",
        status: "preview",
        summary: { sources: 1, literatureNotes: 1, permanentNotes: 1, warnings: 0 },
        warnings: []
      },
      raw: '{"stage":"preview"}'
    }
  });

  assert.match(html, /import-current-result-card/);
  assert.match(html, /imp_page/);
  assert.match(html, /result-json/);
});
