import { captureActionConfirmationContext, confirmCurrentAction } from "./action-confirmation-context.js";

export function confirmAiInboxRecommendedAction(deps, { message, isReady }) {
  const inbox = deps.aiInboxState;
  const detail = inbox.detail;
  const snapshot = () => JSON.stringify([
    inbox.selectedArtifactId, inbox.detailRequestToken, inbox.aiSummaryRequestToken,
    inbox.aiSummaryRecommendedAction, inbox.aiSummarySuggestionId,
    inbox.detail?.suggestion?.id, inbox.detail?.suggestion?.status,
    (deps.decisionCommentText || deps.commentText)?.()
  ]);
  const currentContext = captureActionConfirmationContext(() => deps, snapshot);
  return confirmCurrentAction(inbox, {
    confirm: deps.confirm, message,
    isCurrent: () => currentContext() && inbox.detail === detail && !inbox.actionLoading && isReady(),
    onError: error => deps.setStatus?.(`确认未完成：${String(error?.message || error)}`, "warn")
  });
}
