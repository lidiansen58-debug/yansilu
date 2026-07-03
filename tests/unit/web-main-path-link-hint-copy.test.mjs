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

  assert.equal(result.status, "正文链接 2");
  assert.match(result.hint, /已经有正文链接/);
  assert.doesNotMatch(result.hint, /线索/);
});
