import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path summary labels wikilink-only signals as body link clues", () => {
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
      wikilinkCount: 2,
      tagRelatedCount: 0,
      themeSignalCount: 2
    }
  );

  assert.equal(result.nextStep, "补关系理由");
  assert.match(result.summary, /正文链接线索/);
  assert.doesNotMatch(result.summary, /wikilink/);
});

test("main-path summary labels mixed weak signals as body links without raw wikilink wording", () => {
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
      themeSignalCount: 3
    }
  );

  assert.equal(result.nextStep, "确认成正式关系");
  assert.match(result.summary, /正文链接/);
  assert.match(result.summary, /标签接近/);
  assert.doesNotMatch(result.summary, /wikilink/);
});
