import test from "node:test";
import assert from "node:assert/strict";

import {
  writingScaffoldButtonState,
  writingScaffoldPreflightWarning
} from "../../apps/web/src/writing-center-flow.js";

test("writing scaffold button stays continuity-aware while respecting project preflight readiness", () => {
  assert.deepEqual(
    writingScaffoldButtonState({
      hasProject: false,
      projectEntry: { projectId: "wp_1", actionLabel: "继续当前项目" }
    }),
    {
      disabled: false,
      canContinueProjectedProject: true,
      canGenerateScaffold: false,
      text: "先继续当前项目"
    }
  );

  assert.deepEqual(
    writingScaffoldButtonState({
      hasProject: true,
      projectPreflightLevel: "needs_clarification"
    }),
    {
      disabled: true,
      canContinueProjectedProject: false,
      canGenerateScaffold: false,
      text: "先澄清项目问题"
    }
  );

  assert.equal(
    writingScaffoldButtonState({
      hasProject: true,
      projectPreflightLevel: "ready"
    }).text,
    "生成草稿骨架"
  );
});

test("writing scaffold handler reuses projected continuity before warning about a missing or unready project", () => {
  assert.equal(writingScaffoldPreflightWarning({ level: "needs_clarification" }), "先澄清项目关键问题，再生成草稿骨架。");
  assert.equal(writingScaffoldPreflightWarning({ level: "has_gaps" }), "先补项目缺口，再生成草稿骨架。");
});
