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
  return "永";
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolvedNoteType(state, note = null) {
  if (note?.folderId) return String(typeFromFolder(state, note.folderId) || "").trim().toLowerCase();
  const explicitType = String(note?.noteType || "").trim().toLowerCase();
  if (explicitType) return explicitType;
  return "";
}

function generatedOriginalBadge(state, note = null) {
  const noteType = String(note?.noteType || (note?.folderId ? typeFromFolder(state, note.folderId) : "") || "").trim().toLowerCase();
  const generatedId = String(note?.generatedOriginalNoteId || note?.generated_original_note_id || "").trim();
  if (!generatedId) return "";
  if (noteType !== "fleeting" && noteType !== "literature") return "";
  const originalNote = Array.isArray(state?.notes) ? state.notes.find((item) => item.id === generatedId) : null;
  const originalTitle = String(originalNote?.title || "").trim();
  const title = originalTitle ? `已关联永久笔记：${originalTitle}` : "已关联到一条永久笔记";
  return `<span class="item-badge item-badge-original-record" title="${escapeHtml(title)}">已生成永久笔记</span>`;
}

function sourcePermanentStatusBadge(state, note = null) {
  const noteType = resolvedNoteType(state, note) || String(note?.noteType || "").trim().toLowerCase();
  if (noteType !== "fleeting" && noteType !== "literature") return "";
  const generatedId = String(note?.generatedOriginalNoteId || note?.generated_original_note_id || "").trim();
  if (generatedId) return generatedOriginalBadge(state, note);
  const title = noteType === "literature" ? "这条文献笔记还没有生成永久笔记。" : "这条随笔笔记还没有生成永久笔记。";
  return `<span class="item-badge item-badge-warning" title="${escapeHtml(title)}">未转永久</span>`;
}

function noteRelationNetworkStatus(note = null) {
  const status = String(note?.relationNetworkStatus || note?.relation_network_status || "").trim().toLowerCase();
  if (status === "connected" || status === "isolated") return status;
  return "";
}

function canRecordPermanentFromNote(state, note = null) {
  const noteType = resolvedNoteType(state, note);
  const generatedId = String(note?.generatedOriginalNoteId || note?.generated_original_note_id || "").trim();
  return (noteType === "fleeting" || noteType === "literature") && !generatedId;
}

function permanentDirectoryPrompt(state = {}) {
  const folders = (Array.isArray(state.folders) ? state.folders : [])
    .filter((folder) => !folder.hidden && rootBoxIdFromFolder(state, folder.id) === "dir_original_default");
  const options = folders.length ? folders : (Array.isArray(state.folders) ? state.folders : []).filter((folder) => folder.id === "dir_original_default");
  const picked = prompt(`选择永久笔记目录 ID：\n${options.map((folder) => `${folder.id} ${displayFolderName(folder)}`).join("\n")}`, "dir_original_default");
  const directoryId = String(picked || "").trim();
  return options.some((folder) => folder.id === directoryId) ? directoryId : "";
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

function disconnectedNoteBadge() {
  return `<span class="item-badge item-badge-warning" title="这条永久笔记还没有进入关系网络。">孤立</span>`;
}

function disconnectedFolderBadge(hasDisconnected = false) {
  if (!hasDisconnected) return "";
  return `<span class="item-badge item-badge-warning" title="这个目录下还有未关联的永久笔记。">孤立</span>`;
}

function displayFolderName(folder) {
  if (!folder) return "目录";
  if (folder.id === "dir_original_default") return "永久笔记盒";
  if (folder.id === "dir_fleeting_default") return "随笔卡片盒";
  if (folder.id === "dir_literature_default") return "文献卡片盒";
  if (!folder.parentId && String(folder.name || "").trim() === "永久笔记目录") return "永久笔记盒";
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
  return { label: "新建笔记", title: "新建永久笔记", ariaLabel: "在当前永久笔记目录新建笔记" };
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
    this.collapsedDisconnectedGroups = new Set();
    this.autoCollapsedDisconnectedGroups = new Set();
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
    const folderId = resolveExplorerNewNoteFolderId(this.state);
    const noteType = typeFromFolder(this.state, folderId);
    const ariaLabel = noteType === "literature" ? `${copy.ariaLabel}（文献）` : noteType === "permanent" ? `${copy.ariaLabel}（永久）` : copy.ariaLabel;
    button.setAttribute("aria-label", ariaLabel);
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

  collapseDisconnectedGroup(folderId, { auto = false } = {}) {
    const cleanId = String(folderId || "").trim();
    if (!cleanId) return;
    this.collapsedDisconnectedGroups.add(cleanId);
    if (auto) this.autoCollapsedDisconnectedGroups.add(cleanId);
  }

  restoreAutoCollapsedDisconnectedGroups() {
    this.autoCollapsedDisconnectedGroups.forEach((folderId) => this.collapsedDisconnectedGroups.delete(folderId));
    this.autoCollapsedDisconnectedGroups.clear();
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
      if (!folderById(this.state, folderId)) return;
      this.onStateChange("create-note-in-selected-folder", { folderId });
    });

    this.els.listArea.addEventListener("click", (e) => {
      const relationButton = e.target.closest("button[data-associate-note]");
      if (relationButton) {
        const noteId = String(relationButton.dataset.associateNote || "").trim();
        if (noteId) this.onStateChange("open-note-relations", { noteId, source: "explorer-browser" });
        return;
      }

      const disconnectedToggle = e.target.closest("button[data-toggle-disconnected-group]");
      if (disconnectedToggle) {
        const folderId = String(disconnectedToggle.dataset.toggleDisconnectedGroup || "").trim();
        if (!folderId) return;
        this.autoCollapsedDisconnectedGroups.delete(folderId);
        if (this.collapsedDisconnectedGroups.has(folderId)) this.collapsedDisconnectedGroups.delete(folderId);
        else this.collapsedDisconnectedGroups.add(folderId);
        this.render();
        return;
      }

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
        this.expandedFolders.add(id);
        this.onStateChange("select-folder", { folderId: id });
        return;
      }

      if (kind === "file") {
        if (this.state.module === "graph") {
          this.onStateChange("graph-focus-note", { noteId: id });
          return;
        }
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
            { key: "new-note-here", label: "新建笔记", shortcut: "Ctrl+N", icon: "+" },
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
            { key: "new-note-here", label: "在此新建笔记", shortcut: "Ctrl+N", icon: "+" },
            { key: "new-child", label: "新建子目录...", icon: "▸" },
            { type: "separator" },
            { key: "rename", label: "重命名", shortcut: "F2", icon: "✎" },
            { key: "copy-folder-id", label: "复制目录 ID", icon: "⧉" },
            { key: "set-folder-path", label: "设置保存位置...", icon: "⌂" },
            { key: "reveal-folder", label: "在系统文件管理器中显示", disabled: !folder?.fsPath, icon: "⌂" },
            { key: "toggle-hidden", label: folder?.hidden ? "显示目录" : "隐藏目录", disabled: isDefault, icon: "◌" },
            { type: "separator" },
            { key: "properties", label: "属性", icon: "ⓘ" },
            { key: "delete", label: "删除", danger: true, disabled: isDefault, icon: "✕" }
          ],
          onAction: (action, target) => void this.handleContextAction(action, target)
        });
      }

      if (kind === "file") {
        const note = this.state.notes.find((x) => x.id === id);
        this.contextMenu.show({
          x: e.clientX,
          y: e.clientY,
          target: { kind, id },
          actions: [
            { key: "open", label: "打开笔记", icon: "↗" },
            ...(canRecordPermanentFromNote(this.state, note) ? [{ key: "record-permanent", label: "创建永久笔记...", icon: "+" }, { type: "separator" }] : []),
            { key: "rename", label: "重命名", shortcut: "F2", icon: "✎" },
            { key: "move", label: "移动到...", icon: "⇄" },
            { key: "copy-note-id", label: "复制笔记 ID", icon: "⧉" },
            { key: "reveal-note", label: "显示 Markdown 文件位置", icon: "⌂" },
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
      if (action === "new-note-here") this.onStateChange("create-note-in-selected-folder", { folderId: this.state.selectedFolderId });
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
        this.onStatus(`${current.name}：子目录 ${folderCount}，笔记 ${noteCount}，路径 ${current.fsPath || "-"}`, "ok");
      }
      this.onStateChange("list-context-action");
      return;
    }

    if (target.kind === "folder") {
      const f = folderById(this.state, target.id);
      if (!f) return;

      if (action === "open") {
        this.expandedFolders.add(f.id);
        this.onStateChange("select-folder", { folderId: f.id });
        this.onStatus(`已打开目录：${displayFolderName(f)}`, "ok");
      }
      if (action === "new-note-here") {
        this.expandedFolders.add(f.id);
        this.onStateChange("create-note-in-selected-folder", { folderId: f.id });
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
        this.onStatus(`已复制目录 ID：${f.id}`, "ok");
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
        this.onStatus(`${f.name}：子目录 ${folderCount}，笔记 ${noteCount}，上限 ${f.maxCards}，路径 ${f.fsPath || "-"}`, "ok");
      }
      if (action === "delete") {
        if (f.isDefault) return this.onStatus("默认根目录不可删除", "bad");
        const ok = confirm(`确认删除目录“${f.name}”及其直属笔记吗？`);
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
        this.onStatus(`已复制笔记 ID：${n.id}`, "ok");
      }
      if (action === "record-permanent") {
        const directoryId = permanentDirectoryPrompt(this.state);
        if (!directoryId) {
          this.onStatus("已取消创建永久笔记", "warn");
          return;
        }
        await this.onStateChange("record-original-from-note", {
          sourceNoteId: n.id,
          sourceType: n.noteType,
          sourceTitle: n.title,
          sourceBody: n.body || "",
          directoryId
        });
        return;
      }
      if (action === "reveal-note") {
        const notePath = this.resolveNotePath ? this.resolveNotePath(n) : "";
        await this.revealLocalPath(notePath, "Markdown 文件位置");
      }
      if (action === "properties") {
        this.onStatus(`${n.title}：类型 ${typeLabel(n.noteType || "original")}，更新于 ${new Date(n.updatedAt).toLocaleString()}`, "ok");
      }
      if (action === "delete") {
        const ok = confirm(`确认删除笔记“${n.title}”吗？\n\n这会同时删除本地 Markdown 文件，且不可撤销。`);
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
    const graphVisibleNoteIds = this.state.graphVisibleNoteIds instanceof Set ? this.state.graphVisibleNoteIds : null;
    return this.state.notes
      .filter((n) => n.folderId === folderId)
      .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }

  noteIsDisconnected(note) {
    const noteType = resolvedNoteType(this.state, note);
    if (noteType !== "original" && noteType !== "permanent") return false;
    const storedStatus = noteRelationNetworkStatus(note);
    if (storedStatus === "isolated") return true;
    if (storedStatus === "connected") return false;
    if (this.state.graphConnectivityReady !== true) return false;
    const connectedIds = this.state.graphConnectedNoteIds instanceof Set ? this.state.graphConnectedNoteIds : null;
    if (!connectedIds) return false;
    return !connectedIds.has(note.id);
  }

  folderHasDisconnectedNotes(folderId, memo = new Map()) {
    const key = String(folderId || "").trim();
    if (!key) return false;
    if (memo.has(key)) return memo.get(key);

    const ownHasDisconnected = this.getFolderFiles(key).some((note) => this.noteIsDisconnected(note));
    const childHasDisconnected = this.getFolderChildren(key).some((child) => this.folderHasDisconnectedNotes(child.id, memo));
    const hasDisconnected = ownHasDisconnected || childHasDisconnected;
    memo.set(key, hasDisconnected);
    return hasDisconnected;
  }

  isSimplifiedNoteBrowserScope(folderId = "") {
    const rootId = rootBoxIdFromFolder(this.state, folderId || this.state.browserRootId || "");
    return rootId === "dir_original_default"
      || rootId === "dir_fleeting_default"
      || rootId === "dir_literature_default";
  }

  isPermanentNoteBrowserScope(folderId = "") {
    const rootId = rootBoxIdFromFolder(this.state, folderId || this.state.browserRootId || "");
    return rootId === "dir_original_default";
  }

  isSourceNoteBrowserScope(folderId = "") {
    const rootId = rootBoxIdFromFolder(this.state, folderId || this.state.browserRootId || "");
    return rootId === "dir_fleeting_default" || rootId === "dir_literature_default";
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
    const noteType = resolvedNoteType(this.state, note);

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
    const selectedFolderId = String(this.state.selectedFolderId || "").trim();
    const allChildren = this.getFolderChildren(folder.id).filter((c) => {
      if (!q && c.id === selectedFolderId) return true;
      return this.folderHasVisibleContent(c.id, q, memo);
    });
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
    const folderHasDisconnected = this.isPermanentNoteBrowserScope(folder.id) && this.folderHasDisconnectedNotes(folder.id);
    const connectedFiles = allFiles.filter((note) => !this.noteIsDisconnected(note));
    const disconnectedFiles = allFiles.filter((note) => this.noteIsDisconnected(note));
    const pendingSourceFiles = this.isSourceNoteBrowserScope(folder.id) ? allFiles.filter((note) => canRecordPermanentFromNote(this.state, note)) : [];
    const completedSourceFiles = this.isSourceNoteBrowserScope(folder.id) ? allFiles.filter((note) => !canRecordPermanentFromNote(this.state, note)) : [];
    const folderTrail = [
      folder.hidden ? `<span class="item-badge">已隐藏</span>` : "",
      disconnectedFolderBadge(folderHasDisconnected)
    ].join("");
    const folderRow = `
      <div class="explorer-item tree-row ${isRoot ? "folder-row-root" : ""} ${folderIsActive ? "active" : ""} ${folderHasDisconnected ? "has-folder-alert" : ""}" data-kind="folder" data-id="${folder.id}" draggable="true" style="--depth:${depth};">
        <div class="left">
          <span class="tree-indent"></span>
          <button class="tree-toggle" data-toggle-folder="${folder.id}" ${hasChildren ? "" : "disabled"} title="展开/折叠">${hasChildren ? (expanded ? "&#9662;" : "&#9656;") : "&middot;"}</button>
          <span class="icon">${folderIconSvg(isRoot)}</span>
          <span class="name"><strong>${displayFolderName(folder)}</strong></span>
        </div>
        <div class="item-trail">${folderTrail}</div>
      </div>
    `;

    if (!expanded) return folderRow;

    const fileRows = this.isPermanentNoteBrowserScope(folder.id)
      ? [
          connectedFiles.map((note) => this.renderFileNode(note, depth + 1)).join(""),
          disconnectedFiles.map((note) => this.renderFileNode(note, depth + 1)).join("")
        ].join("")
      : this.isSourceNoteBrowserScope(folder.id)
        ? [
            pendingSourceFiles.map((note) => this.renderFileNode(note, depth + 1)).join(""),
            completedSourceFiles.map((note) => this.renderFileNode(note, depth + 1)).join("")
          ].join("")
        : allFiles.map((note) => this.renderFileNode(note, depth + 1)).join("");
    const childFolderRows = allChildren.map((c) => this.renderFolderNode(c, depth + 1, q, memo)).join("");

    return `${folderRow}${childFolderRows}${fileRows}`;
  }

  currentEditorNoteId() {
    const activeTabId = String(this.state.activeTabId || "").trim();
    if (!activeTabId) return "";
    const activeTab = Array.isArray(this.state.tabs) ? this.state.tabs.find((item) => item.id === activeTabId) : null;
    return String(activeTab?.noteId || "").trim();
  }

  expandCurrentEditorNotePathInRoot(rootId = this.state.browserRootId) {
    const cleanRootId = String(rootId || "").trim();
    const currentNoteId = this.currentEditorNoteId();
    if (!cleanRootId || !currentNoteId) return false;
    const note = Array.isArray(this.state.notes) ? this.state.notes.find((item) => item.id === currentNoteId) : null;
    if (!note?.folderId) return false;
    if (rootBoxIdFromFolder(this.state, note.folderId) !== cleanRootId) return false;
    this.expandFolderPath(note.folderId);
    return true;
  }

  preferredVisibleRowSelector() {
    const selectedFileId = String(this.state.selectedFileId || "").trim();
    if (selectedFileId) return `.explorer-item[data-kind="file"][data-id="${selectedFileId}"]`;
    const currentNoteId = this.currentEditorNoteId();
    if (currentNoteId) return `.explorer-item[data-kind="file"][data-id="${currentNoteId}"]`;
    const selectedFolderId = String(this.state.selectedFolderId || "").trim();
    if (selectedFolderId) return `.explorer-item[data-kind="folder"][data-id="${selectedFolderId}"]`;
    return "";
  }

  revealPreferredVisibleRow() {
    const selector = this.preferredVisibleRowSelector();
    if (!selector) return false;
    const target = this.els.listArea?.querySelector?.(selector);
    if (!target) return false;
    target.scrollIntoView({ block: "nearest" });
    return true;
  }

  scheduleRevealPreferredVisibleRow() {
    const run = () => {
      if (this.revealPreferredVisibleRow()) {
        if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
          window.setTimeout(() => this.revealPreferredVisibleRow(), 32);
        }
      }
    };
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(run);
      return;
    }
    run();
  }

  renderFileNode(note, depth) {
    const thinkingBadge = thinkingStatusBadge(note);
    const originalBadge = generatedOriginalBadge(this.state, note);
    const sourceStatusBadge = sourcePermanentStatusBadge(this.state, note);
    const disconnected = this.noteIsDisconnected(note);
    const disconnectedBadge = disconnected ? disconnectedNoteBadge() : "";
    const permanentSimplifiedScope = this.isPermanentNoteBrowserScope(note.folderId);
    const sourceSimplifiedScope = this.isSourceNoteBrowserScope(note.folderId);
    const simplifiedNoteBrowser = permanentSimplifiedScope || sourceSimplifiedScope;
    const thinkingClass = thinkingBadge && !simplifiedNoteBrowser ? "has-thinking-status" : "";
    const fileIsSelected = this.state.selectedFileId === note.id;
    const fileIsCurrent = this.currentEditorNoteId() === note.id;
    const currentBadge = fileIsCurrent && !fileIsSelected
      ? `<span class="item-badge item-badge-current" title="当前编辑中的笔记。">当前</span>`
      : "";
    const associateButton = disconnected && !simplifiedNoteBrowser
      ? `<button class="item-inline-action warn" type="button" data-associate-note="${escapeHtml(note.id)}" title="去给这条永久笔记补一条关系，把它接入网络">补关系</button>`
      : "";
    const trail = permanentSimplifiedScope
      ? disconnectedBadge
      : sourceSimplifiedScope
        ? sourceStatusBadge
      : `${currentBadge}${disconnectedBadge}${thinkingBadge}${originalBadge}${associateButton}`;
    return `
      <div class="explorer-item tree-row file-row ${thinkingClass} ${disconnected ? "is-disconnected" : ""} ${fileIsSelected ? "active" : ""} ${fileIsCurrent ? "is-current-note" : ""}" data-kind="file" data-id="${note.id}" draggable="true" style="--depth:${depth};">
        <div class="left">
          <span class="tree-indent"></span>
          <span class="tree-toggle ghost"> </span>
          <span class="icon">${fileIconSvg()}</span>
          <span class="name"><strong>${note.title}</strong></span>
        </div>
        <div class="item-trail">${trail}</div>
      </div>
    `;
  }

  renderDisconnectedGroupLabel(depth) {
    return `
      <div class="tree-group-label is-warning" style="--depth:${depth};">
        <span class="tree-indent"></span>
        <span class="tree-group-pill">孤立</span>
      </div>
    `;
  }

  renderDisconnectedGroupToggle(folderId, depth, collapsed = true) {
    return `
      <div class="tree-group-label is-warning" style="--depth:${depth};">
        <span class="tree-indent"></span>
        <button class="tree-group-pill tree-group-toggle" type="button" data-toggle-disconnected-group="${escapeHtml(folderId)}" aria-expanded="${collapsed ? "false" : "true"}">${collapsed ? "▸" : "▾"} 孤立</button>
      </div>
    `;
  }

  renderDisconnectedGroupToggleClean(folderId, depth, collapsed = true) {
    return `
      <div class="tree-group-label is-warning" style="--depth:${depth};">
        <span class="tree-indent"></span>
        <button class="tree-group-pill tree-group-toggle" type="button" data-toggle-disconnected-group="${escapeHtml(folderId)}" aria-expanded="${collapsed ? "false" : "true"}">${collapsed ? "▸" : "▾"} 孤立</button>
      </div>
    `;
  }

  renderGroupedFileRows(files = [], depth = 0, groupId = "") {
    const connectedFiles = files.filter((note) => !this.noteIsDisconnected(note));
    const disconnectedFiles = files.filter((note) => this.noteIsDisconnected(note));
    const disconnectedCollapsed = this.collapsedDisconnectedGroups.has(groupId);
    return [
      connectedFiles.map((note) => this.renderFileNode(note, depth)).join(""),
      disconnectedFiles.length ? this.renderDisconnectedGroupToggleClean(groupId, depth, disconnectedCollapsed) : "",
      disconnectedCollapsed ? "" : disconnectedFiles.map((note) => this.renderFileNode(note, depth)).join("")
    ].join("");
  }

  render() {
    this.syncNewNoteButton();
    const q = this.state.searchQuery.trim().toLowerCase();
    const memo = new Map();

    const scopedRoot = folderById(this.state, this.state.browserRootId);
    const flattenGraphRoot = this.state.module === "graph" && scopedRoot?.id === "dir_original_default";
    const roots = flattenGraphRoot
      ? childFolders(this.state, scopedRoot.id)
          .filter((f) => !f.hidden)
          .filter((f) => this.folderHasVisibleContent(f.id, q, memo))
      : [scopedRoot]
          .filter(Boolean)
          .filter((f) => !f.hidden)
          .filter((f) => this.folderHasVisibleContent(f.id, q, memo));
    const rootFiles = flattenGraphRoot
      ? this.getFolderFiles(scopedRoot.id)
          .filter((note) => this.fileMatches(note, q))
          .sort((a, b) => {
            const scoreDiff = this.noteSearchScore(a, q) - this.noteSearchScore(b, q);
            if (scoreDiff) return scoreDiff;
            return String(a.title || "").localeCompare(String(b.title || ""), "zh-CN");
          })
      : [];

    if (!roots.length && !rootFiles.length) {
      this.els.listArea.innerHTML = `<div class="explorer-empty">未找到匹配的目录或笔记。试试直接搜索观点关键词、标签，或切换到其他笔记根目录。</div>`;
      return;
    }

    const rootFileRows = flattenGraphRoot ? this.renderGroupedFileRows(rootFiles, 0, scopedRoot?.id || "dir_original_default") : rootFiles.map((note) => this.renderFileNode(note, 0)).join("");
    this.els.listArea.innerHTML = `<div class="tree-root">${roots.map((r) => this.renderFolderNode(r, 0, q, memo)).join("")}${rootFileRows}</div>`;
    this.scheduleRevealPreferredVisibleRow();
  }
}
