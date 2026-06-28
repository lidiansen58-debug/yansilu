import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWorkspaceStatusHintModel
} from "../../apps/web/src/workspace-status-hint-model.js";

test("workspace status hint asks the user to open a note when no editor note is active", () => {
  const model = buildWorkspaceStatusHintModel();

  assert.equal(model.visible, true);
  assert.equal(model.helperAction, "noop");
  assert.equal(model.targetNoteId, "");
  assert.match(model.title, /打开一条笔记/);
});

test("workspace status hint stays hidden for active notes outside focus mode", () => {
  const model = buildWorkspaceStatusHintModel({
    activeNote: { id: "note-1" },
    focusMode: false
  });

  assert.deepEqual(model, { visible: false });
});

test("workspace status hint renders focus-mode guidance from note growth stage", () => {
  const model = buildWorkspaceStatusHintModel({
    activeNote: { id: "note-1" },
    focusMode: true,
    growthStage: "已串联"
  });

  assert.equal(model.visible, true);
  assert.equal(model.kicker, "专注模式");
  assert.match(model.body, /关键判断与边界/);
  assert.equal(model.actionText, "保持专注");
});
