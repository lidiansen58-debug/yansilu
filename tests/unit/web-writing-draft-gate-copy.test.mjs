import test from "node:test";
import assert from "node:assert/strict";

import { actionItems } from "../../apps/web/src/import-result-model.js";

test("writing draft gate action item uses 草稿骨架 wording", () => {
  const actions = actionItems({
    stage: "writing_draft_note_error",
    message: "scaffold is required before creating a draft note",
    code: "WRITING_DRAFT_INVALID"
  });

  assert.ok(actions.includes("先点击“生成草稿骨架”，确认预览区已经出现章节和 Markdown。"));
});
