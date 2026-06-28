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
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import {
  graphAssociateNoteRoute,
  graphFollowupActionRoute,
  noteDeleteKeyRoute,
  noteBrowserStateChangeRoute
} from "../../apps/web/src/note-browser-action-router.js";
import {
  isPersistableRelationNetworkStatus,
  notePersistenceFieldsForSave,
  relationNetworkStatusForNotePolicy,
  resolveFolderRootNoteType
} from "../../apps/web/src/note-persistence-policy.js";
import {
  describeWritingProjectPreflight,
  describeWritingStrongModelStatus,
  planWritingThemeIndexEntry,
  resolveWritingSelectedThemeIndexId,
  resolveWritingSourceIndexIds,
  shouldPreserveWritingThemeContext,
  writingScaffoldButtonState,
  writingThemeIndexContinuationRoute
} from "../../apps/web/src/writing-center-flow.js";
import {
  renderAppShell
} from "../../apps/web/src/app-shell-render-all.js";
import {
  renderSidebarTitleForRuntime
} from "../../apps/web/src/app-shell-sidebar-controller.js";
import {
  handleCreateDirectoryFromDialog
} from "../../apps/web/src/app-shell-state-file-actions.js";
import {
  syncModuleChromeClassesForRuntime
} from "../../apps/web/src/app-shell-module-ui.js";
import {
  buildWritingPanelState
} from "../../apps/web/src/prototype-writing-workspace.js";
import { readEditorDomainSource } from "./copy-source-helpers.mjs";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function createStubButton() {
  return {
    classList: { add() {}, remove() {}, toggle() {} },
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
    label: "",
    title: "新建文献笔记",
    ariaLabel: "在当前文献目录新建文献笔记",
    kindLabel: "",
    entryKind: "literature",
    mobileLabel: ""
  });
});

test("note boxes use one unified create-note action style", () => {
  const state = createInitialState();
  const classes = new Set();
  const labelNode = { textContent: "stale" };
  const metaNode = { textContent: "stale" };
  const newNoteButton = {
    classList: {
      add(token) { classes.add(token); },
      remove(token) { classes.delete(token); },
      toggle(token, force) {
        if (force === false) classes.delete(token);
        else classes.add(token);
      }
    },
    dataset: {},
    title: "",
    setAttribute(name, value) {
      this[name] = value;
    },
    querySelector(selector) {
      if (selector === ".new-note-action-label") return labelNode;
      if (selector === ".new-note-action-meta") return metaNode;
      return null;
    },
    addEventListener() {}
  };
  const explorer = new ExplorerPane({
    state,
    elements: {
      ...createStubElements(),
      newNoteBtn: newNoteButton
    },
    contextMenu: { show() {} },
    createBoxDialog: { setOptions() {}, open() {} },
    onOpenNote() {},
    onStatus() {},
    onStateChange() {}
  });

  state.browserRootId = "dir_fleeting_default";
  state.selectedFolderId = "dir_fleeting_default";
  explorer.syncNewNoteButton();

  assert.equal(classes.has("is-source-note-entry"), false);
  assert.equal(newNoteButton.dataset.noteEntryKind, "fleeting");
  assert.equal(newNoteButton.title, "新建随笔");
  assert.equal(labelNode.textContent, "");
  assert.equal(metaNode.textContent, "");
});

test("sidebar controller syncs the unified create action style in explorer mode", () => {
  const calls = [];
  const elements = {
    sidebarTitle: { textContent: "" },
    sidebarPrimaryActions: { classList: { remove: (name) => calls.push(["primary-remove", name]), add() {} } },
    filter: { classList: { toggle: (name, force) => calls.push(["filter-toggle", name, force]), add() {} } },
    moduleSidebar: { innerHTML: "", classList: { remove: (name) => calls.push(["module-remove", name]) } },
    sidebarFlow: { innerHTML: "", classList: { add: (name) => calls.push(["flow-add", name]) } },
    listArea: { classList: { remove: (name) => calls.push(["list-remove", name]), add() {} } },
    searchToggle: { classList: { toggle() {} } },
    sidebarSubtitle: { textContent: "", classList: { add: (name) => calls.push(["subtitle-add", name]) } },
    sidebarFoot: { textContent: "", classList: { add: (name) => calls.push(["foot-add", name]) } },
    explorerActions: { innerHTML: "", classList: { add: (name) => calls.push(["explorer-add", name]) } }
  };
  const quickEntry = {
    dataset: { action: "quick-fleeting" },
    classList: { toggle: (name, force) => calls.push(["quick-toggle", name, force]) }
  };

  renderSidebarTitleForRuntime({
    state: { module: "explorer", browserRootId: "dir_fleeting_default" },
    root: { name: "Fleeting" },
    elements,
    documentRef: { querySelectorAll: () => [quickEntry] },
    displayFolderName: (folder) => folder.name,
    syncNewNoteButtons: () => calls.push("sync-new-note-buttons")
  });

  assert.equal(elements.sidebarTitle.textContent, "Fleeting");
  assert.ok(calls.includes("sync-new-note-buttons"));
  assert.deepEqual(calls.find((call) => Array.isArray(call) && call[0] === "quick-toggle"), ["quick-toggle", "current-root", true]);
});

test("note browser new action falls back to current root when selection is stale", () => {
  const state = createInitialState();

  state.browserRootId = "dir_fleeting_default";
  state.selectedFolderId = "dir_original_default";

  assert.equal(resolveExplorerNewNoteFolderId(state), "dir_fleeting_default");
  assert.deepEqual(explorerNewNoteButtonCopy(state), {
    label: "",
    title: "新建随笔",
    ariaLabel: "在当前随笔目录新建随笔",
    kindLabel: "",
    entryKind: "fleeting",
    mobileLabel: ""
  });
});

test("note browser new action names permanent notes without legacy original copy", () => {
  const state = createInitialState();

  state.browserRootId = "dir_original_default";
  state.selectedFolderId = "dir_original_default";

  assert.equal(resolveExplorerNewNoteFolderId(state), "dir_original_default");
  assert.deepEqual(explorerNewNoteButtonCopy(state), {
    label: "",
    title: "新建永久笔记",
    ariaLabel: "在当前永久笔记目录新建笔记",
    kindLabel: "",
    entryKind: "permanent",
    mobileLabel: ""
  });
});

test("editor toolbar does not render the file attachment button", () => {
  const html = readRepoFile("apps/web/src/prototype.html");

  assert.doesNotMatch(html, /id="btnInsertFile"/);
  assert.doesNotMatch(html, /插入文件附件/);
});

test("editor toolbar exposes heading levels as a visible select", () => {
  const html = readRepoFile("apps/web/src/prototype.html");
  const css = readRepoFile("apps/web/src/prototype.css");
  const headingMarkup = html.match(/<div class="toolbar-segment heading-segment"[\s\S]*?<\/div>/)?.[0] || "";

  assert.match(headingMarkup, /id="headingLevelSelect"/);
  assert.doesNotMatch(headingMarkup, /<svg\b/);
  assert.match(headingMarkup, /<option value="p">正文<\/option>/);
  for (const level of [1, 2, 3, 4, 5, 6]) {
    assert.match(headingMarkup, new RegExp(`<option value="${level}">H${level}<\\/option>`));
  }
  assert.match(
    css,
    /#editorWorkspace \.editor-stage-shell \.heading-level-select[\s\S]*opacity: 1 !important;/
  );
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

test("graph note tree context menus only expose graph actions", () => {
  const source = readRepoFile("apps/web/src/components-explorer-pane.js");
  const menuStart = source.indexOf('      const graphContext = this.state.module === "graph";');
  const menuEnd = source.indexOf("  isDescendantFolder(", menuStart);

  assert.ok(menuStart >= 0 && menuEnd > menuStart, "expected graph context menu branch to exist");
  const menuSource = source.slice(menuStart, menuEnd);
  const graphFolderActions = menuSource.match(/actions: graphContext\s*\?\s*\[([\s\S]*?)\]\s*:\s*\[/)?.[1] || "";
  const graphFileActions = menuSource.match(/if \(kind === "file"\)[\s\S]*?actions: graphContext\s*\?\s*\[([\s\S]*?)\]\s*:\s*\[/)?.[1] || "";

  assert.match(graphFolderActions, /label: "查看此范围"/);
  assert.match(graphFolderActions, /label: "刷新图谱"/);
  assert.doesNotMatch(graphFolderActions, /重命名|新建|删除|显示|保存位置|隐藏/);

  assert.match(graphFileActions, /label: "查看笔记"/);
  assert.match(graphFileActions, /label: "关联笔记"/);
  assert.doesNotMatch(graphFileActions, /重命名|移动到|删除|Markdown|创建永久笔记/);
});

test("graph note tree context menu actions route to graph handlers", () => {
  const explorerSource = readRepoFile("apps/web/src/components-explorer-pane.js");

  assert.match(explorerSource, /if \(action === "refresh-graph"\) \{[\s\S]*this\.onStateChange\("refresh-graph"\);[\s\S]*return;/);
  assert.match(explorerSource, /if \(action === "associate-note"\) \{[\s\S]*this\.onStateChange\("open-note-relations", \{ noteId: n\.id, source: "graph-context-menu" \}\);[\s\S]*return;/);
  assert.match(explorerSource, /if \(this\.state\.module === "graph"\) \{[\s\S]*this\.onStateChange\("graph-focus-note", \{ noteId: n\.id \}\);/);
  assert.equal(noteBrowserStateChangeRoute("refresh-graph").kind, "refresh-graph");
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

test("dragging a note onto a folder expands the target folder", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.folders.push({ id: "dir_drag_target", name: "Drag Target", parentId: "dir_original_default", hidden: false });
  state.notes.push({ id: "perm_drag_source", title: "Drag Source", folderId: "dir_original_default", noteType: "permanent" });
  explorer.expandedFolders.delete("dir_drag_target");

  const result = explorer.movePayloadToFolder({ kind: "file", id: "perm_drag_source" }, "dir_drag_target");

  assert.deepEqual(result, { ok: true, kind: "file", id: "perm_drag_source", targetFolderId: "dir_drag_target" });
  assert.equal(explorer.expandedFolders.has("dir_drag_target"), true);
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
  const route = noteBrowserStateChangeRoute("save-note");

  assert.equal(route.kind, "save-note");
  assert.equal(route.syncExplorerBeforeRender, true);
  assert.equal(route.renderAfterSync, true);
});

test("new directory creation expands and selects the created folder in the explorer", async () => {
  const state = {
    folders: [{ id: "parent", fsPath: "/vault/Parent" }],
    selectedFolderId: "",
    selectedFileId: "note-1",
    browserRootId: "old-root"
  };
  const calls = [];

  const folder = await handleCreateDirectoryFromDialog({ name: "Child", parentId: "parent", maxCards: 12 }, {
    state,
    folderById: (_state, id) => state.folders.find((item) => item.id === id),
    joinFsPath: (base, name) => `${base}/${name}`,
    createDirectory: async (payload) => {
      calls.push(["create", payload]);
      return { id: "child", fsPath: payload.fsPath, title: payload.title };
    },
    mapDirectoryItem: (item) => ({ id: item.id, fsPath: item.fsPath, name: item.title }),
    rootBoxIdFromFolder: (_state, id) => `root:${id}`,
    explorer: { expandFolderPath: (id) => calls.push(["expand", id]) },
    dialog: { hide: () => calls.push("hide") },
    setStatus: (message, tone) => calls.push(["status", tone, message]),
    renderAll: () => calls.push("render")
  });

  assert.equal(folder.id, "child");
  assert.equal(state.selectedFolderId, "child");
  assert.equal(state.selectedFileId, null);
  assert.equal(state.browserRootId, "root:child");
  assert.deepEqual(calls[0], ["create", {
    title: "Child",
    parentDirectoryId: "parent",
    directoryType: "custom",
    fsPath: "/vault/Parent/Child",
    maxNotes: 12
  }]);
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === "expand" && call[1] === "child"));
  assert.ok(calls.includes("hide"));
  assert.ok(calls.includes("render"));
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

test("relation edits sync relation-network badges immediately for both source and target notes", () => {
  const pane = Object.create(EditorPane.prototype);
  pane.state = {
    graphConnectedNoteIds: new Set(),
    notes: [
      { id: "source", noteType: "permanent", relationNetworkStatus: "isolated" },
      { id: "target", noteType: "permanent", relationNetworkStatus: "isolated" }
    ]
  };

  pane.syncRelationNetworkConnected("source", "target");

  assert.equal(pane.state.graphConnectedNoteIds.has("source"), true);
  assert.equal(pane.state.graphConnectedNoteIds.has("target"), true);
  assert.equal(pane.state.notes.find((note) => note.id === "source").relationNetworkStatus, "connected");
  assert.equal(pane.state.notes.find((note) => note.id === "target").relationNetworkStatus, "connected");
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

test("note browser suppresses disconnected warnings for draft permanent notes", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.graphConnectedNoteIds = new Set();
  state.graphConnectivityReady = true;

  const draftPermanent = { id: "pn_draft", title: "draft-note", noteType: "permanent", status: "draft" };

  assert.equal(explorer.noteIsDisconnected(draftPermanent), false);
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

test("permanent note browser keeps isolated notes inline with direct relation actions", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.folders.push(
    { id: "dir_queue_a", name: "Queue A", parentId: "dir_original_default", hidden: false },
    { id: "dir_queue_b", name: "Queue B", parentId: "dir_original_default", hidden: false }
  );
  state.notes.push(
    { id: "perm_queue_connected", title: "Connected queue note", folderId: "dir_queue_a", noteType: "permanent" },
    { id: "perm_queue_iso_a", title: "Queue isolated A", folderId: "dir_queue_a", noteType: "permanent" },
    { id: "perm_queue_iso_b", title: "Queue isolated B", folderId: "dir_queue_b", noteType: "permanent" }
  );
  state.browserRootId = "dir_original_default";
  state.graphConnectedNoteIds = new Set(["pn_001", "pn_002", "perm_queue_connected"]);
  state.graphConnectivityReady = true;
  explorer.expandedFolders.add("dir_queue_a");
  explorer.expandedFolders.add("dir_queue_b");

  explorer.render();
  const html = explorer.els.listArea.innerHTML;

  assert.doesNotMatch(html, /tree-disconnected-queue/);
  assert.match(html, /data-associate-note="perm_queue_iso_a"/);
  assert.match(html, /data-associate-note="perm_queue_iso_b"/);
  assert.doesNotMatch(html, /data-associate-note="perm_queue_connected"/);
  assert.match(html, /data-id="perm_queue_iso_a"/);
  assert.match(html, /data-id="perm_queue_iso_b"/);
  assert.match(html, /data-note-state="permanent-isolated"/);
});

test("graph note browser keeps isolated permanent notes inline with direct relation actions", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.module = "graph";
  state.browserRootId = "dir_original_default";
  state.folders.push({ id: "dir_graph_group", name: "Graph Group", parentId: "dir_original_default", hidden: false });
  state.notes.push(
    { id: "perm_graph_connected", title: "Graph Connected", folderId: "dir_graph_group", noteType: "permanent" },
    { id: "perm_graph_isolated", title: "Graph Isolated", folderId: "dir_graph_group", noteType: "permanent" }
  );
  state.graphConnectedNoteIds = new Set(["pn_001", "pn_002", "perm_graph_connected"]);
  state.graphConnectivityReady = true;
  explorer.expandedFolders.add("dir_graph_group");

  explorer.render();
  const html = explorer.els.listArea.innerHTML;
  const connectedIndex = html.indexOf("perm_graph_connected");
  const isolatedIndex = html.indexOf("perm_graph_isolated");

  assert.ok(connectedIndex >= 0, "expected connected note row to render");
  assert.ok(isolatedIndex >= 0, "expected isolated note row to render");
  assert.ok(connectedIndex < isolatedIndex, "expected graph browser to keep directory note order");
  assert.doesNotMatch(html, /data-toggle-disconnected-group/);
  assert.doesNotMatch(html, /tree-group-label/);
  assert.match(html, /is-disconnected[\s\S]*data-id="perm_graph_isolated"/);
  assert.match(html, /data-note-state="permanent-isolated"/);
  assert.match(html, /data-associate-note="perm_graph_isolated"/);
  assert.match(html, /关联/);
  assert.doesNotMatch(html, /未入星系|接入网络|建立关系/);
});

test("graph note browser uses the same pending-relation style as permanent note boxes", () => {
  const html = readRepoFile("apps", "web", "src", "prototype.html");
  const css = readRepoFile("apps", "web", "src", "prototype.css");
  const sidebarSource = readRepoFile("apps", "web", "src", "app-shell-sidebar-controller.js");
  const appIndex = html.indexOf('<div class="app">');
  const listAreaIndex = html.indexOf('id="listArea"', appIndex);
  const moduleWorkspaceIndex = html.indexOf('id="moduleWorkspace"', appIndex);
  const toggles = [];
  const element = (name) => ({
    classList: {
      toggle: (className, force) => toggles.push([name, className, force])
    }
  });

  assert.ok(appIndex >= 0, "expected sidebar and module workspace to share the app wrapper");
  assert.ok(listAreaIndex > appIndex, "expected note browser list to live inside the app wrapper");
  assert.ok(moduleWorkspaceIndex > listAreaIndex, "expected module workspace to be a sibling after the sidebar list");
  assert.doesNotMatch(css, /#moduleWorkspace\.graph-mode \.file-row\.is-disconnected/);
  assert.match(css, /\.app\.graph-mode #listArea \.file-row\.is-disconnected \{/);
  assert.match(css, /\.file-row\.is-disconnected \{[\s\S]*rgba\(217, 119, 6, 0\.38\)/);
  assert.match(css, /\.app\.graph-mode #listArea \.file-row\.is-disconnected \{[\s\S]*rgba\(217, 119, 6, 0\.38\)/);
  assert.match(css, /\.app\.graph-mode #listArea \.file-row\.is-disconnected \{[\s\S]*rgba\(245, 158, 11, 0\.18\)/);
  assert.match(css, /\.app\.graph-mode #listArea \.file-row\.is-disconnected \.item-badge-warning \{[\s\S]*#92400e/);
  assert.match(css, /\.app\.graph-mode #listArea \.file-row\.is-disconnected \.item-inline-action\.warn \{[\s\S]*#0f8a7d/);
  assert.match(css, /\.app\.graph-mode #listArea \.file-row\.is-disconnected\.active \{[\s\S]*rgba\(20, 184, 166, 0\.58\)/);
  syncModuleChromeClassesForRuntime({
    module: "graph",
    moduleWorkspace: element("module"),
    appShell: element("app")
  });
  assert.ok(toggles.some((call) => call[0] === "app" && call[1] === "graph-mode" && call[2] === true));
  assert.ok(toggles.some((call) => call[0] === "module" && call[1] === "graph-mode" && call[2] === true));
  assert.match(sidebarSource, /待关联笔记会使用和永久笔记盒一致的提示样式/);
});

test("graph browser keeps folder selection ahead of current editor note highlight", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.module = "graph";
  state.browserRootId = "dir_original_default";
  state.selectedFolderId = "dir_original_method";
  state.selectedFileId = null;
  state.tabs = [{ id: "tab-current", noteId: "pn_001" }];
  state.activeTabId = "tab-current";

  assert.equal(
    explorer.preferredVisibleRowSelector(),
    '.explorer-item[data-kind="folder"][data-id="dir_original_method"]'
  );
  const currentNoteRow = explorer.renderFileNode(state.notes.find((note) => note.id === "pn_001"), 1);
  assert.doesNotMatch(currentNoteRow, /is-current-note/);
  assert.doesNotMatch(currentNoteRow, /item-badge-current/);
});

test("graph folder selection does not expand back to the current editor note path", () => {
  const graphRoute = noteBrowserStateChangeRoute("select-folder", {}, { module: "graph" });
  const explorerRoute = noteBrowserStateChangeRoute("select-folder", {}, { module: "explorer" });

  assert.equal(graphRoute.refreshGraph, true);
  assert.equal(graphRoute.expandCurrentEditorNotePath, false);
  assert.equal(explorerRoute.refreshGraph, false);
  assert.equal(explorerRoute.expandCurrentEditorNotePath, true);
});

test("note browser action buttons stop row click fallthrough", () => {
  const source = readRepoFile("apps/web/src/components-explorer-pane.js");
  const clickBody = source.match(/this\.els\.listArea\.addEventListener\("click", \(e\) => \{([\s\S]*?)\n\s*\}\);/)?.[1] || "";

  assert.match(clickBody, /const relationButton = e\.target\.closest\("button\[data-associate-note\]"\);[\s\S]*e\.preventDefault\(\);[\s\S]*e\.stopPropagation\(\);/);
  assert.match(clickBody, /if \(this\.state\.module === "graph"\) this\.onStateChange\("graph-associate-note", \{ noteId, source: "graph-sidebar-associate" \}\);/);
  assert.match(clickBody, /else this\.onStateChange\("open-note-relations", \{ noteId, source: "explorer-browser" \}\);/);
  assert.match(clickBody, /const toggleBtn = e\.target\.closest\("button\[data-toggle-folder\]"\);[\s\S]*e\.preventDefault\(\);[\s\S]*e\.stopPropagation\(\);/);
});

test("graph associate actions open the in-graph relation workflow instead of only focusing the note", () => {
  const explorerSource = readRepoFile("apps/web/src/components-explorer-pane.js");

  assert.match(explorerSource, /this\.onStateChange\("graph-associate-note", \{ noteId, source: "graph-sidebar-associate" \}\);/);
  assert.match(explorerSource, /if \(this\.state\.module === "graph"\) this\.onStateChange\("graph-associate-note", \{ noteId: n\.id, source: "graph-context-menu" \}\);/);
  assert.equal(
    graphAssociateNoteRoute({ noteId: "pn_1", source: "graph-context-menu", module: "graph", needsRelationWorkflow: false }).kind,
    "graph-open-relation-form"
  );
  assert.equal(
    graphAssociateNoteRoute({ noteId: "pn_1", source: "graph-sidebar-associate", module: "graph", needsRelationWorkflow: true }).kind,
    "graph-open-isolated-workflow"
  );
});

test("selected note delete key reuses the note delete flow", () => {
  const selectedRoute = noteDeleteKeyRoute({ module: "explorer", selectedFileId: "pn_selected", activeTabNoteId: "pn_tab" });
  const tabRoute = noteDeleteKeyRoute({ module: "explorer", selectedFileId: "", activeTabNoteId: "pn_tab" });
  const ignoredRoute = noteDeleteKeyRoute({ module: "graph", selectedFileId: "pn_selected" });

  assert.deepEqual(selectedRoute, { kind: "delete-note", handled: true, noteId: "pn_selected" });
  assert.deepEqual(tabRoute, { kind: "delete-note", handled: true, noteId: "pn_tab" });
  assert.equal(ignoredRoute.handled, false);
});

test("note delete updates client state even when using local fallback data", () => {
  const route = noteBrowserStateChangeRoute("note-delete");

  assert.equal(route.kind, "note-delete");
  assert.equal(route.remoteWhenAvailable, true);
  assert.equal(route.updateClientState, true);
});

test("dragged note move updates client state when using local fallback data", () => {
  const route = noteBrowserStateChangeRoute("note-move");

  assert.equal(route.kind, "note-move");
  assert.equal(route.remoteWhenAvailable, true);
  assert.equal(route.updateClientState, true);
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
  assert.equal(isPersistableRelationNetworkStatus("connected"), true);
  assert.equal(isPersistableRelationNetworkStatus("isolated"), true);
  assert.equal(isPersistableRelationNetworkStatus("unknown"), false);
  assert.equal(notePersistenceFieldsForSave({ generatedOriginalNoteId: "pn_1", relationNetworkStatus: "connected" }).relationNetworkStatus, "connected");
  assert.equal(notePersistenceFieldsForSave({ generatedOriginalNoteId: "pn_1", relationNetworkStatus: "unknown" }).relationNetworkStatus, undefined);
});

test("graph-ready relation sync does not let stale unknown statuses override recomputed connectivity", () => {
  const connectedIds = new Set(["pn_connected"]);

  assert.equal(
    relationNetworkStatusForNotePolicy({
      note: { id: "pn_connected", relationNetworkStatus: "unknown" },
      noteType: "permanent",
      connectedIds,
      connectivityReady: true,
      storedStatus: "unknown"
    }),
    "connected"
  );
  assert.equal(
    relationNetworkStatusForNotePolicy({
      note: { id: "pn_isolated", relation_network_status: "unknown" },
      noteType: "permanent",
      connectedIds,
      connectivityReady: true,
      storedStatus: "unknown"
    }),
    "isolated"
  );
});

test("thinking status keeps derived next-step copy out of the bottom notice", async () => {
  const source = await readEditorDomainSource();
  const match = source.match(/renderThinkingStatus\(\) \{([\s\S]*?)\n  \},?\n\n  renderAuthorshipPanel/);

  assert.ok(match, "expected thinking-status renderer to exist");
  assert.match(match[1], /lastBottomNoticeKey/);
  assert.match(match[1], /startsWith\("thinking:"\)/);
  assert.match(match[1], /hideBottomNotice\(\)/);
  assert.match(match[1], /thinking-status-chip/);
  assert.match(match[1], /thinking-status-next/);
  assert.doesNotMatch(match[1], /showBottomNotice\(/);
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
  assert.match(html, /data-note-state="permanent-isolated"/);
  assert.match(html, /data-associate-note="perm_disconnected"/);
});

test("permanent note browser surfaces isolated notes with direct relation action", () => {
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
  assert.match(html, /data-associate-note="pn_001"/);
  assert.match(html, /item-inline-action warn/);
  assert.match(html, /关联/);
  assert.doesNotMatch(html, /未入关系网/);
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
  assert.match(pendingHtml, />待转永久</);
  assert.doesNotMatch(pendingHtml, /data-note-state="permanent-isolated"/);
  assert.match(doneHtml, /data-note-state=""/);
  assert.doesNotMatch(doneHtml, />待转永久</);
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

test("source-note browser suppresses pending badges for draft placeholders", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  const draftFleetingHtml = explorer.renderFileNode({
    id: "fn_placeholder",
    title: "\u672a\u547d\u540d\u7b14\u8bb0",
    folderId: "dir_fleeting_default",
    noteType: "fleeting",
    status: "draft"
  }, 0);

  assert.match(draftFleetingHtml, /data-source-kind="fleeting"/);
  assert.match(draftFleetingHtml, /data-note-state=""/);
  assert.doesNotMatch(draftFleetingHtml, /source-pending/);
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

test("source-note folders ignore untitled draft placeholders when deciding pending state", () => {
  const state = createInitialState();
  const explorer = createExplorerForTest(state);

  state.notes.push({
    id: "fn_placeholder_folder_state",
    title: "\u672a\u547d\u540d\u7b14\u8bb0",
    folderId: "dir_fleeting_default",
    noteType: "fleeting",
    status: "draft"
  });

  const html = explorer.renderFolderNode(folderById(state, "dir_fleeting_default"), 0, "", new Map());

  assert.doesNotMatch(html, /has-folder-alert/);
  assert.doesNotMatch(html, /data-folder-state="source-pending"/);
});

test("source-note promote flows no longer ask users to type a directory id", () => {
  const explorerSource = readRepoFile("apps/web/src/components-explorer-pane.js");
  const editorSource = readRepoFile("apps/web/src/components-editor-pane.js");
  const html = readRepoFile("apps/web/src/prototype.html");

  assert.doesNotMatch(explorerSource, /选择永久笔记目录 ID/);
  assert.doesNotMatch(editorSource, /选择永久笔记目录 ID/);
  assert.match(html, /id="permanentNoteModal"/);
  assert.match(html, /选择保存位置，然后创建永久笔记/);
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
    thinkingStatus: { label: "待补推理", nextAction: "关联一条笔记", severity: "next", status: "open" }
  }, 0);

  assert.match(html, /item-badge-thinking/);
  assert.match(html, /data-associate-note="perm_custom"/);
  assert.match(html, /关联/);
  assert.doesNotMatch(html, /未入关系网/);
});

test("isolated permanent note detail prompts relations or a temporary independent reason", () => {
  const pane = Object.create(EditorPane.prototype);
  pane.currentExplicitRelationCount = () => 0;
  const html = pane.renderRelationNetworkPrompt({
    id: "pn_isolated",
    noteType: "permanent",
    title: "Isolated note",
    relationNetworkStatus: "isolated"
  });

  assert.match(html, /data-note-network-alert="isolated"/);
  assert.match(html, /Isolated note/);
  assert.match(html, /待关联笔记/);
  assert.match(html, /data-note-main-route-action="relations">关联一条笔记/);
  assert.match(html, /data-note-isolated-hold/);
  assert.match(html, /记录暂时独立/);
  assert.match(html, /暂时独立/);
});

test("graph isolated keep and hold actions focus boundary drafts instead of only opening notes", () => {
  assert.deepEqual(graphFollowupActionRoute("isolate-keep"), {
    kind: "boundary-draft",
    handled: true,
    action: "isolate-keep"
  });
  assert.deepEqual(graphFollowupActionRoute("isolate-hold"), {
    kind: "boundary-draft",
    handled: true,
    action: "isolate-hold"
  });
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

test("writing panel state resolves project presence before project-dependent hints", () => {
  let strongModelArgs = null;
  const panel = buildWritingPanelState({
    writingState: {
      project: {
        id: "project_1",
        preflight: { level: "has_gaps" }
      },
      relationCounts: {}
    },
    basketIds: ["n1"]
  }, {
    parseWritingBasketIds: () => ["n1"],
    writingRelationCountsReady: () => true,
    writingRelationCountsErrored: () => false,
    deriveBasketWritingReadiness: () => ({ level: "strong_model_ready", status: "Ready", hint: "Relations ready" }),
    describeWritingProjectEntryState: () => ({
      projectId: "stale_project",
      actionLabel: "Resume stale project",
      status: "Resume",
      hint: "Should not leak once project exists"
    }),
    describeWritingProjectPreflight: (preflight) => ({ level: preflight?.level || "ready", status: "Needs gaps", hint: "Fill gaps" }),
    isWritingStrongModelReady: ({ projectPreflightLevel }) => projectPreflightLevel === "ready",
    describeWritingStrongModelStatus: (args) => {
      strongModelArgs = args;
      return { status: "Strong model", hint: "Check project", buttonLabel: "Run" };
    },
    writingOpenDraftButtonState: () => ({ disabled: false, text: "Open" }),
    writingScaffoldButtonState: () => ({ disabled: false, text: "Scaffold" }),
    writingStrongModelButtonState: () => ({ disabled: true, text: "Blocked" })
  });

  assert.equal(panel.hasProject, true);
  assert.equal(panel.projectPreflightSummary.level, "has_gaps");
  assert.equal(strongModelArgs.hasProject, true);
  assert.equal(strongModelArgs.projectEntryProjectId, "");
  assert.equal(strongModelArgs.projectEntryActionLabel, "");
  assert.equal(strongModelArgs.projectPreflightLevel, "has_gaps");
});

test("writing panel keeps projected continuity out of strong-model button wiring", () => {
  const state = describeWritingStrongModelStatus({
    hasProject: true,
    relationCountsReady: true,
    readinessLevel: "strong_model_ready",
    projectPreflightLevel: "ready",
    strongModelReady: true
  });

  assert.ok(state.status);
  assert.ok(state.buttonLabel);
});

test("renderAll repaints explorer before writing panel side-effects can interrupt the tree", () => {
  const calls = [];
  renderAppShell({
    state: { module: "graph" },
    explorerRender: () => calls.push("explorer"),
    renderWritingPanel: () => calls.push("writing")
  });

  assert.deepEqual(calls, ["explorer", "writing"]);
});

test("note persistence keeps generated-original and relation-network status fields in save paths", () => {
  assert.deepEqual(notePersistenceFieldsForSave({ generatedOriginalNoteId: "pn_1", relationNetworkStatus: "isolated" }), {
    generatedOriginalNoteId: "pn_1",
    relationNetworkStatus: "isolated"
  });
  assert.deepEqual(notePersistenceFieldsForSave({ generatedOriginalNoteId: "", relationNetworkStatus: "unknown" }), {
    generatedOriginalNoteId: undefined,
    relationNetworkStatus: undefined
  });
});

test("workspace helper and note opening use folder-root note types for literature flows", () => {
  const typeFromFolder = (folderId) => folderId === "dir_literature_default" ? "literature" : "";

  assert.equal(resolveFolderRootNoteType({ folderId: "dir_literature_default", noteType: "permanent" }, { typeFromFolder }), "literature");
  assert.equal(resolveFolderRootNoteType({ folderId: "", noteType: "permanent" }, { typeFromFolder }), "permanent");
});

test("writing scaffold preview defines project preflight summary before next-action rendering uses it", () => {
  const preflight = describeWritingProjectPreflight({ status: "has_gaps", checks: [{ message: "Need evidence" }] });
  const button = writingScaffoldButtonState({
    hasProject: true,
    projectPreflightLevel: preflight.level
  });

  assert.equal(preflight.level, "has_gaps");
  assert.equal(button.disabled, true);
  assert.ok(button.text);
});

test("writing strong-model action uses a defined basket readiness helper", () => {
  const blocked = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    readinessLevel: "project_ready",
    projectPreflightLevel: "ready",
    strongModelReady: false
  });
  const ready = describeWritingStrongModelStatus({
    hasProject: true,
    relationCountsReady: true,
    readinessLevel: "strong_model_ready",
    projectPreflightLevel: "ready",
    strongModelReady: true
  });

  assert.ok(blocked.buttonLabel);
  assert.ok(ready.buttonLabel);
  assert.notEqual(blocked.buttonLabel, ready.buttonLabel);
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
  const plan = planWritingThemeIndexEntry({
    existingNoteIds: ["n1", "n2"],
    themeNoteIds: ["n1", "n2"],
    replaceBasket: false,
    resetContext: false
  });

  assert.equal(plan.action, "metadata-only");
  assert.deepEqual(plan.addedNoteIds, []);
  assert.equal(plan.preserveSourceIndexIds, true);
});

test("theme index replace path also reuses unified writing-entry reset", () => {
  const plan = planWritingThemeIndexEntry({
    existingNoteIds: ["n_old"],
    themeNoteIds: ["n1", "n2"],
    replaceBasket: true,
    resetContext: false
  });

  assert.equal(plan.action, "replace-entry");
  assert.equal(plan.preserveSourceIndexIds, false);
  assert.equal(plan.shouldResetContext, false);
});

test("continueWritingEntry preserves the current selected theme when merged provenance still contains it", () => {
  const sourceIndexIds = resolveWritingSourceIndexIds({
    existingSourceIndexIds: ["idx_existing"],
    incomingSourceIndexIds: ["idx_new"],
    preserveExisting: true
  });
  const selectedThemeIndexId = resolveWritingSelectedThemeIndexId({
    currentSelectedThemeIndexId: "idx_existing",
    nextSourceIndexIds: sourceIndexIds
  });

  assert.deepEqual(sourceIndexIds, ["idx_existing", "idx_new"]);
  assert.equal(selectedThemeIndexId, "idx_existing");
});

test("theme index selection preserves hydrated theme context when switching between identical note sets", () => {
  assert.equal(
    shouldPreserveWritingThemeContext({
      noteIds: ["n1", "n2"],
      loadedThemeNoteIds: ["n2", "n1"],
      relationThemeNoteIds: ["n1", "n2"]
    }),
    true
  );
  assert.equal(
    shouldPreserveWritingThemeContext({
      noteIds: ["n1", "n2"],
      loadedThemeNoteIds: ["n1"],
      relationThemeNoteIds: ["n1", "n2"]
    }),
    false
  );
});

test("theme index cards reuse continuity actions when a matching project already exists", () => {
  assert.equal(writingThemeIndexContinuationRoute({ action: "open-draft", projectId: "wp_1" }).kind, "continue-project");
  assert.equal(writingThemeIndexContinuationRoute({ action: "resume-scaffold", projectId: "wp_1" }).kind, "continue-project");
  assert.equal(writingThemeIndexContinuationRoute({ action: "resume-project", projectId: "wp_1" }).kind, "continue-project");
});

test("theme index list click handler routes continuity actions through continueWritingProjectEntry", () => {
  const openDraft = writingThemeIndexContinuationRoute({ action: "open-draft", projectId: "wp_1" });
  const resumeScaffold = writingThemeIndexContinuationRoute({ action: "resume-scaffold", projectId: "wp_1" });
  const missingProject = writingThemeIndexContinuationRoute({ action: "resume-project", projectId: "" });

  assert.equal(openDraft.kind, "continue-project");
  assert.equal(openDraft.openDraft, true);
  assert.equal(resumeScaffold.openDraft, false);
  assert.equal(missingProject.kind, "missing-project");
});
