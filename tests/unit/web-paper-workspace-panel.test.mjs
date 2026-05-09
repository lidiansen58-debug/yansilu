import test from "node:test";
import assert from "node:assert/strict";

import { createInitialPaperWorkspaceState } from "../../apps/web/src/paper-workspace-model.js";
import { renderPaperWorkspacePage } from "../../apps/web/src/paper-workspace-panel.js";

test("renderPaperWorkspacePage exposes the four-step paper workflow", () => {
  const state = createInitialPaperWorkspaceState();
  const html = renderPaperWorkspacePage(state);

  assert.match(html, /NotebookLM assisted paper workflow/);
  assert.match(html, /id="btnCreatePaperWorkspace"/);
  assert.match(html, /id="btnAddNotebookDraft"/);
  assert.match(html, /id="btnSaveTranslation"/);
  assert.match(html, /id="btnCreatePermanentCandidate"/);
  assert.match(html, /id="btnSavePermanentNote"/);
});

test("renderPaperWorkspacePage renders candidates and permanent candidate preview", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "permanent_candidates",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "converted"
      }
    ],
    translations: [{ id: "ptr_1", candidateId: "pwc_1" }],
    permanentCandidates: [
      {
        id: "pn_1",
        title: "Permanent One",
        core_claim: "My claim.",
        rationale: "My reason.",
        originality_status: "warning",
        citations: [{ source_id: "src_1" }]
      }
    ]
  };
  state.selectedCandidateId = "pwc_1";
  state.selectedPermanentCandidateId = "pn_1";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /Candidate One/);
  assert.match(html, /NotebookLM candidate text/);
  assert.match(html, /Permanent One/);
  assert.match(html, /paper-risk-warning/);
  assert.match(html, /confirmAuthorshipInput/);
});
