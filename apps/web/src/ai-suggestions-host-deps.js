import { openAiSuggestionTargetNote } from "./ai-suggestion-note-opening.js";

export function createAiSuggestionsWorkspaceHostDeps(deps = {}) {
  const {
    settingsState = { ai: {} },
    aiSuggestionFiltersFromUi = () => settingsState.ai?.suggestionFilters || {},
    refreshAiSuggestions = async () => {},
    loadAiSuggestionDetail = async () => {},
    applyAiSuggestionStatus = async () => {},
    render = () => {},
    setStatus = () => {}
  } = deps;

  return {
    settingsAiState: settingsState.ai,
    getFilters: aiSuggestionFiltersFromUi,
    refreshAiSuggestions,
    loadAiSuggestionDetail,
    applyAiSuggestionStatus,
    render,
    openTargetNote: noteId => openAiSuggestionTargetNote(deps, noteId),
    refreshStatusMessage: "AI 建议已刷新",
    setStatus
  };
}
