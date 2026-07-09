import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path summary distinguishes thin explicit relations from stable connected notes", () => {
  const pane = createPane();
  const result = pane.permanentNoteMainPathSummaryV2(
    {
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      status: "active",
      boundaryOrCounterpoint: "Only holds in one constrained case."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 2,
      thinExplicitRelationCount: 1,
      wikilinkCount: 0,
      tagRelatedCount: 0,
      themeSignalCount: 2
    }
  );

  assert.equal(result.nextStep, "补关系说明");
  assert.match(result.summary, /关系/);
  assert.match(result.summary, /理由偏薄|写具体/);
});

test("main-path card keeps relation step on reason follow-up when explicit relations are still thin", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_thin_relations",
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
      explicitRelationCount: 2,
      thinExplicitRelationCount: 1,
      wikilinkCount: 0,
      tagRelatedCount: 0,
      themeSignalCount: 2
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /data-main-path-next-action="relations"/);
  assert.match(html, /已经连上关系，但还有理由偏薄的连接/);
  assert.match(html, /data-note-main-route-action="relations"[^>]*>补关系说明<\/button>/);
  assert.doesNotMatch(html, /main-path-progress/);
});
