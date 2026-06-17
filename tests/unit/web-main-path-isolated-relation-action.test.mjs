import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path card relation step names the first-relation action for fully isolated notes", () => {
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
  ).replace(/\s+/g, " ");

  assert.match(
    html,
    /data-note-main-route-action="relations"[^>]*>\u5173\u8054\u4e00\u6761\u7b14\u8bb0<\/button>/
  );
  assert.doesNotMatch(
    html,
    /data-note-main-route-action="relations"[^>]*>\u5904\u7406\u5173\u7cfb<\/button>/
  );
  assert.match(html, /\u5148\u5173\u8054\u4e00\u6761\u771f\u6b63\u76f8\u5173\u7684\u6c38\u4e45\u7b14\u8bb0/);
});
