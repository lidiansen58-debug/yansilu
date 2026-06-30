import test from "node:test";
import assert from "node:assert/strict";

import {
  writingCenterContinuationFailureMessage,
  writingCenterContinuationStatusMessage
} from "../../apps/web/src/writing-center-flow.js";

test("writing open-draft projected continuity keeps writing-center-scoped feedback", () => {
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "open-draft", projectId: "wp_1" }),
    "已从写作中心打开当前草稿：wp_1"
  );
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "resume-scaffold", projectId: "wp_1" }),
    "已从写作中心回到文章提纲：wp_1"
  );
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "resume-project", projectId: "wp_1" }),
    "已从写作中心继续这个主题：wp_1"
  );
  assert.equal(
    writingCenterContinuationFailureMessage({ action: "open-draft" }, "boom"),
    "从写作中心打开当前草稿失败：boom"
  );
});
