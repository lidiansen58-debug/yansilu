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

test("workspace status hint guides active permanent notes outside focus mode", () => {
  const model = buildWorkspaceStatusHintModel({
    activeNote: { id: "note-1" },
    noteType: "permanent",
    focusMode: false,
    isPermanentLike: true
  });

  assert.equal(model.visible, true);
  assert.equal(model.helperAction, "noop");
  assert.equal(model.kicker, "永久笔记");
  assert.equal(model.title, "先把判断写清楚");
  assert.equal(model.actionText, "知道了");
});

test("workspace status hint names permanent notes with relationships clearly", () => {
  const model = buildWorkspaceStatusHintModel({
    activeNote: { id: "note-1" },
    noteType: "permanent",
    focusMode: false,
    growthStage: "已有关系",
    isPermanentLike: true
  });

  assert.equal(model.visible, true);
  assert.equal(model.title, "这条笔记已有关系");
  assert.match(model.body, /关系理由/);
  assert.doesNotMatch(model.title, /当前在/);
});

test("workspace status hint renders focus-mode guidance from note growth stage", () => {
  const model = buildWorkspaceStatusHintModel({
    activeNote: { id: "note-1" },
    focusMode: true,
    growthStage: "已有关系"
  });

  assert.equal(model.visible, true);
  assert.equal(model.kicker, "专注模式");
  assert.match(model.body, /关键判断与边界/);
  assert.equal(model.actionText, "保持专注");
});
