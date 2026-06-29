import { applyAiSuggestionStatusForRuntime } from "./ai-suggestions-runtime-controller.js";

function aiSuggestionReviewRetryNotice() {
  return "Detail changed while you were reviewing. Retry from the latest reviewed item.";
}

function aiSuggestionReviewRetryStatusMessage() {
  return "AI suggestion detail changed before the review action could run. Retry on the latest detail.";
}

function aiSuggestionAlreadyAppliedNotice(status = "") {
  return `This reviewed suggestion is already ${String(status || "").trim() || "updated"}.`;
}

function aiSuggestionReviewSafetyNotice() {
  return "Load the latest suggestion detail before running review actions.";
}

function aiSuggestionReviewSafetyStatusMessage() {
  return "AI suggestion detail is not ready yet. Retry after the latest detail loads.";
}

function aiSuggestionInFlightReviewNotice() {
  return "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion.";
}

function aiSuggestionInFlightReviewStatusMessage() {
  return "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion.";
}

function aiSuggestionAlreadyAppliedStatusMessage(status = "", suggestionId = "") {
  return `AI suggestion already ${String(status || "").trim() || "updated"}: ${String(suggestionId || "").trim()}`;
}

function aiSuggestionUpdateFailedStatusMessage(error) {
  return `AI suggestion update failed: ${String(error?.message || error)}`;
}

function aiSuggestionUpdatedStatusMessage(status = "", suggestionId = "") {
  return `AI suggestion ${String(status || "").trim() || "updated"}: ${String(suggestionId || "").trim()}`;
}

export function createAiSuggestionsActionRoutes(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};

  async function applyAiSuggestionStatus(suggestionId, status) {
    const current = deps();
    return applyAiSuggestionStatusForRuntime({
      ...current,
      messages: {
        reviewRetryNotice: aiSuggestionReviewRetryNotice,
        reviewRetryStatusMessage: aiSuggestionReviewRetryStatusMessage,
        reviewSafetyNotice: aiSuggestionReviewSafetyNotice,
        reviewSafetyStatusMessage: aiSuggestionReviewSafetyStatusMessage,
        inFlightReviewNotice: aiSuggestionInFlightReviewNotice,
        inFlightReviewStatusMessage: aiSuggestionInFlightReviewStatusMessage,
        alreadyAppliedNotice: aiSuggestionAlreadyAppliedNotice,
        alreadyAppliedStatusMessage: aiSuggestionAlreadyAppliedStatusMessage,
        updateFailedStatusMessage: aiSuggestionUpdateFailedStatusMessage,
        updatedStatusMessage: aiSuggestionUpdatedStatusMessage
      }
    }, suggestionId, status);
  }

  return {
    applyAiSuggestionStatus,
    aiSuggestionAlreadyAppliedNotice
  };
}
