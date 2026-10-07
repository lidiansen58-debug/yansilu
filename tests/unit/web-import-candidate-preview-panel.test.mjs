import test from "node:test";
import assert from "node:assert/strict";

import { renderCandidatePreview, renderConfirmSkipBreakdown } from "../../apps/web/src/import-candidate-preview-panel.js";

test("migrated permanent candidates require confirmation without appearing blocked", () => {
  const html = renderCandidatePreview({ permanentNotes: [{ id: "pn_own", title: "My judgment", status: "draft", originalityStatus: "pass" }] }, {
    interactive: true, summary: { selectedIds: new Set(["pn_own"]), selectedCount: 1, totalCount: 1, excludedCount: 0 }
  });
  assert.match(html, /待确认/);
  assert.doesNotMatch(html, /disabled|未通过原创性检查/);
});

test("actual notes appear before source metadata in preview", () => {
  const html = renderCandidatePreview({
    sources: [{ id: "src_1", title: "Archived file" }],
    literatureNotes: [{ id: "ln_1", title: "Reading material" }],
    permanentNotes: [{ id: "pn_1", title: "Existing judgment" }]
  }, { interactive: true });
  assert.ok(html.indexOf("Reading material") < html.indexOf("Archived file"));
  assert.ok(html.indexOf("Existing judgment") < html.indexOf("Archived file"));
});

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

  assert.match(html, /data-candidate-action="all"/);
  assert.match(html, /data-candidate-action="none"/);
  assert.doesNotMatch(html, /<details class="candidate-selection-options"[^>]* open>/);
  assert.match(html, /<details class="candidate-selection-options"[^>]*>[\s\S]*data-candidate-action="permanent"[\s\S]*<\/details>/);
  assert.match(html, /data-candidate-action="permanent"/);
  assert.match(html, /data-candidate-id="src_1"/);
  assert.match(html, /data-candidate-id="pn_1"/);
  assert.match(html, /candidate-reasons/);
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
  assert.match(skipHtml, /data-skip-focus="unselected"/);
  assert.match(skipHtml, /data-skip-focus="invalid"/);
  assert.match(skipHtml, /data-skip-focus="conflicted"/);
});

test("candidate preview panel marks truncated blocked candidates as read-only", () => {
  const preview = {
    truncated: true,
    total: { sources: 1, literatureNotes: 0, permanentNotes: 2 },
    sources: [{ id: "src_1", title: "Source A" }],
    permanentNotes: [{ id: "pn_blocked", title: "Perm blocked", originalityStatus: "blocked" }]
  };

  const html = renderCandidatePreview(preview, {
    interactive: true,
    originalityGuard: {
      plan: { allowDraftOnWarning: true, blockOnBlocked: true }
    },
    summary: {
      selectedIds: new Set(["src_1"]),
      selectedCount: 1,
      totalCount: 3,
      excludedCount: 2
    }
  });

  assert.match(html, /本次预览显示 2 条/);
  assert.match(html, /data-candidate-id="pn_blocked"[\s\S]*class="candidate-checkbox"[\s\S]*disabled/);
  assert.match(html, /未通过原创性检查/);
});

test("interactive preview exposes every previewed checkbox and keeps filters open when active", () => {
  const items = Array.from({ length: 12 }, (_, index) => ({ id: `pn_${index}`, title: `Note ${index}` }));
  const html = renderCandidatePreview({ permanentNotes: items }, {
    interactive: true, focusReason: "excluded",
    summary: { selectedIds: new Set(), selectedCount: 0, totalCount: 12, excludedCount: 12 }
  });
  assert.equal((html.match(/class="candidate-checkbox"/g) || []).length, 12);
  assert.match(html, /<details class="candidate-selection-options"[^>]* open>/);
  assert.doesNotMatch(html, /candidate-summary-title/);
});

test("manually opened selection options stay open without an active filter", () => {
  const html = renderCandidatePreview({ sources: [{ id: "src_1", title: "Source" }] }, {
    interactive: true, selectionOptionsOpen: true, importRecordId: "imp_1",
    summary: { selectedIds: new Set(["src_1"]), selectedCount: 1, totalCount: 1, excludedCount: 0 }
  });
  assert.match(html, /data-import-preview-record="imp_1" open>/);
});

test("preview shows supplied note excerpts as text instead of executable markup", () => {
  const html = renderCandidatePreview({ permanentNotes: [{ id: "pn_1", title: "Viewpoint", excerpt: '<img onerror="alert(1)">Argument' }] }, {
    interactive: true, summary: { selectedIds: new Set(["pn_1"]), selectedCount: 1, totalCount: 1, excludedCount: 0 }
  });
  assert.match(html, /candidate-excerpt">&lt;img onerror=&quot;alert\(1\)&quot;&gt;Argument/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /找到：/);
});
