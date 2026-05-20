import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingProjectEntryState,
  describeWritingProjectPreflight,
  describeWritingNextActionFromState,
  groupWritingPreflightChecks,
  isWritingStrongModelReady
} from "../../apps/web/src/writing-center-flow.js";

test("writing center next action starts with material selection when basket is empty", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 0,
    hasProject: false,
    hasScaffold: false,
    hasDraft: false
  });

  assert.equal(action.title, "先选材料");
  assert.match(action.note, /写作篮/);
});

test("writing center next action moves to scaffold generation after project creation", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: true,
    hasScaffold: false,
    hasDraft: false
  });

  assert.equal(action.title, "生成骨架");
  assert.match(action.note, /检查章节、缺口和反方/);
});

test("writing center next action prefers saving draft after scaffold is ready", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: true,
    hasScaffold: true,
    hasDraft: false
  });

  assert.equal(action.title, "保存草稿");
  assert.match(action.note, /保存成草稿/);
});

test("writing center next action reflects warning preflight items before saving draft", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: true,
    hasScaffold: true,
    hasDraft: false,
    warningCount: 2
  });

  assert.equal(action.title, "保存草稿");
  assert.match(action.note, /2 个提醒项/);
});

test("writing center next action points to opening current draft once it exists", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: true,
    hasScaffold: true,
    hasDraft: true
  });

  assert.equal(action.title, "打开当前草稿");
  assert.match(action.note, /继续写作/);
});

test("writing center preflight grouping separates blocking warning and pass checks", () => {
  const groups = groupWritingPreflightChecks({
    checks: [
      { id: "intent", status: "pass", label: "Writing intent" },
      { id: "distillation", status: "warning", label: "Confirmed distillation" },
      { id: "blocking-gap", status: "blocked", label: "Critical gap" }
    ]
  });

  assert.equal(groups.passes.length, 1);
  assert.equal(groups.warnings.length, 1);
  assert.equal(groups.blocking.length, 1);
});

test("writing center project preflight summary distinguishes needs_clarification from has_gaps", () => {
  const clarification = describeWritingProjectPreflight({
    status: "needs_clarification",
    checks: [{ code: "missing_intent", severity: "next", message: "Clarify what this writing project is trying to say." }]
  });
  const gaps = describeWritingProjectPreflight({
    status: "has_gaps",
    checks: [{ code: "missing_central_question", severity: "hint", message: "Add or choose a topic with a central question." }]
  });

  assert.equal(clarification.level, "needs_clarification");
  assert.match(clarification.hint, /Clarify what this writing project is trying to say/);
  assert.equal(gaps.level, "has_gaps");
  assert.match(gaps.hint, /central question/);
});

test("writing center strong-model gate requires both strong_model_ready basket state and ready project preflight", () => {
  assert.equal(
    isWritingStrongModelReady({ readinessLevel: "strong_model_ready", projectPreflightLevel: "ready" }),
    true
  );
  assert.equal(
    isWritingStrongModelReady({ readinessLevel: "strong_model_ready", projectPreflightLevel: "needs_clarification" }),
    false
  );
  assert.equal(
    isWritingStrongModelReady({ readinessLevel: "project_ready", projectPreflightLevel: "ready" }),
    false
  );
});

test("writing center project entry stays loading until relation counts are ready", () => {
  const entry = describeWritingProjectEntryState({
    relationCountsReady: false,
    relationCountsErrored: false,
    readinessLevel: "project_ready"
  });

  assert.equal(entry.canCreateProject, false);
  assert.equal(entry.status, "读取中");
  assert.match(entry.hint, /正在读取显式关系/);
});

test("writing center project entry reports relation fetch failures separately", () => {
  const entry = describeWritingProjectEntryState({
    relationCountsReady: false,
    relationCountsErrored: true,
    readinessLevel: "project_ready"
  });

  assert.equal(entry.canCreateProject, false);
  assert.equal(entry.status, "读取失败");
  assert.match(entry.hint, /显式关系读取失败/);
});

test("writing center project entry only opens creation once basket readiness reaches project stage", () => {
  const ready = describeWritingProjectEntryState({
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "project_ready"
  });
  const blocked = describeWritingProjectEntryState({
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "basket_ready"
  });

  assert.equal(ready.canCreateProject, true);
  assert.equal(ready.actionLabel, "创建写作项目");
  assert.equal(blocked.canCreateProject, false);
  assert.equal(blocked.actionLabel, "先补条件再建项目");
  assert.match(blocked.hint, /先补边界或关系/);
});
