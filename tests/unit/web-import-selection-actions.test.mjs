import test from "node:test";
import assert from "node:assert/strict";
import { selectedCandidateIdsForImportAction } from "../../apps/web/src/import-selection-actions.js";

test("import selection actions use full candidateSelection for confirmable filtering", () => {
  const selectedIds = selectedCandidateIdsForImportAction({
    action: "confirmable",
    candidatePreview: {
      sources: Array.from({ length: 12 }, (_, index) => ({
        id: `src_${index + 1}`,
        type: "Source",
        title: `Source ${index + 1}`
      })),
      literatureNotes: [],
      permanentNotes: []
    },
    candidateSelection: {
      sources: Array.from({ length: 12 }, (_, index) => `src_${index + 1}`),
      literatureNotes: [],
      permanentNotes: ["pn_hidden_warning", "pn_hidden_blocked", "pn_hidden_pass"],
      total: { sources: 12, literatureNotes: 0, permanentNotes: 3 }
    },
    originalityGuard: {
      plan: { allowDraftOnWarning: true, blockOnBlocked: true },
      evaluations: [
        { permanentId: "pn_hidden_warning", status: "warning" },
        { permanentId: "pn_hidden_blocked", status: "blocked" },
        { permanentId: "pn_hidden_pass", status: "pass" }
      ]
    }
  });

  assert.deepEqual([...selectedIds], [
    "src_1",
    "src_2",
    "src_3",
    "src_4",
    "src_5",
    "src_6",
    "src_7",
    "src_8",
    "src_9",
    "src_10",
    "src_11",
    "src_12",
    "pn_hidden_warning",
    "pn_hidden_pass"
  ]);
});

test("import selection actions can exclude risky hidden permanent notes outside preview window", () => {
  const selectedIds = selectedCandidateIdsForImportAction({
    action: "exclude-risky",
    candidatePreview: {
      sources: [{ id: "src_visible", type: "Source", title: "Visible source" }],
      literatureNotes: [],
      permanentNotes: []
    },
    candidateSelection: {
      sources: ["src_visible"],
      literatureNotes: [],
      permanentNotes: ["pn_hidden_warning", "pn_hidden_blocked", "pn_hidden_pass"],
      total: { sources: 1, literatureNotes: 0, permanentNotes: 3 }
    },
    originalityGuard: {
      evaluations: [
        { permanentId: "pn_hidden_warning", status: "warning" },
        { permanentId: "pn_hidden_blocked", status: "blocked" },
        { permanentId: "pn_hidden_pass", status: "pass" }
      ]
    }
  });

  assert.deepEqual([...selectedIds], ["src_visible", "pn_hidden_pass"]);
});

test("import selection actions can stay within the visible preview subset", () => {
  const selectedIds = selectedCandidateIdsForImportAction({
    action: "all",
    candidatePreview: {
      truncated: true,
      sources: [{ id: "src_visible", type: "Source", title: "Visible source" }],
      literatureNotes: [],
      permanentNotes: [{ id: "pn_blocked", title: "Blocked permanent", originalityStatus: "blocked" }]
    },
    candidateSelection: {
      sources: ["src_visible", "src_hidden"],
      literatureNotes: [],
      permanentNotes: ["pn_blocked", "pn_hidden_pass"],
      total: { sources: 2, literatureNotes: 0, permanentNotes: 2 }
    },
    originalityGuard: {
      plan: { allowDraftOnWarning: true, blockOnBlocked: true },
      evaluations: [
        { permanentId: "pn_blocked", status: "blocked" },
        { permanentId: "pn_hidden_pass", status: "pass" }
      ]
    },
    visibleOnly: true
  });

  assert.deepEqual([...selectedIds], ["src_visible"]);
});
