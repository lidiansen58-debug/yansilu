import test from "node:test";
import assert from "node:assert/strict";
import { renderImportPageMount } from "../../apps/web/src/import-page-mount.js";

test("import page mount renders simplified toolbar, history, and result placeholders", () => {
  const html = renderImportPageMount({
    toolbar: {
      connector: "markdown",
      path: "E:\\vault"
    },
    history: {
      items: [],
      total: 0,
      loading: false,
      filters: {
        status: "all",
        connector: "all",
        risk: "all"
      }
    }
  });

  assert.match(html, /id="importToolbarMount"/);
  assert.match(html, /id="importHistoryMount"/);
  assert.match(html, /id="importResult"/);
  assert.match(html, /导入/);
  assert.match(html, /路径/);
  assert.match(html, /高级选项/);
  assert.match(html, /最近导入/);
  assert.match(html, /暂无记录/);
  assert.match(html, /还没有导入结果/);
});

test("import page mount can render a composed result card", () => {
  const html = renderImportPageMount({
    result: {
      data: {
        stage: "preview",
        importRecordId: "imp_page",
        connector: "markdown",
        status: "preview",
        summary: { sources: 1, literatureNotes: 1, permanentNotes: 1, warnings: 0 },
        warnings: []
      },
      raw: '{"stage":"preview"}'
    }
  });

  assert.match(html, /result-card/);
  assert.match(html, /imp_page/);
  assert.match(html, /result-json/);
});
