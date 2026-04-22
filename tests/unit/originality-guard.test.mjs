import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOriginalityPlan, originalityGuard, similarityScore } from "../../packages/originality-guard/src/index.mjs";

test("normalizeOriginalityPlan clamps thresholds and keeps block >= warn", () => {
  const plan = normalizeOriginalityPlan({
    warnThreshold: 2,
    blockThreshold: 0.2,
    requireCitationLocator: false,
    blockOnBlocked: false
  });

  assert.equal(plan.warnThreshold, 1);
  assert.equal(plan.blockThreshold, 1);
  assert.equal(plan.requireCitationLocator, false);
  assert.equal(plan.blockOnBlocked, false);
});

test("similarityScore strongly flags copied text containment", () => {
  const score = similarityScore("A copied claim should not become permanent", "A copied claim should not become permanent");
  assert.ok(score >= 0.95);
});

test("originalityGuard blocks permanent notes copied from literature notes", () => {
  const result = originalityGuard(
    {
      literature: [
        {
          id: "ln_1",
          source_id: "src_1",
          quote_text: "A copied claim that should stay as a literature note"
        }
      ],
      permanent: [
        {
          id: "pn_1",
          core_claim: "A copied claim that should stay as a literature note",
          citations: [{ source_id: "src_1", locator: "p. 1" }]
        }
      ]
    },
    { warnThreshold: 0.5, blockThreshold: 0.8 }
  );

  assert.deepEqual(result.flaggedPermanentIds, ["pn_1"]);
  assert.equal(result.evaluations[0].status, "blocked");
  assert.ok(result.evaluations[0].reasons.includes("similarity_above_block_threshold"));
  assert.equal(result.warnings[0].code, "ORIGINALITY_GUARD_BLOCKED");
});

test("originalityGuard warns when citation locator is missing", () => {
  const result = originalityGuard(
    {
      literature: [
        {
          id: "ln_1",
          source_id: "src_1",
          quote_text: "A source excerpt"
        }
      ],
      permanent: [
        {
          id: "pn_1",
          core_claim: "A distinct synthesis",
          citations: [{ source_id: "src_1" }]
        }
      ]
    },
    { warnThreshold: 0.7, blockThreshold: 0.9, requireCitationLocator: true }
  );

  assert.deepEqual(result.flaggedPermanentIds, []);
  assert.equal(result.evaluations[0].status, "warning");
  assert.ok(result.evaluations[0].reasons.includes("citation_locator_missing"));
});

test("originalityGuard passes distinct claims with traceable citations", () => {
  const result = originalityGuard(
    {
      literature: [
        {
          id: "ln_1",
          source_id: "src_1",
          quote_text: "A source excerpt about reading notes"
        }
      ],
      permanent: [
        {
          id: "pn_1",
          core_claim: "Index cards should connect mature ideas for later writing",
          citations: [{ source_id: "src_1", locator: "p. 12" }]
        }
      ]
    },
    { warnThreshold: 0.6, blockThreshold: 0.8, requireCitationLocator: true }
  );

  assert.deepEqual(result.flaggedPermanentIds, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.evaluations[0].status, "pass");
  assert.deepEqual(result.evaluations[0].reasons, []);
});
