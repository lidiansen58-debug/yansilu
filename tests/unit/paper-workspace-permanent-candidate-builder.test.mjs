import test from "node:test";
import assert from "node:assert/strict";

import { buildPermanentCandidateFromPaperTranslation } from "../../packages/paper-workspace/src/index.mjs";

function sampleWorkspace() {
  return {
    paperId: "paper_builder",
    sourceId: "src_paper",
    candidates: [
      {
        id: "pwc_1",
        externalCandidateId: "ln_1",
        sourceId: "src_1",
        title: "NotebookLM candidate",
        quoteText: "The paper says retrieval practice improved delayed recall.",
        locator: "p. 12",
        tags: ["memory"]
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "My takeaway is that effortful recall can make an idea easier to access later.",
        relationToQuestion: "This supports turning reading work into durable notes.",
        boundaryOrCondition: "The effect may depend on the task design."
      }
    ]
  };
}

test("buildPermanentCandidateFromPaperTranslation requires a user paraphrase", () => {
  const workspace = sampleWorkspace();
  workspace.translations = [];

  assert.throws(
    () => buildPermanentCandidateFromPaperTranslation(workspace, { candidateId: "pwc_1" }),
    { code: "PAPER_PERMANENT_CANDIDATE_PARAPHRASE_REQUIRED" }
  );
});

test("buildPermanentCandidateFromPaperTranslation maps translation into a PermanentNote candidate", () => {
  const candidate = buildPermanentCandidateFromPaperTranslation(sampleWorkspace(), {
    candidateId: "pwc_1",
    createdAt: "2026-05-09T00:00:00.000Z"
  });

  assert.match(candidate.id, /^pn_/);
  assert.equal(candidate.core_claim, "My takeaway is that effortful recall can make an idea easier to access later.");
  assert.equal(candidate.rationale, "This supports turning reading work into durable notes.");
  assert.equal(candidate.boundary_or_counterpoint, "The effect may depend on the task design.");
  assert.deepEqual(candidate.citations, [
    {
      source_id: "src_1",
      locator: "p. 12",
      quote_excerpt: "The paper says retrieval practice improved delayed recall."
    }
  ]);
  assert.deepEqual(candidate.from_literature_note_ids, ["ln_1"]);
  assert.deepEqual(candidate.authorship, { user_confirmed: false, ai_assisted: false });
  assert.equal(candidate.originality_status, "warning");
  assert.equal(candidate.status, "draft");
  assert.equal(candidate.paper_workspace_id, "paper_builder");
  assert.equal(candidate.paper_candidate_id, "pwc_1");
  assert.equal(candidate.translation_id, "ptr_1");
});
