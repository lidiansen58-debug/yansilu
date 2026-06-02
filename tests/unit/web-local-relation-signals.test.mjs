import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("buildLocalRelationSignals detects backlinks to the active note", () => {
  const pane = createPane();
  pane.state = {
    folders: [
      {
        id: "dir-root",
        parentId: "",
        hidden: false
      }
    ],
    notes: [
      {
        id: "note-a",
        title: "Current note",
        folderId: "dir-root",
        noteType: "permanent",
        body: "# Current note\n",
        tags: [],
        links: []
      },
      {
        id: "note-b",
        title: "Referrer note",
        folderId: "dir-root",
        noteType: "permanent",
        body: "# Referrer note\nSee [[Current note]].",
        tags: [],
        links: ["Current note"]
      }
    ]
  };

  const signals = pane.buildLocalRelationSignals(
    pane.state.notes[0],
    {
      body: pane.state.notes[0].body
    }
  );

  assert.equal(signals.forward.length, 0);
  assert.deepEqual(
    signals.backward.map((item) => item.id),
    ["note-b"]
  );
});
