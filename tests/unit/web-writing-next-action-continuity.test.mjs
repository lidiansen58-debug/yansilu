import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingNextActionFromState } from "../../apps/web/src/writing-center-flow.js";

test("writing center next action prefers opening the projected current draft before creating a project", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 3,
    hasProject: false,
    hasScaffold: false,
    hasDraft: false,
    projectEntryProjectId: "project_alpha",
    projectEntryAction: "open-draft",
    projectEntryActionLabel: "打开当前草稿"
  });

  assert.equal(action.title, "打开当前草稿");
  assert.match(action.note, /project_alpha/);
  assert.match(action.note, /打开当前草稿继续写作/);
});

test("writing center next action prefers resuming the projected scaffold before generic project creation", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 3,
    hasProject: false,
    hasScaffold: false,
    hasDraft: false,
    projectEntryProjectId: "project_beta",
    projectEntryAction: "resume-scaffold",
    projectEntryActionLabel: "继续草稿骨架"
  });

  assert.equal(action.title, "继续草稿骨架");
  assert.match(action.note, /project_beta/);
  assert.match(action.note, /回到草稿骨架/);
});

test("writing center next action prefers resuming the projected project before generic project creation", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 3,
    hasProject: false,
    hasScaffold: false,
    hasDraft: false,
    projectEntryProjectId: "project_gamma",
    projectEntryAction: "resume-project",
    projectEntryActionLabel: "继续当前项目"
  });

  assert.equal(action.title, "继续当前项目");
  assert.match(action.note, /project_gamma/);
  assert.match(action.note, /继续当前项目/);
  assert.match(action.note, /生成草稿骨架或保存草稿/);
});
