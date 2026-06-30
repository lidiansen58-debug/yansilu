import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingContinuationAction,
  describeWritingProjectStepState
} from "../../apps/web/src/writing-center-flow.js";

test("writing-center empty project surfaces reuse current basket continuity guidance", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    scopeLabel: "当前相关笔记"
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
  assert.equal(step.title, "确定可写主题");
  assert.match(step.note, /当前相关笔记/);
  assert.match(step.note, /确定过可写主题|这个主题/);
  assert.match(step.note, /比重新开始更连续/);
});
