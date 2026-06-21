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
  aiState.suggestionFilters = normalizeAiSuggestionFilters(aiState.suggestionFilters);
  if (!options.silent) {
    aiState.suggestionsLoading = true;
    aiState.suggestionsError = "";
    render();
  }
  const previousSelectedId = String(aiState.selectedSuggestionId || "").trim();
  try {
    const result = await fetchAiSuggestions({ ...aiState.suggestionFilters, canonical: true });
    aiState.suggestions = result.items;
    aiState.suggestionsTotal = result.total;
    rememberAiDebugSnapshot("suggestionsList", result);
    aiState.suggestionsError = "";
    const selectedListItem = result.items.find((item) => String(item.id || "").trim() === previousSelectedId) || null;
    const selectedStillVisible = Boolean(selectedListItem);
    const nextSelectedSuggestionId = selectedStillVisible ? previousSelectedId : result.items[0]?.id || "";
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
    aiState.suggestionsError = String(error?.message || error);
    setStatus(`AI suggestions failed to load: ${aiState.suggestionsError}`, "warn");
    return null;
  } finally {
    aiState.suggestionsLoading = false;
    render();
  }
}
