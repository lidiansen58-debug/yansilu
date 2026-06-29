import { saveAiSuggestionForNoteModel } from "./save-ai-suggestion-model.js";
import { createWorkflowReminderController } from "./workflow-reminder-controller.js";

export function createSaveAiSuggestionWorkflowRoutes(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};
  const workflowReminderController = createWorkflowReminderController(() => deps());

  function sourcePromotionWorkflowMessageForNote(note = null, suggestion = null) {
    return workflowReminderController.sourcePromotionWorkflowMessageForNote(note, suggestion);
  }

  function syncSourcePromotionSystemMessageForNote(note = null, suggestion = null) {
    return workflowReminderController.syncSourcePromotionSystemMessageForNote(note, suggestion);
  }

  function relationNetworkWorkflowMessageForNote(note = null, overview = {}) {
    return workflowReminderController.relationNetworkWorkflowMessageForNote(note, overview);
  }

  function syncRelationNetworkSystemMessageForNote(note = null, overview = {}) {
    return workflowReminderController.syncRelationNetworkSystemMessageForNote(note, overview);
  }

  function saveAiSuggestionForNote(note = null) {
    const current = deps();
    return saveAiSuggestionForNoteModel(
      note,
      {
        currentModule: current.state.module,
        activeNote: current.activeEditorNote(),
        activeBody: current.activeEditorBody()
      },
      {
        isEmptyUntitledMarkdown: current.isEmptyUntitledMarkdown,
        isOriginalRecordableSource: current.isOriginalRecordableSource,
        noteHasGeneratedOriginal: current.noteHasGeneratedOriginal,
        noteTypeForNote: (item) => String((item?.folderId ? current.typeFromFolder(current.state, item.folderId) : "") || item?.noteType || "").trim().toLowerCase(),
        isPermanentLikeNote: current.isPermanentLikeNote,
        distillationStatusOf: current.distillationStatusOf,
        saveAiSuggestionKey: current.saveAiSuggestionKey
      }
    );
  }

  function clearSaveAiSuggestion() {
    deps().setSaveAiSuggestion(null);
    renderSaveAiSuggestion();
  }

  function showSaveAiSuggestionForNote(note = null) {
    const current = deps();
    const suggestion = saveAiSuggestionForNote(note);
    if (!suggestion || current.dismissedSaveAiSuggestionKeys.has(suggestion.key)) {
      if (current.getSaveAiSuggestion()?.noteId === note?.id) clearSaveAiSuggestion();
      return null;
    }
    current.setSaveAiSuggestion(suggestion);
    renderSaveAiSuggestion();
    return suggestion;
  }

  function renderSaveAiSuggestion() {
    const current = deps();
    const root = current.$("saveAiSuggestion");
    if (!root) return;
    const text = current.$("saveAiSuggestionText");
    const primary = current.$("btnSaveAiSuggestionPrimary");
    const later = current.$("btnSaveAiSuggestionLater");
    const saveAiSuggestion = current.getSaveAiSuggestion();
    const activeNote = current.activeEditorNote();
    const visible =
      Boolean(saveAiSuggestion?.noteId) &&
      current.state.module === "explorer" &&
      activeNote?.id === saveAiSuggestion.noteId;

    root.classList.toggle("hidden", !visible);
    if (!visible) return;

    if (text) text.textContent = saveAiSuggestion.text;
    if (primary) primary.textContent = saveAiSuggestion.primaryLabel || "立即处理";
    if (later) later.textContent = saveAiSuggestion.laterLabel || "稍后";
    root.dataset.action = saveAiSuggestion.action || "";
    root.dataset.noteId = saveAiSuggestion.noteId || "";
  }

  return {
    clearSaveAiSuggestion,
    relationNetworkWorkflowMessageForNote,
    renderSaveAiSuggestion,
    saveAiSuggestionForNote,
    showSaveAiSuggestionForNote,
    sourcePromotionWorkflowMessageForNote,
    syncRelationNetworkSystemMessageForNote,
    syncSourcePromotionSystemMessageForNote
  };
}
