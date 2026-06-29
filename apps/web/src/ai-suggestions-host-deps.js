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
        setStatus("杩欐潯寤鸿杩樻病鏈夋寚鍚戠洰鏍囩瑪璁?", "warn");
        return false;
      }
      activateModule("explorer");
      openNoteById(cleanNoteId, { preferTitleSelection: false });
      setStatus("宸叉墦寮€鐩爣绗旇锛屼綘鍙互缁х画瀹￠槄杩欐潯宸查噰绾崇殑鑽夌", "ok");
      return true;
    },
    refreshStatusMessage: "AI 寤鸿宸插埛鏂?",
    setStatus
  };
}
