import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path summary distinguishes mixed wikilink and tag signals from explicit relations", () => {
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
      explicitRelationCount: 0,
      wikilinkCount: 1,
      tagRelatedCount: 2,
      themeSignalCount: 2
    }
  );

  assert.equal(result.nextStep, "确认成正式关系");
  assert.match(result.summary, /正文链接/);
  assert.doesNotMatch(result.summary, /wikilink/);
  assert.match(result.summary, /标签/);
  assert.match(result.summary, /正式关系/);
});

test("main-path card keeps mixed weak signals in relation-building mode", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_mixed_signals",
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
      tagRelatedCount: 2,
      themeSignalCount: 2
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /data-main-path-next-action="relations"/);
  assert.match(html, /同时有链接线索和标签接近/);
  assert.match(html, /data-note-main-route-action="relations"[^>]*>确认成正式关系<\/button>/);
  assert.doesNotMatch(html, /main-path-progress/);
  assert.doesNotMatch(html, /wikilink 1/);
});
