import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingProjectPreflight,
  describeWritingNextActionFromState,
  groupWritingPreflightChecks
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
