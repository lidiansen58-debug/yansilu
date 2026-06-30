import assert from "node:assert/strict";
import test from "node:test";

import {
  graphRelationSaveResult,
  graphRelationSaveSelection,
  normalizeGraphConfirmedRelationInput
} from "../../apps/web/src/graph-relation-save-flow.js";

test("confirmed relation input is normalized before saving", () => {
  assert.deepEqual(normalizeGraphConfirmedRelationInput({
    noteId: " source ",
    targetNoteId: " target ",
    relationType: " Bridges ",
    rationale: " because ",
    insightQuestion: " why "
  }), {
    noteId: "source",
    targetNoteId: "target",
    relationType: "bridges",
    rationale: "because",
    insightQuestion: "why"
  });
});

test("relation save returns to isolated completion when launched from isolated flow", () => {
  assert.deepEqual(graphRelationSaveSelection({
    previousSelection: { kind: "relationForm", returnTo: "isolated" },
    noteId: "source"
  }), { kind: "isolatedComplete", noteId: "source" });

  assert.deepEqual(graphRelationSaveSelection({
    previousSelection: { kind: "isolated" },
    noteId: "source"
  }), { kind: "isolatedComplete", noteId: "source" });

  assert.deepEqual(graphRelationSaveSelection({
    previousSelection: { kind: "relationForm" },
    button: { closest: (selector) => selector === ".graph-selection-panel.is-relation-form" ? { matches: true } : null },
    noteId: "source"
  }), { kind: "isolatedComplete", noteId: "source" });

  assert.deepEqual(graphRelationSaveSelection({
    previousSelection: { kind: "node" },
    button: { closest: (selector) => selector === "[data-graph-isolated-relation-form]" ? { matches: true } : null },
    noteId: "source"
  }), { kind: "isolatedComplete", noteId: "source" });
});

test("relation save falls back to node selection for ordinary saves", () => {
  assert.deepEqual(graphRelationSaveSelection({
    previousSelection: { kind: "node" },
    noteId: "source"
  }), { kind: "node", nodeId: "source" });
});

test("relation save result records reuse versus newly created relation", () => {
  assert.deepEqual(graphRelationSaveResult({
    targetNoteId: "target",
    targetTitle: "Target Note",
    relationType: "SUPPORTS",
    relationLabel: "支持",
    relation: { created: false },
    savedAt: "2026-06-20T00:00:00.000Z"
  }), {
    targetNoteId: "target",
    targetTitle: "Target Note",
    relationType: "supports",
    relationLabel: "支持",
    created: false,
    savedAt: "2026-06-20T00:00:00.000Z"
  });
});
