import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingContinuationAction } from "../../apps/web/src/writing-center-flow.js";

test("writing continuation actions keep continuity-aware create-project labels", () => {
  const draft = describeWritingContinuationAction({
    existingProjectId: "wp_draft",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: true,
    scopeLabel: "当前写作篮"
  });
  const scaffold = describeWritingContinuationAction({
    existingProjectId: "wp_scaffold",
    existingProjectHasScaffold: true,
    existingProjectHasDraft: false,
    scopeLabel: "当前写作篮"
  });
  const project = describeWritingContinuationAction({
    existingProjectId: "wp_project",
    existingProjectHasScaffold: false,
    existingProjectHasDraft: false,
    scopeLabel: "当前写作篮"
  });

  assert.equal(draft.action, "open-draft");
  assert.match(draft.actionLabel, /打开当前草稿/);
  assert.equal(scaffold.action, "resume-scaffold");
  assert.match(scaffold.actionLabel, /继续草稿骨架/);
  assert.equal(project.action, "resume-project");
  assert.match(project.actionLabel, /继续当前项目/);
});
