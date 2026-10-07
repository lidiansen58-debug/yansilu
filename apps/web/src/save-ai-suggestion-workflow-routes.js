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
  }

  function showSaveAiSuggestionForNote(note = null) {
    const current = deps();
    const suggestion = saveAiSuggestionForNote(note);
    if (!suggestion || current.dismissedSaveAiSuggestionKeys.has(suggestion.key)) {
      if (current.getSaveAiSuggestion()?.noteId === note?.id) clearSaveAiSuggestion();
      return null;
    }
    current.setSaveAiSuggestion(suggestion);
    return suggestion;
  }

  return {
    clearSaveAiSuggestion,
    relationNetworkWorkflowMessageForNote,
    saveAiSuggestionForNote,
    showSaveAiSuggestionForNote,
    sourcePromotionWorkflowMessageForNote,
    syncRelationNetworkSystemMessageForNote,
    syncSourcePromotionSystemMessageForNote
  };
}
