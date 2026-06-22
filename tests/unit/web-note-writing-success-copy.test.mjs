import test from "node:test";
import assert from "node:assert/strict";

import { writingCenterContinuationStatusMessage } from "../../apps/web/src/writing-center-flow.js";

test("note main-path projected continuity keeps success copy note-scoped", () => {
  const options = { sourceLabel: "主路径", scaffoldLabel: "当前项目的草稿骨架" };

  assert.equal(
    writingCenterContinuationStatusMessage({ action: "open-draft", projectId: "wp_1" }, options),
    "已从主路径打开当前草稿：wp_1"
  );
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "resume-scaffold", projectId: "wp_1" }, options),
    "已从主路径回到当前项目的草稿骨架：wp_1"
  );
  assert.equal(
    writingCenterContinuationStatusMessage({ action: "resume-project", projectId: "wp_1" }, options),
    "已从主路径继续当前项目：wp_1"
  );
});
