function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class PermanentNoteDialog {
  constructor({
    maskEl,
    sourceTypeEl,
    sourceTitleEl,
    sourceHintEl,
    directorySelectEl,
    directoryHintEl,
    cancelEl,
    createEl
  }) {
    this.maskEl = maskEl;
    this.sourceTypeEl = sourceTypeEl;
    this.sourceTitleEl = sourceTitleEl;
    this.sourceHintEl = sourceHintEl;
    this.directorySelectEl = directorySelectEl;
    this.directoryHintEl = directoryHintEl;
    this.cancelEl = cancelEl;
    this.createEl = createEl;
    this.options = [];
    this.pendingResolve = null;

    this.cancelEl?.addEventListener("click", () => this.close(""));
    this.createEl?.addEventListener("click", () => this.close(this.currentDirectoryId()));
    this.directorySelectEl?.addEventListener("change", () => this.renderDirectoryHint());
    this.maskEl?.addEventListener("click", (event) => {
      if (event.target === this.maskEl) this.close("");
    });
  }

  open({
    sourceType = "",
    sourceTypeLabel = "",
    sourceTitle = "",
    sourceHint = "",
    directoryOptions = [],
    defaultDirectoryId = "",
    actionLabel = "在这个目录创建"
  } = {}) {
    if (!this.maskEl || !this.directorySelectEl) return Promise.resolve("");

    if (this.pendingResolve) {
      this.pendingResolve("");
      this.pendingResolve = null;
    }

    this.sourceTypeEl.textContent = sourceTypeLabel || "来源笔记";
    this.sourceTypeEl.dataset.sourceType = String(sourceType || "").trim().toLowerCase();
    this.sourceTitleEl.textContent = String(sourceTitle || "").trim() || "未命名笔记";
    this.sourceHintEl.textContent = sourceHint || "先选一个永久笔记盒目录，再继续创建。";
    this.createEl.textContent = actionLabel;

    this.options = Array.isArray(directoryOptions) ? directoryOptions.filter((item) => item?.id && item?.label) : [];
    this.directorySelectEl.innerHTML = this.options
      .map(
        (item) =>
          `<option value="${escapeHtml(item.id)}" data-directory-hint="${escapeHtml(item.hint || "")}">${escapeHtml(item.label)}</option>`
      )
      .join("");

    const nextDirectoryId = this.options.some((item) => item.id === defaultDirectoryId)
      ? defaultDirectoryId
      : this.options[0]?.id || "";
    this.directorySelectEl.value = nextDirectoryId;
    this.renderDirectoryHint();
    this.maskEl.classList.remove("hidden");
    this.directorySelectEl.focus();

    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  currentDirectoryId() {
    return String(this.directorySelectEl?.value || "").trim();
  }

  currentOption() {
    const directoryId = this.currentDirectoryId();
    return this.options.find((item) => item.id === directoryId) || null;
  }

  renderDirectoryHint() {
    const option = this.currentOption();
    this.createEl.disabled = !option;
    this.directoryHintEl.textContent = option?.hint || "先选一个永久笔记盒目录。";
  }

  close(result = "") {
    this.maskEl?.classList.add("hidden");
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve?.(String(result || "").trim());
  }
}
