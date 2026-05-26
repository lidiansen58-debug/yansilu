import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path status strip labels tag-only notes as tag clues instead of generic theme clues", () => {
  const pane = createPane();
  pane.state = { notes: [] };

  const note = {
    id: "pn_tag_only_strip",
    noteType: "permanent",
    thesis: "A stable claim.",
    threeLineSummary: ["one", "two", "three"],
    distillationStatus: "confirmed",
    authorship: { user_confirmed: true },
    status: "active"
  };
  const overview = {
    relationState: "loaded",
    explicitRelationCount: 0,
    wikilinkCount: 0,
    tagRelatedCount: 2,
    themeSignalCount: 2
  };

  const html = pane.renderPermanentNoteMainPathSectionV2(note, overview).replace(/\s+/g, " ");
  assert.match(html, /<span class="inspector-chip">标签线索 2<\/span>/);
  assert.doesNotMatch(html, /<span class="inspector-chip">主题线索 2<\/span>/);
});
