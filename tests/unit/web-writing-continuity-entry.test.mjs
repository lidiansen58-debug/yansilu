import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingContinuationAction,
  describeWritingProjectStepState,
  writingCenterContinuationFailureMessage,
  writingCenterContinuationStatusMessage
} from "../../apps/web/src/writing-center-flow.js";

test("writing continuation action prefers opening the current draft when one already exists", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: true,
    scopeLabel: "current theme"
  });

  assert.equal(entry.level, "current_draft");
  assert.equal(entry.action, "open-draft");
  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.canCreateProject, true);
});

test("writing continuation action prefers resuming scaffold when draft is not ready yet", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: false,
    scopeLabel: "current basket"
  });

  assert.equal(entry.level, "current_scaffold");
  assert.equal(entry.action, "resume-scaffold");
  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.canCreateProject, true);
});

test("writing-center project entry state reuses current continuity when the basket already maps to a project", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    scopeLabel: "当前写作篮"
  });
  const step = describeWritingProjectStepState({
    basketCount: 3,
    hasProject: false,
    projectEntryStatus: entry.status,
    projectEntryHint: entry.hint,
    projectEntryProjectId: entry.projectId,
    projectEntryActionLabel: entry.actionLabel,
    canCreateProject: true
  });

  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.action, "resume-project");
  assert.match(step.note, /wp_existing/);
  assert.match(step.note, /比重新创建项目更连续/);
});

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

test("note main-path writing entry keeps note-scoped continuity failure copy", () => {
  const options = { sourceLabel: "主路径", scaffoldLabel: "当前项目的草稿骨架" };

  assert.equal(
    writingCenterContinuationFailureMessage({ action: "open-draft" }, new Error("boom"), options),
    "从主路径打开当前草稿失败：boom"
  );
  assert.equal(
    writingCenterContinuationFailureMessage({ action: "resume-scaffold" }, "missing", options),
    "从主路径回到当前项目的草稿骨架失败：missing"
  );
  assert.equal(
    writingCenterContinuationFailureMessage({ action: "resume-project" }, "stale", options),
    "从主路径继续当前项目失败：stale"
  );
});

test("writing continuation action carries the existing project target for callers", () => {
  const entry = describeWritingContinuationAction({
    existingProjectId: "wp_existing",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: false,
    scopeLabel: "当前写作篮"
  });

  assert.equal(entry.projectId, "wp_existing");
  assert.equal(entry.action, "resume-scaffold");
  assert.equal(entry.canCreateProject, true);
  assert.match(entry.hint, /当前写作篮/);
});
