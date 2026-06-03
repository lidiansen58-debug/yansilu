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

  assert.match(html, /data-candidate-action="all"/);
  assert.match(html, /data-candidate-action="none"/);
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

  assert.match(html, /Showing 2 visible candidates from a larger preview set/);
  assert.match(html, /data-candidate-id="pn_blocked"[\s\S]*class="candidate-checkbox"[\s\S]*disabled/);
  assert.match(html, /Originality guard requires override/);
});
