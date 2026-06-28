import test from "node:test";
import assert from "node:assert/strict";

import {
  graphBridgeSelectionKey,
  graphIsolatedSelectionKey,
  graphNodeClass,
  graphThemeNoteIds,
  graphThemeSelectionKey
} from "../../apps/web/src/graph-visual-selection-state.js";

test("graph visual selection state derives stable theme ids", () => {
  assert.deepEqual(graphThemeNoteIds({ noteIds: [" a ", "", null, "b"] }), ["a", "b"]);
  assert.equal(graphThemeSelectionKey({ id: "topic-1", title: "Title" }, 3), "topic-1");
  assert.equal(graphThemeSelectionKey({ title: "Title" }, 3), "Title");
  assert.equal(graphThemeSelectionKey({}, 3), "3");
});

test("graph visual selection state delegates isolated note keys", () => {
  assert.equal(graphIsolatedSelectionKey({ noteId: "n1" }, 4), "n1");
  assert.equal(graphIsolatedSelectionKey({ title: "Only title" }, 4), "Only title");
  assert.equal(graphIsolatedSelectionKey({}, 4), "4");
});

test("graph visual selection state derives stable bridge gap keys", () => {
  assert.equal(graphBridgeSelectionKey({ id: "gap-1" }, 2), "id:gap-1");
  assert.equal(
    graphBridgeSelectionKey({
      noteIds: ["source"],
      targetNoteIds: ["target"],
      title: "Ignored"
    }, 2),
    "bridge::source::target::2"
  );
  assert.equal(graphBridgeSelectionKey({ noteTitles: ["Title"] }, 7), "bridge::Title::no-target::7");
});

test("graph visual selection state maps note types to node classes", () => {
  assert.equal(graphNodeClass("literature"), "is-literature");
  assert.equal(graphNodeClass("fleeting"), "is-fleeting");
  assert.equal(graphNodeClass("original"), "is-original");
  assert.equal(graphNodeClass("permanent"), "is-original");
  assert.equal(graphNodeClass("draft"), "is-note");
});
