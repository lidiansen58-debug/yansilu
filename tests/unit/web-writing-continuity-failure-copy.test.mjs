import test from "node:test";
import assert from "node:assert/strict";

import {
  writingCenterContinuationFailureMessage,
  writingScaffoldPreflightWarning
} from "../../apps/web/src/writing-center-flow.js";

test("writing-center projected continuity failure copy stays on explicit continuation actions", () => {
  assert.equal(
    writingCenterContinuationFailureMessage({ action: "open-draft" }, new Error("boom")),
    "从写作中心打开当前草稿失败：boom"
  );
  assert.equal(
    writingCenterContinuationFailureMessage({ action: "resume-scaffold" }, "missing"),
    "从写作中心回到草稿骨架失败：missing"
  );
  assert.equal(
    writingCenterContinuationFailureMessage({ action: "resume-project" }, "stale"),
    "从写作中心继续当前项目失败：stale"
  );
  assert.equal(
    writingCenterContinuationFailureMessage({ action: "resume-scaffold" }, "bad", { sourceLabel: "主路径" }),
    "从主路径回到草稿骨架失败：bad"
  );
});

test("writing scaffold preflight warning keeps action-specific copy outside handlers", () => {
  assert.equal(
    writingScaffoldPreflightWarning({ level: "needs_clarification" }),
    "先澄清项目关键问题，再生成草稿骨架。"
  );
  assert.equal(
    writingScaffoldPreflightWarning({ level: "has_gaps" }),
    "先补项目缺口，再生成草稿骨架。"
  );
  assert.equal(
    writingScaffoldPreflightWarning({ level: "unknown" }),
    "先检查项目条件，再生成草稿骨架。"
  );
  assert.equal(writingScaffoldPreflightWarning({ level: "has_gaps", hint: "custom" }), "custom");
});
