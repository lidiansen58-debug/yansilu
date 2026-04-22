import { childFolders, folderById, notesInFolder, rootBoxIdFromFolder, typeFromFolder, typeLabel } from "./prototype-store.js";

export class ExplorerPane {
  constructor({
    state,
    elements,
    contextMenu,
    createBoxDialog,
    onOpenNote,
    onStatus,
    onStateChange,
    pickDirectory
  }) {
    this.state = state;
    this.els = elements;
    this.contextMenu = contextMenu;
    this.createBoxDialog = createBoxDialog;
    this.onOpenNote = onOpenNote;
    this.onStatus = onStatus;
    this.onStateChange = onStateChange;
    this.pickDirectory = pickDirectory;

    this.dragPayload = null;
    this.expandedFolders = new Set(
      this.state.folders.filter((f) => !f.hidden && f.parentId === null).map((f) => f.id)
    );

    this.bind();
  }

  bind() {
    this.els.searchInput.addEventListener("input", () => {
      this.state.searchQuery = this.els.searchInput.value || "";
      this.render();
    });

    this.els.openNewBoxBtn.addEventListener("click", () => {
      const visible = this.state.folders.filter((f) => !f.hidden);
      const scoped = visible.filter((f) => rootBoxIdFromFolder(this.state, f.id) === this.state.browserRootId);
      const current = folderById(this.state, this.state.selectedFolderId);
      this.createBoxDialog.setOptions(scoped.length ? scoped : visible);
      this.createBoxDialog.open(this.state.selectedFolderId, current?.fsPath || "");
    });

    this.els.newNoteBtn.addEventListener("click", () => {
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
      item.classList.add("dragging");
    });

    this.els.listArea.addEventListener("dragend", (e) => {
      const item = e.target.closest(".explorer-item[data-kind][data-id]");
      if (item) item.classList.remove("dragging");
      this.els.listArea.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
      this.dragPayload = null;
    });

    this.els.listArea.addEventListener("dragover", (e) => {
      const folderRow = e.target.closest('.explorer-item[data-kind="folder"][data-id]');
      if (!folderRow || !this.dragPayload) return;
      if (!this.canDropToFolder(this.dragPayload, folderRow.dataset.id)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      this.els.listArea.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
      folderRow.classList.add("drop-target");
    });

    this.els.listArea.addEventListener("drop", (e) => {
      const folderRow = e.target.closest('.explorer-item[data-kind="folder"][data-id]');
      if (!folderRow || !this.dragPayload) return;
      e.preventDefault();
      const targetFolderId = folderRow.dataset.id;
      const result = this.movePayloadToFolder(this.dragPayload, targetFolderId);
      this.els.listArea.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
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
            { key: "new-note-here", label: "新建笔记", shortcut: "Ctrl+N" },
            { key: "new-child", label: "新建目录..." },
            { type: "separator" },
            { key: "refresh", label: "刷新", shortcut: "F5" },
            { key: "properties", label: "属性" }
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
            { key: "open", label: "打开目录" },
            { key: "new-note-here", label: "在此新建笔记", shortcut: "Ctrl+N" },
            { key: "new-child", label: "新建子目录..." },
            { type: "separator" },
            { key: "rename", label: "重命名", shortcut: "F2" },
            { key: "copy-folder-id", label: "复制目录ID" },
            { key: "set-folder-path", label: "设置保存位置..." },
            { key: "toggle-hidden", label: folder?.hidden ? "显示目录" : "隐藏目录", disabled: isDefault },
            { type: "separator" },
            { key: "properties", label: "属性" },
            { key: "delete", label: "删除", danger: true, disabled: isDefault }
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
            { key: "open", label: "打开笔记" },
            { key: "rename", label: "重命名", shortcut: "F2" },
            { key: "move", label: "移动到..." },
            { key: "copy-note-id", label: "复制笔记ID" },
            { type: "separator" },
            { key: "properties", label: "属性" },
            { key: "delete", label: "删除", danger: true }
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

  movePayloadToFolder(payload, targetFolderId) {
    if (!this.canDropToFolder(payload, targetFolderId)) return false;

    if (payload.kind === "file") {
      const note = this.state.notes.find((n) => n.id === payload.id);
      if (!note) return false;
      note.folderId = targetFolderId;
      note.noteType = typeFromFolder(this.state, targetFolderId);
      note.updatedAt = new Date().toISOString();
      this.state.selectedFolderId = targetFolderId;
      this.onStatus(`已移动文件：${note.title}`, "ok");
      return { ok: true, kind: "file", id: note.id, targetFolderId };
    }

    if (payload.kind === "folder") {
      const folder = folderById(this.state, payload.id);
      if (!folder) return false;
      folder.parentId = targetFolderId;
      this.expandedFolders.add(targetFolderId);
      this.state.selectedFolderId = folder.id;
      this.state.browserRootId = rootBoxIdFromFolder(this.state, folder.id);
      this.onStatus(`已移动目录：${folder.name}`, "ok");
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
        this.onStatus(`已打开目录：${f.name}`, "ok");
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
          f.name = name.trim();
          await this.onStateChange("directory-update", { directoryId: f.id, patch: { title: f.name } });
        }
        this.onStatus("目录已重命名", "ok");
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
          f.fsPath = picked.path;
          await this.onStateChange("directory-update", { directoryId: f.id, patch: { fsPath: f.fsPath } });
          this.onStatus(`目录保存位置已更新：${picked.path}`, "ok");
        }
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
          n.folderId = to;
          n.noteType = typeFromFolder(this.state, to);
          n.updatedAt = new Date().toISOString();
          await this.onStateChange("note-move", { noteId: n.id, directoryId: to });
        }
        this.onStatus("笔记已移动", "ok");
      }
      if (action === "copy-note-id") {
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(n.id).catch(() => {});
        this.onStatus(`已复制笔记ID：${n.id}`, "ok");
      }
      if (action === "properties") {
        this.onStatus(`${n.title}：类型 ${typeLabel(n.noteType || "original")}，更新于 ${new Date(n.updatedAt).toLocaleString()}`, "ok");
      }
      if (action === "delete") {
        const ok = confirm(`确认删除笔记「${n.title}」？`);
        if (!ok) return;
        await this.onStateChange("note-delete", { noteId: n.id });
      }
      this.onStateChange("file-context-action");
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
    const allFiles = this.getFolderFiles(folder.id).filter((n) => this.fileMatches(n, q));
    const hasChildren = allChildren.length > 0 || allFiles.length > 0;
    const forceExpand = Boolean(q) && hasChildren;
    const expanded = forceExpand || this.expandedFolders.has(folder.id);

    const folderRow = `
      <div class="explorer-item tree-row ${this.state.selectedFolderId === folder.id ? "active" : ""}" data-kind="folder" data-id="${folder.id}" draggable="true" style="--depth:${depth};">
        <div class="left">
          <span class="tree-indent"></span>
          <button class="tree-toggle" data-toggle-folder="${folder.id}" ${hasChildren ? "" : "disabled"} title="展开/折叠">${hasChildren ? (expanded ? "▾" : "▸") : "·"}</button>
          <span class="icon">📁</span>
          <span class="name"><strong>${folder.name}</strong><br><small>目录 · max=${folder.maxCards}</small><br><small>${folder.fsPath || "-"}</small></span>
        </div>
      </div>
    `;

    if (!expanded) return folderRow;

    const fileRows = allFiles
      .map(
        (n) => `
      <div class="explorer-item tree-row file-row ${this.state.selectedFileId === n.id ? "active" : ""}" data-kind="file" data-id="${n.id}" draggable="true" style="--depth:${depth + 1};">
        <div class="left">
          <span class="tree-indent"></span>
          <span class="tree-toggle ghost"> </span>
          <span class="icon">📄</span>
          <span class="name"><strong>${n.title}.md</strong><br><small>${new Date(n.updatedAt).toLocaleString()}</small><br><span class="type-badge">${typeLabel(n.noteType || "original")}</span></span>
        </div>
      </div>
    `
      )
      .join("");

    const childFolderRows = allChildren.map((c) => this.renderFolderNode(c, depth + 1, q, memo)).join("");

    return `${folderRow}${childFolderRows}${fileRows}`;
  }

  render() {
    const q = this.state.searchQuery.trim().toLowerCase();
    const memo = new Map();

    const scopedRoot = folderById(this.state, this.state.browserRootId);
    const roots = [scopedRoot]
      .filter(Boolean)
      .filter((f) => !f.hidden)
      .filter((f) => this.folderHasVisibleContent(f.id, q, memo));

    if (!roots.length) {
      this.els.listArea.innerHTML = `<div style="color:#6b7280;">未找到匹配的目录或文件</div>`;
      return;
    }

    this.els.listArea.innerHTML = `<div class="tree-root">${roots.map((r) => this.renderFolderNode(r, 0, q, memo)).join("")}</div>`;
  }
}
