import test from "node:test";
import assert from "node:assert/strict";

import {
  handleOpenNoteMainRouteStateChange
} from "../../apps/web/src/app-shell-note-main-route-actions.js";

function statusRecorder() {
  const calls = [];
  return {
    calls,
    setStatus(message, tone, options) {
      calls.push({ message, tone, options });
    }
  };
}

test("note main route opens graph around the current note folder", async () => {
  const status = statusRecorder();
  const state = {
    notes: [{ id: "n1", title: "Note", folderId: "d1" }],
    browserRootId: "old",
    selectedFolderId: "",
    selectedFileId: ""
  };
  const calls = [];

  const result = await handleOpenNoteMainRouteStateChange({ noteId: "n1", action: "graph" }, {
    state,
    folderById: () => ({ id: "d1" }),
    rootBoxIdFromFolder: () => "root-d1",
    syncNotesForDirectory: async (folderId) => calls.push(["sync-notes", folderId]),
    activateModule: (moduleId) => calls.push(["activate", moduleId]),
    refreshDirectoryGraph: async () => calls.push("refresh-graph"),
    setStatus: status.setStatus
  });

  assert.equal(result, true);
  assert.equal(state.browserRootId, "root-d1");
  assert.equal(state.selectedFolderId, "d1");
  assert.equal(state.selectedFileId, "n1");
  assert.deepEqual(calls, [["sync-notes", "d1"], ["activate", "graph"], "refresh-graph"]);
  assert.equal(status.calls.at(-1).message, "已打开关系图谱，继续看这条笔记周围的结构和主题候选");
});

test("note main route opens distillation in the editor context", async () => {
  const status = statusRecorder();
  const state = {
    notes: [{ id: "n1", title: "Claim" }],
    selectedFileId: "",
    inspectorVisible: true
  };
  const calls = [];
  const editor = {
    setInspectorVisible: (visible) => calls.push(["inspector", visible]),
    jumpToInspectorSection: (selector, options) => calls.push(["jump", selector, options])
  };

  const result = await handleOpenNoteMainRouteStateChange({
    noteId: "n1",
    action: "writing",
    mode: "distillation"
  }, {
    state,
    editor,
    windowRef: { setTimeout: (fn, delay) => { calls.push(["timeout", delay]); fn(); } },
    ensureNoteBodyLoaded: async (noteId) => calls.push(["load", noteId]),
    activateModule: (moduleId) => calls.push(["activate", moduleId]),
    openNoteById: (noteId, options) => calls.push(["open", noteId, options]),
    setStatus: status.setStatus
  });

  assert.equal(result, true);
  assert.equal(state.selectedFileId, "n1");
  assert.equal(state.inspectorVisible, false);
  assert.deepEqual(calls, [
    ["load", "n1"],
    ["activate", "explorer"],
    ["open", "n1", { preferTitleSelection: false }],
    ["inspector", false],
    ["timeout", 40],
    ["jump", "[data-note-distillation-section]", {
      focus: true,
      focusSelector: '[data-note-distillation-form] textarea[name="thesis"]'
    }]
  ]);
  assert.equal(status.calls.at(-1).message, "已打开“Claim”的观点提纯区域");
});

test("note main route requirements mode opens writing with scoped warning", async () => {
  const status = statusRecorder();
  const calls = [];

  const result = await handleOpenNoteMainRouteStateChange({
    noteId: "n1",
    action: "writing",
    mode: "requirements"
  }, {
    state: { notes: [{ id: "n1", authorship: { user_confirmed: false } }] },
    ensureNoteBodyLoaded: async () => calls.push("load"),
    openWritingModule: async (options) => calls.push(["open-writing", options]),
    setStatus: status.setStatus
  });

  assert.equal(result, true);
  assert.deepEqual(calls, ["load", ["open-writing", { statusMessage: "" }]]);
  assert.deepEqual(status.calls.at(-1), {
    message: "这条笔记还没满足写作要求：先完成作者确认，再进入写作中心。",
    tone: "warn",
    options: { requireModule: "writing" }
  });
});

test("note main route adds a note to the writing basket before opening writing", async () => {
  const calls = [];

  const result = await handleOpenNoteMainRouteStateChange({
    noteId: "n1",
    action: "writing",
    mode: "writing"
  }, {
    state: { notes: [{ id: "n1", title: "Claim" }] },
    ensureNoteBodyLoaded: async () => calls.push("load"),
    noteMainPathWritingContinuationEntry: () => null,
    normalizeWritingProjectTitleSeed: (title) => `seed:${title}`,
    continueWritingEntry: (noteIds, options) => {
      calls.push(["continue-entry", noteIds, options]);
      return { addedNoteIds: ["n1"] };
    },
    openWritingModule: async (options) => calls.push(["open-writing", options])
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    "load",
    ["continue-entry", ["n1"], { title: "seed:Claim", source: "note_main_path" }],
    ["open-writing", { statusMessage: "已把“Claim”加入相关笔记，并打开写作中心" }]
  ]);
});

test("note main route resumes an existing writing project before generic writing", async () => {
  const calls = [];

  const result = await handleOpenNoteMainRouteStateChange({
    noteId: "n1",
    action: "writing",
    mode: "project"
  }, {
    state: { notes: [{ id: "n1", title: "Claim" }] },
    ensureNoteBodyLoaded: async () => calls.push("load"),
    openWritingModule: async (options) => calls.push(["open-writing", options]),
    noteMainPathWritingContinuationEntry: () => ({ projectId: "wp1", action: "open-draft" }),
    continueWritingEntry: () => ({ addedNoteIds: [] }),
    normalizeWritingProjectTitleSeed: (title) => title,
    writingCenterContinuationStatusMessage: (_continuation, options) => `status:${options.sourceLabel}:${options.scaffoldLabel}`,
    continueWritingProjectEntry: async (projectId, options) => calls.push(["continue-project", projectId, options]),
    createWritingProjectFromCurrentBasket: async () => calls.push("create-project")
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    "load",
    ["open-writing", { statusMessage: "" }],
    ["continue-project", "wp1", {
      openDraft: true,
      statusMessage: "status:主路径:当前主题的文章提纲"
    }]
  ]);
});

test("note main route reports continuation failure with scoped copy", async () => {
  const status = statusRecorder();
  const result = await handleOpenNoteMainRouteStateChange({
    noteId: "n1",
    action: "writing",
    mode: "writing"
  }, {
    state: { notes: [{ id: "n1", title: "Claim" }] },
    ensureNoteBodyLoaded: async () => {},
    noteMainPathWritingContinuationEntry: () => ({ projectId: "wp1", action: "resume-scaffold" }),
    continueWritingEntry: () => ({ addedNoteIds: [] }),
    continueWritingProjectEntry: async () => {
      throw new Error("boom");
    },
    writingCenterContinuationFailureMessage: (_continuation, error, options) => `failed:${options.sourceLabel}:${error.message}`,
    setStatus: status.setStatus
  });

  assert.equal(result, false);
  assert.deepEqual(status.calls.at(-1), {
    message: "failed:主路径:boom",
    tone: "bad",
    options: undefined
  });
});
