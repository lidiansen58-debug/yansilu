import test from "node:test";
import assert from "node:assert/strict";
import { renderImportHistoryPanel } from "../../apps/web/src/import-history-panel.js";

test("import history panel renders loading and empty states", () => {
  assert.match(renderImportHistoryPanel({ loading: true }), /正在读取导入历史/);
  assert.match(renderImportHistoryPanel({ items: [] }), /还没有导入记录/);
});

test("import history panel renders filtered empty state with counts", () => {
  const html = renderImportHistoryPanel({
    items: [{ importRecordId: "imp_1", status: "preview", connector: "markdown", summary: { warnings: 0 } }],
    filters: { status: "completed" }
  });

  assert.match(html, /当前筛选条件下没有导入记录/);
  assert.match(html, /共 1 条历史记录，当前过滤后为 0 条/);
});

test("import history panel renders active item badges, details, and actions", () => {
  const html = renderImportHistoryPanel({
    items: [
      {
        importRecordId: "imp_completed",
        status: "completed",
        connector: "markdown",
        summary: { sources: 1, literatureNotes: 2, permanentNotes: 3, warnings: 0 },
        confirmResult: {
          created: { sources: 1, literatureNotes: 2, permanentNotes: 3 },
          skipped: { conflicted: 1, invalid: 0 },
          writtenPaths: ["notes/sources", "notes/literature"]
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
  assert.match(html, /tone-ok">已写入/);
  assert.match(html, /data-import-history-action="load"/);
  assert.match(html, /data-import-history-action="resume-literature-queue"/);
  assert.match(html, /data-import-history-action="open-literature-queue"/);
  assert.match(html, /data-import-history-action="rollback"/);
  assert.match(html, /Pending note/);
  assert.match(html, /已创建 1 来源卡片 \/ 2 文献笔记 \/ 3 永久笔记/);
  assert.match(html, /写入 notes\/sources、notes\/literature/);
  assert.match(html, /待转述 1/);
  assert.match(html, /剩余待处理 2/);
  assert.match(html, /保留 1/);
  assert.match(html, /当前显示 2 条 \/ 全部 4 条/);
});
