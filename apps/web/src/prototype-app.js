import {
  childFolders,
  createInitialState,
  folderById,
  joinFsPath,
  notesInFolder,
  rootBoxIdFromFolder,
  typeFromFolder,
  uid
} from "./prototype-store.js";
import { ContextMenu } from "./components-context-menu.js";
import { CreateBoxDialog } from "./components-create-box-dialog.js";
import { ExplorerPane } from "./components-explorer-pane.js";
import { EditorPane } from "./components-editor-pane.js";
import { pickDirectoryPath } from "./path-picker-adapter.js";
import {
  cancelImport,
  confirmImport,
  createDirectory,
  createNote,
  deleteDirectory,
  deleteNote,
  fetchDirectories,
  fetchDirectoryNotes,
  fetchImportRecord,
  fetchNote,
  getApiBase,
  moveNote,
  previewImport,
  rollbackImport,
  updateDirectory,
  updateNote
} from "./prototype-api.js";

const $ = (id) => document.getElementById(id);
const state = createInitialState();
const importState = {
  importRecordId: "",
  lastPreview: null
};

function setStatus(text, cls = "") {
  $("statusText").className = cls;
  $("statusText").textContent = text;
}

function setImportRecordId(value) {
  importState.importRecordId = String(value || "").trim();
  const input = $("importRecordId");
  if (input) input.value = importState.importRecordId;
}

function showImportResult(payload) {
  const el = $("importResult");
  if (!el) return;
  if (typeof payload === "string") {
    el.textContent = payload;
    return;
  }
  el.textContent = JSON.stringify(payload || {}, null, 2);
}

function parseJsonOrEmpty(raw, label) {
  const text = String(raw || "").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON：${String(error?.message || error)}`);
  }
}

function buildImportPayload(connector) {
  const pathText = String($("importPath")?.value || "").trim();
  const payloadText = String($("importPayload")?.value || "").trim();
  if (payloadText) return parseJsonOrEmpty(payloadText, "Payload");
  if ((connector === "markdown" || connector === "obsidian") && !pathText) {
    throw new Error("markdown/obsidian 预览需要“导入路径”或 Payload JSON");
  }
  return pathText ? { path: pathText } : {};
}

async function refreshImportedNotesView() {
  try {
    await syncDirectoriesFromApi();
    await syncNotesForDirectory(state.selectedFolderId);
    renderAll();
  } catch {}
}

function mapDirectoryItem(item) {
  return {
    id: item.id,
    name: item.title,
    parentId: item.parentDirectoryId,
    isDefault: Boolean(item.isDefault),
    hidden: Boolean(item.isHidden),
    maxCards: Number(item.maxNotes || 500),
    fsPath: item.fsPath || ""
  };
}

function mapNoteItem(item) {
  return {
    id: item.id,
    title: item.title || "未命名笔记",
    folderId: item.directoryId,
    noteType: item.noteType || "original",
    body: item.body || `# ${item.title || "未命名笔记"}\n`,
    tags: [],
    links: [],
    bodyLoaded: Boolean(item.body),
    updatedAt: item.updatedAt || new Date().toISOString()
  };
}

function upsertNotesForDirectory(folderId, mappedNotes) {
  const keep = state.notes.filter((n) => n.folderId !== folderId);
  state.notes = [...mappedNotes, ...keep];
}

function replaceFirstMarkdownTitle(body, title) {
  const cleanTitle = String(title || "未命名笔记").trim() || "未命名笔记";
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
  if (!lines.length || !String(lines[0] || "").trim()) return `# ${cleanTitle}\n`;
  if (/^#{1,6}\s+/.test(lines[0])) {
    lines[0] = `# ${cleanTitle}`;
    return lines.join("\n");
  }
  lines[0] = `# ${cleanTitle}`;
  return lines.join("\n");
}

async function syncDirectoriesFromApi() {
  const items = await fetchDirectories(true);
  if (!items.length) return;
  state.folders = items.map(mapDirectoryItem);
  const selectedExists = state.folders.some((f) => f.id === state.selectedFolderId);
  if (!selectedExists) {
    state.selectedFolderId = state.browserRootId;
  }
}

async function syncNotesForDirectory(folderId) {
  if (!folderId) return;
  const items = await fetchDirectoryNotes(folderId);
  const mapped = items.map(mapNoteItem);
  upsertNotesForDirectory(folderId, mapped);
}

function ensureSelection() {
  const visible = state.folders.filter((f) => !f.hidden);
  const scoped = visible.filter((f) => rootBoxIdFromFolder(state, f.id) === state.browserRootId);
  const source = scoped.length ? scoped : visible;
  if (!folderById(state, state.selectedFolderId) || folderById(state, state.selectedFolderId)?.hidden) {
    state.selectedFolderId = source[0]?.id || state.browserRootId;
  }
  createBoxDialog.setOptions(source);
}

function renderSidebarTitle() {
  const root = folderById(state, state.browserRootId);
  $("sidebarTitle").textContent = root?.name || "目录";
  $("explorerActions").classList.remove("hidden");
  $("sidebarFoot").textContent = "目录=知识容器，文件=Markdown 笔记；支持拖拽移动。";
}

function renderAll() {
  ensureSelection();
  renderSidebarTitle();
  editor.renderTabs();
  explorer.render();
}

async function ensureNoteBodyLoaded(noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (!note || note.bodyLoaded) return;
  const expectedNoteBody = note.body;
  const expectedTab = state.tabs.find((t) => t.noteId === note.id);
  const expectedTabBody = expectedTab?.body;
  try {
    const full = await fetchNote(noteId);
    if (!full) return;
    const currentTab = state.tabs.find((t) => t.noteId === note.id);
    const hasLocalEditorChange = currentTab && currentTab.body !== expectedTabBody;
    const hasLocalNoteChange = note.body !== expectedNoteBody;
    if (hasLocalEditorChange || hasLocalNoteChange) {
      note.bodyLoaded = true;
      return;
    }
    note.body = full.body || note.body;
    note.title = full.title || note.title;
    note.updatedAt = full.updatedAt || note.updatedAt;
    note.bodyLoaded = true;
    const tab = state.tabs.find((t) => t.noteId === note.id);
    if (tab) {
      tab.body = note.body;
      tab.title = note.title;
      if (state.activeTabId === tab.id) editor.fillEditorFromTab();
    }
  } catch {}
}

function openNoteById(id) {
  state.selectedFileId = id;
  const note = state.notes.find((n) => n.id === id);
  if (note) {
    state.selectedFolderId = note.folderId;
    state.browserRootId = rootBoxIdFromFolder(state, note.folderId);
  }
  editor.openNoteTab(id);
  renderAll();
  ensureNoteBodyLoaded(id);
}

async function handleStateChange(reason, payload = {}) {
  if (reason === "create-note-in-selected-folder") {
    const folderId = state.selectedFolderId;
    try {
      const created = await createNote({
        directoryId: folderId,
        body: "# 未命名笔记\n"
      });
      if (!created) throw new Error("创建笔记失败");
      const note = mapNoteItem(created);
      state.notes.unshift(note);
      openNoteById(note.id);
      setStatus("已在当前目录创建 Markdown 文件（已落盘）", "ok");
    } catch (error) {
      const fallback = {
        id: uid("pn"),
        title: "未命名笔记",
        folderId,
        noteType: typeFromFolder(state, folderId),
        body: "# 未命名笔记\n",
        tags: [],
        links: [],
        updatedAt: new Date().toISOString()
      };
      state.notes.unshift(fallback);
      openNoteById(fallback.id);
      setStatus(`API 不可用，已降级本地创建：${String(error?.message || error)}`, "warn");
    }
    return;
  }

  if (reason === "select-folder") {
    try {
      await syncNotesForDirectory(state.selectedFolderId);
    } catch (error) {
      setStatus(`目录加载失败，保留本地数据：${String(error?.message || error)}`, "warn");
    }
    renderAll();
    return;
  }

  if (reason === "save-note") {
    const noteId = payload.noteId || state.tabs.find((t) => t.id === state.activeTabId)?.noteId || null;
    if (noteId) {
      const note = state.notes.find((n) => n.id === noteId);
      if (note && payload.title) {
        note.title = payload.title;
        note.body = replaceFirstMarkdownTitle(note.body, payload.title);
        const tab = state.tabs.find((t) => t.noteId === note.id);
        if (tab) {
          tab.title = note.title;
          tab.body = note.body;
          if (state.activeTabId === tab.id) editor.fillEditorFromTab();
        }
      }
      if (note) {
        try {
          const resolvedStatus = payload.originalityStatus === "pass" ? "active" : "draft";
          const updated = await updateNote(note.id, {
            title: note.title,
            body: note.body,
            status: resolvedStatus,
            originalityStatus: payload.originalityStatus,
            originalitySimilarity: payload.originalitySimilarity
          });
          if (updated) {
            note.title = updated.title || note.title;
            note.body = updated.body || note.body;
            note.updatedAt = updated.updatedAt || note.updatedAt;
            note.bodyLoaded = true;
          }
          setStatus("已保存 Markdown（已落盘）", "ok");
        } catch (error) {
          setStatus(`保存失败（仅本地暂存）：${String(error?.message || error)}`, "warn");
        }
      }
    }
    renderAll();
    return;
  }

  if (reason === "note-move") {
    try {
      const moved = await moveNote(payload.noteId, payload.directoryId);
      const note = state.notes.find((n) => n.id === payload.noteId);
      if (note && moved) {
        note.folderId = moved.directoryId || payload.directoryId;
        note.noteType = typeFromFolder(state, note.folderId);
        note.updatedAt = moved.updatedAt || new Date().toISOString();
      }
      state.selectedFolderId = payload.directoryId;
      setStatus("已移动笔记并落盘", "ok");
    } catch (error) {
      setStatus(`移动失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "note-delete") {
    try {
      await deleteNote(payload.noteId);
      state.notes = state.notes.filter((n) => n.id !== payload.noteId);
      state.tabs = state.tabs.filter((t) => t.noteId !== payload.noteId);
      if (state.activeTabId && !state.tabs.find((t) => t.id === state.activeTabId)) {
        state.activeTabId = state.tabs[0]?.id || null;
      }
      setStatus("已删除笔记并落盘", "ok");
    } catch (error) {
      setStatus(`删除失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "directory-update") {
    try {
      const updated = await updateDirectory(payload.directoryId, payload.patch || {});
      const folder = state.folders.find((f) => f.id === payload.directoryId);
      if (folder && updated) {
        folder.name = updated.title;
        folder.parentId = updated.parentDirectoryId;
        folder.hidden = Boolean(updated.isHidden);
        folder.maxCards = Number(updated.maxNotes || 500);
        folder.fsPath = updated.fsPath || folder.fsPath;
      }
      setStatus("目录已更新并落盘", "ok");
    } catch (error) {
      setStatus(`目录更新失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "directory-delete") {
    try {
      await deleteDirectory(payload.directoryId);
      state.folders = state.folders.filter((f) => f.id !== payload.directoryId);
      if (state.selectedFolderId === payload.directoryId) {
        state.selectedFolderId = state.browserRootId;
      }
      setStatus("目录已删除并落盘", "ok");
    } catch (error) {
      setStatus(`目录删除失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "directory-move") {
    try {
      const updated = await updateDirectory(payload.directoryId, { parentDirectoryId: payload.parentDirectoryId });
      const folder = state.folders.find((f) => f.id === payload.directoryId);
      if (folder && updated) {
        folder.parentId = updated.parentDirectoryId;
      }
      setStatus("目录层级已更新并落盘", "ok");
    } catch (error) {
      setStatus(`目录移动失败：${String(error?.message || error)}`, "bad");
    }
    renderAll();
    return;
  }

  if (reason === "switch-tab" || reason === "folder-context-action" || reason === "file-context-action" || reason === "list-context-action") {
    renderAll();
  }
}

const contextMenu = new ContextMenu($("contextMenu"));
const createBoxDialog = new CreateBoxDialog({
  maskEl: $("newBoxModal"),
  nameEl: $("modalBoxName"),
  parentEl: $("modalParentFolder"),
  fsPathEl: $("modalFsPath"),
  browseEl: $("modalBrowsePath"),
  maxEl: $("modalMaxCards"),
  cancelEl: $("modalCancel"),
  createEl: $("modalCreate"),
  onStatus: setStatus,
  pickDirectory: pickDirectoryPath
});

createBoxDialog.onCreate = async ({ name, parentId, fsPath, maxCards }) => {
  if (!name) return setStatus("请输入目录名称", "bad");
  const parentFolder = folderById(state, parentId);
  const resolvedPath = fsPath || joinFsPath(parentFolder?.fsPath || "", name);
  try {
    const created = await createDirectory({
      title: name,
      parentDirectoryId: parentId || null,
      directoryType: "custom",
      fsPath: resolvedPath,
      maxNotes: maxCards > 0 ? maxCards : 500
    });
    if (!created) throw new Error("创建目录失败");
    const folder = mapDirectoryItem(created);
    state.folders.push(folder);
    state.selectedFolderId = folder.id;
    state.browserRootId = rootBoxIdFromFolder(state, folder.id);
    createBoxDialog.hide();
    setStatus(`目录“${name}”已创建并落盘，路径：${resolvedPath}`, "ok");
    renderAll();
  } catch (error) {
    setStatus(`创建目录失败：${String(error?.message || error)}`, "bad");
  }
};

const explorer = new ExplorerPane({
  state,
  elements: {
    searchInput: $("searchInput"),
    openNewBoxBtn: $("btnOpenNewBoxDialog"),
    newNoteBtn: $("btnNewNote"),
    listArea: $("listArea")
  },
  contextMenu,
  createBoxDialog,
  onOpenNote: openNoteById,
  onStatus: setStatus,
  onStateChange: handleStateChange,
  pickDirectory: pickDirectoryPath
});

const editor = new EditorPane({
  state,
  elements: {
    tabs: $("tabs"),
    body: $("editorBody"),
    result: $("resultArea"),
    linkPicker: $("linkPicker"),
    linkSearchInput: $("linkSearchInput"),
    linkSearchList: $("linkSearchList"),
    closeLinkPicker: $("btnCloseLinkPicker"),
    insertLink: $("btnInsertLink"),
    insertTag: $("btnInsertTag"),
    showRelated: $("btnShowRelated"),
    runGuard: $("btnRunGuard"),
    save: $("btnSave")
  },
  onStatus: setStatus,
  onStateChange: handleStateChange,
  onOpenNote: openNoteById
});

document.querySelectorAll(".rail-btn[data-module]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".rail-btn[data-module]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.module = btn.dataset.module;
    renderAll();
  });
});

document.querySelectorAll("[data-action^='quick-']").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "quick-fleeting") {
      state.browserRootId = "dir_fleeting_default";
      state.selectedFolderId = "dir_fleeting_default";
    }
    if (action === "quick-literature") {
      state.browserRootId = "dir_literature_default";
      state.selectedFolderId = "dir_literature_default";
    }
    if (action === "quick-original") {
      state.browserRootId = "dir_original_default";
      state.selectedFolderId = "dir_original_default";
    }
    state.module = "explorer";
    state.selectedFileId = null;
    document.querySelectorAll(".rail-btn[data-module]").forEach((b) => b.classList.toggle("active", b.dataset.module === "explorer"));
    setStatus(`已切换到 ${folderById(state, state.browserRootId)?.name} 入口`, "ok");
    renderAll();
  });
});

document.querySelectorAll("[data-action='open-handoff']").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = `${window.location.origin}/prototype-handoff`;
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("已打开原型交付板", "ok");
  });
});

document.addEventListener("keydown", (e) => {
  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.isComposing) return;

  if (e.key === "F2") {
    if (state.selectedFileId) {
      explorer.handleContextAction("rename", { kind: "file", id: state.selectedFileId });
      renderAll();
      e.preventDefault();
      return;
    }
    if (state.selectedFolderId) {
      explorer.handleContextAction("rename", { kind: "folder", id: state.selectedFolderId });
      renderAll();
      e.preventDefault();
      return;
    }
  }

  if (e.ctrlKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
    if (idx >= 0 && state.tabs.length > 1) {
      const next = e.key === "ArrowLeft" ? (idx - 1 + state.tabs.length) % state.tabs.length : (idx + 1) % state.tabs.length;
      state.activeTabId = state.tabs[next].id;
      editor.fillEditorFromTab();
      renderAll();
      e.preventDefault();
    }
    return;
  }

  if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    if (e.key === "ArrowLeft") {
      const cur = folderById(state, state.selectedFolderId);
      if (cur?.parentId) {
        state.selectedFolderId = cur.parentId;
        setStatus("已定位到上级目录", "ok");
      } else {
        setStatus("当前已在顶层目录", "warn");
      }
    } else {
      const children = childFolders(state, state.selectedFolderId);
      if (children.length) {
        state.selectedFolderId = children[0].id;
        setStatus("已进入子目录", "ok");
      } else {
        const files = notesInFolder(state, state.selectedFolderId);
        if (files.length) {
          openNoteById(files[0].id);
          setStatus("已打开当前目录首个文件", "ok");
        } else {
          setStatus("当前目录无文件", "warn");
        }
      }
    }
    renderAll();
    e.preventDefault();
  }
});

async function bootstrap() {
  $("btnImportPreview")?.addEventListener("click", async () => {
    const connector = String($("importConnector")?.value || "markdown").trim();
    try {
      const payload = buildImportPayload(connector);
      const options = parseJsonOrEmpty($("importOptions")?.value, "Options");
      const preview = await previewImport({ connector, payload, options });
      importState.lastPreview = preview;
      setImportRecordId(preview.importRecordId);
      showImportResult({
        stage: "preview",
        importRecordId: preview.importRecordId,
        connector: preview.connector,
        status: preview.status,
        summary: preview.summary,
        warnings: preview.warnings,
        originalityGuard: preview.originalityGuard
      });
      setStatus(`导入预览完成：${preview.importRecordId}`, "ok");
    } catch (error) {
      showImportResult({
        stage: "preview_error",
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`导入预览失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnImportConfirm")?.addEventListener("click", async () => {
    const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    if (!importRecordId) return setStatus("请先预览或填写 ImportRecord ID", "warn");
    try {
      const result = await confirmImport(importRecordId);
      setImportRecordId(importRecordId);
      showImportResult({
        stage: "confirm",
        importRecordId,
        status: result.status,
        result: result.result,
        originalityGuard: result.originalityGuard
      });
      await refreshImportedNotesView();
      setStatus(`导入确认完成：${importRecordId}`, "ok");
    } catch (error) {
      showImportResult({
        stage: "confirm_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`导入确认失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnImportCancel")?.addEventListener("click", async () => {
    const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    if (!importRecordId) return setStatus("请先预览或填写 ImportRecord ID", "warn");
    try {
      const result = await cancelImport(importRecordId);
      setImportRecordId(importRecordId);
      showImportResult({
        stage: "cancel",
        importRecordId,
        status: result.status,
        message: result.message
      });
      setStatus(`已取消导入：${importRecordId}`, "ok");
    } catch (error) {
      showImportResult({
        stage: "cancel_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`取消导入失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnImportRefresh")?.addEventListener("click", async () => {
    const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    if (!importRecordId) return setStatus("请先填写 ImportRecord ID", "warn");
    try {
      const importRecord = await fetchImportRecord(importRecordId);
      setImportRecordId(importRecordId);
      showImportResult({
        stage: "record",
        importRecord
      });
      setStatus(`已读取导入记录：${importRecordId}`, "ok");
    } catch (error) {
      showImportResult({
        stage: "record_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null
      });
      setStatus(`读取导入记录失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("btnImportRollback")?.addEventListener("click", async () => {
    const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    if (!importRecordId) return setStatus("请先填写 ImportRecord ID", "warn");
    try {
      const result = await rollbackImport(importRecordId);
      setImportRecordId(importRecordId);
      showImportResult({
        stage: "rollback",
        importRecordId,
        status: result.status,
        result: result.result
      });
      await refreshImportedNotesView();
      setStatus(`回滚完成：${importRecordId}`, "ok");
    } catch (error) {
      showImportResult({
        stage: "rollback_error",
        importRecordId,
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`回滚失败：${String(error?.message || error)}`, "bad");
    }
  });

  try {
    await syncDirectoriesFromApi();
    await syncNotesForDirectory(state.selectedFolderId);
    setStatus(`已连接 API：${getApiBase()}`, "ok");
  } catch (error) {
    setStatus(`API 连接失败，使用本地原型数据：${String(error?.message || error)}`, "warn");
  }

  renderAll();
  const initialNoteId = new URLSearchParams(window.location.search).get("note") || state.notes[0]?.id || "pn_001";
  const initialNote = state.notes.find((n) => n.id === initialNoteId);
  if (initialNote) {
    state.browserRootId = rootBoxIdFromFolder(state, initialNote.folderId);
    state.selectedFolderId = initialNote.folderId;
    openNoteById(initialNoteId);
  }
}

bootstrap();
