import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createInitialState } from "../../apps/web/src/prototype-store.js";
import {
  explorerNewNoteButtonCopy,
  resolveExplorerNewNoteFolderId
} from "../../apps/web/src/components-explorer-pane.js";

test("note browser new action follows the current material root", () => {
  const state = createInitialState();

  state.browserRootId = "dir_literature_default";
  state.selectedFolderId = "dir_literature_default";

  assert.equal(resolveExplorerNewNoteFolderId(state), "dir_literature_default");
  assert.deepEqual(explorerNewNoteButtonCopy(state), {
    label: "新建文献",
    title: "新建文献笔记",
    ariaLabel: "在当前文献目录新建文献笔记"
  });
});

test("note browser new action falls back to current root when selection is stale", () => {
  const state = createInitialState();

  state.browserRootId = "dir_fleeting_default";
  state.selectedFolderId = "dir_original_default";

  assert.equal(resolveExplorerNewNoteFolderId(state), "dir_fleeting_default");
  assert.deepEqual(explorerNewNoteButtonCopy(state), {
    label: "新建随笔",
    title: "新建随笔笔记",
    ariaLabel: "在当前随笔目录新建随笔笔记"
  });
});

test("note browser new action names permanent notes without legacy original copy", () => {
  const state = createInitialState();

  state.browserRootId = "dir_original_default";
  state.selectedFolderId = "dir_original_default";

  assert.equal(resolveExplorerNewNoteFolderId(state), "dir_original_default");
  assert.deepEqual(explorerNewNoteButtonCopy(state), {
    label: "新建笔记",
    title: "新建永久笔记",
    ariaLabel: "在当前永久笔记目录新建笔记"
  });
});

test("editor toolbar does not render the file attachment button", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const html = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype.html"), "utf8");

  assert.doesNotMatch(html, /id="btnInsertFile"/);
  assert.doesNotMatch(html, /插入文件附件/);
});

test("prototype fallback state keeps local permanent note seeds for reviewable main-path flows", () => {
  const state = createInitialState();

  assert.deepEqual(
    state.notes.map((note) => note.id),
    ["pn_001", "pn_002"]
  );
  assert.equal(state.notes[0].noteType, "permanent");
  assert.equal(state.notes[1].folderId, "dir_original_method");
});

test("import-result create-writing-project path reuses unified writing entry reset", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/async function createWritingProjectFromImportedPermanentNotes\(\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected createWritingProjectFromImportedPermanentNotes() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /beginWritingEntry\(noteIds,\s*\{/);
  assert.doesNotMatch(fnBody, /resetWritingProjectContext\(/);
  assert.doesNotMatch(fnBody, /setWritingBasketIds\(noteIds\)/);
});

test("theme index append skips writing-entry reset when the basket already contains all theme notes", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/async function useThemeIndexAsWritingEntry\(indexCardId, \{ replaceBasket = false, resetContext = false, source = "writing_theme_index" \} = \{\}\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected useThemeIndexAsWritingEntry() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(entryPlan\.addedNoteIds\.length\) \{\s*continueWritingEntry\(/);
  assert.match(fnBody, /else \{\s*const nextSourceIndexIds = resolveWritingSourceIndexIds\(/);
  assert.doesNotMatch(fnBody, /else \{\s*continueWritingEntry\(/);
});

test("theme index replace path also reuses unified writing-entry reset", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/async function useThemeIndexAsWritingEntry\(indexCardId, \{ replaceBasket = false, resetContext = false, source = "writing_theme_index" \} = \{\}\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected useThemeIndexAsWritingEntry() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /else if \(replaceBasket\) \{\s*continueWritingEntry\(noteIds,/);
  assert.match(fnBody, /preserveSourceIndexIds: false/);
  assert.doesNotMatch(fnBody, /else if \(replaceBasket\) \{\s*resetWritingStrongModelState\(\)/);
  assert.doesNotMatch(fnBody, /else if \(replaceBasket\) \{[\s\S]*resetWritingProjectContext\(/);
});

test("continueWritingEntry preserves the current selected theme when merged provenance still contains it", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/function continueWritingEntry\(noteIds = \[\], \{ title = "", source = "writing_center", sourceIndexIds = \[\], preserveSourceIndexIds = true \} = \{\}\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected continueWritingEntry() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /setSelectedWritingThemeIndex\(\s*resolveWritingSelectedThemeIndexId\(\s*\{\s*currentSelectedThemeIndexId: writingState\.selectedThemeIndexId,/);
  assert.doesNotMatch(fnBody, /setSelectedWritingThemeIndex\(nextSourceIndexIds\.length === 1 \? nextSourceIndexIds\[0\] : ""\)/);
});

test("theme index selection preserves hydrated theme context when switching between identical note sets", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/async function selectWritingThemeIndex\(indexId\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected selectWritingThemeIndex() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const preservingExistingThemeContext =\s*sameUniqueStringSet\(noteIds, writingState\.themeNoteDetailIds\)\s*&&\s*sameUniqueStringSet\(noteIds, writingState\.themeRelationNoteIds\)/);
  assert.match(fnBody, /if \(!preservingExistingThemeContext\) clearWritingThemeRelationCounts\(noteIds\)/);
});

test("theme index cards reuse continuity actions when a matching project already exists", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/function renderWritingThemeIndexCard\(indexCard\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected renderWritingThemeIndexCard() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const existingProject = findExistingWritingProjectForTheme\(indexCard, noteIds\)/);
  assert.match(fnBody, /当前项目：/);
  assert.match(fnBody, /const continuation = describeWritingContinuationAction\(\{/);
  assert.match(fnBody, /data-writing-index-action="\$\{escapeHtml\(continuation\.action\)\}"/);
  assert.match(fnBody, /\$\{escapeHtml\(continuation\.actionLabel\)\}/);
});

test("theme index list click handler routes continuity actions through continueWritingProjectEntry", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/\$\("writingThemeIndexList"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writingThemeIndexList click handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(action === "open-draft" \|\| action === "resume-project" \|\| action === "resume-scaffold"\)/);
  assert.match(fnBody, /await continueWritingProjectEntry\(projectId, \{/);
  assert.match(fnBody, /openDraft: action === "open-draft"/);
  assert.match(fnBody, /已从主题索引打开当前草稿：\$\{projectId\}/);
  assert.match(fnBody, /已从主题索引回到草稿骨架：\$\{projectId\}/);
  assert.match(fnBody, /已从主题索引继续当前项目：\$\{projectId\}/);
  assert.match(fnBody, /action === "open-draft" \? "从主题索引打开当前草稿" : action === "resume-scaffold" \? "从主题索引回到草稿骨架" : "从主题索引继续当前项目"/);
});
