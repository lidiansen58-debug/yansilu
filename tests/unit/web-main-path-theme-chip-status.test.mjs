import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { createInitialState } from "../../apps/web/src/prototype-store.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path header chip reflects link-only theme signal status instead of generic theme label", () => {
  const pane = createPane();
  pane.state = createInitialState();
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_theme_chip_link_only",
      noteType: "permanent",
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
      tagRelatedCount: 0,
      themeSignalCount: 1
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /<b>关系<\/b> <em>1 条待确认线索<\/em>/);
  assert.doesNotMatch(html, /主题线索 1/);
});

test("main-path header chip reflects mixed weak-signal status instead of generic theme label", () => {
  const pane = createPane();
  pane.state = createInitialState();
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_theme_chip_mixed",
      noteType: "permanent",
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
      tagRelatedCount: 1,
      themeSignalCount: 2
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /<b>关系<\/b> <em>2 条待确认线索<\/em>/);
  assert.doesNotMatch(html, /主题线索 2/);
});
