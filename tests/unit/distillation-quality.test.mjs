import test from "node:test";
import assert from "node:assert/strict";
import {
  collectDistillationQualityWarnings,
  noteHasBoundarySignal,
  summarizeDistillationQuality
} from "../../packages/domain/src/distillation-quality.mjs";

test("distillation quality flags title-like thesis repetitive summary and missing boundary", () => {
  const warnings = collectDistillationQualityWarnings({
    title: "Writing path",
    thesis: "Writing path",
    threeLineSummary: ["Same line", "Same line", "Use"],
    boundaryOrCounterpoint: ""
  });

  assert.ok(warnings.some((item) => item.id === "thesis_title_like"));
  assert.ok(warnings.some((item) => item.id === "summary_repetitive"));
  assert.ok(warnings.some((item) => item.id === "summary_relevance_weak"));
  assert.ok(warnings.some((item) => item.id === "boundary_missing"));
});

test("distillation quality passes a clear thesis summary and boundary", () => {
  const result = summarizeDistillationQuality({
    title: "Writing from notes",
    thesis: "Writing should begin from confirmed note-level judgments.",
    threeLineSummary: [
      "This note argues that writing should begin from confirmed note-level judgments.",
      "That matters because structure is easier once the claim is already compressed.",
      "It serves writing preparation by turning notes into reusable draft inputs."
    ],
    boundaryOrCounterpoint: "This weakens when the notes are still copied material without source trace."
  });

  assert.equal(result.status, "ready");
  assert.equal(result.warningCount, 0);
});

test("boundary signal also recognizes explicit boundary language in body text", () => {
  assert.equal(
    noteHasBoundarySignal({
      body: "# Note\n\n适用边界：这个判断不适用于只剩摘录、还没有转述的材料。"
    }),
    true
  );
});
