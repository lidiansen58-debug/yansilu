export async function loadAiSuggestionDetailForRuntime(deps = {}, suggestionId = "") {
  const {
    aiState,
    fetchAiSuggestion,
    suggestionDetailFromResponse,
    rememberAiDebugSnapshot = () => {},
    render = () => {},
    setStatus = () => {}
  } = deps;
  const cleanSuggestionId = String(suggestionId || "").trim();
  if (!cleanSuggestionId) {
    aiState.suggestionDetailRequestToken += 1;
    aiState.selectedSuggestionId = "";
    aiState.suggestionDetail = null;
    aiState.suggestionDetailSuggestionId = "";
    aiState.suggestionDetailLoading = false;
    aiState.suggestionDetailError = "";
    aiState.suggestionActionSuggestionId = "";
    aiState.suggestionActionNoticeSuggestionId = "";
    aiState.suggestionActionNotice = "";
    aiState.suggestionActionNoticeTone = "";
    aiState.suggestionActionError = "";
    render();
    return null;
  }
  const requestToken = aiState.suggestionDetailRequestToken + 1;
  aiState.suggestionDetailRequestToken = requestToken;
  aiState.selectedSuggestionId = cleanSuggestionId;
  aiState.suggestionDetail = null;
  aiState.suggestionDetailSuggestionId = cleanSuggestionId;
  aiState.suggestionDetailLoading = true;
  aiState.suggestionDetailError = "";
  aiState.suggestionActionSuggestionId = "";
  aiState.suggestionActionNoticeSuggestionId = "";
  aiState.suggestionActionNotice = "";
  aiState.suggestionActionNoticeTone = "";
  aiState.suggestionActionError = "";
  render();
  try {
    const response = await fetchAiSuggestion(cleanSuggestionId, { canonical: true });
    const detail = suggestionDetailFromResponse(response);
    if (requestToken !== aiState.suggestionDetailRequestToken) return null;
    aiState.suggestionDetail = detail;
    rememberAiDebugSnapshot("suggestionDetail", response);
    aiState.suggestionDetailError = "";
    return detail.item;
  } catch (error) {
    if (requestToken !== aiState.suggestionDetailRequestToken) return null;
    aiState.suggestionDetailError = String(error?.message || error);
    setStatus(`AI suggestion detail failed: ${aiState.suggestionDetailError}`, "warn");
    return null;
  } finally {
    if (requestToken !== aiState.suggestionDetailRequestToken) return;
    aiState.suggestionDetailLoading = false;
    render();
  }
}

export async function refreshAiSuggestionsForRuntime(deps = {}, options = {}) {
  const {
    aiState,
    fetchAiSuggestions,
    normalizeAiSuggestionFilters,
    rememberAiDebugSnapshot = () => {},
    render = () => {},
    setStatus = () => {},
    loadDetail = (suggestionId) => loadAiSuggestionDetailForRuntime(deps, suggestionId)
  } = deps;
  const requestToken = Number(aiState.suggestionsRequestToken || 0) + 1;
  aiState.suggestionsRequestToken = requestToken;
  aiState.suggestionFilters = normalizeAiSuggestionFilters(aiState.suggestionFilters);
  if (!options.silent) {
    aiState.suggestionsLoading = true;
    aiState.suggestionsError = "";
    render();
  }
  const previousSelectedId = String(aiState.selectedSuggestionId || "").trim();
  try {
    const result = await fetchAiSuggestions({ ...aiState.suggestionFilters, canonical: true });
    if (requestToken !== aiState.suggestionsRequestToken) return null;
    aiState.suggestions = result.items;
    aiState.suggestionsTotal = result.total;
    rememberAiDebugSnapshot("suggestionsList", result);
    aiState.suggestionsError = "";
    const currentSelectedId = String(aiState.selectedSuggestionId || "").trim();
    const selectionChangedDuringRequest = currentSelectedId !== previousSelectedId;
    const currentListItem = currentSelectedId
      ? result.items.find((item) => String(item.id || "").trim() === currentSelectedId) || null
      : null;
    const previousListItem = !selectionChangedDuringRequest && previousSelectedId
      ? result.items.find((item) => String(item.id || "").trim() === previousSelectedId) || null
      : null;
    const selectedListItem = currentListItem || previousListItem;
    const selectedStillVisible = Boolean(selectedListItem);
    const nextSelectedSuggestionId = selectedStillVisible ? String(selectedListItem.id || "").trim() : "";
    const selectionChanged = nextSelectedSuggestionId !== previousSelectedId;
    const detailItem = aiState.suggestionDetail?.item || aiState.suggestionDetail || null;
    const detailMatchesSelection = String(detailItem?.id || "").trim() === previousSelectedId;
    const staleDetailWhileSelectedStillVisible =
      selectedStillVisible &&
      detailMatchesSelection &&
      Boolean(selectedListItem) &&
      (
        String(selectedListItem.status || "").trim() !== String(detailItem?.status || "").trim() ||
        String(selectedListItem.updatedAt || "").trim() !== String(detailItem?.updatedAt || "").trim() ||
        String(selectedListItem.sourceArtifactId || "").trim() !== String(detailItem?.sourceArtifactId || "").trim()
      );
    const shouldRealignSelection = !options.preserveDetail || !selectedStillVisible;
    if (shouldRealignSelection) {
      aiState.selectedSuggestionId = nextSelectedSuggestionId;
    }
    if (
      selectionChanged ||
      staleDetailWhileSelectedStillVisible ||
      (!selectedStillVisible && !shouldRealignSelection)
    ) {
      aiState.suggestionDetailRequestToken += 1;
      aiState.suggestionDetail = null;
      aiState.suggestionDetailSuggestionId = "";
      aiState.suggestionDetailLoading = false;
      aiState.suggestionDetailError = "";
      aiState.suggestionActionSuggestionId = "";
      aiState.suggestionActionNoticeSuggestionId = "";
      aiState.suggestionActionNotice = "";
      aiState.suggestionActionNoticeTone = "";
      aiState.suggestionActionError = "";
    }
    if (!aiState.selectedSuggestionId && shouldRealignSelection) {
      aiState.suggestionDetail = null;
      aiState.suggestionDetailSuggestionId = "";
    }
    const shouldHydrateSelectedDetail =
      Boolean(aiState.selectedSuggestionId) &&
      !aiState.suggestionDetail &&
      !aiState.suggestionDetailLoading;
    if (shouldHydrateSelectedDetail) {
      await loadDetail(aiState.selectedSuggestionId);
    }
    return result;
  } catch (error) {
    if (requestToken !== aiState.suggestionsRequestToken) return null;
    aiState.suggestionsError = String(error?.message || error);
    setStatus(`AI suggestions failed to load: ${aiState.suggestionsError}`, "warn");
    return null;
  } finally {
    if (requestToken !== aiState.suggestionsRequestToken) return;
    aiState.suggestionsLoading = false;
    render();
  }
}

export async function applyAiSuggestionStatusForRuntime(deps = {}, suggestionId = "", status = "") {
  const {
    aiState,
    suggestionDetailFromResponse,
    aiSuggestionReviewedContent,
    updateAiSuggestion,
    refreshAiSuggestions,
    loadAiSuggestionDetail,
    rememberAiDebugSnapshot = () => {},
    setStatus = () => {},
    render = () => {},
    aiSuggestionStatusLabel,
    messages = {}
  } = deps;
  const cleanSuggestionId = String(suggestionId || aiState.selectedSuggestionId || "").trim();
  const cleanStatus = String(status || "").trim();
  if (!cleanSuggestionId || !cleanStatus) return null;
  const inFlightSuggestionId = String(aiState.suggestionActionSuggestionId || "").trim();
  if (aiState.suggestionActionLoading) {
    if (!inFlightSuggestionId || inFlightSuggestionId === cleanSuggestionId) return null;
    const inFlightReviewNotice = messages.inFlightReviewNotice?.() ||
      "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion.";
    aiState.suggestionActionNoticeSuggestionId = cleanSuggestionId;
    aiState.suggestionActionNotice = inFlightReviewNotice;
    aiState.suggestionActionNoticeTone = "warn";
    render();
    setStatus(
      messages.inFlightReviewStatusMessage?.() ||
        "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion.",
      "warn"
    );
    return null;
  }
  const retryNotice = messages.reviewRetryNotice?.() ||
    "Detail changed while you were reviewing. Retry from the latest reviewed item.";
  const retryStatusMessage = messages.reviewRetryStatusMessage?.() ||
    "AI suggestion detail changed before the review action could run. Retry on the latest detail.";
  const reviewSafetyNotice = messages.reviewSafetyNotice?.() ||
    "Load the latest suggestion detail before running review actions.";
  const reviewSafetyStatusMessage = messages.reviewSafetyStatusMessage?.() ||
    "AI suggestion detail is not ready yet. Retry after the latest detail loads.";
  const alreadyAppliedNotice = (value) =>
    messages.alreadyAppliedNotice?.(value) ||
    `This reviewed suggestion is already ${String(value || "").trim() || "updated"}.`;
  const statusMessageValue =
    typeof aiSuggestionStatusLabel === "function"
      ? String(aiSuggestionStatusLabel(cleanStatus) || "").trim().toLowerCase() || cleanStatus
      : cleanStatus;
  const detail =
    String(aiState.suggestionDetail?.item?.id || aiState.suggestionDetail?.id || "").trim() === cleanSuggestionId
      ? aiState.suggestionDetail
      : null;
  const listed = aiState.suggestions.find((item) => String(item.id || "").trim() === cleanSuggestionId) || null;
  const current = detail?.item || detail || listed || {};
  const selectedSuggestionId = String(aiState.selectedSuggestionId || "").trim();
  const detailSuggestionId = String(aiState.suggestionDetail?.item?.id || aiState.suggestionDetail?.id || "").trim();
  if (selectedSuggestionId && detailSuggestionId && detailSuggestionId !== selectedSuggestionId) {
    aiState.suggestionActionNoticeSuggestionId = cleanSuggestionId;
    if (!aiState.suggestionDetailLoading) await loadAiSuggestionDetail(selectedSuggestionId);
    aiState.suggestionActionNotice = retryNotice;
    aiState.suggestionActionNoticeTone = "warn";
    render();
    setStatus(retryStatusMessage, "warn");
    return null;
  }
  if (!detail) {
    if (!aiState.suggestionDetailLoading) await loadAiSuggestionDetail(cleanSuggestionId);
    const loadedDetailId = String(aiState.suggestionDetail?.item?.id || aiState.suggestionDetail?.id || "").trim();
    if (loadedDetailId === cleanSuggestionId) {
      aiState.suggestionActionNoticeSuggestionId = "";
      aiState.suggestionActionNotice = "";
      aiState.suggestionActionNoticeTone = "";
      render();
      return null;
    }
    aiState.suggestionActionNoticeSuggestionId = cleanSuggestionId;
    aiState.suggestionActionNotice = reviewSafetyNotice;
    aiState.suggestionActionNoticeTone = "warn";
    render();
    setStatus(reviewSafetyStatusMessage, "warn");
    return null;
  }
  if (String(current.status || "").trim() === cleanStatus) {
    aiState.suggestionActionNoticeSuggestionId = cleanSuggestionId;
    aiState.suggestionActionNotice = alreadyAppliedNotice(statusMessageValue);
    aiState.suggestionActionNoticeTone = "ok";
    render();
    setStatus(
      messages.alreadyAppliedStatusMessage?.(statusMessageValue, cleanSuggestionId) ||
        `AI suggestion already ${statusMessageValue}: ${cleanSuggestionId}`,
      "ok"
    );
    return null;
  }
  aiState.suggestionActionSuggestionId = cleanSuggestionId;
  aiState.suggestionActionNoticeSuggestionId = "";
  aiState.suggestionActionNotice = "";
  aiState.suggestionActionNoticeTone = "";
  aiState.suggestionActionError = "";
  let reviewedContent;
  try {
    reviewedContent =
      cleanStatus === "edited" || cleanStatus === "confirmed"
        ? aiSuggestionReviewedContent(current)
        : undefined;
  } catch (error) {
    aiState.suggestionActionError = String(error?.message || error);
    setStatus(
      messages.updateFailedStatusMessage?.(error) ||
        `AI suggestion update failed: ${String(error?.message || error)}`,
      "bad"
    );
    render();
    return null;
  }
  aiState.suggestionActionLoading = true;
  render();
  try {
    const payload = {
      status: cleanStatus,
      actor: "user",
      userId: "local_user",
      action:
        cleanStatus === "adopted_as_draft"
          ? "adopt_as_draft"
          : cleanStatus === "edited"
            ? "edit"
          : cleanStatus === "confirmed"
            ? "confirm"
            : cleanStatus === "rejected"
              ? "reject"
              : cleanStatus
    };
    if (cleanStatus === "edited" || cleanStatus === "confirmed") {
      payload.content = reviewedContent;
    }
    if (cleanStatus === "confirmed" && !String(current.status || "").trim()) payload.userConfirmed = true;
    if (cleanStatus === "confirmed") payload.userConfirmed = true;
    const response = await updateAiSuggestion(cleanSuggestionId, { ...payload, canonical: true });
    const detailResult = suggestionDetailFromResponse(response);
    const item = detailResult.item || {};
    const selectionChangedDuringAction = String(aiState.selectedSuggestionId || "").trim() !== cleanSuggestionId;
    aiState.suggestions = aiState.suggestions.map((entry) =>
      String(entry.id || "").trim() === cleanSuggestionId ? item : entry
    );
    if (!selectionChangedDuringAction) {
      aiState.suggestionDetail = detailResult;
      aiState.selectedSuggestionId = cleanSuggestionId;
    }
    await refreshAiSuggestions({ silent: true });
    const nextSelectedSuggestionId = String(aiState.selectedSuggestionId || "").trim();
    if (nextSelectedSuggestionId && !aiState.suggestionDetail) {
      await loadAiSuggestionDetail(nextSelectedSuggestionId);
    }
    aiState.suggestionActionSuggestionId = "";
    rememberAiDebugSnapshot("suggestionDecision", response);
    aiState.suggestionActionError = "";
    aiState.suggestionActionNoticeSuggestionId = "";
    aiState.suggestionActionNotice = "";
    aiState.suggestionActionNoticeTone = "";
    setStatus(
      messages.updatedStatusMessage?.(statusMessageValue, cleanSuggestionId) ||
        `AI suggestion ${statusMessageValue}: ${cleanSuggestionId}`,
      "ok"
    );
    return item;
  } catch (error) {
    aiState.suggestionActionError = String(error?.message || error);
    setStatus(
      messages.updateFailedStatusMessage?.(error) ||
        `AI suggestion update failed: ${String(error?.message || error)}`,
      "bad"
    );
    return null;
  } finally {
    aiState.suggestionActionLoading = false;
    render();
  }
}
