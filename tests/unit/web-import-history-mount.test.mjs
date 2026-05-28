import test from "node:test";
import assert from "node:assert/strict";
import { renderImportHistoryMount } from "../../apps/web/src/import-history-mount.js";

test("import history mount renders recent summary and panel together", () => {
  const html = renderImportHistoryMount({
    items: [
      {
        importRecordId: "imp_1",
        status: "preview",
        connector: "markdown",
        summary: { sources: 1, literatureNotes: 0, permanentNotes: 0, warnings: 0 },
        updatedAt: "2026-05-03T01:02:03.000Z"
      }
    ],
    filters: { status: "preview", connector: "markdown", risk: "all" }
  });

  assert.match(html, /import-history-summary/);
  assert.match(html, /Markdown/);
  assert.match(html, /预览中/);
  assert.match(html, /data-import-history-action="load"/);
  assert.match(html, /id="importHistory"/);
});
