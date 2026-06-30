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
    noteSaveFailureFeedback = (error) => ({ statusMessage: String(error?.message || error), statusTone: "bad" }),
    clearSaveAiSuggestion = () => {},
    renderAll = () => {}
  } = deps;

  const noteId = payload.noteId || (state.tabs || []).find((tab) => tab.id === state.activeTabId)?.noteId || null;
  let savedNote = null;
  let noteForExplorerSync = null;
  if (noteId) {
    const note = (state.notes || []).find((item) => item.id === noteId);
    if (note && payload.title) {
      note.title = payload.title;
      note.body = replaceFirstMarkdownTitle(note.body, payload.title);
      const tab = (state.tabs || []).find((item) => item.noteId === note.id);
      if (tab) {
        tab.title = note.title;
        tab.body = note.body;
        if (state.activeTabId === tab.id) editor?.fillEditorFromTab?.();
      }
    }
    if (note) {
      noteForExplorerSync = note;
      try {
        if (typeof payload.body === "string") note.body = payload.body;
        if (typeof payload.title === "string") note.title = payload.title || note.title;
        note.generatedOriginalNoteId = noteGeneratedOriginalNoteId(note) || generatedOriginalNoteIdFromBody(note.body);
        const resolvedStatus =
          String(payload.status || "").trim() ||
          (payload.originalityStatus === "pass" ? "active" : note.status || "draft");
        note.status = resolvedStatus;
        const updated = await updateNote(note.id, {
          title: note.title,
          body: note.body,
          status: resolvedStatus,
          ...notePersistenceFieldsForSave(note),
          originalityStatus: payload.originalityStatus,
          originalitySimilarity: payload.originalitySimilarity,
          authorship: isPermanentLikeNote(note) ? note.authorship : undefined
        });
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
        setStatus("已同步到 Markdown", "ok");
        const suggestion = showSaveAiSuggestionForNote(note);
        syncSourcePromotionSystemMessageForNote(note, suggestion);
        editor?.clearDraft?.(note.id);
        if (state.module === "graph") await refreshDirectoryGraph();
      } catch (error) {
        const feedback = noteSaveFailureFeedback(error);
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
