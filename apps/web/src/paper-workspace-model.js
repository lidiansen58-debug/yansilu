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

export function paperWorkspaceFormState(rawInput = {}, fallbackForm = null) {
  return {
    paperId: rawInput?.paperId || fallbackForm?.paperId || "",
    sourceId: rawInput?.sourceId || "",
    title: rawInput?.title || "",
    notebookName: rawInput?.notebookName || "NotebookLM",
    summary: rawInput?.summary || "",
    qa: rawInput?.qa || "",
    studyGuide: rawInput?.studyGuide || "",
    notes: rawInput?.notes || "",
    paraphraseText: rawInput?.paraphraseText || "",
    relationToQuestion: rawInput?.relationToQuestion || "",
    boundaryOrCondition: rawInput?.boundaryOrCondition || "",
    draftKickoffText: rawInput?.draftKickoffText || fallbackForm?.draftKickoffText || "",
    confirmAuthorship: rawInput?.confirmAuthorship === true,
    saveStatus: rawInput?.saveStatus || "active"
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

export const PAPER_WORKSPACE_STATUS = {
  loading: "\u5904\u7406\u4e2d...",
  errorPrefix: "\u64cd\u4f5c\u5931\u8d25\uff1a",
  createdWorkspace: "\u8bba\u6587\u5de5\u4f5c\u53f0\u5df2\u521b\u5efa",
  workspaceReadyForNotebookDraft: "\u4e0b\u4e00\u6b65\uff1a\u7c98\u8d34 NotebookLM \u8f93\u51fa\uff0c\u5148\u751f\u6210 literature \u5019\u9009\u3002",
  loadedWorkspace: "\u8bba\u6587\u5de5\u4f5c\u53f0\u5df2\u8bfb\u53d6",
  addedNotebookDraft: "NotebookLM \u5185\u5bb9\u5df2\u8f6c\u6210 literature \u5019\u9009",
  savedTranslation: "\u7528\u6237\u8f6c\u8ff0\u5df2\u4fdd\u5b58",
  createdPermanentCandidate: "\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u5df2\u751f\u6210",
  translationNeedsSaveBeforePermanentCandidate:
    "\u5df2\u6062\u590d\u8fd9\u6761\u5019\u9009\u7684\u672c\u5730\u672a\u4fdd\u5b58\u8f6c\u8ff0\u8349\u7a3f\u3002\u5148\u4fdd\u5b58\u8fd9\u6761\u8f6c\u8ff0\uff0c\u518d\u8fdb\u5165\u6c38\u4e45\u7b14\u8bb0\u5019\u9009",
  translationNeedsResaveBeforePermanentCandidate:
    "\u5148\u4fdd\u5b58\u5f53\u524d\u8fd9\u6761\u8f6c\u8ff0\u6539\u52a8\uff0c\u518d\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009",
  translationNeedsFreshPermanentCandidate:
    "\u8fd9\u6761\u8f6c\u8ff0\u5df2\u7ecf\u66f4\u65b0\u8fc7\uff0c\u5f53\u524d Step 4 \u5019\u9009\u5df2\u8fc7\u671f\u3002\u5148\u91cd\u65b0\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009",
  translationNeedsResaveBeforePermanentNote:
    "\u5f53\u524d Step 3 \u7684\u8f6c\u8ff0\u5df2\u53d1\u751f\u53d8\u5316\u3002\u5148\u91cd\u65b0\u4fdd\u5b58\u8fd9\u6761\u8f6c\u8ff0\uff0c\u518d\u66f4\u65b0\u6216\u786e\u8ba4\u6c38\u4e45\u7b14\u8bb0",
  savedPermanentNote: "\u6c38\u4e45\u7b14\u8bb0\u5df2\u4fdd\u5b58",
  restoredLocalTranslationDraftOverSavedTranslation:
    "\u5df2\u6062\u590d\u8fd9\u6761\u5019\u9009\u7684\u672c\u5730\u672a\u4fdd\u5b58\u8349\u7a3f\uff0c\u4f60\u53ef\u4ee5\u7ee7\u7eed\u4fee\u6539\u540e\u518d\u4fdd\u5b58\uff0c\u4e5f\u53ef\u4ee5\u56de\u770b\u5df2\u4fdd\u5b58\u7684\u8f6c\u8ff0\u8def\u5f84\u3002",
  restoredLocalTranslationDraftForPermanentNote:
    "\u5df2\u6062\u590d\u8fd9\u6761\u5019\u9009\u7684\u672c\u5730\u672a\u4fdd\u5b58\u8349\u7a3f\u3002\u8fd9\u6761\u8def\u5f84\u5df2\u7ecf\u8fde\u5230 Step 4\uff0c\u6240\u4ee5\u4e0b\u4e00\u6b65\u662f\u5148\u91cd\u65b0\u4fdd\u5b58\u8fd9\u6761\u8f6c\u8ff0\uff0c\u518d\u66f4\u65b0\u6216\u786e\u8ba4\u6c38\u4e45\u7b14\u8bb0\u3002",
  restoredLocalTranslationDraftForSavedPermanentNote:
    "\u5df2\u6062\u590d\u8fd9\u6761\u5019\u9009\u7684\u672c\u5730\u672a\u4fdd\u5b58\u8349\u7a3f\u3002\u8fd9\u6761\u8def\u5f84\u5df2\u7ecf\u8fde\u5230\u5df2\u4fdd\u5b58\u7684\u6c38\u4e45\u7b14\u8bb0\uff0c\u6240\u4ee5\u4e0b\u4e00\u6b65\u662f\u5148\u91cd\u65b0\u4fdd\u5b58\u8fd9\u6761\u8f6c\u8ff0\uff0c\u518d\u66f4\u65b0\u6216\u56de\u770b\u8fd9\u6761\u6c38\u4e45\u7b14\u8bb0\u8def\u5f84\u3002",
  restoredLocalTranslationDraft:
    "\u5df2\u6062\u590d\u8fd9\u6761\u5019\u9009\u7684\u672c\u5730\u672a\u4fdd\u5b58\u8f6c\u8ff0\u8349\u7a3f\uff0c\u53ef\u4ee5\u7ee7\u7eed\u4fee\u6539\u540e\u518d\u4fdd\u5b58\u3002",
  restoredSavedTranslation:
    "\u5df2\u6062\u590d\u8fd9\u6761\u5019\u9009\u7684\u7528\u6237\u8f6c\u8ff0\uff0c\u53ef\u4ee5\u7ee7\u7eed\u4fee\u6539\u6216\u8fdb\u5165\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002",
  restoredSavedPermanentNoteForSelectedPaper:
    "\u5df2\u5bf9\u9f50\u5230\u8fd9\u6761\u5019\u9009\u5df2\u4fdd\u5b58\u7684\u6c38\u4e45\u7b14\u8bb0\u8def\u5f84\uff0c\u53ef\u4ee5\u56de\u770b originality \u98ce\u9669\u3001authorship \u786e\u8ba4\u548c\u4fdd\u5b58\u7ed3\u679c\u3002",
  restoredPermanentCandidateForSelectedPaper:
    "\u5df2\u5bf9\u9f50\u5230\u8fd9\u6761\u5019\u9009\u7684\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\uff0c\u53ef\u4ee5\u7ee7\u7eed\u786e\u8ba4\u4fdd\u5b58\u6216\u56de\u770b originality \u98ce\u9669\u3002",
  savedTranslationReadyForPermanentCandidate:
    "\u8fd9\u6761\u5019\u9009\u7684\u8f6c\u8ff0\u5df2\u5c31\u7eea\uff0c\u4f46\u8fd8\u6ca1\u6709\u751f\u6210\u5bf9\u5e94\u7684\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002\u4e0b\u4e00\u6b65\u53ef\u4ee5\u76f4\u63a5\u751f\u6210\u3002",
  savedTranslationNeedsDraftSupport:
    "\u8fd9\u6761\u5019\u9009\u7684\u8f6c\u8ff0\u5df2\u4fdd\u5b58\uff0c\u4f46 relation \u548c boundary \u8fd8\u4e0d\u8db3\u4ee5\u652f\u6491\u4e0b\u4e00\u6b65\u3002\u5148\u8865\u5168\u5b83\u4eec\uff0c\u518d\u8fdb\u5165\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u6216\u7ee7\u7eed\u5199 draft\u3002",
  selectedCandidate:
    "\u5df2\u9009\u62e9\u5019\u9009\u3002\u5148\u7528\u81ea\u5df1\u7684\u8bdd\u5b8c\u6210\u8f6c\u8ff0\u5e76\u4fdd\u5b58\uff0c\u518d\u8fdb\u5165\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002",
  restoredPermanentCandidate:
    "\u5df2\u6062\u590d\u8fd9\u6761\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\uff0c\u53ef\u7ee7\u7eed\u786e\u8ba4\u4fdd\u5b58\u6216\u56de\u770b\u98ce\u9669\u63d0\u793a\u3002",
  connectedApiPrefix: "\u5df2\u8fde\u63a5 API\uff1a"
};

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

export function resolveTranslationRuntimeContext(workspace = null, candidateId = "", input = null) {
  const hasExplicitInput = input !== null && input !== undefined;
  const draftInput = normalizeTranslationDraftInput(input || {});
  return {
    draftInput,
    translationSignature: translationContinuitySignature(
      workspace,
      candidateId,
      hasExplicitInput ? draftInput : null
    )
  };
}

export function resolvedStoredTranslationDraft(storedDraft = null) {
  return normalizeTranslationDraftInput(storedDraft || {});
}

export function translationFormState(candidateState = null) {
  return {
    paraphraseText: cleanText(candidateState?.paraphraseText),
    relationToQuestion: cleanText(candidateState?.relationToQuestion),
    boundaryOrCondition: cleanText(candidateState?.boundaryOrCondition)
  };
}

export function workspaceResumeFormState(workspace = null, candidateState = null, workspaceState = null) {
  return {
    paperId: cleanText(workspace?.paperId),
    sourceId: cleanText(workspace?.sourceId),
    title: cleanText(workspace?.title),
    saveStatus: cleanText(workspaceState?.saveStatus) || "active",
    confirmAuthorship: workspaceState?.confirmAuthorship === true,
    ...translationFormState(candidateState)
  };
}

export function translationDraftInputFromForm(form = null) {
  return {
    paraphraseText: cleanText(form?.paraphraseText),
    relationToQuestion: cleanText(form?.relationToQuestion),
    boundaryOrCondition: cleanText(form?.boundaryOrCondition)
  };
}

export function permanentCandidateFormState(
  selectedPermanent = null,
  storedSelection = null,
  selectedPermanentCandidateId = ""
) {
  return {
    saveStatus: permanentCandidatePersistenceDefaults(selectedPermanent, {
      saveStatus: resolvedSaveStatusForPermanentCandidate(storedSelection, selectedPermanentCandidateId)
    }).saveStatus,
    confirmAuthorship: resolvedConfirmAuthorshipForPermanentCandidate(storedSelection, selectedPermanent)
  };
}

export function resolveStoredTranslationDraft(storedDraft = null, paperId = "", candidateId = "") {
  const draft = storedDraft && typeof storedDraft === "object" ? storedDraft : {};
  const cleanPaperId = cleanText(paperId);
  const cleanCandidateId = cleanText(candidateId);
  const storedPaperId = cleanText(draft.paperId);
  const storedCandidateId = cleanText(draft.candidateId);
  if ((storedPaperId && storedPaperId !== cleanPaperId) || (storedCandidateId && storedCandidateId !== cleanCandidateId)) {
    return null;
  }
  const normalizedDraft = resolvedStoredTranslationDraft(draft);
  if (!cleanText(normalizedDraft.paraphraseText) && !cleanText(normalizedDraft.relationToQuestion) && !cleanText(normalizedDraft.boundaryOrCondition)) {
    return null;
  }
  return normalizedDraft;
}

export function paperWorkspacePaperStorageKey(prefix = "", paperId = "") {
  const cleanPrefix = cleanText(prefix);
  const cleanPaperId = cleanText(paperId);
  if (!cleanPrefix || !cleanPaperId) return "";
  return `${cleanPrefix}:${cleanPaperId}`;
}

export function paperWorkspaceCurrentPaperId(workspace = null, form = null) {
  return cleanText(workspace?.paperId || form?.paperId);
}

export function paperWorkspaceLoadedPaperId(workspace = null) {
  return cleanText(workspace?.paperId);
}

export function paperWorkspaceCandidateStorageKey(prefix = "", paperId = "", candidateId = "") {
  const cleanPrefix = cleanText(prefix);
  const cleanPaperId = cleanText(paperId);
  const cleanCandidateId = cleanText(candidateId);
  if (!cleanPrefix || !cleanPaperId || !cleanCandidateId) return "";
  return `${cleanPrefix}:${cleanPaperId}:${cleanCandidateId}`;
}

export function translationDraftStorageKey(paperId = "", candidateId = "") {
  return paperWorkspaceCandidateStorageKey("yansilu:paper-workspace:translation-draft", paperId, candidateId);
}

export function workspaceSelectionStorageKey(paperId = "") {
  return paperWorkspacePaperStorageKey("yansilu:paper-workspace:selection", paperId);
}

export function draftKickoffStorageKey(paperId = "", candidateId = "") {
  return paperWorkspaceCandidateStorageKey("yansilu:paper-workspace:draft-kickoff", paperId, candidateId);
}

export function draftKickoffSnapshotStorageKey(paperId = "", candidateId = "") {
  return paperWorkspaceCandidateStorageKey("yansilu:paper-workspace:draft-kickoff-snapshot", paperId, candidateId);
}

export function paperWorkspaceCandidateStorageState(paperId = "", candidateId = "") {
  const cleanPaperId = cleanText(paperId);
  const cleanCandidateId = cleanText(candidateId);
  if (!cleanPaperId || !cleanCandidateId) return null;
  return {
    paperId: cleanPaperId,
    candidateId: cleanCandidateId
  };
}

export function resolvePersistedTranslationDraft(draftInput = null, paperId = "", candidateId = "") {
  const cleanPaperId = cleanText(paperId);
  const cleanCandidateId = cleanText(candidateId);
  if (!cleanPaperId || !cleanCandidateId) return null;
  const normalizedDraft = normalizeTranslationDraftInput(draftInput || {});
  if (!cleanText(normalizedDraft.paraphraseText) && !cleanText(normalizedDraft.relationToQuestion) && !cleanText(normalizedDraft.boundaryOrCondition)) {
    return null;
  }
  return {
    paperId: cleanPaperId,
    candidateId: cleanCandidateId,
    ...normalizedDraft
  };
}

export function resolvePersistedTranslationDraftRecord(draftInput = null, paperId = "", candidateId = "", updatedAt = "") {
  const persistedDraft = resolvePersistedTranslationDraft(draftInput, paperId, candidateId);
  if (!persistedDraft) return null;
  return {
    ...persistedDraft,
    updatedAt: cleanText(updatedAt) || new Date().toISOString()
  };
}

export function resolvePersistedTranslationDraftRecordForCandidate(
  workspace = null,
  candidateId = "",
  draftInput = null,
  paperId = "",
  updatedAt = ""
) {
  const cleanCandidateId = cleanText(candidateId);
  if (!translationDraftHasLocalChanges(workspace, cleanCandidateId, draftInput)) return null;
  return resolvePersistedTranslationDraftRecord(draftInput, paperId, cleanCandidateId, updatedAt);
}

export function resolveStoredDraftKickoff(storedKickoff = null, paperId = "", candidateId = "") {
  const kickoff = storedKickoff && typeof storedKickoff === "object" ? storedKickoff : {};
  const cleanPaperId = cleanText(paperId);
  const cleanCandidateId = cleanText(candidateId);
  const storedPaperId = cleanText(kickoff.paperId);
  const storedCandidateId = cleanText(kickoff.candidateId);
  if ((storedPaperId && storedPaperId !== cleanPaperId) || (storedCandidateId && storedCandidateId !== cleanCandidateId)) {
    return null;
  }
  const content = cleanText(kickoff.content);
  const translationSignature = cleanText(kickoff.translationSignature);
  if (!content || !translationSignature) return null;
  return {
    content,
    translationSignature,
    updatedAt: cleanText(kickoff.updatedAt)
  };
}

export function resolveStoredDraftKickoffSnapshot(storedSnapshot = null, paperId = "", candidateId = "") {
  const snapshot = storedSnapshot && typeof storedSnapshot === "object" ? storedSnapshot : {};
  const cleanPaperId = cleanText(paperId);
  const cleanCandidateId = cleanText(candidateId);
  const storedPaperId = cleanText(snapshot.paperId);
  const storedCandidateId = cleanText(snapshot.candidateId);
  if ((storedPaperId && storedPaperId !== cleanPaperId) || (storedCandidateId && storedCandidateId !== cleanCandidateId)) {
    return null;
  }
  const content = cleanText(snapshot.content);
  const previousSignature = cleanText(snapshot.previousSignature);
  const replacementSignature = cleanText(snapshot.replacementSignature);
  if (!content || !previousSignature || !replacementSignature) return null;
  return {
    content,
    previousSignature,
    replacementSignature,
    updatedAt: cleanText(snapshot.updatedAt)
  };
}

export function resolvePersistedDraftKickoff(
  storedKickoff = null,
  paperId = "",
  candidateId = "",
  overrides = {}
) {
  const cleanPaperId = cleanText(paperId);
  const cleanCandidateId = cleanText(candidateId);
  if (!cleanPaperId || !cleanCandidateId) return null;
  const persistedKickoff = resolveStoredDraftKickoff(
    {
      ...(storedKickoff && typeof storedKickoff === "object" ? storedKickoff : {}),
      paperId: cleanPaperId,
      candidateId: cleanCandidateId,
      content: overrides.content,
      translationSignature: overrides.translationSignature,
      updatedAt: cleanText(overrides.updatedAt)
    },
    cleanPaperId,
    cleanCandidateId
  );
  if (!persistedKickoff) return null;
  return {
    paperId: cleanPaperId,
    candidateId: cleanCandidateId,
    ...persistedKickoff
  };
}

export function resolvePersistedDraftKickoffFromForm(form = null, paperId = "", candidateId = "", overrides = {}) {
  return resolvePersistedDraftKickoff(null, paperId, candidateId, {
    content: overrides.content ?? form?.draftKickoffText,
    translationSignature: overrides.translationSignature ?? form?.draftKickoffSignature,
    updatedAt: overrides.updatedAt
  });
}

export function resolvePersistedDraftKickoffRecordForCandidate(
  form = null,
  paperId = "",
  candidateId = "",
  overrides = {}
) {
  const cleanCandidateId = cleanText(candidateId);
  if (!cleanCandidateId) return null;
  return resolvePersistedDraftKickoffFromForm(form, paperId, cleanCandidateId, overrides);
}

export function resolvePersistedDraftKickoffSnapshot(
  storedSnapshot = null,
  paperId = "",
  candidateId = "",
  overrides = {}
) {
  const cleanPaperId = cleanText(paperId);
  const cleanCandidateId = cleanText(candidateId);
  if (!cleanPaperId || !cleanCandidateId) return null;
  const persistedSnapshot = resolveStoredDraftKickoffSnapshot(
    {
      ...(storedSnapshot && typeof storedSnapshot === "object" ? storedSnapshot : {}),
      paperId: cleanPaperId,
      candidateId: cleanCandidateId,
      content: overrides.content,
      previousSignature: overrides.previousSignature,
      replacementSignature: overrides.replacementSignature,
      updatedAt: cleanText(overrides.updatedAt)
    },
    cleanPaperId,
    cleanCandidateId
  );
  if (!persistedSnapshot) return null;
  return {
    paperId: cleanPaperId,
    candidateId: cleanCandidateId,
    ...persistedSnapshot
  };
}

export function resolvePersistedDraftKickoffSnapshotFromForm(
  form = null,
  paperId = "",
  candidateId = "",
  snapshot = null,
  overrides = {}
) {
  const normalizedSnapshot = snapshot && typeof snapshot === "object" ? snapshot : null;
  return resolvePersistedDraftKickoffSnapshot(null, paperId, candidateId, {
    content: overrides.content ?? normalizedSnapshot?.content ?? form?.draftKickoffPreviousText,
    previousSignature: overrides.previousSignature ?? normalizedSnapshot?.previousSignature ?? form?.draftKickoffPreviousSignature,
    replacementSignature:
      overrides.replacementSignature ??
      normalizedSnapshot?.replacementSignature ??
      form?.draftKickoffReplacementSignature,
    updatedAt: overrides.updatedAt
  });
}

export function resolvePersistedDraftKickoffSnapshotRecordForCandidate(
  form = null,
  paperId = "",
  candidateId = "",
  snapshot = null,
  overrides = {}
) {
  const cleanCandidateId = cleanText(candidateId);
  if (!cleanCandidateId) return null;
  return resolvePersistedDraftKickoffSnapshotFromForm(form, paperId, cleanCandidateId, snapshot, overrides);
}

export function resolveStoredDraftBriefCopy(storedCopy = null, candidateId = "") {
  const entry = storedCopy && typeof storedCopy === "object" ? storedCopy : {};
  const cleanCandidateId = cleanText(candidateId);
  const storedCandidateId = cleanText(entry.candidateId || cleanCandidateId);
  if (!cleanCandidateId || !storedCandidateId || storedCandidateId !== cleanCandidateId) return null;
  const title = cleanText(entry.title);
  const stepFourPathKey = cleanText(entry.stepFourPathKey);
  const nextActionKey = cleanText(entry.nextActionKey);
  const nextAction = cleanText(entry.nextAction);
  const translationSignature = cleanText(entry.translationSignature);
  if (!title || !translationSignature || !(nextAction || nextActionKey)) return null;
  return {
    candidateId: storedCandidateId,
    stepFourPathKey,
    title,
    nextActionKey,
    nextAction,
    translationSignature,
    copiedAt: cleanText(entry.copiedAt)
  };
}

export function resolvePersistedDraftBriefCopy(storedCopy = null, candidateId = "", overrides = {}) {
  const cleanCandidateId = cleanText(candidateId);
  if (!cleanCandidateId) return null;
  const persistedCopy = resolveStoredDraftBriefCopy(
    {
      ...(storedCopy && typeof storedCopy === "object" ? storedCopy : {}),
      candidateId: cleanCandidateId,
      stepFourPathKey: overrides.stepFourPathKey,
      title: overrides.title,
      nextActionKey: overrides.nextActionKey,
      nextAction: overrides.nextAction,
      translationSignature: overrides.translationSignature,
      copiedAt: cleanText(overrides.copiedAt)
    },
    cleanCandidateId
  );
  if (!persistedCopy) return null;
  return persistedCopy;
}

export function resolvePersistedDraftBriefCopyFromState(
  draftBriefState = null,
  candidateId = "",
  translationSignature = "",
  copiedAt = ""
) {
  const cleanTranslationSignature =
    cleanText(translationSignature) || cleanText(draftBriefState?.currentTranslationSignature);
  return resolvePersistedDraftBriefCopy(null, candidateId, {
    stepFourPathKey: draftBriefState?.draftBrief?.stepFourPathKey,
    title: draftBriefState?.draftBrief?.title,
    nextActionKey: draftBriefState?.draftContinuationAction?.key,
    nextAction: draftBriefState?.draftContinuationAction?.label,
    translationSignature: cleanTranslationSignature,
    copiedAt
  });
}

export function resolveStoredWorkspaceSelection(storedSelection = null, paperId = "") {
  const parsed = storedSelection && typeof storedSelection === "object" ? storedSelection : {};
  const cleanPaperId = cleanText(paperId);
  const storedPaperId = cleanText(parsed.paperId);
  if (cleanPaperId && storedPaperId && storedPaperId !== cleanPaperId) {
    return null;
  }
  const saveStatusByPermanentCandidate =
    parsed.saveStatusByPermanentCandidate && typeof parsed.saveStatusByPermanentCandidate === "object"
      ? Object.fromEntries(
          Object.entries(parsed.saveStatusByPermanentCandidate)
            .map(([candidateId, saveStatus]) => [cleanText(candidateId), cleanText(saveStatus)])
            .filter(([candidateId, saveStatus]) => candidateId && saveStatus)
        )
      : {};
  const confirmAuthorshipByPermanentCandidate =
    parsed.confirmAuthorshipByPermanentCandidate && typeof parsed.confirmAuthorshipByPermanentCandidate === "object"
      ? Object.fromEntries(
          Object.entries(parsed.confirmAuthorshipByPermanentCandidate)
            .map(([candidateId, confirmAuthorship]) => [cleanText(candidateId), confirmAuthorship === true])
            .filter(([candidateId]) => candidateId)
        )
      : {};
  const translationSignatureByPermanentCandidate =
    parsed.translationSignatureByPermanentCandidate && typeof parsed.translationSignatureByPermanentCandidate === "object"
      ? Object.fromEntries(
          Object.entries(parsed.translationSignatureByPermanentCandidate)
            .map(([candidateId, signature]) => [cleanText(candidateId), cleanText(signature)])
            .filter(([candidateId, signature]) => candidateId && signature)
        )
      : {};
  const draftBriefByCandidate =
    parsed.draftBriefByCandidate && typeof parsed.draftBriefByCandidate === "object"
      ? Object.fromEntries(
          Object.entries(parsed.draftBriefByCandidate)
            .map(([candidateId, value]) => [cleanText(candidateId), resolveStoredDraftBriefCopy(value, candidateId)])
            .filter(([, value]) => Boolean(value))
        )
      : {};
  return {
    selectedCandidateId: cleanText(parsed.selectedCandidateId),
    selectedPermanentCandidateId: cleanText(parsed.selectedPermanentCandidateId),
    saveStatus: cleanText(parsed.saveStatus),
    saveStatusByPermanentCandidate,
    confirmAuthorshipByPermanentCandidate,
    translationSignatureByPermanentCandidate,
    draftBriefByCandidate
  };
}

export function resolvePersistedWorkspaceSelection(
  currentSelection = null,
  stateSelection = null,
  overrides = {}
) {
  const current = resolveStoredWorkspaceSelection(currentSelection);
  const selectedPermanentCandidateId = cleanText(
    overrides.selectedPermanentCandidateId ?? stateSelection?.selectedPermanentCandidateId
  );
  const selectedCandidateId = cleanText(overrides.selectedCandidateId ?? stateSelection?.selectedCandidateId);
  const nextSaveStatus = cleanText(overrides.saveStatus ?? stateSelection?.saveStatus);
  const saveStatusByPermanentCandidate = {
    ...(current?.saveStatusByPermanentCandidate || {})
  };
  const confirmAuthorshipByPermanentCandidate = {
    ...(current?.confirmAuthorshipByPermanentCandidate || {})
  };
  const translationSignatureByPermanentCandidate = {
    ...(current?.translationSignatureByPermanentCandidate || {})
  };
  const draftBriefByCandidate = {
    ...(current?.draftBriefByCandidate || {})
  };

  if (selectedPermanentCandidateId && nextSaveStatus) {
    saveStatusByPermanentCandidate[selectedPermanentCandidateId] = nextSaveStatus;
  }
  if (selectedPermanentCandidateId) {
    confirmAuthorshipByPermanentCandidate[selectedPermanentCandidateId] = overrides.confirmAuthorship === true;
  }
  const translationSignature = cleanText(overrides.translationSignature);
  if (selectedPermanentCandidateId && translationSignature) {
    translationSignatureByPermanentCandidate[selectedPermanentCandidateId] = translationSignature;
  }

  const draftBriefCopy = overrides.draftBriefCopy && typeof overrides.draftBriefCopy === "object" ? overrides.draftBriefCopy : null;
  if (draftBriefCopy) {
    const draftBriefCandidateId = cleanText(draftBriefCopy.candidateId || selectedCandidateId);
    if (draftBriefCandidateId) {
      if (draftBriefCopy.clear === true) {
        delete draftBriefByCandidate[draftBriefCandidateId];
      } else {
        const normalizedDraftBriefCopy = resolvePersistedDraftBriefCopy(null, draftBriefCandidateId, {
          ...draftBriefCopy,
          copiedAt: cleanText(draftBriefCopy.copiedAt) || new Date().toISOString()
        });
        if (normalizedDraftBriefCopy) {
          draftBriefByCandidate[draftBriefCandidateId] = normalizedDraftBriefCopy;
        }
      }
    }
  }

  return {
    selectedCandidateId,
    selectedPermanentCandidateId,
    saveStatus: selectedPermanentCandidateId ? nextSaveStatus : "",
    saveStatusByPermanentCandidate,
    confirmAuthorshipByPermanentCandidate,
    translationSignatureByPermanentCandidate,
    draftBriefByCandidate
  };
}

export function resolvePersistedWorkspaceSelectionRecord(
  currentSelection = null,
  paperId = "",
  stateSelection = null,
  overrides = {}
) {
  const cleanPaperId = cleanText(paperId);
  if (!cleanPaperId) return null;
  const selection = resolvePersistedWorkspaceSelection(currentSelection, stateSelection, overrides);
  return {
    paperId: cleanPaperId,
    ...selection,
    updatedAt: cleanText(overrides.updatedAt) || new Date().toISOString()
  };
}

export function workspaceSelectionIds(selectedCandidateId = "", selectedPermanentCandidateId = "") {
  return {
    selectedCandidateId: cleanText(selectedCandidateId),
    selectedPermanentCandidateId: cleanText(selectedPermanentCandidateId)
  };
}

export function workspaceSelectionPersistenceState(
  selectedCandidateId = "",
  selectedPermanentCandidateId = "",
  saveStatus = ""
) {
  return {
    ...workspaceSelectionIds(selectedCandidateId, selectedPermanentCandidateId),
    saveStatus: cleanText(saveStatus)
  };
}

export function workspaceSelectionPersistenceOverrides(
  overrides = {},
  confirmAuthorship = false,
  updatedAt = ""
) {
  return {
    ...(overrides && typeof overrides === "object" ? overrides : {}),
    confirmAuthorship:
      overrides && Object.prototype.hasOwnProperty.call(overrides, "confirmAuthorship")
        ? overrides.confirmAuthorship === true
        : confirmAuthorship === true,
    updatedAt: cleanText(updatedAt) || new Date().toISOString()
  };
}

export function paperWorkspaceTargetId(target = null) {
  return cleanText(target?.id);
}

export function workspaceSelectionInputOverrides(target = null) {
  const targetId = paperWorkspaceTargetId(target);
  if (targetId === "permanentStatusInput") {
    return { saveStatus: target?.value || "active" };
  }
  if (targetId === "confirmAuthorshipInput") {
    return { confirmAuthorship: target?.checked === true };
  }
  return null;
}

export function workspaceSelectionTranslationSignatureOverrides(
  permanentCandidateId = "",
  translationSignature = "",
  confirmAuthorship = false
) {
  const cleanPermanentCandidateId = cleanText(permanentCandidateId);
  const cleanTranslationSignature = cleanText(translationSignature);
  if (!cleanPermanentCandidateId || !cleanTranslationSignature) return null;
  return {
    selectedPermanentCandidateId: cleanPermanentCandidateId,
    translationSignature: cleanTranslationSignature,
    confirmAuthorship: confirmAuthorship === true
  };
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

export function savedTranslationStatusKey(
  permanentNoteContinuityReason = "",
  supportsNextStep = true
) {
  if (cleanText(permanentNoteContinuityReason) === "stale_translation_signature") {
    return "translationNeedsFreshPermanentCandidate";
  }
  if (supportsNextStep === false) {
    return "savedTranslationNeedsDraftSupport";
  }
  return "savedTranslation";
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
    return { enabled: false, key: "create_permanent_candidate", label: "\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009" };
  }
  if (!draft.hasSavedTranslation) {
    return {
      enabled: false,
      key: "save_translation",
      label: draft.hasLocalChanges ? "\u5148\u4fdd\u5b58\u8f6c\u8ff0" : "\u5148\u4fdd\u5b58\u8f6c\u8ff0"
    };
  }
  if (draft.hasLocalChanges) {
    return { enabled: false, key: "update_translation", label: "\u5148\u66f4\u65b0\u8f6c\u8ff0" };
  }
  if (!supportsNextStep) {
    return { enabled: false, key: "fill_support", label: "\u5148\u8865 relation / boundary" };
  }
  if (hasAlignedPermanentCandidate && continuity.reason === "stale_translation_signature") {
    return { enabled: true, key: "refresh_permanent_candidate", label: "\u91cd\u65b0\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009" };
  }
  return { enabled: true, key: "create_permanent_candidate", label: "\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009" };
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

export function baselinePermanentCandidateSignatureToPersist(
  workspace = null,
  storedSelection = null,
  selectedCandidateId = "",
  selectedPermanentCandidateId = "",
  baselineTranslationSignature = ""
) {
  const cleanSelectedCandidateId = cleanText(selectedCandidateId);
  const cleanBaselineTranslationSignature = cleanText(baselineTranslationSignature);
  const permanentCandidate = selectedAlignedPermanentCandidate(workspace, selectedPermanentCandidateId);
  if (!cleanSelectedCandidateId || !cleanBaselineTranslationSignature || !permanentCandidate) return "";
  if (cleanText(permanentCandidate.paper_candidate_id) !== cleanSelectedCandidateId) return "";
  const storedSignature = resolvedTranslationSignatureForPermanentCandidate(storedSelection, permanentCandidate.id);
  if (storedSignature) return "";
  return cleanText(permanentCandidate.id);
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
  if (candidateState?.hasAnyCandidates === false && !cleanText(candidateState?.selectedCandidateId)) {
    return "workspaceReadyForNotebookDraft";
  }
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
  if (candidateState?.hasAnyCandidates === false && !cleanText(candidateState?.selectedCandidateId)) {
    return "workspaceReadyForNotebookDraft";
  }
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

export function continuityStatusTone(statusKey = "") {
  const cleanKey = cleanText(statusKey);
  if (
    cleanKey.startsWith("translationNeeds") ||
    cleanKey === "savedTranslationNeedsDraftSupport" ||
    cleanKey === "restoredLocalTranslationDraftForPermanentNote" ||
    cleanKey === "restoredLocalTranslationDraftForSavedPermanentNote"
  ) {
    return "warn";
  }
  if (
    cleanKey === "restoredSavedPermanentNoteForSelectedPaper" ||
    cleanKey === "restoredPermanentCandidateForSelectedPaper" ||
    cleanKey === "savedTranslationReadyForPermanentCandidate" ||
    cleanKey === "savedPermanentNote"
  ) {
    return "ok";
  }
  return "";
}

export function paperWorkspaceStatusFeedback(
  statusKey = "",
  fallbackKey = "loadedWorkspace",
  defaultTone = "ok"
) {
  const cleanStatusKey = cleanText(statusKey);
  const cleanFallbackKey = cleanText(fallbackKey) || "loadedWorkspace";
  return {
    text:
      PAPER_WORKSPACE_STATUS[cleanStatusKey] ||
      PAPER_WORKSPACE_STATUS[cleanFallbackKey] ||
      PAPER_WORKSPACE_STATUS.loadedWorkspace,
    tone: continuityStatusTone(cleanStatusKey) || cleanText(defaultTone) || "ok"
  };
}

export function normalizePaperWorkspaceStatusFeedback(
  feedback = null,
  fallbackText = PAPER_WORKSPACE_STATUS.loadedWorkspace,
  fallbackTone = "ok"
) {
  return feedback && typeof feedback === "object"
    ? {
        text: cleanText(feedback.text) || cleanText(fallbackText) || PAPER_WORKSPACE_STATUS.loadedWorkspace,
        tone: cleanText(feedback.tone) || cleanText(fallbackTone) || "ok"
      }
    : {
        text: cleanText(feedback) || cleanText(fallbackText) || PAPER_WORKSPACE_STATUS.loadedWorkspace,
        tone: cleanText(fallbackTone) || "ok"
      };
}

export function paperWorkspaceErrorStatusFeedback(error = null) {
  return {
    text: `${PAPER_WORKSPACE_STATUS.errorPrefix}${String(error?.message || error || "unknown error")}`,
    tone: "bad"
  };
}

export function chainedPaperWorkspaceStatusFeedback(baseText = "", continuationStatus = null, defaultTone = "ok") {
  const cleanBaseText = cleanText(baseText);
  const continuationText = cleanText(continuationStatus?.text);
  return {
    text: continuationText ? `${cleanBaseText}。${continuationText}` : cleanBaseText,
    tone: cleanText(continuationStatus?.tone) || cleanText(defaultTone) || "ok"
  };
}

export function translationSaveStatusFeedback(successStatusKey = "savedTranslation") {
  const cleanSuccessStatusKey = cleanText(successStatusKey) || "savedTranslation";
  if (cleanSuccessStatusKey === "savedTranslation") {
    return paperWorkspaceStatusFeedback("savedTranslation", "savedTranslation");
  }
  return chainedPaperWorkspaceStatusFeedback(
    PAPER_WORKSPACE_STATUS.savedTranslation,
    paperWorkspaceStatusFeedback(cleanSuccessStatusKey, "savedTranslation")
  );
}

export function permanentCandidateStatusFeedback(runtimeState = null, resumeStatus = null) {
  const blockedStatusKey = cleanText(runtimeState?.blockedStatusKey);
  if (blockedStatusKey) {
    return paperWorkspaceStatusFeedback(
      blockedStatusKey,
      "translationNeedsResaveBeforePermanentCandidate",
      cleanText(runtimeState?.blockedStatusTone) || "warn"
    );
  }
  return chainedPaperWorkspaceStatusFeedback(
    PAPER_WORKSPACE_STATUS.createdPermanentCandidate,
    resumeStatus
  );
}

export function permanentNoteStatusFeedback(runtimeState = null, resumeStatus = null) {
  const blockedStatusKey = cleanText(runtimeState?.blockedStatusKey);
  if (blockedStatusKey) {
    return paperWorkspaceStatusFeedback(
      blockedStatusKey,
      "translationNeedsResaveBeforePermanentNote",
      cleanText(runtimeState?.blockedStatusTone) || "warn"
    );
  }
  return chainedPaperWorkspaceStatusFeedback(PAPER_WORKSPACE_STATUS.savedPermanentNote, resumeStatus);
}

export function paperWorkspaceActionStatusFeedback(action = "loadedWorkspace", resumeStatus = null) {
  const cleanAction = cleanText(action) || "loadedWorkspace";
  switch (cleanAction) {
    case "createdWorkspace":
      return chainedPaperWorkspaceStatusFeedback(
        PAPER_WORKSPACE_STATUS.createdWorkspace,
        paperWorkspaceStatusFeedback("workspaceReadyForNotebookDraft", "createdWorkspace")
      );
    case "addedNotebookDraft":
      return chainedPaperWorkspaceStatusFeedback(
        PAPER_WORKSPACE_STATUS.addedNotebookDraft,
        resumeStatus
      );
    case "loadedWorkspace":
    default:
      return chainedPaperWorkspaceStatusFeedback(
        PAPER_WORKSPACE_STATUS.loadedWorkspace,
        resumeStatus || paperWorkspaceStatusFeedback("", "loadedWorkspace")
      );
  }
}

export function resolvePaperWorkspaceContinuityStatus(
  workspace = null,
  storedSelection = null,
  candidateId = "",
  selectedPermanentCandidateId = "",
  draftInput = null,
  mode = "live"
) {
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  const candidateState = {
    selectedCandidateId: cleanText(candidateId),
    hasAnyCandidates: Array.isArray(workspace?.candidates) ? workspace.candidates.length > 0 : false,
    hasSavedTranslation: draft.hasSavedTranslation,
    hasLocalChanges: draft.hasLocalChanges,
    supportsNextStep: Boolean(cleanText(draft.relationToQuestion) && cleanText(draft.boundaryOrCondition))
  };
  const workspaceState = {
    selectedPermanentCandidateId: cleanText(selectedPermanentCandidateId),
    permanentNoteContinuityReason: permanentNoteContinuityState(
      workspace,
      storedSelection,
      selectedPermanentCandidateId,
      candidateId,
      draftInput
    ).reason
  };
  const key =
    mode === "resume"
      ? paperWorkspaceResumeStatusKey(candidateState, workspaceState)
      : paperWorkspaceLiveStatusKey(candidateState, workspaceState);
  return {
    key,
    tone: continuityStatusTone(key),
    candidateState,
    workspaceState
  };
}

export function resolvePaperWorkspaceContinuityStatusFeedback(
  workspace = null,
  storedSelection = null,
  candidateId = "",
  selectedPermanentCandidateId = "",
  draftInput = null,
  mode = "live",
  fallbackKey = "loadedWorkspace"
) {
  const status = resolvePaperWorkspaceContinuityStatus(
    workspace,
    storedSelection,
    candidateId,
    selectedPermanentCandidateId,
    draftInput,
    mode
  );
  return {
    ...status,
    ...paperWorkspaceStatusFeedback(status.key, fallbackKey, status.tone)
  };
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

export function blockedDraftContinuationStatusMessage(draftContinuationAction = null) {
  return cleanText(draftContinuationAction?.label) || "当前还不能继续写 draft。";
}

export function blockedDraftContinuationStatusFeedback(draftContinuationAction = null) {
  return {
    text: blockedDraftContinuationStatusMessage(draftContinuationAction),
    tone: "warn"
  };
}

export function draftBriefCopyStatusMessage(title = "", nextAction = "", error = null, pathLabel = "") {
  if (error) {
    return `复制 draft brief 失败：${String(error?.message || error)}`;
  }
  const cleanTitle = cleanText(title);
  const cleanNextAction = cleanText(nextAction);
  const cleanPathLabel = cleanText(pathLabel);
  const parts = [`已复制 draft brief：${cleanTitle}`];
  if (cleanPathLabel) {
    parts.push(`当前链路：${cleanPathLabel}`);
  }
  if (cleanNextAction) {
    parts.push(`下一步：${cleanNextAction}`);
  }
  return parts.join("。");
}

export function draftBriefCopyStatusFeedback(title = "", nextAction = "", error = null, pathLabel = "") {
  return {
    text: draftBriefCopyStatusMessage(title, nextAction, error, pathLabel),
    tone: error ? "bad" : "ok"
  };
}

export function draftBriefStateStatusFeedback(draftBriefState = null, error = null) {
  const draftBrief = draftBriefState?.draftBrief || null;
  const nextAction = cleanText(draftBriefState?.draftContinuationAction?.label);
  return draftBriefCopyStatusFeedback(draftBrief?.title, nextAction, error, draftBrief?.stepFourLabel);
}

export function draftKickoffStatusMessage(mode = "loaded", title = "", nextAction = "", pathLabel = "") {
  const cleanTitle = cleanText(title);
  const cleanNextAction = cleanText(nextAction);
  const cleanPathLabel = cleanText(pathLabel);
  if (mode === "adopted") {
    const parts = [cleanTitle ? `已采用上一版 kickoff 写法：${cleanTitle}` : "已采用上一版 kickoff 写法", "当前本地 draft 仍指向最新转述链路"];
    if (cleanPathLabel) parts.push(`当前链路：${cleanPathLabel}`);
    if (cleanNextAction) parts.push(`下一步：${cleanNextAction}`);
    return parts.join("。");
  }
  if (mode === "resumed") {
    const parts = [`继续本地 draft：${cleanTitle}`];
    if (cleanPathLabel) parts.push(`当前链路：${cleanPathLabel}`);
    if (cleanNextAction) parts.push(`下一步：${cleanNextAction}`);
    return parts.join("。");
  }
  const parts = [`已载入本地 draft kickoff：${cleanTitle}`];
  if (cleanPathLabel) parts.push(`当前链路：${cleanPathLabel}`);
  if (cleanNextAction) parts.push(`下一步：${cleanNextAction}`);
  return parts.join("。");
}

export function draftKickoffStatusFeedback(mode = "loaded", title = "", nextAction = "", pathLabel = "") {
  return {
    text: draftKickoffStatusMessage(mode, title, nextAction, pathLabel),
    tone: "ok"
  };
}

export function draftKickoffStateStatusFeedback(mode = "loaded", draftBriefState = null) {
  const draftBrief = draftBriefState?.draftBrief || null;
  const nextAction = cleanText(draftBriefState?.draftContinuationAction?.label);
  return draftKickoffStatusFeedback(mode, draftBrief?.title, nextAction, draftBrief?.stepFourLabel);
}

export function draftKickoffStartStatusFeedback(kickoffState = null, draftBriefState = null) {
  const mode = !kickoffState?.hasContent || kickoffState?.isStale ? "loaded" : "resumed";
  return draftKickoffStateStatusFeedback(mode, draftBriefState);
}

export function draftKickoffAdoptedStatusFeedback(draftBriefState = null) {
  return draftKickoffStateStatusFeedback("adopted", draftBriefState);
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

export function draftKickoffFormState(storedKickoff = null, storedSnapshot = null) {
  return {
    draftKickoffText: cleanText(storedKickoff?.content),
    draftKickoffSignature: cleanText(storedKickoff?.translationSignature),
    draftKickoffPreviousText: cleanText(storedSnapshot?.content),
    draftKickoffPreviousSignature: cleanText(storedSnapshot?.previousSignature),
    draftKickoffReplacementSignature: cleanText(storedSnapshot?.replacementSignature)
  };
}

export function resolvedDraftKickoffFormState(nextKickoff = null) {
  return {
    draftKickoffText: cleanText(nextKickoff?.draftKickoffText),
    draftKickoffSignature: cleanText(nextKickoff?.draftKickoffSignature),
    draftKickoffPreviousText: cleanText(nextKickoff?.draftKickoffPreviousText),
    draftKickoffPreviousSignature: cleanText(nextKickoff?.draftKickoffPreviousSignature),
    draftKickoffReplacementSignature: cleanText(nextKickoff?.draftKickoffReplacementSignature)
  };
}

export function draftKickoffSignatureValue(form = null, runtimeState = null) {
  return (
    cleanText(form?.draftKickoffSignature) ||
    cleanText(runtimeState?.draftKickoffState?.currentTranslationSignature)
  );
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
  const stepFourPathKey = cleanText(selectedPermanent?.id) || "step4:none";
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
    stepFourPathKey,
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

export function resolveRecentDraftBriefCopy(
  workspaceSelection = null,
  candidateId = "",
  translationSignature = "",
  draftContinuationAction = null,
  stepFourPathKey = ""
) {
  const cleanCandidateId = cleanText(candidateId);
  const cleanTranslationSignature = cleanText(translationSignature);
  const cleanStepFourPathKey = cleanText(stepFourPathKey);
  if (!cleanCandidateId || !cleanTranslationSignature) return null;
  const storedCopy = workspaceSelection?.draftBriefByCandidate?.[cleanCandidateId];
  if (!storedCopy || cleanText(storedCopy.translationSignature) !== cleanTranslationSignature) return null;
  const storedCandidateId = cleanText(storedCopy.candidateId);
  if (storedCandidateId && storedCandidateId !== cleanCandidateId) return null;
  const storedStepFourPathKey = cleanText(storedCopy.stepFourPathKey);
  if (storedStepFourPathKey && cleanStepFourPathKey && storedStepFourPathKey !== cleanStepFourPathKey) return null;
  const storedNextActionKey = cleanText(storedCopy.nextActionKey);
  const currentNextActionKey = cleanText(draftContinuationAction?.key);
  if (storedNextActionKey && currentNextActionKey && storedNextActionKey !== currentNextActionKey) return null;
  const resolvedNextAction =
    storedNextActionKey && currentNextActionKey === storedNextActionKey
      ? cleanText(draftContinuationAction?.label) || cleanText(storedCopy.nextAction)
      : cleanText(storedCopy.nextAction);
  if (!resolvedNextAction) return null;
  return {
    ...storedCopy,
    candidateId: storedCandidateId || cleanCandidateId,
    stepFourPathKey: storedStepFourPathKey,
    nextActionKey: storedNextActionKey,
    nextAction: resolvedNextAction
  };
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
  const draftBriefAction = draftBriefActionState(candidateState, workspaceState);
  const draftContinuationAction = draftContinuationActionState(candidateState, workspaceState);
  const draftBrief = draftContinuationBrief(workspace, workspaceSelection, candidateId, selectedPermanentCandidateId, draftInput);
  const currentTranslationSignature = translationContinuitySignature(workspace, candidateId, draftInput);
  const recentDraftBriefCopy = resolveRecentDraftBriefCopy(
    workspaceSelection,
    candidateId,
    currentTranslationSignature,
    draftContinuationAction,
    draftBrief?.stepFourPathKey
  );

  return {
    draft,
    draftBriefAction,
    draftContinuationAction,
    draftBrief,
    recentDraftBriefCopy,
    currentTranslationSignature,
    continuityReason
  };
}

export function resolveTranslationSaveRuntimeState(
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
  const supportsNextStep = translationDraftSupportsNextStep(workspace, candidateId, draftInput);

  return {
    draft,
    supportsNextStep,
    continuityReason,
    action: translationSaveActionState(workspace, candidateId, draftInput),
    successStatusKey: savedTranslationStatusKey(continuityReason, supportsNextStep)
  };
}

export function resolvePermanentCandidateRuntimeState(
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
  const action = permanentCandidateActionState(
    workspace,
    workspaceSelection,
    candidateId,
    selectedPermanentCandidateId,
    draftInput
  );

  return {
    draft,
    continuityReason,
    action,
    blockedStatusKey: action.enabled ? "" : paperWorkspaceLiveStatusKey(candidateState, workspaceState),
    blockedStatusTone: action.enabled ? "" : "warn"
  };
}

export function resolveDraftKickoffRuntimeState(
  workspace = null,
  workspaceSelection = null,
  candidateId = "",
  selectedPermanentCandidateId = "",
  form = null,
  draftInput = null
) {
  const currentTranslationSignature = translationContinuitySignature(workspace, candidateId, draftInput);
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  const continuityReason = permanentNoteContinuityState(
    workspace,
    workspaceSelection,
    selectedPermanentCandidateId,
    candidateId,
    draftInput
  ).reason;
  const kickoffState = resolveDraftKickoffState(form, currentTranslationSignature);
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

  return {
    ...kickoffState,
    draft,
    continuityReason,
    action: draftKickoffActionState(candidateState, workspaceState, {
      hasContent: kickoffState.hasContent,
      isStale: kickoffState.isStale
    })
  };
}

export function resolvePaperWorkspaceRuntimeState(
  workspace = null,
  workspaceSelection = null,
  candidateId = "",
  selectedPermanentCandidateId = "",
  form = null,
  draftInput = null
) {
  const translationRuntime = resolveTranslationRuntimeContext(workspace, candidateId, draftInput);
  const normalizedDraftInput = translationRuntime.draftInput;
  const translationSaveState = resolveTranslationSaveRuntimeState(
    workspace,
    workspaceSelection,
    candidateId,
    selectedPermanentCandidateId,
    normalizedDraftInput
  );
  const draftBriefState = resolveDraftBriefState(
    workspace,
    workspaceSelection,
    candidateId,
    selectedPermanentCandidateId,
    normalizedDraftInput
  );
  const draftKickoffState = resolveDraftKickoffRuntimeState(
    workspace,
    workspaceSelection,
    candidateId,
    selectedPermanentCandidateId,
    form,
    normalizedDraftInput
  );
  const permanentCandidateState = resolvePermanentCandidateRuntimeState(
    workspace,
    workspaceSelection,
    candidateId,
    selectedPermanentCandidateId,
    normalizedDraftInput
  );
  const permanentNoteState = resolvePermanentNoteRuntimeState(
    workspace,
    workspaceSelection,
    selectedPermanentCandidateId,
    candidateId,
    normalizedDraftInput
  );

  return {
    ...translationRuntime,
    translationSaveState,
    draftBriefState,
    draftKickoffState,
    permanentCandidateState,
    permanentNoteState
  };
}

export function resolvePermanentNoteRuntimeState(
  workspace = null,
  workspaceSelection = null,
  permanentCandidateId = "",
  candidateId = "",
  draftInput = null
) {
  const draft = translationDraftForCandidate(workspace, candidateId, draftInput);
  const continuity = permanentNoteContinuityState(
    workspace,
    workspaceSelection,
    permanentCandidateId,
    candidateId,
    draftInput
  );
  const action = permanentNoteActionState(
    workspace,
    workspaceSelection,
    permanentCandidateId,
    candidateId,
    draftInput
  );

  return {
    draft,
    continuityReason: continuity.reason,
    action,
    blockedStatusKey: continuity.allowed
      ? ""
      : continuity.reason === "saved_permanent_note"
      ? "savedPermanentNote"
      : continuity.reason === "stale_translation_signature"
      ? "translationNeedsFreshPermanentCandidate"
      : "translationNeedsResaveBeforePermanentNote",
    blockedStatusTone: continuity.allowed
      ? ""
      : continuity.reason === "saved_permanent_note"
      ? "ok"
      : "warn"
  };
}
