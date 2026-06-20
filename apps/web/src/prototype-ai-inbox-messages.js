export function aiInboxReviewSafetyNotice() {
  return "Load the latest inbox detail before running review actions.";
}

export function aiInboxReviewSafetyStatusMessage() {
  return "AI inbox detail is not ready yet. Retry after the latest detail loads.";
}

export function aiInboxReviewRetryNotice() {
  return "Detail changed while you were reviewing. Retry from the latest reviewed item.";
}

export function aiInboxReviewRetryStatusMessage() {
  return "AI inbox detail changed before the review action could run. Retry on the latest detail.";
}

export function aiInboxSuggestionAlreadyAppliedNotice(status = "") {
  return `This reviewed suggestion is already ${String(status || "").trim() || "updated"}.`;
}

export function aiInboxInFlightReviewActionNotice() {
  return "Another AI inbox review action is still running. Wait for it to finish before reviewing a different item.";
}

export function aiInboxInFlightReviewActionStatusMessage() {
  return "Another AI inbox review action is still running. Wait for it to finish before reviewing a different item.";
}

export function aiInboxSuggestionAlreadyAppliedStatusMessage(status = "", suggestionId = "") {
  return `AI inbox suggestion already ${String(status || "").trim() || "updated"}: ${String(suggestionId || "").trim()}`;
}

export function aiInboxSuggestionUpdateFailedStatusMessage(error) {
  return `AI inbox suggestion update failed: ${String(error?.message || error)}`;
}

export function aiInboxSuggestionUpdatedStatusMessage(status = "", suggestionId = "") {
  return `AI inbox suggestion ${String(status || "").trim() || "updated"}: ${String(suggestionId || "").trim()}`;
}

export function aiInboxLinkAlreadyAppliedStatusMessage() {
  return "这条关联建议已经建立过关系";
}

export function aiInboxLinkAlreadyAppliedNotice() {
  return "This relation was already created for the current reviewed item.";
}

export function aiInboxLinkAcceptedStatusMessage(relation) {
  return relation?.created === false ? "关系已存在，建议已标记为已建立关系" : "已把关联建议建立为笔记关系";
}

export function aiInboxLinkAcceptFailedStatusMessage(error) {
  return `LinkSuggestion accept failed: ${String(error?.message || error)}`;
}

export function aiInboxNotePromotionAlreadyAppliedStatusMessage() {
  return "这条建议已经生成过草稿笔记";
}

export function aiInboxNotePromotionAlreadyAppliedNotice() {
  return "This draft note already exists for the current reviewed item.";
}

export function aiInboxNotePromotionSucceededStatusMessage(note) {
  return note?.id ? `已从 AI 建议生成草稿笔记：${note.id}` : "AI 建议已生成草稿";
}

export function aiInboxNotePromotionFailedStatusMessage(error) {
  return `AI note promotion failed: ${String(error?.message || error)}`;
}

export function aiInboxFieldSuggestionDraftAlreadyAppliedStatusMessage(statusLabel = "") {
  return `这条字段建议已经是${String(statusLabel || "").trim()}`;
}

export function aiInboxFieldSuggestionDraftAlreadyAppliedNotice(status = "") {
  return `This field suggestion is already ${String(status || "").trim()}.`;
}

export function aiInboxFieldSuggestionDraftSucceededStatusMessage(note) {
  return note?.id ? `已采纳 AI 字段建议为草稿：${note.id}` : "AI 字段建议已采纳为草稿";
}

export function aiInboxFieldSuggestionDraftFailedStatusMessage(error) {
  return `AI field suggestion adopt failed: ${String(error?.message || error)}`;
}

export function aiInboxDecisionSucceededStatusMessage(decision = "", label = "") {
  return `AI 建议已${String(label || decision || "").trim() || "处理"}`;
}

export function aiInboxDecisionFailedStatusMessage(error) {
  return `AI 建议处理失败：${String(error?.message || error)}`;
}
