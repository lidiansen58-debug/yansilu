import { buildNoteTemplateSettingsCardModel } from "./settings-template-card-model.js";
import { persistTemplateEntry } from "./settings-template-storage.js";
import { createTemplatePreviewFocus } from "./settings-template-preview-focus.js";

export function createSettingsNoteTemplateRuntime(deps = {}) {
  const {
    $,
    NOTE_TEMPLATE_STORAGE_KEYS = {},
    LITERATURE_TEMPLATE_SETTINGS_FIELDS,
    PERMANENT_TEMPLATE_SETTINGS_FIELDS,
    applyTitleToNoteTemplate,
    defaultTemplateSourceForKind,
    escapeHtml,
    normalizeDraftBuffer,
    normalizeNoteTemplateHistory,
    normalizeNoteTemplateSource,
    normalizeStoredNoteTemplateSource,
    noteTemplateHistoryWithPrevious,
    renderSettingsPanel,
    renderTemplateMarkdownPreviewHtml,
    settingsState,
    setStatus,
    validateLiteratureTemplateSource,
    getStorage = () => globalThis.window?.localStorage,
    currentVaultPath
  } = deps;

  function cleanTemplateKind(kind = "") {
    return String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
  }

  function noteTemplateStorageScope(vaultPath = "") {
    const cleanPath = String(vaultPath || currentVaultPath() || "").trim().replace(/\//g, "\\").toLowerCase();
    return cleanPath || "global";
  }

  function noteTemplateStorageKey(kind = "", options = {}) {
    const cleanKind = cleanTemplateKind(kind);
    const base = NOTE_TEMPLATE_STORAGE_KEYS[cleanKind];
    const suffix = String(options?.suffix || "").trim();
    const scope = noteTemplateStorageScope(options?.vaultPath || "");
    return `${base}:${scope}${suffix ? `:${suffix}` : ""}`;
  }

  function persistNoteTemplateSettingsToStorage(kind = "", entry = null) {
    for (const item of kind ? [cleanTemplateKind(kind)] : ["permanent", "literature"]) {
      const next = entry || settingsState.noteTemplates[item];
      const result = persistTemplateEntry({
        getStorage,
        key: noteTemplateStorageKey(item),
        historyKey: noteTemplateStorageKey(item, { suffix: "history" }),
        source: normalizeNoteTemplateSource(next.text, item),
        history: normalizeNoteTemplateHistory(next.history, item)
      });
      if (!result.ok) return result;
    }
    return { ok: true };
  }

  function noteTemplateFieldMeta(kind = "") {
    return cleanTemplateKind(kind) === "literature"
      ? LITERATURE_TEMPLATE_SETTINGS_FIELDS
      : PERMANENT_TEMPLATE_SETTINGS_FIELDS;
  }

  function noteTemplateCardCopy(kind = "") {
    if (cleanTemplateKind(kind) === "literature") {
      return {
        stats: ["文献模板", "普通 Markdown"],
        summaryClosed: "修改后会用于后续新建文献笔记。",
        summaryOpen: "修改后会用于后续新建文献笔记。",
        statusClosed: "待保存修改",
        statusOpen: "正在编辑",
        previewTitle: "示例文献笔记"
      };
    }
    return {
      stats: ["统一骨架", "普通 Markdown"],
      summaryClosed: "修改后会用于后续新建永久笔记。",
      summaryOpen: "修改后会用于后续新建永久笔记。",
      statusClosed: "待保存修改",
      statusOpen: "正在编辑",
      previewTitle: "示例永久笔记"
    };
  }

  function noteTemplateEditorElementId(kind = "") {
    return cleanTemplateKind(kind) === "literature"
      ? "settingsLiteratureTemplateEditor"
      : "settingsPermanentTemplateEditor";
  }

  function noteTemplateSaveButtonElementId(kind = "") {
    return cleanTemplateKind(kind) === "literature"
      ? "settingsSaveLiteratureTemplate"
      : "settingsSavePermanentTemplate";
  }

  function noteTemplateFeedbackElementId(kind = "") {
    return cleanTemplateKind(kind) === "literature"
      ? "settingsLiteratureTemplateFeedback"
      : "settingsPermanentTemplateFeedback";
  }

  function noteTemplateFeedbackTextElementId(kind = "") {
    return cleanTemplateKind(kind) === "literature"
      ? "settingsLiteratureTemplateFeedbackText"
      : "settingsPermanentTemplateFeedbackText";
  }

  function noteTemplateDraftValidation(kind = "", source = "") {
    const cleanKind = cleanTemplateKind(kind);
    if (cleanKind !== "literature") return { ok: true, message: "" };
    return validateLiteratureTemplateSource(source);
  }

  const previewFocus = createTemplatePreviewFocus({
    getModal: () => $("settingsTemplatePreviewModal"),
    getCloseButton: () => $("settingsTemplatePreviewClose"),
    close: closeNoteTemplatePreview
  });

  function openNoteTemplatePreview(kind = "") {
    const cleanKind = cleanTemplateKind(kind);
    const stateEntry = settingsState.noteTemplates?.[cleanKind];
    if (!stateEntry) return;
    const source = normalizeStoredNoteTemplateSource(
      stateEntry.draftActive ? stateEntry.draftText : stateEntry.text,
      cleanKind
    );
    const validation = noteTemplateDraftValidation(cleanKind, source);
    const copy = noteTemplateCardCopy(cleanKind);
    const modal = $("settingsTemplatePreviewModal");
    const title = $("settingsTemplatePreviewTitle");
    const note = $("settingsTemplatePreviewNote");
    const body = $("settingsTemplatePreviewBody");
    if (!modal || !title || !note || !body) return;
    title.textContent = cleanKind === "literature" ? "文献笔记模板预览" : "永久笔记模板预览";
    note.textContent = validation.ok ? "" : `当前内容还不能保存：${validation.message}`;
    note.hidden = validation.ok;
    body.innerHTML = validation.ok
      ? renderTemplateMarkdownPreviewHtml(applyTitleToNoteTemplate(source, copy.previewTitle, cleanKind))
      : `<div class="markdown-preview-empty">模板当前不能保存：${escapeHtml(validation.message)}</div>`;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    previewFocus.open();
  }

  function closeNoteTemplatePreview() {
    const modal = $("settingsTemplatePreviewModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    previewFocus.close();
  }

  function commitTemplate(kind, source, successText) {
    const entry = settingsState.noteTemplates[kind];
    const previousSource = normalizeNoteTemplateSource(entry.text, kind);
    const history = source === previousSource ? entry.history
      : noteTemplateHistoryWithPrevious(entry.history, previousSource, kind);
    const result = persistNoteTemplateSettingsToStorage(kind, { text: source, history });
    if (!result.ok) {
      entry.feedbackTone = "warn";
      entry.feedbackText = `保存失败，修改仍保留在这里：${result.message}`;
      renderSettingsPanel();
      setStatus(entry.feedbackText, "bad");
      return false;
    }
    Object.assign(entry, { text: source, draftText: source, history, draftActive: false,
      feedbackTone: "ok", feedbackText: successText });
    renderSettingsPanel();
    setStatus(successText, "ok");
    return true;
  }

  function saveNoteTemplateFromEditor(kind = "") {
    const cleanKind = cleanTemplateKind(kind);
    const editorField = $(noteTemplateEditorElementId(cleanKind));
    const draftSource = String(editorField?.value ?? settingsState.noteTemplates[cleanKind].draftText ?? "").replace(/\r\n/g, "\n");
    const nextSource = normalizeNoteTemplateSource(draftSource, cleanKind);
    if (cleanKind === "literature") {
      const validation = validateLiteratureTemplateSource(nextSource);
      if (!validation.ok) {
        settingsState.noteTemplates[cleanKind].feedbackTone = "warn";
        settingsState.noteTemplates[cleanKind].feedbackText = validation.message || "文献模板当前还不能保存。";
        renderSettingsPanel();
        setStatus(validation.message || "文献模板当前形状不受支持", "warn");
        return;
      }
    }
    return commitTemplate(cleanKind, nextSource, "已保存，新建时会使用这个模板。");
  }

  function resetNoteTemplateToDefault(kind = "") {
    const cleanKind = cleanTemplateKind(kind);
    return commitTemplate(cleanKind, defaultTemplateSourceForKind(cleanKind), "已恢复默认模板。");
  }

  function updateNoteTemplatePreviewFromEditor(kind = "") {
    const cleanKind = cleanTemplateKind(kind);
    const editorField = $(noteTemplateEditorElementId(cleanKind));
    const saveButton = $(noteTemplateSaveButtonElementId(cleanKind));
    const feedback = $(noteTemplateFeedbackElementId(cleanKind));
    const feedbackText = $(noteTemplateFeedbackTextElementId(cleanKind));
    const draftSource = normalizeDraftBuffer(editorField?.value || "");
    settingsState.noteTemplates[cleanKind].draftText = draftSource;
    settingsState.noteTemplates[cleanKind].draftActive = true;
    const validation = noteTemplateDraftValidation(cleanKind, normalizeNoteTemplateSource(draftSource, cleanKind));
    settingsState.noteTemplates[cleanKind].feedbackTone = "warn";
    settingsState.noteTemplates[cleanKind].feedbackText = validation.ok ? "有未保存修改。" : `当前内容还不能保存：${validation.message}`;
    if (feedback && feedbackText) {
      feedback.classList.add("is-visible", "warn");
      feedback.classList.remove("ok");
      feedbackText.textContent = settingsState.noteTemplates[cleanKind].feedbackText;
    }
    if (saveButton) {
      saveButton.disabled = !validation.ok;
      saveButton.title = validation.ok ? "" : validation.message;
      saveButton.dataset.tip = saveButton.title;
    }
    const headerSave = $("moduleHeaderActions")?.querySelector?.(`[data-settings-template-kind="${cleanKind}"] [data-settings-template-action="save"]`);
    if (headerSave) { headerSave.disabled = !validation.ok; headerSave.title = validation.ok ? "" : validation.message; }
  }

  function renderNoteTemplateSettingsCard(kind = "") {
    const model = buildNoteTemplateSettingsCardModel(kind, {
      stateEntry: settingsState.noteTemplates?.[cleanTemplateKind(kind)],
      defaultTemplateSourceForKind,
      noteTemplateCardCopy,
      normalizeStoredNoteTemplateSource,
      normalizeDraftBuffer,
      normalizeNoteTemplateSource,
      noteTemplateDraftValidation
    });
    const stats = $(`settings${model.capitalizedKind}TemplateStats`);
    const summary = $(`settings${model.capitalizedKind}TemplateSummary`);
    const detail = $(`settings${model.capitalizedKind}TemplateDetail`);
    const editorField = $(`settings${model.capitalizedKind}TemplateEditor`);
    const saveButton = $(noteTemplateSaveButtonElementId(model.cleanKind));
    const feedback = $(noteTemplateFeedbackElementId(model.cleanKind));
    const feedbackText = $(noteTemplateFeedbackTextElementId(model.cleanKind));
    if (stats) {
      stats.innerHTML = model.statsBadges
        .map((badge) => `<span class="settings-stat-badge ${badge.tone || ""}">${escapeHtml(badge.text)}</span>`)
        .join("");
    }
    if (summary) summary.textContent = model.summaryText;
    if (detail) detail.classList.remove("hidden");
    if (editorField && String(editorField.value || "") !== model.visibleSource) editorField.value = model.visibleSource;
    if (saveButton) {
      saveButton.disabled = model.saveDisabled;
      saveButton.title = model.saveTitle;
      saveButton.dataset.tip = saveButton.title;
    }
    if (feedback && feedbackText) {
      feedback.classList.toggle("is-visible", model.feedback.visible);
      feedback.classList.toggle("ok", model.feedback.ok);
      feedback.classList.toggle("warn", model.feedback.warn);
      feedbackText.textContent = model.feedback.text;
    }
  }

  return {
    noteTemplateCardCopy,
    noteTemplateDraftValidation,
    noteTemplateEditorElementId,
    noteTemplateFeedbackElementId,
    noteTemplateFeedbackTextElementId,
    noteTemplateFieldMeta,
    noteTemplateSaveButtonElementId,
    noteTemplateStorageKey,
    noteTemplateStorageScope,
    persistNoteTemplateSettingsToStorage,
    openNoteTemplatePreview,
    closeNoteTemplatePreview,
    saveNoteTemplateFromEditor,
    resetNoteTemplateToDefault,
    updateNoteTemplatePreviewFromEditor,
    renderNoteTemplateSettingsCard
  };
}
