import test from "node:test";
import assert from "node:assert/strict";

import { analyzeWritingProjectReadiness } from "../../packages/domain/src/quality-checks.mjs";

test("writing readiness missing intent and reader takeaway messages use Chinese copy", () => {
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
      ]
    }
  );

  const messages = result.checks.map((item) => item.message);
  assert.ok(messages.includes("先说清这篇文章到底想表达什么。"));
  assert.ok(messages.includes("写下读者最后应该带走的判断。"));
  assert.ok(!messages.includes("Clarify what this writing project is trying to say."));
  assert.ok(!messages.includes("Write the judgment the reader should take away."));
});
