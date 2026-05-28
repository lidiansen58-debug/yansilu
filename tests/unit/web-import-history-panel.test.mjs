import test from "node:test";
import assert from "node:assert/strict";
import { renderImportHistoryPanel } from "../../apps/web/src/import-history-panel.js";

test("import history panel renders loading and empty states", () => {
  assert.match(renderImportHistoryPanel({ loading: true }), /正在读取导入记录/);
  assert.match(renderImportHistoryPanel({ items: [] }), /还没有导入记录/);
});

test("import history panel renders filtered empty state", () => {
  const html = renderImportHistoryPanel({
    items: [{ importRecordId: "imp_1", status: "preview", connector: "markdown", summary: { warnings: 0 } }],
    filters: { status: "completed" }
  });

  assert.match(html, /当前筛选下没有导入记录/);
});

test("import history panel renders compact active items and actions", () => {
  const html = renderImportHistoryPanel({
    items: [
      {
        importRecordId: "imp_completed",
        status: "completed",
        connector: "markdown",
        summary: { sources: 1, literatureNotes: 2, permanentNotes: 3, warnings: 0 },
        confirmResult: {
          created: { sources: 1, literatureNotes: 2, permanentNotes: 3 },
          skipped: { conflicted: 1, invalid: 0 }
        },
        literatureBatchProgress: {
          total: 2,
          pending: 1,
          refine: 1,
          ready: 0,
          paraphraseDone: 1,
          remaining: 2,
          nextPendingTitle: "Pending note"
        },
        updatedAt: "2026-05-03T01:02:03.000Z"
      },
      {
        importRecordId: "imp_rolled_back",
        status: "rolled_back",
        connector: "obsidian",
        summary: { sources: 0, literatureNotes: 0, permanentNotes: 0, warnings: 0 },
        rollbackResult: {
          rolledBack: [{ path: "notes/sources/a.md" }],
          skipped: [{ path: "notes/literature/b.md", reason: "modified" }]
        }
      }
    ],
    total: 4,
    activeImportRecordId: "imp_completed"
  });

  assert.match(html, /import-history-item is-active/);
  assert.match(html, />Markdown<\/strong>/);
  assert.match(html, /已完成/);
  assert.match(html, /data-import-history-action="load"/);
  assert.match(html, /data-import-history-action="resume-literature-queue"/);
  assert.match(html, /显示 2 \/ 4/);
});
