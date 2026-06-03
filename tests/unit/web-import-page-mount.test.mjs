import test from "node:test";
import assert from "node:assert/strict";
import { renderImportPageMount } from "../../apps/web/src/import-page-mount.js";

test("import page mount renders the redesigned workbench shell, export card, and result placeholder", () => {
  const html = renderImportPageMount({
    toolbar: {
      connector: "obsidian",
      path: "E:\\vault"
    }
  });

  assert.match(html, /import-workbench-hero/);
  assert.match(html, /把 Obsidian 笔记稳稳带进来，再整洁导出去/);
  assert.match(html, /id="importToolbarMount"/);
  assert.match(html, /id="exportCardMount"/);
  assert.match(html, /导出工作台/);
  assert.match(html, /把永久笔记整洁导出成 Markdown/);
  assert.match(html, /选择导出范围后即可开始/);
  assert.match(html, /id="importResult"/);
  assert.match(html, /最近一次操作/);
  assert.match(html, /还没有执行导入或导出。先选择 Obsidian 仓库并生成预览。/);
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

  assert.match(html, /import-result-card/);
  assert.match(html, /imp_page/);
  assert.match(html, /result-json/);
});
