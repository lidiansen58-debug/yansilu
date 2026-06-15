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
    modalTitleEl,
    modalNoteEl,
    sourceCardEl,
    sourceTypeEl,
    sourceTitleEl,
    sourceHintEl,
    directoryLabelEl,
    directorySelectEl,
    directoryHintEl,
    cancelEl,
    createEl
  }) {
    this.maskEl = maskEl;
    this.modalTitleEl = modalTitleEl;
    this.modalNoteEl = modalNoteEl;
    this.sourceCardEl = sourceCardEl;
    this.sourceTypeEl = sourceTypeEl;
    this.sourceTitleEl = sourceTitleEl;
    this.sourceHintEl = sourceHintEl;
    this.directoryLabelEl = directoryLabelEl;
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
    modalTitle = "创建永久笔记",
    modalNote = "选择保存位置，然后创建永久笔记。",
    sourceType = "",
    sourceTypeLabel = "",
    sourceTitle = "",
    sourceHint = "",
    sourceCardVisible = true,
    directoryLabel = "永久笔记盒目录",
    directoryOptions = [],
    defaultDirectoryId = "",
    actionLabel = "在这个目录创建"
  } = {}) {
    if (!this.maskEl || !this.directorySelectEl) return Promise.resolve("");

    if (this.pendingResolve) {
      this.pendingResolve("");
      this.pendingResolve = null;
    }

    if (this.modalTitleEl) this.modalTitleEl.textContent = modalTitle;
    if (this.modalNoteEl) this.modalNoteEl.textContent = modalNote;
    if (this.sourceCardEl) this.sourceCardEl.hidden = !sourceCardVisible;
    this.sourceTypeEl.textContent = sourceTypeLabel || "来源笔记";
    this.sourceTypeEl.dataset.sourceType = String(sourceType || "").trim().toLowerCase();
    this.sourceTitleEl.textContent = String(sourceTitle || "").trim() || "未命名笔记";
    this.sourceHintEl.textContent = sourceHint || "把这条材料写成可长期保留的判断。";
    if (this.directoryLabelEl) this.directoryLabelEl.textContent = directoryLabel;
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
    this.directoryHintEl.textContent = option?.hint || "选择保存位置。";
  }

  close(result = "") {
    this.maskEl?.classList.add("hidden");
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve?.(String(result || "").trim());
  }
}
