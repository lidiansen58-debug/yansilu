import test from "node:test";
import assert from "node:assert/strict";

import {
  graphWritingContinuationFailureMessage,
  graphWritingContinuationInput,
  graphWritingContinuationStatusMessage,
  graphWritingFollowupEntryPlan
} from "../../apps/web/src/graph-followup.js";

test("graph writing followup reuses the projected writing continuity entry when a matching project already exists", () => {
  const input = graphWritingContinuationInput({
    basketNoteIds: ["basket-a", "shared"],
    candidateNoteIds: ["shared", "visible-b"],
    selectedThemeIndexId: "theme-1",
    sourceIndexIds: ["source-1", "theme-1"]
  });

  assert.deepEqual(input.basketNoteIds, ["basket-a", "shared", "visible-b"]);
  assert.deepEqual(input.sourceIndexIds, ["theme-1", "source-1"]);
});

test("graph writing followup keeps action-specific success copy for continuity actions", () => {
  assert.equal(
    graphWritingContinuationStatusMessage({ projectId: "project-1", action: "open-draft" }),
    "已从图谱打开当前草稿：project-1"
  );
  assert.equal(
    graphWritingContinuationStatusMessage({ projectId: "project-1", action: "resume-scaffold" }),
    "已从图谱回到文章提纲：project-1"
  );
  assert.equal(
    graphWritingContinuationStatusMessage({ projectId: "project-1", action: "resume-project" }),
    "已从图谱继续这个主题：project-1"
  );
});

test("graph writing followup keeps action-specific failure copy for continuity actions", () => {
  assert.equal(
    graphWritingContinuationFailureMessage({ action: "open-draft" }, new Error("boom")),
    "从图谱打开当前草稿失败：boom"
  );
  assert.equal(
    graphWritingContinuationFailureMessage({ action: "resume-scaffold" }, "missing"),
    "从图谱回到文章提纲失败：missing"
  );
  assert.equal(
    graphWritingContinuationFailureMessage({ action: "resume-project" }, "stale"),
    "从图谱继续这个主题失败：stale"
  );
});

test("graph writing followup stops before opening the writing center when no candidate note is ready", () => {
  const plan = graphWritingFollowupEntryPlan({
    basketNoteIds: [],
    candidateNoteIds: [],
    scopeNoteIds: ["visible-a"]
  });

  assert.equal(plan.mode, "no-candidates");
  assert.equal(plan.hasBasket, false);
  assert.deepEqual(plan.prefillNoteIds, []);
  assert.match(plan.statusMessage, /图谱范围/);
});

test("graph next-action flow computes projected continuity from the visible writing candidates", () => {
  const input = graphWritingContinuationInput({
    basketNoteIds: ["existing-a"],
    candidateNoteIds: ["visible-a", "visible-b"]
  });

  assert.deepEqual(input.basketNoteIds, ["existing-a", "visible-a", "visible-b"]);
});
