import { renderAiSuggestionsPanel } from "./ai-suggestions-panel.js";
import { normalizeAiSuggestionFilters } from "./ai-suggestions-model.js";

export function normalizeVisibleSuggestionFilters(filters = {}) {
  return normalizeAiSuggestionFilters({
    ...filters,
    targetType: "",
    targetId: "",
    scope: ""
  });
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function domIdPart(value = "") {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "_");
}

function suggestionContentEditorId(suggestionId = "") {
  const cleanId = cleanText(suggestionId);
  return cleanId ? `aiSuggestionContentEditor-${domIdPart(cleanId)}` : "aiSuggestionContentEditor";
}

export function enrichAiSuggestionsWithNoteTitles(items = [], notes = []) {
  const titleById = new Map(
    (Array.isArray(notes) ? notes : [])
      .map((note) => [cleanText(note?.id), cleanText(note?.title || note?.name || note?.thesis)])
      .filter(([id, title]) => id && title)
  );
  return (Array.isArray(items) ? items : []).map((item) => {
    const targetId = cleanText(item?.target?.id);
    const existingTitle = cleanText(item?.target?.title || item?.target?.noteTitle || item?.target?.note_title || item?.target?.name);
    const title = existingTitle || titleById.get(targetId) || "";
    if (!title) return item;
    return {
      ...item,
      target: {
        ...(item.target || {}),
        title
      }
    };
  });
}

export function renderAiSuggestionsWorkspaceView({ mount, state, notes = [], renderPanel = renderAiSuggestionsPanel } = {}) {
  if (!mount) return false;
  const visibleFilters = normalizeVisibleSuggestionFilters(state?.suggestionFilters || {});
  if (state) state.suggestionFilters = visibleFilters;
  mount.innerHTML = renderPanel({
    items: enrichAiSuggestionsWithNoteTitles(state?.suggestions, notes),
    total: state?.suggestionsTotal,
    filters: visibleFilters,
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
  return normalizeVisibleSuggestionFilters({
    ...filters,
    status: getElement?.("aiSuggestionStatusFilter")?.value || filters.status,
    targetType: getElement?.("aiSuggestionTargetTypeFilter")?.value || "",
    targetId: getElement?.("aiSuggestionTargetIdFilter")?.value || "",
    scope: getElement?.("aiSuggestionScopeFilter")?.value || ""
  });
}

export function aiSuggestionReviewedContentFromWorkspace({ getElement, current = {} } = {}) {
  const editorValue =
    getElement?.(suggestionContentEditorId(current.id))?.value ??
    getElement?.("aiSuggestionContentEditor")?.value;
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
  const isSingleObjectContent = current.content && typeof current.content === "object" && !Array.isArray(current.content);
  const keys = isSingleObjectContent ? Object.keys(current.content) : [];
  try {
    const parsed = JSON.parse(raw);
    if (!isSingleObjectContent || (parsed && typeof parsed === "object" && !Array.isArray(parsed))) return parsed;
  } catch {}
  if (isSingleObjectContent) {
    if (keys.length === 1) {
      const key = keys[0];
      const previousValue = current.content[key];
      if (Array.isArray(previousValue)) {
        return { ...current.content, [key]: raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) };
      }
      if (typeof previousValue === "number") {
        const number = Number(raw);
        if (Number.isFinite(number)) return { ...current.content, [key]: number };
        throw new Error("Reviewed suggestion content must keep the original number format before it can be marked edited or confirmed");
      }
      if (typeof previousValue === "boolean") {
        const clean = raw.trim().toLowerCase();
        if (clean === "true" || clean === "false") return { ...current.content, [key]: clean === "true" };
        throw new Error("Reviewed suggestion content must keep the original true/false format before it can be marked edited or confirmed");
      }
      return { ...current.content, [key]: raw };
    }
    throw new Error("Reviewed suggestion content must be valid JSON before it can be marked edited or confirmed");
  }
  throw new Error("Reviewed suggestion content must be valid JSON before it can be marked edited or confirmed");
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
