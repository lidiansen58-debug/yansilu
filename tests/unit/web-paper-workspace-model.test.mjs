import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNotebookLmPayload,
  canCreatePermanentCandidate,
  canSavePermanentNote,
  canSubmitNotebookDraft,
  candidateKindLabel,
  candidateStatusLabel,
  emptyPaperWorkspaceForm,
  createInitialPaperWorkspaceState,
  draftBriefActionState,
  draftKickoffActionState,
  draftContinuationBrief,
  draftContinuationActionState,
  normalizeTranslationDraftInput,
  nextSelectedCandidateId,
  nextSelectedPermanentCandidateId,
  paperWorkspaceProgress,
  paperWorkspaceResumeStatusKey,
  paperWorkspaceLiveStatusKey,
  permanentCandidatePersistenceDefaults,
  permanentCandidateActionState,
  permanentNoteActionState,
  permanentNoteContinuityState,
  preferredPaperCandidateIdForWorkspaceResume,
  resolveSelectedPaperCandidateState,
  resolveSelectedPaperWorkspaceState,
  resolvedStoredTranslationDraft,
  resolvedConfirmAuthorshipForPermanentCandidate,
  resolvedSaveStatusForPermanentCandidate,
  resolvedTranslationSignatureForPermanentCandidate,
  selectedAlignedPermanentCandidate,
  selectedPaperCandidateIdForPermanentCandidate,
  selectedPaperCandidate,
  selectedPermanentCandidate,
  selectedPaperTranslation,
  translationSaveActionState,
  translationContinuitySignature,
  translationDraftHasLocalChanges,
  translationDraftForCandidate,
  translationDraftSupportsNextStep,
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
    draftKickoffText: "",
    draftKickoffSignature: "",
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
  assert.equal(preferredPaperCandidateIdForWorkspaceResume(workspace, "pn_1", "pwc_2"), "pwc_1");
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
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_2",
        paraphraseText: "Saved on candidate.",
        relationToQuestion: "Saved relation.",
        boundaryOrCondition: "Saved boundary."
      }
    ]
  };

  assert.equal(canCreatePermanentCandidate(workspace, "pwc_1"), false);
  assert.equal(canCreatePermanentCandidate(workspace, "pwc_2"), true);
});

test("canCreatePermanentCandidate waits for relation and boundary before the next step is ready", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "First" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording.",
        relationToQuestion: "",
        boundaryOrCondition: "Saved boundary."
      }
    ]
  };

  assert.equal(translationDraftSupportsNextStep(workspace, "pwc_1"), false);
  assert.equal(canCreatePermanentCandidate(workspace, "pwc_1"), false);
});

test("canCreatePermanentCandidate stays blocked while saved translation has unsaved local edits", () => {
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

  assert.equal(
    canCreatePermanentCandidate(workspace, "pwc_1", {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Updated relation.",
      boundaryOrCondition: "Saved boundary."
    }),
    false
  );
  assert.equal(
    canCreatePermanentCandidate(workspace, "pwc_1", {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Saved relation.",
      boundaryOrCondition: "Saved boundary."
    }),
    true
  );
});

test("draftContinuationActionState points draft flow at the next real action", () => {
  assert.deepEqual(
    draftContinuationActionState(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false,
        supportsNextStep: false
      },
      {
        selectedPermanentCandidateId: "",
        permanentNoteContinuityReason: "missing_permanent_candidate"
      }
    ),
    {
      tone: "warn",
      key: "fill_support",
      label: "relation 和 boundary 还不够支撑继续写 draft。先补全它们，再进入下一步。"
    }
  );

  assert.deepEqual(
    draftContinuationActionState(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false,
        supportsNextStep: true
      },
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "stale_translation_signature"
      }
    ),
    {
      tone: "warn",
      key: "refresh_permanent_candidate",
      label: "Step 4 仍对应旧版转述。先重新生成永久笔记候选，再继续写 draft。"
    }
  );

  assert.deepEqual(
    draftContinuationActionState(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false,
        supportsNextStep: true
      },
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "saved_permanent_note"
      }
    ),
    {
      tone: "ok",
      key: "review_saved_permanent_note",
      label: "这条路径已连到已保存的永久笔记。继续写 draft 前，先回看 originality / authorship。"
    }
  );
});

test("draftBriefActionState only unlocks when the draft path is ready to hand off", () => {
  assert.deepEqual(
    draftBriefActionState(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false,
        supportsNextStep: true
      },
      {
        selectedPermanentCandidateId: "",
        permanentNoteContinuityReason: "missing_permanent_candidate"
      }
    ),
    {
      enabled: true,
      label: "复制 draft brief"
    }
  );

  assert.deepEqual(
    draftBriefActionState(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false,
        supportsNextStep: true
      },
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "stale_translation_signature"
      }
    ),
    {
      enabled: false,
      label: "当前还不能复制 draft brief"
    }
  );
});

test("draftKickoffActionState reflects whether local draft work should start, resume, or stay blocked", () => {
  const candidateState = {
    selectedCandidateId: "pwc_1",
    hasSavedTranslation: true,
    hasLocalChanges: false,
    supportsNextStep: true
  };

  assert.deepEqual(
    draftKickoffActionState(
      candidateState,
      {
        selectedPermanentCandidateId: "",
        permanentNoteContinuityReason: "missing_permanent_candidate"
      },
      {
        hasContent: false,
        isStale: false
      }
    ),
    {
      enabled: true,
      key: "start_local_draft",
      label: "载入 brief，开始本地 draft"
    }
  );

  assert.deepEqual(
    draftKickoffActionState(
      candidateState,
      {
        selectedPermanentCandidateId: "",
        permanentNoteContinuityReason: "missing_permanent_candidate"
      },
      {
        hasContent: true,
        isStale: false
      }
    ),
    {
      enabled: true,
      key: "resume_local_draft",
      label: "继续本地 draft"
    }
  );

  assert.deepEqual(
    draftKickoffActionState(
      candidateState,
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "stale_translation_signature"
      },
      {
        hasContent: true,
        isStale: true
      }
    ),
    {
      enabled: false,
      key: "refresh_permanent_candidate",
      label: "先刷新 Step 4"
    }
  );
});

test("draftContinuationBrief summarizes the current draft handoff path", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "Candidate One", candidateKind: "claim" }],
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
        paper_candidate_id: "pwc_1",
        title: "Permanent One",
        savedPermanentNoteId: "note_1"
      }
    ]
  };
  const brief = draftContinuationBrief(workspace, null, "pwc_1", "pn_1");

  assert.equal(brief.title, "Candidate One");
  assert.match(brief.markdown, /# Draft brief: Candidate One/);
  assert.match(brief.markdown, /Step 4: 已保存永久笔记路径 \(Permanent One\)/);
  assert.match(brief.markdown, /Saved permanent note: note_1/);
  assert.match(brief.markdown, /Next action: .*回看 originality \/ authorship/);
  assert.match(brief.markdown, /## Paraphrase/);
  assert.match(brief.markdown, /My own wording\./);
  assert.match(brief.preview, /Relation: This matters for the writing question\./);
  assert.match(brief.preview, /Saved note: note_1/);
  assert.match(brief.preview, /Next: .*回看 originality \/ authorship/);
});

test("canSavePermanentNote stays blocked while aligned translation has unsaved local edits", () => {
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
    ],
    permanentCandidates: [{ id: "pn_1", paper_candidate_id: "pwc_1", title: "Permanent One" }]
  };
  const storedSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: translationContinuitySignature(workspace, "pwc_1")
    }
  };

  assert.equal(
    canSavePermanentNote(workspace, storedSelection, "pn_1", "pwc_1", {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Updated relation.",
      boundaryOrCondition: "Saved boundary."
    }),
    false
  );
  assert.equal(
    canSavePermanentNote(workspace, storedSelection, "pn_1", "pwc_1", {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Saved relation.",
      boundaryOrCondition: "Saved boundary."
    }),
    true
  );
});

test("canSavePermanentNote stays blocked when the saved translation has moved past the stored permanent-candidate signature", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "First" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording v2.",
        relationToQuestion: "Saved relation v2.",
        boundaryOrCondition: "Saved boundary v2."
      }
    ],
    permanentCandidates: [{ id: "pn_1", paper_candidate_id: "pwc_1", title: "Permanent One" }]
  };
  const storedSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: JSON.stringify({
        candidateId: "pwc_1",
        translationId: "ptr_1",
        paraphraseText: "Saved wording v1.",
        relationToQuestion: "Saved relation v1.",
        boundaryOrCondition: "Saved boundary v1."
      })
    }
  };

  assert.equal(resolvedTranslationSignatureForPermanentCandidate(storedSelection, "pn_1").includes("v1"), true);
  assert.equal(canSavePermanentNote(workspace, storedSelection, "pn_1", "pwc_1"), false);
});

test("permanentNoteContinuityState prioritizes stale saved translations before a saved permanent-note path", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "First" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording v2.",
        relationToQuestion: "Saved relation v2.",
        boundaryOrCondition: "Saved boundary v2."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        paper_candidate_id: "pwc_1",
        title: "Permanent One",
        savedPermanentNoteId: "note_1"
      }
    ]
  };
  const storedSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: JSON.stringify({
        candidateId: "pwc_1",
        translationId: "ptr_1",
        paraphraseText: "Saved wording v1.",
        relationToQuestion: "Saved relation v1.",
        boundaryOrCondition: "Saved boundary v1."
      })
    }
  };

  assert.equal(
    permanentNoteContinuityState(workspace, storedSelection, "pn_1", "pwc_1").reason,
    "stale_translation_signature"
  );
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

test("translationSaveActionState reflects whether the current translation still needs saving", () => {
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

  assert.deepEqual(translationSaveActionState(workspace, ""), {
    enabled: false,
    label: "已保存转述"
  });
  assert.deepEqual(translationSaveActionState(workspace, "pwc_1"), {
    enabled: false,
    label: "已保存转述"
  });
  assert.deepEqual(
    translationSaveActionState(workspace, "pwc_1", {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Updated relation.",
      boundaryOrCondition: "Saved boundary."
    }),
    {
      enabled: true,
      label: "更新转述"
    }
  );
});

test("permanentCandidateActionState reflects the current translation prerequisite", () => {
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
    ],
    permanentCandidates: []
  };

  assert.deepEqual(permanentCandidateActionState(workspace, null, "missing"), {
    enabled: true,
    label: "生成永久笔记候选"
  });
  assert.deepEqual(
    permanentCandidateActionState(
      {
        ...workspace,
        translations: []
      },
      null,
      "pwc_1",
      "",
      {
        paraphraseText: "Unsaved wording.",
        relationToQuestion: "",
        boundaryOrCondition: ""
      }
    ),
    {
      enabled: false,
      label: "先保存转述"
    }
  );
  assert.deepEqual(
    permanentCandidateActionState(workspace, null, "pwc_1", "", {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Updated relation.",
      boundaryOrCondition: "Saved boundary."
    }),
    {
      enabled: false,
      label: "先更新转述"
    }
  );
});

test("permanentNoteActionState reflects default, stale, and saved paths", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "First" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording v2.",
        relationToQuestion: "Saved relation v2.",
        boundaryOrCondition: "Saved boundary v2."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        paper_candidate_id: "pwc_1",
        title: "Permanent One",
        savedPermanentNoteId: "note_1"
      }
    ]
  };
  const staleSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: JSON.stringify({
        candidateId: "pwc_1",
        translationId: "ptr_1",
        paraphraseText: "Saved wording v1.",
        relationToQuestion: "Saved relation v1.",
        boundaryOrCondition: "Saved boundary v1."
      })
    }
  };

  assert.deepEqual(permanentNoteActionState(workspace, null, "", ""), {
    enabled: false,
    label: "确认保存为永久笔记"
  });
  assert.deepEqual(permanentNoteActionState(workspace, staleSelection, "pn_1", "pwc_1"), {
    enabled: false,
    label: "先重新生成永久笔记候选"
  });
  assert.deepEqual(permanentNoteActionState(workspace, null, "pn_1", "pwc_1"), {
    enabled: false,
    label: "已保存为永久笔记"
  });
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
      hasLocalChanges: true,
      supportsNextStep: true
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
      hasLocalChanges: false,
      supportsNextStep: true
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
      confirmAuthorship: true,
      permanentNoteContinuityReason: "ok"
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
      confirmAuthorship: false,
      permanentNoteContinuityReason: "missing_permanent_candidate"
    }
  );
  assert.equal(selectedAlignedPermanentCandidate(workspace, ""), null);
  assert.equal(resolvedSaveStatusForPermanentCandidate(storedSelection, ""), "active");
});

test("resolveSelectedPaperWorkspaceState marks an aligned permanent candidate as stale when its stored translation signature no longer matches", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "First" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording v2.",
        relationToQuestion: "Saved relation v2.",
        boundaryOrCondition: "Saved boundary v2."
      }
    ],
    permanentCandidates: [{ id: "pn_1", paper_candidate_id: "pwc_1", title: "Permanent One" }]
  };
  const storedSelection = {
    selectedCandidateId: "pwc_1",
    selectedPermanentCandidateId: "pn_1",
    translationSignatureByPermanentCandidate: {
      pn_1: JSON.stringify({
        candidateId: "pwc_1",
        translationId: "ptr_1",
        paraphraseText: "Saved wording v1.",
        relationToQuestion: "Saved relation v1.",
        boundaryOrCondition: "Saved boundary v1."
      })
    }
  };

  assert.equal(
    resolveSelectedPaperWorkspaceState(workspace, storedSelection, {
      preferredCandidateId: "pwc_1",
      preferredPermanentCandidateId: "pn_1"
    }).permanentNoteContinuityReason,
    "stale_translation_signature"
  );
});

test("paperWorkspaceResumeStatusKey prefers the most actionable continuity state", () => {
  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: true
      },
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "saved_permanent_note"
      }
    ),
    "restoredLocalTranslationDraftForSavedPermanentNote"
  );

  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: true
      },
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "ready"
      }
    ),
    "restoredLocalTranslationDraftForPermanentNote"
  );

  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: true
      },
      {
        selectedPermanentCandidateId: "pn_1"
      }
    ),
    "restoredLocalTranslationDraftForPermanentNote"
  );

  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false
      },
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "stale_translation_signature"
      }
    ),
    "translationNeedsFreshPermanentCandidate"
  );

  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false
      },
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "saved_permanent_note"
      }
    ),
    "restoredSavedPermanentNoteForSelectedPaper"
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
        hasSavedTranslation: true,
        hasLocalChanges: false,
        supportsNextStep: false
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "savedTranslationNeedsDraftSupport"
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

test("paperWorkspaceLiveStatusKey prefers the next required action while editing", () => {
  assert.equal(
    paperWorkspaceLiveStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: false,
        hasLocalChanges: true
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "translationNeedsSaveBeforePermanentCandidate"
  );

  assert.equal(
    paperWorkspaceLiveStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: true
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "translationNeedsResaveBeforePermanentCandidate"
  );

  assert.equal(
    paperWorkspaceLiveStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: true
      },
      {
        selectedPermanentCandidateId: "pn_1"
      }
    ),
    "translationNeedsResaveBeforePermanentNote"
  );

  assert.equal(
    paperWorkspaceLiveStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false
      },
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "stale_translation_signature"
      }
    ),
    "translationNeedsFreshPermanentCandidate"
  );

  assert.equal(
    paperWorkspaceLiveStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false
      },
      {
        selectedPermanentCandidateId: "pn_1",
        permanentNoteContinuityReason: "saved_permanent_note"
      }
    ),
    "restoredSavedPermanentNoteForSelectedPaper"
  );

  assert.equal(
    paperWorkspaceLiveStatusKey(
      {
        selectedCandidateId: "pwc_1",
        hasSavedTranslation: true,
        hasLocalChanges: false,
        supportsNextStep: false
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "savedTranslationNeedsDraftSupport"
  );
});

test("workspaceStageLabel falls back to a not-started label", () => {
  assert.equal(workspaceStageLabel(""), "尚未开始");
  assert.equal(workspaceStageLabel("mystery"), "mystery");
});
