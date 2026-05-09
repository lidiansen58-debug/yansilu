import test from "node:test";
import assert from "node:assert/strict";
import { renderImportHistoryControls } from "../../apps/web/src/import-history-controls.js";

test("import history controls render default filter state and refresh button", () => {
  const html = renderImportHistoryControls();
  assert.match(html, /id="importHistoryStatus"/);
  assert.match(html, /id="importHistoryConnector"/);
  assert.match(html, /id="importHistoryRisk"/);
  assert.match(html, /id="btnImportHistoryRefresh"/);
  assert.match(html, /<span>状态<\/span>/);
  assert.match(html, /<span>连接器<\/span>/);
  assert.match(html, /<span>风险<\/span>/);
  assert.match(html, /刷新历史/);
  assert.match(html, /option value="all" selected/);
  assert.match(html, /全部状态/);
  assert.match(html, /全部连接器/);
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
  assert.match(html, /已完成/);
  assert.match(html, /Obsidian/);
  assert.match(html, /有阻断/);
});
