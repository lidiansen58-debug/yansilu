export function createRelationEntryRuntimeController(depsProvider = () => ({})) {
  function openNoteRelationEditor(noteId = "", options = {}) {
    const {
      state = {},
      editor = null,
      activateModule = () => {},
      openNoteById = () => false,
      windowRef = typeof window !== "undefined" ? window : null
    } = depsProvider() || {};
    const cleanNoteId = String(noteId || "").trim();
    if (!cleanNoteId) return false;
    activateModule("explorer");
    const opened = openNoteById(cleanNoteId, { preferTitleSelection: false });
    if (!opened) return false;
    state.inspectorVisible = true;
    editor?.setInspectorVisible?.(true);
    editor?.renderRelated?.();
    windowRef?.setTimeout?.(() => {
      editor?.openPermanentRelationWorkspace?.({
        mode: options.mode || "",
        targetNoteId: options.targetNoteId || "",
        relationType: options.relationType || "",
        rationaleDraft: options.rationaleDraft || "",
        insightQuestionDraft: options.insightQuestionDraft || ""
      });
    }, 60);
    return true;
  }

  return { openNoteRelationEditor };
}
