import test from "node:test";
import assert from "node:assert/strict";
import { renderCandidatePreview, renderConfirmSkipBreakdown } from "../../apps/web/src/import-candidate-preview-panel.js";

test("candidate preview panel renders interactive filters and selected summary", () => {
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
    },
    previewFilter: "warning",
    showExcludedSummary: false
  });

  assert.match(html, /候选预览：1 来源卡片 \/ 0 文献笔记 \/ 1 永久笔记/);
  assert.match(html, /已选 1\/2，已排除 1/);
  assert.match(html, /data-candidate-action="exclude-warning"/);
  assert.match(html, /data-candidate-action="permanent">仅永久笔记/);
  assert.match(html, /data-candidate-filter="warning">Warning 1/);
  assert.match(html, /来源卡片/);
  assert.match(html, /永久笔记/);
  assert.match(html, /candidate-reason/);
});

test("candidate preview panel renders skip breakdown and focus banner", () => {
  const preview = {
    total: { sources: 1, literatureNotes: 0, permanentNotes: 0 },
    sources: [{ id: "src_1", title: "Source A" }]
  };
  const payload = {
    stage: "confirm",
    result: {
      selection: { totalCandidates: 1, selectedCandidates: 0 }
    }
  };

  const skipHtml = renderConfirmSkipBreakdown(payload, preview, { focusReason: "unselected" });
  const previewHtml = renderCandidatePreview(preview, {
    interactive: false,
    summary: {
      selectedIds: new Set(),
      selectedCount: 0,
      totalCount: 1,
      excludedCount: 1
    },
    focusReason: "unselected",
    focusCandidateIds: ["src_1"],
    skipReasonMap: {
      src_1: { tone: "neutral", message: "未写入原因：确认前取消勾选。" }
    },
    showExcludedSummary: true
  });

  assert.match(skipHtml, /未写入原因/);
  assert.match(skipHtml, /data-skip-focus="unselected"/);
  assert.match(previewHtml, /candidate-focus-banner/);
  assert.match(previewHtml, /未勾选跳过/);
  assert.match(previewHtml, /未写入候选/);
  assert.match(previewHtml, /确认前取消勾选/);
});
