import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { createInitialState } from "../../apps/web/src/prototype-store.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path card labels wikilink-only relation status as a link signal", () => {
  const pane = createPane();
  pane.state = createInitialState();
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_wikilink_only",
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
      wikilinkCount: 1,
      tagRelatedCount: 0,
      themeSignalCount: 1
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /data-main-path-next-action="relations"/);
  assert.match(html, /已经有正文链接线索，下一步把关系为什么成立写清楚。/);
  assert.match(html, /<b>关系<\/b> <em>1 条待确认线索<\/em>/);
  assert.match(html, /data-note-main-route-action="relations"[^>]*>补关系理由<\/button>/);
  assert.doesNotMatch(html, /wikilink 1/);
  assert.doesNotMatch(html, /有基础链接，下一步把关系为什么成立写清楚。/);
});
