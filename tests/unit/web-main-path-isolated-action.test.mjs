import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path card uses an explicit first-relation action for isolated notes", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_isolated",
      noteType: "permanent",
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      status: "active",
      boundaryOrCounterpoint: "Only holds in this constrained case."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 0,
      tagRelatedCount: 0,
      themeSignalCount: 0
    }
  );

  assert.match(html, /data-note-main-route-action="relations"[^>]*>关联一条笔记<\/button>/);
  assert.match(html, /先关联一条真正相关的永久笔记/);
});
