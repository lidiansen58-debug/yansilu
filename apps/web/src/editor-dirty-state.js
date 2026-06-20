import { escapeHtml } from "./editor-render-utils.js";
import { typeFromFolder } from "./prototype-store.js";
import {
  authorshipSeedFromBody,
  normalizedBodyTextForDirtyCheck,
  normalizedNoteTitleText,
  noteUsesPlaceholderTitle,
  reflectionQuestionsHint,
  titleFromBody
} from "./editor-template-workspace.js";
import {
  normalizeDistillationTemplateVariants,
  normalizeRelationTemplateVariants,
  noteTypeGlyph
} from "./editor-relation-helpers.js";

const AUTO_SAVE_IDLE_MS = 15000;
const AUTO_SAVE_INTERVAL_MS = 15000;

function saveIconMarkup(kind = "idle") {
  if (kind === "saving") {
    return `
      <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="1.1" fill="currentColor"/>
        <circle cx="3.75" cy="8" r="1.1" fill="currentColor" opacity=".72"/>
        <circle cx="12.25" cy="8" r="1.1" fill="currentColor" opacity=".72"/>
      </svg>
    `;
  }
  if (kind === "error") {
    return `
      <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3.1v5.3M8 11.45h.01" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.2"/>
      </svg>
    `;
  }
  if (kind === "blocked") {
    return `
      <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <path d="M4.3 11.7l7.4-7.4" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
      </svg>
    `;
  }
  if (kind === "saved") {
    return `
      <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.3 8.35l2.55 2.55 6.1-6.1" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
  return `
    <svg class="tb-svg" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.75v7.15M5.25 7.3L8 10.05 10.75 7.3M3.25 12.25h9.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function normalizedThinkingStatus(value = null) {
  if (!value || typeof value !== "object") return null;
  const label = String(value.label || "").trim();
  const nextAction = String(value.nextAction || "").trim();
  if (!label && !nextAction) return null;
  return {
    status: String(value.status || "").trim(),
    label,
    nextAction,
    targetField: String(value.targetField || "").trim(),
    severity: String(value.severity || "next").trim() || "next"
  };
}

function thinkingStatusTone(thinkingStatus = null) {
  const severity = String(thinkingStatus?.severity || "").trim().toLowerCase();
  if (severity === "ready") return "ready";
  if (String(thinkingStatus?.status || "").startsWith("ready_")) return "ready";
  return "next";
}




const editorPaneStateMethods = {
  defaultSaveUiState(tab = null) {
    if (!tab) return { mode: "idle", message: "" };
    return {
      mode: tab.dirty ? "dirty" : "saved",
      message: tab.dirty ? "" : ""
    };
  },

  ensureTabSaveUiState(tab) {
    if (!tab) return this.defaultSaveUiState();
    if (!tab.saveUiState || typeof tab.saveUiState !== "object") {
      tab.saveUiState = this.defaultSaveUiState(tab);
    }
    return tab.saveUiState;
  },

  activeSaveUiState() {
    const tab = this.activeTab();
    if (!tab) return this.saveUiState || this.defaultSaveUiState();
    return this.ensureTabSaveUiState(tab);
  },

  dirtyTabs() {
    return this.state.tabs.filter((t) => t.dirty);
  },

  hasDirtyTabs() {
    return this.dirtyTabs().length > 0;
  },

  confirmDiscardTab(tab) {
    if (!tab?.dirty) return true;
    return window.confirm(`“${tab.title || "未命名笔记"}”还有未同步的修改，关闭后会丢失这些更改。是否继续？`);
  },

  confirmDiscardDirtyTabs(message = "") {
    const dirty = this.dirtyTabs();
    if (!dirty.length) return true;
    const text =
      message ||
        `还有 ${dirty.length} 个打开的笔记带着未同步的修改，继续操作会丢失这些更改。是否继续？`;
    return window.confirm(text);
  },

  draftKey(noteId) {
    return `yansilu:draft:${noteId}`;
  },

  templatePreferenceKey(kind = "") {
    const cleanKind = String(kind || "").trim().toLowerCase();
    return `yansilu:template-variant:${cleanKind || "default"}`;
  },

  readTemplateVariantPreference(kind = "", variants = [], fallback = "") {
    const normalized =
      kind === "distillation"
        ? normalizeDistillationTemplateVariants(variants, fallback)
        : normalizeRelationTemplateVariants(variants, fallback);
    if (!normalized.items.length) return "";
    const rawFallback = String(fallback || "").trim();
    try {
      const stored = String(window.localStorage?.getItem(this.templatePreferenceKey(kind)) || "").trim();
      if (stored && normalized.items.some((variant) => variant.key === stored)) return stored;
    } catch {}
    return normalized.items.some((variant) => variant.key === rawFallback) ? rawFallback : normalized.selectedKey;
  },

  writeTemplateVariantPreference(kind = "", key = "") {
    const cleanKind = String(kind || "").trim().toLowerCase();
    const cleanKey = String(key || "").trim();
    if (!cleanKind || !cleanKey) return;
    try {
      window.localStorage?.setItem(this.templatePreferenceKey(cleanKind), cleanKey);
    } catch {}
  },

  clearTemplateVariantPreference(kind = "") {
    const cleanKind = String(kind || "").trim().toLowerCase();
    if (!cleanKind) return;
    try {
      window.localStorage?.removeItem(this.templatePreferenceKey(cleanKind));
    } catch {}
  },

  templateVariantPreferenceMeta(kind = "", variants = []) {
    const cleanKind = String(kind || "").trim().toLowerCase();
    const items =
      cleanKind === "distillation"
        ? normalizeDistillationTemplateVariants(variants, "").items
        : normalizeRelationTemplateVariants(variants, "").items;
    if (!items.length) return { key: "", label: "" };
    try {
      const stored = String(window.localStorage?.getItem(this.templatePreferenceKey(cleanKind)) || "").trim();
      if (!stored) return { key: "", label: "" };
      const matched = items.find((variant) => variant.key === stored);
      return matched ? { key: matched.key, label: matched.label } : { key: "", label: "" };
    } catch {
      return { key: "", label: "" };
    }
  },

  applyTemplatePreferenceClear(kind = "", button = null) {
    const cleanKind = String(kind || "").trim().toLowerCase();
    if (!cleanKind) return;
    this.clearTemplateVariantPreference(cleanKind);
    const memory = button?.closest?.("[data-template-memory]");
    if (memory) memory.remove();
    if (cleanKind === "relation" && this.relationPanelState) {
      this.relationPanelState.rememberedTemplateVariantLabel = "";
    }
    if (cleanKind === "distillation" && this.distillationPrefillState) {
      this.distillationPrefillState.rememberedTemplateVariantLabel = "";
    }
    this.onStatus(`已清除${cleanKind === "distillation" ? "边界模板" : "关系模板"}偏好，下次会按任务默认视角打开`, "ok");
  },

  readDraft(noteId) {
    try {
      const raw = window.localStorage?.getItem(this.draftKey(noteId));
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft.body !== "string") return null;
      return draft;
    } catch {
      return null;
    }
  },

  writeDraft(tab) {
    if (!tab?.noteId || !tab.dirty) return;
    const note = this.state.notes.find((item) => item.id === tab.noteId) || null;
    const authorshipState = this.ensureTabAuthorshipState(tab, note);
    try {
      window.localStorage?.setItem(
        this.draftKey(tab.noteId),
        JSON.stringify({
          noteId: tab.noteId,
          title: tab.title,
          body: tab.body,
          savedTitle: tab.savedTitle,
          savedBody: tab.savedBody,
          authorshipClaim: authorshipState.claim,
          authorshipConfirmed: authorshipState.confirmed,
          authorshipConfirmedBody: authorshipState.confirmedBody,
          updatedAt: new Date().toISOString()
        })
      );
    } catch {}
  },

  clearDraft(noteId) {
    if (!noteId) return;
    try {
      window.localStorage?.removeItem(this.draftKey(noteId));
    } catch {}
  },

  clearAutoSaveTimer() {
    if (!this.autoSaveTimer) return;
    clearTimeout(this.autoSaveTimer);
    clearInterval(this.autoSaveTimer);
    this.autoSaveTimer = null;
  },

  scheduleAutoSave() {
    this.clearAutoSaveTimer();
    const tab = this.activeTab();
    if (!tab?.dirty) return;
    const kickoff = () => {
      if (!this.activeTab()?.dirty) return;
      void this.autoSaveActiveNote("interval");
    };
    this.autoSaveTimer = setInterval(kickoff, AUTO_SAVE_INTERVAL_MS);
    setTimeout(kickoff, AUTO_SAVE_IDLE_MS);
  },

  async autoSaveActiveNote(trigger = "idle") {
    const tab = this.updateActiveTabFromEditor();
    if (!tab?.dirty) return true;
    if (this.savingPromise) return false;
    try {
      await this.saveActiveNote({ autoSave: true, trigger });
      return true;
    } catch {
      return false;
    }
  },

  maybeRestoreDraft(tab, note) {
    if (!tab || !note || tab.dirty) return;
    const draft = this.readDraft(note.id);
    if (!draft || draft.body === note.body) {
      this.clearDraft(note.id);
      return;
    }
    const updatedAt = draft.updatedAt ? `（${new Date(draft.updatedAt).toLocaleString()}）` : "";
    const shouldRestore = window.confirm(`检测到“${note.title || "未命名笔记"}”有上次未完成的编辑内容${updatedAt}，是否恢复？`);
    if (!shouldRestore) {
      this.clearDraft(note.id);
      return;
    }
    tab.body = draft.body;
    tab.title = titleFromBody(draft.body);
    tab.savedBody = note.body || "";
    tab.savedTitle = note.title || "未命名笔记";
    tab.dirty = true;
    tab.authorshipState = {
      claim: String(draft.authorshipClaim || authorshipSeedFromBody(draft.body)),
      confirmed: Boolean(draft.authorshipConfirmed),
      confirmedBody: String(draft.authorshipConfirmedBody || "")
    };
    this.syncPlaceholderTitleArmed(tab);
    tab.saveUiState = this.defaultSaveUiState(tab);
    this.onStatus("已恢复上次未完成的编辑内容", "warn");
  },

  syncTabMetadataFromNote(noteId) {
    const tab = this.state.tabs.find((item) => item.noteId === noteId);
    const note = this.state.notes.find((item) => item.id === noteId);
    if (!tab || !note || tab.dirty) return;
    tab.authorshipState = this.defaultAuthorshipState(note);
    tab.saveUiState = this.defaultSaveUiState(tab);
  },

  openNoteTab(noteId, options = {}) {
    const n = this.state.notes.find((x) => x.id === noteId);
    if (!n) return;
    this.closeTransientPanels({ closeInspector: true });
    const tabId = `tab_${noteId}`;
    let t = this.state.tabs.find((x) => x.id === tabId);
    if (!t) {
      t = {
        id: tabId,
        noteId: n.id,
        title: n.title,
        body: n.body,
        savedTitle: n.title,
        savedBody: n.body,
        dirty: false,
        authorshipState: this.defaultAuthorshipState(n),
        saveUiState: this.defaultSaveUiState({ dirty: false }),
        placeholderTitleArmed: noteUsesPlaceholderTitle(titleFromBody(n.body))
      };
      this.state.tabs.push(t);
      this.maybeRestoreDraft(t, n);
      this.syncPlaceholderTitleArmed(t);
    }
    t.preferPlainEditor = options.preferPlainEditor === true;
    if (typeof t.savedBody !== "string") t.savedBody = t.body || "";
    if (typeof t.savedTitle !== "string") t.savedTitle = t.title || "未命名笔记";
    if (typeof t.dirty !== "boolean") t.dirty = false;
    this.ensureTabSaveUiState(t);
    this.pendingEditorFocus = options.preferTitleSelection ? "select-placeholder-title" : "focus-editor";
    this.state.activeTabId = tabId;
    this.fillEditorFromTab();
  },

  closeTab(tabId) {
    const idx = this.state.tabs.findIndex((t) => t.id === tabId);
    if (idx < 0) return;
    const tab = this.state.tabs[idx];
    this.clearAutoSaveTimer();
    if (!this.confirmDiscardTab(tab)) return false;
    this.clearDraft(tab.noteId);
    this.state.tabs.splice(idx, 1);
    if (this.state.activeTabId === tabId) {
      this.state.activeTabId = this.state.tabs[idx]?.id || this.state.tabs[idx - 1]?.id || null;
    }
    this.fillEditorFromTab();
    this.onStateChange("switch-tab");
    return true;
  },

  closeAllTabs() {
    this.clearAutoSaveTimer();
    if (!this.confirmDiscardDirtyTabs()) return false;
    for (const tab of this.dirtyTabs()) this.clearDraft(tab.noteId);
    this.state.tabs = [];
    this.state.activeTabId = null;
    this.fillEditorFromTab();
    this.onStateChange("switch-tab");
    return true;
  },

  renderTabs() {
    const newNoteLabel = this.currentNewNoteLabel();
    const tabsHtml = this.state.tabs
      .map((t) => {
        const note = this.state.notes.find((n) => n.id === t.noteId);
        const noteType = this.resolvedNoteType(note) || typeFromFolder(this.state, note?.folderId || "");
        return `
      <div class="tab ${t.id === this.state.activeTabId ? "active" : ""} ${t.dirty ? "dirty" : ""}" data-tab="${t.id}" title="${t.title}">
        <span class="tab-main">
          <span class="tab-kind" aria-hidden="true">${noteTypeGlyph(noteType)}</span>
          <span class="tab-dirty" aria-hidden="true">${t.dirty ? "●" : ""}</span>
          <span class="tab-title">${t.title}</span>
        </span>
        <button class="tab-close" data-close-tab="${t.id}" aria-label="关闭">×</button>
      </div>
    `;
      })
      .join("");

    const menuItems = this.state.tabs.length
      ? this.state.tabs
          .map(
            (t) => {
              const note = this.state.notes.find((n) => n.id === t.noteId);
              const noteType = this.resolvedNoteType(note) || typeFromFolder(this.state, note?.folderId || "");
              return `<button class="tab-menu-item ${t.id === this.state.activeTabId ? "active" : ""}" data-switch-tab="${t.id}">
                <span class="tab-menu-item-shell">
                  <span class="tab-menu-item-main">
                    <span class="tab-menu-kind" aria-hidden="true">${noteTypeGlyph(noteType)}</span>
                    <span class="tab-menu-item-title">${t.title}</span>
                  </span>
                  <span>
                    ${t.dirty ? `<span class="tab-menu-item-note">编辑中</span>` : ""}
                    ${t.id === this.state.activeTabId ? `<span class="tab-menu-item-check">当前</span>` : ""}
                  </span>
                </span>
              </button>`;
            }
          )
          .join("")
      : "";

    this.els.tabs.innerHTML = `
      <div class="tabs-shell">
        <div class="tabs-list">${tabsHtml || `<div class="tab active welcome-tab" data-tab="welcome"><span class="tab-title">${newNoteLabel}</span></div>`}</div>
        <div class="tabs-actions">
          <button class="tab-act" data-tabs-action="new" title="${newNoteLabel}" aria-label="${newNoteLabel}">+</button>
        </div>
      </div>
      <div class="tab-menu hidden" data-tab-menu>
        <button class="tab-menu-item" data-tabs-action="close-all">全部关闭</button>
        <div class="tab-menu-sep"></div>
        ${menuItems}
      </div>
    `;
    this.renderEmptyEditorState();
    this.onChromeChange();
  },

  currentNewNoteLabel() {
    const type = typeFromFolder(this.state, this.state.selectedFolderId || this.state.browserRootId || "");
    if (type === "literature") return "新建文摘笔记";
    if (type === "fleeting") return "新建随笔";
    return "新建永久笔记";
  },

  renderEmptyEditorState() {
    const empty = !this.activeTab();
    const panel = this.els.markdownSplit?.closest?.(".md-panel");
    panel?.classList.toggle("editor-empty", empty);
    this.els.emptyStart?.classList.add("hidden");
  },

  requestCreateNoteFromEmptyState() {
    if (this.activeTab() || this.creatingEmptyNote) return false;
    this.creatingEmptyNote = true;
    Promise.resolve(this.onStateChange("create-note-in-selected-folder")).finally(() => {
      this.creatingEmptyNote = false;
    });
    return true;
  },

  fillEditorFromTab() {
    const t = this.activeTab();
    if (!t) {
      this.lastFilledNoteId = "";
      this.setEditorValue("");
      this.renderEmptyEditorState();
      this.els.result.innerHTML = "";
      this.setInspectorVisible(false);
      this.renderLiteratureWorkspace();
      this.renderPreview();
      this.renderPreviewVisibility();
      this.renderSaveHint();
      return;
    }
    this.ensureTabAuthorshipState(t, this.activeNote());
    const activeNote = this.activeNote();
    const activeNoteId = String(activeNote?.id || "").trim();
    const forcedSourceNoteId = String(this.state.forcedSourcePreviewNoteId || "").trim();
    const preferPlainEditor = t.preferPlainEditor === true;
    if (this.isOriginalNote(activeNote) && forcedSourceNoteId && forcedSourceNoteId !== activeNoteId && this.isSourceMode()) {
      this.state.previewMode = "wysiwyg";
      this.state.forcedSourcePreviewNoteId = "";
    } else if (this.isOriginalNote(activeNote) && forcedSourceNoteId === activeNoteId) {
      this.state.forcedSourcePreviewNoteId = "";
    }
    if (preferPlainEditor && this.isSourceMode() && !forcedSourceNoteId) {
      this.state.previewMode = "wysiwyg";
    }
    t.preferPlainEditor = false;
    this.lastFilledNoteId = activeNoteId;
    this.renderEmptyEditorState();
    this.setEditorValue(t.body || "");
    this.renderLiteratureWorkspace();
    this.renderRelated();
    this.renderPreview();
    this.renderPreviewVisibility();
    this.renderInspectorVisibility();
    this.renderSaveHint();
    this.updateToolbarFormattingState();
    this.applyPendingEditorFocus();
  },

  updateActiveTabFromEditor() {
    const t = this.activeTab();
    if (!t) return null;
    t.body = this.getEditorValue();
    t.title = titleFromBody(t.body);
    this.syncPlaceholderTitleArmed(t);
    this.syncTabDirtyState(t);
    return t;
  },

  syncPlaceholderTitleArmed(tab) {
    if (!tab) return false;
    tab.placeholderTitleArmed = !this.isStructuredWorkspaceActive() && noteUsesPlaceholderTitle(tab.title || titleFromBody(tab.body));
    return tab.placeholderTitleArmed;
  },

  syncTabDirtyState(tab) {
    if (!tab) return;
    const savedBody = normalizedBodyTextForDirtyCheck(tab.savedBody);
    const currentBody = normalizedBodyTextForDirtyCheck(tab.body);
    const savedTitle = normalizedNoteTitleText(tab.savedTitle);
    const currentTitle = normalizedNoteTitleText(tab.title);
    tab.dirty = savedBody !== currentBody || savedTitle !== currentTitle;
  },

  tabBodyChangedSinceSnapshot(tab, bodySnapshot = "") {
    return normalizedBodyTextForDirtyCheck(tab?.body) !== normalizedBodyTextForDirtyCheck(bodySnapshot);
  },

  renderSaveHint() {
    this.renderThinkingStatus();
    const tab = this.activeTab();
    if (!tab) {
      if (this.els.statusHint) this.els.statusHint.textContent = "";
      this.renderSaveButton();
      this.renderCompleteButton();
      this.renderRecordPermanentButton();
      this.renderRelationToolbarButtons();
      this.renderAuthorshipPanel();
      return;
    }
    const note = this.activeNote();
    const saveUiState = this.activeSaveUiState();
    if (this.isOriginalNote(note)) {
      if (this.els.statusHint && saveUiState?.mode === "blocked") {
        this.els.statusHint.textContent = reflectionQuestionsHint(saveUiState.message || "当前修改被拦下了。");
      } else if (this.els.statusHint) {
        this.els.statusHint.textContent = "";
      }
    } else if (this.els.statusHint && saveUiState?.mode === "blocked") {
      this.els.statusHint.textContent = reflectionQuestionsHint(saveUiState.message || "当前修改被拦下了。");
    } else if (this.els.statusHint) {
      this.els.statusHint.textContent = "";
    }
    this.renderSaveButton();
    this.renderCompleteButton();
    this.renderRecordPermanentButton();
    this.renderRelationToolbarButtons();
    this.renderLiteratureWorkspace();
    this.renderAuthorshipPanel();
  },

  renderThinkingStatus() {
    const el = this.els.editorThinkingStatus;
    if (!el) return;
    const thinkingStatus = normalizedThinkingStatus(this.activeNote()?.thinkingStatus);
    el.classList.add("hidden");
    el.innerHTML = "";
    el.dataset.tone = "";
    if (String(this.lastBottomNoticeKey || "").startsWith("thinking:")) {
      this.hideBottomNotice();
    }
    if (!thinkingStatus) {
      this.lastThinkingStatusNoticeKey = "";
      return;
    }
    const label = thinkingStatus.label || "下一步";
    const nextAction = thinkingStatus.nextAction || "继续完善当前笔记。";
    el.dataset.tone = thinkingStatusTone(thinkingStatus);
    el.classList.remove("hidden");
    el.innerHTML = `
      <span class="thinking-status-chip">${escapeHtml(label)}</span>
      ${nextAction ? `<span class="thinking-status-next">${escapeHtml(nextAction)}</span>` : ""}
    `;
    this.lastThinkingStatusNoticeKey = "";
  },

  renderAuthorshipPanel() {
    return;
  },

  renderInspectorVisibility() {
    const visible = Boolean(this.state.inspectorVisible);
    this.els.editorWrap?.classList.toggle("inspector-closed", !visible);
    this.els.relatedPanel?.classList.toggle("hidden", !visible);
    if (this.els.showRelated) {
      this.els.showRelated.classList.toggle("active", visible);
      this.els.showRelated.dataset.tip = visible ? "收起关联侧栏" : "展开关联侧栏";
      this.els.showRelated.title = visible ? "收起关联侧栏" : "展开关联侧栏";
    }
    if (this.els.hideRelated) {
      this.els.hideRelated.classList.toggle("active", visible);
      this.els.hideRelated.textContent = visible ? "收起" : "展开";
      this.els.hideRelated.title = visible ? "收起关联侧栏" : "展开关联侧栏";
    }
  },

  setInspectorVisible(nextVisible) {
    this.state.inspectorVisible = Boolean(nextVisible);
    this.renderInspectorVisibility();
  },

  toggleInspector(forceValue = null) {
    const nextVisible = typeof forceValue === "boolean" ? forceValue : !this.state.inspectorVisible;
    this.setInspectorVisible(nextVisible);
    if (nextVisible) this.renderRelated();
  },

  setFocusMode(enabled) {
    if (enabled) {
      this.closeLinkPicker();
      this.closeTagPicker();
      this.setInspectorVisible(false);
    }
    this.renderInspectorVisibility();
    this.focusEditor();
  },

  renderSaveButton() {
    const button = this.els.save;
    if (!button) return;
    const tab = this.activeTab();
    const saveUiState = this.activeSaveUiState();
    const mode = saveUiState?.mode || "idle";

    button.classList.add("hidden");
    button.setAttribute("aria-hidden", "true");
    button.classList.remove("is-dirty", "is-saving", "is-saved", "is-error", "is-blocked");
    button.removeAttribute("aria-busy");

    const setIcon = (kind) => {
      button.innerHTML = saveIconMarkup(kind);
    };

    if (!tab) {
      button.disabled = true;
      setIcon("idle");
      button.dataset.tip = "请先打开一个笔记";
      button.title = "请先打开一个笔记";
      return;
    }

    button.disabled = mode === "saving";
    if (mode === "saving") {
      button.classList.add("is-saving");
      button.setAttribute("aria-busy", "true");
      setIcon("saving");
      button.dataset.tip = "正在同步到本地 Markdown...";
      button.title = "正在同步到本地 Markdown...";
      return;
    }

    if (mode === "error") {
      button.classList.add("is-error");
      setIcon("error");
      button.dataset.tip = saveUiState.message || "同步失败，请重试";
      button.title = saveUiState.message || "同步失败，请重试";
      return;
    }

    if (mode === "blocked") {
      button.classList.add("is-blocked");
      setIcon("blocked");
      button.dataset.tip = saveUiState.message || "原创性检测阻止同步";
      button.title = saveUiState.message || "原创性检测阻止同步";
      return;
    }

    if (tab.dirty) {
      button.classList.add("is-dirty");
      setIcon("idle");
      button.dataset.tip = "有未同步修改";
      button.title = "有未同步修改";
      return;
    }

    button.classList.add("is-saved");
    setIcon("saved");
    button.dataset.tip = "已自动同步";
    button.title = "已自动同步";
  },

  renderCompleteButton() {
    const button = this.els.completeNote;
    if (!button) return;
    button.classList.add("hidden");
    button.disabled = true;
    button.classList.remove("active");
    button.dataset.tip = "所有笔记现在都使用同一个编辑器";
    button.title = "所有笔记现在都使用同一个编辑器";
  },

  renderRecordPermanentButton() {
    const button = this.els.recordPermanent;
    if (!button) return;
    const note = this.activeNote();
    const visible = Boolean(note && this.isOriginalRecordableSource(note) && !this.hasGeneratedOriginal(note));
    button.classList.toggle("hidden", !visible);
    button.disabled = !visible;
    button.dataset.sourceNoteId = visible ? note.id : "";
    button.title = visible ? "创建永久笔记" : "当前笔记不需要创建永久笔记";
    button.dataset.tip = visible ? "创建永久笔记" : "当前笔记不需要创建永久笔记";
    button.setAttribute("aria-label", visible ? "创建永久笔记" : "当前笔记不需要创建永久笔记");
  },

  renderRelationToolbarButtons() {
    const note = this.activeNote();
    const visible = Boolean(note && this.isOriginalNote(note));
    const allowInlineInsert = visible && !this.isStructuredWorkspaceActive(note);

    if (this.els.insertLink) {
      this.els.insertLink.classList.toggle("hidden", !visible);
      this.els.insertLink.disabled = !allowInlineInsert;
      this.els.insertLink.title = visible ? "关联笔记 [[" : "只有永久笔记才能关联其他笔记";
      this.els.insertLink.dataset.tip = this.els.insertLink.title;
      this.els.insertLink.setAttribute("aria-label", visible ? "关联笔记" : "只有永久笔记才能关联其他笔记");
    }

    if (this.els.showRelated) {
      this.els.showRelated.classList.toggle("hidden", !visible);
      this.els.showRelated.disabled = !visible;
    }

    if (!visible && this.state.inspectorVisible) {
      this.setInspectorVisible(false);
    }
  }
};

export function applyEditorPaneStateMethods(EditorPaneClass) {
  Object.assign(EditorPaneClass.prototype, editorPaneStateMethods);
}
