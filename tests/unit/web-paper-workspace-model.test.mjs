import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNotebookLmPayload,
  canSubmitNotebookDraft,
  candidateKindLabel,
  candidateStatusLabel,
  paperWorkspaceProgress,
  selectedPaperCandidate,
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

test("paper workspace model reports progress and selected candidates", () => {
  const workspace = {
    stage: "permanent_candidates",
    candidates: [
      { id: "pwc_1", title: "First" },
      { id: "pwc_2", title: "Second" }
    ],
    translations: [{ id: "ptr_1" }],
    permanentCandidates: [{ id: "pn_1" }, { id: "pn_2", savedPermanentNoteId: "pn_2" }]
  };

  assert.deepEqual(paperWorkspaceProgress(workspace), {
    candidates: 2,
    translations: 1,
    permanentCandidates: 2,
    savedPermanentNotes: 1
  });
  assert.equal(selectedPaperCandidate(workspace, "pwc_2").title, "Second");
  assert.equal(workspaceStageLabel(workspace.stage), "原创候选");
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
