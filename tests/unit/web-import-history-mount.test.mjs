import test from "node:test";
import assert from "node:assert/strict";
import { renderImportHistoryMount } from "../../apps/web/src/import-history-mount.js";

test("import history mount renders controls and panel together", () => {
  const html = renderImportHistoryMount({
    items: [
      {
        importRecordId: "imp_1",
        status: "preview",
        connector: "markdown",
        summary: { sources: 1, literatureNotes: 0, permanentNotes: 0, warnings: 0 }
      }
    ],
    filters: { status: "preview", connector: "markdown", risk: "all" }
  });

  assert.match(html, /id="importHistoryStatus"/);
  assert.match(html, /id="importHistoryConnector"/);
  assert.match(html, /id="importHistoryRisk"/);
  assert.match(html, /id="btnImportHistoryRefresh"/);
  assert.match(html, /id="importHistory"/);
  assert.match(html, /markdown/);
});
