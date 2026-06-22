import test from "node:test";
import assert from "node:assert/strict";

import {
  writingCenterContinuationFailureMessage,
  writingCenterContinuationStatusMessage,
  writingOpenDraftButtonState
} from "../../apps/web/src/writing-center-flow.js";

test("writing open-draft button stays continuity-aware for projected scaffold and project entries", () => {
  assert.equal(
    writingOpenDraftButtonState({
      draftContinuation: { projectId: "wp_1", action: "open-draft", actionLabel: "打开当前草稿" }
    }).text,
    "打开当前草稿"
  );
  assert.equal(
    writingOpenDraftButtonState({
      draftContinuation: { projectId: "wp_1", action: "resume-project", actionLabel: "继续当前项目" }
    }).text,
    "先继续当前项目"
  );
});

test("writing open-draft handler resumes projected scaffold or project continuity with writing-center scoped feedback", () => {
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "resume-scaffold", projectId: "wp_1" }),
    "已从写作中心回到草稿骨架：wp_1"
  );
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "resume-project", projectId: "wp_1" }),
    "已从写作中心继续当前项目：wp_1"
  );
  assert.equal(
    writingCenterContinuationFailureMessage({ action: "resume-scaffold" }, "boom"),
    "从写作中心回到草稿骨架失败：boom"
  );
  assert.equal(
    writingCenterContinuationFailureMessage({ action: "resume-project" }, "boom"),
    "从写作中心继续当前项目失败：boom"
  );
});
