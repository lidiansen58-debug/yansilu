import test from "node:test";
import assert from "node:assert/strict";

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
} from "../../apps/web/src/prototype-ai-inbox-messages.js";

test("prototype AI inbox message helpers keep review guard copy stable", () => {
  assert.equal(aiInboxReviewSafetyNotice(), "Load the latest inbox detail before running review actions.");
  assert.equal(aiInboxReviewSafetyStatusMessage(), "AI inbox detail is not ready yet. Retry after the latest detail loads.");
  assert.equal(aiInboxReviewRetryNotice(), "Detail changed while you were reviewing. Retry from the latest reviewed item.");
  assert.equal(aiInboxReviewRetryStatusMessage(), "AI inbox detail changed before the review action could run. Retry on the latest detail.");
  assert.equal(aiInboxInFlightReviewActionNotice(), aiInboxInFlightReviewActionStatusMessage());
});

test("prototype AI inbox message helpers format suggestion status copy", () => {
  assert.equal(aiInboxSuggestionAlreadyAppliedNotice("accepted"), "This reviewed suggestion is already accepted.");
  assert.equal(aiInboxSuggestionAlreadyAppliedNotice(""), "This reviewed suggestion is already updated.");
  assert.equal(aiInboxSuggestionAlreadyAppliedStatusMessage("accepted", "s1"), "AI inbox suggestion already accepted: s1");
  assert.equal(aiInboxSuggestionUpdateFailedStatusMessage(new Error("boom")), "AI inbox suggestion update failed: boom");
  assert.equal(aiInboxSuggestionUpdatedStatusMessage("dismissed", "s1"), "AI inbox suggestion dismissed: s1");
});

test("prototype AI inbox message helpers format action outcome copy", () => {
  assert.equal(aiInboxLinkAlreadyAppliedStatusMessage(), "这条关联建议已经建立过关系");
  assert.equal(aiInboxLinkAlreadyAppliedNotice(), "This relation was already created for the current reviewed item.");
  assert.equal(aiInboxLinkAcceptedStatusMessage({ created: false }), "关系已存在，建议已标记为已建立关系");
  assert.equal(aiInboxLinkAcceptedStatusMessage({ created: true }), "已把关联建议建立为笔记关系");
  assert.equal(aiInboxLinkAcceptFailedStatusMessage("fail"), "LinkSuggestion accept failed: fail");

  assert.equal(aiInboxNotePromotionAlreadyAppliedStatusMessage(), "这条建议已经生成过草稿笔记");
  assert.equal(aiInboxNotePromotionAlreadyAppliedNotice(), "This draft note already exists for the current reviewed item.");
  assert.equal(aiInboxNotePromotionSucceededStatusMessage({ id: "n1" }), "已从 AI 建议生成草稿笔记：n1");
  assert.equal(aiInboxNotePromotionFailedStatusMessage("fail"), "AI note promotion failed: fail");

  assert.equal(aiInboxFieldSuggestionDraftAlreadyAppliedStatusMessage("待确认"), "这条字段建议已经是待确认");
  assert.equal(aiInboxFieldSuggestionDraftAlreadyAppliedNotice("accepted"), "This field suggestion is already accepted.");
  assert.equal(aiInboxFieldSuggestionDraftSucceededStatusMessage({ id: "n2" }), "已采纳 AI 字段建议为草稿：n2");
  assert.equal(aiInboxFieldSuggestionDraftFailedStatusMessage("fail"), "AI field suggestion adopt failed: fail");

  assert.equal(aiInboxDecisionSucceededStatusMessage("accept", "接受"), "AI 建议已接受");
  assert.equal(aiInboxDecisionFailedStatusMessage("fail"), "AI 建议处理失败：fail");
});
