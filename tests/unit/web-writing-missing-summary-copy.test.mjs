import test from "node:test";
import assert from "node:assert/strict";

import { analyzeWritingProjectReadiness } from "../../packages/domain/src/quality-checks.mjs";

test("writing readiness missing-summary message uses Chinese copy", () => {
  const result = analyzeWritingProjectReadiness(
    {
      basket_note_ids: ["pn_1"]
    },
    {
      notes: [
        {
          id: "pn_1",
          thesis: "A reusable claim.",
          threeLineSummary: ["one", "two"]
        }
      ]
    }
  );

  const messages = result.checks.map((item) => item.message);
  assert.ok(messages.includes("1 条写作篮笔记还需要补齐三句话提纯。"));
  assert.ok(!messages.includes("1 basket note(s) still need a three-line summary."));
});
