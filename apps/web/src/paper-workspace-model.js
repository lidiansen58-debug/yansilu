function cleanText(value) {
  return String(value || "").trim();
}

function textOrUndefined(value) {
  const text = cleanText(value);
  return text ? text : undefined;
}

function hasOwn(value, key) {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);
}

export function emptyPaperWorkspaceForm() {
  return {
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
  };
}

export function createInitialPaperWorkspaceState() {
  return {
    form: emptyPaperWorkspaceForm(),
    workspace: null,
    selectedCandidateId: "",
    selectedPermanentCandidateId: "",
    loading: false,
    statusText: "\u51c6\u5907\u5c31\u7eea",
    statusTone: "",
    lastResult: null
  };
}

export function buildNotebookLmPayload(form = {}) {
  return {
    notebookName: cleanText(form.notebookName) || "NotebookLM",
    ...(textOrUndefined(form.summary) ? { summary: cleanText(form.summary) } : {}),
    ...(textOrUndefined(form.qa) ? { qa: cleanText(form.qa) } : {}),
    ...(textOrUndefined(form.studyGuide) ? { studyGuide: cleanText(form.studyGuide) } : {}),
    ...(textOrUndefined(form.notes) ? { notes: cleanText(form.notes) } : {})
  };
}

export function candidateLabel(candidate = {}) {
  return cleanText(candidate.title) || cleanText(candidate.quoteText).slice(0, 48) || cleanText(candidate.id) || "Untitled candidate";
}

export function candidateKindLabel(kind = "") {
  const labels = {
    claim: "\u5224\u65ad",
    method: "\u65b9\u6cd5",
    result: "\u7ed3\u679c",
    limitation: "\u8fb9\u754c",
    question: "\u95ee\u9898",
    quote: "\u6458\u5f55"
  };
  return labels[cleanText(kind)] || cleanText(kind) || "\u5019\u9009";
}

export function candidateStatusLabel(status = "") {
  const labels = {
    new: "\u5f85\u5904\u7406",
    selected: "\u5df2\u9009\u4e2d",
    skipped: "\u5df2\u8df3\u8fc7",
    translated: "\u8f6c\u8ff0\u5b8c\u6210",
    converted: "\u5df2\u751f\u6210\u5019\u9009",
    saved: "\u5df2\u4fdd\u5b58"
  };
  return labels[cleanText(status)] || cleanText(status) || "\u672a\u77e5";
}

export function paperWorkspaceProgress(workspace = null) {
  const candidates = Array.isArray(workspace?.candidates) ? workspace.candidates : [];
  const translations = Array.isArray(workspace?.translations) ? workspace.translations : [];
  const permanentCandidates = Array.isArray(workspace?.permanentCandidates) ? workspace.permanentCandidates : [];
  return {
    candidates: candidates.length,
    translations: translations.length,
    permanentCandidates: permanentCandidates.length,
    savedPermanentNotes: permanentCandidates.filter((item) => cleanText(item.savedPermanentNoteId)).length
  };
}

export function selectedPaperCandidate(workspace = null, candidateId = "") {
  const id = cleanText(candidateId);
  const candidates = Array.isArray(workspace?.candidates) ? workspace.candidates : [];
  return candidates.find((item) => item.id === id || item.externalCandidateId === id) || candidates[0] || null;
}

function exactSelectedPaperCandidate(workspace = null, candidateId = "") {
  const id = cleanText(candidateId);
  if (!id) return null;
  const candidates = Array.isArray(workspace?.candidates) ? workspace.candidates : [];
  return candidates.find((item) => item.id === id || item.externalCandidateId === id) || null;
}

export function selectedPaperTranslation(workspace = null, candidateId = "") {
  const id = cleanText(candidateId);
  const translations = Array.isArray(workspace?.translations) ? workspace.translations : [];
  return translations.find((item) => item.candidateId === id) || null;
}

export function normalizeTranslationDraftInput(input = {}) {
  return {
    paraphraseText: cleanText(input.paraphraseText),
    relationToQuestion: cleanText(input.relationToQuestion),
    boundaryOrCondition: cleanText(input.boundaryOrCondition)
  };
}

export function resolvedStoredTranslationDraft(storedDraft = null) {
  return normalizeTranslationDraftInput(storedDraft || {});
}

export function translationContinuitySignature(workspace = null, candidateId = "", draftInput = null) {
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  const cleanCandidateId = cleanText(draft.candidate?.id || candidateId);
  const cleanTranslationId = cleanText(draft.translation?.id);
  const normalizedDraft = normalizeTranslationDraftInput({
    paraphraseText: draft.paraphraseText,
    relationToQuestion: draft.relationToQuestion,
    boundaryOrCondition: draft.boundaryOrCondition
  });
  if (!cleanCandidateId || !cleanTranslationId || !cleanText(normalizedDraft.paraphraseText)) return "";
  return JSON.stringify({
    candidateId: cleanCandidateId,
    translationId: cleanTranslationId,
    ...normalizedDraft
  });
}

export function translationDraftForCandidate(workspace = null, candidateId = "", draftInput = null) {
  const candidate = selectedPaperCandidate(workspace, candidateId);
  const translation = selectedPaperTranslation(workspace, candidate?.id || candidateId);
  const normalizedDraft = normalizeTranslationDraftInput(draftInput || {});
  const paraphraseText = hasOwn(draftInput, "paraphraseText")
    ? normalizedDraft.paraphraseText
    : cleanText(translation?.paraphraseText || candidate?.paraphraseText);
  const relationToQuestion = hasOwn(draftInput, "relationToQuestion")
    ? normalizedDraft.relationToQuestion
    : cleanText(translation?.relationToQuestion);
  const boundaryOrCondition = hasOwn(draftInput, "boundaryOrCondition")
    ? normalizedDraft.boundaryOrCondition
    : cleanText(translation?.boundaryOrCondition);
  return {
    candidate,
    translation,
    paraphraseText,
    relationToQuestion,
    boundaryOrCondition,
    hasSavedTranslation: Boolean(cleanText(translation?.id) && cleanText(translation?.paraphraseText)),
    hasLocalChanges:
      hasOwn(draftInput, "paraphraseText") ||
      hasOwn(draftInput, "relationToQuestion") ||
      hasOwn(draftInput, "boundaryOrCondition")
        ? translationDraftHasLocalChanges(workspace, candidate?.id || candidateId, normalizedDraft)
        : false
  };
}

export function translationDraftHasLocalChanges(workspace = null, candidateId = "", draftInput = {}) {
  const candidate = selectedPaperCandidate(workspace, candidateId);
  if (!candidate) return false;
  const baseline = translationDraftForCandidate(workspace, candidateId);
  const current = normalizeTranslationDraftInput(draftInput);
  return (
    baseline.paraphraseText !== current.paraphraseText ||
    baseline.relationToQuestion !== current.relationToQuestion ||
    baseline.boundaryOrCondition !== current.boundaryOrCondition
  );
}

export function translationDraftSupportsNextStep(workspace = null, candidateId = "", draftInput = null) {
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  return Boolean(cleanText(draft.relationToQuestion) && cleanText(draft.boundaryOrCondition));
}

export function translationSaveActionState(workspace = null, candidateId = "", draftInput = null) {
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  if (!cleanText(draft.candidate?.id)) {
    return { enabled: false, label: "\u4fdd\u5b58\u8f6c\u8ff0" };
  }
  if (draft.hasSavedTranslation && !draft.hasLocalChanges) {
    return { enabled: false, label: "\u5df2\u4fdd\u5b58\u8f6c\u8ff0" };
  }
  if (draft.hasSavedTranslation) {
    return { enabled: true, label: "\u66f4\u65b0\u8f6c\u8ff0" };
  }
  return { enabled: true, label: "\u4fdd\u5b58\u8f6c\u8ff0" };
}

export function permanentCandidateActionState(
  workspace = null,
  storedSelection = null,
  candidateId = "",
  selectedPermanentCandidateId = "",
  draftInput = null
) {
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  const supportsNextStep = translationDraftSupportsNextStep(workspace, candidateId, draftInput);
  const continuity = permanentNoteContinuityState(
    workspace,
    storedSelection,
    selectedPermanentCandidateId,
    candidateId,
    draftInput
  );
  const hasAlignedPermanentCandidate =
    cleanText(draft.candidate?.id) &&
    cleanText(selectedAlignedPermanentCandidate(workspace, selectedPermanentCandidateId)?.paper_candidate_id) ===
      cleanText(draft.candidate?.id);
  if (!cleanText(draft.candidate?.id)) {
    return { enabled: false, label: "\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009" };
  }
  if (!draft.hasSavedTranslation) {
    return {
      enabled: false,
      label: draft.hasLocalChanges ? "\u5148\u4fdd\u5b58\u8f6c\u8ff0" : "\u5148\u4fdd\u5b58\u8f6c\u8ff0"
    };
  }
  if (draft.hasLocalChanges) {
    return { enabled: false, label: "\u5148\u66f4\u65b0\u8f6c\u8ff0" };
  }
  if (!supportsNextStep) {
    return { enabled: false, label: "\u5148\u8865 relation / boundary" };
  }
  if (hasAlignedPermanentCandidate && continuity.reason === "stale_translation_signature") {
    return { enabled: true, label: "\u91cd\u65b0\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009" };
  }
  return { enabled: true, label: "\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009" };
}

export function permanentNoteActionState(
  workspace = null,
  storedSelection = null,
  permanentCandidateId = "",
  candidateId = "",
  draftInput = null
) {
  const continuity = permanentNoteContinuityState(
    workspace,
    storedSelection,
    permanentCandidateId,
    candidateId,
    draftInput
  );
  if (continuity.reason === "stale_translation_signature") {
    return { enabled: false, label: "\u5148\u91cd\u65b0\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009" };
  }
  if (continuity.reason === "saved_permanent_note") {
    return { enabled: false, label: "\u5df2\u4fdd\u5b58\u4e3a\u6c38\u4e45\u7b14\u8bb0" };
  }
  return {
    enabled: continuity.allowed,
    label: "\u786e\u8ba4\u4fdd\u5b58\u4e3a\u6c38\u4e45\u7b14\u8bb0"
  };
}

export function resolveSelectedPaperCandidateState(workspace = null, options = {}) {
  const selectedCandidateId = nextSelectedCandidateId(
    workspace,
    options.preferredCandidateId || "",
    {
      candidateIdHasLocalDraft:
        typeof options.candidateIdHasLocalDraft === "function" ? options.candidateIdHasLocalDraft : () => false
    }
  );
  const storedDraft =
    typeof options.readStoredTranslationDraft === "function"
      ? options.readStoredTranslationDraft(selectedCandidateId)
      : null;
  const draft = translationDraftForCandidate(
    workspace,
    selectedCandidateId,
    storedDraft ? resolvedStoredTranslationDraft(storedDraft) : null
  );
  return {
    selectedCandidateId,
    paraphraseText: draft.paraphraseText,
    relationToQuestion: draft.relationToQuestion,
    boundaryOrCondition: draft.boundaryOrCondition,
    hasSavedTranslation: draft.hasSavedTranslation,
    hasLocalChanges: draft.hasLocalChanges,
    supportsNextStep: translationDraftSupportsNextStep(workspace, selectedCandidateId, storedDraft ? resolvedStoredTranslationDraft(storedDraft) : null)
  };
}

export function selectedPermanentCandidate(workspace = null, candidateId = "") {
  const id = cleanText(candidateId);
  const candidates = Array.isArray(workspace?.permanentCandidates) ? workspace.permanentCandidates : [];
  return candidates.find((item) => item.id === id || item.paper_candidate_id === id) || candidates[0] || null;
}

export function selectedAlignedPermanentCandidate(workspace = null, candidateId = "") {
  const id = cleanText(candidateId);
  if (!id) return null;
  const candidates = Array.isArray(workspace?.permanentCandidates) ? workspace.permanentCandidates : [];
  return candidates.find((item) => item.id === id || item.paper_candidate_id === id) || null;
}

export function selectedPaperCandidateIdForPermanentCandidate(workspace = null, candidateId = "") {
  return cleanText(selectedAlignedPermanentCandidate(workspace, candidateId)?.paper_candidate_id);
}

export function preferredPaperCandidateIdForWorkspaceResume(
  workspace = null,
  preferredPermanentCandidateId = "",
  fallbackCandidateId = ""
) {
  return (
    selectedPaperCandidateIdForPermanentCandidate(workspace, preferredPermanentCandidateId) ||
    cleanText(fallbackCandidateId)
  );
}

export function permanentCandidatePersistenceDefaults(candidate = null, fallback = {}) {
  const fallbackSaveStatus = cleanText(fallback.saveStatus);
  const candidateStatus = cleanText(candidate?.status);
  const resolvedSaveStatus = candidateStatus || fallbackSaveStatus || "active";
  const resolvedConfirmAuthorship =
    candidate?.authorship?.user_confirmed === true ||
    Boolean(cleanText(candidate?.savedPermanentNoteId)) ||
    fallback.confirmAuthorship === true;
  return {
    saveStatus: resolvedSaveStatus,
    confirmAuthorship: resolvedConfirmAuthorship
  };
}

export function workspaceStageLabel(stage = "") {
  const labels = {
    candidates: "\u5019\u9009\u6574\u7406",
    translations: "\u7528\u6237\u8f6c\u8ff0",
    permanent_candidates: "\u6c38\u4e45\u7b14\u8bb0\u5019\u9009",
    saved: "\u5df2\u4fdd\u5b58\u6c38\u4e45\u7b14\u8bb0"
  };
  return labels[cleanText(stage)] || cleanText(stage) || "\u5c1a\u672a\u5f00\u59cb";
}

export function canSubmitNotebookDraft(form = {}, workspace = null) {
  if (!workspace?.paperId) return false;
  const payload = buildNotebookLmPayload(form);
  return Boolean(payload.summary || payload.qa || payload.studyGuide || payload.notes);
}

export function canCreatePermanentCandidate(workspace = null, candidateId = "", draftInput = null) {
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  return Boolean(
    cleanText(draft.candidate?.id) &&
      cleanText(draft.translation?.id) &&
      cleanText(draft.translation?.paraphraseText) &&
      translationDraftSupportsNextStep(workspace, candidateId, draftInput) &&
      !draft.hasLocalChanges
  );
}

export function canSavePermanentNote(
  workspace = null,
  storedSelection = null,
  permanentCandidateId = "",
  candidateId = "",
  draftInput = null
) {
  return permanentNoteContinuityState(
    workspace,
    storedSelection,
    permanentCandidateId,
    candidateId,
    draftInput
  ).allowed;
}

export function nextSelectedCandidateId(workspace = null, preferredId = "", options = {}) {
  const preferred = exactSelectedPaperCandidate(workspace, preferredId);
  if (cleanText(preferredId) && cleanText(preferred?.id)) return cleanText(preferred.id);

  const hasLocalDraft =
    typeof options.candidateIdHasLocalDraft === "function" ? options.candidateIdHasLocalDraft : () => false;
  const candidates = Array.isArray(workspace?.candidates) ? workspace.candidates : [];
  const localDraftCandidate = candidates.find((item) => hasLocalDraft(cleanText(item?.id)));
  if (cleanText(localDraftCandidate?.id)) return cleanText(localDraftCandidate.id);

  return cleanText(selectedPaperCandidate(workspace, "")?.id);
}

export function nextSelectedPermanentCandidateId(workspace = null, preferredId = "", options = {}) {
  const fallbackToFirst = options.fallbackToFirst !== false;
  const selectedPaperCandidateId = cleanText(options.selectedPaperCandidateId);
  const preferred = selectedAlignedPermanentCandidate(workspace, preferredId);
  const preferredMatchesSelectedPaperCandidate =
    !selectedPaperCandidateId ||
    cleanText(preferred?.paper_candidate_id) === selectedPaperCandidateId ||
    cleanText(preferred?.id) === selectedPaperCandidateId;
  if (cleanText(preferredId) && cleanText(preferred?.id) && preferredMatchesSelectedPaperCandidate) {
    return cleanText(preferred.id);
  }
  const candidates = Array.isArray(workspace?.permanentCandidates) ? workspace.permanentCandidates : [];
  if (selectedPaperCandidateId) {
    const currentTranslationSignature = translationContinuitySignature(workspace, selectedPaperCandidateId);
    const matchingCandidates = candidates
      .filter((item) => cleanText(item?.paper_candidate_id) === selectedPaperCandidateId)
      .sort((left, right) => {
        const leftSignature =
          currentTranslationSignature &&
          resolvedTranslationSignatureForPermanentCandidate(options.storedSelection || null, cleanText(left?.id)) ===
            currentTranslationSignature
            ? 1
            : 0;
        const rightSignature =
          currentTranslationSignature &&
          resolvedTranslationSignatureForPermanentCandidate(options.storedSelection || null, cleanText(right?.id)) ===
            currentTranslationSignature
            ? 1
            : 0;
        if (leftSignature !== rightSignature) return rightSignature - leftSignature;
        const leftSaved = cleanText(left?.savedPermanentNoteId) ? 1 : 0;
        const rightSaved = cleanText(right?.savedPermanentNoteId) ? 1 : 0;
        if (leftSaved !== rightSaved) return rightSaved - leftSaved;
        const leftUpdated = Date.parse(cleanText(left?.updated_at || left?.updatedAt || left?.created_at || left?.createdAt)) || 0;
        const rightUpdated = Date.parse(cleanText(right?.updated_at || right?.updatedAt || right?.created_at || right?.createdAt)) || 0;
        return rightUpdated - leftUpdated;
      });
    if (cleanText(matchingCandidates[0]?.id)) return cleanText(matchingCandidates[0].id);
  }
  if (!fallbackToFirst) return "";
  return cleanText(selectedPermanentCandidate(workspace, "")?.id);
}

export function resolvedSaveStatusForPermanentCandidate(storedSelection = null, permanentCandidateId = "") {
  const cleanPermanentCandidateId = String(permanentCandidateId || "").trim();
  const mappedStatus =
    cleanPermanentCandidateId && storedSelection?.saveStatusByPermanentCandidate
      ? String(storedSelection.saveStatusByPermanentCandidate[cleanPermanentCandidateId] || "").trim()
      : "";
  if (mappedStatus) return mappedStatus;
  if (!cleanPermanentCandidateId) return "active";
  const legacyStatus = String(storedSelection?.saveStatus || "").trim();
  if (legacyStatus) return legacyStatus;
  return "active";
}

export function resolvedConfirmAuthorshipForPermanentCandidate(storedSelection = null, permanentCandidate = null) {
  const cleanPermanentCandidateId = String(permanentCandidate?.id || "").trim();
  const mappedConfirmAuthorship =
    cleanPermanentCandidateId && storedSelection?.confirmAuthorshipByPermanentCandidate
      ? storedSelection.confirmAuthorshipByPermanentCandidate[cleanPermanentCandidateId] === true
      : false;
  return permanentCandidatePersistenceDefaults(permanentCandidate, {
    confirmAuthorship: mappedConfirmAuthorship
  }).confirmAuthorship;
}

export function resolvedTranslationSignatureForPermanentCandidate(storedSelection = null, permanentCandidateId = "") {
  const cleanPermanentCandidateId = String(permanentCandidateId || "").trim();
  return cleanPermanentCandidateId && storedSelection?.translationSignatureByPermanentCandidate
    ? String(storedSelection.translationSignatureByPermanentCandidate[cleanPermanentCandidateId] || "").trim()
    : "";
}

export function permanentNoteContinuityState(
  workspace = null,
  storedSelection = null,
  permanentCandidateId = "",
  candidateId = "",
  draftInput = null
) {
  const permanentCandidate = selectedAlignedPermanentCandidate(workspace, permanentCandidateId);
  if (!cleanText(permanentCandidate?.id)) {
    return { allowed: false, reason: "missing_permanent_candidate" };
  }
  const selectedCandidate = selectedPaperCandidate(workspace, candidateId);
  const cleanSelectedCandidateId = cleanText(selectedCandidate?.id || candidateId);
  const isAlignedToSelectedCandidate =
    cleanSelectedCandidateId &&
    cleanText(permanentCandidate?.paper_candidate_id) === cleanSelectedCandidateId;
  if (!isAlignedToSelectedCandidate) {
    return cleanText(permanentCandidate?.savedPermanentNoteId)
      ? { allowed: false, reason: "saved_permanent_note" }
      : { allowed: true, reason: "ok" };
  }
  const draft = translationDraftForCandidate(workspace, cleanSelectedCandidateId, draftInput);
  if (draft.hasLocalChanges) {
    return { allowed: false, reason: "unsaved_translation_changes" };
  }
  const storedSignature = resolvedTranslationSignatureForPermanentCandidate(storedSelection, permanentCandidate.id);
  if (!storedSignature) {
    return cleanText(permanentCandidate?.savedPermanentNoteId)
      ? { allowed: false, reason: "saved_permanent_note" }
      : { allowed: true, reason: "ok" };
  }
  const currentSignature = translationContinuitySignature(workspace, cleanSelectedCandidateId, draftInput);
  if (!currentSignature || currentSignature !== storedSignature) {
    return { allowed: false, reason: "stale_translation_signature" };
  }
  if (cleanText(permanentCandidate?.savedPermanentNoteId)) {
    return { allowed: false, reason: "saved_permanent_note" };
  }
  return { allowed: true, reason: "ok" };
}

export function resolveSelectedPaperWorkspaceState(
  workspace = null,
  storedSelection = null,
  options = {}
) {
  const selectedCandidateId = nextSelectedCandidateId(
    workspace,
    options.preferredCandidateId || "",
    {
      candidateIdHasLocalDraft:
        typeof options.candidateIdHasLocalDraft === "function" ? options.candidateIdHasLocalDraft : () => false
    }
  );
  const selectedPermanentCandidateId = nextSelectedPermanentCandidateId(
    workspace,
    options.preferredPermanentCandidateId || "",
    {
      selectedPaperCandidateId: selectedCandidateId,
      storedSelection,
      fallbackToFirst: false
    }
  );
  const permanentCandidate = selectedAlignedPermanentCandidate(workspace, selectedPermanentCandidateId);
  const continuityState = permanentNoteContinuityState(
    workspace,
    storedSelection,
    selectedPermanentCandidateId,
    selectedCandidateId
  );
  return {
    selectedCandidateId,
    selectedPermanentCandidateId,
    saveStatus: permanentCandidatePersistenceDefaults(permanentCandidate, {
      saveStatus: resolvedSaveStatusForPermanentCandidate(storedSelection, selectedPermanentCandidateId)
    }).saveStatus,
    confirmAuthorship: resolvedConfirmAuthorshipForPermanentCandidate(storedSelection, permanentCandidate),
    permanentNoteContinuityReason: continuityState.reason
  };
}

export function paperWorkspaceResumeStatusKey(candidateState = null, workspaceState = null) {
  if (
    candidateState?.hasLocalChanges &&
    cleanText(workspaceState?.selectedPermanentCandidateId) &&
    workspaceState?.permanentNoteContinuityReason === "saved_permanent_note"
  ) {
    return "restoredLocalTranslationDraftForSavedPermanentNote";
  }
  if (candidateState?.hasLocalChanges && cleanText(workspaceState?.selectedPermanentCandidateId)) {
    return "restoredLocalTranslationDraftForPermanentNote";
  }
  if (candidateState?.hasLocalChanges && candidateState?.hasSavedTranslation) {
    return "restoredLocalTranslationDraftOverSavedTranslation";
  }
  if (candidateState?.hasLocalChanges) {
    return "restoredLocalTranslationDraft";
  }
  if (workspaceState?.permanentNoteContinuityReason === "stale_translation_signature") {
    return "translationNeedsFreshPermanentCandidate";
  }
  if (workspaceState?.permanentNoteContinuityReason === "saved_permanent_note") {
    return "restoredSavedPermanentNoteForSelectedPaper";
  }
  if (cleanText(workspaceState?.selectedPermanentCandidateId)) {
    return "restoredPermanentCandidateForSelectedPaper";
  }
  if (candidateState?.hasSavedTranslation) {
    if (candidateState?.supportsNextStep === false) {
      return "savedTranslationNeedsDraftSupport";
    }
    return "savedTranslationReadyForPermanentCandidate";
  }
  if (cleanText(candidateState?.selectedCandidateId)) {
    return "selectedCandidate";
  }
  return "loadedWorkspace";
}

export function paperWorkspaceLiveStatusKey(candidateState = null, workspaceState = null) {
  if (workspaceState?.permanentNoteContinuityReason === "stale_translation_signature") {
    return "translationNeedsFreshPermanentCandidate";
  }
  if (workspaceState?.permanentNoteContinuityReason === "saved_permanent_note") {
    return "restoredSavedPermanentNoteForSelectedPaper";
  }
  if (candidateState?.hasLocalChanges && cleanText(workspaceState?.selectedPermanentCandidateId)) {
    return "translationNeedsResaveBeforePermanentNote";
  }
  if (candidateState?.hasLocalChanges && candidateState?.hasSavedTranslation) {
    return "translationNeedsResaveBeforePermanentCandidate";
  }
  if (candidateState?.hasLocalChanges) {
    return "translationNeedsSaveBeforePermanentCandidate";
  }
  if (cleanText(workspaceState?.selectedPermanentCandidateId)) {
    return "restoredPermanentCandidateForSelectedPaper";
  }
  if (candidateState?.hasSavedTranslation) {
    if (candidateState?.supportsNextStep === false) {
      return "savedTranslationNeedsDraftSupport";
    }
    return "savedTranslationReadyForPermanentCandidate";
  }
  if (cleanText(candidateState?.selectedCandidateId)) {
    return "selectedCandidate";
  }
  return "loadedWorkspace";
}

export function draftContinuationActionState(candidateState = null, workspaceState = null) {
  if (!cleanText(candidateState?.selectedCandidateId)) {
    return {
      tone: "",
      key: "select_candidate",
      label: "先选择一条候选，再继续写 draft。"
    };
  }
  if (workspaceState?.permanentNoteContinuityReason === "stale_translation_signature") {
    return {
      tone: "warn",
      key: "refresh_permanent_candidate",
      label: "Step 4 仍对应旧版转述。先重新生成永久笔记候选，再继续写 draft。"
    };
  }
  if (candidateState?.hasLocalChanges && cleanText(workspaceState?.selectedPermanentCandidateId)) {
    return {
      tone: "warn",
      key: "update_translation_affects_step_four",
      label: "当前 Step 3 还有未保存改动。先更新这条转述，再更新或确认永久笔记，之后再继续写 draft。"
    };
  }
  if (candidateState?.hasLocalChanges && candidateState?.hasSavedTranslation) {
    return {
      tone: "warn",
      key: "update_translation",
      label: "当前 Step 3 还有未保存改动。先更新这条转述，再继续写 draft。"
    };
  }
  if (candidateState?.hasLocalChanges) {
    return {
      tone: "warn",
      key: "save_translation",
      label: "先保存这条转述，再继续写 draft。"
    };
  }
  if (candidateState?.hasSavedTranslation && candidateState?.supportsNextStep === false) {
    return {
      tone: "warn",
      key: "fill_support",
      label: "relation 和 boundary 还不够支撑继续写 draft。先补全它们，再进入下一步。"
    };
  }
  if (workspaceState?.permanentNoteContinuityReason === "saved_permanent_note") {
    return {
      tone: "ok",
      key: "review_saved_permanent_note",
      label: "这条路径已连到已保存的永久笔记。继续写 draft 前，先回看 originality / authorship。"
    };
  }
  if (cleanText(workspaceState?.selectedPermanentCandidateId)) {
    return {
      tone: "ok",
      key: "review_permanent_candidate",
      label: "这条路径已连到永久笔记候选。继续写 draft 前，先确认 Step 4 的 originality / authorship。"
    };
  }
  if (candidateState?.hasSavedTranslation) {
    return {
      tone: "ok",
      key: "draft_ready",
      label: "这条转述已经具备继续写 draft 的最小条件。"
    };
  }
  return {
    tone: "warn",
    key: "save_translation",
    label: "先保存这条转述，再继续写 draft。"
  };
}

export function draftBriefActionState(candidateState = null, workspaceState = null) {
  const continuation = draftContinuationActionState(candidateState, workspaceState);
  const blockedKeys = new Set([
    "select_candidate",
    "refresh_permanent_candidate",
    "update_translation_affects_step_four",
    "update_translation",
    "save_translation",
    "fill_support"
  ]);
  if (blockedKeys.has(continuation.key)) {
    return {
      enabled: false,
      label: "当前还不能复制 draft brief"
    };
  }
  return {
    enabled: true,
    label: "复制 draft brief"
  };
}

export function draftBriefButtonLabel(draftBriefAction = null, draftContinuationAction = null) {
  if (!draftBriefAction?.enabled) {
    switch (cleanText(draftContinuationAction?.key)) {
      case "save_translation":
        return "先保存转述";
      case "fill_support":
        return "先补 relation / boundary";
      case "update_translation":
      case "update_translation_affects_step_four":
        return "先更新转述";
      case "refresh_permanent_candidate":
        return "先刷新 Step 4";
      case "select_candidate":
        return "先选择候选";
      default:
        return cleanText(draftBriefAction?.label) || "当前还不能复制 draft brief";
    }
  }
  switch (cleanText(draftContinuationAction?.key)) {
    case "review_saved_permanent_note":
      return "复制 brief，回看已保存路径";
    case "review_permanent_candidate":
      return "复制 brief，回看 Step 4";
    case "draft_ready":
    default:
      return "复制 brief，继续写 draft";
  }
}

export function draftKickoffActionState(candidateState = null, workspaceState = null, kickoffState = null) {
  const continuation = draftContinuationActionState(candidateState, workspaceState);
  const blockedLabels = {
    select_candidate: "先选择候选",
    refresh_permanent_candidate: "先刷新 Step 4",
    update_translation_affects_step_four: "先更新转述",
    update_translation: "先更新转述",
    save_translation: "先保存转述",
    fill_support: "先补 relation / boundary"
  };
  if (blockedLabels[continuation.key]) {
    return {
      enabled: false,
      key: continuation.key,
      label: blockedLabels[continuation.key]
    };
  }
  if (kickoffState?.isStale) {
    return {
      enabled: true,
      key: "refresh_local_draft",
      label: "载入新版 brief，更新本地 draft"
    };
  }
  if (kickoffState?.hasContent) {
    return {
      enabled: true,
      key: "resume_local_draft",
      label: "继续本地 draft"
    };
  }
  if (continuation.key === "review_saved_permanent_note") {
    return {
      enabled: true,
      key: "start_local_draft_saved_path",
      label: "载入 brief，回看已保存路径"
    };
  }
  if (continuation.key === "review_permanent_candidate") {
    return {
      enabled: true,
      key: "start_local_draft_step_four",
      label: "载入 brief，回看 Step 4"
    };
  }
  return {
    enabled: true,
    key: "start_local_draft",
    label: "载入 brief，开始本地 draft"
  };
}

export function resolveDraftKickoffState(form = null, currentTranslationSignature = "") {
  const content = cleanText(form?.draftKickoffText);
  const translationSignature = cleanText(form?.draftKickoffSignature);
  const previousContent = cleanText(form?.draftKickoffPreviousText);
  const previousSignature = cleanText(form?.draftKickoffPreviousSignature);
  const replacementSignature = cleanText(form?.draftKickoffReplacementSignature);
  const cleanCurrentTranslationSignature = cleanText(currentTranslationSignature);
  const isStale = Boolean(
    content && translationSignature && cleanCurrentTranslationSignature && translationSignature !== cleanCurrentTranslationSignature
  );
  const showPreviousSnapshot = Boolean(
    previousContent &&
      previousSignature &&
      replacementSignature &&
      translationSignature &&
      replacementSignature === translationSignature
  );

  return {
    content,
    translationSignature,
    currentTranslationSignature: cleanCurrentTranslationSignature,
    hasContent: Boolean(content),
    isStale,
    previousSnapshot: showPreviousSnapshot
      ? {
          content: previousContent,
          previousSignature,
          replacementSignature
        }
      : null
  };
}

export function resolveAdoptedDraftKickoff(form = null, kickoffState = null, fallbackTranslationSignature = "") {
  const adoptedContent = cleanText(kickoffState?.previousSnapshot?.content);
  const currentContent = cleanText(form?.draftKickoffText);
  const currentTranslationSignature =
    cleanText(kickoffState?.currentTranslationSignature) || cleanText(fallbackTranslationSignature);
  if (!adoptedContent || !currentTranslationSignature) return null;

  return {
    draftKickoffText: adoptedContent,
    draftKickoffSignature: currentTranslationSignature,
    draftKickoffPreviousText: currentContent,
    draftKickoffPreviousSignature: currentTranslationSignature,
    draftKickoffReplacementSignature: currentTranslationSignature
  };
}

export function resolveRefreshedDraftKickoff(
  form = null,
  kickoffState = null,
  nextKickoffContent = "",
  nextTranslationSignature = ""
) {
  const refreshedContent = cleanText(nextKickoffContent);
  const refreshedTranslationSignature = cleanText(nextTranslationSignature);
  if (!refreshedContent || !refreshedTranslationSignature) return null;

  const currentContent = cleanText(form?.draftKickoffText);
  const currentStoredSignature = cleanText(form?.draftKickoffSignature);
  const previousContent = cleanText(form?.draftKickoffPreviousText);
  const previousSignature = cleanText(form?.draftKickoffPreviousSignature);
  const replacementSignature = cleanText(form?.draftKickoffReplacementSignature);
  const shouldCapturePreviousSnapshot = Boolean(kickoffState?.isStale && kickoffState?.hasContent && currentContent && currentStoredSignature);
  const snapshotToPersist = shouldCapturePreviousSnapshot
    ? {
        content: currentContent,
        previousSignature: currentStoredSignature,
        replacementSignature: refreshedTranslationSignature
      }
    : null;

  return {
    draftKickoffText: refreshedContent,
    draftKickoffSignature: refreshedTranslationSignature,
    draftKickoffPreviousText: shouldCapturePreviousSnapshot ? currentContent : previousContent,
    draftKickoffPreviousSignature: shouldCapturePreviousSnapshot ? currentStoredSignature : previousSignature,
    draftKickoffReplacementSignature: shouldCapturePreviousSnapshot
      ? refreshedTranslationSignature
      : replacementSignature,
    snapshotToPersist
  };
}

export function draftContinuationBrief(
  workspace = null,
  storedSelection = null,
  candidateId = "",
  selectedPermanentCandidateId = "",
  draftInput = null
) {
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  const candidate = draft.candidate;
  if (!cleanText(candidate?.id)) {
    return { title: "", markdown: "", preview: "" };
  }
  const selectedPermanent = selectedAlignedPermanentCandidate(workspace, selectedPermanentCandidateId);
  const continuity = permanentNoteContinuityState(
    workspace,
    storedSelection,
    selectedPermanentCandidateId,
    candidateId,
    draftInput
  );
  const stepFourLabel =
    continuity.reason === "saved_permanent_note"
      ? "已保存永久笔记路径"
      : cleanText(selectedPermanent?.id) &&
        cleanText(selectedPermanent?.paper_candidate_id) === cleanText(candidate?.id)
      ? "已生成永久笔记候选"
      : "尚未生成永久笔记候选";
  const title = candidateLabel(candidate);
  const paraphraseText = cleanText(draft.paraphraseText) || "未填写";
  const relationToQuestion = cleanText(draft.relationToQuestion) || "未填写";
  const boundaryOrCondition = cleanText(draft.boundaryOrCondition) || "未填写";
  const permanentTitle =
    cleanText(selectedPermanent?.paper_candidate_id) === cleanText(candidate?.id)
      ? cleanText(selectedPermanent?.title || selectedPermanent?.id) || "未命名永久笔记候选"
      : "";
  const savedPermanentNoteId =
    continuity.reason === "saved_permanent_note" ? cleanText(selectedPermanent?.savedPermanentNoteId) : "";
  const draftContinuationAction = draftContinuationActionState(
    {
      selectedCandidateId: cleanText(candidate?.id),
      hasSavedTranslation: draft.hasSavedTranslation,
      hasLocalChanges: draft.hasLocalChanges,
      supportsNextStep: Boolean(cleanText(draft.relationToQuestion) && cleanText(draft.boundaryOrCondition))
    },
    {
      selectedPermanentCandidateId: cleanText(selectedPermanent?.id),
      permanentNoteContinuityReason: continuity.reason
    }
  );
  const lines = [
    `# Draft brief: ${title}`,
    "",
    `- Candidate ID: ${cleanText(candidate.id)}`,
    `- Candidate kind: ${candidateKindLabel(candidate.candidateKind)}`,
    `- Step 4: ${stepFourLabel}${permanentTitle ? ` (${permanentTitle})` : ""}`,
    ...(savedPermanentNoteId ? [`- Saved permanent note: ${savedPermanentNoteId}`] : []),
    `- Next action: ${cleanText(draftContinuationAction?.label)}`,
    "",
    "## Paraphrase",
    paraphraseText,
    "",
    "## Relation to question",
    relationToQuestion,
    "",
    "## Boundary or condition",
    boundaryOrCondition
  ];
  return {
    title,
    markdown: lines.join("\n"),
    stepFourLabel: `Step 4: ${stepFourLabel}${permanentTitle ? ` (${permanentTitle})` : ""}`,
    savedPermanentNoteId,
    nextAction: cleanText(draftContinuationAction?.label),
    preview: [
      `Paraphrase: ${paraphraseText}`,
      `Relation: ${relationToQuestion}`,
      `Boundary: ${boundaryOrCondition}`,
      `Step 4: ${stepFourLabel}${permanentTitle ? ` (${permanentTitle})` : ""}`,
      ...(savedPermanentNoteId ? [`Saved note: ${savedPermanentNoteId}`] : []),
      `Next: ${cleanText(draftContinuationAction?.label)}`
    ].join("\n")
  };
}

export function resolveRecentDraftBriefCopy(workspaceSelection = null, candidateId = "", translationSignature = "") {
  const cleanCandidateId = cleanText(candidateId);
  const cleanTranslationSignature = cleanText(translationSignature);
  if (!cleanCandidateId || !cleanTranslationSignature) return null;
  const storedCopy = workspaceSelection?.draftBriefByCandidate?.[cleanCandidateId];
  if (!storedCopy || cleanText(storedCopy.translationSignature) !== cleanTranslationSignature) return null;
  const storedCandidateId = cleanText(storedCopy.candidateId);
  if (storedCandidateId && storedCandidateId !== cleanCandidateId) return null;
  return storedCopy;
}

export function resolveDraftBriefState(
  workspace = null,
  workspaceSelection = null,
  candidateId = "",
  selectedPermanentCandidateId = "",
  draftInput = null
) {
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  const continuityReason = permanentNoteContinuityState(
    workspace,
    workspaceSelection,
    selectedPermanentCandidateId,
    candidateId,
    draftInput
  ).reason;
  const candidateState = {
    selectedCandidateId: cleanText(candidateId),
    hasSavedTranslation: draft.hasSavedTranslation,
    hasLocalChanges: draft.hasLocalChanges,
    supportsNextStep: Boolean(cleanText(draft.relationToQuestion) && cleanText(draft.boundaryOrCondition))
  };
  const workspaceState = {
    selectedPermanentCandidateId: cleanText(selectedPermanentCandidateId),
    permanentNoteContinuityReason: continuityReason
  };
  const draftBrief = draftContinuationBrief(
    workspace,
    workspaceSelection,
    candidateId,
    selectedPermanentCandidateId,
    draftInput
  );
  const currentTranslationSignature = translationContinuitySignature(workspace, candidateId, draftInput);
  const recentDraftBriefCopy = resolveRecentDraftBriefCopy(
    workspaceSelection,
    candidateId,
    currentTranslationSignature
  );

  return {
    draft,
    draftBriefAction: draftBriefActionState(candidateState, workspaceState),
    draftContinuationAction: draftContinuationActionState(candidateState, workspaceState),
    draftBrief,
    recentDraftBriefCopy,
    currentTranslationSignature,
    continuityReason
  };
}
