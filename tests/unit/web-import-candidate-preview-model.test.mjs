import test from "node:test";
import assert from "node:assert/strict";
import {
  candidatePreviewItems,
  confirmCreatedLiteratureNoteIds,
  confirmCreatedPermanentNoteIds,
  confirmSkipReasonMap,
  confirmSkippedCandidateIds,
  selectionSummary
} from "../../apps/web/src/import-candidate-preview-model.js";

test("candidate preview model derives grouped items and selection summary", () => {
  const preview = {
    sources: [{ id: "src_1", title: "Source A" }],
    literatureNotes: [{ id: "ln_1", title: "Lit A" }],
    permanentNotes: [
      { id: "pn_warn", title: "Perm warn", originalityStatus: "warning", candidateGroup: "PermanentNote" },
      { id: "pn_block", title: "Perm blocked", originalityStatus: "blocked", candidateGroup: "PermanentNote" }
    ]
  };
  const items = candidatePreviewItems(preview);
  const selectedIds = new Set(["src_1", "ln_1"]);
  const summary = selectionSummary(preview, selectedIds);

  assert.equal(items.length, 4);
  assert.equal(summary.selectedCount, 2);
  assert.equal(summary.excludedCount, 2);
  assert.equal(summary.totalCount, 4);
});

test("candidate preview model derives confirm skipped ids and reason map", () => {
  const preview = {
    sources: [{ id: "src_1", title: "Source A" }],
    permanentNotes: [{ id: "pn_warn", title: "Perm warn", originalityStatus: "warning" }]
  };
  const payload = {
    stage: "confirm",
    originalityGuard: {
      plan: { allowDraftOnWarning: false },
      evaluations: [{ permanentId: "pn_warn", status: "warning", reasons: ["citation_locator_missing"] }]
    },
    result: {
      selection: { candidateIds: ["pn_warn"], selectedCandidates: 1, totalCandidates: 2 },
      createdFiles: []
    }
  };

  assert.deepEqual(confirmSkippedCandidateIds(payload, preview), {
    unselected: ["src_1"],
    invalid: ["pn_warn"],
    conflicted: []
  });
  assert.deepEqual(confirmSkipReasonMap(payload, preview), {
    src_1: { reason: "unselected", tone: "neutral", message: "未写入原因：确认前取消勾选。" },
    pn_warn: {
      reason: "invalid",
      tone: "warning",
      message: "未写入原因：原创性为警告，当前未允许按草稿写入。 缺少引用定位。"
    }
  });
});

test("candidate preview model extracts created literature and permanent note ids", () => {
  const payload = {
    stage: "confirm",
    result: {
      createdFiles: [
        { noteId: "ln_1", noteType: "literature" },
        { noteId: "ln_2", noteType: "literature" },
        { noteId: "pn_1", noteType: "permanent" },
        { noteId: "ln_1", noteType: "literature" }
      ]
    }
  };

  assert.deepEqual(confirmCreatedLiteratureNoteIds(payload), ["ln_1", "ln_2"]);
  assert.deepEqual(confirmCreatedPermanentNoteIds(payload), ["pn_1"]);
});
