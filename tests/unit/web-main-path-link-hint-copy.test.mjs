import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("theme signal summary uses body-link wording for link-only weak signals", () => {
  const pane = createPane();
  const result = pane.noteThemeSignalSummaryV2(
    {},
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 2,
      tagRelatedCount: 0,
      themeSignalCount: 2
    }
  );

  assert.equal(result.status, "链接线索 2");
  assert.match(result.hint, /正文链接线索/);
  assert.doesNotMatch(result.hint, /正文里的关联线索/);
});
