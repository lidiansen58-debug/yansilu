import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  dismissSaveAiSuggestionForLater,
  saveAiSuggestionForNoteModel,
  saveAiSuggestionPrimaryRoute
} from "../../apps/web/src/save-ai-suggestion-model.js";
import {
  handleSaveNoteStateChange
} from "../../apps/web/src/app-shell-save-note-state-actions.js";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

test("save-after AI suggestion is rendered in the editor feedback area", () => {
  const html = readRepoFile("apps/web/src/prototype.html");
  const css = readRepoFile("apps/web/src/prototype.css");

  assert.match(html, /id="saveAiSuggestion"/);
  assert.match(html, /id="saveAiSuggestionText"/);
  assert.match(html, /id="btnSaveAiSuggestionPrimary"[\s\S]*?>立即处理<\/button>/);
  assert.match(html, /id="btnSaveAiSuggestionLater"[\s\S]*?>稍后<\/button>/);
  assert.match(css, /\.save-ai-suggestion\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto auto;/);
});

test("save-after AI suggestion keeps one executable suggestion for the active saved note", () => {
  const note = { id: "n1", noteType: "fleeting", body: "content" };
  const context = { currentModule: "explorer", activeNote: note, activeBody: "" };
  const deps = {
    isOriginalRecordableSource: () => true,
    noteHasGeneratedOriginal: () => false,
    noteTypeForNote: () => "fleeting",
    saveAiSuggestionKey: (item, action) => `${item.id}:${action}`
  };

  assert.equal(saveAiSuggestionForNoteModel(note, { ...context, currentModule: "graph" }, deps), null);
  assert.equal(saveAiSuggestionForNoteModel(note, { ...context, activeNote: { id: "other" } }, deps), null);
  assert.equal(saveAiSuggestionForNoteModel(note, context, { ...deps, isEmptyUntitledMarkdown: () => true }), null);

  assert.deepEqual(saveAiSuggestionForNoteModel(note, context, deps), {
    key: "n1:record-permanent",
    noteId: "n1",
    action: "record-permanent",
    text: "已保存，记得清理或沉淀为永久笔记",
    primaryLabel: "提炼为永久笔记",
    laterLabel: "稍后清理"
  });

  const distillationSuggestion = saveAiSuggestionForNoteModel(
    { id: "p1", noteType: "permanent", body: "claim" },
    { currentModule: "explorer", activeNote: { id: "p1" }, activeBody: "" },
    {
      isPermanentLikeNote: () => true,
      distillationStatusOf: () => "draft",
      saveAiSuggestionKey: (item, action) => `${item.id}:${action}`
    }
  );
  assert.equal(distillationSuggestion.action, "open-distillation");
  assert.equal(distillationSuggestion.text, "已保存，可继续整理观点");
});

test("save-after AI suggestion only appears after note save succeeds", async () => {
  const calls = [];
  await handleSaveNoteStateChange({ noteId: "n1" }, {
    state: { notes: [{ id: "n1", body: "body", status: "draft" }], tabs: [] },
    updateNote: async (_noteId, patch) => patch,
    setStatus: (message, tone) => calls.push(["status", message, tone]),
    showSaveAiSuggestionForNote: (note) => {
      calls.push(["suggestion", note.id]);
      return { id: "suggestion-1" };
    },
    syncSourcePromotionSystemMessageForNote: (note, suggestion) => calls.push(["system-message", note.id, suggestion.id]),
    renderAll: () => calls.push(["render"])
  });

  assert.deepEqual(calls, [
    ["status", "已同步到 Markdown", "ok"],
    ["suggestion", "n1"],
    ["system-message", "n1", "suggestion-1"],
    ["render"]
  ]);

  const failureCalls = [];
  await handleSaveNoteStateChange({ noteId: "n1" }, {
    state: { notes: [{ id: "n1", body: "body" }], tabs: [] },
    saveAiSuggestion: { noteId: "n1" },
    updateNote: async () => {
      throw new Error("disk");
    },
    showSaveAiSuggestionForNote: () => failureCalls.push(["suggestion"]),
    clearSaveAiSuggestion: () => failureCalls.push(["clear"]),
    renderAll: () => failureCalls.push(["render"])
  });
  assert.deepEqual(failureCalls, [["clear"], ["render"]]);
});
test("save-after AI suggestion actions reuse existing editor routes", () => {
  assert.deepEqual(saveAiSuggestionPrimaryRoute(null, null), { kind: "noop" });
  assert.deepEqual(saveAiSuggestionPrimaryRoute({ noteId: "n1", action: "record-permanent" }, null), {
    kind: "missing-note",
    noteId: "n1"
  });
  assert.deepEqual(saveAiSuggestionPrimaryRoute({ noteId: "n1", action: "record-permanent" }, { id: "n1" }), {
    kind: "record-permanent",
    noteId: "n1"
  });
  assert.deepEqual(saveAiSuggestionPrimaryRoute({ noteId: "p1", action: "open-distillation" }, { id: "p1" }), {
    kind: "open-note-main-route",
    noteId: "p1",
    action: "writing",
    mode: "distillation"
  });
  assert.deepEqual(saveAiSuggestionPrimaryRoute({ noteId: "x1", action: "unknown-action" }, { id: "x1" }), {
    kind: "unsupported",
    noteId: "x1",
    action: "unknown-action"
  });
});

test("save-after AI suggestion can be ignored without mutating the note", () => {
  const dismissedKeys = new Set();
  const nextSuggestion = dismissSaveAiSuggestionForLater({ key: "n1:record-permanent" }, dismissedKeys);

  assert.equal(nextSuggestion, null);
  assert.equal(dismissedKeys.has("n1:record-permanent"), true);
});
