import test from "node:test";
import assert from "node:assert/strict";
import { renderImportPageMount } from "../../apps/web/src/import-page-mount.js";

test("redrawn result dialog keeps the active import or export body visible", () => {
  const html = renderImportPageMount({ resultVisible: true, resultMode: "export", exportResult: { html: "EXPORT-RECEIPT" } });
  assert.match(html, /class="modal-mask import-result-modal"/);
  assert.match(html, /id="exportResult">EXPORT-RECEIPT/);
  assert.match(html, /id="importResult" hidden/);
  assert.match(renderImportPageMount({ resultVisible: false }), /import-result-modal hidden/);
});

test("import page mount renders compact import export workspace and result modal", () => {
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
  assert.doesNotMatch(html, /当前结果/);
  assert.doesNotMatch(html, /最近一次操作/);
  assert.match(html, /id="importOperationResultModal"/);
  assert.match(html, /id="importResult"/);
  assert.match(html, /id="exportResult"/);
  assert.doesNotMatch(html, /import-page-header|import-workspace-tab-detail|import-card-kicker/);
  const beforeModal = html.slice(0, html.indexOf('id="importOperationResultModal"'));
  assert.doesNotMatch(beforeModal, /id="btnImportConfirm"/);
  assert.match(html, /id="importPreviewActions" hidden/);
  assert.match(html, /id="btnImportConfirm" type="button" disabled/);
  assert.equal((html.match(/id="btnImportConfirm"/g) || []).length, 1);
});

test("import page mount keeps composed results inside the modal sink", () => {
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
      raw: '{"stage":"preview","importRecordId":"imp_page"}'
    }
  });

  assert.doesNotMatch(html, /import-current-result-card/);
  assert.match(html, /import-result-modal/);
  assert.match(html, /imp_page/);
  assert.match(html, /result-json/);
  assert.doesNotMatch(html, /result-subtitle/);
});
