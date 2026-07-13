import test from "node:test";
import assert from "node:assert/strict";

import {
  handleCreateNoteInSelectedFolderStateChange,
  handleCreatePrimaryNoteStateChange,
  handleRecordOriginalFromNoteStateChange
} from "../../apps/web/src/app-shell-state-note-creation-actions.js";

function statusRecorder() {
  const calls = [];
  return {
    calls,
    setStatus(message, tone) {
      calls.push({ message, tone });
    }
  };
}

test("note creation actions report reused primary note placeholders", async () => {
  const status = statusRecorder();
  const result = await handleCreatePrimaryNoteStateChange({}, {
    createPrimaryOriginalNote: async (options) => ({
      ...options,
      reused: true,
      cleanedCount: 2
    }),
    setStatus: status.setStatus
  });

  assert.equal(result.reused, true);
  assert.equal(result.preferTitleSelection, true);
  assert.deepEqual(status.calls.at(-1), {
    message: "已打开永久笔记占位，并清理 2 条空白占位",
    tone: "warn"
  });
});

test("note creation actions clear active editor tab before creating in selected folder", async () => {
  const status = statusRecorder();
  const state = { activeTabId: "tab-1" };
  const calls = [];

  const result = await handleCreateNoteInSelectedFolderStateChange({ folderId: " d2 " }, {
    state,
    editor: {
      fillEditorFromTab: () => calls.push("fill-editor"),
      renderTabs: () => calls.push("render-tabs")
    },
    applyExplorerSelectionContext: (context) => calls.push(["context", context]),
    createNoteInSelectedFolder: async (options) => {
      calls.push(["create", options]);
      return { remote: true };
    },
    setStatus: status.setStatus
  });

  assert.equal(result.remote, true);
  assert.equal(state.activeTabId, null);
  assert.deepEqual(calls, [
    ["context", { folderId: "d2", clearSelectedFile: true, expandFolder: true }],
    "fill-editor",
    "render-tabs",
    ["create", { preferTitleSelection: true }]
  ]);
  assert.deepEqual(status.calls.at(-1), {
    message: "已在当前目录创建 Markdown 文件（已落盘）",
    tone: "ok"
  });
});

test("note creation actions record original notes and update the source note marker", async () => {
  const status = statusRecorder();
  const sourceNote = {
    id: "src",
    title: "Source",
    body: "original text",
    folderId: "lit",
    status: "draft"
  };
  const state = {
    notes: [sourceNote],
    tabs: [{ noteId: "src", body: "old", savedBody: "old", title: "Source", savedTitle: "Source", dirty: true }]
  };
  const calls = [];

  const result = await handleRecordOriginalFromNoteStateChange({
    sourceNoteId: "src",
    sourceBody: "original text",
    paraphrase: "claim"
  }, {
    state,
    typeFromFolder: () => "literature",
    rootBoxIdFromFolder: () => "dir_original_default",
    originalDraftBodyFromSource: (payload) => {
      calls.push(["draft", payload.sourceType, payload.sourceTitle, payload.sourceBody]);
      return "draft body";
    },
    titleFromSeedText: () => "Claim",
    createNote: async (payload) => {
      calls.push(["create", payload]);
      return { id: "new", title: "Claim", body: payload.body };
    },
    mapNoteItem: (item) => ({ ...item, mapped: true }),
    syncNoteRelationNetworkStatus: (note, statusPayload) => calls.push(["relation-status", note.id, statusPayload]),
    isOriginalRecordableSource: () => true,
    withGeneratedOriginalReference: (body, title) => `${body}\nref:${title}`,
    withGeneratedOriginalMarker: (body, id) => `${body}\nmarker:${id}`,
    syncSourcePromotionSystemMessageForNote: (note) => calls.push(["system-message", note.id]),
    parseTags: (body) => [`tag:${body.includes("marker")}`],
    parseLinks: (body) => [`link:${body.includes("ref")}`],
    updateNote: async (noteId, patch) => {
      calls.push(["update-source", noteId, patch.generatedOriginalNoteId]);
      return { ...sourceNote, ...patch, title: "Source saved" };
    },
    activateModule: (moduleId) => calls.push(["activate", moduleId]),
    openNoteById: (noteId, options) => calls.push(["open", noteId, options]),
    setStatus: status.setStatus
  });

  assert.equal(result.id, "new");
  assert.equal(state.notes[0].id, "new");
  assert.equal(sourceNote.generatedOriginalNoteId, "new");
  assert.equal(sourceNote.bodyLoaded, true);
  assert.deepEqual(state.tabs[0], {
    noteId: "src",
    body: "original text\nref:Claim\nmarker:new",
    savedBody: "original text\nref:Claim\nmarker:new",
    title: "Source",
    savedTitle: "Source",
    dirty: false
  });
  assert.deepEqual(calls.filter((call) => call[0] === "activate" || call[0] === "open"), [
    ["activate", "explorer"],
    ["open", "new", { preferTitleSelection: false }]
  ]);
  assert.equal(status.calls.at(-1).message, "已生成并打开永久笔记：Claim");
  assert.equal(status.calls.at(-1).tone, "ok");
});

test("note creation actions keep the created note when source marker save fails", async () => {
  const status = statusRecorder();
  const sourceNote = { id: "src", title: "Source", body: "body", folderId: "lit" };
  const state = { notes: [sourceNote], tabs: [] };

  const result = await handleRecordOriginalFromNoteStateChange({ sourceNoteId: "src" }, {
    state,
    originalDraftBodyFromSource: () => "draft",
    titleFromSeedText: () => "Draft",
    createNote: async () => ({ id: "new", title: "Draft", body: "draft" }),
    mapNoteItem: (item) => item,
    isOriginalRecordableSource: () => true,
    withGeneratedOriginalReference: (body) => body,
    withGeneratedOriginalMarker: (body) => body,
    updateNote: async () => {
      throw new Error("disk");
    },
    setStatus: status.setStatus
  });

  assert.equal(result.id, "new");
  assert.equal(status.calls.at(-2).message, "永久笔记已创建，但来源笔记标记保存失败：disk");
  assert.equal(status.calls.at(-2).tone, "warn");
  assert.equal(status.calls.at(-1).tone, "ok");
});

test("note creation actions use adopted AI draft body when provided", async () => {
  const state = {
    notes: [{ id: "src", title: "Source", body: "source body", folderId: "fleeting" }],
    tabs: []
  };
  const calls = [];

  const result = await handleRecordOriginalFromNoteStateChange({
    sourceNoteId: "src",
    draftTitle: "Edited Draft",
    draftBody: "# Edited Draft\n\n正文"
  }, {
    state,
    rootBoxIdFromFolder: () => "dir_original_default",
    originalDraftBodyFromSource: () => {
      calls.push(["legacy-draft"]);
      return "legacy body";
    },
    titleFromSeedText: () => "Legacy",
    createNote: async (payload) => {
      calls.push(["create", payload]);
      return { id: "new", title: "Edited Draft", body: payload.body };
    },
    mapNoteItem: (item) => item,
    syncNoteRelationNetworkStatus: () => {},
    isOriginalRecordableSource: () => false,
    activateModule: () => {},
    openNoteById: () => {},
    setStatus: () => {}
  });

  assert.equal(result.title, "Edited Draft");
  assert.deepEqual(calls, [["create", { directoryId: "dir_original_default", status: "draft", body: "# Edited Draft\n\n正文" }]]);
});

test("note creation actions report record failures", async () => {
  const status = statusRecorder();
  const result = await handleRecordOriginalFromNoteStateChange({}, {
    createNote: async () => null,
    setStatus: status.setStatus
  });

  assert.equal(result, false);
  assert.deepEqual(status.calls.at(-1), {
    message: "记录永久笔记失败：创建永久笔记失败",
    tone: "bad"
  });
});
