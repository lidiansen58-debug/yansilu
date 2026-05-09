import test from "node:test";
import assert from "node:assert/strict";
import { renderImportHistoryControls } from "../../apps/web/src/import-history-controls.js";

test("import history controls render default filter state and refresh button", () => {
  const html = renderImportHistoryControls();
  assert.match(html, /id="importHistoryStatus"/);
  assert.match(html, /id="importHistoryConnector"/);
  assert.match(html, /id="importHistoryRisk"/);
  assert.match(html, /id="btnImportHistoryRefresh"/);
  assert.match(html, /option value="all" selected/);
});

test("import history controls render selected filter values", () => {
  const html = renderImportHistoryControls({
    filters: {
      status: "completed",
      connector: "obsidian",
      risk: "blocked"
    }
  });

  assert.match(html, /option value="completed" selected/);
  assert.match(html, /option value="obsidian" selected/);
  assert.match(html, /option value="blocked" selected/);
});
