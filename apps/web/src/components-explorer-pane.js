import { childFolders, folderById, notesInFolder, rootBoxIdFromFolder, typeFromFolder, typeLabel } from "./prototype-store.js";

function folderIconSvg(isRoot = false) {
  return `
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2.25 4.25h4.1l1.1 1.4h6.3v5.6a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5z" fill="${isRoot ? "#b78a1f" : "#c89b2b"}"/>
      <path d="M2.25 5.25h11.5a1 1 0 0 1 .98 1.2l-.83 4.02a1.5 1.5 0 0 1-1.47 1.2H3.57a1.5 1.5 0 0 1-1.47-1.2l-.83-4.02a1 1 0 0 1 .98-1.2z" fill="${isRoot ? "#d8b24c" : "#e3be62"}"/>
    </svg>
  `;
}

function fileIconSvg() {
  return `
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 1.75h5.1l2.9 2.9v8.1a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 3 12.75v-9.5A1.5 1.5 0 0 1 4.5 1.75z" fill="#d7dde6"/>
      <path d="M9.1 1.75v2.3a1 1 0 0 0 1 1h2.3" fill="#eef2f7"/>
      <path d="M5.25 7.25h5.5M5.25 9.5h5.5" stroke="#7c8796" stroke-width="1.1" stroke-linecap="round"/>
    </svg>
  `;
}

function noteTypeBadge(noteType = "") {
  if (noteType === "fleeting") return "随";
  if (noteType === "literature") return "文";
  return "原";
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generatedOriginalBadge(state, note = null) {
  const noteType = String(note?.noteType || "").trim().toLowerCase();
  const generatedId = String(note?.generatedOriginalNoteId || note?.generated_original_note_id || "").trim();
  if (!generatedId) return "";
  if (noteType !== "fleeting" && noteType !== "literature") return "";
  const originalNote = Array.isArray(state?.notes) ? state.notes.find((item) => item.id === generatedId) : null;
  const originalTitle = String(originalNote?.title || "").trim();
  const title = originalTitle ? `已关联原创笔记：${originalTitle}` : "已关联到一条原创笔记";
  return `<span class="item-badge item-badge-original-record" title="${escapeHtml(title)}">已生成原创</span>`;
}

function thinkingStatusBadge(note = null) {
  const thinkingStatus = note?.thinkingStatus && typeof note.thinkingStatus === "object" ? note.thinkingStatus : null;
  const label = String(thinkingStatus?.label || "").trim();
  if (!label) return "";
  const nextAction = String(thinkingStatus?.nextAction || "").trim();
  const severity = String(thinkingStatus?.severity || "").trim() || "next";
  const status = String(thinkingStatus?.status || "").trim();
  const title = nextAction ? `${label}：${nextAction}` : label;
  return `<span class="item-badge item-badge-thinking" data-severity="${escapeHtml(severity)}" data-status="${escapeHtml(status)}" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
}

function displayFolderName(folder) {
  if (!folder) return "目录";
  if (folder.id === "dir_original_default") return "原创卡片盒";
  if (folder.id === "dir_fleeting_default") return "随笔卡片盒";
  if (folder.id === "dir_literature_default") return "文献卡片盒";
  if (!folder.parentId && String(folder.name || "").trim() === "原创目录") return "原创卡片盒";
  return folder.name || "目录";
}

export function resolveExplorerNewNoteFolderId(state = {}) {
  const selectedFolderId = String(state.selectedFolderId || "").trim();
  const browserRootId = String(state.browserRootId || "").trim();
  const selectedFolder = folderById(state, selectedFolderId);
  const selectedRootId = selectedFolder ? rootBoxIdFromFolder(state, selectedFolder.id) : "";

  if (selectedFolder && selectedRootId === browserRootId) return selectedFolder.id;
  if (browserRootId && folderById(state, browserRootId)) return browserRootId;
  if (selectedFolder) return selectedFolder.id;
  return browserRootId || "dir_original_default";
}

export function explorerNewNoteButtonCopy(state = {}) {
  const folderId = resolveExplorerNewNoteFolderId(state);
  const noteType = typeFromFolder(state, folderId);
  if (noteType === "literature") {
    return { label: "新建文献", title: "新建文献笔记", ariaLabel: "在当前文献目录新建文献笔记" };
  }
  if (noteType === "fleeting") {
    return { label: "新建随笔", title: "新建随笔笔记", ariaLabel: "在当前随笔目录新建随笔笔记" };
  }
  return { label: "新建原创", title: "新建原创笔记", ariaLabel: "在当前原创目录新建原创笔记" };
}

export class ExplorerPane {
  constructor({
    state,
    elements,
    contextMenu,
    createBoxDialog,
    onOpenNote,
    onStatus,
    onStateChange,
    pickDirectory,
    desktopFile,
    resolveNotePath
  }) {
    this.state = state;
    this.els = elements;
    this.contextMenu = contextMenu;
    this.createBoxDialog = createBoxDialog;
    this.onOpenNote = onOpenNote;
    this.onStatus = onStatus;
    this.onStateChange = onStateChange;
    this.pickDirectory = pickDirectory;
    this.desktopFile = desktopFile || null;
    this.resolveNotePath = resolveNotePath || null;

    this.dragPayload = null;
    this.currentDropTargetId = null;
    this.expandedFolders = new Set(
      this.state.folders.filter((f) => !f.hidden && f.parentId === null).map((f) => f.id)
    );

    this.bind();
  }

  syncNewNoteButton() {
    const button = this.els.newNoteBtn;
    if (!button) return;
    const copy = explorerNewNoteButtonCopy(this.state);
    button.title = copy.title;
    button.dataset.tip = copy.title;
    button.setAttribute("aria-label", copy.ariaLabel);
    const label = button.querySelector(".new-note-action-label");
    if (label) label.textContent = copy.label;
  }

  expandFolderPath(folderId) {
    let cursor = folderById(this.state, folderId);
    while (cursor) {
      this.expandedFolders.add(cursor.id);
      cursor = cursor.parentId ? folderById(this.state, cursor.parentId) : null;
    }
  }

  bind() {
    this.els.searchInput.addEventListener("input", () => {
      this.state.searchQuery = this.els.searchInput.value || "";
      this.render();
    });

    this.els.toggleSearchBtn?.addEventListener("click", () => {
      this.state.searchVisible = !this.state.searchVisible;
      if (!this.state.searchVisible) {
        this.state.searchQuery = "";
        this.els.searchInput.value = "";
      }
      this.onStateChange("toggle-search");
      if (this.state.searchVisible) this.els.searchInput.focus();
    });

    this.els.openNewBoxBtn.addEventListener("click", () => {
      const visible = this.state.folders.filter((f) => !f.hidden);
      const scoped = visible.filter((f) => rootBoxIdFromFolder(this.state, f.id) === this.state.browserRootId);
      const current = folderById(this.state, this.state.selectedFolderId);
      this.createBoxDialog.setOptions(scoped.length ? scoped : visible);
      this.createBoxDialog.open(this.state.selectedFolderId, current?.fsPath || "");
    });

    this.els.newNoteBtn.addEventListener("click", () => {
      const folderId = resolveExplorerNewNoteFolderId(this.state);
      if (folderById(this.state, folderId)) {
        this.state.selectedFolderId = folderId;
        this.state.browserRootId = rootBoxIdFromFolder(this.state, folderId);
        this.state.selectedFileId = null;
      }
      this.onStateChange("create-note-in-selected-folder");
    });

    this.els.listArea.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest("button[data-toggle-folder]");
      if (toggleBtn) {
        const id = toggleBtn.dataset.toggleFolder;
        if (this.expandedFolders.has(id)) this.expandedFolders.delete(id);
        else this.expandedFolders.add(id);
        this.render();
        return;
      }

      const item = e.target.closest(".explorer-item[data-kind][data-id]");
      if (!item) return;
      const kind = item.dataset.kind;
      const id = item.dataset.id;

      if (kind === "folder") {
        this.state.selectedFolderId = id;
        this.state.selectedFileId = null;
        this.expandedFolders.add(id);
        this.onStateChange("select-folder");
        return;
      }

      if (kind === "file") {
        this.state.selectedFileId = id;
        this.onOpenNote(id);
      }
    });

    this.els.listArea.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".explorer-item[data-kind][data-id]");
      if (!item) return;
      const kind = item.dataset.kind;
      const id = item.dataset.id;
      this.dragPayload = { kind, id };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `${kind}:${id}`);
      this.els.listArea.classList.add("is-dragging");
      item.classList.add("dragging");
    });

    this.els.listArea.addEventListener("dragend", (e) => {
      const item = e.target.closest(".explorer-item[data-kind][data-id]");
      if (item) item.classList.remove("dragging");
      this.els.listArea.classList.remove("is-dragging");
      this.clearDropTarget();
      this.dragPayload = null;
    });

    this.els.listArea.addEventListener("dragover", (e) => {
      const folderRow = e.target.closest('.explorer-item[data-kind="folder"][data-id]');
      if (!folderRow || !this.dragPayload) return;
      if (!this.canDropToFolder(this.dragPayload, folderRow.dataset.id)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      this.setDropTarget(folderRow.dataset.id);
    });

    this.els.listArea.addEventListener("dragleave", (e) => {
      const folderRow = e.target.closest('.explorer-item[data-kind="folder"][data-id]');
      if (!folderRow) return;
      const nextFolderRow = e.relatedTarget?.closest?.('.explorer-item[data-kind="folder"][data-id]');
      if (nextFolderRow?.dataset?.id === folderRow.dataset.id) return;
      if (this.currentDropTargetId === folderRow.dataset.id) this.clearDropTarget();
    });

    this.els.listArea.addEventListener("drop", (e) => {
      const folderRow = e.target.closest('.explorer-item[data-kind="folder"][data-id]');
      if (!folderRow || !this.dragPayload) return;
      e.preventDefault();
      const targetFolderId = folderRow.dataset.id;
      const result = this.movePayloadToFolder(this.dragPayload, targetFolderId);
      this.els.listArea.classList.remove("is-dragging");
      this.clearDropTarget();
      this.dragPayload = null;
      if (result?.ok) {
        if (result.kind === "file") this.onStateChange("note-move", { noteId: result.id, directoryId: result.targetFolderId });
        if (result.kind === "folder") this.onStateChange("directory-move", { directoryId: result.id, parentDirectoryId: result.targetFolderId });
        this.onStateChange("list-context-action");
      }
    });

    this.els.listArea.addEventListener("contextmenu", (e) => {
      const item = e.target.closest(".explorer-item[data-kind][data-id]");
      e.preventDefault();

      if (!item) {
        this.contextMenu.show({
          x: e.clientX,
          y: e.clientY,
          target: { kind: "list", id: this.state.selectedFolderId },
          actions: [
            { key: "new-note-here", label: "新建笔记", shortcut: "Ctrl+N", icon: "＋" },
            { key: "new-child", label: "新建目录...", icon: "▸" },
            { type: "separator" },
            { key: "refresh", label: "刷新", shortcut: "F5", icon: "↻" },
            { key: "properties", label: "属性", icon: "ⓘ" }
          ],
          onAction: (action, target) => void this.handleContextAction(action, target)
        });
        return;
      }

      const kind = item.dataset.kind;
      const id = item.dataset.id;

      if (kind === "folder") {
        const folder = folderById(this.state, id);
        const isDefault = Boolean(folder?.isDefault);
        this.contextMenu.show({
          x: e.clientX,
          y: e.clientY,
          target: { kind, id },
          actions: [
            { key: "open", label: "打开目录", icon: "↗" },
            { key: "new-note-here", label: "在此新建笔记", shortcut: "Ctrl+N", icon: "＋" },
            { key: "new-child", label: "新建子目录...", icon: "▸" },
            { type: "separator" },
            { key: "rename", label: "重命名", shortcut: "F2", icon: "✎" },
            { key: "copy-folder-id", label: "复制目录ID", icon: "⎘" },
            { key: "set-folder-path", label: "设置保存位置...", icon: "⌂" },
            { key: "reveal-folder", label: "在系统文件管理器中显示", disabled: !folder?.fsPath, icon: "⌕" },
            { key: "toggle-hidden", label: folder?.hidden ? "显示目录" : "隐藏目录", disabled: isDefault, icon: "◐" },
            { type: "separator" },
            { key: "properties", label: "属性", icon: "ⓘ" },
            { key: "delete", label: "删除", danger: true, disabled: isDefault, icon: "✕" }
          ],
          onAction: (action, target) => void this.handleContextAction(action, target)
        });
      }

      if (kind === "file") {
        this.contextMenu.show({
          x: e.clientX,
          y: e.clientY,
          target: { kind, id },
          actions: [
            { key: "open", label: "打开笔记", icon: "↗" },
            { key: "rename", label: "重命名", shortcut: "F2", icon: "✎" },
            { key: "move", label: "移动到...", icon: "⇄" },
            { key: "copy-note-id", label: "复制笔记ID", icon: "⎘" },
            { key: "reveal-note", label: "显示 Markdown 文件位置", icon: "⌕" },
            { type: "separator" },
            { key: "properties", label: "属性", icon: "ⓘ" },
            { key: "delete", label: "删除", danger: true, icon: "✕" }
          ],
          onAction: (action, target) => void this.handleContextAction(action, target)
        });
      }
    });
  }

  isDescendantFolder(targetFolderId, possibleAncestorId) {
    let cursor = folderById(this.state, targetFolderId);
    while (cursor && cursor.parentId) {
      if (cursor.parentId === possibleAncestorId) return true;
      cursor = folderById(this.state, cursor.parentId);
    }
    return false;
  }

  canDropToFolder(payload, targetFolderId) {
    if (!payload || !targetFolderId) return false;
    if (payload.kind === "file") return true;
    if (payload.kind === "folder") {
      const dragged = folderById(this.state, payload.id);
      if (!dragged || dragged.isDefault) return false;
      if (payload.id === targetFolderId) return false;
      if (this.isDescendantFolder(targetFolderId, payload.id)) return false;
      return true;
    }
    return false;
  }

  setDropTarget(targetFolderId) {
    if (!targetFolderId) return;
    if (this.currentDropTargetId === targetFolderId) return;
    this.clearDropTarget();
    const nextTarget = this.els.listArea.querySelector(`.explorer-item[data-kind="folder"][data-id="${targetFolderId}"]`);
    if (!nextTarget) return;
    nextTarget.classList.add("drop-target");
    this.currentDropTargetId = targetFolderId;
  }

  clearDropTarget() {
    if (!this.currentDropTargetId) {
      this.els.listArea.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
      return;
    }
    const target = this.els.listArea.querySelector(`.explorer-item[data-kind="folder"][data-id="${this.currentDropTargetId}"]`);
    if (target) target.classList.remove("drop-target");
    this.currentDropTargetId = null;
  }

  movePayloadToFolder(payload, targetFolderId) {
    if (!this.canDropToFolder(payload, targetFolderId)) return false;

    if (payload.kind === "file") {
      const note = this.state.notes.find((n) => n.id === payload.id);
      if (!note) return false;
      return { ok: true, kind: "file", id: note.id, targetFolderId };
    }

    if (payload.kind === "folder") {
      const folder = folderById(this.state, payload.id);
      if (!folder) return false;
      this.expandedFolders.add(targetFolderId);
      return { ok: true, kind: "folder", id: folder.id, targetFolderId };
    }

    return false;
  }

  async handleContextAction(action, target) {
    if (target.kind === "list") {
      if (action === "new-note-here") this.onStateChange("create-note-in-selected-folder");
      if (action === "new-child") {
        const visible = this.state.folders.filter((x) => !x.hidden);
        const scoped = visible.filter((f) => rootBoxIdFromFolder(this.state, f.id) === this.state.browserRootId);
        this.createBoxDialog.setOptions(scoped.length ? scoped : visible);
        const current = folderById(this.state, this.state.selectedFolderId);
        this.createBoxDialog.open(this.state.selectedFolderId, current?.fsPath || "");
        return;
      }
      if (action === "refresh") this.onStatus("已刷新文件树", "ok");
      if (action === "properties") {
        const current = folderById(this.state, this.state.selectedFolderId);
        if (!current) return;
        const folderCount = childFolders(this.state, current.id).length;
        const noteCount = notesInFolder(this.state, current.id).length;
        this.onStatus(`${current.name}：子盒 ${folderCount}，笔记 ${noteCount}，路径 ${current.fsPath || "-"}`, "ok");
      }
      this.onStateChange("list-context-action");
      return;
    }

    if (target.kind === "folder") {
      const f = folderById(this.state, target.id);
      if (!f) return;

      if (action === "open") {
        this.state.selectedFolderId = f.id;
        this.state.browserRootId = rootBoxIdFromFolder(this.state, f.id);
        this.expandedFolders.add(f.id);
        this.onStatus(`已打开目录：${displayFolderName(f)}`, "ok");
      }
      if (action === "new-note-here") {
        this.state.selectedFolderId = f.id;
        this.state.browserRootId = rootBoxIdFromFolder(this.state, f.id);
        this.expandedFolders.add(f.id);
        this.onStateChange("create-note-in-selected-folder");
        return;
      }
      if (action === "new-child") {
        const visible = this.state.folders.filter((x) => !x.hidden);
        const scoped = visible.filter((folder) => rootBoxIdFromFolder(this.state, folder.id) === this.state.browserRootId);
        this.createBoxDialog.setOptions(scoped.length ? scoped : visible);
        this.createBoxDialog.open(f.id, f.fsPath || "");
        return;
      }
      if (action === "rename") {
        const name = prompt("重命名目录：", f.name);
        if (name && name.trim()) {
          await this.onStateChange("directory-update", { directoryId: f.id, patch: { title: name.trim() } });
        }
      }
      if (action === "copy-folder-id") {
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(f.id).catch(() => {});
        this.onStatus(`已复制目录ID：${f.id}`, "ok");
      }
      if (action === "set-folder-path") {
        if (!this.pickDirectory) {
          this.onStatus("当前环境未提供目录选择器", "bad");
          return;
        }
        const picked = await this.pickDirectory({ defaultPath: f.fsPath || "" });
        if (picked?.path) {
          await this.onStateChange("directory-update", { directoryId: f.id, patch: { fsPath: picked.path } });
        }
      }
      if (action === "reveal-folder") {
        await this.revealLocalPath(f.fsPath, "目录位置");
      }
      if (action === "toggle-hidden") {
        if (f.isDefault) return this.onStatus("默认根目录不支持隐藏", "warn");
        f.hidden = !f.hidden;
        await this.onStateChange("directory-update", { directoryId: f.id, patch: { isHidden: f.hidden } });
        this.onStatus(f.hidden ? "目录已隐藏" : "目录已显示", "ok");
      }
      if (action === "properties") {
        const folderCount = childFolders(this.state, f.id).length;
        const noteCount = notesInFolder(this.state, f.id).length;
        this.onStatus(`${f.name}：子盒 ${folderCount}，笔记 ${noteCount}，上限 ${f.maxCards}，路径 ${f.fsPath || "-"}`, "ok");
      }
      if (action === "delete") {
        if (f.isDefault) return this.onStatus("默认根目录不可删除", "bad");
        const ok = confirm(`确认删除目录「${f.name}」及其直接笔记？`);
        if (!ok) return;
        await this.onStateChange("directory-delete", { directoryId: f.id });
      }
      this.onStateChange("folder-context-action");
      return;
    }

    if (target.kind === "file") {
      const n = this.state.notes.find((x) => x.id === target.id);
      if (!n) return;
      if (action === "open") this.onOpenNote(n.id);
      if (action === "rename") {
        const title = prompt("重命名笔记：", n.title);
        if (title && title.trim()) {
          n.title = title.trim();
          await this.onStateChange("save-note", { noteId: n.id, title: n.title });
        }
        this.onStatus("笔记已重命名", "ok");
      }
      if (action === "move") {
        const to = prompt(
          "移动到目录 ID：\n" + this.state.folders.filter((f) => !f.hidden).map((f) => `${f.id} ${f.name}`).join("\n"),
          n.folderId
        );
        if (to && this.state.folders.find((f) => f.id === to)) {
          await this.onStateChange("note-move", { noteId: n.id, directoryId: to });
        }
      }
      if (action === "copy-note-id") {
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(n.id).catch(() => {});
        this.onStatus(`已复制笔记ID：${n.id}`, "ok");
      }
      if (action === "reveal-note") {
        const notePath = this.resolveNotePath ? this.resolveNotePath(n) : "";
        await this.revealLocalPath(notePath, "Markdown 文件位置");
      }
      if (action === "properties") {
        this.onStatus(`${n.title}：类型 ${typeLabel(n.noteType || "original")}，更新于 ${new Date(n.updatedAt).toLocaleString()}`, "ok");
      }
      if (action === "delete") {
        const ok = confirm(`确认删除笔记「${n.title}」？\n\n这会同时删除本地 Markdown 文件，且不可撤销。`);
        if (!ok) return;
        await this.onStateChange("note-delete", { noteId: n.id });
      }
      this.onStateChange("file-context-action");
    }
  }

  async revealLocalPath(targetPath, label) {
    if (!targetPath) {
      this.onStatus(`${label || "路径"}不可用`, "warn");
      return;
    }
    if (!this.desktopFile?.revealPath) {
      this.onStatus(`当前环境不能打开本机路径：${targetPath}`, "warn");
      return;
    }
    try {
      const result = await this.desktopFile.revealPath(targetPath);
      if (result.ok) {
        this.onStatus(`已打开${label || "本机路径"}：${targetPath}`, "ok");
        return;
      }
      this.onStatus(`${result.message || "无法打开本机路径"}：${targetPath}`, "warn");
    } catch (error) {
      this.onStatus(`打开本机路径失败：${String(error?.message || error)}`, "bad");
    }
  }

  getFolderChildren(parentId) {
    return this.state.folders
      .filter((f) => !f.hidden && f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }

  getFolderFiles(folderId) {
    return this.state.notes
      .filter((n) => n.folderId === folderId)
      .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }

  fileMatches(note, q) {
    if (!q) return true;
    const target = `${note.title}\n${note.body}\n${(note.tags || []).join(" ")}`.toLowerCase();
    return target.includes(q);
  }

  noteSearchScore(note, q) {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return 0;

    const title = String(note?.title || "").toLowerCase();
    const body = String(note?.body || "").toLowerCase();
    const tags = Array.isArray(note?.tags) ? note.tags.map((item) => String(item || "").toLowerCase()) : [];
    const noteType = String(note?.noteType || "").trim().toLowerCase();

    let score = 100;

    if (noteType === "original" || noteType === "permanent") score -= 30;
    else if (noteType === "literature") score -= 10;

    if (title === query) score -= 40;
    else if (title.startsWith(query)) score -= 30;
    else if (title.includes(query)) score -= 20;

    if (tags.some((item) => item === query)) score -= 16;
    else if (tags.some((item) => item.includes(query))) score -= 10;

    if (body.includes(query)) score -= 4;

    return score;
  }

  folderMatches(folder, q) {
    if (!q) return true;
    const target = `${folder.name}\n${folder.fsPath || ""}`.toLowerCase();
    return target.includes(q);
  }

  folderHasVisibleContent(folderId, q, memo = new Map()) {
    if (!q) return true;
    const key = `${folderId}::${q}`;
    if (memo.has(key)) return memo.get(key);

    const folder = folderById(this.state, folderId);
    if (!folder) {
      memo.set(key, false);
      return false;
    }

    if (this.folderMatches(folder, q)) {
      memo.set(key, true);
      return true;
    }

    const hasFile = this.getFolderFiles(folderId).some((n) => this.fileMatches(n, q));
    if (hasFile) {
      memo.set(key, true);
      return true;
    }

    const hasDescendant = this.getFolderChildren(folderId).some((c) => this.folderHasVisibleContent(c.id, q, memo));
    memo.set(key, hasDescendant);
    return hasDescendant;
  }

  renderFolderNode(folder, depth, q, memo) {
    const allChildren = this.getFolderChildren(folder.id).filter((c) => this.folderHasVisibleContent(c.id, q, memo));
    const allFiles = this.getFolderFiles(folder.id)
      .filter((n) => this.fileMatches(n, q))
      .sort((a, b) => {
        const scoreDiff = this.noteSearchScore(a, q) - this.noteSearchScore(b, q);
        if (scoreDiff) return scoreDiff;
        return String(a.title || "").localeCompare(String(b.title || ""), "zh-CN");
      });
    const hasChildren = allChildren.length > 0 || allFiles.length > 0;
    const forceExpand = Boolean(q) && hasChildren;
    const expanded = forceExpand || this.expandedFolders.has(folder.id);
    const isRoot = depth === 0;

      const folderIsActive = this.state.selectedFolderId === folder.id && !this.state.selectedFileId;
      const folderRow = `
        <div class="explorer-item tree-row ${isRoot ? "folder-row-root" : ""} ${folderIsActive ? "active" : ""}" data-kind="folder" data-id="${folder.id}" draggable="true" style="--depth:${depth};">
          <div class="left">
            <span class="tree-indent"></span>
            <button class="tree-toggle" data-toggle-folder="${folder.id}" ${hasChildren ? "" : "disabled"} title="\u5c55\u5f00/\u6298\u53e0">${hasChildren ? (expanded ? "&#9662;" : "&#9656;") : "&middot;"}</button>
            <span class="icon">${folderIconSvg(isRoot)}</span>
            <span class="name"><strong>${displayFolderName(folder)}</strong></span>
          </div>
          <div class="item-trail">${folder.hidden ? `<span class="item-badge">已隐藏</span>` : ""}</div>
        </div>
      `;

    if (!expanded) return folderRow;

    const fileRows = allFiles
      .map((n) => {
        const thinkingBadge = thinkingStatusBadge(n);
        const originalBadge = generatedOriginalBadge(this.state, n);
        const thinkingClass = thinkingBadge ? "has-thinking-status" : "";
        return `
      <div class="explorer-item tree-row file-row ${thinkingClass} ${this.state.selectedFileId === n.id ? "active" : ""}" data-kind="file" data-id="${n.id}" draggable="true" style="--depth:${depth + 1};">
        <div class="left">
          <span class="tree-indent"></span>
          <span class="tree-toggle ghost"> </span>
          <span class="icon">${fileIconSvg()}</span>
          <span class="name"><strong>${n.title}</strong></span>
        </div>
          <div class="item-trail">${thinkingBadge}${originalBadge}</div>
        </div>
      `;
      })
        .join("");

    const childFolderRows = allChildren.map((c) => this.renderFolderNode(c, depth + 1, q, memo)).join("");

    return `${folderRow}${childFolderRows}${fileRows}`;
  }

  render() {
    this.syncNewNoteButton();
    const q = this.state.searchQuery.trim().toLowerCase();
    const memo = new Map();

    const scopedRoot = folderById(this.state, this.state.browserRootId);
    const roots = [scopedRoot]
      .filter(Boolean)
      .filter((f) => !f.hidden)
      .filter((f) => this.folderHasVisibleContent(f.id, q, memo));

    if (!roots.length) {
      this.els.listArea.innerHTML = `<div class="explorer-empty">未找到匹配的目录或笔记。试试直接搜索观点关键词、标签，或切换到其他笔记根目录。</div>`;
      return;
    }

    this.els.listArea.innerHTML = `<div class="tree-root">${roots.map((r) => this.renderFolderNode(r, 0, q, memo)).join("")}</div>`;
  }
}
