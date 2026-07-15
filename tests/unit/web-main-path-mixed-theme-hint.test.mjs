import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("theme signal summary keeps mixed weak-signal hints on the mixed wording path", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2(
    {},
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 1,
      tagRelatedCount: 2,
      themeSignalCount: 3
    }
  );

  assert.match(result.status, /可能关系/);
  assert.match(result.hint, /可能关系/);
  assert.doesNotMatch(result.status, /主题线索/);
  assert.doesNotMatch(result.hint, /基础线索/);
});
