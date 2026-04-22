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
  }

  async pickDirectory() {
    const defaultPath = this.fsPathEl.value.trim();

    if (this.pickDirectoryImpl) {
      this.onStatus("正在打开目录选择器...", "ok");
      try {
        const picked = await this.pickDirectoryImpl({ defaultPath });
        if (picked?.path) {
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
    if (selected) this.fsPathEl.value = selected.trim();
  }

  setOptions(folderOptions) {
    this.parentEl.innerHTML = folderOptions.map((f) => `<option value="${f.id}">${f.name}</option>`).join("");
  }

  open(defaultParentId, defaultFsPath = "") {
    this.nameEl.value = "";
    this.fsPathEl.value = defaultFsPath;
    this.maxEl.value = "500";
    if (defaultParentId) this.parentEl.value = defaultParentId;
    this.maskEl.classList.remove("hidden");
    this.nameEl.focus();
  }

  hide() {
    this.maskEl.classList.add("hidden");
  }
}
