import test from "node:test";
import assert from "node:assert/strict";

import { analyzeWritingProjectReadiness } from "../../packages/domain/src/quality-checks.mjs";

test("writing readiness missing-central-question message uses Chinese copy", () => {
  const result = analyzeWritingProjectReadiness(
    {
      basket_note_ids: ["pn_1"]
    },
    {
      notes: [
        {
          id: "pn_1",
          thesis: "A reusable claim.",
          threeLineSummary: ["one", "two", "three"]
        }
      ],
      indexCards: [
        {
          id: "idx_1",
          centralQuestion: ""
        }
      ]
    }
  );

  const messages = result.checks.map((item) => item.message);
  assert.ok(messages.includes("补一张带中心问题的主题卡，或改用已经写出中心问题的主题。"));
  assert.ok(!messages.includes("Add or choose a topic with a central question."));
});
