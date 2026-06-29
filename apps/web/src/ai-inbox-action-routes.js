import {
  acceptAiInboxLinkSuggestionForRuntime,
  adoptAiInboxFieldSuggestionDraftForRuntime,
  applyAiInboxRecommendedActionForRuntime,
  applyAiInboxSuggestionStatusForRuntime,
  promoteAiInboxArtifactToNoteForRuntime,
  recordAiInboxReviewDecisionForRuntime
} from "./ai-inbox-runtime-controller.js";
import {
  aiInboxDecisionFailedStatusMessage,
  aiInboxDecisionSucceededStatusMessage,
  aiInboxFieldSuggestionDraftAlreadyAppliedNotice,
  aiInboxFieldSuggestionDraftAlreadyAppliedStatusMessage,
  aiInboxFieldSuggestionDraftFailedStatusMessage,
  aiInboxFieldSuggestionDraftSucceededStatusMessage,
  aiInboxInFlightReviewActionNotice,
  aiInboxInFlightReviewActionStatusMessage,
  aiInboxLinkAcceptFailedStatusMessage,
  aiInboxLinkAcceptedStatusMessage,
  aiInboxLinkAlreadyAppliedNotice,
  aiInboxLinkAlreadyAppliedStatusMessage,
  aiInboxNotePromotionAlreadyAppliedNotice,
  aiInboxNotePromotionAlreadyAppliedStatusMessage,
  aiInboxNotePromotionFailedStatusMessage,
  aiInboxNotePromotionSucceededStatusMessage,
  aiInboxReviewRetryNotice,
  aiInboxReviewRetryStatusMessage,
  aiInboxReviewSafetyNotice,
  aiInboxReviewSafetyStatusMessage,
  aiInboxSuggestionAlreadyAppliedNotice,
  aiInboxSuggestionAlreadyAppliedStatusMessage,
  aiInboxSuggestionUpdateFailedStatusMessage,
  aiInboxSuggestionUpdatedStatusMessage
} from "./prototype-ai-inbox-messages.js";

function commonReviewMessages() {
  return {
    reviewSafetyNotice: aiInboxReviewSafetyNotice,
    reviewSafetyStatusMessage: aiInboxReviewSafetyStatusMessage,
    reviewRetryNotice: aiInboxReviewRetryNotice,
    reviewRetryStatusMessage: aiInboxReviewRetryStatusMessage
  };
}

function inFlightMessages() {
  return {
    inFlightReviewActionNotice: aiInboxInFlightReviewActionNotice,
    inFlightReviewActionStatusMessage: aiInboxInFlightReviewActionStatusMessage
  };
}

export function createAiInboxActionRoutes(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};
  const commentText = () => deps().decisionCommentText?.() || "";

  async function finalizeAiInboxActionRefresh(options = {}) {
    return deps().finalizeAiInboxActionRefresh(options);
  }

  async function recordAiInboxReviewDecision(decision) {
    const current = deps();
    return recordAiInboxReviewDecisionForRuntime({
      ...current,
      commentText,
      finalizeAiInboxActionRefresh,
      messages: {
        ...commonReviewMessages(),
        ...inFlightMessages(),
        decisionSucceededStatusMessage: aiInboxDecisionSucceededStatusMessage,
        decisionFailedStatusMessage: aiInboxDecisionFailedStatusMessage
      }
    }, decision);
  }

  async function applyAiInboxRecommendedAction(action = "") {
    const current = deps();
    return applyAiInboxRecommendedActionForRuntime({
      ...current,
      confirm: current.confirm,
      appendDecisionComment: current.appendDecisionComment,
      acceptLink: acceptAiInboxLinkSuggestion,
      adoptFieldSuggestion: adoptAiInboxFieldSuggestionDraft,
      promoteNote: promoteAiInboxArtifactToNote,
      recordDecision: recordAiInboxReviewDecision,
      messages: commonReviewMessages()
    }, action);
  }

  async function acceptAiInboxLinkSuggestion(artifactId) {
    const current = deps();
    return acceptAiInboxLinkSuggestionForRuntime({
      ...current,
      commentText,
      finalizeAiInboxActionRefresh,
      afterFinalize: current.afterAcceptFinalize,
      messages: {
        ...commonReviewMessages(),
        ...inFlightMessages(),
        linkAlreadyAppliedNotice: aiInboxLinkAlreadyAppliedNotice,
        linkAlreadyAppliedStatusMessage: aiInboxLinkAlreadyAppliedStatusMessage,
        linkAcceptedStatusMessage: aiInboxLinkAcceptedStatusMessage,
        linkAcceptFailedStatusMessage: aiInboxLinkAcceptFailedStatusMessage
      }
    }, artifactId);
  }

  async function promoteAiInboxArtifactToNote(artifactId) {
    const current = deps();
    return promoteAiInboxArtifactToNoteForRuntime({
      ...current,
      commentText,
      finalizeAiInboxActionRefresh,
      beforeFinalize: current.beforeNoteResultFinalize,
      afterFinalize: current.afterPromoteFinalize,
      messages: {
        ...commonReviewMessages(),
        ...inFlightMessages(),
        notePromotionAlreadyAppliedNotice: aiInboxNotePromotionAlreadyAppliedNotice,
        notePromotionAlreadyAppliedStatusMessage: aiInboxNotePromotionAlreadyAppliedStatusMessage,
        notePromotionSucceededStatusMessage: aiInboxNotePromotionSucceededStatusMessage,
        notePromotionFailedStatusMessage: aiInboxNotePromotionFailedStatusMessage
      }
    }, artifactId);
  }

  async function adoptAiInboxFieldSuggestionDraft(artifactId, expectedSuggestionId = "") {
    const current = deps();
    return adoptAiInboxFieldSuggestionDraftForRuntime({
      ...current,
      commentText,
      finalizeAiInboxActionRefresh,
      beforeFinalize: current.beforeNoteResultFinalize,
      afterFinalize: current.afterAdoptFinalize,
      messages: {
        ...commonReviewMessages(),
        ...inFlightMessages(),
        fieldSuggestionDraftAlreadyAppliedNotice: aiInboxFieldSuggestionDraftAlreadyAppliedNotice,
        fieldSuggestionDraftAlreadyAppliedStatusMessage: aiInboxFieldSuggestionDraftAlreadyAppliedStatusMessage,
        fieldSuggestionDraftSucceededStatusMessage: aiInboxFieldSuggestionDraftSucceededStatusMessage,
        fieldSuggestionDraftFailedStatusMessage: aiInboxFieldSuggestionDraftFailedStatusMessage
      }
    }, artifactId, expectedSuggestionId);
  }

  async function applyAiInboxSuggestionStatus(status, expectedSuggestionId = "") {
    const current = deps();
    return applyAiInboxSuggestionStatusForRuntime({
      ...current,
      adoptAiInboxFieldSuggestionDraft,
      commentText,
      finalizeAiInboxActionRefresh,
      messages: {
        ...commonReviewMessages(),
        ...inFlightMessages(),
        suggestionAlreadyAppliedNotice: aiInboxSuggestionAlreadyAppliedNotice || current.aiSuggestionAlreadyAppliedNotice,
        suggestionAlreadyAppliedStatusMessage: aiInboxSuggestionAlreadyAppliedStatusMessage,
        suggestionUpdatedStatusMessage: aiInboxSuggestionUpdatedStatusMessage,
        suggestionUpdateFailedStatusMessage: aiInboxSuggestionUpdateFailedStatusMessage
      }
    }, status, expectedSuggestionId);
  }

  return {
    recordAiInboxReviewDecision,
    applyAiInboxRecommendedAction,
    acceptAiInboxLinkSuggestion,
    promoteAiInboxArtifactToNote,
    adoptAiInboxFieldSuggestionDraft,
    applyAiInboxSuggestionStatus
  };
}
