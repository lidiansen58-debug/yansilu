import test from "node:test";
import assert from "node:assert/strict";

import { graphNextActionForSummary, graphWritingEntryReason, graphWritingFollowupEntryPlan } from "../../apps/web/src/graph-followup.js";

test("graph next action names already-basket writing entry explicitly", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingEntryPlan: {
      mode: "already-in-basket",
      candidateCount: 2,
      addedCount: 0,
      hasBasket: true
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：继续这组相关笔记");
  assert.equal(nextAction.actionLabel, "继续写作");
  assert.match(nextAction.note, /已经都在相关笔记中|继续写作/);
});

test("graph next action previews auto-prefill when the visible slice is small", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingEntryPlan: {
      mode: "prefill-visible",
      candidateCount: 2,
      addedCount: 2,
      hasBasket: false
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：带入 2 条永久笔记");
  assert.equal(nextAction.actionLabel, "带入写作");
  assert.match(nextAction.note, /作为相关笔记带入写作中心/);
  assert.doesNotMatch(nextAction.note, /进入写作中心时/);
});

test("graph next action keeps basket-scoped wording when visible notes are appended into an existing basket", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingEntryPlan: {
      mode: "prefill-visible",
      candidateCount: 2,
      addedCount: 2,
      hasBasket: true
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：带入 2 条永久笔记");
  assert.equal(nextAction.actionLabel, "带入写作");
  assert.match(nextAction.note, /继续写作时会一起加入相关笔记/);
});

test("graph next action keeps the user in the current basket when there are no new candidates", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingEntryPlan: {
      mode: "no-candidates",
      candidateCount: 0,
      addedCount: 0,
      hasBasket: true
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：继续这组相关笔记");
  assert.equal(nextAction.actionLabel, "继续写作");
  assert.match(nextAction.note, /暂时没有适合新增的相关笔记/);
  assert.match(nextAction.note, /直接继续这组笔记/);
});

test("graph next action previews manual picking when the visible slice is too large to auto-prefill", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingEntryPlan: {
      mode: "pick-manually",
      candidateCount: 6,
      addedCount: 6,
      hasBasket: false
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：先挑 2-5 条相关笔记");
  assert.equal(nextAction.actionLabel, "先挑 2-5 条");
  assert.match(nextAction.note, /6 条可用永久笔记/);
  assert.match(nextAction.note, /先挑 2-5 条作为相关笔记/);
  assert.doesNotMatch(nextAction.note, /在写作中心挑/);
});

test("graph follow-up entry plan preloads a small visible slice before continuing", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: ["basket-a"],
    candidateNoteIds: ["basket-a", "visible-b", "visible-c"],
    scopeNoteIds: ["visible-b", "visible-c"]
  });

  assert.equal(plan.mode, "prefill-visible");
  assert.equal(plan.hasBasket, true);
  assert.equal(plan.addedCount, 2);
  assert.deepEqual(plan.prefillNoteIds, ["visible-b", "visible-c"]);
  assert.match(graphWritingEntryReason(plan), /当前图谱里还有 2 条可写永久笔记/);
});
