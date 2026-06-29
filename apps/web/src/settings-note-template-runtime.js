import { buildNoteTemplateSettingsCardModel } from "./settings-template-card-model.js";

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
    writeStoredText,
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

  function persistNoteTemplateSettingsToStorage() {
    for (const kind of ["permanent", "literature"]) {
      writeStoredText(
        noteTemplateStorageKey(kind),
        normalizeNoteTemplateSource(settingsState.noteTemplates[kind].text, kind)
      );
      writeStoredText(
        noteTemplateStorageKey(kind, { suffix: "history" }),
        JSON.stringify(normalizeNoteTemplateHistory(settingsState.noteTemplates[kind].history, kind))
      );
    }
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
    note.textContent = validation.ok ? "这里会按真实笔记的样子显示。" : `当前内容还不能保存：${validation.message}`;
    body.innerHTML = validation.ok
      ? renderTemplateMarkdownPreviewHtml(applyTitleToNoteTemplate(source, copy.previewTitle, cleanKind))
      : `<div class="markdown-preview-empty">模板当前不能保存：${escapeHtml(validation.message)}</div>`;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeNoteTemplatePreview() {
    const modal = $("settingsTemplatePreviewModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function saveNoteTemplateFromEditor(kind = "") {
    const cleanKind = cleanTemplateKind(kind);
    const editorField = $(noteTemplateEditorElementId(cleanKind));
    const previousSource = normalizeNoteTemplateSource(settingsState.noteTemplates[cleanKind].text, cleanKind);
    const draftSource = String(editorField?.value || settingsState.noteTemplates[cleanKind].draftText || "").replace(/\r\n/g, "\n");
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
    if (nextSource !== previousSource) {
      settingsState.noteTemplates[cleanKind].history = noteTemplateHistoryWithPrevious(
        settingsState.noteTemplates[cleanKind].history,
        previousSource,
        cleanKind
      );
    }
    settingsState.noteTemplates[cleanKind].text = nextSource;
    settingsState.noteTemplates[cleanKind].draftText = nextSource;
    settingsState.noteTemplates[cleanKind].draftActive = false;
    settingsState.noteTemplates[cleanKind].feedbackTone = "ok";
    settingsState.noteTemplates[cleanKind].feedbackText = "已保存，新建时会使用这个模板。";
    persistNoteTemplateSettingsToStorage();
    renderSettingsPanel();
    setStatus(`${cleanKind === "literature" ? "文献笔记" : "永久笔记"}模板已保存，后续新建会采用新模板`, "ok");
  }

  function resetNoteTemplateToDefault(kind = "") {
    const cleanKind = cleanTemplateKind(kind);
    const previousSource = normalizeNoteTemplateSource(settingsState.noteTemplates[cleanKind].text, cleanKind);
    settingsState.noteTemplates[cleanKind].history = noteTemplateHistoryWithPrevious(
      settingsState.noteTemplates[cleanKind].history,
      previousSource,
      cleanKind
    );
    settingsState.noteTemplates[cleanKind].text = defaultTemplateSourceForKind(cleanKind);
    settingsState.noteTemplates[cleanKind].draftText = settingsState.noteTemplates[cleanKind].text;
    settingsState.noteTemplates[cleanKind].draftActive = false;
    settingsState.noteTemplates[cleanKind].feedbackTone = "ok";
    settingsState.noteTemplates[cleanKind].feedbackText = "已恢复默认模板。";
    persistNoteTemplateSettingsToStorage();
    renderSettingsPanel();
    setStatus(`${cleanKind === "literature" ? "文献笔记" : "永久笔记"}模板已恢复默认`, "ok");
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
