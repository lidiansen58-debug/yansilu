import test from "node:test";
import assert from "node:assert/strict";
import {
  filterImportHistoryItems,
  importHistoryActions,
  importHistoryAlertBadges,
  importHistoryDetailSummary,
  importHistoryOriginalityCounts,
  importHistorySummary,
  importStatusLabel,
  importStatusTone
} from "../../apps/web/src/import-history-model.js";

test("import history model derives labels, tones, and summaries", () => {
  const record = {
    status: "preview",
    summary: { sources: 1, literatureNotes: 2, permanentNotes: 3, warnings: 4 }
  };

  assert.equal(typeof importStatusLabel("preview"), "string");
  assert.ok(importStatusLabel("preview").length > 0);
  assert.equal(importStatusTone("rolled_back"), "warn");
  assert.equal(importHistorySummary(record), "S1 · L2 · P3 · W4");
});

test("import history model derives preview badges and details from warnings and originality", () => {
  const record = {
    status: "preview",
    summary: { sources: 1, literatureNotes: 1, permanentNotes: 2, warnings: 2 },
    originalityGuard: {
      evaluations: [
        { status: "warning" },
        { status: "blocked" }
      ]
    }
  };

  assert.deepEqual(importHistoryOriginalityCounts(record), { blocked: 1, warning: 1 });
  assert.deepEqual(importHistoryAlertBadges(record), [
    { tone: "warn", text: "Warning 2" },
    { tone: "bad", text: "Blocked 1" }
  ]);

  const detail = importHistoryDetailSummary(record);
  assert.equal(detail.length, 2);
  assert.match(detail[0], /1 Source/);
  assert.match(detail[0], /1 Literature/);
  assert.match(detail[0], /2 Permanent/);
  assert.match(detail[1], /warning 2/);
  assert.match(detail[1], /originality warning 1/);
  assert.match(detail[1], /blocked 1/);
});

test("import history model derives rollback modified badges and detail", () => {
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

  assert.deepEqual(importHistoryAlertBadges(record), [{ tone: "warn", text: "Modified 1" }]);

  const detail = importHistoryDetailSummary(record);
  assert.equal(detail.length, 3);
  assert.match(detail[0], /1/);
  assert.match(detail[1], /2/);
  assert.match(detail[2], /1/);
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

  const detail = importHistoryDetailSummary(record);
  assert.equal(detail.length, 5);
  assert.match(detail[0], /S1/);
  assert.match(detail[0], /L2/);
  assert.match(detail[0], /P3/);
  assert.match(detail[1], /1/);
  assert.match(detail[1], /0/);
  assert.match(detail[2], /notes\/sources/);
  assert.match(detail[2], /notes\/literature/);
  assert.match(detail[3], /1/);
  assert.match(detail[3], /2/);
  assert.match(detail[3], /3/);
  assert.match(detail[3], /4/);
  assert.match(detail[4], /Pending literature note/);
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
  assert.match(detail[3], /1/);
  assert.match(detail[3], /2/);
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

  assert.deepEqual(importHistoryAlertBadges(clearedRecord), [{ tone: "ok", text: importHistoryAlertBadges(clearedRecord)[0].text }]);
  assert.equal(importHistoryAlertBadges(clearedRecord)[0].tone, "ok");
  assert.ok(importHistoryAlertBadges(clearedRecord)[0].text.length > 0);
  assert.deepEqual(importHistoryActions(activeRecord).map((item) => item.action), ["load", "resume-literature-queue", "open-literature-queue", "rollback"]);
  assert.deepEqual(importHistoryActions(readyRecord).map((item) => item.action), ["load", "promote-literature-batch", "open-literature-queue", "rollback"]);
});
