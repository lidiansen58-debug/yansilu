import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createInitialState, folderById } from "../../apps/web/src/prototype-store.js";
import {
  ExplorerPane,
  explorerNewNoteButtonCopy,
  resolveExplorerNewNoteFolderId
} from "../../apps/web/src/components-explorer-pane.js";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function createStubButton() {
  return {
    classList: { toggle() {} },
    dataset: {},
    title: "",
    addEventListener() {},
    setAttribute() {},
    querySelector() {
      return null;
    }
  };
}

function createStubElements() {
  return {
    searchInput: { value: "", addEventListener() {}, focus() {} },
    toggleSearchBtn: { addEventListener() {} },
    openNewBoxBtn: { addEventListener() {} },
    newNoteBtn: createStubButton(),
    listArea: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } }
  };
}

function createExplorerForTest(state) {
  return new ExplorerPane({
    state,
    elements: createStubElements(),
    contextMenu: { show() {} },
    createBoxDialog: { setOptions() {}, open() {} },
    onOpenNote() {},
    onStatus() {},
    onStateChange() {}
  });
}

test("note browser new action follows the current material root", () => {
  const state = createInitialState();

  state.browserRootId = "dir_literature_default";
  state.selectedFolderId = "dir_literature_default";

  assert.equal(resolveExplorerNewNoteFolderId(state), "dir_literature_default");
  assert.deepEqual(explorerNewNoteButtonCopy(state), {
    label: "创建文件笔记",
    title: "在当前文献目录创建文件笔记",
    ariaLabel: "在当前文献目录创建文件笔记",
    kindLabel: "文献",
    entryKind: "literature",
    mobileLabel: "文献"
  });
});

test("note browser new action falls back to current root when selection is stale", () => {
  const state = createInitialState();

  state.browserRootId = "dir_fleeting_default";
  state.selectedFolderId = "dir_original_default";

  assert.equal(resolveExplorerNewNoteFolderId(state), "dir_fleeting_default");
  assert.deepEqual(explorerNewNoteButtonCopy(state), {
    label: "创建文件笔记",
    title: "在当前随笔目录创建文件笔记",
    ariaLabel: "在当前随笔目录创建文件笔记",
    kindLabel: "随笔",
    entryKind: "fleeting",
    mobileLabel: "随笔"
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
    ariaLabel: "在当前永久笔记目录新建笔记",
    kindLabel: "",
    entryKind: "permanent",
    mobileLabel: "永久"
  });
});

test("editor toolbar does not render the file attachment button", () => {
  const html = readRepoFile("apps/web/src/prototype.html");

  assert.doesNotMatch(html, /id="btnInsertFile"/);
  assert.doesNotMatch(html, /插入文件附件/);
});

test("file context menu keeps move user-facing and removes id or properties utilities", () => {
  const source = readRepoFile("apps/web/src/components-explorer-pane.js");
  const menuStart = source.indexOf('      if (kind === "file") {\n        const note = this.state.notes.find((x) => x.id === id);');
  const menuEnd = source.indexOf("  isDescendantFolder(", menuStart);

  assert.ok(menuStart >= 0 && menuEnd > menuStart, "expected file context menu definition to exist");
  const menuSource = source.slice(menuStart, menuEnd);

  assert.match(menuSource, /label: "移动到\.\.\."/);
  assert.doesNotMatch(menuSource, /复制笔记 ID/);
  assert.doesNotMatch(menuSource, /label: "属性"/);
});

test("file move action uses the directory picker instead of prompting for ids", () => {
  const source = readRepoFile("apps/web/src/components-explorer-pane.js");
  const match = source.match(/if \(action === "move"\) \{([\s\S]*?)\n\s*if \(action === "record-permanent"\)/);

  assert.ok(match, "expected file move handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /selectNoteMoveDirectory/);
  assert.match(fnBody, /note-move/);
  assert.doesNotMatch(fnBody, /prompt\(/);
  assert.doesNotMatch(fnBody, /目录 ID/);
});

test("folder context menu removes id and properties utilities", () => {
  const source = readRepoFile("apps/web/src/components-explorer-pane.js");
  const menuStart = source.indexOf('      if (kind === "folder") {\n        const folder = folderById(this.state, id);');
  const menuEnd = source.indexOf('      if (kind === "file") {', menuStart);

  assert.ok(menuStart >= 0 && menuEnd > menuStart, "expected folder context menu definition to exist");
  const menuSource = source.slice(menuStart, menuEnd);

  assert.doesNotMatch(menuSource, /复制目录 ID/);
  assert.doesNotMatch(menuSource, /label: "属性"/);
  assert.match(menuSource, /设置保存位置/);
  assert.match(menuSource, /在系统文件管理器中显示/);
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

test("save-note re-syncs explorer context before repainting the note tree", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/if \(reason === "save-note"\) \{([\s\S]*?)\n\s*if \(reason === "note-move"\)/);

  assert.ok(match, "expected save-note handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /syncExplorerContextToNote\(note\);/);
  assert.match(fnBody, /if \(noteForExplorerSync\) syncExplorerContextToNote\(noteForExplorerSync\);[\s\S]*renderAll\(\);/);
});

test("new directory creation expands and selects the created folder in the explorer", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/createBoxDialog\.onCreate = async \(\{ name, parentId, fsPath, maxCards \}\) => \{([\s\S]*?)\n\};/);

  assert.ok(match, "expected createBoxDialog.onCreate handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /state\.selectedFolderId = folder\.id;/);
  assert.match(fnBody, /state\.selectedFileId = null;/);
  assert.match(fnBody, /explorer\.expandFolderPath\(folder\.id\);/);
});

test("explorer keeps the currently selected empty folder visible after directory creation", () => {
  const source = readRepoFile("apps/web/src/components-explorer-pane.js");
  const match = source.match(/renderFolderNode\(folder, depth, q, memo\) \{([\s\S]*?)\n\s*const allFiles = this\.getFolderFiles/);

  assert.ok(match, "expected renderFolderNode() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const selectedFolderId = String\(this\.state\.selectedFolderId \|\| ""\)\.trim\(\);/);
  assert.match(fnBody, /if \(!q && c\.id === selectedFolderId\) return true;/);
});

test("note browser only marks permanent notes as disconnected", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.graphConnectedNoteIds = new Set();
  state.graphConnectivityReady = true;

  const permanent = { id: "pn_lonely", noteType: "permanent" };
  const fleeting = { id: "fn_001", noteType: "fleeting" };
  const literature = { id: "ln_001", noteType: "literature" };

  assert.equal(explorer.noteIsDisconnected(permanent), true);
  assert.equal(explorer.noteIsDisconnected(fleeting), false);
  assert.equal(explorer.noteIsDisconnected(literature), false);
});

test("note browser prefers stored relation-network status for permanent notes", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.graphConnectedNoteIds = new Set(["pn_connected"]);
  state.graphConnectivityReady = false;

  assert.equal(explorer.noteIsDisconnected({ id: "pn_isolated", noteType: "permanent", relationNetworkStatus: "isolated" }), true);
  assert.equal(explorer.noteIsDisconnected({ id: "pn_connected", noteType: "permanent", relationNetworkStatus: "connected" }), false);
});

test("note browser still treats literature-folder notes as non-disconnected when noteType is missing", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.graphConnectedNoteIds = new Set();
  state.graphConnectivityReady = true;

  const literature = { id: "ln_missing_type", folderId: "dir_literature_default", noteType: "" };
  const fleeting = { id: "fn_missing_type", folderId: "dir_fleeting_default", noteType: "" };

  assert.equal(explorer.noteIsDisconnected(literature), false);
  assert.equal(explorer.noteIsDisconnected(fleeting), false);
});

test("source-note badges still render for generated permanent notes even when noteType metadata is stale", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.notes.push({
    id: "pn_from_source",
    title: "Generated permanent",
    folderId: "dir_original_default",
    noteType: "permanent"
  });

  const literatureWithStaleType = {
    id: "ln_generated",
    title: "Literature source",
    folderId: "dir_literature_default",
    noteType: "permanent",
    generatedOriginalNoteId: "pn_from_source"
  };

  const row = explorer.renderFileNode(literatureWithStaleType, 1);

  assert.match(row, /data-note-state=""/);
  assert.doesNotMatch(row, /item-badge-warning/);
});

test("note browser suppresses disconnected badges until graph connectivity is ready", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.graphConnectedNoteIds = new Set();
  state.graphConnectivityReady = false;

  const permanent = { id: "pn_waiting_graph", folderId: "dir_original_default", noteType: "permanent" };

  assert.equal(explorer.noteIsDisconnected(permanent), false);
});

test("note browser follows folder root before stale noteType metadata when deciding disconnected state", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.graphConnectedNoteIds = new Set();
  state.graphConnectivityReady = true;

  const literatureWithStaleType = { id: "ln_stale_type", folderId: "dir_literature_default", noteType: "permanent" };

  assert.equal(explorer.noteIsDisconnected(literatureWithStaleType), false);
});

test("note browser only tracks whether a folder subtree still has isolated permanent notes", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.folders.push(
    { id: "dir_parent", name: "Parent", parentId: "dir_original_default", hidden: false },
    { id: "dir_child", name: "Child", parentId: "dir_parent", hidden: false }
  );
  state.notes.push(
    { id: "perm_connected", title: "Connected", folderId: "dir_parent", noteType: "permanent" },
    { id: "perm_disconnected_child", title: "Disconnected child", folderId: "dir_child", noteType: "permanent" },
    { id: "lit_child", title: "Literature child", folderId: "dir_child", noteType: "literature" }
  );
  state.graphConnectedNoteIds = new Set(["perm_connected"]);
  state.graphConnectivityReady = true;

  assert.equal(explorer.folderHasDisconnectedNotes("dir_parent"), true);
  assert.equal(explorer.folderHasDisconnectedNotes("dir_child"), true);
  assert.equal(explorer.folderHasDisconnectedNotes("dir_literature_default"), false);
});

test("note browsers show isolated folder flags without counts only for the permanent root scope", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.folders.push({ id: "dir_custom_root", name: "Custom Root", parentId: null, hidden: false });
  state.notes.push(
    { id: "perm_lonely_box", title: "Lonely Box", folderId: "dir_original_method", noteType: "permanent" },
    { id: "perm_custom", title: "Custom", folderId: "dir_custom_root", noteType: "permanent" }
  );
  state.graphConnectedNoteIds = new Set(["pn_001", "pn_002"]);
  state.graphConnectivityReady = true;

  const simplifiedRow = explorer.renderFolderNode(folderById(state, "dir_original_default"), 0, "", new Map());
  const customRow = explorer.renderFolderNode(folderById(state, "dir_custom_root"), 0, "", new Map());

  assert.match(simplifiedRow, /has-folder-alert/);
  assert.match(simplifiedRow, /data-folder-state="permanent-isolated"/);
  assert.doesNotMatch(simplifiedRow, /\d+<\/span>/);
  assert.doesNotMatch(customRow, /item-badge-warning/);
  assert.doesNotMatch(customRow, /has-folder-alert/);
});

test("save-note only persists known relation-network statuses", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");

  assert.match(source, /function isPersistableRelationNetworkStatus\(status = ""\) \{/);
  assert.match(source, /if \(isPersistableRelationNetworkStatus\(nextStatus\)\) writeStoredRelationNetworkStatus\(note\.id, nextStatus\);/);
  assert.match(source, /relationNetworkStatus: isPersistableRelationNetworkStatus\(note\.relationNetworkStatus\) \? note\.relationNetworkStatus : undefined,/);
  assert.match(source, /return isPersistableRelationNetworkStatus\(value\) \? value : "";/);
  assert.match(source, /if \(!isPersistableRelationNetworkStatus\(cleanStatus\)\) return;/);
  assert.doesNotMatch(source, /\["connected", "isolated", "unknown"\]\.includes/);
});

test("graph-ready relation sync does not let stale unknown statuses override recomputed connectivity", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");

  assert.doesNotMatch(source, /if \(explicitStatus === "connected" \|\| explicitStatus === "isolated" \|\| explicitStatus === "unknown"\) return explicitStatus;/);
  assert.doesNotMatch(source, /if \(storedStatus === "connected" \|\| storedStatus === "isolated" \|\| storedStatus === "unknown"\) return storedStatus;/);
  assert.match(source, /if \(explicitStatus === "connected" \|\| explicitStatus === "isolated"\) return explicitStatus;/);
  assert.match(source, /if \(storedStatus === "connected" \|\| storedStatus === "isolated"\) return storedStatus;/);
  assert.match(source, /if \(!connectivityReady \|\| !connectedIds\) return "unknown";/);
  assert.match(source, /return connectedIds\.has\(note\?\.id\) \? "connected" : "isolated";/);
});

test("note browsers keep disconnected notes visually behind connected notes inside folders", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.folders.push({ id: "dir_ordered", name: "Ordered", parentId: "dir_original_default", hidden: false });
  state.notes.push(
    { id: "perm_connected", title: "A Connected", folderId: "dir_ordered", noteType: "permanent" },
    { id: "perm_disconnected", title: "Z Disconnected", folderId: "dir_ordered", noteType: "permanent" }
  );
  state.graphConnectedNoteIds = new Set(["pn_001", "pn_002", "perm_connected"]);
  state.graphConnectivityReady = true;
  explorer.expandedFolders.add("dir_ordered");

  const html = explorer.renderFolderNode(folderById(state, "dir_ordered"), 1, "", new Map());
  const connectedIndex = html.indexOf("perm_connected");
  const disconnectedIndex = html.indexOf("perm_disconnected");

  assert.ok(connectedIndex >= 0, "expected connected note row to render");
  assert.ok(disconnectedIndex >= 0, "expected disconnected note row to render");
  assert.ok(connectedIndex < disconnectedIndex, "expected connected note rows to appear before disconnected ones");
});

test("note browsers render isolated-note badges without extra relation actions in simplified scopes", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.graphConnectedNoteIds = new Set(["pn_002"]);
  state.graphConnectivityReady = true;
  const html = explorer.renderFileNode({
    id: "pn_001",
    title: "Lonely permanent",
    folderId: "dir_original_default",
    noteType: "permanent",
    generatedOriginalNoteId: "pn_002",
    thinkingStatus: { label: "待思考", severity: "next", status: "open" }
  }, 0);

  assert.match(html, /data-note-state="permanent-isolated"/);
  assert.doesNotMatch(html, /data-associate-note=/);
  assert.doesNotMatch(html, /item-inline-action warn/);
  assert.doesNotMatch(html, /item-badge-thinking/);
  assert.doesNotMatch(html, /item-badge-original-record/);
});

test("connected permanent notes keep the ordinary file icon in simplified scopes", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.graphConnectedNoteIds = new Set(["pn_connected"]);
  state.graphConnectivityReady = true;
  const html = explorer.renderFileNode({
    id: "pn_connected",
    title: "Connected permanent",
    folderId: "dir_original_default",
    noteType: "permanent"
  }, 0);

  assert.match(html, /data-note-state=""/);
  assert.doesNotMatch(html, /permanent-connected/);
  assert.doesNotMatch(html, /permanent-isolated/);
});

test("source-note boxes surface notes that still have not been turned into permanent notes", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  const pendingHtml = explorer.renderFileNode({
    id: "fn_pending",
    title: "Pending fleeting",
    folderId: "dir_fleeting_default",
    noteType: "fleeting"
  }, 0);
  const doneHtml = explorer.renderFileNode({
    id: "ln_done",
    title: "Done literature",
    folderId: "dir_literature_default",
    noteType: "literature",
    generatedOriginalNoteId: "pn_001"
  }, 0);

  assert.match(pendingHtml, /data-note-state="source-pending"/);
  assert.doesNotMatch(pendingHtml, /data-note-state="permanent-isolated"/);
  assert.match(doneHtml, /data-note-state=""/);
});

test("source-note browser uses different pending badges for fleeting and literature notes", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  const fleetingHtml = explorer.renderFileNode({
    id: "fn_pending_type",
    title: "Pending fleeting",
    folderId: "dir_fleeting_default",
    noteType: "fleeting"
  }, 0);
  const literatureHtml = explorer.renderFileNode({
    id: "ln_pending_type",
    title: "Pending literature",
    folderId: "dir_literature_default",
    noteType: "literature"
  }, 0);

  assert.match(fleetingHtml, /data-source-kind="fleeting"/);
  assert.match(fleetingHtml, /data-note-state="source-pending"/);
  assert.match(literatureHtml, /data-source-kind="literature"/);
  assert.match(literatureHtml, /data-note-state="source-pending"/);
});

test("source-note folders surface pending permanent-note creation through icon state", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.notes.push({
    id: "fn_pending_folder_state",
    title: "Pending folder state",
    folderId: "dir_fleeting_default",
    noteType: "fleeting"
  });

  const html = explorer.renderFolderNode(folderById(state, "dir_fleeting_default"), 0, "", new Map());

  assert.match(html, /has-folder-alert/);
  assert.match(html, /data-folder-state="source-pending"/);
  assert.doesNotMatch(html, /随笔待转|文献待转/);
});

test("source-note promote flows no longer ask users to type a directory id", () => {
  const explorerSource = readRepoFile("apps/web/src/components-explorer-pane.js");
  const editorSource = readRepoFile("apps/web/src/components-editor-pane.js");
  const html = readRepoFile("apps/web/src/prototype.html");

  assert.doesNotMatch(explorerSource, /选择永久笔记目录 ID/);
  assert.doesNotMatch(editorSource, /选择永久笔记目录 ID/);
  assert.match(html, /id="permanentNoteModal"/);
  assert.match(html, /先选要放入的永久笔记盒目录/);
});

test("note browsers keep richer note actions and thinking badges outside simplified scopes", () => {
  const state = createInitialState();
  state.folders.push({ id: "dir_custom_root", name: "Custom Root", parentId: null, hidden: false });
  const explorer = createExplorerForTest(state);

  state.graphConnectedNoteIds = new Set(["pn_001", "pn_002"]);
  state.graphConnectivityReady = true;
  const html = explorer.renderFileNode({
    id: "perm_custom",
    title: "Custom permanent",
    folderId: "dir_custom_root",
    noteType: "permanent",
    thinkingStatus: { label: "待补推理", nextAction: "补一条关系", severity: "next", status: "open" }
  }, 0);

  assert.match(html, /孤立/);
  assert.match(html, /item-badge-thinking/);
  assert.match(html, /data-associate-note="perm_custom"/);
  assert.match(html, /补关系/);
});

test("note browsers keep generated-original badges for notes explicitly marked as literature", () => {
  const state = createInitialState();
  state.folders.push({ id: "dir_custom_root", name: "Custom Root", parentId: null, hidden: false });
  const explorer = createExplorerForTest(state);

  const html = explorer.renderFileNode({
    id: "lit_custom",
    title: "Custom literature",
    folderId: "dir_custom_root",
    noteType: "literature",
    generatedOriginalNoteId: "pn_001"
  }, 0);

  assert.match(html, /item-badge-original-record/);
  assert.match(html, /已生成永久笔记/);
});

test("fleeting and literature boxes use the same simplified note-browser scope", () => {
  const source = readRepoFile("apps/web/src/components-explorer-pane.js");

  assert.match(
    source,
    /return rootId === "dir_original_default"\s*\|\|\s*rootId === "dir_fleeting_default"\s*\|\|\s*rootId === "dir_literature_default";/
  );
});

test("writing workspace defines hasProject before project list hints use it", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/const hasProject = Boolean\(writingState\.project\?\.id\);[\s\S]*?const projectPreflightSummary = describeWritingProjectPreflight/);

  assert.ok(match, "expected writing workspace project-entry block to exist");
  assert.match(match[0], /const hasProject = Boolean\(writingState\.project\?\.id\);/);
  assert.match(match[0], /const projectPreflightSummary = describeWritingProjectPreflight/);
});

test("writing panel defines canContinueProjectedStrongModel before strong-model button wiring uses it", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/const strongModelReady =[\s\S]*?const strongModelState = describeWritingStrongModelStatus/);

  assert.ok(match, "expected writing panel strong-model block to exist");
  assert.match(
    match[0],
    /const canContinueProjectedStrongModel =\s*!hasProject && Boolean\(projectEntry\?\.projectId\) && Boolean\(projectEntry\?\.actionLabel\) && (?:basketReadiness|readiness)\.level === "strong_model_ready";/
  );
});

test("renderAll repaints explorer before writing panel side-effects can interrupt the tree", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/function renderAll\(\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected renderAll() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(state\.module === "explorer" \|\| state\.module === "graph"\) \{\s*explorer\.render\(\);\s*\}[\s\S]*renderWritingPanel\(\);/);
});

test("note persistence keeps generated-original and relation-network status fields in save paths", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");

  assert.match(source, /generatedOriginalNoteId: sourceNote\.generatedOriginalNoteId \|\| undefined/);
  assert.match(source, /generatedOriginalNoteId: note\.generatedOriginalNoteId \|\| undefined/);
  assert.match(source, /relationNetworkStatus: isPersistableRelationNetworkStatus\(note\.relationNetworkStatus\) \? note\.relationNetworkStatus : undefined/);
  assert.match(source, /const storedStatus = readStoredRelationNetworkStatus\(note\?\.id\);/);
});

test("workspace helper and note opening use folder-root note types for literature flows", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");

  assert.match(source, /const noteType = String\(\(activeNote\?\.folderId \? typeFromFolder\(state, activeNote\.folderId\) : ""\) \|\| activeNote\?\.noteType \|\| ""\)\.trim\(\);/);
  assert.match(source, /const keepFocus =\s*String\(\(note\?\.folderId \? typeFromFolder\(state, note\.folderId\) : ""\) \|\| note\?\.noteType \|\| ""\)\.trim\(\) === "literature"/);
});

test("writing scaffold preview defines project preflight summary before next-action rendering uses it", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/function renderWritingScaffoldPreview\(\) \{([\s\S]*?)\n\s*if \(!writingState\.scaffold\)/);

  assert.ok(match, "expected renderWritingScaffoldPreview() to exist");
  assert.match(match[1], /const projectPreflightSummary = describeWritingProjectPreflight\(writingState\.project\?\.preflight \|\| null\);/);
});

test("writing strong-model action uses a defined basket readiness helper", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");

  assert.match(source, /function currentWritingBasketReadiness\(\) \{/);
  assert.match(source, /\$\("btnWritingStrongModelAnalysis"\)\?\.addEventListener\("click", async \(\) => \{[\s\S]*const basketReadiness = currentWritingBasketReadiness\(\);/);
});

test("import-result create-writing-project path reuses unified writing entry reset", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/async function createWritingProjectFromImportedPermanentNotes\(\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected createWritingProjectFromImportedPermanentNotes() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /beginWritingEntry\(noteIds,\s*\{/);
  assert.doesNotMatch(fnBody, /resetWritingProjectContext\(/);
  assert.doesNotMatch(fnBody, /setWritingBasketIds\(noteIds\)/);
});

test("theme index append skips writing-entry reset when the basket already contains all theme notes", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/async function useThemeIndexAsWritingEntry\(indexCardId, \{ replaceBasket = false, resetContext = false, source = "writing_theme_index" \} = \{\}\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected useThemeIndexAsWritingEntry() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(entryPlan\.addedNoteIds\.length\) \{\s*continueWritingEntry\(/);
  assert.match(fnBody, /else \{\s*const nextSourceIndexIds = resolveWritingSourceIndexIds\(/);
  assert.doesNotMatch(fnBody, /else \{\s*continueWritingEntry\(/);
});

test("theme index replace path also reuses unified writing-entry reset", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/async function useThemeIndexAsWritingEntry\(indexCardId, \{ replaceBasket = false, resetContext = false, source = "writing_theme_index" \} = \{\}\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected useThemeIndexAsWritingEntry() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /else if \(replaceBasket\) \{\s*continueWritingEntry\(noteIds,/);
  assert.match(fnBody, /preserveSourceIndexIds: false/);
  assert.doesNotMatch(fnBody, /else if \(replaceBasket\) \{\s*resetWritingStrongModelState\(\)/);
  assert.doesNotMatch(fnBody, /else if \(replaceBasket\) \{[\s\S]*resetWritingProjectContext\(/);
});

test("continueWritingEntry preserves the current selected theme when merged provenance still contains it", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/function continueWritingEntry\(noteIds = \[\], \{ title = "", source = "writing_center", sourceIndexIds = \[\], preserveSourceIndexIds = true \} = \{\}\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected continueWritingEntry() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /setSelectedWritingThemeIndex\(\s*resolveWritingSelectedThemeIndexId\(\s*\{\s*currentSelectedThemeIndexId: writingState\.selectedThemeIndexId,/);
  assert.doesNotMatch(fnBody, /setSelectedWritingThemeIndex\(nextSourceIndexIds\.length === 1 \? nextSourceIndexIds\[0\] : ""\)/);
});

test("theme index selection preserves hydrated theme context when switching between identical note sets", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/async function selectWritingThemeIndex\(indexId\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected selectWritingThemeIndex() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const preservingExistingThemeContext =\s*sameUniqueStringSet\(noteIds, writingState\.themeNoteDetailIds\)\s*&&\s*sameUniqueStringSet\(noteIds, writingState\.themeRelationNoteIds\)/);
  assert.match(fnBody, /if \(!preservingExistingThemeContext\) clearWritingThemeRelationCounts\(noteIds\)/);
});

test("theme index cards reuse continuity actions when a matching project already exists", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const match = source.match(/function renderWritingThemeIndexCard\(indexCard\) \{([\s\S]*?)\n\}/);

  assert.ok(match, "expected renderWritingThemeIndexCard() to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const existingProject = findExistingWritingProjectForTheme\(indexCard, noteIds\)/);
  assert.match(fnBody, /const themeContinuation = describeWritingContinuationAction\(\{/);
  assert.match(fnBody, /data-writing-index-action="\$\{escapeHtml\(themeContinuation\?\.action \|\| "resume-project"\)\}"/);
  assert.match(fnBody, /\$\{escapeHtml\(themeContinuation\?\.actionLabel \|\| "继续当前项目"\)\}/);
});

test("theme index list click handler routes continuity actions through continueWritingProjectEntry", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
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
