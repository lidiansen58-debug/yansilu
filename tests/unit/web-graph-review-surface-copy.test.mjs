import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGraphQuestionSpotSummaryForGraph
} from "../../apps/web/src/graph-thinking-items-model.js";
import {
  graphFollowupOpenedNoteStatus
} from "../../apps/web/src/graph-followup-status-messages.js";
import {
  graphRelationQualityLabel,
  graphRelationReviewReasonLabel,
  renderGraphUtilityDrawerView,
  renderRelationReviewQueueSectionView
} from "../../apps/web/src/graph-review-surface-view.js";

const escapeHtml = (value = "") => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

test("graph review queue consistently frames missing-rationale work as relation explanations", () => {
  const questionSummary = buildGraphQuestionSpotSummaryForGraph({
    reviewQueueTotal: 3,
    aiAnalysis: { analysis: { relationCandidates: [] } }
  });
  const reviewMarkup = renderRelationReviewQueueSectionView({
    total: 2,
    summary: { byQualityLevel: { empty: 1, basic: 1 } },
    items: [
      {
        id: "rel-1",
        fromNoteId: "n1",
        toNoteId: "n2",
        relationType: "supports",
        reviewReason: "missing_rationale",
        rationaleQualityLevel: "empty",
        createdBy: "user",
        status: "confirmed",
        source: { title: "源" },
        target: { title: "目标" }
      }
    ]
  }, { open: true }, {
    escapeHtml,
    graphEdgeSelectionKey: (item) => item.id,
    graphRelationGroupMeta: () => ({ className: "is-support", label: "支撑" }),
    graphRelationSourceLabel: () => "自己",
    graphRelationStatusLabel: () => "已确认",
    graphRelationTypeLabel: () => "支持"
  });
  const emptyMarkup = renderRelationReviewQueueSectionView({
    total: 1,
    summary: { byQualityLevel: { empty: 0, basic: 0 } },
    items: []
  }, {}, { escapeHtml });
  const drawerMarkup = renderGraphUtilityDrawerView({
    reviewQueue: { total: 3 },
    sectionsMarkup: "<section>content</section>",
    open: true
  }, {
    escapeHtml,
    graphAiAnalysisSummaryState: () => ({ totalCandidates: 0 }),
    renderGraphIcon: (name) => `<i>${name}</i>`
  });

  assert.equal(graphRelationQualityLabel("empty"), "缺说明");
  assert.equal(graphRelationReviewReasonLabel("missing_rationale"), "补关系说明");
  assert.match(reviewMarkup, /graph-section-title">需要补充说明的关系</);
  assert.match(reviewMarkup, /缺说明 1 条；说明太粗 1 条/);
  assert.match(reviewMarkup, /点卡片可以回到源笔记补充说明/);
  assert.match(emptyMarkup, /没有缺说明或说明太粗的关系/);
  assert.deepEqual(questionSummary.categories.find((item) => item.key === "review"), {
    key: "review",
    label: "关系待复核",
    count: 3
  });
  assert.match(drawerMarkup, /<span>待补说明 3<\/span>/);
  assert.match(drawerMarkup, /<strong><i>clue<\/i>稍后处理<\/strong>/);
  assert.match(drawerMarkup, /把暂时不急着处理的候选、理由缺口和主题苗头先收在这里/);

  assert.equal(graphFollowupOpenedNoteStatus({ action: "relations-edit" }).message, "已从图谱打开笔记，继续完善当前关系说明");
  assert.equal(graphFollowupOpenedNoteStatus({ action: "relations" }).message, "已从图谱打开笔记，继续写关系说明");
  assert.equal(graphFollowupOpenedNoteStatus({ action: "tension" }).message, "已从图谱打开笔记，继续补反例、边界或例外条件");
  assert.notEqual(graphRelationQualityLabel("empty"), "缺理由");
  assert.notEqual(graphRelationReviewReasonLabel("missing_rationale"), "补关系理由");
  assert.doesNotMatch(reviewMarkup, /待补关系理由/);
  assert.doesNotMatch(graphFollowupOpenedNoteStatus({ action: "tension" }).message, /张力说明/);
});
