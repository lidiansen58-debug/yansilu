import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  dismissSaveAiSuggestionForLater,
  saveAiSuggestionForNoteModel
} from "../../apps/web/src/save-ai-suggestion-model.js";

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

test("save-after AI suggestion only appears after note save succeeds", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const saveStart = source.indexOf('  if (reason === "save-note") {');
  const saveEnd = source.indexOf('  if (reason === "note-move") {', saveStart);

  assert.ok(saveStart >= 0 && saveEnd > saveStart, "expected save-note handler to exist");
  const saveSource = source.slice(saveStart, saveEnd);
  const statusIndex = saveSource.indexOf('setStatus("已同步到 Markdown", "ok");');
  const suggestionIndex = saveSource.indexOf("showSaveAiSuggestionForNote(note);");
  const catchIndex = saveSource.indexOf("} catch (error) {");

  assert.ok(statusIndex >= 0, "expected successful save status");
  assert.ok(suggestionIndex > statusIndex, "expected suggestion after successful save status");
  assert.ok(suggestionIndex < catchIndex, "expected suggestion outside save failure branch");
  assert.match(saveSource, /if \(saveAiSuggestion\?\.noteId === note\.id\) clearSaveAiSuggestion\(\);/);
});

test("save-after AI suggestion actions reuse existing editor routes", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const primaryStart = source.indexOf('$("btnSaveAiSuggestionPrimary")?.addEventListener("click", async () => {');
  const primaryEnd = source.indexOf('$("settingsRefreshVault")?.addEventListener', primaryStart);

  assert.ok(primaryStart >= 0 && primaryEnd > primaryStart, "expected primary suggestion handler to exist");
  const primarySource = source.slice(primaryStart, primaryEnd);

  assert.match(primarySource, /suggestion\.action === "record-permanent"/);
  assert.match(primarySource, /openNoteById\(note\.id, \{ preferTitleSelection: false \}\)/);
  assert.match(primarySource, /editor\?\.els\?\.recordPermanent/);
  assert.match(primarySource, /button\.click\(\)/);
  assert.match(primarySource, /suggestion\.action === "open-distillation"/);
  assert.match(primarySource, /handleStateChange\("open-note-main-route"/);
  assert.match(primarySource, /mode: "distillation"/);
});

test("save-after AI suggestion can be ignored without mutating the note", () => {
  const dismissedKeys = new Set();
  const nextSuggestion = dismissSaveAiSuggestionForLater({ key: "n1:record-permanent" }, dismissedKeys);

  assert.equal(nextSuggestion, null);
  assert.equal(dismissedKeys.has("n1:record-permanent"), true);
});
