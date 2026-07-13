import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptAiInboxLinkSuggestionForRuntime,
  adoptAiInboxFieldSuggestionDraftForRuntime,
  aiInboxActionGuardForRuntime,
  applyAiInboxRecommendedActionForRuntime,
  applyAiInboxSuggestionStatusForRuntime,
  finalizeAiInboxActionRefreshForRuntime,
  loadAiInboxDetailForRuntime,
  promoteAiInboxArtifactToNoteForRuntime,
  recordAiInboxReviewDecisionForRuntime,
  refreshAiInboxEvaluationSummaryForRuntime,
  refreshAiInboxForRuntime,
  runAiInboxSummaryForRuntime
} from "../../apps/web/src/ai-inbox-runtime-controller.js";

function createLoadAiInboxDetail(aiInboxState, deps = {}) {
  return (artifactId) => loadAiInboxDetailForRuntime({
    aiInboxState,
    fetchAiInboxItemWithOptions: deps.fetchAiInboxItemWithOptions,
    aiInboxDetailFromResponse: deps.aiInboxDetailFromResponse || ((response) => ({ item: response.item })),
    rememberAiDebugSnapshot: deps.rememberAiDebugSnapshot || (() => {}),
    syncAiInboxSummaryFromDetail: deps.syncAiInboxSummaryFromDetail || (() => {}),
    resetAiInboxSummaryState: deps.resetAiInboxSummaryState || (() => {}),
    clearAiInboxActionNotice: deps.clearAiInboxActionNotice || (() => {}),
    render: deps.renderAiInboxWorkspace || (() => {}),
    setStatus: deps.setStatus || (() => {})
  }, artifactId);
}

function createRefreshAiInbox(aiInboxState, deps = {}) {
  return (options = {}) => refreshAiInboxForRuntime({
    aiInboxState,
    fetchAiInbox: deps.fetchAiInbox,
    normalizeAiInboxFilters: deps.normalizeAiInboxFilters || ((filters) => filters),
    aiInboxItemFromCanonical: deps.aiInboxItemFromCanonical || ((item) => item),
    rememberAiDebugSnapshot: deps.rememberAiDebugSnapshot || (() => {}),
    resetAiInboxSummaryState: deps.resetAiInboxSummaryState || (() => {}),
    clearAiInboxActionNotice: deps.clearAiInboxActionNotice || (() => {}),
    render: deps.renderAiInboxWorkspace || (() => {}),
    setStatus: deps.setStatus || (() => {}),
    loadDetail: deps.loadAiInboxDetail || (async () => null)
  }, options);
}

function createFinalizeAiInboxActionRefresh(aiInboxState, refreshAiInbox, refreshAiInboxEvaluationSummary, loadAiInboxDetail) {
  return (options = {}) => finalizeAiInboxActionRefreshForRuntime({
    aiInboxState,
    refreshAiInbox,
    refreshAiInboxEvaluationSummary,
    loadAiInboxDetail
  }, options);
}

function createRunAiInboxSummary(
  aiInboxState,
  {
    settingsState = { ai: {} },
    summarizeAiInboxItem,
    recommendedAiInboxActionFromText = () => "",
    loadAiInboxDetail = async () => null,
    setStatus = () => {},
    renderAiInboxWorkspace = () => {},
    resetAiInboxSummaryState = () => {}
  } = {}
) {
  return (artifactId) => runAiInboxSummaryForRuntime({
    aiInboxState,
    summarizeAiInboxItem,
    summaryRequestOptions: () => ({
      userMode: settingsState.ai.userMode,
      modelPack: settingsState.ai.modelPack,
      modelTier: "cheap_fast",
      privacyMode: settingsState.ai.routePreview?.privacy?.mode || ""
    }),
    recommendedAiInboxActionFromText,
    resetAiInboxSummaryState,
    loadAiInboxDetail,
    setStatus,
    render: renderAiInboxWorkspace
  }, artifactId);
}

function guardMessages(first, second) {
  return {
    reviewSafetyNotice: first,
    reviewSafetyStatusMessage: second,
    reviewRetryNotice: first,
    reviewRetryStatusMessage: second,
    inFlightReviewActionNotice: first,
    inFlightReviewActionStatusMessage: second
  };
}

function createApplyAiInboxRecommendedAction(
  $,
  window,
  aiInboxState,
  loadAiInboxDetail,
  setAiInboxActionNotice,
  renderAiInboxWorkspace,
  setStatus,
  acceptAiInboxLinkSuggestion,
  adoptAiInboxFieldSuggestionDraft,
  promoteAiInboxArtifactToNote,
  recordAiInboxReviewDecision,
  firstMessage,
  secondMessage
) {
  return (action = "") => applyAiInboxRecommendedActionForRuntime({
    aiInboxState,
    confirm: (message) => (typeof window === "object" && typeof window.confirm === "function" ? window.confirm(message) : true),
    appendDecisionComment: (comment) => {
      const commentEl = typeof $ === "function" ? $("aiInboxDecisionComment") : null;
      if (!commentEl) return;
      commentEl.value = `${commentEl.value || ""}\n\n${comment}`.trim();
    },
    acceptLink: acceptAiInboxLinkSuggestion || (async () => null),
    adoptFieldSuggestion: adoptAiInboxFieldSuggestionDraft || (async () => null),
    promoteNote: promoteAiInboxArtifactToNote || (async () => null),
    recordDecision: recordAiInboxReviewDecision || (async () => null),
    loadAiInboxDetail: loadAiInboxDetail || (async () => null),
    setAiInboxActionNotice: setAiInboxActionNotice || (() => {}),
    setStatus: setStatus || (() => {}),
    render: renderAiInboxWorkspace || (() => {}),
    messages: guardMessages(firstMessage, secondMessage)
  }, action);
}

function createRecordAiInboxReviewDecision(
  $,
  aiInboxState,
  recordAiInboxDecision,
  aiInboxFeedbackFromUi,
  loadAiInboxDetail,
  refreshAiInbox,
  refreshAiInboxEvaluationSummary,
  rememberAiDebugSnapshot,
  setStatus,
  setAiInboxActionNotice,
  clearAiInboxActionNotice,
  renderAiInboxWorkspace,
  aiInboxDetailFromResponse,
  aiInboxActionLabel
) {
  return (decision) => recordAiInboxReviewDecisionForRuntime({
    aiInboxState,
    recordAiInboxDecision,
    aiInboxFeedback: aiInboxFeedbackFromUi || (() => ({})),
    commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
    aiInboxDetailFromResponse: aiInboxDetailFromResponse || ((value) => value),
    loadAiInboxDetail: loadAiInboxDetail || (async () => null),
    rememberAiDebugSnapshot: rememberAiDebugSnapshot || (() => {}),
    finalizeAiInboxActionRefresh: createFinalizeAiInboxActionRefresh(
      aiInboxState,
      refreshAiInbox || (async () => null),
      refreshAiInboxEvaluationSummary || (async () => null),
      loadAiInboxDetail || (async () => null)
    ),
    aiInboxActionLabel: aiInboxActionLabel || ((value) => value),
    setStatus: setStatus || (() => {}),
    setAiInboxActionNotice: setAiInboxActionNotice || (() => {}),
    clearAiInboxActionNotice: clearAiInboxActionNotice || (() => {}),
    render: renderAiInboxWorkspace || (() => {}),
    messages: {}
  }, decision);
}

function createRecordDecisionFromPrototypeHarness(...args) {
  const [
    $,
    aiInboxState,
    recordAiInboxDecision,
    aiInboxFeedbackFromUi,
    aiInboxDetailFromResponse,
    loadAiInboxDetail,
    rememberAiDebugSnapshot,
    refreshAiInbox,
    refreshAiInboxEvaluationSummary,
    aiInboxActionLabel,
    setStatus,
    clearAiInboxActionNotice
  ] = args;
  const hasNoticeSetter = args.length >= 14 && typeof args[13] === "function";
  const setAiInboxActionNotice = hasNoticeSetter ? args[12] : () => {};
  const renderAiInboxWorkspace = hasNoticeSetter ? args[13] : args[12];
  const tail = args.slice(hasNoticeSetter ? 14 : 13);
  return (decision) => recordAiInboxReviewDecisionForRuntime({
    aiInboxState,
    recordAiInboxDecision,
    aiInboxFeedback: aiInboxFeedbackFromUi || (() => ({})),
    commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
    aiInboxDetailFromResponse: aiInboxDetailFromResponse || ((value) => value),
    loadAiInboxDetail: loadAiInboxDetail || (async () => null),
    rememberAiDebugSnapshot: rememberAiDebugSnapshot || (() => {}),
    finalizeAiInboxActionRefresh: createFinalizeAiInboxActionRefresh(
      aiInboxState,
      refreshAiInbox || (async () => null),
      refreshAiInboxEvaluationSummary || (async () => null),
      loadAiInboxDetail || (async () => null)
    ),
    aiInboxActionLabel: aiInboxActionLabel || ((value) => value),
    setStatus: setStatus || (() => {}),
    setAiInboxActionNotice,
    clearAiInboxActionNotice: clearAiInboxActionNotice || (() => {}),
    render: renderAiInboxWorkspace || (() => {}),
    messages: guardMessages(tail[0], tail[1])
  }, decision);
}

function createApplyAiInboxSuggestionStatus(...args) {
  const [
    $,
    aiInboxState,
    adoptAiInboxFieldSuggestionDraft,
    aiInboxSuggestionReviewedContentFromUi,
    updateAiSuggestion,
    loadAiInboxDetail,
    refreshAiInbox,
    refreshAiInboxEvaluationSummary,
    rememberAiDebugSnapshot,
    setStatus
  ] = args;
  const hasClearNotice = args.length >= 13;
  const clearAiInboxActionNotice = hasClearNotice ? args[10] : () => {};
  const setAiInboxActionNotice = hasClearNotice ? args[11] : args[10];
  const renderAiInboxWorkspace = hasClearNotice ? args[12] : args[11];
  const tail = args.slice(hasClearNotice ? 13 : 12);
  const aiSuggestionStatusLabel = tail.length === 1 ? tail[0] : tail[3];
  const messages = tail.length >= 6
    ? {
        ...guardMessages(tail[0], tail[1]),
        suggestionAlreadyAppliedNotice: tail[2],
        reviewSafetyNotice: tail[4],
        reviewSafetyStatusMessage: tail[5]
      }
    : {};
  return (status, expectedSuggestionId = "") => applyAiInboxSuggestionStatusForRuntime({
    aiInboxState,
    updateAiSuggestion,
    adoptAiInboxFieldSuggestionDraft: adoptAiInboxFieldSuggestionDraft || (async () => null),
    aiInboxSuggestionReviewedContent: aiInboxSuggestionReviewedContentFromUi || (() => undefined),
    commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
    aiSuggestionStatusLabel,
    loadAiInboxDetail: loadAiInboxDetail || (async () => null),
    rememberAiDebugSnapshot: rememberAiDebugSnapshot || (() => {}),
    finalizeAiInboxActionRefresh: createFinalizeAiInboxActionRefresh(
      aiInboxState,
      refreshAiInbox || (async () => null),
      refreshAiInboxEvaluationSummary || (async () => null),
      loadAiInboxDetail || (async () => null)
    ),
    setStatus: setStatus || (() => {}),
    setAiInboxActionNotice: setAiInboxActionNotice || (() => {}),
    clearAiInboxActionNotice: clearAiInboxActionNotice || (() => {}),
    render: renderAiInboxWorkspace || (() => {}),
    messages
  }, status, expectedSuggestionId);
}

function createAcceptAiInboxLinkSuggestion(
  $,
  aiInboxState,
  loadAiInboxDetail,
  currentAiInboxArtifactForSelection,
  latestArtifactDecision,
  setAiInboxActionNotice,
  acceptAiInboxLink,
  aiInboxDetailFromResponse,
  rememberAiDebugSnapshot,
  refreshAiInbox,
  refreshAiInboxEvaluationSummary,
  refreshDirectoryGraph,
  state,
  setStatus,
  clearAiInboxActionNotice,
  renderAiInboxWorkspace,
  firstMessage,
  secondMessage
) {
  return (artifactId) => acceptAiInboxLinkSuggestionForRuntime({
    aiInboxState,
    currentAiInboxArtifactForSelection: currentAiInboxArtifactForSelection || (() => null),
    latestArtifactDecision: latestArtifactDecision || (() => null),
    acceptAiInboxLink: acceptAiInboxLink || (async () => null),
    commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
    aiInboxDetailFromResponse: aiInboxDetailFromResponse || ((value) => value),
    loadAiInboxDetail: loadAiInboxDetail || (async () => null),
    rememberAiDebugSnapshot: rememberAiDebugSnapshot || (() => {}),
    finalizeAiInboxActionRefresh: createFinalizeAiInboxActionRefresh(
      aiInboxState,
      refreshAiInbox || (async () => null),
      refreshAiInboxEvaluationSummary || (async () => null),
      loadAiInboxDetail || (async () => null)
    ),
    afterFinalize: async () => {
      if (state?.module === "graph" && typeof refreshDirectoryGraph === "function") await refreshDirectoryGraph();
    },
    setStatus: setStatus || (() => {}),
    setAiInboxActionNotice: setAiInboxActionNotice || (() => {}),
    clearAiInboxActionNotice: clearAiInboxActionNotice || (() => {}),
    render: renderAiInboxWorkspace || (() => {}),
    messages: guardMessages(firstMessage, secondMessage)
  }, artifactId);
}

function createPromoteAiInboxArtifactToNote(
  $,
  aiInboxState,
  loadAiInboxDetail,
  currentAiInboxArtifactForSelection,
  latestArtifactDecision,
  setAiInboxActionNotice,
  promoteAiInboxNote,
  aiInboxDetailFromResponse,
  rememberAiDebugSnapshot,
  refreshAiInbox,
  refreshAiInboxEvaluationSummary,
  mapNoteItem,
  state,
  activateModule,
  openNoteById,
  setStatus,
  clearAiInboxActionNotice,
  renderAiInboxWorkspace,
  firstMessage,
  secondMessage
) {
  return (artifactId) => promoteAiInboxArtifactToNoteForRuntime({
    aiInboxState,
    currentAiInboxArtifactForSelection: currentAiInboxArtifactForSelection || (() => null),
    latestArtifactDecision: latestArtifactDecision || (() => null),
    promoteAiInboxNote: promoteAiInboxNote || (async () => null),
    commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
    aiInboxDetailFromResponse: aiInboxDetailFromResponse || ((value) => value),
    loadAiInboxDetail: loadAiInboxDetail || (async () => null),
    rememberAiDebugSnapshot: rememberAiDebugSnapshot || (() => {}),
    finalizeAiInboxActionRefresh: createFinalizeAiInboxActionRefresh(
      aiInboxState,
      refreshAiInbox || (async () => null),
      refreshAiInboxEvaluationSummary || (async () => null),
      loadAiInboxDetail || (async () => null)
    ),
    beforeFinalize: async (result) => {
      if (result?.note?.id && Array.isArray(state?.notes)) {
        const nextNote = typeof mapNoteItem === "function" ? mapNoteItem(result.note) : result.note;
        state.notes = [nextNote, ...state.notes.filter((item) => item.id !== result.note.id)];
      }
    },
    afterFinalize: async (result, context) => {
      if (result?.note?.id && !context.selectionChangedDuringAction) {
        if (typeof activateModule === "function") activateModule("explorer");
        if (typeof openNoteById === "function") openNoteById(result.note.id);
      }
    },
    setStatus: setStatus || (() => {}),
    setAiInboxActionNotice: setAiInboxActionNotice || (() => {}),
    clearAiInboxActionNotice: clearAiInboxActionNotice || (() => {}),
    render: renderAiInboxWorkspace || (() => {}),
    messages: guardMessages(firstMessage, secondMessage)
  }, artifactId);
}

function createAdoptAiInboxFieldSuggestionDraft(
  $,
  aiInboxState,
  loadAiInboxDetail,
  currentAiInboxArtifactForSelection,
  currentAiInboxSuggestionForSelection,
  latestArtifactDecision,
  aiSuggestionStatusLabel,
  setAiInboxActionNotice,
  adoptAiInboxFieldSuggestion,
  aiInboxFeedbackFromUi,
  aiInboxDetailFromResponse,
  rememberAiDebugSnapshot,
  refreshAiInbox,
  refreshAiInboxEvaluationSummary,
  mapNoteItem,
  state,
  activateModule,
  openNoteById,
  setStatus,
  clearAiInboxActionNotice,
  renderAiInboxWorkspace,
  firstMessage,
  secondMessage
) {
  return (artifactId, expectedSuggestionId = "") => adoptAiInboxFieldSuggestionDraftForRuntime({
    aiInboxState,
    currentAiInboxArtifactForSelection: currentAiInboxArtifactForSelection || (() => null),
    currentAiInboxSuggestionForSelection: currentAiInboxSuggestionForSelection || (() => null),
    latestArtifactDecision: latestArtifactDecision || (() => null),
    aiSuggestionStatusLabel: aiSuggestionStatusLabel || ((value) => value),
    adoptAiInboxFieldSuggestion: adoptAiInboxFieldSuggestion || (async () => null),
    aiInboxFeedback: aiInboxFeedbackFromUi || (() => ({})),
    commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
    aiInboxDetailFromResponse: aiInboxDetailFromResponse || ((value) => value),
    loadAiInboxDetail: loadAiInboxDetail || (async () => null),
    rememberAiDebugSnapshot: rememberAiDebugSnapshot || (() => {}),
    finalizeAiInboxActionRefresh: createFinalizeAiInboxActionRefresh(
      aiInboxState,
      refreshAiInbox || (async () => null),
      refreshAiInboxEvaluationSummary || (async () => null),
      loadAiInboxDetail || (async () => null)
    ),
    beforeFinalize: async (result) => {
      if (result?.note?.id && Array.isArray(state?.notes)) {
        const nextNote = typeof mapNoteItem === "function" ? mapNoteItem(result.note) : result.note;
        state.notes = [nextNote, ...state.notes.filter((item) => item.id !== result.note.id)];
      }
    },
    afterFinalize: async (result, context) => {
      if (result?.note?.id && !context.selectionChangedDuringAction) {
        if (typeof activateModule === "function") activateModule("explorer");
        if (typeof openNoteById === "function") openNoteById(result.note.id, { focusDistillation: true });
      }
    },
    setStatus: setStatus || (() => {}),
    setAiInboxActionNotice: setAiInboxActionNotice || (() => {}),
    clearAiInboxActionNotice: clearAiInboxActionNotice || (() => {}),
    render: renderAiInboxWorkspace || (() => {}),
    messages: guardMessages(firstMessage, secondMessage)
  }, artifactId, expectedSuggestionId);
}

test("aiInboxActionGuardForRuntime classifies shared inbox action guard states", () => {
  assert.deepEqual(
    aiInboxActionGuardForRuntime({ selectedArtifactId: "", detail: null }),
    { type: "missing_artifact", artifactId: "", suggestionId: "" }
  );
  assert.deepEqual(
    aiInboxActionGuardForRuntime({ selectedArtifactId: "artifact_1", detail: null }),
    { type: "missing_detail", artifactId: "artifact_1", suggestionId: "" }
  );
  assert.deepEqual(
    aiInboxActionGuardForRuntime({
      selectedArtifactId: "artifact_1",
      detail: { item: { artifactId: "artifact_1" }, suggestion: { id: "suggestion_1" } },
      actionLoading: true,
      actionArtifactId: "artifact_1",
      actionSuggestionId: "suggestion_1"
    }, { suggestionId: "suggestion_1" }),
    { type: "same_action_in_flight", artifactId: "artifact_1", suggestionId: "suggestion_1" }
  );
  assert.deepEqual(
    aiInboxActionGuardForRuntime({
      selectedArtifactId: "artifact_2",
      detail: { item: { artifactId: "artifact_2" }, suggestion: { id: "suggestion_2" } },
      actionLoading: true,
      actionArtifactId: "artifact_1",
      actionSuggestionId: "suggestion_1"
    }, { suggestionId: "suggestion_2" }),
    { type: "different_action_in_flight", artifactId: "artifact_2", suggestionId: "suggestion_2" }
  );
  assert.deepEqual(
    aiInboxActionGuardForRuntime({
      selectedArtifactId: "artifact_2",
      detail: { item: { artifactId: "artifact_1" }, suggestion: { id: "suggestion_old" } }
    }, { suggestionId: "suggestion_clicked" }),
    { type: "stale_detail", artifactId: "artifact_2", suggestionId: "suggestion_old" }
  );
  assert.deepEqual(
    aiInboxActionGuardForRuntime({
      selectedArtifactId: "artifact_2",
      detail: { item: { artifactId: "artifact_2" }, suggestion: { id: "suggestion_2" } }
    }, { suggestionId: "suggestion_2" }),
    { type: "ready", artifactId: "artifact_2", suggestionId: "suggestion_2" }
  );
});

test("loadAiInboxDetail ignores stale responses and keeps the latest selected artifact detail", async () => {
  let resolveFirst;
  let resolveSecond;
  const fetchCalls = [];
  const aiInboxState = {
    selectedArtifactId: "",
    detail: null,
    detailLoading: false,
    detailError: "",
    actionError: "",
    detailRequestToken: 0
  };

  const loadAiInboxDetail = createLoadAiInboxDetail(aiInboxState, {
    fetchAiInboxItemWithOptions: (artifactId) => {
      fetchCalls.push(artifactId);
      if (artifactId === "artifact_1") {
        return new Promise((resolve) => {
          resolveFirst = () => resolve({ item: { artifactId }, canonical: {} });
        });
      }
      return new Promise((resolve) => {
        resolveSecond = () => resolve({ item: { artifactId }, canonical: {} });
      });
    },
    aiInboxDetailFromResponse: (response) => ({ item: response.item })
  });

  const firstPromise = loadAiInboxDetail("artifact_1");
  const secondPromise = loadAiInboxDetail("artifact_2");

  resolveSecond();
  await secondPromise;
  resolveFirst();
  await firstPromise;

  assert.deepEqual(fetchCalls, ["artifact_1", "artifact_2"]);
  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail?.item?.artifactId, "artifact_2");
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailRequestToken, 2);
});

test("loadAiInboxDetail clears stale errors after a successful retry and when selection is reset", async () => {
  const aiInboxState = {
    selectedArtifactId: "artifact_old",
    detail: { item: { artifactId: "artifact_old" } },
    detailArtifactId: "artifact_old",
    detailLoading: false,
    detailError: "stale detail error",
    actionArtifactId: "artifact_old",
    actionError: "stale action error",
    detailRequestToken: 0
  };

  const loadAiInboxDetail = createLoadAiInboxDetail(aiInboxState, {
    fetchAiInboxItemWithOptions: async (artifactId) => ({ item: { artifactId }, canonical: {} }),
    aiInboxDetailFromResponse: (response) => ({ item: response.item })
  });

  const fetched = await loadAiInboxDetail("artifact_retry");
  assert.equal(fetched.item.artifactId, "artifact_retry");
  assert.equal(aiInboxState.selectedArtifactId, "artifact_retry");
  assert.equal(aiInboxState.detail?.item?.artifactId, "artifact_retry");
  assert.equal(aiInboxState.detailArtifactId, "artifact_retry");
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionArtifactId, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.detailLoading, false);

  await loadAiInboxDetail("");
  assert.equal(aiInboxState.selectedArtifactId, "");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailArtifactId, "");
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionArtifactId, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.detailLoading, false);
});

test("loadAiInboxDetail keeps a failed detail request bound to the original artifact after selection moves", async () => {
  let rejectDetail;
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: null,
    detailArtifactId: "",
    detailLoading: false,
    detailError: "",
    actionArtifactId: "",
    actionError: "",
    detailRequestToken: 0
  };

  const loadAiInboxDetail = createLoadAiInboxDetail(aiInboxState, {
    fetchAiInboxItemWithOptions: () =>
      new Promise((_, reject) => {
        rejectDetail = () => reject(new Error("detail boom"));
      }),
    aiInboxDetailFromResponse: (response) => ({ item: response.item })
  });

  const pending = loadAiInboxDetail("artifact_1");
  aiInboxState.selectedArtifactId = "artifact_2";
  aiInboxState.detail = { item: { artifactId: "artifact_2", status: "pending_review" } };
  rejectDetail();
  const fetched = await pending;

  assert.equal(fetched, null);
  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail?.item?.artifactId, "artifact_2");
  assert.equal(aiInboxState.detailArtifactId, "artifact_1");
  assert.equal(aiInboxState.detailError, "detail boom");
  assert.equal(aiInboxState.detailLoading, false);
});

test("finalizeAiInboxActionRefresh realigns refreshed inbox state through the latest selection", async () => {
  const calls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" } },
    detailLoading: true,
    detailError: "old detail error"
  };

  const finalizeAiInboxActionRefresh = createFinalizeAiInboxActionRefresh(
    aiInboxState,
    async (options) => {
      calls.push(["refresh", options]);
      aiInboxState.selectedArtifactId = "artifact_2";
      return true;
    },
    async (options) => {
      calls.push(["summary", options]);
      return true;
    },
    async (artifactId) => {
      calls.push(["load", artifactId]);
      aiInboxState.detailLoading = false;
      aiInboxState.detailError = "";
      return { item: { artifactId } };
    }
  );

  await finalizeAiInboxActionRefresh({ preserveDetail: true });
  assert.deepEqual(calls, [
    ["refresh", { silent: true, preserveDetail: true }],
    ["summary", { silent: true }],
    ["load", "artifact_2"]
  ]);
  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detailError, "");
});

test("applyAiInboxSuggestionStatus is a no-op while the same inbox suggestion action is already in flight", async () => {
  const calls = [];

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    {
      selectedArtifactId: "artifact_1",
      detail: {
        item: { artifactId: "artifact_1" },
        suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
      },
      actionLoading: true,
      actionArtifactId: "artifact_1",
      actionSuggestionId: "suggestion_1",
      actionError: "stale action error"
    },
    async () => {
      calls.push("adopt");
    },
    () => ({ thesis: "x" }),
    async () => {
      calls.push("update");
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed", "suggestion_1");
  assert.equal(result, null);
  assert.deepEqual(calls, []);
});

test("applyAiInboxSuggestionStatus warns when another inbox action is already running for a different suggestion", async () => {
  const statuses = [];
  const calls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: {
      item: { artifactId: "artifact_2" },
      suggestion: { id: "suggestion_2", status: "edited", content: { thesis: "x" } }
    },
    actionLoading: true,
    actionArtifactId: "artifact_1",
    actionSuggestionId: "suggestion_1",
    actionError: ""
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async () => {
      calls.push("adopt");
    },
    () => ({ thesis: "x" }),
    async () => {
      calls.push("update");
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    (message, tone, artifactId, suggestionId) => {
      aiInboxState.actionNoticeArtifactId = artifactId || "";
      aiInboxState.actionNoticeSuggestionId = suggestionId || "";
      aiInboxState.actionNotice = message;
      aiInboxState.actionNoticeTone = tone;
    },
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed", "suggestion_2");
  assert.equal(result, null);
  assert.deepEqual(calls, []);
  assert.deepEqual(statuses, [
    {
      message: "Another AI inbox review action is still running. Wait for it to finish before reviewing a different item.",
      tone: "warn"
    }
  ]);
  assert.equal(aiInboxState.actionNoticeArtifactId, "artifact_2");
  assert.equal(aiInboxState.actionNoticeSuggestionId, "suggestion_2");
  assert.equal(
    aiInboxState.actionNotice,
    "Another AI inbox review action is still running. Wait for it to finish before reviewing a different item."
  );
  assert.equal(aiInboxState.actionNoticeTone, "warn");
});

test("applyAiInboxRecommendedAction reloads fresh detail instead of dispatching against a stale selection", async () => {
  const loadCalls = [];
  const notices = [];
  const statuses = [];
  let acceptCalls = 0;
  let confirmCalls = 0;
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: { item: { artifactId: "artifact_1" } },
    detailLoading: false,
    aiSummaryRecommendedAction: "accept_link"
  };

  const applyAiInboxRecommendedAction = createApplyAiInboxRecommendedAction(
    () => ({ value: "" }),
    {
      confirm() {
        confirmCalls += 1;
        return true;
      }
    },
    aiInboxState,
    async (artifactId) => {
      loadCalls.push(artifactId);
      return { item: { artifactId } };
    },
    (message, tone) => notices.push({ message, tone }),
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
      return null;
    },
    async () => {
      acceptCalls += 1;
      return null;
    },
    async () => null,
    async () => null,
    async () => null,
    () => "Detail changed while you were reviewing. Retry from the latest reviewed item.",
    () => "AI inbox detail changed before the review action could run. Retry on the latest detail."
  );

  const result = await applyAiInboxRecommendedAction("accept_link");
  assert.equal(result, null);
  assert.equal(confirmCalls, 0);
  assert.equal(acceptCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(notices, [
    {
      message: "Detail changed while you were reviewing. Retry from the latest reviewed item.",
      tone: "warn"
    }
  ]);
  assert.deepEqual(statuses, [
    {
      message: "AI inbox detail changed before the review action could run. Retry on the latest detail.",
      tone: "warn"
    }
  ]);
});

test("applyAiInboxRecommendedAction delegates accept_link to the same action handler as the manual button", async () => {
  const acceptCalls = [];
  const confirmPrompts = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" } },
    detailLoading: false,
    aiSummaryRecommendedAction: "accept_link"
  };

  const applyAiInboxRecommendedAction = createApplyAiInboxRecommendedAction(
    () => ({ value: "" }),
    {
      confirm(message) {
        confirmPrompts.push(message);
        return true;
      }
    },
    aiInboxState,
    async () => {
      throw new Error("loadAiInboxDetail should not run for fresh detail");
    },
    () => {},
    () => {},
    () => {
      throw new Error("setStatus should not be used on the successful delegated path");
    },
    async (artifactId) => {
      acceptCalls.push(artifactId);
      return { ok: true, artifactId };
    },
    async () => null,
    async () => null,
    async () => null
  );

  const result = await applyAiInboxRecommendedAction();
  assert.deepEqual(confirmPrompts, ["Apply AI recommended action: create the suggested relation?"]);
  assert.deepEqual(acceptCalls, ["artifact_1"]);
  assert.deepEqual(result, { ok: true, artifactId: "artifact_1" });
});

test("applyAiInboxRecommendedAction reloads latest detail instead of dispatching from list-only selection state", async () => {
  const loadCalls = [];
  const notices = [];
  const statuses = [];
  let acceptCalls = 0;
  let confirmCalls = 0;
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: null,
    detailLoading: false,
    detailError: "old detail error",
    actionLoading: false,
    aiSummaryRecommendedAction: "accept_link"
  };

  const applyAiInboxRecommendedAction = createApplyAiInboxRecommendedAction(
    () => ({ value: "" }),
    {
      confirm() {
        confirmCalls += 1;
        return true;
      }
    },
    aiInboxState,
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detail = { item: { artifactId } };
      return aiInboxState.detail;
    },
    (message, tone) => notices.push({ message, tone }),
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
      return null;
    },
    async () => {
      acceptCalls += 1;
      return null;
    },
    async () => null,
    async () => null,
    async () => null,
    () => "Load the latest inbox detail before running review actions.",
    () => "AI inbox detail is not ready yet. Retry after the latest detail loads."
  );

  const result = await applyAiInboxRecommendedAction("accept_link");
  assert.equal(result, null);
  assert.equal(confirmCalls, 0);
  assert.equal(acceptCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(notices, [{ message: "Load the latest inbox detail before running review actions.", tone: "warn" }]);
  assert.deepEqual(statuses, [{ message: "AI inbox detail is not ready yet. Retry after the latest detail loads.", tone: "warn" }]);
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxRecommendedAction forwards the summary suggestion id when adopting a field suggestion", async () => {
  const adoptCalls = [];
  const confirmPrompts = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_latest" }
    },
    detailLoading: false,
    aiSummaryRecommendedAction: "adopt_field_suggestion",
    aiSummarySuggestionId: "suggestion_from_summary"
  };

  const applyAiInboxRecommendedAction = createApplyAiInboxRecommendedAction(
    () => ({ value: "" }),
    {
      confirm(message) {
        confirmPrompts.push(message);
        return true;
      }
    },
    aiInboxState,
    async () => {
      throw new Error("loadAiInboxDetail should not run for fresh detail");
    },
    () => {},
    () => {},
    () => {
      throw new Error("setStatus should not be used on the successful delegated path");
    },
    async () => null,
    async (artifactId, suggestionId) => {
      adoptCalls.push({ artifactId, suggestionId });
      return { ok: true, artifactId, suggestionId };
    },
    async () => null,
    async () => null
  );

  const result = await applyAiInboxRecommendedAction();
  assert.deepEqual(confirmPrompts, ["Apply AI recommended action: adopt the field suggestion as a draft?"]);
  assert.deepEqual(adoptCalls, [
    { artifactId: "artifact_1", suggestionId: "suggestion_from_summary" }
  ]);
  assert.deepEqual(result, { ok: true, artifactId: "artifact_1", suggestionId: "suggestion_from_summary" });
});

test("applyAiInboxRecommendedAction routes promote ignore context unsupported and cancelled actions", async () => {
  const baseState = () => ({
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" }, suggestion: { id: "suggestion_1" } },
    detailLoading: false,
    aiSummaryRecommendedAction: ""
  });

  const routed = [];
  const statuses = [];
  const comments = [];
  const depsFor = (aiInboxState, confirm = () => true) => ({
    aiInboxState,
    confirm,
    appendDecisionComment: (comment) => comments.push(comment),
    acceptLink: async (artifactId) => routed.push(["accept", artifactId]),
    adoptFieldSuggestion: async (artifactId, suggestionId) => routed.push(["adopt", artifactId, suggestionId]),
    promoteNote: async (artifactId) => {
      routed.push(["promote", artifactId]);
      return { promoted: artifactId };
    },
    recordDecision: async (decision) => {
      routed.push(["record", decision]);
      return { decision };
    },
    loadAiInboxDetail: async () => {
      throw new Error("loadAiInboxDetail should not run for fresh detail");
    },
    setAiInboxActionNotice: () => {},
    setStatus: (message, tone) => statuses.push({ message, tone }),
    render: () => {}
  });

  const promoteState = baseState();
  assert.deepEqual(
    await applyAiInboxRecommendedActionForRuntime(depsFor(promoteState), "promote_note"),
    { promoted: "artifact_1" }
  );
  assert.deepEqual(routed.pop(), ["promote", "artifact_1"]);

  const ignoreState = baseState();
  assert.deepEqual(
    await applyAiInboxRecommendedActionForRuntime(depsFor(ignoreState), "ignore"),
    { decision: "ignored" }
  );
  assert.deepEqual(routed.pop(), ["record", "ignored"]);

  const contextState = baseState();
  assert.deepEqual(
    await applyAiInboxRecommendedActionForRuntime(depsFor(contextState), "needs_more_context"),
    { decision: "revised" }
  );
  assert.deepEqual(comments, ["AI recommendation: needs_more_context"]);
  assert.deepEqual(routed.pop(), ["record", "revised"]);

  const unsupportedState = baseState();
  const unsupported = await applyAiInboxRecommendedActionForRuntime(depsFor(unsupportedState), "do_something_else");
  assert.equal(unsupported, undefined);
  assert.deepEqual(statuses.at(-1), { message: "Unsupported AI recommended action: do_something_else", tone: "warn" });

  const cancelledState = baseState();
  const cancelled = await applyAiInboxRecommendedActionForRuntime(depsFor(cancelledState, () => false), "promote_note");
  assert.equal(cancelled, false);
  assert.notDeepEqual(routed.at(-1), ["promote", "artifact_1"]);
});

test("refreshAiInbox invalidates stale detail state when a list refresh switches the selected artifact", async () => {
  const aiInboxState = {
    filters: { view: "pending", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Old selection" }],
    counts: {},
    views: [],
    loading: false,
    error: "stale detail error",
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1", title: "Old detail" } },
    detailLoading: true,
    detailError: "stale detail error",
    actionError: "stale action error",
    detailRequestToken: 4,
    aiSummary: "stale summary",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "ignore",
    aiSummaryError: "stale summary error"
  };

  const refreshAiInbox = createRefreshAiInbox(aiInboxState, {
    fetchAiInbox: async () => ({
      items: [{ artifactId: "artifact_2", title: "New selection" }],
      counts: { pending: 1, reviewed: 0, archived: 0, all: 1 },
      views: ["pending"],
      canonical: {
        items: [{ artifact_id: "artifact_2", title: "New selection" }]
      }
    }),
    aiInboxItemFromCanonical: (item) => ({ artifactId: item.artifact_id, title: item.title }),
    resetAiInboxSummaryState: () => {
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
    }
  });

  await refreshAiInbox({ silent: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.detailRequestToken, 5);
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("refreshAiInbox invalidates stale detail state when the selected artifact metadata changes", async () => {
  const aiInboxState = {
    filters: { view: "pending", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Old selection", status: "pending_review", updatedAt: "2026-05-18T12:00:00.000Z" }],
    counts: {},
    views: [],
    loading: false,
    error: "stale detail error",
    selectedArtifactId: "artifact_1",
    detail: {
      item: {
        artifactId: "artifact_1",
        title: "Old detail",
        status: "pending_review",
        actionState: "needs_review",
        updatedAt: "2026-05-18T12:00:00.000Z",
        decisionCount: 0
      }
    },
    detailLoading: true,
    detailError: "stale detail error",
    actionError: "stale action error",
    detailRequestToken: 8,
    aiSummary: "stale summary",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "ignore",
    aiSummaryError: "stale summary error"
  };

  const refreshAiInbox = createRefreshAiInbox(aiInboxState, {
    fetchAiInbox: async () => ({
      items: [{ artifactId: "artifact_1", title: "Old selection", status: "ignored", actionState: "reviewed", updatedAt: "2026-05-18T12:05:00.000Z", decisionCount: 1 }],
      counts: { pending: 0, reviewed: 1, archived: 0, all: 1 },
      views: ["pending", "reviewed"],
      canonical: {
        items: [{
          artifact_id: "artifact_1",
          title: "Old selection",
          status: "ignored",
          action_state: "reviewed",
          updated_at: "2026-05-18T12:05:00.000Z",
          decision_count: 1
        }]
      }
    }),
    aiInboxItemFromCanonical: (item) => ({
      artifactId: item.artifact_id,
      title: item.title,
      status: item.status,
      actionState: item.action_state,
      updatedAt: item.updated_at,
      decisionCount: item.decision_count
    }),
    resetAiInboxSummaryState: () => {
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
    }
  });

  await refreshAiInbox({ silent: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_1");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.detailRequestToken, 9);
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("refreshAiInbox realigns selection even when preserveDetail was requested but the current artifact left the filtered list", async () => {
  const aiInboxState = {
    filters: { view: "reviewed", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Old reviewed selection" }],
    counts: {},
    views: [],
    loading: false,
    error: "",
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1", title: "Old reviewed detail" } },
    detailLoading: false,
    detailError: "stale detail error",
    actionError: "stale action error",
    detailRequestToken: 10,
    aiSummary: "stale summary",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "ignore",
    aiSummaryError: "stale summary error"
  };

  const refreshAiInbox = createRefreshAiInbox(aiInboxState, {
    fetchAiInbox: async () => ({
      items: [{ artifactId: "artifact_2", title: "Remaining reviewed item" }],
      counts: { pending: 0, reviewed: 1, archived: 0, all: 1 },
      views: ["reviewed"],
      canonical: {
        items: [{ artifact_id: "artifact_2", title: "Remaining reviewed item" }]
      }
    }),
    aiInboxItemFromCanonical: (item) => ({ artifactId: item.artifact_id, title: item.title }),
    resetAiInboxSummaryState: () => {
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
    }
  });

  await refreshAiInbox({ silent: true, preserveDetail: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailRequestToken, 11);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("refreshAiInbox invalidates stale reviewed detail even when preserveDetail keeps the current selection", async () => {
  const aiInboxState = {
    filters: { view: "reviewed", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Reviewed selection", status: "ignored", actionState: "reviewed", updatedAt: "2026-05-18T12:00:00.000Z", decisionCount: 1 }],
    counts: {},
    views: [],
    loading: false,
    error: "",
    selectedArtifactId: "artifact_1",
    detail: {
      item: {
        artifactId: "artifact_1",
        title: "Reviewed detail",
        status: "ignored",
        actionState: "reviewed",
        updatedAt: "2026-05-18T12:00:00.000Z",
        decisionCount: 1
      }
    },
    detailLoading: false,
    detailError: "stale detail error",
    actionError: "stale action error",
    detailRequestToken: 11,
    aiSummary: "stale summary",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "ignore",
    aiSummaryError: "stale summary error"
  };

  const refreshAiInbox = createRefreshAiInbox(aiInboxState, {
    fetchAiInbox: async () => ({
      items: [{ artifactId: "artifact_1", title: "Reviewed selection", status: "archived", actionState: "reviewed", updatedAt: "2026-05-18T12:10:00.000Z", decisionCount: 2 }],
      counts: { pending: 0, reviewed: 0, archived: 1, all: 1 },
      views: ["reviewed", "archived"],
      canonical: {
        items: [{
          artifact_id: "artifact_1",
          title: "Reviewed selection",
          status: "archived",
          action_state: "reviewed",
          updated_at: "2026-05-18T12:10:00.000Z",
          decision_count: 2
        }]
      }
    }),
    aiInboxItemFromCanonical: (item) => ({
      artifactId: item.artifact_id,
      title: item.title,
      status: item.status,
      actionState: item.action_state,
      updatedAt: item.updated_at,
      decisionCount: item.decision_count
    }),
    resetAiInboxSummaryState: () => {
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
    }
  });

  await refreshAiInbox({ silent: true, preserveDetail: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_1");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.detailRequestToken, 12);
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("refreshAiInbox invalidates and rehydrates detail when the linked suggestion changes under the same artifact", async () => {
  const detailLoads = [];
  const aiInboxState = {
    filters: { view: "reviewed", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Reviewed selection", suggestionId: "suggestion_old" }],
    counts: {},
    views: [],
    loading: false,
    error: "",
    selectedArtifactId: "artifact_1",
    detail: {
      item: {
        artifactId: "artifact_1",
        title: "Reviewed detail",
        status: "adopted_as_draft",
        actionState: "reviewed",
        updatedAt: "2026-05-18T12:00:00.000Z",
        decisionCount: 1
      },
      suggestion: { id: "suggestion_old", status: "adopted_as_draft" }
    },
    detailLoading: false,
    detailError: "stale detail error",
    actionError: "stale action error",
    detailRequestToken: 20,
    aiSummary: "stale summary",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "adopt_field_suggestion",
    aiSummaryError: "stale summary error"
  };

  const refreshAiInbox = createRefreshAiInbox(aiInboxState, {
    fetchAiInbox: async () => ({
      items: [{ artifactId: "artifact_1", title: "Reviewed selection", suggestionId: "suggestion_new" }],
      counts: { pending: 0, reviewed: 1, archived: 0, all: 1 },
      views: ["reviewed"],
      canonical: {
        items: [{
          artifact_id: "artifact_1",
          title: "Reviewed selection",
          status: "adopted_as_draft",
          action_state: "reviewed",
          updated_at: "2026-05-18T12:00:00.000Z",
          suggestion_id: "suggestion_new",
          decision_count: 1
        }]
      }
    }),
    aiInboxItemFromCanonical: (item) => ({
      artifactId: item.artifact_id,
      title: item.title,
      status: item.status,
      actionState: item.action_state,
      updatedAt: item.updated_at,
      suggestionId: item.suggestion_id,
      decisionCount: item.decision_count
    }),
    loadAiInboxDetail: async (artifactId) => {
      detailLoads.push(artifactId);
      aiInboxState.detail = {
        item: {
          artifactId,
          title: "Reviewed selection",
          status: "adopted_as_draft",
          actionState: "reviewed",
          updatedAt: "2026-05-18T12:00:00.000Z",
          decisionCount: 1
        },
        suggestion: { id: "suggestion_new", status: "adopted_as_draft" }
      };
      return aiInboxState.detail;
    },
    resetAiInboxSummaryState: () => {
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
    }
  });

  await refreshAiInbox({ silent: true, preserveDetail: true });

  assert.equal(aiInboxState.selectedArtifactId, "artifact_1");
  assert.deepEqual(detailLoads, ["artifact_1"]);
  assert.equal(aiInboxState.detail?.suggestion?.id, "suggestion_new");
  assert.equal(aiInboxState.detailRequestToken, 21);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
});

test("refreshAiInbox rehydrates the selected detail after invalidating stale metadata", async () => {
  const detailLoads = [];
  const aiInboxState = {
    filters: { view: "pending", type: "all" },
    items: [{ artifactId: "artifact_1", title: "Old selection", status: "pending_review", updatedAt: "2026-05-18T12:00:00.000Z" }],
    counts: {},
    views: [],
    loading: false,
    error: "",
    selectedArtifactId: "artifact_1",
    detail: {
      item: {
        artifactId: "artifact_1",
        title: "Old detail",
        status: "pending_review",
        actionState: "needs_review",
        updatedAt: "2026-05-18T12:00:00.000Z",
        decisionCount: 0
      }
    },
    detailLoading: true,
    detailError: "stale detail error",
    actionError: "stale action error",
    detailRequestToken: 12,
    aiSummary: "stale summary",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "ignore",
    aiSummaryError: "stale summary error"
  };

  const refreshAiInbox = createRefreshAiInbox(aiInboxState, {
    fetchAiInbox: async () => ({
      items: [{ artifactId: "artifact_1", title: "Old selection", status: "ignored", actionState: "reviewed", updatedAt: "2026-05-18T12:05:00.000Z", decisionCount: 1 }],
      counts: { pending: 0, reviewed: 1, archived: 0, all: 1 },
      views: ["pending", "reviewed"],
      canonical: {
        items: [{
          artifact_id: "artifact_1",
          title: "Old selection",
          status: "ignored",
          action_state: "reviewed",
          updated_at: "2026-05-18T12:05:00.000Z",
          decision_count: 1
        }]
      }
    }),
    aiInboxItemFromCanonical: (item) => ({
      artifactId: item.artifact_id,
      title: item.title,
      status: item.status,
      actionState: item.action_state,
      updatedAt: item.updated_at,
      decisionCount: item.decision_count
    }),
    loadAiInboxDetail: async (artifactId) => {
      detailLoads.push(artifactId);
      aiInboxState.detail = {
        item: {
          artifactId,
          title: "Fresh detail",
          status: "ignored",
          actionState: "reviewed",
          updatedAt: "2026-05-18T12:05:00.000Z",
          decisionCount: 1
        }
      };
      aiInboxState.detailLoading = false;
      aiInboxState.detailError = "";
      return aiInboxState.detail.item;
    },
    resetAiInboxSummaryState: () => {
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
    }
  });

  await refreshAiInbox({ silent: true });

  assert.deepEqual(detailLoads, ["artifact_1"]);
  assert.equal(aiInboxState.selectedArtifactId, "artifact_1");
  assert.equal(aiInboxState.detail?.item?.status, "ignored");
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionError, "");
});

test("recordAiInboxReviewDecision stores action failures separately from detail state", async () => {
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" } },
    detailArtifactId: "artifact_1",
    actionLoading: false,
    actionArtifactId: "",
    actionError: "old action error",
    detailError: "old detail error"
  };

  const recordDecision = createRecordDecisionFromPrototypeHarness(
    () => ({ value: "" }),
    aiInboxState,
    async () => {
      throw new Error("decision boom");
    },
    () => ({}),
    (response) => response,
    async () => true,
    () => {},
    async () => {},
    async () => {},
    () => "handled",
    () => {},
    () => {},
    () => {},
    () => "Detail changed while you were reviewing. Retry from the latest reviewed item.",
    () => "AI inbox detail changed before the review action could run. Retry on the latest detail."
  );

  const result = await recordDecision("accepted");
  assert.equal(result, null);
  assert.equal(aiInboxState.actionArtifactId, "artifact_1");
  assert.equal(aiInboxState.actionError, "decision boom");
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("recordAiInboxReviewDecision warns when another inbox action is already running for a different artifact", async () => {
  const statuses = [];
  let decisionCalls = 0;
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: { item: { artifactId: "artifact_2" } },
    actionLoading: true,
    actionArtifactId: "artifact_1",
    actionError: ""
  };

  const recordAiInboxReviewDecision = createRecordAiInboxReviewDecision(
    () => ({ value: "" }),
    aiInboxState,
    async () => {
      decisionCalls += 1;
      return null;
    },
    () => ({}),
    async () => {},
    async () => {},
    async () => {},
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    (message, tone, artifactId, suggestionId) => {
      aiInboxState.actionNoticeArtifactId = artifactId || "";
      aiInboxState.actionNoticeSuggestionId = suggestionId || "";
      aiInboxState.actionNotice = message;
      aiInboxState.actionNoticeTone = tone;
    },
    () => {},
    () => {},
    () => null,
    () => "accepted"
  );

  const result = await recordAiInboxReviewDecision("accepted");
  assert.equal(result, null);
  assert.equal(decisionCalls, 0);
  assert.deepEqual(statuses, [
    {
      message: "Another AI inbox review action is still running. Wait for it to finish before reviewing a different item.",
      tone: "warn"
    }
  ]);
  assert.equal(aiInboxState.actionNoticeArtifactId, "artifact_2");
  assert.equal(aiInboxState.actionNoticeSuggestionId, "");
  assert.equal(
    aiInboxState.actionNotice,
    "Another AI inbox review action is still running. Wait for it to finish before reviewing a different item."
  );
  assert.equal(aiInboxState.actionNoticeTone, "warn");
});

test("recordAiInboxReviewDecision keeps a failed action bound to the original artifact after selection moves", async () => {
  let rejectDecision;
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" } },
    detailArtifactId: "artifact_1",
    actionLoading: false,
    actionArtifactId: "",
    actionError: "",
    detailError: ""
  };

  const recordDecision = createRecordDecisionFromPrototypeHarness(
    () => ({ value: "" }),
    aiInboxState,
    () =>
      new Promise((_, reject) => {
        rejectDecision = () => reject(new Error("decision boom"));
      }),
    () => ({}),
    (response) => response,
    async () => true,
    () => {},
    async () => {},
    async () => {},
    () => "handled",
    () => {},
    () => {},
    () => {},
    () => "Detail changed while you were reviewing. Retry from the latest reviewed item.",
    () => "AI inbox detail changed before the review action could run. Retry on the latest detail."
  );

  const pending = recordDecision("accepted");
  aiInboxState.selectedArtifactId = "artifact_2";
  aiInboxState.detail = { item: { artifactId: "artifact_2" } };
  aiInboxState.detailArtifactId = "artifact_2";
  rejectDecision();
  const result = await pending;

  assert.equal(result, null);
  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.actionArtifactId, "artifact_1");
  assert.equal(aiInboxState.actionError, "decision boom");
  assert.equal(aiInboxState.actionLoading, false);
});

test("recordAiInboxReviewDecision reloads fresh detail instead of submitting against a stale selection", async () => {
  let recordCalls = 0;
  const loadCalls = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: { item: { artifactId: "artifact_1" } },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

  const recordDecision = createRecordDecisionFromPrototypeHarness(
    () => ({ value: "" }),
    aiInboxState,
    async () => {
      recordCalls += 1;
      return null;
    },
    () => ({}),
    (response) => response,
    async (artifactId) => {
      loadCalls.push(artifactId);
      return { item: { artifactId } };
    },
    () => {},
    async () => {},
    async () => {},
    () => "handled",
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {},
    (message, tone, artifactId) => {
      aiInboxState.actionNoticeArtifactId = artifactId || "";
      aiInboxState.actionNotice = message || "";
      aiInboxState.actionNoticeTone = tone || "";
    },
    () => {},
    () => "Detail changed while you were reviewing. Retry from the latest reviewed item.",
    () => "AI inbox detail changed before the review action could run. Retry on the latest detail.",
  );

  const result = await recordDecision("accepted");
  assert.equal(result, null);
  assert.equal(recordCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(statuses, [{ message: "AI inbox detail changed before the review action could run. Retry on the latest detail.", tone: "warn" }]);
  assert.equal(aiInboxState.actionNoticeArtifactId, "artifact_2");
  assert.equal(aiInboxState.actionNotice, "Detail changed while you were reviewing. Retry from the latest reviewed item.");
  assert.equal(aiInboxState.actionNoticeTone, "warn");
  assert.equal(aiInboxState.actionLoading, false);
});

test("recordAiInboxReviewDecision reloads latest detail instead of submitting against list-only selection state", async () => {
  let recordCalls = 0;
  const loadCalls = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: null,
    detailLoading: false,
    detailError: "old detail error",
    actionLoading: false,
    actionError: ""
  };

  const recordDecision = createRecordDecisionFromPrototypeHarness(
    () => ({ value: "" }),
    aiInboxState,
    async () => {
      recordCalls += 1;
      return null;
    },
    () => ({}),
    (response) => response,
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detail = { item: { artifactId } };
      return { item: { artifactId } };
    },
    () => {},
    async () => {},
    async () => {},
    () => "handled",
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {},
    (message, tone, artifactId) => {
      aiInboxState.actionNoticeArtifactId = artifactId || "";
      aiInboxState.actionNotice = message || "";
      aiInboxState.actionNoticeTone = tone || "";
    },
    () => {},
    () => "Load the latest inbox detail before running review actions.",
    () => "AI inbox detail is not ready yet. Retry after the latest detail loads."
  );

  const result = await recordDecision("accepted");
  assert.equal(result, null);
  assert.equal(recordCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(statuses, [
    {
      message: "AI inbox detail is not ready yet. Retry after the latest detail loads.",
      tone: "warn"
    }
  ]);
  assert.equal(aiInboxState.actionNoticeArtifactId, "artifact_2");
  assert.equal(aiInboxState.actionNotice, "Load the latest inbox detail before running review actions.");
  assert.equal(aiInboxState.actionNoticeTone, "warn");
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("recordAiInboxReviewDecision clears stale detail when refresh removes the artifact from the current inbox view", async () => {
  const refreshCalls = [];
  const loadCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1", title: "Old reviewed detail" } },
    actionLoading: false,
    actionError: "",
    detailError: "stale detail error",
    detailLoading: true
  };

  const recordDecision = createRecordDecisionFromPrototypeHarness(
    () => ({ value: "" }),
    aiInboxState,
    async () => ({ item: { artifactId: "artifact_1", title: "Archived action result" } }),
    () => ({}),
    (response) => response,
    async (artifactId) => {
      loadCalls.push(artifactId);
      return null;
    },
    () => {},
    async (options) => {
      refreshCalls.push(options);
      aiInboxState.selectedArtifactId = "";
      return true;
    },
    async () => true,
    () => "archived",
    () => {},
    () => {},
    () => {}
  );

  const result = await recordDecision("archived");
  assert.equal(result.item.artifactId, "artifact_1");
  assert.deepEqual(refreshCalls, [{ silent: true, preserveDetail: true }]);
  assert.deepEqual(loadCalls, []);
  assert.equal(aiInboxState.selectedArtifactId, "");
  assert.equal(aiInboxState.detail, null);
  assert.equal(aiInboxState.detailLoading, false);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionLoading, false);
});

test("acceptAiInboxLinkSuggestion is a no-op when the current detail is already linked", async () => {
  let acceptCalls = 0;
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: {
        id: "artifact_1",
        status: "linked_to_note",
        userDecisions: [{ decision: "linked_to_note", noteId: "note_1" }]
      }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

  const acceptAiInboxLinkSuggestion = createAcceptAiInboxLinkSuggestion(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => aiInboxState.detail.artifact,
    (artifact) => artifact.userDecisions.at(-1),
    () => {},
    async () => {
      acceptCalls += 1;
      return null;
    },
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    async () => {},
    { module: "notes" },
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {}
  );

  const result = await acceptAiInboxLinkSuggestion("artifact_1");
  assert.equal(result, null);
  assert.equal(acceptCalls, 0);
  assert.deepEqual(statuses, [{ message: "This relation was already created for the current reviewed item.", tone: "ok" }]);
});

test("acceptAiInboxLinkSuggestion reloads latest detail instead of submitting from list-only selection state", async () => {
  let acceptCalls = 0;
  const loadCalls = [];
  const notices = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: null,
    detailLoading: false,
    detailError: "old detail error",
    actionLoading: false,
    actionError: ""
  };

  const acceptAiInboxLinkSuggestion = createAcceptAiInboxLinkSuggestion(
    () => ({ value: "" }),
    aiInboxState,
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detail = { item: { artifactId } };
      return aiInboxState.detail;
    },
    () => null,
    () => null,
    (message, tone, artifactId) => {
      notices.push({ message, tone, artifactId });
      aiInboxState.actionNoticeArtifactId = artifactId || "";
    },
    async () => {
      acceptCalls += 1;
      return null;
    },
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    async () => {},
    { module: "explorer", notes: [] },
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {},
    () => "Load the latest inbox detail before running review actions.",
    () => "AI inbox detail is not ready yet. Retry after the latest detail loads."
  );

  const result = await acceptAiInboxLinkSuggestion("artifact_2");
  assert.equal(result, null);
  assert.equal(acceptCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(notices, [
    { message: "Load the latest inbox detail before running review actions.", tone: "warn", artifactId: "artifact_2" }
  ]);
  assert.deepEqual(statuses, [{ message: "AI inbox detail is not ready yet. Retry after the latest detail loads.", tone: "warn" }]);
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("acceptAiInboxLinkSuggestion reloads the selected detail after refresh to keep canonical detail aligned", async () => {
  const loadCalls = [];
  const refreshCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: { id: "artifact_1", status: "pending_review", userDecisions: [] }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: "",
    detailError: "old detail error"
  };

  const acceptAiInboxLinkSuggestion = createAcceptAiInboxLinkSuggestion(
    () => ({ value: "" }),
    aiInboxState,
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detailError = "";
      return { item: { artifactId, status: "linked_to_note" } };
    },
    () => aiInboxState.detail.artifact,
    (artifact) => artifact.userDecisions.at(-1),
    () => {},
    async () => ({ item: { artifactId: "artifact_1", status: "linked_to_note" }, relation: { created: true } }),
    (response) => response,
    () => {},
    async (options) => {
      refreshCalls.push(options);
      return true;
    },
    async () => {},
    { module: "notes" },
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await acceptAiInboxLinkSuggestion("artifact_1");
  assert.equal(result.item.artifactId, "artifact_1");
  assert.deepEqual(refreshCalls, [{ silent: true, preserveDetail: true }]);
  assert.deepEqual(loadCalls, ["artifact_1"]);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionLoading, false);
});

test("promoteAiInboxArtifactToNote is a no-op when the current detail is already promoted", async () => {
  let promoteCalls = 0;
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: {
        id: "artifact_1",
        status: "promoted_to_note",
        userDecisions: [{ decision: "promoted_to_note", noteId: "note_1" }]
      }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

  const promoteAiInboxArtifactToNote = createPromoteAiInboxArtifactToNote(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => aiInboxState.detail.artifact,
    (artifact) => artifact.userDecisions.at(-1),
    () => {},
    async () => {
      promoteCalls += 1;
      return null;
    },
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    (note) => note,
    { notes: [] },
    () => {},
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {}
  );

  const result = await promoteAiInboxArtifactToNote("artifact_1");
  assert.equal(result, null);
  assert.equal(promoteCalls, 0);
  assert.deepEqual(statuses, [{ message: "This draft note already exists for the current reviewed item.", tone: "ok" }]);
});

test("promoteAiInboxArtifactToNote reloads latest detail instead of submitting from list-only selection state", async () => {
  let promoteCalls = 0;
  const loadCalls = [];
  const notices = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: null,
    detailLoading: false,
    detailError: "old detail error",
    actionLoading: false,
    actionError: ""
  };

  const promoteAiInboxArtifactToNote = createPromoteAiInboxArtifactToNote(
    () => ({ value: "" }),
    aiInboxState,
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detail = { item: { artifactId } };
      return aiInboxState.detail;
    },
    () => null,
    () => null,
    (message, tone, artifactId) => {
      notices.push({ message, tone, artifactId });
      aiInboxState.actionNoticeArtifactId = artifactId || "";
    },
    async () => {
      promoteCalls += 1;
      return null;
    },
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    (note) => note,
    { notes: [] },
    () => {},
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {},
    () => "Load the latest inbox detail before running review actions.",
    () => "AI inbox detail is not ready yet. Retry after the latest detail loads."
  );

  const result = await promoteAiInboxArtifactToNote("artifact_2");
  assert.equal(result, null);
  assert.equal(promoteCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(notices, [
    { message: "Load the latest inbox detail before running review actions.", tone: "warn", artifactId: "artifact_2" }
  ]);
  assert.deepEqual(statuses, [{ message: "AI inbox detail is not ready yet. Retry after the latest detail loads.", tone: "warn" }]);
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("promoteAiInboxArtifactToNote reloads the selected detail after refresh to keep canonical detail aligned", async () => {
  const loadCalls = [];
  const refreshCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: { id: "artifact_1", status: "pending_review", userDecisions: [] }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: "",
    detailError: "old detail error"
  };

  const promoteAiInboxArtifactToNote = createPromoteAiInboxArtifactToNote(
    () => ({ value: "" }),
    aiInboxState,
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detailError = "";
      return { item: { artifactId, status: "promoted_to_note" } };
    },
    () => aiInboxState.detail.artifact,
    (artifact) => artifact.userDecisions.at(-1),
    () => {},
    async () => ({ item: { artifactId: "artifact_1", status: "promoted_to_note" }, note: { id: "note_1" } }),
    (response) => response,
    () => {},
    async (options) => {
      refreshCalls.push(options);
      return true;
    },
    async () => {},
    (note) => note,
    { notes: [] },
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await promoteAiInboxArtifactToNote("artifact_1");
  assert.equal(result.item.artifactId, "artifact_1");
  assert.deepEqual(refreshCalls, [{ silent: true, preserveDetail: true }]);
  assert.deepEqual(loadCalls, ["artifact_1"]);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionLoading, false);
});

test("adoptAiInboxFieldSuggestionDraft is a no-op when the current detail is already adopted", async () => {
  let adoptCalls = 0;
  let actionNotice = "";
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: {
        id: "artifact_1",
        status: "adopted_as_draft",
        userDecisions: [{ decision: "adopted_as_draft", noteId: "note_1" }]
      },
      suggestion: {
        id: "suggestion_1",
        status: "confirmed"
      }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

  const adoptAiInboxFieldSuggestionDraft = createAdoptAiInboxFieldSuggestionDraft(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => aiInboxState.detail.artifact,
    () => aiInboxState.detail.suggestion,
    (artifact) => artifact.userDecisions.at(-1),
    (status) => ({ confirmed: "Confirmed" }[status] || status),
    (message) => {
      actionNotice = message;
    },
    async () => {
      adoptCalls += 1;
      return null;
    },
    () => ({}),
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    (note) => note,
    { notes: [] },
    () => {},
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {},
    () => "Detail changed while you were reviewing. Retry from the latest reviewed item.",
    () => "AI inbox detail changed before the review action could run. Retry on the latest detail."
  );

  const result = await adoptAiInboxFieldSuggestionDraft("artifact_1");
  assert.equal(result, null);
  assert.equal(adoptCalls, 0);
  assert.equal(actionNotice, "This field suggestion is already confirmed.");
  assert.deepEqual(statuses, [{ message: "This field suggestion is already Confirmed.", tone: "ok" }]);
});

test("adoptAiInboxFieldSuggestionDraft reloads latest detail instead of submitting from list-only selection state", async () => {
  let adoptCalls = 0;
  const loadCalls = [];
  const notices = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: null,
    detailLoading: false,
    detailError: "old detail error",
    actionLoading: false,
    actionError: ""
  };

  const adoptAiInboxFieldSuggestionDraft = createAdoptAiInboxFieldSuggestionDraft(
    () => ({ value: "" }),
    aiInboxState,
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detail = { item: { artifactId }, suggestion: { id: "suggestion_1", status: "edited" } };
      return aiInboxState.detail;
    },
    () => null,
    () => null,
    () => null,
    (status) => status,
    (message, tone, artifactId, suggestionId) => {
      notices.push({ message, tone, artifactId, suggestionId });
      aiInboxState.actionNoticeArtifactId = artifactId || "";
      aiInboxState.actionNoticeSuggestionId = suggestionId || "";
    },
    async () => {
      adoptCalls += 1;
      return null;
    },
    () => ({}),
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    (note) => note,
    { notes: [] },
    () => {},
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {},
    () => "Load the latest inbox detail before running review actions.",
    () => "AI inbox detail is not ready yet. Retry after the latest detail loads."
  );

  const result = await adoptAiInboxFieldSuggestionDraft("artifact_2", "suggestion_1");
  assert.equal(result, null);
  assert.equal(adoptCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(notices, [
    {
      message: "Load the latest inbox detail before running review actions.",
      tone: "warn",
      artifactId: "artifact_2",
      suggestionId: "suggestion_1"
    }
  ]);
  assert.deepEqual(statuses, [{ message: "AI inbox detail is not ready yet. Retry after the latest detail loads.", tone: "warn" }]);
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("adoptAiInboxFieldSuggestionDraft binds retry notices to the latest suggestion after same-artifact detail changes", async () => {
  let adoptCalls = 0;
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: { id: "artifact_1", status: "pending_review", userDecisions: [] },
      suggestion: { id: "suggestion_2", status: "suggested" }
    },
    detailLoading: false,
    actionLoading: false,
    actionNoticeArtifactId: "",
    actionNoticeSuggestionId: "",
    actionNotice: "",
    actionNoticeTone: "",
    actionError: ""
  };

  const adoptAiInboxFieldSuggestionDraft = createAdoptAiInboxFieldSuggestionDraft(
    () => ({ value: "" }),
    aiInboxState,
    async () => null,
    () => aiInboxState.detail.artifact,
    () => aiInboxState.detail.suggestion,
    (artifact) => artifact.userDecisions.at(-1),
    (status) => status,
    (message, tone, artifactId, suggestionId) => {
      aiInboxState.actionNotice = message;
      aiInboxState.actionNoticeTone = tone;
      aiInboxState.actionNoticeArtifactId = artifactId;
      aiInboxState.actionNoticeSuggestionId = suggestionId;
    },
    async () => {
      adoptCalls += 1;
      return null;
    },
    () => ({}),
    (response) => response,
    () => {},
    async () => {},
    async () => {},
    (note) => note,
    { notes: [] },
    () => {},
    () => {},
    (message, tone) => statuses.push({ message, tone }),
    () => {},
    () => {},
    () => "Detail changed while you were reviewing. Retry from the latest reviewed item.",
    () => "AI inbox detail changed before the review action could run. Retry on the latest detail."
  );

  const result = await adoptAiInboxFieldSuggestionDraft("artifact_1", "suggestion_1");
  assert.equal(result, null);
  assert.equal(adoptCalls, 0);
  assert.equal(aiInboxState.actionNoticeArtifactId, "artifact_1");
  assert.equal(aiInboxState.actionNoticeSuggestionId, "suggestion_2");
  assert.equal(aiInboxState.actionNotice, "Detail changed while you were reviewing. Retry from the latest reviewed item.");
  assert.equal(aiInboxState.actionNoticeTone, "warn");
  assert.deepEqual(statuses, [{ message: "AI inbox detail changed before the review action could run. Retry on the latest detail.", tone: "warn" }]);
});

test("adoptAiInboxFieldSuggestionDraft reloads the selected detail after refresh to keep canonical detail aligned", async () => {
  const loadCalls = [];
  const refreshCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      artifact: { id: "artifact_1", status: "pending_review", userDecisions: [] },
      suggestion: { id: "suggestion_1", status: "suggested" }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: "",
    detailError: "old detail error"
  };

  const adoptAiInboxFieldSuggestionDraft = createAdoptAiInboxFieldSuggestionDraft(
    () => ({ value: "" }),
    aiInboxState,
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detailError = "";
      return { item: { artifactId, status: "adopted_as_draft" } };
    },
    () => aiInboxState.detail.artifact,
    () => aiInboxState.detail.suggestion,
    (artifact) => artifact.userDecisions.at(-1),
    (status) => status,
    () => {},
    async () => ({ item: { artifactId: "artifact_1", status: "adopted_as_draft" }, note: { id: "note_1" } }),
    () => ({}),
    (response) => response,
    () => {},
    async (options) => {
      refreshCalls.push(options);
      return true;
    },
    async () => {},
    (note) => note,
    { notes: [] },
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await adoptAiInboxFieldSuggestionDraft("artifact_1");
  assert.equal(result.item.artifactId, "artifact_1");
  assert.deepEqual(refreshCalls, [{ silent: true, preserveDetail: true }]);
  assert.deepEqual(loadCalls, ["artifact_1"]);
  assert.equal(aiInboxState.detailError, "");
  assert.equal(aiInboxState.actionLoading, false);
});

test("AI inbox side effect controllers store action failures without clearing detail state", async () => {
  const cases = [
    {
      run: acceptAiInboxLinkSuggestionForRuntime,
      actionName: "acceptAiInboxLink",
      errorMessage: "accept boom",
      extraDeps: {}
    },
    {
      run: promoteAiInboxArtifactToNoteForRuntime,
      actionName: "promoteAiInboxNote",
      errorMessage: "promote boom",
      extraDeps: {}
    },
    {
      run: adoptAiInboxFieldSuggestionDraftForRuntime,
      actionName: "adoptAiInboxFieldSuggestion",
      errorMessage: "adopt boom",
      expectedSuggestionId: "suggestion_1",
      extraDeps: {
        aiInboxFeedback: () => ({ useful: true }),
        aiSuggestionStatusLabel: (status) => status
      }
    }
  ];

  for (const item of cases) {
    const statuses = [];
    const aiInboxState = {
      selectedArtifactId: "artifact_1",
      detail: {
        item: { artifactId: "artifact_1", title: "Stable detail" },
        artifact: { id: "artifact_1", status: "pending_review", userDecisions: [] },
        suggestion: { id: "suggestion_1", status: "suggested" }
      },
      actionLoading: false,
      actionArtifactId: "",
      actionSuggestionId: "",
      actionError: "",
      detailError: "old detail error"
    };
    const deps = {
      aiInboxState,
      currentAiInboxArtifactForSelection: () => aiInboxState.detail.artifact,
      currentAiInboxSuggestionForSelection: () => aiInboxState.detail.suggestion,
      latestArtifactDecision: () => null,
      commentText: () => "review comment",
      aiInboxDetailFromResponse: (response) => response,
      loadAiInboxDetail: async () => null,
      rememberAiDebugSnapshot: () => {},
      finalizeAiInboxActionRefresh: async () => {
        throw new Error("finalize should not run after action failure");
      },
      setStatus: (message, tone) => statuses.push({ message, tone }),
      setAiInboxActionNotice: () => {},
      clearAiInboxActionNotice: () => {},
      render: () => {},
      [item.actionName]: async () => {
        throw new Error(item.errorMessage);
      },
      ...item.extraDeps
    };

    const result = await item.run(deps, "artifact_1", item.expectedSuggestionId || "");
    assert.equal(result, null);
    assert.equal(aiInboxState.detail.item.title, "Stable detail");
    assert.equal(aiInboxState.detailError, "old detail error");
    assert.equal(aiInboxState.actionArtifactId, "artifact_1");
    assert.equal(aiInboxState.actionError, item.errorMessage);
    assert.equal(aiInboxState.actionLoading, false);
    assert.equal(statuses.at(-1).tone, "bad");
    assert.match(statuses.at(-1).message, new RegExp(item.errorMessage));
  }
});

test("recordAiInboxReviewDecision does not restore the old artifact when selection changes mid-submit", async () => {
  const refreshCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1", title: "Original artifact" } },
    actionLoading: false,
    actionError: "",
    detailError: ""
  };

  const recordDecision = createRecordDecisionFromPrototypeHarness(
    () => ({ value: "" }),
    aiInboxState,
    async () => {
      aiInboxState.selectedArtifactId = "artifact_2";
      aiInboxState.detail = { item: { artifactId: "artifact_2", title: "Newer selection" } };
      return { item: { artifactId: "artifact_1", title: "Old action result" } };
    },
    () => ({}),
    (response) => response,
    async () => true,
    () => {},
    async (options) => {
      refreshCalls.push(options);
      return true;
    },
    async () => true,
    () => "handled",
    () => {},
    () => {},
    () => {}
  );

  const result = await recordDecision("accepted");
  assert.equal(result.item.artifactId, "artifact_1");
  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail.item.artifactId, "artifact_2");
  assert.deepEqual(refreshCalls, [{ silent: true, preserveDetail: false }]);
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus stores action failures separately from detail state", async () => {
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: "old action error",
    detailError: "old detail error"
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      throw new Error("suggestion action boom");
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed", "suggestion_1");
  assert.equal(result, null);
  assert.equal(aiInboxState.actionArtifactId, "artifact_1");
  assert.equal(aiInboxState.actionSuggestionId, "suggestion_1");
  assert.equal(aiInboxState.actionError, "suggestion action boom");
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus keeps a failed suggestion action bound to the original suggestion after detail changes within the same artifact", async () => {
  let rejectAction;
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionArtifactId: "",
    actionSuggestionId: "",
    actionError: "",
    detailError: ""
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    () =>
      new Promise((_, reject) => {
        rejectAction = () => reject(new Error("suggestion action boom"));
      }),
    async () => {},
    async () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const pending = applyAiInboxSuggestionStatus("confirmed");
  aiInboxState.detail = {
    item: { artifactId: "artifact_1" },
    suggestion: { id: "suggestion_2", status: "edited", content: { thesis: "new" } }
  };
  rejectAction();
  const result = await pending;

  assert.equal(result, null);
  assert.equal(aiInboxState.selectedArtifactId, "artifact_1");
  assert.equal(aiInboxState.actionArtifactId, "artifact_1");
  assert.equal(aiInboxState.actionSuggestionId, "suggestion_1");
  assert.equal(aiInboxState.actionError, "suggestion action boom");
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus is a no-op when the reviewed suggestion already has the requested status", async () => {
  let updateCalls = 0;
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "rejected", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: ""
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {},
    (message, tone, artifactId, suggestionId) => {
      aiInboxState.actionNotice = message;
      aiInboxState.actionNoticeTone = tone;
      aiInboxState.actionNoticeArtifactId = artifactId;
      aiInboxState.actionNoticeSuggestionId = suggestionId;
    },
    () => {},
    (status) => ({ rejected: "Rejected" }[status] || status)
  );

  const result = await applyAiInboxSuggestionStatus("rejected");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.equal(aiInboxState.actionNoticeSuggestionId, "suggestion_1");
  assert.deepEqual(statuses, [{ message: "AI inbox suggestion already rejected: suggestion_1", tone: "ok" }]);
});

test("applyAiInboxSuggestionStatus formats success feedback with a human-readable status label", async () => {
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: ""
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => ({ item: { id: "suggestion_1", status: "confirmed" } }),
    async () => true,
    async () => true,
    async () => true,
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {},
    () => {},
    () => {},
    (status) => ({ confirmed: "Confirmed" }[status] || status)
  );

  const result = await applyAiInboxSuggestionStatus("confirmed", "suggestion_1");
  assert.equal(result, true);
  assert.deepEqual(statuses, [{ message: "AI inbox suggestion confirmed: suggestion_1", tone: "ok" }]);
});

test("applyAiInboxSuggestionStatus forwards the clicked suggestion id when routing adopted_as_draft through inbox draft adoption", async () => {
  const adoptCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "suggested", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: ""
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async (...args) => {
      adoptCalls.push(args);
      return "adopted";
    },
    () => ({ thesis: "x" }),
    async () => {
      throw new Error("updateAiSuggestion should not run for adopted_as_draft delegation");
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("adopted_as_draft", "suggestion_1");
  assert.equal(result, "adopted");
  assert.deepEqual(adoptCalls, [["artifact_1", "suggestion_1"]]);
});

test("applyAiInboxSuggestionStatus reloads fresh detail instead of submitting against a stale selection", async () => {
  let updateCalls = 0;
  const loadCalls = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    detailLoading: false,
    actionLoading: false,
    actionError: ""
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async (artifactId) => {
      loadCalls.push(artifactId);
      return { item: { artifactId } };
    },
    async () => {},
    async () => {},
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed", "suggestion_1");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(statuses, [
    {
      message: "AI inbox detail changed before the review action could run. Retry on the latest detail.",
      tone: "warn"
    }
  ]);
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus reloads latest inbox detail instead of submitting against list-only selection state", async () => {
  let updateCalls = 0;
  const loadCalls = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: null,
    detailLoading: false,
    detailError: "old detail error",
    actionLoading: false,
    actionError: ""
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detail = { item: { artifactId }, suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "fresh" } } };
      return aiInboxState.detail;
    },
    async () => {},
    async () => {},
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {},
    (message, tone, artifactId, suggestionId) => {
      aiInboxState.actionNoticeArtifactId = artifactId || "";
      aiInboxState.actionNoticeSuggestionId = suggestionId || "";
      aiInboxState.actionNotice = message || "";
      aiInboxState.actionNoticeTone = tone || "";
    },
    () => {},
    () => "Detail changed while you were reviewing. Retry from the latest reviewed item.",
    () => "AI inbox detail changed before the review action could run. Retry on the latest detail.",
    (value) => `This reviewed suggestion is already ${value}.`,
    (status) => ({ confirmed: "Confirmed" }[status] || status),
    () => "Load the latest inbox detail before running review actions.",
    () => "AI inbox detail is not ready yet. Retry after the latest detail loads."
  );

  const result = await applyAiInboxSuggestionStatus("confirmed", "suggestion_1");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(statuses, [
    {
      message: "AI inbox detail is not ready yet. Retry after the latest detail loads.",
      tone: "warn"
    }
  ]);
  assert.equal(aiInboxState.actionNoticeArtifactId, "artifact_2");
  assert.equal(aiInboxState.actionNoticeSuggestionId, "suggestion_1");
  assert.equal(aiInboxState.actionNotice, "Load the latest inbox detail before running review actions.");
  assert.equal(aiInboxState.actionNoticeTone, "warn");
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus binds retry notices to the latest suggestion after same-artifact detail changes", async () => {
  let updateCalls = 0;
  const loadCalls = [];
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_2", status: "edited", content: { thesis: "Fresh suggestion" } }
    },
    detailLoading: false,
    actionLoading: false,
    actionNoticeArtifactId: "",
    actionNoticeSuggestionId: "",
    actionNotice: "",
    actionNoticeTone: "",
    actionError: ""
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      updateCalls += 1;
      return null;
    },
    async (artifactId) => {
      loadCalls.push(artifactId);
      aiInboxState.detail = {
        item: { artifactId },
        suggestion: { id: "suggestion_2", status: "edited", content: { thesis: "Fresh suggestion" } }
      };
      return aiInboxState.detail;
    },
    async () => {},
    async () => {},
    () => {},
    (message, tone) => {
      statuses.push({ message, tone });
    },
    () => {
      aiInboxState.actionNoticeArtifactId = "";
      aiInboxState.actionNoticeSuggestionId = "";
      aiInboxState.actionNotice = "";
      aiInboxState.actionNoticeTone = "";
    },
    (message, tone, artifactId, suggestionId) => {
      aiInboxState.actionNoticeArtifactId = artifactId;
      aiInboxState.actionNoticeSuggestionId = suggestionId;
      aiInboxState.actionNotice = message;
      aiInboxState.actionNoticeTone = tone;
    },
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed", "suggestion_1");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.deepEqual(loadCalls, []);
  assert.equal(aiInboxState.actionNoticeArtifactId, "artifact_1");
  assert.equal(aiInboxState.actionNoticeSuggestionId, "suggestion_2");
  assert.equal(
    aiInboxState.actionNotice,
    "Detail changed while you were reviewing. Retry from the latest reviewed item."
  );
  assert.equal(aiInboxState.actionNoticeTone, "warn");
  assert.deepEqual(statuses, [
    {
      message: "AI inbox detail changed before the review action could run. Retry on the latest detail.",
      tone: "warn"
    }
  ]);
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus reloads the latest inbox detail instead of restoring the old one when selection changes mid-submit", async () => {
  const loadCalls = [];
  const refreshCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: "",
    detailError: ""
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "" }),
    aiInboxState,
    async () => {},
    () => ({ thesis: "x" }),
    async () => {
      aiInboxState.selectedArtifactId = "artifact_2";
      aiInboxState.detail = {
        item: { artifactId: "artifact_2" },
        suggestion: { id: "suggestion_2", status: "suggested", content: { thesis: "new" } }
      };
      return { item: { id: "suggestion_1", status: "confirmed" } };
    },
    async (artifactId) => {
      loadCalls.push(artifactId);
      return true;
    },
    async (options) => {
      refreshCalls.push(options);
      return true;
    },
    async () => true,
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed");
  assert.equal(result, true);
  assert.deepEqual(loadCalls, ["artifact_2"]);
  assert.deepEqual(refreshCalls, [{ silent: true, preserveDetail: false }]);
  assert.equal(aiInboxState.selectedArtifactId, "artifact_2");
  assert.equal(aiInboxState.detail.item.artifactId, "artifact_2");
  assert.equal(aiInboxState.actionLoading, false);
});

test("applyAiInboxSuggestionStatus reports invalid reviewed content through actionError without starting submit", async () => {
  let updateCalls = 0;
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: {
      item: { artifactId: "artifact_1" },
      suggestion: { id: "suggestion_1", status: "edited", content: { thesis: "x" } }
    },
    actionLoading: false,
    actionError: "old action error",
    detailError: "old detail error"
  };

  const applyAiInboxSuggestionStatus = createApplyAiInboxSuggestionStatus(
    () => ({ value: "{not valid json}" }),
    aiInboxState,
    async () => {},
    () => {
      throw new Error("Reviewed suggestion content in AI inbox must be valid JSON before it can be marked edited or confirmed");
    },
    async () => {
      updateCalls += 1;
      return null;
    },
    async () => {},
    async () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {}
  );

  const result = await applyAiInboxSuggestionStatus("confirmed");
  assert.equal(result, null);
  assert.equal(updateCalls, 0);
  assert.equal(aiInboxState.detailError, "old detail error");
  assert.equal(
    aiInboxState.actionError,
    "Reviewed suggestion content in AI inbox must be valid JSON before it can be marked edited or confirmed"
  );
  assert.equal(aiInboxState.actionLoading, false);
});

test("runAiInboxSummary ignores stale failures and keeps the latest summary state", async () => {
  let rejectFirst;
  let resolveSecond;
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: null,
    aiSummary: "stale summary",
    aiSummaryArtifactId: "artifact_old",
    aiSummarySuggestionId: "suggestion_old",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "ignore",
    aiSummaryLoading: false,
    aiSummaryError: "stale error",
    aiSummaryRequestToken: 0
  };

  const runAiInboxSummary = createRunAiInboxSummary(
    aiInboxState,
    {
      settingsState: { ai: { userMode: "Auto", modelPack: "Starter Auto", routePreview: { privacy: { mode: "normal" } } } },
      summarizeAiInboxItem: (artifactId) =>
      new Promise((resolve, reject) => {
        if (artifactId === "artifact_1") rejectFirst = () => reject(new Error("old failure"));
        else resolveSecond = () =>
          resolve({
            providerId: "provider_b",
            modelRef: "model_b",
            output: { content: "new summary" },
            recommendedAction: "ignore",
            artifact: { id: artifactId, status: "ignored" },
            inboxItem: { artifactId }
          });
      }),
      recommendedAiInboxActionFromText: (text) => (String(text).includes("context") ? "needs_more_context" : "ignore"),
      loadAiInboxDetail: async () => {
        throw new Error("loadAiInboxDetail should not run when summary returns an artifact");
      }
    }
  );

  const firstPromise = runAiInboxSummary("artifact_1");
  const secondPromise = runAiInboxSummary("artifact_2");

  resolveSecond();
  await secondPromise;
  rejectFirst();
  await firstPromise;

  assert.equal(aiInboxState.aiSummary, "new summary");
  assert.equal(aiInboxState.aiSummaryArtifactId, "artifact_2");
  assert.equal(aiInboxState.aiSummarySuggestionId, "");
  assert.equal(aiInboxState.aiSummaryMeta, "provider_b / model_b");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "ignore");
  assert.equal(aiInboxState.aiSummaryError, "");
  assert.equal(aiInboxState.aiSummaryLoading, false);
  assert.equal(aiInboxState.aiSummaryRequestToken, 2);
  assert.equal(aiInboxState.detail?.item?.artifactId, "artifact_2");
});

test("runAiInboxSummary resets stale summary binding when no artifact is selected", async () => {
  const aiInboxState = {
    selectedArtifactId: "",
    detail: null,
    aiSummary: "stale summary",
    aiSummaryArtifactId: "artifact_old",
    aiSummarySuggestionId: "suggestion_old",
    aiSummaryMeta: "stale meta",
    aiSummaryRecommendedAction: "ignore",
    aiSummaryLoading: true,
    aiSummaryError: "stale error",
    aiSummaryRequestToken: 3
  };

  const runAiInboxSummary = createRunAiInboxSummary(
    aiInboxState,
    {
      settingsState: { ai: { userMode: "Auto", modelPack: "Starter Auto", routePreview: { privacy: { mode: "normal" } } } },
      summarizeAiInboxItem: async () => {
        throw new Error("summary should not run without a selected artifact");
      },
      resetAiInboxSummaryState: ({ invalidate }) => {
        if (invalidate === true) aiInboxState.aiSummaryRequestToken += 1;
        aiInboxState.aiSummary = "";
        aiInboxState.aiSummaryArtifactId = "";
        aiInboxState.aiSummarySuggestionId = "";
        aiInboxState.aiSummaryMeta = "";
        aiInboxState.aiSummaryRecommendedAction = "";
        aiInboxState.aiSummaryError = "";
        aiInboxState.aiSummaryLoading = false;
      }
    }
  );

  const result = await runAiInboxSummary("");
  assert.equal(result, false);
  assert.equal(aiInboxState.aiSummary, "");
  assert.equal(aiInboxState.aiSummaryArtifactId, "");
  assert.equal(aiInboxState.aiSummarySuggestionId, "");
  assert.equal(aiInboxState.aiSummaryMeta, "");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "");
  assert.equal(aiInboxState.aiSummaryError, "");
  assert.equal(aiInboxState.aiSummaryLoading, false);
  assert.equal(aiInboxState.aiSummaryRequestToken, 4);
});

test("runAiInboxSummary refuses to start while the current artifact review action is still in flight", async () => {
  const statuses = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    actionLoading: true,
    actionArtifactId: "artifact_1",
    aiSummary: "existing summary",
    aiSummaryArtifactId: "artifact_1",
    aiSummarySuggestionId: "suggestion_1",
    aiSummaryMeta: "provider / model",
    aiSummaryRecommendedAction: "accept_link",
    aiSummaryLoading: false,
    aiSummaryError: "",
    aiSummaryRequestToken: 5
  };

  const runAiInboxSummary = createRunAiInboxSummary(
    aiInboxState,
    {
      settingsState: { ai: { userMode: "Auto", modelPack: "Starter Auto", routePreview: { privacy: { mode: "normal" } } } },
      summarizeAiInboxItem: async () => {
        throw new Error("summary should not start while the current artifact action is busy");
      },
      loadAiInboxDetail: async () => {
        throw new Error("loadAiInboxDetail should not run while blocked by an in-flight artifact action");
      },
      setStatus: (message, tone) => {
        statuses.push({ message, tone });
        return false;
      },
      resetAiInboxSummaryState: () => {
        throw new Error("resetAiInboxSummaryState should not run while the current artifact action is busy");
      }
    }
  );

  const result = await runAiInboxSummary("artifact_1");
  assert.equal(result, false);
  assert.deepEqual(statuses, [
    {
      message: "Wait for the current AI inbox review action to finish before generating a new summary for this item.",
      tone: "warn"
    }
  ]);
  assert.equal(aiInboxState.aiSummary, "existing summary");
  assert.equal(aiInboxState.aiSummaryArtifactId, "artifact_1");
  assert.equal(aiInboxState.aiSummarySuggestionId, "suggestion_1");
  assert.equal(aiInboxState.aiSummaryMeta, "provider / model");
  assert.equal(aiInboxState.aiSummaryRecommendedAction, "accept_link");
  assert.equal(aiInboxState.aiSummaryLoading, false);
  assert.equal(aiInboxState.aiSummaryRequestToken, 5);
});

test("refreshAiInboxEvaluationSummary ignores stale failures and keeps the latest evaluation state", async () => {
  let rejectFirst;
  let resolveSecond;
  const renders = [];
  const aiInboxState = {
    filters: { view: "pending", type: "all", sourceNoteId: "" },
    evaluationSummary: { filter: { view: "all" }, artifacts: { total: 9 } },
    evaluationError: "stale evaluation error",
    evaluationLoading: false,
    evaluationRequestToken: 0
  };

  const refreshAiInboxEvaluationSummary = (options = {}) => refreshAiInboxEvaluationSummaryForRuntime({
    aiInboxState,
    normalizeAiInboxFilters: (filters) => filters,
    fetchAiInboxEvaluationSummary: () =>
      new Promise((resolve, reject) => {
        if (!rejectFirst) rejectFirst = () => reject(new Error("old evaluation failure"));
        else resolveSecond = () => resolve({ filter: { view: "all" }, artifacts: { total: 1 } });
      }),
    render: () => {
      renders.push({
        evaluationError: aiInboxState.evaluationError,
        evaluationLoading: aiInboxState.evaluationLoading
      });
    },
    setStatus: () => {}
  }, options);

  const firstPromise = refreshAiInboxEvaluationSummary({ silent: false });
  const secondPromise = refreshAiInboxEvaluationSummary({ silent: false });

  resolveSecond();
  await secondPromise;
  rejectFirst();
  await firstPromise;

  assert.deepEqual(aiInboxState.evaluationSummary, { filter: { view: "all" }, artifacts: { total: 1 } });
  assert.equal(aiInboxState.evaluationError, "");
  assert.equal(aiInboxState.evaluationLoading, false);
  assert.equal(aiInboxState.evaluationRequestToken, 2);
  assert.ok(renders.length >= 2);
});
