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
