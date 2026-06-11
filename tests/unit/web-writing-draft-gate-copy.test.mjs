import test from "node:test";
import assert from "node:assert/strict";

import { actionItems } from "../../apps/web/src/import-result-model.js";

test("writing draft gate keeps the scaffold guidance action item", () => {
  const actions = actionItems({
    stage: "writing_draft_note_error",
    message: "scaffold is required before creating a draft note",
    code: "WRITING_DRAFT_INVALID"
  });

  assert.deepEqual(actions, ["先点击“生成草稿骨架”，确认预览区已经出现章节和 Markdown。"]);
});
