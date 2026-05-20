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
  assert.match(html, /先创建一个论文工作台/);
});

test("renderPaperWorkspacePage restores saved translation context and unlocks the next step", () => {
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
        status: "translated"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "My own wording.",
        relationToQuestion: "This matters for the writing question.",
        boundaryOrCondition: "Only when the sample is comparable."
      }
    ],
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
  state.form.paraphraseText = "My own wording.";
  state.form.relationToQuestion = "This matters for the writing question.";
  state.form.boundaryOrCondition = "Only when the sample is comparable.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /Candidate One/);
  assert.match(html, /NotebookLM candidate text/);
  assert.match(html, /这条候选已经保存过转述/);
  assert.match(html, /My own wording\./);
  assert.match(html, /This matters for the writing question\./);
  assert.match(html, /Only when the sample is comparable\./);
  assert.doesNotMatch(html, /id="btnCreatePermanentCandidate"[^>]*disabled/);
  assert.match(html, /Permanent One/);
  assert.match(html, /paper-risk-warning/);
  assert.match(html, /confirmAuthorshipInput/);
});

test("renderPaperWorkspacePage keeps permanent candidate action disabled before translation is saved", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "candidates",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "new"
      }
    ],
    translations: [],
    permanentCandidates: []
  };
  state.selectedCandidateId = "pwc_1";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /先保存这条候选的用户转述，再进入永久笔记候选/);
  assert.match(html, /id="btnCreatePermanentCandidate"[^>]*disabled/);
});
