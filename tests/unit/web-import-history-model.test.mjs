import test from "node:test";
import assert from "node:assert/strict";
import {
  filterImportHistoryItems,
  importHistoryActions,
  importHistoryAlertBadges,
  importHistoryConnectorLabel,
  importHistoryDetailSummary,
  importHistoryOriginalityCounts,
  importHistoryQueueProgressText,
  importHistoryRiskHint,
  importHistorySummary,
  importStatusLabel,
  importStatusTone
} from "../../apps/web/src/import-history-model.js";

test("import history model derives labels, tones, connectors, and summaries", () => {
  const record = {
    status: "preview",
    summary: { sources: 1, literatureNotes: 2, permanentNotes: 3, warnings: 4 }
  };

  assert.equal(importStatusLabel("preview"), "预览中");
  assert.equal(importStatusTone("rolled_back"), "warn");
  assert.equal(importHistoryConnectorLabel("notebooklm"), "NotebookLM");
  assert.equal(importHistorySummary(record), "来源 1 / 文献 2 / 永久 3 / 警告 4");
});

test("import history model derives preview badges details and risk hints", () => {
  const record = {
    status: "preview",
    summary: { sources: 1, literatureNotes: 1, permanentNotes: 2, warnings: 2 },
    originalityGuard: {
      evaluations: [{ status: "warning" }, { status: "blocked" }]
    }
  };

  assert.deepEqual(importHistoryOriginalityCounts(record), { blocked: 1, warning: 1 });
  assert.deepEqual(importHistoryAlertBadges(record), [
    { tone: "warn", text: "警告 2" },
    { tone: "bad", text: "阻止 1" }
  ]);
  assert.match(importHistoryRiskHint(record), /阻止项默认不会写入/);

  const detail = importHistoryDetailSummary(record);
  assert.equal(detail.length, 3);
  assert.match(detail[0], /1 来源卡片/);
  assert.match(detail[0], /1 文献笔记/);
  assert.match(detail[0], /2 永久笔记/);
  assert.match(detail[1], /普通警告 2/);
  assert.match(detail[1], /原创性警告 1/);
  assert.match(detail[1], /原创性阻止 1/);
  assert.match(detail[2], /显式覆盖原创性保护/);
});

test("import history model derives rollback modified badges detail and hint", () => {
  const record = {
    status: "rolled_back",
    rollbackResult: {
      rolledBack: [{ path: "notes/sources/src_1.md" }],
      skipped: [
        { path: "notes/literature/ln_1.md", reason: "modified" },
        { path: "notes/literature/ln_2.md", reason: "ENOENT" }
      ]
    }
  };

  assert.deepEqual(importHistoryAlertBadges(record), [{ tone: "warn", text: "保留 1" }]);
  assert.match(importHistoryRiskHint(record), /已修改文件被保留/);

  const detail = importHistoryDetailSummary(record);
  assert.equal(detail.length, 4);
  assert.equal(detail[0], "已回滚 1 项");
  assert.equal(detail[1], "跳过 2 项");
  assert.equal(detail[2], "其中 1 项因已被修改而保留");
  assert.match(detail[3], /手动核对/);
});

test("import history model derives completed detail summary and literature queue progress", () => {
  const record = {
    status: "completed",
    confirmResult: {
      created: { sources: 1, literatureNotes: 2, permanentNotes: 3 },
      skipped: { conflicted: 1, invalid: 0 },
      writtenPaths: ["notes/sources", "notes/literature"]
    },
    literatureBatchProgress: {
      total: 10,
      pending: 1,
      refine: 2,
      ready: 3,
      remaining: 4,
      nextPendingTitle: "Pending literature note"
    }
  };

  assert.equal(importHistoryQueueProgressText(record.literatureBatchProgress), "文献队列 已处理 6/10 / 待转述 1 / 待提炼 2 / 可转永久笔记 3");

  const detail = importHistoryDetailSummary(record);
  assert.equal(detail.length, 5);
  assert.equal(detail[0], "已创建：1 来源卡片 / 2 文献笔记 / 3 永久笔记");
  assert.equal(detail[1], "跳过 冲突 1 / 无效 0");
  assert.equal(detail[2], "写入 notes/sources、notes/literature");
  assert.match(detail[3], /已处理 6\/10/);
  assert.equal(detail[4], "下一条待处理 Pending literature note");
});

test("import history model exposes imported asset file counts", () => {
  const record = {
    status: "completed",
    confirmResult: {
      created: { sources: 1, literatureNotes: 1, permanentNotes: 0 },
      skipped: { conflicted: 0, invalid: 0 },
      writtenPaths: ["notes/sources", "assets/imports/imp_assets"],
      createdFiles: [
        { noteType: "source", path: "notes/sources/src_1.md" },
        { noteType: "literature", path: "notes/literature/ln_1.md" },
        { noteType: "asset", path: "assets/imports/imp_assets/chart.png" }
      ]
    }
  };

  const detail = importHistoryDetailSummary(record);
  assert.match(detail[3], /随导入写入资源 1 个/);
  assert.match(detail[3], /文件总数 3/);
});

test("import history model filters by status, connector, and risk", () => {
  const items = [
    {
      importRecordId: "imp_preview_blocked",
      status: "preview",
      connector: "markdown",
      summary: { warnings: 1 },
      originalityGuard: { evaluations: [{ status: "blocked" }] }
    },
    {
      importRecordId: "imp_completed",
      status: "completed",
      connector: "obsidian",
      summary: { warnings: 0 },
      originalityGuard: { evaluations: [] }
    },
    {
      importRecordId: "imp_rollback_modified",
      status: "rolled_back",
      connector: "markdown",
      summary: { warnings: 0 },
      rollbackResult: { skipped: [{ reason: "modified" }] },
      originalityGuard: { evaluations: [] }
    }
  ];

  assert.deepEqual(
    filterImportHistoryItems(items, { risk: "blocked" }).map((item) => item.importRecordId),
    ["imp_preview_blocked"]
  );
  assert.deepEqual(
    filterImportHistoryItems(items, { status: "rolled_back", risk: "modified" }).map((item) => item.importRecordId),
    ["imp_rollback_modified"]
  );
  assert.deepEqual(
    filterImportHistoryItems(items, { connector: "obsidian" }).map((item) => item.importRecordId),
    ["imp_completed"]
  );
});

test("import history model includes literature batch progress for completed records", () => {
  const record = {
    status: "completed",
    confirmResult: {
      created: { sources: 0, literatureNotes: 2, permanentNotes: 0 },
      skipped: { conflicted: 0, invalid: 0 },
      writtenPaths: ["notes/literature"]
    },
    literatureBatchProgress: {
      total: 2,
      pending: 1,
      refine: 1,
      ready: 0,
      paraphraseDone: 1,
      remaining: 2
    }
  };

  const detail = importHistoryDetailSummary(record);
  assert.equal(detail.length, 4);
  assert.match(detail[3], /已处理 0\/2/);
  assert.match(detail[3], /待转述 1/);
});

test("import history model marks cleared batches and exposes queue action", () => {
  const clearedRecord = {
    status: "completed",
    literatureBatchProgress: {
      total: 2,
      pending: 0,
      refine: 0,
      ready: 2,
      paraphraseDone: 2,
      remaining: 0
    }
  };
  const activeRecord = {
    status: "completed",
    literatureBatchProgress: {
      total: 2,
      pending: 1,
      refine: 0,
      ready: 1,
      paraphraseDone: 1,
      remaining: 1,
      nextPendingTitle: "Pending note"
    }
  };
  const readyRecord = {
    status: "completed",
    literatureBatchProgress: {
      total: 2,
      pending: 0,
      refine: 0,
      ready: 2,
      paraphraseDone: 2,
      remaining: 0,
      nextReadyTitle: "Ready note"
    }
  };

  assert.deepEqual(importHistoryAlertBadges(clearedRecord), [{ tone: "ok", text: "文献队列已清空" }]);
  assert.deepEqual(importHistoryActions(activeRecord).map((item) => item.action), ["load", "resume-literature-queue", "open-literature-queue", "rollback"]);
  assert.deepEqual(importHistoryActions(readyRecord).map((item) => item.action), ["load", "promote-literature-batch", "open-literature-queue", "rollback"]);
});

test("import history model surfaces failed lifecycle records", () => {
  const record = {
    importRecordId: "imp_failed_1",
    status: "failed",
    connector: "markdown",
    summary: { sources: 1, literatureNotes: 1, permanentNotes: 0, warnings: 0 },
    failureResult: {
      code: "IMPORT_CLEANUP_PRESERVE_FAILED",
      message: "preserve move failed"
    }
  };

  assert.equal(importStatusLabel("failed"), "已失败");
  assert.equal(importStatusTone("failed"), "bad");
  assert.deepEqual(importHistoryAlertBadges(record), [{ tone: "bad", text: "失败" }]);
  assert.match(importHistoryRiskHint(record), /未能安全移入恢复区/);
  assert.deepEqual(importHistoryActions(record), [{ action: "load", label: "查看失败" }]);
  assert.deepEqual(filterImportHistoryItems([record], { risk: "modified" }).map((item) => item.importRecordId), ["imp_failed_1"]);

  const detail = importHistoryDetailSummary(record);
  assert.deepEqual(detail, [
    "候选：1 来源卡片 / 1 文献笔记 / 0 永久笔记",
    "失败代码 IMPORT_CLEANUP_PRESERVE_FAILED",
    "preserve move failed",
    "导入失败，已修改文件未能安全移入恢复区，请先手动处理这些文件后再重试。"
  ]);
});
