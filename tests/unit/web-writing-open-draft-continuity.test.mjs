import test from "node:test";
import assert from "node:assert/strict";

import { writingOpenDraftButtonState } from "../../apps/web/src/writing-center-flow.js";

test("writing open-draft button reuses projected continuity before a project is reopened", () => {
  assert.deepEqual(writingOpenDraftButtonState({ hasDraft: true }), {
    disabled: false,
    canContinueProjectedDraft: false,
    text: "打开当前草稿"
  });

  assert.deepEqual(
    writingOpenDraftButtonState({
      hasDraft: false,
      draftContinuation: {
        projectId: "wp_1",
        action: "resume-scaffold",
        actionLabel: "继续草稿骨架"
      }
    }),
    {
      disabled: false,
      canContinueProjectedDraft: true,
      text: "先继续草稿骨架"
    }
  );

  assert.deepEqual(writingOpenDraftButtonState({ hasDraft: false }), {
    disabled: true,
    canContinueProjectedDraft: false,
    text: "暂无草稿"
  });
});
