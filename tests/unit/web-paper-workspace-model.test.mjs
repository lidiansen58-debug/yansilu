import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNotebookLmPayload,
  canCreatePermanentCandidate,
  canSubmitNotebookDraft,
  candidateKindLabel,
  candidateStatusLabel,
  paperWorkspaceProgress,
  selectedPaperCandidate,
  selectedPaperTranslation,
  translationDraftForCandidate,
  workspaceStageLabel
} from "../../apps/web/src/paper-workspace-model.js";

test("buildNotebookLmPayload keeps only provided NotebookLM fields", () => {
  assert.deepEqual(
    buildNotebookLmPayload({
      notebookName: " Paper Notebook ",
      summary: " Summary text ",
      qa: "",
      studyGuide: " - Method ",
      notes: " Notes text "
    }),
    {
      notebookName: "Paper Notebook",
      summary: "Summary text",
      studyGuide: "- Method",
      notes: "Notes text"
    }
  );
});

test("paper workspace model reports progress and restores saved translation context", () => {
  const workspace = {
    stage: "permanent_candidates",
    candidates: [
      { id: "pwc_1", title: "First" },
      { id: "pwc_2", title: "Second" }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_2",
        paraphraseText: "Second in my own words.",
        relationToQuestion: "Connects to the research question.",
        boundaryOrCondition: "Only for delayed recall."
      }
    ],
    permanentCandidates: [{ id: "pn_1" }, { id: "pn_2", savedPermanentNoteId: "pn_2" }]
  };

  assert.deepEqual(paperWorkspaceProgress(workspace), {
    candidates: 2,
    translations: 1,
    permanentCandidates: 2,
    savedPermanentNotes: 1
  });
  assert.equal(selectedPaperCandidate(workspace, "pwc_2").title, "Second");
  assert.equal(selectedPaperTranslation(workspace, "pwc_2").id, "ptr_1");
  assert.deepEqual(translationDraftForCandidate(workspace, "pwc_2"), {
    candidate: workspace.candidates[1],
    translation: workspace.translations[0],
    paraphraseText: "Second in my own words.",
    relationToQuestion: "Connects to the research question.",
    boundaryOrCondition: "Only for delayed recall.",
    hasSavedTranslation: true
  });
  assert.equal(workspaceStageLabel(workspace.stage), "永久笔记候选");
});

test("paper workspace labels expose user-facing workflow states", () => {
  assert.equal(candidateKindLabel("limitation"), "边界");
  assert.equal(candidateStatusLabel("translated"), "转述完成");
  assert.equal(candidateStatusLabel("saved"), "已保存");
});

test("canSubmitNotebookDraft requires both workspace and NotebookLM content", () => {
  assert.equal(canSubmitNotebookDraft({ summary: "Claim" }, null), false);
  assert.equal(canSubmitNotebookDraft({ summary: "" }, { paperId: "paper_1" }), false);
  assert.equal(canSubmitNotebookDraft({ summary: "Claim" }, { paperId: "paper_1" }), true);
});

test("canCreatePermanentCandidate waits for a saved translation for the selected candidate", () => {
  const workspace = {
    candidates: [
      { id: "pwc_1", title: "First" },
      { id: "pwc_2", title: "Second", paraphraseText: "Saved on candidate." }
    ],
    translations: [{ id: "ptr_1", candidateId: "pwc_2", paraphraseText: "Saved on candidate." }]
  };

  assert.equal(canCreatePermanentCandidate(workspace, "pwc_1"), false);
  assert.equal(canCreatePermanentCandidate(workspace, "pwc_2"), true);
});

test("canCreatePermanentCandidate stays blocked when only legacy candidate paraphrase exists", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "Legacy", paraphraseText: "Legacy text without saved translation." }],
    translations: []
  };

  assert.equal(translationDraftForCandidate(workspace, "pwc_1").hasSavedTranslation, false);
  assert.equal(canCreatePermanentCandidate(workspace, "pwc_1"), false);
});
