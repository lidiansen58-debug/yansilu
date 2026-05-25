import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNotebookLmPayload,
  canCreatePermanentCandidate,
  canSubmitNotebookDraft,
  candidateKindLabel,
  candidateStatusLabel,
  emptyPaperWorkspaceForm,
  createInitialPaperWorkspaceState,
  normalizeTranslationDraftInput,
  nextSelectedCandidateId,
  nextSelectedPermanentCandidateId,
  paperWorkspaceProgress,
  paperWorkspaceResumeStatusKey,
  permanentCandidatePersistenceDefaults,
  resolveSelectedPaperCandidateState,
  resolveSelectedPaperWorkspaceState,
  resolvedStoredTranslationDraft,
  resolvedConfirmAuthorshipForPermanentCandidate,
  resolvedSaveStatusForPermanentCandidate,
  selectedAlignedPermanentCandidate,
  selectedPaperCandidateIdForPermanentCandidate,
  selectedPaperCandidate,
  selectedPermanentCandidate,
  selectedPaperTranslation,
  translationDraftHasLocalChanges,
  translationDraftForCandidate,
  workspaceStageLabel
} from "../../apps/web/src/paper-workspace-model.js";

test("createInitialPaperWorkspaceState starts with a ready status", () => {
  const state = createInitialPaperWorkspaceState();
  assert.equal(state.statusText, "准备就绪");
});

test("emptyPaperWorkspaceForm provides the expected workflow defaults", () => {
  assert.deepEqual(emptyPaperWorkspaceForm(), {
    paperId: "",
    sourceId: "",
    title: "",
    notebookName: "NotebookLM",
    summary: "",
    qa: "",
    studyGuide: "",
    notes: "",
    paraphraseText: "",
    relationToQuestion: "",
    boundaryOrCondition: "",
    confirmAuthorship: false,
    saveStatus: "active"
  });
});

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
  assert.equal(selectedPermanentCandidate(workspace, "pn_2").savedPermanentNoteId, "pn_2");
  assert.equal(selectedPaperTranslation(workspace, "pwc_2").id, "ptr_1");
  assert.deepEqual(translationDraftForCandidate(workspace, "pwc_2"), {
    candidate: workspace.candidates[1],
    translation: workspace.translations[0],
    paraphraseText: "Second in my own words.",
    relationToQuestion: "Connects to the research question.",
    boundaryOrCondition: "Only for delayed recall.",
    hasSavedTranslation: true,
    hasLocalChanges: false
  });
  assert.equal(workspaceStageLabel(workspace.stage), "永久笔记候选");
});

test("paper workspace selection helpers resolve alias ids", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", externalCandidateId: "ext_1", title: "First" }],
    permanentCandidates: [{ id: "pn_1", paper_candidate_id: "pwc_1", title: "Permanent One" }]
  };

  assert.equal(selectedPaperCandidate(workspace, "ext_1").id, "pwc_1");
  assert.equal(selectedPermanentCandidate(workspace, "pwc_1").id, "pn_1");
  assert.equal(selectedAlignedPermanentCandidate(workspace, "pwc_1").id, "pn_1");
  assert.equal(selectedPaperCandidateIdForPermanentCandidate(workspace, "pn_1"), "pwc_1");
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

test("translationDraftForCandidate lets unsaved draft input override saved translation fields", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "First" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording.",
        relationToQuestion: "Saved relation.",
        boundaryOrCondition: "Saved boundary."
      }
    ]
  };

  assert.deepEqual(
    translationDraftForCandidate(workspace, "pwc_1", {
      paraphraseText: "Unsaved wording.",
      relationToQuestion: "",
      boundaryOrCondition: "Unsaved boundary."
    }),
    {
      candidate: workspace.candidates[0],
      translation: workspace.translations[0],
      paraphraseText: "Unsaved wording.",
      relationToQuestion: "",
      boundaryOrCondition: "Unsaved boundary.",
      hasSavedTranslation: true,
      hasLocalChanges: true
    }
  );
});

test("translationDraftHasLocalChanges only stores unsaved translation deltas", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "First" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording.",
        relationToQuestion: "Saved relation.",
        boundaryOrCondition: "Saved boundary."
      }
    ]
  };

  assert.deepEqual(
    normalizeTranslationDraftInput({
      paraphraseText: " Draft wording ",
      relationToQuestion: " Relation ",
      boundaryOrCondition: " Boundary "
    }),
    {
      paraphraseText: "Draft wording",
      relationToQuestion: "Relation",
      boundaryOrCondition: "Boundary"
    }
  );
  assert.equal(
    translationDraftHasLocalChanges(workspace, "pwc_1", {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Saved relation.",
      boundaryOrCondition: "Saved boundary."
    }),
    false
  );
  assert.equal(
    translationDraftHasLocalChanges(workspace, "pwc_1", {
      paraphraseText: "",
      relationToQuestion: "",
      boundaryOrCondition: ""
    }),
    true
  );
});

test("resolvedStoredTranslationDraft normalizes recovered translation draft input", () => {
  assert.deepEqual(
    resolvedStoredTranslationDraft({
      paraphraseText: " Draft wording ",
      relationToQuestion: " Relation ",
      boundaryOrCondition: " Boundary "
    }),
    {
      paraphraseText: "Draft wording",
      relationToQuestion: "Relation",
      boundaryOrCondition: "Boundary"
    }
  );
});

test("resolveSelectedPaperCandidateState restores candidate selection and candidate-scoped draft together", () => {
  const workspace = {
    candidates: [
      { id: "pwc_1", title: "First" },
      { id: "pwc_2", title: "Second" }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording one.",
        relationToQuestion: "Saved relation one.",
        boundaryOrCondition: "Saved boundary one."
      }
    ]
  };

  assert.deepEqual(
    resolveSelectedPaperCandidateState(workspace, {
      preferredCandidateId: "pwc_missing",
      candidateIdHasLocalDraft: (candidateId) => candidateId === "pwc_2",
      readStoredTranslationDraft: (candidateId) =>
        candidateId === "pwc_2"
          ? {
              paraphraseText: " Unsaved wording two. ",
              relationToQuestion: " Unsaved relation two. ",
              boundaryOrCondition: " Unsaved boundary two. "
            }
          : null
    }),
    {
      selectedCandidateId: "pwc_2",
      paraphraseText: "Unsaved wording two.",
      relationToQuestion: "Unsaved relation two.",
      boundaryOrCondition: "Unsaved boundary two.",
      hasSavedTranslation: false,
      hasLocalChanges: true
    }
  );
});

test("resolveSelectedPaperCandidateState keeps saved translation when no local draft exists for the selected candidate", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "First" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording one.",
        relationToQuestion: "Saved relation one.",
        boundaryOrCondition: "Saved boundary one."
      }
    ]
  };

  assert.deepEqual(
    resolveSelectedPaperCandidateState(workspace, {
      preferredCandidateId: "pwc_1",
      readStoredTranslationDraft: () => null
    }),
    {
      selectedCandidateId: "pwc_1",
      paraphraseText: "Saved wording one.",
      relationToQuestion: "Saved relation one.",
      boundaryOrCondition: "Saved boundary one.",
      hasSavedTranslation: true,
      hasLocalChanges: false
    }
  );
});

test("nextSelectedCandidateId prefers a candidate with local draft when no current selection exists", () => {
  const workspace = {
    candidates: [
      { id: "pwc_1", title: "First" },
      { id: "pwc_2", title: "Second" }
    ]
  };

  assert.equal(
    nextSelectedCandidateId(workspace, "", {
      candidateIdHasLocalDraft: (candidateId) => candidateId === "pwc_2"
    }),
    "pwc_2"
  );
  assert.equal(
    nextSelectedCandidateId(workspace, "pwc_1", {
      candidateIdHasLocalDraft: (candidateId) => candidateId === "pwc_2"
    }),
    "pwc_1"
  );
});

test("nextSelectedCandidateId falls back to local draft when stored selection is stale", () => {
  const workspace = {
    candidates: [
      { id: "pwc_1", title: "First" },
      { id: "pwc_2", title: "Second" }
    ]
  };

  assert.equal(
    nextSelectedCandidateId(workspace, "pwc_missing", {
      candidateIdHasLocalDraft: (candidateId) => candidateId === "pwc_2"
    }),
    "pwc_2"
  );
  assert.equal(
    nextSelectedCandidateId(workspace, "pwc_missing", {
      candidateIdHasLocalDraft: () => false
    }),
    "pwc_1"
  );
});

test("nextSelectedPermanentCandidateId falls back to first permanent candidate when stored selection is stale", () => {
  const workspace = {
    permanentCandidates: [
      { id: "pn_1", title: "First permanent" },
      { id: "pn_2", title: "Second permanent" }
    ]
  };

  assert.equal(nextSelectedPermanentCandidateId(workspace, "pn_2"), "pn_2");
  assert.equal(nextSelectedPermanentCandidateId(workspace, "pn_missing"), "pn_1");
});

test("nextSelectedPermanentCandidateId can stay empty until the selected paper candidate has its own permanent candidate", () => {
  const workspace = {
    permanentCandidates: [
      { id: "pn_1", paper_candidate_id: "pwc_1", title: "First permanent" },
      { id: "pn_2", paper_candidate_id: "pwc_2", title: "Second permanent" }
    ]
  };

  assert.equal(
    nextSelectedPermanentCandidateId(workspace, "", {
      selectedPaperCandidateId: "pwc_2",
      fallbackToFirst: false
    }),
    "pn_2"
  );
  assert.equal(
    nextSelectedPermanentCandidateId(workspace, "", {
      selectedPaperCandidateId: "pwc_3",
      fallbackToFirst: false
    }),
    ""
  );
});

test("nextSelectedPermanentCandidateId ignores a stale preferred permanent candidate when switching to a different paper candidate", () => {
  const workspace = {
    permanentCandidates: [
      { id: "pn_1", paper_candidate_id: "pwc_1", title: "First permanent" }
    ]
  };

  assert.equal(
    nextSelectedPermanentCandidateId(workspace, "pn_1", {
      selectedPaperCandidateId: "pwc_2",
      fallbackToFirst: false
    }),
    ""
  );
});

test("permanentCandidatePersistenceDefaults prefers candidate-backed save status and authorship", () => {
  assert.deepEqual(
    permanentCandidatePersistenceDefaults(
      {
        status: "draft",
        authorship: { user_confirmed: true }
      },
      {
        saveStatus: "active",
        confirmAuthorship: false
      }
    ),
    {
      saveStatus: "draft",
      confirmAuthorship: true
    }
  );

  assert.deepEqual(
    permanentCandidatePersistenceDefaults(
      {
        status: "",
        savedPermanentNoteId: "pn_1"
      },
      {
        saveStatus: "active",
        confirmAuthorship: false
      }
    ),
    {
      saveStatus: "active",
      confirmAuthorship: true
    }
  );
});

test("resolved permanent candidate persistence prefers candidate-specific stored values before legacy fallbacks", () => {
  const storedSelection = {
    saveStatus: "active",
    saveStatusByPermanentCandidate: {
      pn_2: "draft"
    },
    confirmAuthorshipByPermanentCandidate: {
      pn_2: true
    }
  };

  assert.equal(resolvedSaveStatusForPermanentCandidate(storedSelection, "pn_2"), "draft");
  assert.equal(resolvedSaveStatusForPermanentCandidate(storedSelection, "pn_missing"), "active");
  assert.equal(
    resolvedConfirmAuthorshipForPermanentCandidate(storedSelection, {
      id: "pn_2",
      authorship: { user_confirmed: false }
    }),
    true
  );
});

test("resolveSelectedPaperWorkspaceState restores aligned paper and permanent selections together", () => {
  const workspace = {
    candidates: [
      { id: "pwc_1", title: "First" },
      { id: "pwc_2", title: "Second" }
    ],
    permanentCandidates: [
      { id: "pn_1", paper_candidate_id: "pwc_1", status: "active", authorship: { user_confirmed: false } },
      { id: "pn_2", paper_candidate_id: "pwc_2", status: "draft", authorship: { user_confirmed: false } }
    ]
  };
  const storedSelection = {
    selectedCandidateId: "pwc_missing",
    selectedPermanentCandidateId: "pn_missing",
    saveStatus: "active",
    saveStatusByPermanentCandidate: { pn_2: "draft" },
    confirmAuthorshipByPermanentCandidate: { pn_2: true }
  };

  assert.deepEqual(
    resolveSelectedPaperWorkspaceState(workspace, storedSelection, {
      preferredCandidateId: storedSelection.selectedCandidateId,
      preferredPermanentCandidateId: storedSelection.selectedPermanentCandidateId,
      candidateIdHasLocalDraft: (candidateId) => candidateId === "pwc_2"
    }),
    {
      selectedCandidateId: "pwc_2",
      selectedPermanentCandidateId: "pn_2",
      saveStatus: "draft",
      confirmAuthorship: true
    }
  );
});

test("resolveSelectedPaperWorkspaceState keeps step 4 empty when the selected paper candidate has no aligned permanent candidate", () => {
  const workspace = {
    candidates: [
      { id: "pwc_1", title: "First" },
      { id: "pwc_2", title: "Second" }
    ],
    permanentCandidates: [
      { id: "pn_1", paper_candidate_id: "pwc_1", status: "draft", authorship: { user_confirmed: false } }
    ]
  };
  const storedSelection = {
    selectedCandidateId: "pwc_2",
    selectedPermanentCandidateId: "",
    saveStatus: "draft",
    saveStatusByPermanentCandidate: { pn_1: "draft" },
    confirmAuthorshipByPermanentCandidate: { pn_1: true }
  };

  assert.deepEqual(
    resolveSelectedPaperWorkspaceState(workspace, storedSelection, {
      preferredCandidateId: "pwc_2",
      preferredPermanentCandidateId: "",
      candidateIdHasLocalDraft: () => false
    }),
    {
      selectedCandidateId: "pwc_2",
      selectedPermanentCandidateId: "",
      saveStatus: "active",
      confirmAuthorship: false
    }
  );
  assert.equal(selectedAlignedPermanentCandidate(workspace, ""), null);
  assert.equal(resolvedSaveStatusForPermanentCandidate(storedSelection, ""), "active");
});

test("paperWorkspaceResumeStatusKey prefers the most actionable continuity state", () => {
  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: false,
        hasLocalChanges: false
      },
      {
        selectedPermanentCandidateId: "pn_1"
      }
    ),
    "restoredPermanentCandidateForSelectedPaper"
  );

  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: true
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "restoredLocalTranslationDraftOverSavedTranslation"
  );

  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: false,
        hasLocalChanges: true
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "restoredLocalTranslationDraft"
  );

  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "savedTranslationReadyForPermanentCandidate"
  );

  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: false,
        hasLocalChanges: false
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "selectedCandidate"
  );

  assert.equal(paperWorkspaceResumeStatusKey(null, null), "loadedWorkspace");
});

test("workspaceStageLabel falls back to a not-started label", () => {
  assert.equal(workspaceStageLabel(""), "尚未开始");
  assert.equal(workspaceStageLabel("mystery"), "mystery");
});
