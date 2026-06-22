import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path card relation step keeps tag-only weak signals in relation-building mode", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_tag_signals",
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
      tagRelatedCount: 2,
      themeSignalCount: 2
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /data-main-path-next-action="relations"/);
  assert.match(html, /现在只有标签上的接近/);
  assert.doesNotMatch(html, /main-path-progress/);
  assert.match(html, /data-note-main-route-action="relations"[^>]*>从标签线索补关系<\/button>/);
});
