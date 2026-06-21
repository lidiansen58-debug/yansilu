import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingContinuationAction,
  describeWritingProjectStepState
} from "../../apps/web/src/writing-center-flow.js";

test("writing-center empty project surfaces reuse current basket continuity guidance", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    scopeLabel: "当前写作篮"
  });
  const step = describeWritingProjectStepState({
    basketCount: 2,
    hasProject: false,
    projectEntryStatus: entry.status,
    projectEntryHint: entry.hint,
    projectEntryProjectId: entry.projectId,
    projectEntryActionLabel: entry.actionLabel,
    canCreateProject: true
  });

  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.action, "resume-project");
  assert.equal(step.title, "创建项目");
  assert.match(step.note, /当前写作篮/);
  assert.match(step.note, /wp_existing/);
  assert.match(step.note, /比重新创建项目更连续/);
});
