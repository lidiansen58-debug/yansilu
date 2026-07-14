import { renderAiSuggestionsPanel } from "./ai-suggestions-panel.js";
import { normalizeAiSuggestionFilters } from "./ai-suggestions-model.js";

export function renderAiSuggestionsWorkspaceView({ mount, state, renderPanel = renderAiSuggestionsPanel } = {}) {
  if (!mount) return false;
  mount.innerHTML = renderPanel({
    items: state?.suggestions,
    total: state?.suggestionsTotal,
    filters: state?.suggestionFilters,
    selectedSuggestionId: state?.selectedSuggestionId,
    detail: state?.suggestionDetail,
    detailSuggestionId: state?.suggestionDetailSuggestionId,
    detailLoading: state?.suggestionDetailLoading,
    detailError: state?.suggestionDetailError,
    loading: state?.suggestionsLoading,
    actionLoading: state?.suggestionActionLoading,
    actionSuggestionId: state?.suggestionActionSuggestionId,
    actionNoticeSuggestionId: state?.suggestionActionNoticeSuggestionId,
    actionNotice: state?.suggestionActionNotice,
    actionNoticeTone: state?.suggestionActionNoticeTone,
    actionError: state?.suggestionActionError,
    error: state?.suggestionsError,
    compact: true
  });
  return true;
}

export function aiSuggestionFiltersFromWorkspace({ getElement, state } = {}) {
  const filters = state?.suggestionFilters || {};
  return normalizeAiSuggestionFilters({
    ...filters,
    status: getElement?.("aiSuggestionStatusFilter")?.value || filters.status,
    targetType: getElement?.("aiSuggestionTargetTypeFilter")?.value || "",
    targetId: getElement?.("aiSuggestionTargetIdFilter")?.value || "",
    scope: getElement?.("aiSuggestionScopeFilter")?.value || ""
  });
}

export function aiSuggestionReviewedContentFromWorkspace({ getElement, current = {} } = {}) {
  const editorValue = getElement?.("aiSuggestionContentEditor")?.value;
  if (editorValue === undefined) return current.content;
  const raw = String(editorValue || "");
  if (typeof current.content === "string") {
    const trimmed = raw.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {}
    }
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Reviewed suggestion content must be valid JSON before it can be marked edited or confirmed");
  }
}

export async function handleAiSuggestionsWorkspaceClick(event, deps = {}) {
  const target = event?.target;
  if (!target?.closest) return false;
  const {
    settingsAiState,
    getFilters = () => settingsAiState?.suggestionFilters || {},
    refreshAiSuggestions = async () => null,
    loadAiSuggestionDetail = async () => null,
    applyAiSuggestionStatus = async () => null,
    openTargetNote = async () => null,
    setStatus = () => {},
    refreshStatusMessage = "AI suggestions refreshed"
  } = deps;

  if (target.closest("#btnAiSuggestionsApplyFilters")) {
    settingsAiState.suggestionFilters = getFilters();
    settingsAiState.selectedSuggestionId = "";
    settingsAiState.suggestionDetail = null;
    await refreshAiSuggestions();
    return true;
  }

  if (target.closest("#btnAiSuggestionsRefresh")) {
    await refreshAiSuggestions();
    setStatus(refreshStatusMessage, "ok");
    return true;
  }

  const openTargetNoteButton = target.closest("[data-ai-suggestion-open-note]");
  if (openTargetNoteButton) {
    const noteId = String(openTargetNoteButton.getAttribute("data-ai-suggestion-open-note") || "").trim();
    await openTargetNote(noteId);
    return true;
  }

  const statusButton = target.closest("[data-ai-suggestion-status]");
  if (statusButton) {
    await applyAiSuggestionStatus(
      statusButton.getAttribute("data-ai-suggestion-id"),
      statusButton.getAttribute("data-ai-suggestion-status")
    );
    return true;
  }

  const suggestionButton = target.closest("[data-ai-suggestion-id]");
  if (suggestionButton) {
    await loadAiSuggestionDetail(suggestionButton.getAttribute("data-ai-suggestion-id"));
    return true;
  }

  return false;
}

export function bindAiSuggestionsWorkspaceEvents(panel, deps = {}) {
  if (!panel?.addEventListener) return null;
  const onClick = async (event) => {
    await handleAiSuggestionsWorkspaceClick(event, deps);
  };
  panel.addEventListener("click", onClick);
  return () => panel.removeEventListener("click", onClick);
}
