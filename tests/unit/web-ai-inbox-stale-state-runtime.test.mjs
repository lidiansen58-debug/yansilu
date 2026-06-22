import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptAiInboxLinkSuggestionForRuntime,
  adoptAiInboxFieldSuggestionDraftForRuntime,
  aiInboxActionGuardForRuntime,
  applyAiInboxSuggestionStatusForRuntime,
  loadAiInboxDetailForRuntime,
  promoteAiInboxArtifactToNoteForRuntime,
  recordAiInboxReviewDecisionForRuntime,
  refreshAiInboxForRuntime
} from "../../apps/web/src/ai-inbox-runtime-controller.js";

globalThis.__acceptAiInboxLinkSuggestionForRuntime = acceptAiInboxLinkSuggestionForRuntime;
globalThis.__adoptAiInboxFieldSuggestionDraftForRuntime = adoptAiInboxFieldSuggestionDraftForRuntime;
globalThis.__applyAiInboxSuggestionStatusForRuntime = applyAiInboxSuggestionStatusForRuntime;
globalThis.__promoteAiInboxArtifactToNoteForRuntime = promoteAiInboxArtifactToNoteForRuntime;
globalThis.__recordAiInboxReviewDecisionForRuntime = recordAiInboxReviewDecisionForRuntime;

function extractAsyncFunctionSource(source, name) {
  if (name === "acceptAiInboxLinkSuggestion") {
    return `async function acceptAiInboxLinkSuggestion(artifactId) {
      return globalThis.__acceptAiInboxLinkSuggestionForRuntime({
        aiInboxState,
        currentAiInboxArtifactForSelection: typeof currentAiInboxArtifactForSelection === "function" ? currentAiInboxArtifactForSelection : () => null,
        latestArtifactDecision: typeof latestArtifactDecision === "function" ? latestArtifactDecision : () => null,
        acceptAiInboxLink: typeof acceptAiInboxLink === "function" ? acceptAiInboxLink : async () => null,
        commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
        aiInboxDetailFromResponse: typeof aiInboxDetailFromResponse === "function" ? aiInboxDetailFromResponse : (value) => value,
        loadAiInboxDetail: typeof loadAiInboxDetail === "function" ? loadAiInboxDetail : async () => null,
        rememberAiDebugSnapshot: typeof rememberAiDebugSnapshot === "function" ? rememberAiDebugSnapshot : () => {},
        finalizeAiInboxActionRefresh,
        afterFinalize: async () => {
          if (typeof state === "object" && state?.module === "graph" && typeof refreshDirectoryGraph === "function") await refreshDirectoryGraph();
        },
        setStatus: typeof setStatus === "function" ? setStatus : () => {},
        setAiInboxActionNotice: typeof setAiInboxActionNotice === "function" ? setAiInboxActionNotice : () => {},
        clearAiInboxActionNotice: typeof clearAiInboxActionNotice === "function" ? clearAiInboxActionNotice : () => {},
        render: typeof renderAiInboxWorkspace === "function" ? renderAiInboxWorkspace : () => {},
        messages: {
          reviewSafetyNotice: typeof aiInboxReviewSafetyNotice === "function" ? aiInboxReviewSafetyNotice : undefined,
          reviewSafetyStatusMessage: typeof aiInboxReviewSafetyStatusMessage === "function" ? aiInboxReviewSafetyStatusMessage : undefined,
          reviewRetryNotice: typeof aiInboxReviewRetryNotice === "function" ? aiInboxReviewRetryNotice : undefined,
          reviewRetryStatusMessage: typeof aiInboxReviewRetryStatusMessage === "function" ? aiInboxReviewRetryStatusMessage : undefined,
          inFlightReviewActionNotice: typeof aiInboxInFlightReviewActionNotice === "function" ? aiInboxInFlightReviewActionNotice : undefined,
          inFlightReviewActionStatusMessage: typeof aiInboxInFlightReviewActionStatusMessage === "function" ? aiInboxInFlightReviewActionStatusMessage : undefined,
          linkAlreadyAppliedNotice: typeof aiInboxLinkAlreadyAppliedNotice === "function" ? aiInboxLinkAlreadyAppliedNotice : () => "This relation was already created for the current reviewed item.",
          linkAlreadyAppliedStatusMessage: typeof aiInboxLinkAlreadyAppliedStatusMessage === "function" ? aiInboxLinkAlreadyAppliedStatusMessage : undefined,
          linkAcceptedStatusMessage: typeof aiInboxLinkAcceptedStatusMessage === "function" ? aiInboxLinkAcceptedStatusMessage : undefined,
          linkAcceptFailedStatusMessage: typeof aiInboxLinkAcceptFailedStatusMessage === "function" ? aiInboxLinkAcceptFailedStatusMessage : undefined
        }
      }, artifactId);
    }`;
  }
  if (name === "promoteAiInboxArtifactToNote") {
    return `async function promoteAiInboxArtifactToNote(artifactId) {
      return globalThis.__promoteAiInboxArtifactToNoteForRuntime({
        aiInboxState,
        currentAiInboxArtifactForSelection: typeof currentAiInboxArtifactForSelection === "function" ? currentAiInboxArtifactForSelection : () => null,
        latestArtifactDecision: typeof latestArtifactDecision === "function" ? latestArtifactDecision : () => null,
        promoteAiInboxNote: typeof promoteAiInboxNote === "function" ? promoteAiInboxNote : async () => null,
        commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
        aiInboxDetailFromResponse: typeof aiInboxDetailFromResponse === "function" ? aiInboxDetailFromResponse : (value) => value,
        loadAiInboxDetail: typeof loadAiInboxDetail === "function" ? loadAiInboxDetail : async () => null,
        rememberAiDebugSnapshot: typeof rememberAiDebugSnapshot === "function" ? rememberAiDebugSnapshot : () => {},
        finalizeAiInboxActionRefresh,
        beforeFinalize: async (result) => {
          if (result?.note?.id && typeof state === "object" && Array.isArray(state.notes)) {
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
        setStatus: typeof setStatus === "function" ? setStatus : () => {},
        setAiInboxActionNotice: typeof setAiInboxActionNotice === "function" ? setAiInboxActionNotice : () => {},
        clearAiInboxActionNotice: typeof clearAiInboxActionNotice === "function" ? clearAiInboxActionNotice : () => {},
        render: typeof renderAiInboxWorkspace === "function" ? renderAiInboxWorkspace : () => {},
        messages: {
          reviewSafetyNotice: typeof aiInboxReviewSafetyNotice === "function" ? aiInboxReviewSafetyNotice : undefined,
          reviewSafetyStatusMessage: typeof aiInboxReviewSafetyStatusMessage === "function" ? aiInboxReviewSafetyStatusMessage : undefined,
          reviewRetryNotice: typeof aiInboxReviewRetryNotice === "function" ? aiInboxReviewRetryNotice : undefined,
          reviewRetryStatusMessage: typeof aiInboxReviewRetryStatusMessage === "function" ? aiInboxReviewRetryStatusMessage : undefined,
          inFlightReviewActionNotice: typeof aiInboxInFlightReviewActionNotice === "function" ? aiInboxInFlightReviewActionNotice : undefined,
          inFlightReviewActionStatusMessage: typeof aiInboxInFlightReviewActionStatusMessage === "function" ? aiInboxInFlightReviewActionStatusMessage : undefined,
          notePromotionAlreadyAppliedNotice: typeof aiInboxNotePromotionAlreadyAppliedNotice === "function" ? aiInboxNotePromotionAlreadyAppliedNotice : () => "This draft note already exists for the current reviewed item.",
          notePromotionAlreadyAppliedStatusMessage: typeof aiInboxNotePromotionAlreadyAppliedStatusMessage === "function" ? aiInboxNotePromotionAlreadyAppliedStatusMessage : undefined,
          notePromotionSucceededStatusMessage: typeof aiInboxNotePromotionSucceededStatusMessage === "function" ? aiInboxNotePromotionSucceededStatusMessage : undefined,
          notePromotionFailedStatusMessage: typeof aiInboxNotePromotionFailedStatusMessage === "function" ? aiInboxNotePromotionFailedStatusMessage : undefined
        }
      }, artifactId);
    }`;
  }
  if (name === "adoptAiInboxFieldSuggestionDraft") {
    return `async function adoptAiInboxFieldSuggestionDraft(artifactId, expectedSuggestionId = "") {
      return globalThis.__adoptAiInboxFieldSuggestionDraftForRuntime({
        aiInboxState,
        currentAiInboxArtifactForSelection: typeof currentAiInboxArtifactForSelection === "function" ? currentAiInboxArtifactForSelection : () => null,
        currentAiInboxSuggestionForSelection: typeof currentAiInboxSuggestionForSelection === "function" ? currentAiInboxSuggestionForSelection : () => null,
        latestArtifactDecision: typeof latestArtifactDecision === "function" ? latestArtifactDecision : () => null,
        aiSuggestionStatusLabel: typeof aiSuggestionStatusLabel === "function" ? aiSuggestionStatusLabel : (value) => value,
        adoptAiInboxFieldSuggestion: typeof adoptAiInboxFieldSuggestion === "function" ? adoptAiInboxFieldSuggestion : async () => null,
        aiInboxFeedback: typeof aiInboxFeedbackFromUi === "function" ? aiInboxFeedbackFromUi : () => ({}),
        commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
        aiInboxDetailFromResponse: typeof aiInboxDetailFromResponse === "function" ? aiInboxDetailFromResponse : (value) => value,
        loadAiInboxDetail: typeof loadAiInboxDetail === "function" ? loadAiInboxDetail : async () => null,
        rememberAiDebugSnapshot: typeof rememberAiDebugSnapshot === "function" ? rememberAiDebugSnapshot : () => {},
        finalizeAiInboxActionRefresh,
        beforeFinalize: async (result) => {
          if (result?.note?.id && typeof state === "object" && Array.isArray(state.notes)) {
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
        setStatus: typeof setStatus === "function" ? setStatus : () => {},
        setAiInboxActionNotice: typeof setAiInboxActionNotice === "function" ? setAiInboxActionNotice : () => {},
        clearAiInboxActionNotice: typeof clearAiInboxActionNotice === "function" ? clearAiInboxActionNotice : () => {},
        render: typeof renderAiInboxWorkspace === "function" ? renderAiInboxWorkspace : () => {},
        messages: {
          reviewSafetyNotice: typeof aiInboxReviewSafetyNotice === "function" ? aiInboxReviewSafetyNotice : undefined,
          reviewSafetyStatusMessage: typeof aiInboxReviewSafetyStatusMessage === "function" ? aiInboxReviewSafetyStatusMessage : undefined,
          reviewRetryNotice: typeof aiInboxReviewRetryNotice === "function" ? aiInboxReviewRetryNotice : undefined,
          reviewRetryStatusMessage: typeof aiInboxReviewRetryStatusMessage === "function" ? aiInboxReviewRetryStatusMessage : undefined,
          inFlightReviewActionNotice: typeof aiInboxInFlightReviewActionNotice === "function" ? aiInboxInFlightReviewActionNotice : undefined,
          inFlightReviewActionStatusMessage: typeof aiInboxInFlightReviewActionStatusMessage === "function" ? aiInboxInFlightReviewActionStatusMessage : undefined,
          fieldSuggestionDraftAlreadyAppliedNotice: typeof aiInboxFieldSuggestionDraftAlreadyAppliedNotice === "function" ? aiInboxFieldSuggestionDraftAlreadyAppliedNotice : undefined,
          fieldSuggestionDraftAlreadyAppliedStatusMessage: typeof aiInboxFieldSuggestionDraftAlreadyAppliedStatusMessage === "function" ? aiInboxFieldSuggestionDraftAlreadyAppliedStatusMessage : undefined,
          fieldSuggestionDraftSucceededStatusMessage: typeof aiInboxFieldSuggestionDraftSucceededStatusMessage === "function" ? aiInboxFieldSuggestionDraftSucceededStatusMessage : undefined,
          fieldSuggestionDraftFailedStatusMessage: typeof aiInboxFieldSuggestionDraftFailedStatusMessage === "function" ? aiInboxFieldSuggestionDraftFailedStatusMessage : undefined
        }
      }, artifactId, expectedSuggestionId);
    }`;
  }
  if (name === "recordAiInboxReviewDecision") {
    return `async function recordAiInboxReviewDecision(decision) {
      return globalThis.__recordAiInboxReviewDecisionForRuntime({
        aiInboxState,
        recordAiInboxDecision: typeof recordAiInboxDecision === "function" ? recordAiInboxDecision : undefined,
        aiInboxFeedback: typeof aiInboxFeedbackFromUi === "function" ? aiInboxFeedbackFromUi : () => ({}),
        commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
        aiInboxDetailFromResponse: typeof aiInboxDetailFromResponse === "function" ? aiInboxDetailFromResponse : (value) => value,
        loadAiInboxDetail: typeof loadAiInboxDetail === "function" ? loadAiInboxDetail : async () => null,
        rememberAiDebugSnapshot: typeof rememberAiDebugSnapshot === "function" ? rememberAiDebugSnapshot : () => {},
        finalizeAiInboxActionRefresh,
        aiInboxActionLabel: typeof aiInboxActionLabel === "function" ? aiInboxActionLabel : (value) => value,
        setStatus: typeof setStatus === "function" ? setStatus : () => {},
        setAiInboxActionNotice: typeof setAiInboxActionNotice === "function" ? setAiInboxActionNotice : () => {},
        clearAiInboxActionNotice: typeof clearAiInboxActionNotice === "function" ? clearAiInboxActionNotice : () => {},
        render: typeof renderAiInboxWorkspace === "function" ? renderAiInboxWorkspace : () => {},
        messages: {
          reviewSafetyNotice: typeof aiInboxReviewSafetyNotice === "function" ? aiInboxReviewSafetyNotice : undefined,
          reviewSafetyStatusMessage: typeof aiInboxReviewSafetyStatusMessage === "function" ? aiInboxReviewSafetyStatusMessage : undefined,
          reviewRetryNotice: typeof aiInboxReviewRetryNotice === "function" ? aiInboxReviewRetryNotice : undefined,
          reviewRetryStatusMessage: typeof aiInboxReviewRetryStatusMessage === "function" ? aiInboxReviewRetryStatusMessage : undefined,
          inFlightReviewActionNotice: typeof aiInboxInFlightReviewActionNotice === "function" ? aiInboxInFlightReviewActionNotice : undefined,
          inFlightReviewActionStatusMessage: typeof aiInboxInFlightReviewActionStatusMessage === "function" ? aiInboxInFlightReviewActionStatusMessage : undefined,
          decisionSucceededStatusMessage: typeof aiInboxDecisionSucceededStatusMessage === "function" ? aiInboxDecisionSucceededStatusMessage : undefined,
          decisionFailedStatusMessage: typeof aiInboxDecisionFailedStatusMessage === "function" ? aiInboxDecisionFailedStatusMessage : undefined
        }
      }, decision);
    }`;
  }
  if (name === "applyAiInboxSuggestionStatus") {
    return `async function applyAiInboxSuggestionStatus(status, expectedSuggestionId = "") {
      return globalThis.__applyAiInboxSuggestionStatusForRuntime({
        aiInboxState,
        updateAiSuggestion: typeof updateAiSuggestion === "function" ? updateAiSuggestion : undefined,
        adoptAiInboxFieldSuggestionDraft: typeof adoptAiInboxFieldSuggestionDraft === "function" ? adoptAiInboxFieldSuggestionDraft : async () => null,
        aiInboxSuggestionReviewedContent: typeof aiInboxSuggestionReviewedContentFromUi === "function" ? aiInboxSuggestionReviewedContentFromUi : () => undefined,
        commentText: () => (typeof $ === "function" ? $("aiInboxDecisionComment")?.value || "" : ""),
        aiSuggestionStatusLabel: typeof aiSuggestionStatusLabel === "function" ? aiSuggestionStatusLabel : undefined,
        loadAiInboxDetail: typeof loadAiInboxDetail === "function" ? loadAiInboxDetail : async () => null,
        rememberAiDebugSnapshot: typeof rememberAiDebugSnapshot === "function" ? rememberAiDebugSnapshot : () => {},
        finalizeAiInboxActionRefresh,
        setStatus: typeof setStatus === "function" ? setStatus : () => {},
        setAiInboxActionNotice: typeof setAiInboxActionNotice === "function" ? setAiInboxActionNotice : () => {},
        clearAiInboxActionNotice: typeof clearAiInboxActionNotice === "function" ? clearAiInboxActionNotice : () => {},
        render: typeof renderAiInboxWorkspace === "function" ? renderAiInboxWorkspace : () => {},
        messages: {
          reviewSafetyNotice: typeof aiInboxReviewSafetyNotice === "function" ? aiInboxReviewSafetyNotice : undefined,
          reviewSafetyStatusMessage: typeof aiInboxReviewSafetyStatusMessage === "function" ? aiInboxReviewSafetyStatusMessage : undefined,
          reviewRetryNotice: typeof aiInboxReviewRetryNotice === "function" ? aiInboxReviewRetryNotice : undefined,
          reviewRetryStatusMessage: typeof aiInboxReviewRetryStatusMessage === "function" ? aiInboxReviewRetryStatusMessage : undefined,
          inFlightReviewActionNotice: typeof aiInboxInFlightReviewActionNotice === "function" ? aiInboxInFlightReviewActionNotice : undefined,
          inFlightReviewActionStatusMessage: typeof aiInboxInFlightReviewActionStatusMessage === "function" ? aiInboxInFlightReviewActionStatusMessage : undefined,
          suggestionAlreadyAppliedNotice:
            typeof aiInboxSuggestionAlreadyAppliedNotice === "function"
              ? aiInboxSuggestionAlreadyAppliedNotice
              : typeof aiSuggestionAlreadyAppliedNotice === "function"
                ? aiSuggestionAlreadyAppliedNotice
                : undefined,
          suggestionAlreadyAppliedStatusMessage: typeof aiInboxSuggestionAlreadyAppliedStatusMessage === "function" ? aiInboxSuggestionAlreadyAppliedStatusMessage : undefined,
          suggestionUpdatedStatusMessage: typeof aiInboxSuggestionUpdatedStatusMessage === "function" ? aiInboxSuggestionUpdatedStatusMessage : undefined,
          suggestionUpdateFailedStatusMessage: typeof aiInboxSuggestionUpdateFailedStatusMessage === "function" ? aiInboxSuggestionUpdateFailedStatusMessage : undefined
        }
      }, status, expectedSuggestionId);
    }`;
  }
  const signature = `async function ${name}(`;
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `expected ${name}() to exist`);
  let parenDepth = 0;
  let bodyStart = -1;
  for (let index = source.indexOf("(", start); index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") parenDepth += 1;
    if (char === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        bodyStart = source.indexOf("{", index);
        break;
      }
    }
  }
  assert.ok(bodyStart >= 0, `expected ${name}() body to exist`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`could not extract ${name}() source`);
}

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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

  const calls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" } },
    detailLoading: true,
    detailError: "old detail error"
  };

  const finalizeAiInboxActionRefresh = new Function(
    "aiInboxState",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "loadAiInboxDetail",
    `${fnSource}; return finalizeAiInboxActionRefresh;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");
  const calls = [];

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");
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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxRecommendedAction");

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

  const applyAiInboxRecommendedAction = new Function(
    "$",
    "window",
    "aiInboxState",
    "loadAiInboxDetail",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "setStatus",
    "acceptAiInboxLinkSuggestion",
    "adoptAiInboxFieldSuggestionDraft",
    "promoteAiInboxArtifactToNote",
    "recordAiInboxReviewDecision",
    "aiInboxReviewRetryNotice",
    "aiInboxReviewRetryStatusMessage",
    `${fnSource}; return applyAiInboxRecommendedAction;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxRecommendedAction");

  const acceptCalls = [];
  const confirmPrompts = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" } },
    detailLoading: false,
    aiSummaryRecommendedAction: "accept_link"
  };

  const applyAiInboxRecommendedAction = new Function(
    "$",
    "window",
    "aiInboxState",
    "loadAiInboxDetail",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "setStatus",
    "acceptAiInboxLinkSuggestion",
    "adoptAiInboxFieldSuggestionDraft",
    "promoteAiInboxArtifactToNote",
    "recordAiInboxReviewDecision",
    `${fnSource}; return applyAiInboxRecommendedAction;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxRecommendedAction");

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

  const applyAiInboxRecommendedAction = new Function(
    "$",
    "window",
    "aiInboxState",
    "loadAiInboxDetail",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "setStatus",
    "acceptAiInboxLinkSuggestion",
    "adoptAiInboxFieldSuggestionDraft",
    "promoteAiInboxArtifactToNote",
    "recordAiInboxReviewDecision",
    "aiInboxReviewSafetyNotice",
    "aiInboxReviewSafetyStatusMessage",
    `${fnSource}; return applyAiInboxRecommendedAction;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxRecommendedAction");

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

  const applyAiInboxRecommendedAction = new Function(
    "$",
    "window",
    "aiInboxState",
    "loadAiInboxDetail",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "setStatus",
    "acceptAiInboxLinkSuggestion",
    "adoptAiInboxFieldSuggestionDraft",
    "promoteAiInboxArtifactToNote",
    "recordAiInboxReviewDecision",
    `${fnSource}; return applyAiInboxRecommendedAction;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1" } },
    detailArtifactId: "artifact_1",
    actionLoading: false,
    actionArtifactId: "",
    actionError: "old action error",
    detailError: "old detail error"
  };

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewRetryNotice",
    "aiInboxReviewRetryStatusMessage",
    `${finalizeSource}; ${fnSource}; return recordAiInboxReviewDecision;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");
  const statuses = [];
  let decisionCalls = 0;
  const aiInboxState = {
    selectedArtifactId: "artifact_2",
    detail: { item: { artifactId: "artifact_2" } },
    actionLoading: true,
    actionArtifactId: "artifact_1",
    actionError: ""
  };

  const recordAiInboxReviewDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "setAiInboxActionNotice",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxDetailFromResponse",
    "aiInboxActionLabel",
    `${finalizeSource}; ${fnSource}; return recordAiInboxReviewDecision;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewRetryNotice",
    "aiInboxReviewRetryStatusMessage",
    `${finalizeSource}; ${fnSource}; return recordAiInboxReviewDecision;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewRetryNotice",
    "aiInboxReviewRetryStatusMessage",
    `${finalizeSource}; ${fnSource}; return recordAiInboxReviewDecision;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewSafetyNotice",
    "aiInboxReviewSafetyStatusMessage",
    `${finalizeSource}; ${fnSource}; return recordAiInboxReviewDecision;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return recordAiInboxReviewDecision;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "acceptAiInboxLinkSuggestion");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const acceptAiInboxLinkSuggestion = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "latestArtifactDecision",
    "setAiInboxActionNotice",
    "acceptAiInboxLink",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "refreshDirectoryGraph",
    "state",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return acceptAiInboxLinkSuggestion;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "acceptAiInboxLinkSuggestion");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const acceptAiInboxLinkSuggestion = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "latestArtifactDecision",
    "setAiInboxActionNotice",
    "acceptAiInboxLink",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "refreshDirectoryGraph",
    "state",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewSafetyNotice",
    "aiInboxReviewSafetyStatusMessage",
    `${finalizeSource}; ${fnSource}; return acceptAiInboxLinkSuggestion;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "acceptAiInboxLinkSuggestion");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const acceptAiInboxLinkSuggestion = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "latestArtifactDecision",
    "setAiInboxActionNotice",
    "acceptAiInboxLink",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "refreshDirectoryGraph",
    "state",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return acceptAiInboxLinkSuggestion;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "promoteAiInboxArtifactToNote");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const promoteAiInboxArtifactToNote = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "latestArtifactDecision",
    "setAiInboxActionNotice",
    "promoteAiInboxNote",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "mapNoteItem",
    "state",
    "activateModule",
    "openNoteById",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return promoteAiInboxArtifactToNote;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "promoteAiInboxArtifactToNote");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const promoteAiInboxArtifactToNote = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "latestArtifactDecision",
    "setAiInboxActionNotice",
    "promoteAiInboxNote",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "mapNoteItem",
    "state",
    "activateModule",
    "openNoteById",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewSafetyNotice",
    "aiInboxReviewSafetyStatusMessage",
    `${finalizeSource}; ${fnSource}; return promoteAiInboxArtifactToNote;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "promoteAiInboxArtifactToNote");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const promoteAiInboxArtifactToNote = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "latestArtifactDecision",
    "setAiInboxActionNotice",
    "promoteAiInboxNote",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "mapNoteItem",
    "state",
    "activateModule",
    "openNoteById",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return promoteAiInboxArtifactToNote;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "adoptAiInboxFieldSuggestionDraft");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const adoptAiInboxFieldSuggestionDraft = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "currentAiInboxSuggestionForSelection",
    "latestArtifactDecision",
    "aiSuggestionStatusLabel",
    "setAiInboxActionNotice",
    "adoptAiInboxFieldSuggestion",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "mapNoteItem",
    "state",
    "activateModule",
    "openNoteById",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewRetryNotice",
    "aiInboxReviewRetryStatusMessage",
    `${finalizeSource}; ${fnSource}; return adoptAiInboxFieldSuggestionDraft;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "adoptAiInboxFieldSuggestionDraft");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const adoptAiInboxFieldSuggestionDraft = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "currentAiInboxSuggestionForSelection",
    "latestArtifactDecision",
    "aiSuggestionStatusLabel",
    "setAiInboxActionNotice",
    "adoptAiInboxFieldSuggestion",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "mapNoteItem",
    "state",
    "activateModule",
    "openNoteById",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewSafetyNotice",
    "aiInboxReviewSafetyStatusMessage",
    `${finalizeSource}; ${fnSource}; return adoptAiInboxFieldSuggestionDraft;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "adoptAiInboxFieldSuggestionDraft");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const adoptAiInboxFieldSuggestionDraft = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "currentAiInboxSuggestionForSelection",
    "latestArtifactDecision",
    "aiSuggestionStatusLabel",
    "setAiInboxActionNotice",
    "adoptAiInboxFieldSuggestion",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "mapNoteItem",
    "state",
    "activateModule",
    "openNoteById",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewRetryNotice",
    "aiInboxReviewRetryStatusMessage",
    `${finalizeSource}; ${fnSource}; return adoptAiInboxFieldSuggestionDraft;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "adoptAiInboxFieldSuggestionDraft");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const adoptAiInboxFieldSuggestionDraft = new Function(
    "$",
    "aiInboxState",
    "loadAiInboxDetail",
    "currentAiInboxArtifactForSelection",
    "currentAiInboxSuggestionForSelection",
    "latestArtifactDecision",
    "aiSuggestionStatusLabel",
    "setAiInboxActionNotice",
    "adoptAiInboxFieldSuggestion",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "mapNoteItem",
    "state",
    "activateModule",
    "openNoteById",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return adoptAiInboxFieldSuggestionDraft;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "recordAiInboxReviewDecision");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

  const refreshCalls = [];
  const aiInboxState = {
    selectedArtifactId: "artifact_1",
    detail: { item: { artifactId: "artifact_1", title: "Original artifact" } },
    actionLoading: false,
    actionError: "",
    detailError: ""
  };

  const recordDecision = new Function(
    "$",
    "aiInboxState",
    "recordAiInboxDecision",
    "aiInboxFeedbackFromUi",
    "aiInboxDetailFromResponse",
    "loadAiInboxDetail",
    "rememberAiDebugSnapshot",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "aiInboxActionLabel",
    "setStatus",
    "clearAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return recordAiInboxReviewDecision;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiSuggestionStatusLabel",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiSuggestionStatusLabel",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    "aiInboxReviewRetryNotice",
    "aiInboxReviewRetryStatusMessage",
    "aiSuggestionAlreadyAppliedNotice",
    "aiSuggestionStatusLabel",
    "aiInboxReviewSafetyNotice",
    "aiInboxReviewSafetyStatusMessage",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "applyAiInboxSuggestionStatus");
  const finalizeSource = extractAsyncFunctionSource(source, "finalizeAiInboxActionRefresh");

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

  const applyAiInboxSuggestionStatus = new Function(
    "$",
    "aiInboxState",
    "adoptAiInboxFieldSuggestionDraft",
    "aiInboxSuggestionReviewedContentFromUi",
    "updateAiSuggestion",
    "loadAiInboxDetail",
    "refreshAiInbox",
    "refreshAiInboxEvaluationSummary",
    "rememberAiDebugSnapshot",
    "setStatus",
    "clearAiInboxActionNotice",
    "setAiInboxActionNotice",
    "renderAiInboxWorkspace",
    `${finalizeSource}; ${fnSource}; return applyAiInboxSuggestionStatus;`
  )(
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "runAiInboxSummary");

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

  const runAiInboxSummary = new Function(
    "aiInboxState",
    "settingsState",
    "summarizeAiInboxItem",
    "recommendedAiInboxActionFromText",
    "loadAiInboxDetail",
    "setStatus",
    "renderAiInboxWorkspace",
    `${fnSource}; return runAiInboxSummary;`
  )(
    aiInboxState,
    { ai: { userMode: "Auto", modelPack: "Starter Auto", routePreview: { privacy: { mode: "normal" } } } },
    (artifactId) =>
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
    (text) => (String(text).includes("context") ? "needs_more_context" : "ignore"),
    async () => {
      throw new Error("loadAiInboxDetail should not run when summary returns an artifact");
    },
    () => {},
    () => {}
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "runAiInboxSummary");

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

  const runAiInboxSummary = new Function(
    "aiInboxState",
    "settingsState",
    "summarizeAiInboxItem",
    "recommendedAiInboxActionFromText",
    "loadAiInboxDetail",
    "setStatus",
    "renderAiInboxWorkspace",
    "resetAiInboxSummaryState",
    `${fnSource}; return runAiInboxSummary;`
  )(
    aiInboxState,
    { ai: { userMode: "Auto", modelPack: "Starter Auto", routePreview: { privacy: { mode: "normal" } } } },
    async () => {
      throw new Error("summary should not run without a selected artifact");
    },
    () => "",
    async () => null,
    () => {},
    () => {},
    ({ invalidate }) => {
      if (invalidate === true) aiInboxState.aiSummaryRequestToken += 1;
      aiInboxState.aiSummary = "";
      aiInboxState.aiSummaryArtifactId = "";
      aiInboxState.aiSummarySuggestionId = "";
      aiInboxState.aiSummaryMeta = "";
      aiInboxState.aiSummaryRecommendedAction = "";
      aiInboxState.aiSummaryError = "";
      aiInboxState.aiSummaryLoading = false;
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "runAiInboxSummary");

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

  const runAiInboxSummary = new Function(
    "aiInboxState",
    "settingsState",
    "summarizeAiInboxItem",
    "recommendedAiInboxActionFromText",
    "loadAiInboxDetail",
    "setStatus",
    "renderAiInboxWorkspace",
    "resetAiInboxSummaryState",
    `${fnSource}; return runAiInboxSummary;`
  )(
    aiInboxState,
    { ai: { userMode: "Auto", modelPack: "Starter Auto", routePreview: { privacy: { mode: "normal" } } } },
    async () => {
      throw new Error("summary should not start while the current artifact action is busy");
    },
    () => "",
    async () => {
      throw new Error("loadAiInboxDetail should not run while blocked by an in-flight artifact action");
    },
    (message, tone) => {
      statuses.push({ message, tone });
      return false;
    },
    () => {},
    () => {
      throw new Error("resetAiInboxSummaryState should not run while the current artifact action is busy");
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
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractAsyncFunctionSource(source, "refreshAiInboxEvaluationSummary");

  let rejectFirst;
  let resolveSecond;
  const renders = [];
  const aiInboxState = {
    filters: { view: "pending", type: "all", sourceNoteId: "", privacyMode: "" },
    evaluationSummary: { filter: { view: "all" }, artifacts: { total: 9 } },
    evaluationError: "stale evaluation error",
    evaluationLoading: false,
    evaluationRequestToken: 0
  };

  const refreshAiInboxEvaluationSummary = new Function(
    "aiInboxState",
    "normalizeAiInboxFilters",
    "fetchAiInboxEvaluationSummary",
    "renderAiInboxWorkspace",
    "setStatus",
    `${fnSource}; return refreshAiInboxEvaluationSummary;`
  )(
    aiInboxState,
    (filters) => filters,
    () =>
      new Promise((resolve, reject) => {
        if (!rejectFirst) rejectFirst = () => reject(new Error("old evaluation failure"));
        else resolveSecond = () => resolve({ filter: { view: "all" }, artifacts: { total: 1 } });
      }),
    () => {
      renders.push({
        evaluationError: aiInboxState.evaluationError,
        evaluationLoading: aiInboxState.evaluationLoading
      });
    },
    () => {}
  );

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
