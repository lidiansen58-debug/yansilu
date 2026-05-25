import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingDraftStepState } from "../../apps/web/src/writing-center-flow.js";

test("writing draft step reuses projected draft continuity before a project is reopened", () => {
  const step = describeWritingDraftStepState({
    hasDraft: false,
    hasScaffold: false,
    projectEntryProjectId: "wp_existing",
    projectEntryAction: "open-draft"
  });

  assert.equal(step.title, "打开当前草稿");
  assert.match(step.note, /打开当前草稿|继续写作/);
});
