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

test("buildLocalRelationSignals resolves cross-box stable id wikilinks as forward signals", () => {
  const pane = createPane();
  pane.state = {
    folders: [
      {
        id: "dir_original_default",
        parentId: "",
        hidden: false
      },
      {
        id: "dir_literature_default",
        parentId: "",
        hidden: false
      }
    ],
    notes: [
      {
        id: "pn-current",
        title: "Current permanent",
        folderId: "dir_original_default",
        noteType: "permanent",
        body: "# Current permanent\nSee [[ln-source|Source literature]].",
        tags: [],
        links: ["ln-source"]
      },
      {
        id: "ln-source",
        title: "Source literature",
        folderId: "dir_literature_default",
        noteType: "literature",
        body: "# Source literature\n",
        tags: [],
        links: []
      }
    ]
  };

  const signals = pane.buildLocalRelationSignals(
    pane.state.notes[0],
    {
      body: pane.state.notes[0].body
    }
  );

  assert.deepEqual(
    signals.forward.map((item) => item.id),
    ["ln-source"]
  );
});

test("buildLocalRelationSignals skips ambiguous title wikilinks", () => {
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
        id: "note-current",
        title: "Current note",
        folderId: "dir-root",
        noteType: "permanent",
        body: "# Current note\nSee [[Duplicate Target]].",
        tags: [],
        links: ["Duplicate Target"]
      },
      {
        id: "note-target-a",
        title: "Duplicate Target",
        folderId: "dir-root",
        noteType: "permanent",
        body: "# Duplicate Target\n",
        tags: [],
        links: []
      },
      {
        id: "note-target-b",
        title: "Duplicate Target",
        folderId: "dir-root",
        noteType: "permanent",
        body: "# Duplicate Target\n",
        tags: [],
        links: []
      },
      {
        id: "note-referrer",
        title: "Referrer",
        folderId: "dir-root",
        noteType: "permanent",
        body: "# Referrer\nSee [[Duplicate Target]].",
        tags: [],
        links: ["Duplicate Target"]
      }
    ]
  };

  const signals = pane.buildLocalRelationSignals(
    pane.state.notes[0],
    {
      body: pane.state.notes[0].body
    }
  );

  assert.deepEqual(signals.forward, []);
  assert.deepEqual(signals.backward, []);
});
