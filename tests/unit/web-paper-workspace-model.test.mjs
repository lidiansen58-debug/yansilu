import test from "node:test";
import assert from "node:assert/strict";

import {
  blockedDraftContinuationStatusFeedback,
  buildNotebookLmPayload,
  blockedDraftContinuationStatusMessage,
  canCreatePermanentCandidate,
  canSavePermanentNote,
  canSubmitNotebookDraft,
  candidateKindLabel,
  candidateStatusLabel,
  chainedPaperWorkspaceStatusFeedback,
  continuityStatusTone,
  draftBriefButtonLabel,
  draftBriefCopyStatusFeedback,
  draftBriefCopyStatusMessage,
  draftKickoffStatusFeedback,
  draftKickoffStatusMessage,
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
  paperWorkspaceStatusFeedback,
  permanentCandidateStatusFeedback,
  permanentCandidatePersistenceDefaults,
  permanentCandidateActionState,
  permanentNoteStatusFeedback,
  permanentNoteActionState,
  permanentNoteContinuityState,
  preferredPaperCandidateIdForWorkspaceResume,
  resolveAdoptedDraftKickoff,
  resolveDraftBriefState,
  resolveDraftKickoffState,
  resolveDraftKickoffRuntimeState,
  resolvePaperWorkspaceContinuityStatusFeedback,
  resolveTranslationRuntimeContext,
  resolvePaperWorkspaceContinuityStatus,
  resolvePermanentCandidateRuntimeState,
  resolvePermanentNoteRuntimeState,
  resolveRefreshedDraftKickoff,
  resolveRecentDraftBriefCopy,
  resolveSelectedPaperCandidateState,
  resolveSelectedPaperWorkspaceState,
  resolvedStoredTranslationDraft,
  resolvedConfirmAuthorshipForPermanentCandidate,
  resolvedSaveStatusForPermanentCandidate,
  resolvedTranslationSignatureForPermanentCandidate,
  savedTranslationStatusKey,
  selectedAlignedPermanentCandidate,
  selectedPaperCandidateIdForPermanentCandidate,
  selectedPaperCandidate,
  selectedPermanentCandidate,
  selectedPaperTranslation,
  resolveTranslationSaveRuntimeState,
  translationSaveStatusFeedback,
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
    draftKickoffPreviousText: "",
    draftKickoffPreviousSignature: "",
    draftKickoffReplacementSignature: "",
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

test("draftBriefButtonLabel reflects the next real draft-brief action for blocked and ready paths", () => {
  assert.equal(
    draftBriefButtonLabel(
      {
        enabled: false,
        label: "当前还不能复制 draft brief"
      },
      {
        key: "save_translation"
      }
    ),
    "先保存转述"
  );

  assert.equal(
    draftBriefButtonLabel(
      {
        enabled: false,
        label: "当前还不能复制 draft brief"
      },
      {
        key: "refresh_permanent_candidate"
      }
    ),
    "先刷新 Step 4"
  );

  assert.equal(
    draftBriefButtonLabel(
      {
        enabled: true,
        label: "复制 draft brief"
      },
      {
        key: "review_saved_permanent_note"
      }
    ),
    "复制 brief，回看已保存路径"
  );

  assert.equal(
    draftBriefButtonLabel(
      {
        enabled: true,
        label: "复制 draft brief"
      },
      {
        key: "draft_ready"
      }
    ),
    "复制 brief，继续写 draft"
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

test("resolveDraftKickoffState marks kickoff content stale when its stored translation signature falls behind", () => {
  assert.deepEqual(
    resolveDraftKickoffState(
      {
        draftKickoffText: " Current kickoff wording. ",
        draftKickoffSignature: "sig_old",
        draftKickoffPreviousText: "",
        draftKickoffPreviousSignature: "",
        draftKickoffReplacementSignature: ""
      },
      "sig_new"
    ),
    {
      content: "Current kickoff wording.",
      translationSignature: "sig_old",
      currentTranslationSignature: "sig_new",
      hasContent: true,
      isStale: true,
      previousSnapshot: null
    }
  );
});

test("resolveDraftKickoffState only restores the previous kickoff snapshot when it matches the current stored kickoff chain", () => {
  assert.deepEqual(
    resolveDraftKickoffState(
      {
        draftKickoffText: "Current kickoff wording.",
        draftKickoffSignature: "sig_current",
        draftKickoffPreviousText: "Previous kickoff wording.",
        draftKickoffPreviousSignature: "sig_previous",
        draftKickoffReplacementSignature: "sig_current"
      },
      "sig_current"
    ),
    {
      content: "Current kickoff wording.",
      translationSignature: "sig_current",
      currentTranslationSignature: "sig_current",
      hasContent: true,
      isStale: false,
      previousSnapshot: {
        content: "Previous kickoff wording.",
        previousSignature: "sig_previous",
        replacementSignature: "sig_current"
      }
    }
  );

  assert.deepEqual(
    resolveDraftKickoffState(
      {
        draftKickoffText: "Current kickoff wording.",
        draftKickoffSignature: "sig_current",
        draftKickoffPreviousText: "Previous kickoff wording.",
        draftKickoffPreviousSignature: "sig_previous",
        draftKickoffReplacementSignature: "sig_other"
      },
      "sig_current"
    ),
    {
      content: "Current kickoff wording.",
      translationSignature: "sig_current",
      currentTranslationSignature: "sig_current",
      hasContent: true,
      isStale: false,
      previousSnapshot: null
    }
  );
});

test("resolveAdoptedDraftKickoff swaps the current and previous kickoff wording onto the latest translation chain", () => {
  assert.deepEqual(
    resolveAdoptedDraftKickoff(
      {
        draftKickoffText: "Current kickoff wording."
      },
      {
        currentTranslationSignature: "sig_current",
        previousSnapshot: {
          content: "Previous kickoff wording.",
          previousSignature: "sig_previous",
          replacementSignature: "sig_current"
        }
      }
    ),
    {
      draftKickoffText: "Previous kickoff wording.",
      draftKickoffSignature: "sig_current",
      draftKickoffPreviousText: "Current kickoff wording.",
      draftKickoffPreviousSignature: "sig_current",
      draftKickoffReplacementSignature: "sig_current"
    }
  );
});

test("resolveAdoptedDraftKickoff falls back to the provided translation signature and rejects empty previous wording", () => {
  assert.deepEqual(
    resolveAdoptedDraftKickoff(
      {
        draftKickoffText: "Current kickoff wording."
      },
      {
        currentTranslationSignature: "",
        previousSnapshot: {
          content: "Previous kickoff wording."
        }
      },
      "sig_fallback"
    ),
    {
      draftKickoffText: "Previous kickoff wording.",
      draftKickoffSignature: "sig_fallback",
      draftKickoffPreviousText: "Current kickoff wording.",
      draftKickoffPreviousSignature: "sig_fallback",
      draftKickoffReplacementSignature: "sig_fallback"
    }
  );

  assert.equal(
    resolveAdoptedDraftKickoff(
      {
        draftKickoffText: "Current kickoff wording."
      },
      {
        currentTranslationSignature: "sig_current",
        previousSnapshot: {
          content: ""
        }
      }
    ),
    null
  );
});

test("resolveRefreshedDraftKickoff captures the stale kickoff as a previous snapshot before loading the new brief", () => {
  assert.deepEqual(
    resolveRefreshedDraftKickoff(
      {
        draftKickoffText: "Current kickoff wording.",
        draftKickoffSignature: "sig_old",
        draftKickoffPreviousText: "Older kickoff wording.",
        draftKickoffPreviousSignature: "sig_older",
        draftKickoffReplacementSignature: "sig_old"
      },
      {
        hasContent: true,
        isStale: true
      },
      "# Draft brief: Candidate One",
      "sig_new"
    ),
    {
      draftKickoffText: "# Draft brief: Candidate One",
      draftKickoffSignature: "sig_new",
      draftKickoffPreviousText: "Current kickoff wording.",
      draftKickoffPreviousSignature: "sig_old",
      draftKickoffReplacementSignature: "sig_new",
      snapshotToPersist: {
        content: "Current kickoff wording.",
        previousSignature: "sig_old",
        replacementSignature: "sig_new"
      }
    }
  );
});

test("resolveRefreshedDraftKickoff keeps the existing snapshot when the kickoff is not stale", () => {
  assert.deepEqual(
    resolveRefreshedDraftKickoff(
      {
        draftKickoffText: "",
        draftKickoffSignature: "",
        draftKickoffPreviousText: "Previous kickoff wording.",
        draftKickoffPreviousSignature: "sig_previous",
        draftKickoffReplacementSignature: "sig_previous"
      },
      {
        hasContent: false,
        isStale: false
      },
      "# Draft brief: Candidate One",
      "sig_current"
    ),
    {
      draftKickoffText: "# Draft brief: Candidate One",
      draftKickoffSignature: "sig_current",
      draftKickoffPreviousText: "Previous kickoff wording.",
      draftKickoffPreviousSignature: "sig_previous",
      draftKickoffReplacementSignature: "sig_previous",
      snapshotToPersist: null
    }
  );

  assert.equal(resolveRefreshedDraftKickoff({}, { hasContent: false, isStale: false }, "", "sig_current"), null);
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

test("resolveDraftBriefState combines brief, action state, and candidate-scoped recent copy for the selected path", () => {
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
  const draftInput = {
    paraphraseText: "My own wording.",
    relationToQuestion: "This matters for the writing question.",
    boundaryOrCondition: "Only when the sample is comparable."
  };
  const translationSignature = translationContinuitySignature(workspace, "pwc_1", draftInput);
  const workspaceSelection = {
    draftBriefByCandidate: {
      pwc_1: {
        candidateId: "pwc_1",
        title: "Draft brief: Candidate One",
        nextAction: "这条路径已连到已保存的永久笔记。继续写 draft 前，先回看 originality / authorship。",
        translationSignature,
        copiedAt: "2026-05-26T00:00:00.000Z"
      }
    },
    translationSignatureByPermanentCandidate: {
      pn_1: translationSignature
    }
  };

  const state = resolveDraftBriefState(workspace, workspaceSelection, "pwc_1", "pn_1", draftInput);

  assert.equal(state.draft.hasSavedTranslation, true);
  assert.equal(state.continuityReason, "saved_permanent_note");
  assert.deepEqual(state.draftBriefAction, {
    enabled: true,
    label: "复制 draft brief"
  });
  assert.deepEqual(state.draftContinuationAction, {
    tone: "ok",
    key: "review_saved_permanent_note",
    label: "这条路径已连到已保存的永久笔记。继续写 draft 前，先回看 originality / authorship。"
  });
  assert.equal(state.currentTranslationSignature, translationSignature);
  assert.equal(state.recentDraftBriefCopy?.candidateId, "pwc_1");
  assert.match(state.draftBrief.markdown, /Saved permanent note: note_1/);
});

test("resolveDraftKickoffRuntimeState combines kickoff continuity, saved-path action, and current translation signature", () => {
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
  const draftInput = {
    paraphraseText: "My own wording.",
    relationToQuestion: "This matters for the writing question.",
    boundaryOrCondition: "Only when the sample is comparable."
  };
  const translationSignature = translationContinuitySignature(workspace, "pwc_1", draftInput);
  const form = {
    draftKickoffText: "Current kickoff wording.",
    draftKickoffSignature: translationSignature,
    draftKickoffPreviousText: "Previous kickoff wording.",
    draftKickoffPreviousSignature: "sig_previous",
    draftKickoffReplacementSignature: translationSignature
  };
  const workspaceSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: translationSignature
    }
  };

  const state = resolveDraftKickoffRuntimeState(
    workspace,
    workspaceSelection,
    "pwc_1",
    "pn_1",
    form,
    draftInput
  );

  assert.equal(state.draft.hasSavedTranslation, true);
  assert.equal(state.currentTranslationSignature, translationSignature);
  assert.equal(state.continuityReason, "saved_permanent_note");
  assert.equal(state.hasContent, true);
  assert.equal(state.isStale, false);
  assert.deepEqual(state.previousSnapshot, {
    content: "Previous kickoff wording.",
    previousSignature: "sig_previous",
    replacementSignature: translationSignature
  });
  assert.deepEqual(state.action, {
    enabled: true,
    key: "resume_local_draft",
    label: "继续本地 draft"
  });
});

test("resolvePermanentCandidateRuntimeState reports the real blocked next step for step four entry", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "Candidate One", candidateKind: "claim" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording.",
        relationToQuestion: "",
        boundaryOrCondition: "Only when the sample is comparable."
      }
    ]
  };

  const supportMissingState = resolvePermanentCandidateRuntimeState(
    workspace,
    null,
    "pwc_1",
    "",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "",
      boundaryOrCondition: "Only when the sample is comparable."
    }
  );
  assert.deepEqual(supportMissingState.action, {
    enabled: false,
    label: "先补 relation / boundary"
  });
  assert.equal(supportMissingState.blockedStatusKey, "savedTranslationNeedsDraftSupport");
  assert.equal(supportMissingState.blockedStatusTone, "warn");

  const unsavedDraftState = resolvePermanentCandidateRuntimeState(
    {
      candidates: [{ id: "pwc_1", title: "Candidate One", candidateKind: "claim" }],
      translations: []
    },
    null,
    "pwc_1",
    "",
    {
      paraphraseText: "Unsaved wording.",
      relationToQuestion: "Why this matters.",
      boundaryOrCondition: "Only when the sample is comparable."
    }
  );
  assert.deepEqual(unsavedDraftState.action, {
    enabled: false,
    label: "先保存转述"
  });
  assert.equal(unsavedDraftState.blockedStatusKey, "translationNeedsSaveBeforePermanentCandidate");
  assert.equal(unsavedDraftState.blockedStatusTone, "warn");
});

test("resolvePermanentNoteRuntimeState reports stale and resave blockers for step four save", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "Candidate One", candidateKind: "claim" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording.",
        relationToQuestion: "Why this matters.",
        boundaryOrCondition: "Only when the sample is comparable."
      }
    ],
    permanentCandidates: [{ id: "pn_1", paper_candidate_id: "pwc_1", title: "Permanent One" }]
  };

  const staleSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: "sig_old"
    }
  };
  const staleState = resolvePermanentNoteRuntimeState(
    workspace,
    staleSelection,
    "pn_1",
    "pwc_1",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Why this matters.",
      boundaryOrCondition: "Only when the sample is comparable."
    }
  );
  assert.deepEqual(staleState.action, {
    enabled: false,
    label: "先重新生成永久笔记候选"
  });
  assert.equal(staleState.blockedStatusKey, "translationNeedsFreshPermanentCandidate");
  assert.equal(staleState.blockedStatusTone, "warn");

  const unsavedChangeState = resolvePermanentNoteRuntimeState(
    workspace,
    {
      translationSignatureByPermanentCandidate: {
        pn_1: translationContinuitySignature(workspace, "pwc_1", {
          paraphraseText: "Saved wording.",
          relationToQuestion: "Why this matters.",
          boundaryOrCondition: "Only when the sample is comparable."
        })
      }
    },
    "pn_1",
    "pwc_1",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Updated relation.",
      boundaryOrCondition: "Only when the sample is comparable."
    }
  );
  assert.deepEqual(unsavedChangeState.action, {
    enabled: false,
    label: "确认保存为永久笔记"
  });
  assert.equal(unsavedChangeState.blockedStatusKey, "translationNeedsResaveBeforePermanentNote");
  assert.equal(unsavedChangeState.blockedStatusTone, "warn");

  const savedState = resolvePermanentNoteRuntimeState(
    {
      ...workspace,
      permanentCandidates: [
        { id: "pn_1", paper_candidate_id: "pwc_1", title: "Permanent One", savedPermanentNoteId: "note_1" }
      ]
    },
    {
      translationSignatureByPermanentCandidate: {
        pn_1: translationContinuitySignature(workspace, "pwc_1", {
          paraphraseText: "Saved wording.",
          relationToQuestion: "Why this matters.",
          boundaryOrCondition: "Only when the sample is comparable."
        })
      }
    },
    "pn_1",
    "pwc_1",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Why this matters.",
      boundaryOrCondition: "Only when the sample is comparable."
    }
  );
  assert.deepEqual(savedState.action, {
    enabled: false,
    label: "已保存为永久笔记"
  });
  assert.equal(savedState.blockedStatusKey, "savedPermanentNote");
  assert.equal(savedState.blockedStatusTone, "ok");
});

test("resolveRecentDraftBriefCopy returns the candidate-scoped copy when its translation signature still matches", () => {
  const workspaceSelection = {
    draftBriefByCandidate: {
      pwc_1: {
        candidateId: "pwc_1",
        title: "Draft brief: Candidate One",
        nextAction: "回看 originality / authorship",
        translationSignature: "sig_current",
        copiedAt: "2026-05-26T00:00:00.000Z"
      }
    }
  };

  assert.deepEqual(resolveRecentDraftBriefCopy(workspaceSelection, "pwc_1", "sig_current"), {
    candidateId: "pwc_1",
    title: "Draft brief: Candidate One",
    nextAction: "回看 originality / authorship",
    translationSignature: "sig_current",
    copiedAt: "2026-05-26T00:00:00.000Z"
  });
});

test("resolveRecentDraftBriefCopy clears the recent copy when the translation signature has moved", () => {
  const workspaceSelection = {
    draftBriefByCandidate: {
      pwc_1: {
        candidateId: "pwc_1",
        title: "Draft brief: Candidate One",
        nextAction: "回看 originality / authorship",
        translationSignature: "sig_old",
        copiedAt: "2026-05-26T00:00:00.000Z"
      }
    }
  };

  assert.equal(resolveRecentDraftBriefCopy(workspaceSelection, "pwc_1", "sig_new"), null);
});

test("resolveRecentDraftBriefCopy does not leak a copied brief across paper candidates", () => {
  const workspaceSelection = {
    draftBriefByCandidate: {
      pwc_1: {
        candidateId: "pwc_1",
        title: "Draft brief: Candidate One",
        nextAction: "回看 originality / authorship",
        translationSignature: "sig_current",
        copiedAt: "2026-05-26T00:00:00.000Z"
      }
    }
  };

  assert.equal(resolveRecentDraftBriefCopy(workspaceSelection, "pwc_2", "sig_current"), null);
});

test("resolveRecentDraftBriefCopy rejects a corrupted copied brief that claims a different candidate", () => {
  const workspaceSelection = {
    draftBriefByCandidate: {
      pwc_1: {
        candidateId: "pwc_2",
        title: "Draft brief: Candidate One",
        nextAction: "回看 originality / authorship",
        translationSignature: "sig_current",
        copiedAt: "2026-05-26T00:00:00.000Z"
      }
    }
  };

  assert.equal(resolveRecentDraftBriefCopy(workspaceSelection, "pwc_1", "sig_current"), null);
});

test("draft continuity status helpers return the expected runtime messages", () => {
  assert.equal(blockedDraftContinuationStatusMessage({ label: "先刷新 Step 4" }), "先刷新 Step 4");
  assert.equal(blockedDraftContinuationStatusMessage(null), "当前还不能继续写 draft。");

  assert.equal(
    draftBriefCopyStatusMessage(
      "Draft brief: Candidate One",
      "继续本地 draft",
      null,
      "Step 4: 尚未生成永久笔记候选"
    ),
    "已复制 draft brief：Draft brief: Candidate One。当前链路：Step 4: 尚未生成永久笔记候选。下一步：继续本地 draft"
  );
  assert.equal(
    draftBriefCopyStatusMessage("Draft brief: Candidate One"),
    "已复制 draft brief：Draft brief: Candidate One"
  );
  assert.equal(draftBriefCopyStatusMessage("", "", new Error("boom")), "复制 draft brief 失败：boom");

  assert.equal(
    draftKickoffStatusMessage(
      "loaded",
      "Draft brief: Candidate One",
      "继续本地 draft",
      "Step 4: 尚未生成永久笔记候选"
    ),
    "已载入本地 draft kickoff：Draft brief: Candidate One。当前链路：Step 4: 尚未生成永久笔记候选。下一步：继续本地 draft"
  );
  assert.equal(
    draftKickoffStatusMessage(
      "resumed",
      "Draft brief: Candidate One",
      "继续本地 draft",
      "Step 4: 已保存永久笔记路径 (note_1)"
    ),
    "继续本地 draft：Draft brief: Candidate One。当前链路：Step 4: 已保存永久笔记路径 (note_1)。下一步：继续本地 draft"
  );
  assert.equal(
    draftKickoffStatusMessage("adopted", "Draft brief: Candidate One"),
    "已采用上一版 kickoff 写法：Draft brief: Candidate One。当前本地 draft 仍指向最新转述链路"
  );
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

test("resolveTranslationRuntimeContext shares one normalized draft input and signature source", () => {
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

  const runtime = resolveTranslationRuntimeContext(workspace, "pwc_1", {
    paraphraseText: " Draft wording. ",
    relationToQuestion: " Draft relation. ",
    boundaryOrCondition: " Draft boundary. "
  });

  assert.deepEqual(runtime.draftInput, {
    paraphraseText: "Draft wording.",
    relationToQuestion: "Draft relation.",
    boundaryOrCondition: "Draft boundary."
  });
  assert.equal(
    runtime.translationSignature,
    JSON.stringify({
      candidateId: "pwc_1",
      translationId: "ptr_1",
      paraphraseText: "Draft wording.",
      relationToQuestion: "Draft relation.",
      boundaryOrCondition: "Draft boundary."
    })
  );

  const savedRuntime = resolveTranslationRuntimeContext(workspace, "pwc_1");
  assert.deepEqual(savedRuntime.draftInput, {
    paraphraseText: "",
    relationToQuestion: "",
    boundaryOrCondition: ""
  });
  assert.equal(
    savedRuntime.translationSignature,
    JSON.stringify({
      candidateId: "pwc_1",
      translationId: "ptr_1",
      paraphraseText: "Saved wording.",
      relationToQuestion: "Saved relation.",
      boundaryOrCondition: "Saved boundary."
    })
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

test("savedTranslationStatusKey prefers stale step-four warnings before ready translation messages", () => {
  assert.equal(savedTranslationStatusKey("stale_translation_signature", true), "translationNeedsFreshPermanentCandidate");
  assert.equal(savedTranslationStatusKey("ok", false), "savedTranslationNeedsDraftSupport");
  assert.equal(savedTranslationStatusKey("ok", true), "savedTranslation");
});

test("resolveTranslationSaveRuntimeState combines save action, continuity reason, and success status key", () => {
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
  const staleSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: "sig_old"
    }
  };

  const staleState = resolveTranslationSaveRuntimeState(
    workspace,
    staleSelection,
    "pwc_1",
    "pn_1",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Saved relation.",
      boundaryOrCondition: "Saved boundary."
    }
  );
  assert.deepEqual(staleState.action, {
    enabled: false,
    label: "已保存转述"
  });
  assert.equal(staleState.continuityReason, "stale_translation_signature");
  assert.equal(staleState.supportsNextStep, true);
  assert.equal(staleState.successStatusKey, "translationNeedsFreshPermanentCandidate");

  const supportMissingState = resolveTranslationSaveRuntimeState(
    {
      ...workspace,
      translations: [
        {
          id: "ptr_1",
          candidateId: "pwc_1",
          paraphraseText: "Saved wording.",
          relationToQuestion: "",
          boundaryOrCondition: "Saved boundary."
        }
      ]
    },
    null,
    "pwc_1",
    "",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "",
      boundaryOrCondition: "Saved boundary."
    }
  );
  assert.equal(supportMissingState.continuityReason, "missing_permanent_candidate");
  assert.equal(supportMissingState.supportsNextStep, false);
  assert.equal(supportMissingState.successStatusKey, "savedTranslationNeedsDraftSupport");
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

test("nextSelectedPermanentCandidateId prefers the latest matching saved path for the selected paper candidate", () => {
  const workspace = {
    candidates: [{ id: "pwc_1", title: "Candidate One" }],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Updated paraphrase.",
        relationToQuestion: "Updated relation.",
        boundaryOrCondition: "Updated boundary."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_old",
        paper_candidate_id: "pwc_1",
        savedPermanentNoteId: "saved_old",
        updated_at: "2026-05-20T00:00:00.000Z"
      },
      {
        id: "pn_new",
        paper_candidate_id: "pwc_1",
        savedPermanentNoteId: "saved_new",
        updated_at: "2026-05-21T00:00:00.000Z"
      }
    ]
  };
  const currentSignature = translationContinuitySignature(workspace, "pwc_1");
  const storedSelection = {
    translationSignatureByPermanentCandidate: {
      pn_old: "stale-signature",
      pn_new: currentSignature
    }
  };

  assert.equal(
    nextSelectedPermanentCandidateId(workspace, "", {
      selectedPaperCandidateId: "pwc_1",
      storedSelection,
      fallbackToFirst: false
    }),
    "pn_new"
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

  assert.equal(
    paperWorkspaceResumeStatusKey(
      {
        selectedCandidateId: "",
        hasAnyCandidates: false,
        hasSavedTranslation: false,
        hasLocalChanges: false
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "workspaceReadyForNotebookDraft"
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
        selectedCandidateId: "",
        hasAnyCandidates: false,
        hasSavedTranslation: false,
        hasLocalChanges: false
      },
      {
        selectedPermanentCandidateId: ""
      }
    ),
    "workspaceReadyForNotebookDraft"
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

test("continuityStatusTone maps warning and ready continuity states to stable tones", () => {
  assert.equal(continuityStatusTone("translationNeedsFreshPermanentCandidate"), "warn");
  assert.equal(continuityStatusTone("savedTranslationNeedsDraftSupport"), "warn");
  assert.equal(continuityStatusTone("restoredSavedPermanentNoteForSelectedPaper"), "ok");
  assert.equal(continuityStatusTone("selectedCandidate"), "");
});

test("paperWorkspaceStatusFeedback resolves continuity text and tone from status keys", () => {
  const warnFeedback = paperWorkspaceStatusFeedback(
    "savedTranslationNeedsDraftSupport",
    "loadedWorkspace"
  );
  assert.match(warnFeedback.text, /relation|boundary/);
  assert.equal(warnFeedback.tone, "warn");

  const readyFeedback = paperWorkspaceStatusFeedback(
    "savedPermanentNote",
    "loadedWorkspace",
    "warn"
  );
  assert.match(readyFeedback.text, /永久笔记已保存/);
  assert.equal(readyFeedback.tone, "ok");

  const fallbackFeedback = paperWorkspaceStatusFeedback("", "savedTranslation", "warn");
  assert.match(fallbackFeedback.text, /用户转述已保存/);
  assert.equal(fallbackFeedback.tone, "warn");

  const notebookReadyFeedback = paperWorkspaceStatusFeedback(
    "workspaceReadyForNotebookDraft",
    "createdWorkspace"
  );
  assert.match(notebookReadyFeedback.text, /粘贴 NotebookLM 输出/);
  assert.equal(notebookReadyFeedback.tone, "ok");
});

test("chainedPaperWorkspaceStatusFeedback appends continuity text and keeps its tone", () => {
  assert.deepEqual(
    chainedPaperWorkspaceStatusFeedback("永久笔记已保存", {
      text: "已对齐到这条候选已保存的永久笔记路径。",
      tone: "warn"
    }),
    {
      text: "永久笔记已保存。已对齐到这条候选已保存的永久笔记路径。",
      tone: "warn"
    }
  );
  assert.deepEqual(chainedPaperWorkspaceStatusFeedback("NotebookLM 内容已转成 literature 候选", null), {
    text: "NotebookLM 内容已转成 literature 候选",
    tone: "ok"
  });
});

test("translationSaveStatusFeedback keeps save confirmation while carrying the next continuity step", () => {
  assert.deepEqual(translationSaveStatusFeedback("savedTranslation"), {
    text: "用户转述已保存",
    tone: "ok"
  });
  assert.deepEqual(translationSaveStatusFeedback("savedTranslationNeedsDraftSupport"), {
    text: "用户转述已保存。这条候选的转述已保存，但 relation 和 boundary 还不足以支撑下一步。先补全它们，再进入永久笔记候选或继续写 draft。",
    tone: "warn"
  });
  assert.deepEqual(translationSaveStatusFeedback("translationNeedsFreshPermanentCandidate"), {
    text: "用户转述已保存。这条转述已经更新过，当前 Step 4 候选已过期。先重新生成永久笔记候选",
    tone: "warn"
  });
});

test("step-four status feedback helpers reuse blocked and success continuity feedback", () => {
  assert.deepEqual(
    permanentCandidateStatusFeedback(
      {
        blockedStatusKey: "savedTranslationNeedsDraftSupport",
        blockedStatusTone: "warn"
      },
      null
    ),
    {
      text: "这条候选的转述已保存，但 relation 和 boundary 还不足以支撑下一步。先补全它们，再进入永久笔记候选或继续写 draft。",
      tone: "warn"
    }
  );

  assert.deepEqual(
    permanentCandidateStatusFeedback(null, {
      text: "已对齐到这条候选的永久笔记候选",
      tone: "ok"
    }),
    {
      text: "永久笔记候选已生成。已对齐到这条候选的永久笔记候选",
      tone: "ok"
    }
  );

  assert.deepEqual(
    permanentNoteStatusFeedback(
      {
        blockedStatusKey: "savedPermanentNote",
        blockedStatusTone: "ok"
      },
      null
    ),
    {
      text: "永久笔记已保存",
      tone: "ok"
    }
  );

  assert.deepEqual(
    permanentNoteStatusFeedback(null, {
      text: "已对齐到这条候选已保存的永久笔记路径",
      tone: "ok"
    }),
    {
      text: "永久笔记已保存。已对齐到这条候选已保存的永久笔记路径",
      tone: "ok"
    }
  );
});

test("draft continuity status feedback helpers return stable tones", () => {
  const blockedFeedback = blockedDraftContinuationStatusFeedback({
    label: "先保存这条转述，再继续写 draft。"
  });
  assert.match(blockedFeedback.text, /继续写 draft/);
  assert.equal(blockedFeedback.tone, "warn");
  assert.equal(
    blockedFeedback.text,
    blockedDraftContinuationStatusMessage({ label: "先保存这条转述，再继续写 draft。" })
  );

  const copyFeedback = draftBriefCopyStatusFeedback(
    "Draft handoff",
    "继续本地 draft",
    null,
    "Step 4: 已保存永久笔记路径 (note_1)"
  );
  assert.match(copyFeedback.text, /Draft handoff/);
  assert.match(copyFeedback.text, /当前链路：Step 4: 已保存永久笔记路径/);
  assert.equal(copyFeedback.tone, "ok");
  assert.equal(
    copyFeedback.text,
    draftBriefCopyStatusMessage(
      "Draft handoff",
      "继续本地 draft",
      null,
      "Step 4: 已保存永久笔记路径 (note_1)"
    )
  );

  const copyErrorFeedback = draftBriefCopyStatusFeedback("", "", new Error("clipboard unavailable"));
  assert.match(copyErrorFeedback.text, /clipboard unavailable/);
  assert.equal(copyErrorFeedback.tone, "bad");

  const kickoffFeedback = draftKickoffStatusFeedback(
    "adopted",
    "Draft brief: Candidate One",
    "这条转述已经具备继续写 draft 的最小条件。",
    "Step 4: 已保存永久笔记路径 (note_1)"
  );
  assert.match(kickoffFeedback.text, /kickoff/);
  assert.match(kickoffFeedback.text, /Draft brief: Candidate One/);
  assert.match(kickoffFeedback.text, /当前链路：Step 4: 已保存永久笔记路径/);
  assert.match(kickoffFeedback.text, /下一步/);
  assert.equal(kickoffFeedback.tone, "ok");
  assert.equal(
    kickoffFeedback.text,
    draftKickoffStatusMessage(
      "adopted",
      "Draft brief: Candidate One",
      "这条转述已经具备继续写 draft 的最小条件。",
      "Step 4: 已保存永久笔记路径 (note_1)"
    )
  );
});

test("resolvePaperWorkspaceContinuityStatus reuses continuity rules for both resume and live modes", () => {
  const emptyWorkspace = {
    candidates: [],
    translations: [],
    permanentCandidates: []
  };

  const emptyResumeStatus = resolvePaperWorkspaceContinuityStatus(
    emptyWorkspace,
    null,
    "",
    "",
    null,
    "resume"
  );
  assert.equal(emptyResumeStatus.key, "workspaceReadyForNotebookDraft");
  assert.equal(emptyResumeStatus.tone, "");
  assert.equal(emptyResumeStatus.candidateState.hasAnyCandidates, false);

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
  const staleSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: "sig_old"
    }
  };

  const resumeStatus = resolvePaperWorkspaceContinuityStatus(
    workspace,
    staleSelection,
    "pwc_1",
    "pn_1",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Saved relation.",
      boundaryOrCondition: "Saved boundary."
    },
    "resume"
  );
  assert.equal(resumeStatus.key, "translationNeedsFreshPermanentCandidate");
  assert.equal(resumeStatus.tone, "warn");
  assert.equal(resumeStatus.workspaceState.permanentNoteContinuityReason, "stale_translation_signature");

  const liveStatus = resolvePaperWorkspaceContinuityStatus(
    workspace,
    null,
    "pwc_1",
    "",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Saved relation.",
      boundaryOrCondition: "Saved boundary."
    },
    "live"
  );
  assert.equal(liveStatus.key, "savedTranslationReadyForPermanentCandidate");
  assert.equal(liveStatus.tone, "ok");
  assert.equal(liveStatus.candidateState.supportsNextStep, true);
});

test("resolvePaperWorkspaceContinuityStatusFeedback adds user-facing text to continuity status", () => {
  const emptyFeedback = resolvePaperWorkspaceContinuityStatusFeedback(
    {
      candidates: [],
      translations: [],
      permanentCandidates: []
    },
    null,
    "",
    "",
    null,
    "resume",
    "loadedWorkspace"
  );
  assert.equal(emptyFeedback.key, "workspaceReadyForNotebookDraft");
  assert.equal(emptyFeedback.tone, "ok");
  assert.match(emptyFeedback.text, /粘贴 NotebookLM 输出/);

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
  const staleSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: "sig_old"
    }
  };

  const liveFeedback = resolvePaperWorkspaceContinuityStatusFeedback(
    workspace,
    staleSelection,
    "pwc_1",
    "pn_1",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Saved relation changed.",
      boundaryOrCondition: "Saved boundary."
    },
    "live",
    "loadedWorkspace"
  );
  assert.equal(liveFeedback.key, "translationNeedsResaveBeforePermanentNote");
  assert.equal(liveFeedback.tone, "warn");
  assert.match(liveFeedback.text, /重新保存这条转述|更新或确认永久笔记/);

  const resumeFeedback = resolvePaperWorkspaceContinuityStatusFeedback(
    workspace,
    staleSelection,
    "pwc_1",
    "pn_1",
    {
      paraphraseText: "Saved wording.",
      relationToQuestion: "Saved relation.",
      boundaryOrCondition: "Saved boundary."
    },
    "resume",
    "loadedWorkspace"
  );
  assert.equal(resumeFeedback.key, "translationNeedsFreshPermanentCandidate");
  assert.equal(resumeFeedback.tone, "warn");
  assert.match(resumeFeedback.text, /重新生成永久笔记候选/);
});

test("workspaceStageLabel falls back to a not-started label", () => {
  assert.equal(workspaceStageLabel(""), "尚未开始");
  assert.equal(workspaceStageLabel("mystery"), "mystery");
});
