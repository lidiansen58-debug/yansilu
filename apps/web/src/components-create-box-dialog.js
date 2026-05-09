function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePathSegment(value = "") {
  return String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "");
}

function joinSuggestedPath(basePath = "", nextSegment = "") {
  const base = String(basePath || "").trim().replace(/[\\/]+$/g, "");
  const segment = normalizePathSegment(nextSegment);
  if (!base) return segment;
  if (!segment) return base;
  const separator = base.includes("\\") ? "\\" : "/";
  return `${base}${separator}${segment}`;
}

export class CreateBoxDialog {
  constructor({
    maskEl,
    nameEl,
    parentEl,
    fsPathEl,
    browseEl,
    maxEl,
    cancelEl,
    createEl,
    onStatus,
    pickDirectory
  }) {
    this.maskEl = maskEl;
    this.nameEl = nameEl;
    this.parentEl = parentEl;
    this.fsPathEl = fsPathEl;
    this.browseEl = browseEl;
    this.maxEl = maxEl;
    this.cancelEl = cancelEl;
    this.createEl = createEl;
    this.onStatus = onStatus || (() => {});
    this.pickDirectoryImpl = pickDirectory || null;
    this.onCreate = null;
    this.manualPathOverride = false;
    this.suggestedFsPath = "";
    this.syncingSuggestedPath = false;

    this.cancelEl.addEventListener("click", () => this.hide());
    this.maskEl.addEventListener("click", (e) => {
      if (e.target === this.maskEl) this.hide();
    });

    this.createEl.addEventListener("click", () => {
      const name = this.nameEl.value.trim();
      const parentId = this.parentEl.value;
      const fsPath = this.fsPathEl.value.trim();
      const maxCards = Number(this.maxEl.value || 500);
      this.onCreate?.({ name, parentId, fsPath, maxCards });
    });

    this.browseEl?.addEventListener("click", () => this.pickDirectory());
    this.nameEl?.addEventListener("input", () => this.syncSuggestedPath());
    this.parentEl?.addEventListener("change", () => {
      this.manualPathOverride = false;
      this.syncSuggestedPath({ force: true });
    });
    this.fsPathEl?.addEventListener("input", () => {
      if (this.syncingSuggestedPath) return;
      const nextValue = this.fsPathEl.value.trim();
      if (!nextValue) {
        this.manualPathOverride = false;
        this.syncSuggestedPath({ force: true });
        return;
      }
      this.manualPathOverride = nextValue !== this.suggestedFsPath;
    });
  }

  async pickDirectory() {
    const defaultPath = this.fsPathEl.value.trim();

    if (this.pickDirectoryImpl) {
      this.onStatus("正在打开目录选择器...", "ok");
      try {
        const picked = await this.pickDirectoryImpl({ defaultPath });
        if (picked?.path) {
          this.manualPathOverride = true;
          this.suggestedFsPath = picked.path;
          this.fsPathEl.value = picked.path;
          this.onStatus(
            picked.source === "tauri" ? "已通过桌面选择器选择目录" : "已选择目录（浏览器降级模式）",
            "ok"
          );
        } else {
          this.onStatus("未选择目录", "warn");
        }
        return;
      } catch (error) {
        this.onStatus(`目录选择失败：${String(error?.message || error)}`, "bad");
        return;
      }
    }

    const selected = prompt("请输入目录路径（原型降级模式）", defaultPath || "");
    if (selected) {
      this.manualPathOverride = true;
      this.suggestedFsPath = selected.trim();
      this.fsPathEl.value = selected.trim();
    }
  }

  setOptions(folderOptions) {
    this.parentEl.innerHTML = folderOptions
      .map(
        (folder) =>
          `<option value="${escapeHtml(folder.id)}" data-fs-path="${escapeHtml(folder.fsPath || "")}">${escapeHtml(folder.name)}</option>`
      )
      .join("");
  }

  open(defaultParentId, defaultFsPath = "") {
    this.nameEl.value = "";
    this.maxEl.value = "500";
    if (defaultParentId) this.parentEl.value = defaultParentId;
    this.manualPathOverride = false;
    this.syncSuggestedPath({ force: true, fallbackBasePath: defaultFsPath });
    this.maskEl.classList.remove("hidden");
    this.nameEl.focus();
  }

  hide() {
    this.maskEl.classList.add("hidden");
  }

  selectedParentPath() {
    const option = this.parentEl?.selectedOptions?.[0];
    return String(option?.dataset?.fsPath || "").trim();
  }

  syncSuggestedPath(options = {}) {
    const fallbackBasePath = String(options?.fallbackBasePath || "").trim();
    const parentPath = this.selectedParentPath() || fallbackBasePath;
    const nextPath = joinSuggestedPath(parentPath, this.nameEl?.value || "");
    this.suggestedFsPath = nextPath;
    if (this.manualPathOverride && !options?.force) return;
    this.syncingSuggestedPath = true;
    this.fsPathEl.value = nextPath;
    this.syncingSuggestedPath = false;
  }
}
