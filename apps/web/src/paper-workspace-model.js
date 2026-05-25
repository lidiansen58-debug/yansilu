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

export function resolveSelectedPaperCandidateState(workspace = null, options = {}) {
  const selectedCandidateId = nextSelectedCandidateId(
    workspace,
    options.preferredCandidateId || "",
    {
      candidateIdHasLocalDraft:
        typeof options.candidateIdHasLocalDraft === "function" ? options.candidateIdHasLocalDraft : () => false
    }
  );
  const draft = translationDraftForCandidate(
    workspace,
    selectedCandidateId,
    resolvedStoredTranslationDraft(
      typeof options.readStoredTranslationDraft === "function"
        ? options.readStoredTranslationDraft(selectedCandidateId)
        : null
    )
  );
  return {
    selectedCandidateId,
    paraphraseText: draft.paraphraseText,
    relationToQuestion: draft.relationToQuestion,
    boundaryOrCondition: draft.boundaryOrCondition,
    hasSavedTranslation: draft.hasSavedTranslation,
    hasLocalChanges: draft.hasLocalChanges
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

export function canCreatePermanentCandidate(workspace = null, candidateId = "") {
  const draft = translationDraftForCandidate(workspace, candidateId);
  return Boolean(cleanText(draft.candidate?.id) && cleanText(draft.translation?.id) && cleanText(draft.translation?.paraphraseText));
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
  if (cleanText(preferredId) && cleanText(preferred?.id)) return cleanText(preferred.id);
  const candidateMatchedPermanent = selectedAlignedPermanentCandidate(workspace, selectedPaperCandidateId);
  if (selectedPaperCandidateId && cleanText(candidateMatchedPermanent?.id)) return cleanText(candidateMatchedPermanent.id);
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
      fallbackToFirst: false
    }
  );
  const permanentCandidate = selectedAlignedPermanentCandidate(workspace, selectedPermanentCandidateId);
  return {
    selectedCandidateId,
    selectedPermanentCandidateId,
    saveStatus: permanentCandidatePersistenceDefaults(permanentCandidate, {
      saveStatus: resolvedSaveStatusForPermanentCandidate(storedSelection, selectedPermanentCandidateId)
    }).saveStatus,
    confirmAuthorship: resolvedConfirmAuthorshipForPermanentCandidate(storedSelection, permanentCandidate)
  };
}
