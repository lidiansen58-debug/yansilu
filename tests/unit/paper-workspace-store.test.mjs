import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  addNotebookLmDraft,
  createPaperPermanentCandidate,
  createPaperWorkspace,
  getPaperWorkspace,
  paperWorkspacePath,
  savePaperPermanentNote,
  savePaperTranslation,
  updatePaperCandidateStatus
} from "../../packages/paper-workspace/src/index.mjs";

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-paper-workspace-"));
}

test("createPaperWorkspace writes and restores a paper workspace JSON file", async () => {
  const vaultPath = await makeTempVault();
  const workspace = await createPaperWorkspace(vaultPath, {
    paperId: "paper_retrieval_practice",
    sourceId: "src_paper",
    title: "Retrieval Practice"
  });

  assert.equal(workspace.paperId, "paper_retrieval_practice");
  assert.equal(workspace.sourceId, "src_paper");
  assert.equal(workspace.stage, "candidates");
  assert.deepEqual(workspace.candidates, []);

  const raw = await fs.readFile(paperWorkspacePath(vaultPath, workspace.paperId), "utf8");
  assert.equal(JSON.parse(raw).title, "Retrieval Practice");

  const restored = await getPaperWorkspace(vaultPath, workspace.paperId);
  assert.equal(restored.title, "Retrieval Practice");
  assert.deepEqual(restored.translations, []);
});

test("addNotebookLmDraft stores NotebookLM literature candidates without permanent candidates", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, {
    paperId: "paper_notebooklm",
    title: "NotebookLM assisted paper"
  });

  const result = await addNotebookLmDraft(vaultPath, "paper_notebooklm", {
    draftId: "nbd_test",
    notebookName: "Paper Notebook",
    summary: "Claim: retrieval improves later recall.\n\nLimitation: the sample was small.",
    qa: [
      {
        id: "qa_1",
        question: "What was the method?",
        answer: "Method: compare rereading and retrieval groups."
      }
    ]
  });

  assert.equal(result.draftId, "nbd_test");
  assert.equal(result.candidates.length, 3);
  assert.equal(result.workspace.permanentCandidates.length, 0);
  assert.deepEqual(result.workspace.candidates.map((item) => item.notebookInputType), ["summary", "summary", "qa"]);
  assert.deepEqual(result.workspace.candidates.map((item) => item.candidateKind), ["claim", "limitation", "question"]);
  assert.ok(result.workspace.candidates.every((item) => item.status === "new"));
  assert.ok(result.workspace.notebookLmDrafts[0].candidateIds.length === 3);
});

test("updatePaperCandidateStatus updates a candidate and persists the change", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, { paperId: "paper_status" });
  const draft = await addNotebookLmDraft(vaultPath, "paper_status", {
    notes: [{ id: "note_1", title: "Notebook note", content: "A draft literature candidate." }]
  });
  const candidateId = draft.candidates[0].id;

  const result = await updatePaperCandidateStatus(vaultPath, "paper_status", {
    candidateId,
    status: "selected"
  });

  assert.equal(result.candidate.status, "selected");
  const restored = await getPaperWorkspace(vaultPath, "paper_status");
  assert.equal(restored.candidates[0].status, "selected");
});

test("savePaperTranslation requires user paraphrase text", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, { paperId: "paper_empty_translation" });
  const draft = await addNotebookLmDraft(vaultPath, "paper_empty_translation", {
    notes: [{ id: "note_1", title: "Notebook note", content: "NotebookLM wording." }]
  });

  await assert.rejects(
    () =>
      savePaperTranslation(vaultPath, "paper_empty_translation", {
        candidateId: draft.candidates[0].id,
        paraphraseText: ""
      }),
    { code: "PAPER_TRANSLATION_PARAPHRASE_REQUIRED" }
  );
});

test("savePaperTranslation records user paraphrase and marks the candidate translated", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, { paperId: "paper_translation" });
  const draft = await addNotebookLmDraft(vaultPath, "paper_translation", {
    notes: [{ id: "note_1", title: "Notebook note", content: "NotebookLM wording." }]
  });
  const candidateId = draft.candidates[0].id;

  const result = await savePaperTranslation(vaultPath, "paper_translation", {
    candidateId,
    paraphraseText: "I read this as evidence that recall effort changes later access.",
    relationToQuestion: "Supports the reading-to-note conversion workflow.",
    boundaryOrCondition: "Only tested on a narrow task."
  });

  assert.equal(result.translation.candidateId, candidateId);
  assert.equal(result.translation.status, "ready");
  assert.equal(result.candidate.status, "translated");
  assert.equal(result.workspace.stage, "translations");

  const restored = await getPaperWorkspace(vaultPath, "paper_translation");
  assert.equal(restored.translations.length, 1);
  assert.equal(restored.candidates[0].paraphraseText, "I read this as evidence that recall effort changes later access.");
});

test("createPaperPermanentCandidate requires a saved translation", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, { paperId: "paper_candidate_without_translation" });
  const draft = await addNotebookLmDraft(vaultPath, "paper_candidate_without_translation", {
    notes: [{ id: "note_1", title: "Notebook note", content: "NotebookLM wording.", locator: "p. 1" }]
  });

  await assert.rejects(
    () =>
      createPaperPermanentCandidate(vaultPath, "paper_candidate_without_translation", {
        candidateId: draft.candidates[0].id
      }),
    { code: "PAPER_PERMANENT_CANDIDATE_PARAPHRASE_REQUIRED" }
  );
});

test("createPaperPermanentCandidate stores a guarded permanent note candidate", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, { paperId: "paper_permanent_candidate" });
  const draft = await addNotebookLmDraft(vaultPath, "paper_permanent_candidate", {
    notes: [
      {
        id: "note_1",
        title: "Notebook note",
        content: "The paper says retrieval practice improved delayed recall.",
        locator: "p. 12"
      }
    ]
  });
  const candidateId = draft.candidates[0].id;
  await savePaperTranslation(vaultPath, "paper_permanent_candidate", {
    candidateId,
    paraphraseText: "My takeaway is that effortful recall can make an idea easier to access later.",
    relationToQuestion: "Supports the reading-to-original-note workflow.",
    boundaryOrCondition: "This may depend on the study task."
  });

  const result = await createPaperPermanentCandidate(vaultPath, "paper_permanent_candidate", {
    candidateId
  });

  assert.match(result.permanentCandidate.id, /^pn_/);
  assert.equal(result.permanentCandidate.authorship.user_confirmed, false);
  assert.equal(result.permanentCandidate.originality_status, "pass");
  assert.deepEqual(result.permanentCandidate.from_literature_note_ids, [draft.candidates[0].externalCandidateId]);
  assert.equal(result.originalityGuard.evaluations[0].status, "pass");
  assert.equal(result.workspace.stage, "permanent_candidates");
  assert.equal(result.workspace.permanentCandidates.length, 1);
  assert.equal(result.workspace.candidates[0].status, "converted");

  const restored = await getPaperWorkspace(vaultPath, "paper_permanent_candidate");
  assert.equal(restored.permanentCandidates[0].id, result.permanentCandidate.id);
  assert.equal(restored.candidates[0].status, "converted");
});

test("savePaperPermanentNote requires explicit authorship confirmation", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, { paperId: "paper_save_requires_authorship" });
  const draft = await addNotebookLmDraft(vaultPath, "paper_save_requires_authorship", {
    notes: [{ id: "note_1", title: "Notebook note", content: "NotebookLM wording.", locator: "p. 1" }]
  });
  await savePaperTranslation(vaultPath, "paper_save_requires_authorship", {
    candidateId: draft.candidates[0].id,
    paraphraseText: "My own claim about the paper.",
    relationToQuestion: "It matters to my research question."
  });
  const candidate = await createPaperPermanentCandidate(vaultPath, "paper_save_requires_authorship", {
    candidateId: draft.candidates[0].id
  });

  await assert.rejects(
    () =>
      savePaperPermanentNote(vaultPath, "paper_save_requires_authorship", {
        permanentCandidateId: candidate.permanentCandidate.id
      }),
    { code: "PAPER_PERMANENT_NOTE_AUTHORSHIP_REQUIRED" }
  );
});

test("savePaperPermanentNote writes a confirmed permanent note and updates workspace state", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, { paperId: "paper_save_permanent" });
  const draft = await addNotebookLmDraft(vaultPath, "paper_save_permanent", {
    notes: [
      {
        id: "note_1",
        title: "Notebook note",
        content: "The paper says retrieval practice improved delayed recall.",
        locator: "p. 12"
      }
    ]
  });
  await savePaperTranslation(vaultPath, "paper_save_permanent", {
    candidateId: draft.candidates[0].id,
    paraphraseText: "My takeaway is that effortful recall can make an idea easier to access later.",
    relationToQuestion: "Supports the reading-to-original-note workflow.",
    boundaryOrCondition: "This may depend on the study task."
  });
  const candidate = await createPaperPermanentCandidate(vaultPath, "paper_save_permanent", {
    candidateId: draft.candidates[0].id
  });

  const saved = await savePaperPermanentNote(vaultPath, "paper_save_permanent", {
    permanentCandidateId: candidate.permanentCandidate.id,
    confirmAuthorship: true,
    status: "active"
  });

  assert.equal(saved.writeResult.written, true);
  assert.equal(saved.permanentNote.authorship.user_confirmed, true);
  assert.equal(saved.permanentNote.status, "active");
  assert.equal(saved.workspace.stage, "saved");
  assert.equal(saved.workspace.candidates[0].status, "saved");
  assert.equal(saved.workspace.permanentCandidates[0].savedPermanentNoteId, saved.permanentNote.id);

  const markdown = await fs.readFile(path.join(vaultPath, "notes", "permanent", `${saved.permanentNote.id}.md`), "utf8");
  assert.match(markdown, /authorship: \{"user_confirmed":true,"ai_assisted":false\}/);
  assert.match(markdown, /originality_status: pass/);
});

test("savePaperPermanentNote keeps warning candidates as drafts", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, { paperId: "paper_warning_save" });
  const draft = await addNotebookLmDraft(vaultPath, "paper_warning_save", {
    notes: [{ id: "note_1", title: "Notebook note", content: "NotebookLM wording without locator." }]
  });
  await savePaperTranslation(vaultPath, "paper_warning_save", {
    candidateId: draft.candidates[0].id,
    paraphraseText: "My own claim about this paper."
  });
  const candidate = await createPaperPermanentCandidate(vaultPath, "paper_warning_save", {
    candidateId: draft.candidates[0].id
  });

  assert.equal(candidate.permanentCandidate.originality_status, "warning");
  const saved = await savePaperPermanentNote(vaultPath, "paper_warning_save", {
    permanentCandidateId: candidate.permanentCandidate.id,
    confirmAuthorship: true,
    status: "active"
  });

  assert.equal(saved.permanentNote.status, "draft");
});

test("savePaperPermanentNote blocks originality-blocked candidates", async () => {
  const vaultPath = await makeTempVault();
  await createPaperWorkspace(vaultPath, { paperId: "paper_blocked_save" });
  const draft = await addNotebookLmDraft(vaultPath, "paper_blocked_save", {
    notes: [
      {
        id: "note_1",
        title: "Notebook note",
        content: "A copied claim should remain source material.",
        locator: "p. 3"
      }
    ]
  });
  await savePaperTranslation(vaultPath, "paper_blocked_save", {
    candidateId: draft.candidates[0].id,
    paraphraseText: "A copied claim should remain source material."
  });
  const candidate = await createPaperPermanentCandidate(vaultPath, "paper_blocked_save", {
    candidateId: draft.candidates[0].id
  });

  assert.equal(candidate.permanentCandidate.originality_status, "blocked");
  await assert.rejects(
    () =>
      savePaperPermanentNote(vaultPath, "paper_blocked_save", {
        permanentCandidateId: candidate.permanentCandidate.id,
        confirmAuthorship: true
      }),
    { code: "PAPER_PERMANENT_NOTE_ORIGINALITY_BLOCKED" }
  );
});
