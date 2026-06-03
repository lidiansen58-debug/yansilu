import test from "node:test";
import assert from "node:assert/strict";
import { renderImportPageMount } from "../../apps/web/src/import-page-mount.js";

test("import page mount renders simplified toolbar and result placeholders", () => {
  const html = renderImportPageMount({
    toolbar: {
      connector: "obsidian",
      path: "E:\\vault"
    }
  });

  assert.match(html, /id="importToolbarMount"/);
  assert.doesNotMatch(html, /id="importHistoryMount"/);
  assert.match(html, /id="importResult"/);
  assert.match(html, /Obsidian Import/);
  assert.match(html, /Vault Path/);
  assert.match(html, /Advanced/);
  assert.match(html, /Latest Run/);
  assert.match(html, /No import or export result yet\./);
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

  assert.match(html, /result-card/);
  assert.match(html, /imp_page/);
  assert.match(html, /result-json/);
});
