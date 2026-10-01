import { saveEditorNoteWithRecovery } from "./editor-save-recovery.js";

function applyUpdatedNoteFields(note = null, updated = null, deps = {}) {
  if (!note || !updated) return;
  const {
    normalizeOptionalNumber = (value) => value,
    normalizeAuthorshipItem = (value) => value,
    normalizeThinkingStatusItem = (value) => value,
    noteGeneratedOriginalNoteId = () => "",
    generatedOriginalNoteIdFromBody = () => ""
  } = deps;

  note.title = updated.title || note.title;
  note.body = updated.body || note.body;
  note.status = updated.status || note.status;
  note.markdownPath = updated.markdownPath || note.markdownPath;
  note.fileRevision = updated.fileRevision;
  note.originalityStatus = updated.originalityStatus || note.originalityStatus;
  note.originalitySimilarity = normalizeOptionalNumber(updated.originalitySimilarity ?? note.originalitySimilarity);
  note.authorship = normalizeAuthorshipItem(updated.authorship) || note.authorship;
  note.thesis = updated.thesis || note.thesis || "";
  note.threeLineSummary = Array.isArray(updated.threeLineSummary) ? updated.threeLineSummary : note.threeLineSummary || [];
  note.distillationStatus = updated.distillationStatus || note.distillationStatus || "";
  note.thinkingStatus = normalizeThinkingStatusItem(updated.thinkingStatus) || note.thinkingStatus || null;
  note.generatedOriginalNoteId = noteGeneratedOriginalNoteId(updated) || note.generatedOriginalNoteId || generatedOriginalNoteIdFromBody(note.body);
  note.boundaryOrCounterpoint = updated.boundaryOrCounterpoint || note.boundaryOrCounterpoint || "";
  note.updatedAt = updated.updatedAt || note.updatedAt;
  note.bodyLoaded = true;
}

export async function handleSaveNoteStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    editor = null,
    saveAiSuggestion = null,
    replaceFirstMarkdownTitle = (body) => body,
    noteGeneratedOriginalNoteId = () => "",
    generatedOriginalNoteIdFromBody = () => "",
    notePersistenceFieldsForSave = () => ({}),
    isPermanentLikeNote = () => false,
    updateNote = async () => null,
    normalizeOptionalNumber = (value) => value,
    normalizeAuthorshipItem = (value) => value,
    normalizeThinkingStatusItem = (value) => value,
    syncExplorerContextToNote = () => {},
    setStatus = () => {},
    showSaveAiSuggestionForNote = () => null,
    syncSourcePromotionSystemMessageForNote = () => {},
    refreshDirectoryGraph = async () => {},
    noteSaveFailureFeedback = (error) => ({
      ok: false,
      saveMode: "error",
      saveMessage: "当前文件：保存失败，修改仍保留在编辑器中。",
      statusMessage: String(error?.message || error),
      statusTone: "bad"
    }),
    clearSaveAiSuggestion = () => {},
    renderAll = () => {}
  } = deps;

  const noteId = payload.noteId || (state.tabs || []).find((tab) => tab.id === state.activeTabId)?.noteId || null;
  if (state.noteMoveVaultSwitching || state.noteMoveVaultUncertain || state.unresolvedNoteMove?.noteId === noteId) {
    const message = state.noteMoveVaultSwitching || state.noteMoveVaultUncertain
      ? "当前笔记库尚未确认，请先重新核查，暂不能保存。" : "移动结果尚未确认，请先重新核查，此笔记暂不能保存。";
    setStatus(message, "warn", { notify: true });
    return { ok: false, saveMode: "blocked", saveMessage: message };
  }
  let savedNote = null;
  let noteForExplorerSync = null;
  if (noteId) {
    const note = (state.notes || []).find((item) => item.id === noteId);
    // An explicit body is a save snapshot; the editor may already contain newer work.
    // Only title-only actions should rewrite the live tab here.
    if (note && payload.title && typeof payload.body !== "string") {
      note.title = payload.title;
      note.body = replaceFirstMarkdownTitle(note.body, payload.title);
      const tab = (state.tabs || []).find((item) => item.noteId === note.id);
      if (tab) {
        tab.title = note.title;
        tab.body = note.body;
        if (state.activeTabId === tab.id && payload.preserveEditorFocus !== true) editor?.fillEditorFromTab?.();
      }
    }
    if (note) {
      noteForExplorerSync = note;
      try {
        if (Object.hasOwn(payload, "expectedBody") && typeof payload.expectedBody !== "string") {
          throw new Error("缺少已保存正文，请先保留当前修改，再重新打开笔记核对。");
        }
        if (typeof payload.body === "string") note.body = payload.body;
        if (typeof payload.title === "string") note.title = payload.title || note.title;
        note.generatedOriginalNoteId = noteGeneratedOriginalNoteId(note) || generatedOriginalNoteIdFromBody(note.body);
        const resolvedStatus =
          String(payload.status || "").trim() ||
          (payload.originalityStatus === "pass" ? "active" : note.status || "draft");
        note.status = resolvedStatus;
        const updated = await saveEditorNoteWithRecovery({ ...deps, updateNote }, note.id, {
          ...(Object.hasOwn(payload, "expectedBody") ? { expectedBody: payload.expectedBody } : {}),
          ...(payload.expectedRevision !== undefined ? { expectedRevision: payload.expectedRevision } : {}),
          title: note.title,
          body: note.body,
          status: resolvedStatus,
          ...notePersistenceFieldsForSave(note),
          originalityStatus: payload.originalityStatus,
          originalitySimilarity: payload.originalitySimilarity,
          authorship: isPermanentLikeNote(note) ? note.authorship : undefined
        });
        if (!updated) throw new Error("本地服务未返回保存结果，请重试。修改仍保留在编辑器中。");
        if (updated) {
          applyUpdatedNoteFields(note, updated, {
            normalizeOptionalNumber,
            normalizeAuthorshipItem,
            normalizeThinkingStatusItem,
            noteGeneratedOriginalNoteId,
            generatedOriginalNoteIdFromBody
          });
          savedNote = updated;
        }
        syncExplorerContextToNote(note);
        setStatus(updated.recoveredSave ? "已核查上次保存；当前输入不同的内容仍待同步。" : "已同步到 Markdown", updated.recoveredSave ? "warn" : "ok");
        const shouldSuppressSaveSuggestion = payload.suppressSaveAiSuggestion === true || updated.recoveredSave === true;
        if (shouldSuppressSaveSuggestion) clearSaveAiSuggestion();
        const suggestion = shouldSuppressSaveSuggestion ? null : showSaveAiSuggestionForNote(note);
        syncSourcePromotionSystemMessageForNote(note, suggestion);
        const hasUnsavedTab = (state.tabs || []).some(tab => tab.noteId === note.id && tab.dirty);
        if (!hasUnsavedTab) editor?.clearDraft?.(note.id);
        if (state.module === "graph") await refreshDirectoryGraph();
      } catch (error) {
        const feedback = error?.code === "NOTE_SAVE_CONFLICT" ? {
          ok: false, saveMode: "conflict",
          saveMessage: "笔记已在其他地方修改，本次未覆盖。当前输入仍保留，请先保留修改，再重新打开核对。",
          statusMessage: "笔记已在其他地方修改，本次未覆盖。当前输入仍保留，请先保留修改，再重新打开核对。",
          statusTone: "bad"
        } : error?.code === "NOTE_SAVE_RESULT_UNCERTAIN" ? {
          ok: false, saveMode: "uncertain", saveMessage: error.message,
          statusMessage: error.message, statusTone: "warn"
        } : noteSaveFailureFeedback(error);
        setStatus(feedback.statusMessage, feedback.statusTone);
        if (saveAiSuggestion?.noteId === note.id) clearSaveAiSuggestion();
        renderAll();
        return feedback;
      }
    }
  }
  if (noteForExplorerSync) syncExplorerContextToNote(noteForExplorerSync);
  renderAll();
  return savedNote || true;
}
