import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingStrongModelStatus,
  writingStrongModelButtonState
} from "../../apps/web/src/writing-center-flow.js";

test("writing strong-model status keeps projected continuity out of the primary flow", () => {
  const strongModel = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "strong_model_ready",
    readinessHint: "当前材料已经到AI 写作检查分析前的就绪阶段。",
    projectEntryProjectId: "wp_existing",
    projectEntryActionLabel: "继续当前主题",
    projectPreflightLevel: "unknown",
    projectPreflightChecksLength: 0,
    strongModelReady: false
  });

  assert.equal(strongModel.status, "先确定可写主题");
  assert.equal(strongModel.buttonLabel, "先确定可写主题");
  assert.match(strongModel.hint, /先确定可写主题/);
  assert.doesNotMatch(strongModel.hint, /继续当前主题/);
});

test("writing strong-model button requires the current project before running analysis", () => {
  assert.deepEqual(
    writingStrongModelButtonState({
      basketCount: 3,
      strongModelReady: false,
      stateButtonLabel: "先确定可写主题"
    }),
    {
      disabled: true,
      text: "先确定可写主题"
    }
  );

  assert.deepEqual(
    writingStrongModelButtonState({
      basketCount: 3,
      strongModelReady: true,
      stateButtonLabel: "准备AI 写作检查分析"
    }),
    {
      disabled: false,
      text: "准备AI 写作检查分析"
    }
  );

  assert.deepEqual(
    writingStrongModelButtonState({
      loading: true,
      basketCount: 3,
      strongModelReady: true,
      stateButtonLabel: "准备AI 写作检查分析"
    }),
    {
      disabled: true,
      text: "准备中..."
    }
  );
});

test("writing create-project primary action remains separate from projected continuation", () => {
  const strongModel = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "strong_model_ready",
    readinessHint: "ready",
    projectEntryProjectId: "wp_existing",
    projectEntryActionLabel: "继续当前主题",
    projectPreflightLevel: "unknown",
    projectPreflightChecksLength: 0,
    strongModelReady: false
  });

  assert.equal(strongModel.buttonLabel, "先确定可写主题");
  assert.doesNotMatch(strongModel.hint, /继续当前主题/);
});
