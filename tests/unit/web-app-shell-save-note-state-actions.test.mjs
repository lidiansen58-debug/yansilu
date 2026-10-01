import test from "node:test";
import assert from "node:assert/strict";

import {
  handleSaveNoteStateChange
} from "../../apps/web/src/app-shell-save-note-state-actions.js";

function statusRecorder() {
  const calls = [];
  return {
    calls,
    setStatus(message, tone) {
      calls.push({ message, tone });
    }
  };
}

test("uncertain save keeps input and returns a warning instead of success", async () => {
  const body = "My unsaved edit";
  const state = { notes: [{ id: "n1", body }], tabs: [] };
  const result = await handleSaveNoteStateChange({ noteId: "n1", body }, {
    state,
    updateNote: async () => { throw Object.assign(new Error("Result not confirmed"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" }); }
  });
  assert.equal(result.ok, false);
  assert.equal(result.saveMode, "uncertain");
  assert.equal(result.statusTone, "warn");
  assert.equal(state.notes[0].body, body);
});

test("recovered saves do not display a saved-content AI suggestion for later input", async () => {
  let suggestions = 0, cleared = 0;
  const updated = { id: "n", body: "EARLIER", recoveredSave: true };
  const result = await handleSaveNoteStateChange({ noteId: "n", body: "LATER" }, {
    state: { notes: [{ id: "n", body: "LATER" }], tabs: [{ noteId: "n", dirty: true }] },
    updateNote: async () => updated,
    clearSaveAiSuggestion: () => { cleared++; },
    showSaveAiSuggestionForNote: () => { suggestions++; }
  });
  assert.equal(result, updated);
  assert.equal(suggestions, 0);
  assert.equal(cleared, 1);
});

test("an explicit editor save without a loaded baseline fails before persistence", async () => {
  let writes = 0;
  const result = await handleSaveNoteStateChange({ noteId: "n", body: "My edit", expectedBody: undefined }, {
    state: { notes: [{ id: "n", body: "My edit" }] },
    updateNote: async () => { writes++; return {}; }
  });
  assert.equal(result.ok, false);
  assert.equal(writes, 0);
  assert.match(result.statusMessage, /缺少已保存正文/);
});

test("save note state action saves the active tab note and syncs explorer after markdown persistence", async () => {
  const status = statusRecorder();
  const state = {
    activeTabId: "tab-1",
    module: "explorer",
    tabs: [{ id: "tab-1", noteId: "n1", title: "Old", body: "# Old\nbody" }],
    notes: [{ id: "n1", title: "Old", body: "# Old\nbody", status: "draft", authorship: { user_confirmed: true } }]
  };
  const calls = [];

  const result = await handleSaveNoteStateChange({ title: "New", originalityStatus: "pass", originalitySimilarity: 0.42 }, {
    state,
    editor: { fillEditorFromTab: () => calls.push("fill-editor") },
    replaceFirstMarkdownTitle: (body, title) => `# ${title}\n${body.split("\n").slice(1).join("\n")}`,
    noteGeneratedOriginalNoteId: (note) => note.generatedOriginalNoteId || "",
    generatedOriginalNoteIdFromBody: () => "origin-1",
    notePersistenceFieldsForSave: (note) => ({ generatedOriginalNoteId: note.generatedOriginalNoteId }),
    isPermanentLikeNote: () => true,
    updateNote: async (noteId, patch) => {
      calls.push(["update", noteId, patch]);
      return {
        ...patch,
        id: noteId,
        markdownPath: "/vault/New.md",
        originalitySimilarity: patch.originalitySimilarity,
        updatedAt: "2026-01-01T00:00:00.000Z"
      };
    },
    normalizeOptionalNumber: (value) => Number(value),
    normalizeAuthorshipItem: (value) => value,
    normalizeThinkingStatusItem: (value) => value,
    syncExplorerContextToNote: (note) => calls.push(["sync-explorer", note.id, note.title]),
    setStatus: status.setStatus,
    showSaveAiSuggestionForNote: (note) => {
      calls.push(["suggestion", note.id]);
      return { id: "suggestion-1" };
    },
    syncSourcePromotionSystemMessageForNote: (note, suggestion) => calls.push(["system-message", note.id, suggestion.id]),
    renderAll: () => calls.push("render")
  });

  assert.equal(result.title, "New");
  assert.equal(state.notes[0].title, "New");
  assert.equal(state.notes[0].body, "# New\nbody");
  assert.equal(state.notes[0].status, "active");
  assert.equal(state.notes[0].generatedOriginalNoteId, "origin-1");
  assert.equal(state.notes[0].bodyLoaded, true);
  assert.deepEqual(calls, [
    "fill-editor",
    ["update", "n1", {
      title: "New",
      body: "# New\nbody",
      status: "active",
      generatedOriginalNoteId: "origin-1",
      originalityStatus: "pass",
      originalitySimilarity: 0.42,
      authorship: { user_confirmed: true }
    }],
    ["sync-explorer", "n1", "New"],
    ["suggestion", "n1"],
    ["system-message", "n1", "suggestion-1"],
    ["sync-explorer", "n1", "New"],
    "render"
  ]);
  assert.deepEqual(status.calls.at(-1), { message: "已同步到 Markdown", tone: "ok" });
});

test("save note state action can preserve editor focus while syncing an active note title", async () => {
  const state = {
    activeTabId: "tab-1",
    module: "explorer",
    tabs: [{ id: "tab-1", noteId: "n1", title: "Old", body: "# Old\nbody" }],
    notes: [{ id: "n1", title: "Old", body: "# Old\nbody", status: "draft" }]
  };
  const calls = [];

  await handleSaveNoteStateChange({ title: "New", preserveEditorFocus: true }, {
    state,
    editor: { fillEditorFromTab: () => calls.push("fill-editor") },
    replaceFirstMarkdownTitle: (body, title) => `# ${title}\n${body.split("\n").slice(1).join("\n")}`,
    updateNote: async (_noteId, patch) => patch,
    renderAll: () => calls.push("render")
  });

  assert.equal(state.notes[0].title, "New");
  assert.equal(state.notes[0].body, "# New\nbody");
  assert.equal(state.tabs[0].title, "New");
  assert.equal(state.tabs[0].body, "# New\nbody");
  assert.deepEqual(calls, ["render"]);
});

test("save note state action can suppress save suggestion for quiet relation-link saves", async () => {
  const state = {
    activeTabId: "tab-1",
    module: "explorer",
    tabs: [{ id: "tab-1", noteId: "n1", title: "Note", body: "# Note\n[[Target]]" }],
    notes: [{ id: "n1", title: "Note", body: "# Note\n[[Target]]", status: "draft" }]
  };
  const calls = [];

  await handleSaveNoteStateChange({ noteId: "n1", body: "# Note\n[[Target]]", suppressSaveAiSuggestion: true }, {
    state,
    updateNote: async (_noteId, patch) => patch,
    showSaveAiSuggestionForNote: () => calls.push("suggestion"),
    clearSaveAiSuggestion: () => calls.push("clear-suggestion"),
    syncSourcePromotionSystemMessageForNote: (_note, suggestion) => calls.push(["system-message", suggestion]),
    renderAll: () => calls.push("render")
  });

  assert.deepEqual(calls, ["clear-suggestion", ["system-message", null], "render"]);
});

test("save note state action refreshes graph after saving in graph module", async () => {
  const calls = [];
  const state = {
    module: "graph",
    notes: [{ id: "n1", title: "Note", body: "body", status: "draft" }],
    tabs: []
  };

  await handleSaveNoteStateChange({ noteId: "n1" }, {
    state,
    updateNote: async (_noteId, patch) => patch,
    syncExplorerContextToNote: () => calls.push("sync-explorer"),
    refreshDirectoryGraph: async () => calls.push("refresh-graph"),
    renderAll: () => calls.push("render")
  });

  assert.deepEqual(calls, ["sync-explorer", "refresh-graph", "sync-explorer", "render"]);
});

test("save note state action returns true when no note is available", async () => {
  const calls = [];
  const result = await handleSaveNoteStateChange({}, {
    state: { notes: [], tabs: [] },
    renderAll: () => calls.push("render")
  });

  assert.equal(result, true);
  assert.deepEqual(calls, ["render"]);
});

test("save note state action reports failures and clears matching save AI suggestion", async () => {
  const status = statusRecorder();
  const calls = [];
  const state = {
    notes: [{ id: "n1", title: "Note", body: "body", status: "draft" }],
    tabs: []
  };

  const result = await handleSaveNoteStateChange({ noteId: "n1" }, {
    state,
    saveAiSuggestion: { noteId: "n1" },
    updateNote: async () => {
      throw new Error("disk");
    },
    noteSaveFailureFeedback: (error) => ({ statusMessage: `failed:${error.message}`, statusTone: "bad", code: "save_failed" }),
    clearSaveAiSuggestion: () => calls.push("clear-suggestion"),
    setStatus: status.setStatus,
    renderAll: () => calls.push("render")
  });

  assert.deepEqual(result, { statusMessage: "failed:disk", statusTone: "bad", code: "save_failed" });
  assert.deepEqual(status.calls.at(-1), { message: "failed:disk", tone: "bad" });
  assert.deepEqual(calls, ["clear-suggestion", "render"]);
});

test("save note state action keeps save AI suggestion when failure is for another note", async () => {
  const calls = [];
  await handleSaveNoteStateChange({ noteId: "n1" }, {
    state: { notes: [{ id: "n1", body: "" }], tabs: [] },
    saveAiSuggestion: { noteId: "n2" },
    updateNote: async () => {
      throw new Error("disk");
    },
    clearSaveAiSuggestion: () => calls.push("clear-suggestion"),
    renderAll: () => calls.push("render")
  });

  assert.deepEqual(calls, ["render"]);
});

test("missing save acknowledgement keeps the draft and reports failure", async () => {
  const status = statusRecorder();
  const cleared = [], suggestions = [];
  const body = "# Keep this edit\n\nNot yet confirmed on disk.";
  const state = { notes: [{ id: "n1", body }], tabs: [] };
  const result = await handleSaveNoteStateChange({ noteId: "n1", body }, {
    state,
    updateNote: async () => null,
    editor: { clearDraft: id => cleared.push(id) },
    showSaveAiSuggestionForNote: note => suggestions.push(note.id),
    setStatus: status.setStatus
  });
  assert.equal(result.ok, false);
  assert.equal(result.saveMode, "error");
  assert.equal(state.notes[0].body, body);
  assert.equal(status.calls.some(item => item.tone === "ok"), false);
  assert.match(result.statusMessage, /未返回保存结果/);
  assert.deepEqual(cleared, []);
  assert.deepEqual(suggestions, []);
});
