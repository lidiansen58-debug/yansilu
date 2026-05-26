import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingDraftStepState } from "../../apps/web/src/writing-center-flow.js";

test("writing draft step reuses projected draft continuity before a project is reopened", () => {
  const step = describeWritingDraftStepState({
    hasDraft: false,
    hasScaffold: false,
    projectEntryProjectId: "wp_existing",
    projectEntryAction: "open-draft"
  });

  assert.equal(step.title, "打开当前草稿");
  assert.equal(step.note, "先打开当前草稿，再继续当前写作。");
});

test("writing draft step reuses projected scaffold continuity before a project is reopened", () => {
  const step = describeWritingDraftStepState({
    hasDraft: false,
    hasScaffold: false,
    projectEntryProjectId: "wp_existing",
    projectEntryAction: "resume-scaffold"
  });

  assert.equal(step.title, "继续草稿骨架");
  assert.equal(step.note, "先回到草稿骨架，再继续保存草稿。");
});

test("writing draft step reuses projected project continuity before a project is reopened", () => {
  const step = describeWritingDraftStepState({
    hasDraft: false,
    hasScaffold: false,
    projectEntryProjectId: "wp_existing",
    projectEntryAction: "resume-project"
  });

  assert.equal(step.title, "继续当前项目");
  assert.equal(step.note, "先继续当前项目，再生成草稿骨架并保存草稿。");
});
