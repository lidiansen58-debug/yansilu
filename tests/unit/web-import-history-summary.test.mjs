import test from "node:test";
import assert from "node:assert/strict";
import {
  importHistoryRecentSummaryModel,
  latestImportHistoryItem,
  renderImportHistoryRecentSummary
} from "../../apps/web/src/import-history-summary.js";

test("import history summary renders empty and loading states", () => {
  assert.match(renderImportHistoryRecentSummary({ items: [] }), /暂无记录/);
  assert.match(renderImportHistoryRecentSummary({ loading: true }), /正在同步历史记录/);
});

test("import history summary picks the newest record and exposes preview action", () => {
  const older = {
    importRecordId: "imp_old",
    connector: "obsidian",
    status: "completed",
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
  const newer = {
    importRecordId: "imp_new",
    connector: "markdown",
    status: "preview",
    summary: { sources: 1, literatureNotes: 1, permanentNotes: 0, warnings: 0 },
    updatedAt: "2026-05-02T00:00:00.000Z"
  };

  assert.equal(latestImportHistoryItem([older, newer]).importRecordId, "imp_new");

  const model = importHistoryRecentSummaryModel({ items: [older, newer] });
  assert.equal(model.title, "Markdown · 预览中");
  assert.equal(model.actions[0].action, "load");
  assert.match(model.detail, /来源 1/);
});

test("import history summary highlights queue recovery and rollback retention", () => {
  const completed = {
    importRecordId: "imp_completed",
    connector: "notebooklm",
    status: "completed",
    updatedAt: "2026-05-03T00:00:00.000Z",
    literatureBatchProgress: {
      total: 4,
      remaining: 2,
      pending: 1,
      refine: 1,
      ready: 0
    }
  };
  const rolledBack = {
    importRecordId: "imp_rb",
    connector: "markdown",
    status: "rolled_back",
    updatedAt: "2026-05-04T00:00:00.000Z",
    rollbackResult: {
      rolledBack: [],
      skipped: [{ reason: "modified" }]
    }
  };

  const queueHtml = renderImportHistoryRecentSummary({ items: [completed] });
  assert.match(queueHtml, /NotebookLM · 已写入/);
  assert.match(queueHtml, /已处理 2\/4/);
  assert.match(queueHtml, /data-import-history-action="resume-literature-queue"/);

  const rollbackHtml = renderImportHistoryRecentSummary({ items: [completed, rolledBack] });
  assert.match(rollbackHtml, /保留 1/);
  assert.match(rollbackHtml, /手动核对/);
});
