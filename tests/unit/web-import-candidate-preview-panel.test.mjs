import test from "node:test";
import assert from "node:assert/strict";
import { renderCandidatePreview, renderConfirmSkipBreakdown } from "../../apps/web/src/import-candidate-preview-panel.js";

test("candidate preview panel renders simplified selection summary", () => {
  const preview = {
    total: { sources: 1, literatureNotes: 0, permanentNotes: 1 },
    sources: [{ id: "src_1", title: "Source A" }],
    permanentNotes: [{ id: "pn_1", title: "Perm A", originalityStatus: "warning", reasons: ["citation_locator_missing"] }]
  };

  const html = renderCandidatePreview(preview, {
    interactive: true,
    summary: {
      selectedIds: new Set(["src_1"]),
      selectedCount: 1,
      totalCount: 2,
      excludedCount: 1
    }
  });

  assert.match(html, /将导入：1 来源 \/ 0 文献 \/ 1 永久/);
  assert.match(html, /已选 1\/2/);
  assert.match(html, /data-candidate-action="all"/);
  assert.match(html, /data-candidate-action="none"/);
  assert.match(html, /data-candidate-action="permanent"/);
  assert.match(html, /来源卡片/);
  assert.match(html, /永久笔记/);
  assert.match(html, /缺少引用定位/);
});

test("candidate preview panel renders simple skip breakdown", () => {
  const payload = {
    stage: "confirm",
    result: {
      selection: { totalCandidates: 3, selectedCandidates: 1 },
      skipped: { invalid: 1, conflicted: 1 }
    }
  };

  const skipHtml = renderConfirmSkipBreakdown(payload);
  assert.match(skipHtml, /未勾选跳过 2/);
  assert.match(skipHtml, /警告跳过 1/);
  assert.match(skipHtml, /冲突跳过 1/);
});
