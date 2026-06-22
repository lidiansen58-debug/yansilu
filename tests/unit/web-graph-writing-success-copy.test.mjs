import test from "node:test";
import assert from "node:assert/strict";

import { graphWritingContinuationStatusMessage } from "../../apps/web/src/graph-followup.js";

test("graph writing followup keeps graph-scoped success copy for projected draft continuity", () => {
  assert.equal(
    graphWritingContinuationStatusMessage({ action: "open-draft", projectId: "project-1" }),
    "已从图谱打开当前草稿：project-1"
  );
});
