import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("theme signal summary prefers explicit relations over weaker signals", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2({}, {
    relationState: "loaded",
    explicitRelationCount: 2,
    wikilinkCount: 1,
    tagRelatedCount: 1,
    themeSignalCount: 3
  });

  assert.match(result.status, /已连入/);
});

test("theme signal summary distinguishes link-only signals", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2({}, {
    relationState: "loaded",
    explicitRelationCount: 0,
    wikilinkCount: 2,
    tagRelatedCount: 0,
    themeSignalCount: 2
  });

  assert.match(result.status, /链接线索/);
});

test("theme signal summary distinguishes tag-only signals", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2({}, {
    relationState: "loaded",
    explicitRelationCount: 0,
    wikilinkCount: 0,
    tagRelatedCount: 3,
    themeSignalCount: 3
  });

  assert.match(result.status, /标签线索/);
});

test("theme signal summary keeps mixed weak signals under theme-signal bucket", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2({}, {
    relationState: "loaded",
    explicitRelationCount: 0,
    wikilinkCount: 1,
    tagRelatedCount: 2,
    themeSignalCount: 3
  });

  assert.match(result.status, /主题线索/);
});
