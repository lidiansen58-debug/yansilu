export function createAiSuggestionsWorkspaceHostDeps(deps = {}) {
  const {
    settingsState = { ai: {} },
    aiSuggestionFiltersFromUi = () => settingsState.ai?.suggestionFilters || {},
    refreshAiSuggestions = async () => {},
    loadAiSuggestionDetail = async () => {},
    applyAiSuggestionStatus = async () => {},
    activateModule = () => {},
    openNoteById = () => {},
    setStatus = () => {}
  } = deps;

  return {
    settingsAiState: settingsState.ai,
    getFilters: aiSuggestionFiltersFromUi,
    refreshAiSuggestions,
    loadAiSuggestionDetail,
    applyAiSuggestionStatus,
    openTargetNote: async (noteId) => {
      const cleanNoteId = String(noteId || "").trim();
      if (!cleanNoteId) {
        setStatus("这条建议还没有指向目标笔记", "warn");
        return false;
      }
      activateModule("explorer");
      openNoteById(cleanNoteId, { preferTitleSelection: false });
      setStatus("已打开目标笔记，你可以继续审阅这条已采纳的草稿", "ok");
      return true;
    },
    refreshStatusMessage: "AI 建议已刷新",
    setStatus
  };
}
