import test from "node:test";
import assert from "node:assert/strict";

import { nextIsolatedSelectionAfterRelationSave } from "../../apps/web/src/graph-next-isolated-selection.js";

test("next isolated selection treats snake_case graph edges as connected", () => {
  const next = nextIsolatedSelectionAfterRelationSave({
    savedNoteId: "source",
    nodes: [
      { id: "source", noteType: "permanent", degree: 1 },
      { id: "target", noteType: "permanent", degree: 1 }
    ],
    edges: [{ from_note_id: "source", to_note_id: "target" }],
    notes: [
      { id: "source", noteType: "permanent", title: "Source" },
      { id: "target", noteType: "permanent", title: "Target" }
    ]
  });

  assert.equal(next, null);
});

test("next isolated selection does not pull unrelated loaded notes outside the graph scope", () => {
  const next = nextIsolatedSelectionAfterRelationSave({
    savedNoteId: "source",
    nodes: [
      { id: "source", noteType: "permanent", degree: 1 },
      { id: "target", noteType: "permanent", degree: 1 }
    ],
    edges: [{ fromNoteId: "source", toNoteId: "target" }],
    notes: [
      { id: "source", noteType: "permanent", title: "Source" },
      { id: "target", noteType: "permanent", title: "Target" },
      { id: "loaded-default", noteType: "permanent", title: "Loaded default note" }
    ]
  });

  assert.equal(next, null);
});
