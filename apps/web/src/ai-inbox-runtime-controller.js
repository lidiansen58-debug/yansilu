export async function loadAiInboxDetailForRuntime(deps = {}, artifactId = "") {
  const {
    aiInboxState,
    fetchAiInboxItemWithOptions,
    aiInboxDetailFromResponse,
    rememberAiDebugSnapshot = () => {},
    syncAiInboxSummaryFromDetail = () => {},
    resetAiInboxSummaryState = () => {},
    clearAiInboxActionNotice = () => {},
    render = () => {},
    setStatus = () => {}
  } = deps;
  const cleanArtifactId = String(artifactId || "").trim();
  if (!cleanArtifactId) {
    aiInboxState.detailRequestToken += 1;
    aiInboxState.selectedArtifactId = "";
    aiInboxState.detail = null;
    aiInboxState.detailArtifactId = "";
    aiInboxState.detailLoading = false;
    aiInboxState.detailError = "";
    aiInboxState.actionArtifactId = "";
    aiInboxState.actionSuggestionId = "";
    aiInboxState.actionError = "";
    clearAiInboxActionNotice();
    resetAiInboxSummaryState({ invalidate: true });
    render();
    return null;
  }
  const requestToken = aiInboxState.detailRequestToken + 1;
  aiInboxState.detailRequestToken = requestToken;
  aiInboxState.selectedArtifactId = cleanArtifactId;
  aiInboxState.detailArtifactId = cleanArtifactId;
  aiInboxState.detailLoading = true;
  aiInboxState.detailError = "";
  aiInboxState.actionArtifactId = "";
  aiInboxState.actionSuggestionId = "";
  aiInboxState.actionError = "";
  clearAiInboxActionNotice();
  resetAiInboxSummaryState({ invalidate: true });
  render();
  try {
    const detail = await fetchAiInboxItemWithOptions(cleanArtifactId, { canonical: true });
    if (requestToken !== aiInboxState.detailRequestToken) return null;
    const selectionStillMatches = String(aiInboxState.selectedArtifactId || "").trim() === cleanArtifactId;
    if (selectionStillMatches) {
      aiInboxState.detail = aiInboxDetailFromResponse(detail);
      syncAiInboxSummaryFromDetail(detail);
    }
    aiInboxState.detailArtifactId = cleanArtifactId;
    rememberAiDebugSnapshot("inboxDetail", detail);
    return detail;
  } catch (error) {
    if (requestToken !== aiInboxState.detailRequestToken) return null;
    const selectionStillMatches = String(aiInboxState.selectedArtifactId || "").trim() === cleanArtifactId;
    if (selectionStillMatches) aiInboxState.detail = null;
    aiInboxState.detailArtifactId = cleanArtifactId;
    aiInboxState.detailError = String(error?.message || error);
    setStatus(`AI 建议详情加载失败：${aiInboxState.detailError}`, "warn");
    return null;
  } finally {
    if (requestToken !== aiInboxState.detailRequestToken) return;
    aiInboxState.detailLoading = false;
    render();
  }
}

export async function refreshAiInboxForRuntime(deps = {}, options = {}) {
  const {
    aiInboxState,
    fetchAiInbox,
    normalizeAiInboxFilters,
    aiInboxItemFromCanonical,
    rememberAiDebugSnapshot = () => {},
    clearAiInboxActionNotice = () => {},
    resetAiInboxSummaryState = () => {},
    render = () => {},
    setStatus = () => {},
    loadDetail = (artifactId) => loadAiInboxDetailForRuntime(deps, artifactId)
  } = deps;
  const { silent = false, preserveDetail = false } = options;
  aiInboxState.filters = normalizeAiInboxFilters(aiInboxState.filters);
  if (!silent) {
    aiInboxState.loading = true;
    aiInboxState.error = "";
    render();
  }
  const previousSelectedId = String(aiInboxState.selectedArtifactId || "").trim();
  try {
    const result = await fetchAiInbox({ ...aiInboxState.filters, canonical: true });
    const nextItems = Array.isArray(result?.canonical?.items) && result.canonical.items.length
      ? result.canonical.items.map((item) => aiInboxItemFromCanonical(item))
      : result.items;
    aiInboxState.items = nextItems;
    aiInboxState.counts = result.counts || aiInboxState.counts;
    aiInboxState.views = result.views || [];
    rememberAiDebugSnapshot("inboxList", result);
    aiInboxState.error = "";
    const selectedListItem = nextItems.find((item) => String(item.artifactId || "").trim() === previousSelectedId) || null;
    const selectedStillVisible = Boolean(selectedListItem);
    const nextSelectedArtifactId = selectedStillVisible ? previousSelectedId : nextItems[0]?.artifactId || "";
    const selectionChanged = nextSelectedArtifactId !== previousSelectedId;
    const detailItem = aiInboxState.detail?.item || null;
    const detailMatchesSelection = String(detailItem?.artifactId || "").trim() === previousSelectedId;
    const listSuggestionId = String(selectedListItem?.suggestionId || "").trim();
    const detailSuggestionId = String(aiInboxState.detail?.suggestion?.id || "").trim();
    const staleDetailWhileSelectedStillVisible =
      selectedStillVisible &&
      detailMatchesSelection &&
      Boolean(selectedListItem) &&
      (
        String(selectedListItem.status || "").trim() !== String(detailItem?.status || "").trim() ||
        String(selectedListItem.actionState || "").trim() !== String(detailItem?.actionState || "").trim() ||
        String(selectedListItem.updatedAt || "").trim() !== String(detailItem?.updatedAt || "").trim() ||
        Number(selectedListItem.decisionCount || 0) !== Number(detailItem?.decisionCount || 0) ||
        (Boolean(listSuggestionId) && listSuggestionId !== detailSuggestionId)
      );
    const shouldRealignSelection = !preserveDetail || !selectedStillVisible;
    if (shouldRealignSelection) {
      aiInboxState.selectedArtifactId = nextSelectedArtifactId;
    }
    if (
      selectionChanged ||
      staleDetailWhileSelectedStillVisible ||
      (!selectedStillVisible && !shouldRealignSelection)
    ) {
      aiInboxState.detailRequestToken += 1;
      aiInboxState.detail = null;
      aiInboxState.detailArtifactId = "";
      aiInboxState.detailLoading = false;
      aiInboxState.detailError = "";
      aiInboxState.actionArtifactId = "";
      aiInboxState.actionSuggestionId = "";
      aiInboxState.actionError = "";
      clearAiInboxActionNotice();
      resetAiInboxSummaryState({ invalidate: true });
    }
    if (!aiInboxState.selectedArtifactId && shouldRealignSelection) {
      aiInboxState.detail = null;
      aiInboxState.detailArtifactId = "";
    }
    const shouldHydrateSelectedDetail =
      Boolean(aiInboxState.selectedArtifactId) &&
      !aiInboxState.detail &&
      !aiInboxState.detailLoading;
    if (shouldHydrateSelectedDetail) {
      await loadDetail(aiInboxState.selectedArtifactId);
    }
    return result;
  } catch (error) {
    aiInboxState.error = String(error?.message || error);
    setStatus(`AI 建议加载失败：${aiInboxState.error}`, "warn");
    return null;
  } finally {
    aiInboxState.loading = false;
    render();
  }
}

export function aiInboxActionGuardForRuntime(aiInboxState = {}, options = {}) {
  const selectedArtifactId = String(aiInboxState.selectedArtifactId || "").trim();
  const detailArtifactId = String(aiInboxState.detail?.item?.artifactId || aiInboxState.detail?.artifact?.id || "").trim();
  const artifactId = String(options.artifactId || selectedArtifactId || detailArtifactId || "").trim();
  const suggestionId = String(options.suggestionId || "").trim();
  if (!artifactId) {
    return { type: "missing_artifact", artifactId: "", suggestionId };
  }
  if (selectedArtifactId && selectedArtifactId === artifactId && !aiInboxState.detail) {
    return { type: "missing_detail", artifactId: selectedArtifactId, suggestionId };
  }
  if (aiInboxState.actionLoading) {
    const inFlightArtifactId = String(aiInboxState.actionArtifactId || "").trim();
    const inFlightSuggestionId = String(aiInboxState.actionSuggestionId || "").trim();
    const sameArtifact = Boolean(inFlightArtifactId) && inFlightArtifactId === artifactId;
    const sameSuggestion =
      !suggestionId ||
      !inFlightSuggestionId ||
      inFlightSuggestionId === suggestionId;
    if (sameArtifact && sameSuggestion) {
      return { type: "same_action_in_flight", artifactId, suggestionId };
    }
    return { type: "different_action_in_flight", artifactId, suggestionId };
  }
  if (selectedArtifactId && detailArtifactId !== selectedArtifactId) {
    return {
      type: "stale_detail",
      artifactId: selectedArtifactId,
      suggestionId: String(aiInboxState.detail?.suggestion?.id || suggestionId || "").trim()
    };
  }
  return { type: "ready", artifactId, suggestionId };
}
