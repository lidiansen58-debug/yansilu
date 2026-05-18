import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeIndexCardDistillation,
  analyzePermanentNoteDistillation,
  analyzeWritingProjectReadiness
} from "../../packages/domain/src/index.mjs";

test("permanent note distillation quality checks are advisory", () => {
  const checks = analyzePermanentNoteDistillation({
    noteType: "permanent",
    title: "Reusable note",
    thesis: "Reusable note",
    threeLineSummary: ["Same", "Same", "Use"]
  });

  assert.equal(checks.every((item) => item.blocking === false), true);
  assert.ok(checks.some((item) => item.code === "thesis_matches_title"));
  assert.ok(checks.some((item) => item.code === "three_line_summary_repeated"));
});

test("index card distillation quality checks central question and three-line summary", () => {
  const checks = analyzeIndexCardDistillation({
    items: [{}, {}],
    thesis: "Topics should carry questions.",
    threeLineSummary: ["Only one line"]
  });

  assert.ok(checks.some((item) => item.code === "missing_central_question"));
  assert.ok(checks.some((item) => item.code === "theme_three_line_summary_count"));
  assert.ok(checks.some((item) => item.code === "missing_theme_boundary"));
});

test("writing readiness reports intent and basket note gaps without blocking scaffold creation", () => {
  const readiness = analyzeWritingProjectReadiness(
    {
      basket_note_ids: ["pn_1"]
    },
    {
      notes: [{ id: "pn_1", title: "Draft note" }]
    }
  );

  assert.equal(readiness.status, "needs_clarification");
  assert.ok(readiness.checks.some((item) => item.code === "missing_intent"));
  assert.ok(readiness.checks.some((item) => item.code === "basket_notes_missing_thesis"));
  assert.equal(readiness.checks.every((item) => item.blocking === false), true);
});
