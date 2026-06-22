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

function fallbackMessage(value, fallback) {
  return typeof value === "function" ? value() : fallback;
}

function fallbackMessageWithArgs(value, fallback, ...args) {
  return typeof value === "function" ? value(...args) : fallback(...args);
}

async function resolveAiInboxActionGuard(deps = {}, guard = {}) {
  const {
    aiInboxState,
    loadAiInboxDetail = async () => {},
    setAiInboxActionNotice = () => {},
    setStatus = () => {},
    render = () => {},
    messages = {}
  } = deps;
  if (guard.type === "missing_artifact") {
    setStatus("Please select an AI inbox item first.", "warn");
    return false;
  }
  if (guard.type === "missing_detail") {
    if (!aiInboxState.detailLoading) await loadAiInboxDetail(guard.artifactId);
    setAiInboxActionNotice(
      fallbackMessage(messages.reviewSafetyNotice, "Load the latest inbox detail before running review actions."),
      "warn",
      guard.artifactId,
      guard.suggestionId
    );
    render();
    setStatus(
      fallbackMessage(messages.reviewSafetyStatusMessage, "AI inbox detail is not ready yet. Retry after the latest detail loads."),
      "warn"
    );
    return false;
  }
  if (guard.type === "same_action_in_flight") return false;
  if (guard.type === "different_action_in_flight") {
    const message = fallbackMessage(
      messages.inFlightReviewActionNotice,
      "Another AI inbox review action is still running. Wait for it to finish before reviewing a different item."
    );
    setAiInboxActionNotice(message, "warn", guard.artifactId, guard.suggestionId);
    render();
    setStatus(
      fallbackMessage(
        messages.inFlightReviewActionStatusMessage,
        "Another AI inbox review action is still running. Wait for it to finish before reviewing a different item."
      ),
      "warn"
    );
    return false;
  }
  if (guard.type === "stale_detail") {
    if (!aiInboxState.detailLoading) await loadAiInboxDetail(guard.artifactId);
    setAiInboxActionNotice(
      fallbackMessage(messages.reviewRetryNotice, "Detail changed while you were reviewing. Retry from the latest reviewed item."),
      "warn",
      guard.artifactId,
      String(aiInboxState.detail?.suggestion?.id || guard.suggestionId || "").trim()
    );
    render();
    setStatus(
      fallbackMessage(messages.reviewRetryStatusMessage, "AI inbox detail changed before the review action could run. Retry on the latest detail."),
      "warn"
    );
    return false;
  }
  return guard.type === "ready";
}

export async function recordAiInboxReviewDecisionForRuntime(deps = {}, decision = "") {
  const {
    aiInboxState,
    recordAiInboxDecision,
    aiInboxFeedback = () => ({}),
    commentText = () => "",
    aiInboxDetailFromResponse = (value) => value,
    rememberAiDebugSnapshot = () => {},
    finalizeAiInboxActionRefresh = async () => {},
    aiInboxActionLabel = (value) => value,
    setStatus = () => {},
    clearAiInboxActionNotice = () => {},
    render = () => {},
    messages = {}
  } = deps;
  const selectedArtifactId = String(aiInboxState.selectedArtifactId || "").trim();
  const detailArtifactId = String(aiInboxState.detail?.item?.artifactId || aiInboxState.detail?.artifact?.id || "").trim();
  const artifactId = String(selectedArtifactId || detailArtifactId || "").trim();
  const guard = aiInboxActionGuardForRuntime(aiInboxState, { artifactId });
  if (guard.type !== "ready") {
    const canSubmit = await resolveAiInboxActionGuard({ ...deps, setStatus, render, messages }, guard);
    if (!canSubmit) return guard.type === "missing_artifact" ? undefined : null;
  }

  aiInboxState.actionArtifactId = artifactId;
  aiInboxState.actionSuggestionId = "";
  aiInboxState.actionError = "";
  clearAiInboxActionNotice();
  aiInboxState.actionLoading = true;
  render();
  try {
    const result = await recordAiInboxDecision(artifactId, {
      decision,
      comment: commentText(),
      feedback: aiInboxFeedback(),
      canonical: true
    });
    const selectionChangedDuringAction = String(aiInboxState.selectedArtifactId || "").trim() !== artifactId;
    if (!selectionChangedDuringAction) {
      aiInboxState.detail = aiInboxDetailFromResponse(result);
      aiInboxState.selectedArtifactId = artifactId;
    }
    rememberAiDebugSnapshot("inboxDecision", result);
    await finalizeAiInboxActionRefresh({ preserveDetail: !selectionChangedDuringAction });
    aiInboxState.actionArtifactId = "";
    aiInboxState.actionSuggestionId = "";
    aiInboxState.actionError = "";
    clearAiInboxActionNotice();
    setStatus(
      fallbackMessageWithArgs(
        messages.decisionSucceededStatusMessage,
        (nextDecision, label) => `AI inbox item ${label || nextDecision || "processed"}.`,
        decision,
        aiInboxActionLabel(decision)
      ),
      "ok"
    );
    return result;
  } catch (error) {
    aiInboxState.actionError = String(error?.message || error);
    setStatus(
      fallbackMessageWithArgs(
        messages.decisionFailedStatusMessage,
        (nextError) => `AI inbox item update failed: ${String(nextError?.message || nextError)}`,
        error
      ),
      "bad"
    );
    return null;
  } finally {
    aiInboxState.actionLoading = false;
    render();
  }
}

export async function applyAiInboxSuggestionStatusForRuntime(deps = {}, status = "", expectedSuggestionId = "") {
  const {
    aiInboxState,
    updateAiSuggestion,
    adoptAiInboxFieldSuggestionDraft = async () => null,
    aiInboxSuggestionReviewedContent = () => undefined,
    commentText = () => "",
    aiSuggestionStatusLabel,
    rememberAiDebugSnapshot = () => {},
    finalizeAiInboxActionRefresh = async () => {},
    setStatus = () => {},
    setAiInboxActionNotice = () => {},
    clearAiInboxActionNotice = () => {},
    render = () => {},
    messages = {}
  } = deps;
  const cleanStatus = String(status || "").trim();
  const selectedArtifactId = String(aiInboxState.selectedArtifactId || "").trim();
  const detailArtifactId = String(aiInboxState.detail?.item?.artifactId || aiInboxState.detail?.artifact?.id || "").trim();
  const artifactId = String(selectedArtifactId || detailArtifactId || "").trim();
  const detailSuggestion = aiInboxState.detail?.suggestion || null;
  const clickedSuggestionId = String(expectedSuggestionId || detailSuggestion?.id || "").trim();
  if (!cleanStatus || !artifactId || !clickedSuggestionId) return null;

  const guard = aiInboxActionGuardForRuntime(aiInboxState, {
    artifactId,
    suggestionId: clickedSuggestionId
  });
  if (guard.type !== "ready") {
    const canSubmit = await resolveAiInboxActionGuard({ ...deps, setStatus, render, messages }, guard);
    if (!canSubmit) return null;
  }

  const retryNotice = fallbackMessage(
    messages.reviewRetryNotice,
    "Detail changed while you were reviewing. Retry from the latest reviewed item."
  );
  const retryStatusMessage = fallbackMessage(
    messages.reviewRetryStatusMessage,
    "AI inbox detail changed before the review action could run. Retry on the latest detail."
  );
  const currentSuggestion = aiInboxState.detail?.suggestion || null;
  const currentSuggestionId = String(currentSuggestion?.id || "").trim();
  if (currentSuggestionId && currentSuggestionId !== clickedSuggestionId) {
    setAiInboxActionNotice(retryNotice, "warn", artifactId, currentSuggestionId);
    render();
    setStatus(retryStatusMessage, "warn");
    return null;
  }
  const suggestion = currentSuggestion;
  const cleanSuggestionId = currentSuggestionId;
  if (!suggestion || !cleanSuggestionId) return null;

  const statusMessageValue =
    typeof aiSuggestionStatusLabel === "function"
      ? String(aiSuggestionStatusLabel(cleanStatus) || "").trim().toLowerCase() || cleanStatus
      : cleanStatus;
  if (String(suggestion.status || "").trim() === cleanStatus) {
    setAiInboxActionNotice(
      fallbackMessageWithArgs(
        messages.suggestionAlreadyAppliedNotice,
        (value) => `This reviewed suggestion is already ${String(value || "").trim() || "updated"}.`,
        statusMessageValue
      ),
      "ok",
      artifactId,
      cleanSuggestionId
    );
    render();
    setStatus(
      fallbackMessageWithArgs(
        messages.suggestionAlreadyAppliedStatusMessage,
        (value, suggestionId) => `AI inbox suggestion already ${value}: ${suggestionId}`,
        statusMessageValue,
        suggestion.id
      ),
      "ok"
    );
    return null;
  }

  if (cleanStatus === "adopted_as_draft") {
    return adoptAiInboxFieldSuggestionDraft(artifactId, cleanSuggestionId);
  }

  const reviewComment = commentText();
  aiInboxState.actionArtifactId = artifactId;
  aiInboxState.actionSuggestionId = cleanSuggestionId;
  aiInboxState.actionError = "";
  clearAiInboxActionNotice();
  let reviewedContent;
  try {
    reviewedContent =
      cleanStatus === "edited" || cleanStatus === "confirmed"
        ? aiInboxSuggestionReviewedContent(suggestion)
        : undefined;
  } catch (error) {
    aiInboxState.actionError = String(error?.message || error);
    setStatus(
      fallbackMessageWithArgs(
        messages.suggestionUpdateFailedStatusMessage,
        (nextError) => `AI inbox suggestion update failed: ${String(nextError?.message || nextError)}`,
        error
      ),
      "bad"
    );
    render();
    return null;
  }

  aiInboxState.actionLoading = true;
  render();
  try {
    const payload = {
      status: cleanStatus,
      actor: "user",
      userId: "local_user",
      action:
        cleanStatus === "edited"
          ? "edit"
          : cleanStatus === "confirmed"
            ? "confirm"
            : cleanStatus === "rejected"
              ? "reject"
              : cleanStatus,
      comment: reviewComment
    };
    if (cleanStatus === "edited" || cleanStatus === "confirmed") {
      payload.content = reviewedContent;
    }
    if (cleanStatus === "confirmed") payload.userConfirmed = true;

    const result = await updateAiSuggestion(suggestion.id, { ...payload, canonical: true });
    const selectionChangedDuringAction = String(aiInboxState.selectedArtifactId || "").trim() !== artifactId;
    await finalizeAiInboxActionRefresh({ preserveDetail: !selectionChangedDuringAction });
    rememberAiDebugSnapshot("inboxDecision", result);
    aiInboxState.actionArtifactId = "";
    aiInboxState.actionSuggestionId = "";
    aiInboxState.actionError = "";
    clearAiInboxActionNotice();
    setStatus(
      fallbackMessageWithArgs(
        messages.suggestionUpdatedStatusMessage,
        (value, suggestionId) => `AI inbox suggestion ${value}: ${suggestionId}`,
        statusMessageValue,
        suggestion.id
      ),
      "ok"
    );
    return true;
  } catch (error) {
    aiInboxState.actionError = String(error?.message || error);
    setStatus(
      fallbackMessageWithArgs(
        messages.suggestionUpdateFailedStatusMessage,
        (nextError) => `AI inbox suggestion update failed: ${String(nextError?.message || nextError)}`,
        error
      ),
      "bad"
    );
    return null;
  } finally {
    aiInboxState.actionLoading = false;
    render();
  }
}

function selectedAiInboxArtifactId(aiInboxState = {}, artifactId = "") {
  const selectedArtifactId = String(aiInboxState.selectedArtifactId || "").trim();
  const detailArtifactId = String(aiInboxState.detail?.item?.artifactId || aiInboxState.detail?.artifact?.id || "").trim();
  return String(artifactId || selectedArtifactId || detailArtifactId || "").trim();
}

function inboxArtifactAlreadyDecided(artifact = null, decision = null, expectedDecision = "") {
  const cleanExpectedDecision = String(expectedDecision || "").trim();
  return (
    String(artifact?.status || "").trim() === cleanExpectedDecision ||
    String(decision?.decision || "").trim() === cleanExpectedDecision
  );
}

async function runAiInboxSideEffectActionForRuntime(deps = {}, options = {}) {
  const {
    aiInboxState,
    artifactId = "",
    suggestionId = "",
    missingStatusMessage = "Please select an AI inbox item first.",
    action = async () => null,
    payload = () => ({}),
    aiInboxDetailFromResponse = (value) => value,
    rememberAiDebugSnapshot = () => {},
    finalizeAiInboxActionRefresh = async () => {},
    beforeFinalize = async () => {},
    afterFinalize = async () => {},
    setStatus = () => {},
    clearAiInboxActionNotice = () => {},
    render = () => {},
    successMessage = () => "AI inbox action completed.",
    failureMessage = (error) => `AI inbox action failed: ${String(error?.message || error)}`,
    messages = {}
  } = deps;
  const cleanArtifactId = selectedAiInboxArtifactId(aiInboxState, artifactId);
  const cleanSuggestionId = String(suggestionId || "").trim();
  if (!cleanArtifactId) {
    setStatus(missingStatusMessage, "warn");
    return undefined;
  }
  const guard = aiInboxActionGuardForRuntime(aiInboxState, {
    artifactId: cleanArtifactId,
    suggestionId: cleanSuggestionId
  });
  if (guard.type !== "ready") {
    const canSubmit = await resolveAiInboxActionGuard({ ...deps, setStatus, render, messages }, guard);
    if (!canSubmit) return null;
  }
  if (typeof options.beforeSubmit === "function") {
    const beforeSubmitResult = options.beforeSubmit(cleanArtifactId, cleanSuggestionId);
    if (beforeSubmitResult?.handled) return beforeSubmitResult.value ?? null;
  }

  aiInboxState.actionArtifactId = cleanArtifactId;
  aiInboxState.actionSuggestionId = cleanSuggestionId;
  aiInboxState.actionError = "";
  clearAiInboxActionNotice();
  aiInboxState.actionLoading = true;
  render();
  try {
    const result = await action(cleanArtifactId, payload(cleanArtifactId, cleanSuggestionId));
    const selectionChangedDuringAction = String(aiInboxState.selectedArtifactId || "").trim() !== cleanArtifactId;
    if (!selectionChangedDuringAction) {
      aiInboxState.detail = aiInboxDetailFromResponse(result);
      aiInboxState.selectedArtifactId = cleanArtifactId;
    }
    rememberAiDebugSnapshot("inboxDecision", result);
    await beforeFinalize(result, { artifactId: cleanArtifactId, suggestionId: cleanSuggestionId, selectionChangedDuringAction });
    await finalizeAiInboxActionRefresh({ preserveDetail: !selectionChangedDuringAction });
    await afterFinalize(result, { artifactId: cleanArtifactId, suggestionId: cleanSuggestionId, selectionChangedDuringAction });
    aiInboxState.actionArtifactId = "";
    aiInboxState.actionSuggestionId = "";
    aiInboxState.actionError = "";
    clearAiInboxActionNotice();
    setStatus(successMessage(result), "ok");
    return result;
  } catch (error) {
    aiInboxState.actionError = String(error?.message || error);
    setStatus(failureMessage(error), "bad");
    return null;
  } finally {
    aiInboxState.actionLoading = false;
    render();
  }
}

export async function acceptAiInboxLinkSuggestionForRuntime(deps = {}, artifactId = "") {
  const {
    aiInboxState,
    currentAiInboxArtifactForSelection = () => null,
    latestArtifactDecision = () => null,
    setAiInboxActionNotice = () => {},
    render = () => {},
    setStatus = () => {},
    commentText = () => "",
    acceptAiInboxLink,
    messages = {}
  } = deps;
  const cleanArtifactId = selectedAiInboxArtifactId(aiInboxState, artifactId);
  return runAiInboxSideEffectActionForRuntime({
    ...deps,
    artifactId: cleanArtifactId,
    missingStatusMessage: fallbackMessage(messages.linkMissingStatusMessage, "Please select a link suggestion first."),
    action: acceptAiInboxLink,
    payload: () => ({ comment: commentText(), canonical: true }),
    successMessage: (result) =>
      fallbackMessageWithArgs(
        messages.linkAcceptedStatusMessage,
        (relation) => relation?.created === false
          ? "Relation already exists; suggestion marked linked."
          : "Relation suggestion accepted.",
        result?.relation
      ),
    failureMessage: (error) =>
      fallbackMessageWithArgs(
        messages.linkAcceptFailedStatusMessage,
        (nextError) => `LinkSuggestion accept failed: ${String(nextError?.message || nextError)}`,
        error
      )
  }, {
    beforeSubmit: () => {
      const currentArtifact = currentAiInboxArtifactForSelection(cleanArtifactId);
      const currentDecision = latestArtifactDecision(currentArtifact);
      if (!inboxArtifactAlreadyDecided(currentArtifact, currentDecision, "linked_to_note")) return { handled: false };
      setAiInboxActionNotice(
        fallbackMessage(messages.linkAlreadyAppliedNotice, "This relation was already created for the current reviewed item."),
        "ok"
      );
      render();
      setStatus(
        fallbackMessage(messages.linkAlreadyAppliedStatusMessage, "This relation was already created for the current reviewed item."),
        "ok"
      );
      return { handled: true, value: null };
    }
  });
}

export async function promoteAiInboxArtifactToNoteForRuntime(deps = {}, artifactId = "") {
  const {
    aiInboxState,
    currentAiInboxArtifactForSelection = () => null,
    latestArtifactDecision = () => null,
    setAiInboxActionNotice = () => {},
    render = () => {},
    setStatus = () => {},
    commentText = () => "",
    promoteAiInboxNote,
    messages = {}
  } = deps;
  const cleanArtifactId = selectedAiInboxArtifactId(aiInboxState, artifactId);
  return runAiInboxSideEffectActionForRuntime({
    ...deps,
    artifactId: cleanArtifactId,
    missingStatusMessage: fallbackMessage(messages.notePromotionMissingStatusMessage, "Please select an AI inbox item first."),
    action: promoteAiInboxNote,
    payload: () => ({ comment: commentText(), canonical: true }),
    successMessage: (result) =>
      fallbackMessageWithArgs(
        messages.notePromotionSucceededStatusMessage,
        (note) => note?.id ? `AI inbox item promoted to note: ${note.id}` : "AI inbox item promoted to note.",
        result?.note
      ),
    failureMessage: (error) =>
      fallbackMessageWithArgs(
        messages.notePromotionFailedStatusMessage,
        (nextError) => `AI note promotion failed: ${String(nextError?.message || nextError)}`,
        error
      )
  }, {
    beforeSubmit: () => {
      const currentArtifact = currentAiInboxArtifactForSelection(cleanArtifactId);
      const currentDecision = latestArtifactDecision(currentArtifact);
      if (!inboxArtifactAlreadyDecided(currentArtifact, currentDecision, "promoted_to_note")) return { handled: false };
      setAiInboxActionNotice(
        fallbackMessage(messages.notePromotionAlreadyAppliedNotice, "This draft note already exists for the current reviewed item."),
        "ok"
      );
      render();
      setStatus(
        fallbackMessage(messages.notePromotionAlreadyAppliedStatusMessage, "This draft note already exists for the current reviewed item."),
        "ok"
      );
      return { handled: true, value: null };
    }
  });
}

export async function adoptAiInboxFieldSuggestionDraftForRuntime(deps = {}, artifactId = "", expectedSuggestionId = "") {
  const {
    aiInboxState,
    currentAiInboxArtifactForSelection = () => null,
    currentAiInboxSuggestionForSelection = () => null,
    latestArtifactDecision = () => null,
    aiSuggestionStatusLabel = (value) => value,
    setAiInboxActionNotice = () => {},
    render = () => {},
    setStatus = () => {},
    commentText = () => "",
    aiInboxFeedback = () => ({}),
    adoptAiInboxFieldSuggestion,
    messages = {}
  } = deps;
  const cleanArtifactId = selectedAiInboxArtifactId(aiInboxState, artifactId);
  const clickedSuggestionId = String(expectedSuggestionId || aiInboxState.detail?.suggestion?.id || "").trim();
  const currentSuggestion = currentAiInboxSuggestionForSelection(cleanArtifactId);
  const currentSuggestionId = String(currentSuggestion?.id || "").trim();
  return runAiInboxSideEffectActionForRuntime({
    ...deps,
    artifactId: cleanArtifactId,
    suggestionId: clickedSuggestionId,
    missingStatusMessage: fallbackMessage(messages.fieldSuggestionMissingStatusMessage, "Please select a field suggestion first."),
    action: adoptAiInboxFieldSuggestion,
    payload: () => ({ comment: commentText(), feedback: aiInboxFeedback(), canonical: true }),
    successMessage: (result) =>
      fallbackMessageWithArgs(
        messages.fieldSuggestionDraftSucceededStatusMessage,
        (note) => note?.id ? `AI field suggestion adopted as draft: ${note.id}` : "AI field suggestion adopted as draft.",
        result?.note
      ),
    failureMessage: (error) =>
      fallbackMessageWithArgs(
        messages.fieldSuggestionDraftFailedStatusMessage,
        (nextError) => `AI field suggestion adopt failed: ${String(nextError?.message || nextError)}`,
        error
      )
  }, {
    beforeSubmit: () => {
      const latestSuggestion = currentAiInboxSuggestionForSelection(cleanArtifactId);
      const latestSuggestionId = String(latestSuggestion?.id || "").trim();
      if (clickedSuggestionId && latestSuggestionId && latestSuggestionId !== clickedSuggestionId) {
        setAiInboxActionNotice(
          fallbackMessage(messages.reviewRetryNotice, "Detail changed while you were reviewing. Retry from the latest reviewed item."),
          "warn",
          cleanArtifactId,
          latestSuggestionId
        );
        render();
        setStatus(
          fallbackMessage(messages.reviewRetryStatusMessage, "AI inbox detail changed before the review action could run. Retry on the latest detail."),
          "warn"
        );
        return { handled: true, value: null };
      }
      const currentArtifact = currentAiInboxArtifactForSelection(cleanArtifactId);
      const currentDecision = latestArtifactDecision(currentArtifact);
      const suggestionStatus = String(latestSuggestion?.status || currentSuggestion?.status || "").trim();
      const suggestionStatusLabel = aiSuggestionStatusLabel(suggestionStatus || "adopted_as_draft");
      const suggestionStatusMessageValue = String(suggestionStatusLabel || "").trim().toLowerCase() || "adopted as draft";
      if (
        inboxArtifactAlreadyDecided(currentArtifact, currentDecision, "adopted_as_draft") ||
        ["adopted_as_draft", "edited", "confirmed"].includes(suggestionStatus)
      ) {
        setAiInboxActionNotice(
          fallbackMessageWithArgs(
            messages.fieldSuggestionDraftAlreadyAppliedNotice,
            (value) => `This field suggestion is already ${value}.`,
            suggestionStatusMessageValue
          ),
          "ok",
          cleanArtifactId,
          latestSuggestionId
        );
        render();
        setStatus(
          fallbackMessageWithArgs(
            messages.fieldSuggestionDraftAlreadyAppliedStatusMessage,
            (value) => `This field suggestion is already ${value}.`,
            suggestionStatusLabel
          ),
          "ok"
        );
        return { handled: true, value: null };
      }
      aiInboxState.actionSuggestionId = latestSuggestionId;
      return { handled: false };
    }
  });
}
