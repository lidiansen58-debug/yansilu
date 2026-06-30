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

  assert.equal(step.title, "继续文章提纲");
  assert.equal(step.note, "先回到文章提纲，再继续开始草稿。");
});

test("writing draft step reuses projected project continuity before a project is reopened", () => {
  const step = describeWritingDraftStepState({
    hasDraft: false,
    hasScaffold: false,
    projectEntryProjectId: "wp_existing",
    projectEntryAction: "resume-project"
  });

  assert.equal(step.title, "继续这个主题");
  assert.equal(step.note, "先继续这个主题，再生成文章提纲并开始草稿。");
});
