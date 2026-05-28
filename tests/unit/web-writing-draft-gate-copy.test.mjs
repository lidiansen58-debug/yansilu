import test from "node:test";
import assert from "node:assert/strict";

import { actionItems } from "../../apps/web/src/import-result-model.js";

test("writing draft gate no longer injects scaffold-specific action items", () => {
  const actions = actionItems({
    stage: "writing_draft_note_error",
    message: "scaffold is required before creating a draft note",
    code: "WRITING_DRAFT_INVALID"
  });

  assert.deepEqual(actions, []);
});
