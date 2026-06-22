import test from "node:test";
import assert from "node:assert/strict";

import { writingCenterContinuationStatusMessage } from "../../apps/web/src/writing-center-flow.js";

test("writing-center projected continuity success copy stays on explicit continuation actions", () => {
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "open-draft", projectId: "wp_1" }),
    "已从写作中心打开当前草稿：wp_1"
  );
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "resume-scaffold", projectId: "wp_1" }),
    "已从写作中心回到草稿骨架：wp_1"
  );
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "resume-project", projectId: "wp_1" }),
    "已从写作中心继续当前项目：wp_1"
  );
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "open-draft", projectId: "wp_1" }, { sourceLabel: "主路径" }),
    "已从主路径打开当前草稿：wp_1"
  );
});
