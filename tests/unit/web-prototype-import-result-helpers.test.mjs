import test from "node:test";
import assert from "node:assert/strict";

import {
  candidateIdsForSelection,
  candidatePreviewFromPayload,
  candidateSelectionFromPayload,
  createdNoteIdsByTypeFromImportPayload,
  defaultSelectedCandidateIds,
  importPayloadRecordId,
  literatureBatchSummaryForPayload,
  renderImportWritingActions,
  renderWritingResultDetails,
  selectedCandidateIdsForImportState,
  selectionSummaryForImportState,
  summarizeLiteratureBatchFromNotes,
  syncImportSelectionState
} from "../../apps/web/src/prototype-import-result-helpers.js";

const candidatePreviewItemIds = (preview) => preview?.items?.map((item) => item.id) || [];

test("prototype import result helpers derive previews and candidate selections from payloads", () => {
  const candidatePreview = { items: [{ id: "a" }] };
  const candidateSelection = { sources: ["a"], literatureNotes: ["b"], permanentNotes: ["b", "c"] };

  assert.equal(candidatePreviewFromPayload({ candidatePreview }), candidatePreview);
  assert.equal(candidatePreviewFromPayload({ importRecord: { candidatePreview } }), candidatePreview);
  assert.equal(candidateSelectionFromPayload({ candidateSelection }), candidateSelection);
  assert.deepEqual(
    candidateIdsForSelection(candidatePreview, candidateSelection, { candidatePreviewItemIds }),
    ["a", "b", "c"]
  );
  assert.deepEqual(candidateIdsForSelection(candidatePreview, null, { candidatePreviewItemIds }), ["a"]);
});

test("prototype import result helpers keep candidate selection state semantics", () => {
  const preview = { items: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  const importState = {
    selectionImportRecordId: "record-1",
    selectedCandidateIds: new Set(["b", "z"])
  };

  syncImportSelectionState(importState, "record-1", preview, null, { preserve: true }, { candidatePreviewItemIds });
  assert.equal(importState.selectionImportRecordId, "record-1");
  assert.deepEqual([...importState.selectedCandidateIds], ["b"]);

  syncImportSelectionState(
    importState,
    "record-2",
    preview,
    null,
    { selectedIds: new Set(["a", "c", "x"]) },
    { candidatePreviewItemIds }
  );
  assert.deepEqual([...importState.selectedCandidateIds], ["a", "c"]);

  assert.deepEqual(
    [...selectedCandidateIdsForImportState(importState, preview, null, "record-2", null, { candidatePreviewItemIds })],
    ["a", "c"]
  );
});

test("prototype import result helpers summarize selected and excluded candidates", () => {
  const preview = { items: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  const importState = {
    selectionImportRecordId: "record-1",
    selectedCandidateIds: new Set(["a", "c"])
  };
  const summary = selectionSummaryForImportState(importState, preview, "record-1", null, null, {
    candidatePreviewItemIds,
    summarizeCandidateSelection: (_preview, selectedIds) => ({ visibleCount: selectedIds.size })
  });

  assert.equal(summary.visibleCount, 2);
  assert.equal(summary.selectedCount, 2);
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.excludedCount, 1);
});

test("prototype import result helpers preserve import result file and summary behavior", () => {
  const payload = {
    stage: "confirm",
    importRecordId: "record-1",
    result: {
      createdFiles: [
        { noteType: "literature", noteId: "lit-1" },
        { noteType: "literature", noteId: "lit-1" },
        { noteType: "permanent", noteId: "perm-1" }
      ]
    }
  };

  assert.equal(importPayloadRecordId(payload), "record-1");
  assert.deepEqual(createdNoteIdsByTypeFromImportPayload(payload, "literature"), ["lit-1"]);
  assert.deepEqual(createdNoteIdsByTypeFromImportPayload(payload, "permanent"), ["perm-1"]);
  assert.equal(literatureBatchSummaryForPayload(payload, { key: "record-1|lit-1", total: 1 })?.total, 1);
  assert.equal(literatureBatchSummaryForPayload(payload, { key: "record-2|lit-1", total: 1 }), null);

  const html = renderImportWritingActions(payload, {
    literatureBatchSummaryForPayload: () => ({ pending: 1, refine: 0, ready: 0, paraphraseDone: 0, total: 1, remaining: 1 })
  });
  assert.match(html, /data-import-writing-action="open-literature-queue"/);
  assert.match(html, /data-import-writing-action="add-permanent-notes"/);
});

test("prototype import result helpers render writing details and literature batch counts", () => {
  const ranked = [
    { lane: "pending", note: { id: "a", title: "A" } },
    { lane: "refine", note: { id: "b", title: "B" } },
    { lane: "ready", note: { id: "c", title: "C" } }
  ];
  const summary = summarizeLiteratureBatchFromNotes(ranked.map((item) => item.note), {
    rankedLiteratureQueueNotes: () => ranked
  });
  assert.deepEqual(
    {
      total: summary.total,
      pending: summary.pending,
      refine: summary.refine,
      ready: summary.ready,
      nextPendingNoteId: summary.nextPendingNoteId,
      nextReadyNoteId: summary.nextReadyNoteId
    },
    { total: 3, pending: 1, refine: 1, ready: 1, nextPendingNoteId: "a", nextReadyNoteId: "c" }
  );

  const html = renderWritingResultDetails({
    stage: "draft_scaffold",
    sections: [{ heading: "<Intro>", purpose: "Why" }],
    markdown: "<draft>"
  }, {
    escapeHtml: (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  });
  assert.match(html, /文章提纲快照/);
  assert.match(html, /&lt;Intro&gt;/);
  assert.match(html, /&lt;draft&gt;/);
});

test("prototype import result helpers delegate default selected ids calculation", () => {
  const result = defaultSelectedCandidateIds({ items: [] }, null, { blocked: [] }, {
    selectedCandidateIdsForImportAction: (input) => [input.action, String(input.visibleOnly)]
  });

  assert.deepEqual(result, ["confirmable", "true"]);
});
