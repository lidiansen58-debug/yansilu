import { renderAiInboxPanel } from "./ai-inbox-panel.js";
import { normalizeAiInboxFilters } from "./ai-inbox-model.js";

export function renderAiInboxWorkspaceView({ mount, state, renderPanel = renderAiInboxPanel } = {}) {
  if (!mount) return false;
  mount.innerHTML = renderPanel({
    ...state,
    actionError: state?.actionError,
    actionNotice: state?.actionNotice,
    actionNoticeTone: state?.actionNoticeTone
  });
  return true;
}

export function aiInboxFiltersFromWorkspace({ getElement, state } = {}) {
  const filters = state?.filters || {};
  return normalizeAiInboxFilters({
    ...filters,
    type: getElement?.("aiInboxTypeFilter")?.value || filters.type,
    sourceNoteId: getElement?.("aiInboxSourceNoteFilter")?.value || ""
  });
}

export function aiInboxFeedbackFromWorkspace(root = globalThis.document) {
  const feedback = {};
  root?.querySelectorAll?.("[data-ai-inbox-feedback]")?.forEach((input) => {
    const key = String(input.getAttribute("data-ai-inbox-feedback") || "").trim();
    if (key) feedback[key] = Boolean(input.checked);
  });
  return feedback;
}

export async function handleAiInboxWorkspaceClick(event, deps = {}) {
  const target = event?.target;
  if (!target?.closest) return false;
  const {
    aiInboxState,
    openAiInboxModule = async () => {},
    applyFiltersFromUi = async () => {},
    loadAiInboxDetail = async () => {},
    openNote = async () => {},
    recordDecision = async () => {},
    acceptLink = async () => {},
    promoteNote = async () => {},
    adoptField = async () => {},
    applySuggestionStatus = async () => {},
    runSummary = async () => {},
    applyRecommendedAction = async () => {},
    setStatus = () => {}
  } = deps;

  const viewButton = target.closest("[data-ai-inbox-view]");
  if (viewButton) {
    aiInboxState.filters = normalizeAiInboxFilters({
      ...aiInboxState.filters,
      view: viewButton.getAttribute("data-ai-inbox-view")
    });
    aiInboxState.detail = null;
    aiInboxState.selectedArtifactId = "";
    await openAiInboxModule();
    return true;
  }

  if (target.closest("#btnAiInboxApplyFilters")) {
    await applyFiltersFromUi();
    return true;
  }

  if (target.closest("#btnAiInboxRefresh")) {
    await openAiInboxModule();
    setStatus("AI 建议已刷新", "ok");
    return true;
  }

  const itemButton = target.closest("[data-ai-inbox-artifact-id]");
  if (itemButton) {
    await loadAiInboxDetail(itemButton.getAttribute("data-ai-inbox-artifact-id"));
    return true;
  }

  const noteButton = target.closest("[data-ai-inbox-open-note]");
  if (noteButton) {
    const noteId = String(noteButton.getAttribute("data-ai-inbox-open-note") || "").trim();
    if (!noteId) return true;
    await openNote(noteId);
    return true;
  }

  const decisionButton = target.closest("[data-ai-inbox-decision]");
  if (decisionButton) {
    await recordDecision(decisionButton.getAttribute("data-ai-inbox-decision"));
    return true;
  }

  const acceptLinkButton = target.closest("[data-ai-inbox-accept-link]");
  if (acceptLinkButton) {
    await acceptLink(acceptLinkButton.getAttribute("data-ai-inbox-accept-link"));
    return true;
  }

  const promoteNoteButton = target.closest("[data-ai-inbox-promote-note]");
  if (promoteNoteButton) {
    await promoteNote(promoteNoteButton.getAttribute("data-ai-inbox-promote-note"));
    return true;
  }

  const adoptFieldButton = target.closest("[data-ai-inbox-adopt-field]");
  if (adoptFieldButton) {
    await adoptField(
      adoptFieldButton.getAttribute("data-ai-inbox-adopt-field"),
      adoptFieldButton.getAttribute("data-ai-inbox-suggestion-id")
    );
    return true;
  }

  const suggestionStatusButton = target.closest("[data-ai-inbox-suggestion-status]");
  if (suggestionStatusButton) {
    await applySuggestionStatus(
      suggestionStatusButton.getAttribute("data-ai-inbox-suggestion-status"),
      suggestionStatusButton.getAttribute("data-ai-inbox-suggestion-id")
    );
    return true;
  }

  if (target.closest("#btnAiInboxSummarize")) {
    await runSummary(aiInboxState.selectedArtifactId || aiInboxState.detail?.item?.artifactId || "");
    return true;
  }

  const recommendedActionButton = target.closest("[data-ai-inbox-recommended-action]");
  if (recommendedActionButton) {
    await applyRecommendedAction(recommendedActionButton.getAttribute("data-ai-inbox-recommended-action"));
    return true;
  }

  return false;
}

export function bindAiInboxWorkspaceEvents(panel, deps = {}) {
  if (!panel?.addEventListener) return null;
  const onClick = async (event) => {
    await handleAiInboxWorkspaceClick(event, deps);
  };
  panel.addEventListener("click", onClick);
  return () => panel.removeEventListener("click", onClick);
}
