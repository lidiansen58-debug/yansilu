import {
  addNotebookLmDraft,
  createPaperPermanentCandidate,
  createPaperWorkspace,
  fetchPaperWorkspace,
  getPaperWorkspaceApiBase,
  savePaperPermanentNote,
  savePaperTranslation
} from "./paper-workspace-api.js";
import {
  buildNotebookLmPayload,
  blockedDraftContinuationStatusFeedback,
  canSubmitNotebookDraft,
  chainedPaperWorkspaceStatusFeedback,
  createInitialPaperWorkspaceState,
  draftBriefButtonLabel,
  draftBriefCopyStatusFeedback,
  draftKickoffStatusFeedback,
  nextSelectedCandidateId,
  PAPER_WORKSPACE_STATUS,
  paperWorkspaceStatusFeedback,
  permanentCandidatePersistenceDefaults,
  paperWorkspaceResumeStatusKey,
  preferredPaperCandidateIdForWorkspaceResume,
  resolveAdoptedDraftKickoff,
  resolveDraftBriefState,
  resolveDraftKickoffRuntimeState,
  resolvePaperWorkspaceContinuityStatusFeedback,
  resolvePermanentCandidateRuntimeState,
  resolvePermanentNoteRuntimeState,
  resolveRefreshedDraftKickoff,
  resolveTranslationRuntimeContext,
  resolveTranslationSaveRuntimeState,
  resolveSelectedPaperCandidateState,
  resolveSelectedPaperWorkspaceState,
  resolvedTranslationSignatureForPermanentCandidate,
  resolvedConfirmAuthorshipForPermanentCandidate,
  resolvedSaveStatusForPermanentCandidate,
  translationContinuitySignature,
  resolvedStoredTranslationDraft,
  selectedAlignedPermanentCandidate,
  selectedPaperCandidateIdForPermanentCandidate,
  selectedPermanentCandidate,
  translationDraftHasLocalChanges
} from "./paper-workspace-model.js";
import { renderPaperWorkspacePage } from "./paper-workspace-panel.js";

const TRANSLATION_DRAFT_STORAGE_PREFIX = "yansilu:paper-workspace:translation-draft";
const DRAFT_KICKOFF_STORAGE_PREFIX = "yansilu:paper-workspace:draft-kickoff";
const DRAFT_KICKOFF_SNAPSHOT_STORAGE_PREFIX = "yansilu:paper-workspace:draft-kickoff-snapshot";
const WORKSPACE_SELECTION_STORAGE_PREFIX = "yansilu:paper-workspace:selection";

const STATUS = PAPER_WORKSPACE_STATUS;

const state = createInitialPaperWorkspaceState();
state.workspaceSelection = null;
const root = document.getElementById("paperWorkspaceApp");
const CONTINUITY_STATUS_FIELD_IDS = new Set([
  "translationParaphraseInput",
  "translationRelationInput",
  "translationBoundaryInput",
  "confirmAuthorshipInput",
  "permanentStatusInput"
]);

function setStatus(text, tone = "") {
  state.statusText = text;
  state.statusTone = tone;
  updateStatusStrip();
}

function updateStatusStrip() {
  const statusNode = root?.querySelector?.(".paper-status");
  if (!statusNode) return;
  const cleanTone = String(state.statusTone || "").trim();
  statusNode.className = cleanTone ? `paper-status paper-status-${cleanTone}` : "paper-status";
  statusNode.textContent = String(state.statusText || "准备就绪");
}

function setResult(result) {
  state.lastResult = result;
}

function currentPaperId() {
  return String(state.workspace?.paperId || state.form.paperId || "").trim();
}

function currentLoadedWorkspacePaperId() {
  return String(state.workspace?.paperId || "").trim();
}

function translationDraftStorageKey(paperId, candidateId) {
  const cleanPaperId = String(paperId || "").trim();
  const cleanCandidateId = String(candidateId || "").trim();
  if (!cleanPaperId || !cleanCandidateId) return "";
  return `${TRANSLATION_DRAFT_STORAGE_PREFIX}:${cleanPaperId}:${cleanCandidateId}`;
}

function workspaceSelectionStorageKey(paperId) {
  const cleanPaperId = String(paperId || "").trim();
  if (!cleanPaperId) return "";
  return `${WORKSPACE_SELECTION_STORAGE_PREFIX}:${cleanPaperId}`;
}

function draftKickoffStorageKey(paperId, candidateId) {
  const cleanPaperId = String(paperId || "").trim();
  const cleanCandidateId = String(candidateId || "").trim();
  if (!cleanPaperId || !cleanCandidateId) return "";
  return `${DRAFT_KICKOFF_STORAGE_PREFIX}:${cleanPaperId}:${cleanCandidateId}`;
}

function draftKickoffSnapshotStorageKey(paperId, candidateId) {
  const cleanPaperId = String(paperId || "").trim();
  const cleanCandidateId = String(candidateId || "").trim();
  if (!cleanPaperId || !cleanCandidateId) return "";
  return `${DRAFT_KICKOFF_SNAPSHOT_STORAGE_PREFIX}:${cleanPaperId}:${cleanCandidateId}`;
}

function readStoredTranslationDraft(paperId, candidateId) {
  const key = translationDraftStorageKey(paperId, candidateId);
  if (!key) return null;
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return resolvedStoredTranslationDraft(parsed || {});
  } catch {
    return null;
  }
}

function clearStoredTranslationDraft(paperId, candidateId) {
  const key = translationDraftStorageKey(paperId, candidateId);
  if (!key) return;
  try {
    window.localStorage?.removeItem(key);
  } catch {}
}

function readStoredDraftKickoff(paperId, candidateId) {
  const key = draftKickoffStorageKey(paperId, candidateId);
  if (!key) return null;
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const content = String(parsed.content || "").trim();
    const translationSignature = String(parsed.translationSignature || "").trim();
    if (!content || !translationSignature) return null;
    return {
      content,
      translationSignature,
      updatedAt: String(parsed.updatedAt || "").trim()
    };
  } catch {
    return null;
  }
}

function clearStoredDraftKickoff(paperId, candidateId) {
  const key = draftKickoffStorageKey(paperId, candidateId);
  if (!key) return;
  try {
    window.localStorage?.removeItem(key);
  } catch {}
}

function readStoredDraftKickoffSnapshot(paperId, candidateId) {
  const key = draftKickoffSnapshotStorageKey(paperId, candidateId);
  if (!key) return null;
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const content = String(parsed.content || "").trim();
    const previousSignature = String(parsed.previousSignature || "").trim();
    const replacementSignature = String(parsed.replacementSignature || "").trim();
    if (!content || !previousSignature || !replacementSignature) return null;
    return {
      content,
      previousSignature,
      replacementSignature,
      updatedAt: String(parsed.updatedAt || "").trim()
    };
  } catch {
    return null;
  }
}

function clearStoredDraftKickoffSnapshot(paperId, candidateId) {
  const key = draftKickoffSnapshotStorageKey(paperId, candidateId);
  if (!key) return;
  try {
    window.localStorage?.removeItem(key);
  } catch {}
}

function candidateHasStoredTranslationDraft(paperId, candidateId) {
  return Boolean(readStoredTranslationDraft(paperId, candidateId));
}

function readStoredWorkspaceSelection(paperId) {
  const key = workspaceSelectionStorageKey(paperId);
  if (!key) return null;
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const saveStatusByPermanentCandidate =
      parsed.saveStatusByPermanentCandidate && typeof parsed.saveStatusByPermanentCandidate === "object"
        ? Object.fromEntries(
            Object.entries(parsed.saveStatusByPermanentCandidate)
              .map(([candidateId, saveStatus]) => [String(candidateId || "").trim(), String(saveStatus || "").trim()])
              .filter(([candidateId, saveStatus]) => candidateId && saveStatus)
          )
        : {};
    const confirmAuthorshipByPermanentCandidate =
      parsed.confirmAuthorshipByPermanentCandidate && typeof parsed.confirmAuthorshipByPermanentCandidate === "object"
        ? Object.fromEntries(
            Object.entries(parsed.confirmAuthorshipByPermanentCandidate)
              .map(([candidateId, confirmAuthorship]) => [String(candidateId || "").trim(), confirmAuthorship === true])
              .filter(([candidateId]) => candidateId)
          )
        : {};
    const translationSignatureByPermanentCandidate =
      parsed.translationSignatureByPermanentCandidate &&
      typeof parsed.translationSignatureByPermanentCandidate === "object"
        ? Object.fromEntries(
            Object.entries(parsed.translationSignatureByPermanentCandidate)
              .map(([candidateId, signature]) => [String(candidateId || "").trim(), String(signature || "").trim()])
              .filter(([candidateId, signature]) => candidateId && signature)
          )
        : {};
    const draftBriefByCandidate =
      parsed.draftBriefByCandidate && typeof parsed.draftBriefByCandidate === "object"
        ? Object.fromEntries(
            Object.entries(parsed.draftBriefByCandidate)
              .map(([candidateId, value]) => {
                const cleanCandidateId = String(candidateId || "").trim();
                const entry = value && typeof value === "object" ? value : {};
                return [
                  cleanCandidateId,
                  {
                    title: String(entry.title || "").trim(),
                    nextAction: String(entry.nextAction || "").trim(),
                    translationSignature: String(entry.translationSignature || "").trim(),
                    copiedAt: String(entry.copiedAt || "").trim()
                  }
                ];
              })
              .filter(
                ([candidateId, value]) =>
                  candidateId && value.title && value.nextAction && value.translationSignature
              )
          )
        : {};
    return {
      selectedCandidateId: String(parsed.selectedCandidateId || "").trim(),
      selectedPermanentCandidateId: String(parsed.selectedPermanentCandidateId || "").trim(),
      saveStatus: String(parsed.saveStatus || "").trim(),
      saveStatusByPermanentCandidate,
      confirmAuthorshipByPermanentCandidate,
      translationSignatureByPermanentCandidate,
      draftBriefByCandidate
    };
  } catch {
    return null;
  }
}

function persistWorkspaceSelection(overrides = {}) {
  const paperId = currentLoadedWorkspacePaperId();
  const key = workspaceSelectionStorageKey(paperId);
  if (!key) return;
  try {
    const currentSelection = readStoredWorkspaceSelection(paperId);
    const currentPermanentCandidateId = String(state.selectedPermanentCandidateId || "").trim();
    const saveStatusByPermanentCandidate = {
      ...(currentSelection?.saveStatusByPermanentCandidate || {})
    };
    const confirmAuthorshipByPermanentCandidate = {
      ...(currentSelection?.confirmAuthorshipByPermanentCandidate || {})
    };
    const translationSignatureByPermanentCandidate = {
      ...(currentSelection?.translationSignatureByPermanentCandidate || {})
    };
    const draftBriefByCandidate = {
      ...(currentSelection?.draftBriefByCandidate || {})
    };
    const nextSaveStatus = String(overrides.saveStatus ?? state.form.saveStatus ?? "").trim();
    if (currentPermanentCandidateId && nextSaveStatus) {
      saveStatusByPermanentCandidate[currentPermanentCandidateId] = nextSaveStatus;
    }
    if (currentPermanentCandidateId) {
      confirmAuthorshipByPermanentCandidate[currentPermanentCandidateId] =
        overrides.confirmAuthorship ?? state.form.confirmAuthorship === true;
    }
    if (currentPermanentCandidateId && overrides.translationSignature) {
      translationSignatureByPermanentCandidate[currentPermanentCandidateId] = String(overrides.translationSignature || "").trim();
    }
    if (overrides.draftBriefCopy) {
      const draftBriefCopy = overrides.draftBriefCopy && typeof overrides.draftBriefCopy === "object" ? overrides.draftBriefCopy : {};
      const draftBriefCandidateId = String(draftBriefCopy.candidateId ?? state.selectedCandidateId ?? "").trim();
      if (draftBriefCandidateId) {
        if (draftBriefCopy.clear === true) {
          delete draftBriefByCandidate[draftBriefCandidateId];
        } else {
          const title = String(draftBriefCopy.title || "").trim();
          const nextAction = String(draftBriefCopy.nextAction || "").trim();
          const translationSignature = String(draftBriefCopy.translationSignature || "").trim();
          if (title && nextAction && translationSignature) {
            draftBriefByCandidate[draftBriefCandidateId] = {
              title,
              nextAction,
              translationSignature,
              copiedAt: String(draftBriefCopy.copiedAt || new Date().toISOString()).trim()
            };
          }
        }
      }
    }
    const nextSelection = {
      paperId,
      selectedCandidateId: String(state.selectedCandidateId || "").trim(),
      selectedPermanentCandidateId: String(state.selectedPermanentCandidateId || "").trim(),
      saveStatus: currentPermanentCandidateId ? nextSaveStatus : "",
      saveStatusByPermanentCandidate,
      confirmAuthorshipByPermanentCandidate,
      translationSignatureByPermanentCandidate,
      draftBriefByCandidate,
      updatedAt: new Date().toISOString()
    };
    window.localStorage?.setItem(
      key,
      JSON.stringify(nextSelection)
    );
    state.workspaceSelection = nextSelection;
  } catch {}
}

function persistTranslationSignatureForPermanentCandidate(permanentCandidateId = "", translationSignature = "") {
  const cleanPermanentCandidateId = String(permanentCandidateId || "").trim();
  const cleanTranslationSignature = String(translationSignature || "").trim();
  if (!cleanPermanentCandidateId || !cleanTranslationSignature) return;
  const paperId = currentLoadedWorkspacePaperId();
  const key = workspaceSelectionStorageKey(paperId);
  if (!key) return;
  try {
    const currentSelection = readStoredWorkspaceSelection(paperId);
    const nextSelection = {
      paperId,
      ...(currentSelection || {}),
      selectedCandidateId: String(state.selectedCandidateId || "").trim(),
      selectedPermanentCandidateId: String(state.selectedPermanentCandidateId || "").trim(),
      translationSignatureByPermanentCandidate: {
        ...(currentSelection?.translationSignatureByPermanentCandidate || {}),
        [cleanPermanentCandidateId]: cleanTranslationSignature
      },
      updatedAt: new Date().toISOString()
    };
    window.localStorage?.setItem(key, JSON.stringify(nextSelection));
    state.workspaceSelection = nextSelection;
  } catch {}
}

function persistPermanentCandidateTranslationSignature(
  permanentCandidateId = state.selectedPermanentCandidateId,
  candidateId = state.selectedCandidateId
) {
  const cleanPermanentCandidateId = String(permanentCandidateId || "").trim();
  if (!cleanPermanentCandidateId) return;
  const { translationSignature } = currentSelectedTranslationRuntimeContext(candidateId);
  if (!translationSignature) return;
  persistWorkspaceSelection({ translationSignature });
}

function hydratePermanentCandidateForm(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  state.workspaceSelection = storedSelection;
  const selectedPermanent = selectedAlignedPermanentCandidate(state.workspace, state.selectedPermanentCandidateId);
  state.form.saveStatus = permanentCandidatePersistenceDefaults(selectedPermanent, {
    saveStatus: resolvedSaveStatusForPermanentCandidate(storedSelection, state.selectedPermanentCandidateId)
  }).saveStatus;
  state.form.confirmAuthorship = resolvedConfirmAuthorshipForPermanentCandidate(storedSelection, selectedPermanent);
}

function alignPermanentCandidateToSelectedPaper(preferredPermanentCandidateId = state.selectedPermanentCandidateId) {
  state.selectedPermanentCandidateId = resolveSelectedPaperWorkspaceState(
    state.workspace,
    readStoredWorkspaceSelection(currentPaperId()),
    {
      preferredCandidateId: state.selectedCandidateId,
      preferredPermanentCandidateId,
      candidateIdHasLocalDraft: (candidateId) => candidateHasStoredTranslationDraft(currentLoadedWorkspacePaperId(), candidateId)
    }
  ).selectedPermanentCandidateId;
}

function hydrateSelectedPaperCandidateState(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  alignPermanentCandidateToSelectedPaper();
  hydrateTranslationForm(state.selectedCandidateId);
  hydratePermanentCandidateForm(storedSelection);
}

function persistTranslationDraft(candidateId = state.selectedCandidateId) {
  const paperId = currentPaperId();
  const cleanCandidateId = String(candidateId || "").trim();
  if (!paperId || !cleanCandidateId) return;

  const { draftInput } = currentSelectedTranslationRuntimeContext(cleanCandidateId);
  if (!translationDraftHasLocalChanges(state.workspace, cleanCandidateId, draftInput)) {
    clearStoredTranslationDraft(paperId, cleanCandidateId);
    return;
  }

  const key = translationDraftStorageKey(paperId, cleanCandidateId);
  if (!key) return;
  try {
    window.localStorage?.setItem(
      key,
      JSON.stringify({
        ...draftInput,
        paperId,
        candidateId: cleanCandidateId,
        updatedAt: new Date().toISOString()
      })
    );
  } catch {}
}

function syncFormFromDom() {
  state.form.paperId = document.getElementById("paperIdInput")?.value || state.form.paperId;
  state.form.sourceId = document.getElementById("paperSourceIdInput")?.value || "";
  state.form.title = document.getElementById("paperTitleInput")?.value || "";
  state.form.notebookName = document.getElementById("notebookNameInput")?.value || "NotebookLM";
  state.form.summary = document.getElementById("notebookSummaryInput")?.value || "";
  state.form.qa = document.getElementById("notebookQaInput")?.value || "";
  state.form.studyGuide = document.getElementById("notebookStudyGuideInput")?.value || "";
  state.form.notes = document.getElementById("notebookNotesInput")?.value || "";
  state.form.paraphraseText = document.getElementById("translationParaphraseInput")?.value || "";
  state.form.relationToQuestion = document.getElementById("translationRelationInput")?.value || "";
  state.form.boundaryOrCondition = document.getElementById("translationBoundaryInput")?.value || "";
  state.form.draftKickoffText = document.getElementById("draftKickoffTextarea")?.value || state.form.draftKickoffText || "";
  state.form.confirmAuthorship = document.getElementById("confirmAuthorshipInput")?.checked === true;
  state.form.saveStatus = document.getElementById("permanentStatusInput")?.value || "active";
}

function hydrateTranslationForm(candidateId = "") {
  const resolvedState = resolveSelectedPaperCandidateState(state.workspace, {
    preferredCandidateId: candidateId,
    readStoredTranslationDraft: (selectedId) => readStoredTranslationDraft(currentPaperId(), selectedId)
  });
  state.form.paraphraseText = resolvedState.paraphraseText;
  state.form.relationToQuestion = resolvedState.relationToQuestion;
  state.form.boundaryOrCondition = resolvedState.boundaryOrCondition;
  hydrateDraftKickoff(candidateId || resolvedState.selectedCandidateId || state.selectedCandidateId);
}

function hydrateDraftKickoff(candidateId = state.selectedCandidateId) {
  const cleanCandidateId = String(candidateId || "").trim();
  const storedKickoff = cleanCandidateId ? readStoredDraftKickoff(currentPaperId(), cleanCandidateId) : null;
  const storedSnapshot = cleanCandidateId ? readStoredDraftKickoffSnapshot(currentPaperId(), cleanCandidateId) : null;
  state.form.draftKickoffText = String(storedKickoff?.content || "");
  state.form.draftKickoffSignature = String(storedKickoff?.translationSignature || "");
  state.form.draftKickoffPreviousText = String(storedSnapshot?.content || "");
  state.form.draftKickoffPreviousSignature = String(storedSnapshot?.previousSignature || "");
  state.form.draftKickoffReplacementSignature = String(storedSnapshot?.replacementSignature || "");
}

function currentSelectedTranslationRuntimeContext(
  candidateId = state.selectedCandidateId,
  options = {}
) {
  const useForm = options?.useForm !== false;
  return resolveTranslationRuntimeContext(
    state.workspace,
    candidateId,
    useForm
      ? {
          paraphraseText: state.form.paraphraseText,
          relationToQuestion: state.form.relationToQuestion,
          boundaryOrCondition: state.form.boundaryOrCondition
        }
      : null
  );
}

function currentSelectionContinuityStatus(
  mode = "live",
  storedSelection = readStoredWorkspaceSelection(currentPaperId())
) {
  const { draftInput } = currentSelectedTranslationRuntimeContext();
  return resolvePaperWorkspaceContinuityStatusFeedback(
    state.workspace,
    storedSelection,
    state.selectedCandidateId,
    state.selectedPermanentCandidateId,
    draftInput,
    mode,
    "loadedWorkspace"
  );
}

function currentSelectionResumeStatus(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  return currentSelectionContinuityStatus("resume", storedSelection);
}

function currentSelectionLiveStatus(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  return currentSelectionContinuityStatus("live", storedSelection);
}

function setStatusFromCurrentSelection(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  const resumeStatus = currentSelectionResumeStatus(storedSelection);
  setStatus(resumeStatus.text, resumeStatus.tone);
}

function setLiveStatusFromCurrentSelection(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  if (!currentLoadedWorkspacePaperId()) return;
  const liveStatus = currentSelectionLiveStatus(storedSelection);
  setStatus(liveStatus.text, liveStatus.tone);
}

function shouldRefreshContinuityStatus(target) {
  return CONTINUITY_STATUS_FIELD_IDS.has(String(target?.id || "").trim());
}

function hydrateFormFromWorkspace(workspace) {
  if (!workspace) return;
  const storedSelection = readStoredWorkspaceSelection(workspace.paperId);
  state.workspaceSelection = storedSelection;
  const preferredPermanentCandidateId = state.selectedPermanentCandidateId || storedSelection?.selectedPermanentCandidateId || "";
  const preferredCandidateId = preferredPaperCandidateIdForWorkspaceResume(
    workspace,
    preferredPermanentCandidateId,
    state.selectedCandidateId || storedSelection?.selectedCandidateId || ""
  );
  state.form.paperId = workspace.paperId || state.form.paperId;
  state.form.sourceId = workspace.sourceId || state.form.sourceId;
  state.form.title = workspace.title || state.form.title;
  const resolvedCandidateState = resolveSelectedPaperCandidateState(workspace, {
    preferredCandidateId,
    candidateIdHasLocalDraft: (candidateId) => candidateHasStoredTranslationDraft(workspace.paperId, candidateId),
    readStoredTranslationDraft: (candidateId) => readStoredTranslationDraft(workspace.paperId, candidateId)
  });
  const resolvedState = resolveSelectedPaperWorkspaceState(
    workspace,
    storedSelection,
    {
      preferredCandidateId: resolvedCandidateState.selectedCandidateId,
      preferredPermanentCandidateId,
      candidateIdHasLocalDraft: (candidateId) => candidateHasStoredTranslationDraft(workspace.paperId, candidateId)
    }
  );
  state.selectedCandidateId = resolvedCandidateState.selectedCandidateId;
  state.selectedPermanentCandidateId = resolvedState.selectedPermanentCandidateId;
  state.form.saveStatus = resolvedState.saveStatus;
  state.form.confirmAuthorship = resolvedState.confirmAuthorship;
  state.form.paraphraseText = resolvedCandidateState.paraphraseText;
  state.form.relationToQuestion = resolvedCandidateState.relationToQuestion;
  state.form.boundaryOrCondition = resolvedCandidateState.boundaryOrCondition;
  hydrateDraftKickoff(resolvedCandidateState.selectedCandidateId);
  persistWorkspaceSelection();
  return resolvePaperWorkspaceContinuityStatusFeedback(
    workspace,
    storedSelection,
    resolvedCandidateState.selectedCandidateId,
    resolvedState.selectedPermanentCandidateId,
    {
      paraphraseText: resolvedCandidateState.paraphraseText,
      relationToQuestion: resolvedCandidateState.relationToQuestion,
      boundaryOrCondition: resolvedCandidateState.boundaryOrCondition
    },
    "resume",
    "loadedWorkspace"
  );
}

function render() {
  if (!root) return;
  state.lastCopiedDraftBrief = currentDraftBriefState().recentDraftBriefCopy;
  state.draftKickoffState = currentDraftKickoffState();
  root.innerHTML = renderPaperWorkspacePage(state);
  updateDynamicControls();
}

function rerenderPreservingContinuityFocus(target = null) {
  const activeId = String(target?.id || "").trim();
  const selectionStart =
    typeof target?.selectionStart === "number" ? target.selectionStart : null;
  const selectionEnd =
    typeof target?.selectionEnd === "number" ? target.selectionEnd : null;
  render();
  if (!activeId) return;
  const nextTarget = document.getElementById(activeId);
  if (!nextTarget) return;
  if (typeof nextTarget.focus === "function") {
    nextTarget.focus();
  }
  if (
    selectionStart !== null &&
    selectionEnd !== null &&
    typeof nextTarget.setSelectionRange === "function"
  ) {
    nextTarget.setSelectionRange(selectionStart, selectionEnd);
  }
}

function updateDynamicControls() {
  const translationSaveState = currentTranslationSaveState();
  const saveTranslationButton = document.getElementById("btnSaveTranslation");
  if (saveTranslationButton) {
    saveTranslationButton.disabled = !translationSaveState.action.enabled;
    saveTranslationButton.textContent = translationSaveState.action.label;
  }
  const notebookDraftButton = document.getElementById("btnAddNotebookDraft");
  if (notebookDraftButton) {
    notebookDraftButton.disabled = !canSubmitNotebookDraft(state.form, state.workspace);
  }
  const permanentCandidateButton = document.getElementById("btnCreatePermanentCandidate");
  if (permanentCandidateButton) {
    const permanentCandidateState = currentPermanentCandidateState();
    permanentCandidateButton.disabled = !permanentCandidateState.action.enabled;
    permanentCandidateButton.textContent = permanentCandidateState.action.label;
  }
  const savePermanentNoteButton = document.getElementById("btnSavePermanentNote");
  const confirmAuthorshipInput = document.getElementById("confirmAuthorshipInput");
  const permanentStatusInput = document.getElementById("permanentStatusInput");
  if (savePermanentNoteButton) {
    const permanentNoteState = currentPermanentNoteState();
    savePermanentNoteButton.disabled = !permanentNoteState.action.enabled;
    savePermanentNoteButton.textContent = permanentNoteState.action.label;
    if (confirmAuthorshipInput) {
      confirmAuthorshipInput.disabled = !permanentNoteState.action.enabled;
    }
    if (permanentStatusInput) {
      permanentStatusInput.disabled = !permanentNoteState.action.enabled;
    }
  }
  const copyDraftBriefButton = document.getElementById("btnCopyDraftBrief");
  if (copyDraftBriefButton) {
    const { draftBriefAction, draftContinuationAction } = currentDraftBriefState();
    copyDraftBriefButton.disabled = !draftBriefAction.enabled;
    copyDraftBriefButton.textContent = draftBriefButtonLabel(draftBriefAction, draftContinuationAction);
  }
  const startDraftKickoffButton = document.getElementById("btnStartDraftKickoff");
  if (startDraftKickoffButton) {
    const kickoffState = currentDraftKickoffState();
    startDraftKickoffButton.disabled = !kickoffState.action?.enabled;
    startDraftKickoffButton.textContent = String(kickoffState.action?.label || "载入 brief，开始本地 draft");
  }
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) throw new Error("clipboard unavailable");
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      if (Array.isArray(window.__copiedTexts)) window.__copiedTexts.push(value);
      return;
    }
  } catch {}
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.left = "-10000px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!success) throw new Error("clipboard unavailable");
  if (Array.isArray(window.__copiedTexts)) window.__copiedTexts.push(value);
}

function currentDraftBriefState() {
  const { draftInput } = currentSelectedTranslationRuntimeContext();
  return resolveDraftBriefState(
    state.workspace,
    state.workspaceSelection,
    state.selectedCandidateId,
    state.selectedPermanentCandidateId,
    draftInput
  );
}

function currentTranslationSaveState() {
  const { draftInput } = currentSelectedTranslationRuntimeContext();
  return resolveTranslationSaveRuntimeState(
    state.workspace,
    state.workspaceSelection,
    state.selectedCandidateId,
    state.selectedPermanentCandidateId,
    draftInput
  );
}

function currentDraftKickoffState() {
  const { draftInput } = currentSelectedTranslationRuntimeContext();
  return resolveDraftKickoffRuntimeState(
    state.workspace,
    state.workspaceSelection,
    state.selectedCandidateId,
    state.selectedPermanentCandidateId,
    state.form,
    draftInput
  );
}

function currentPermanentCandidateState() {
  const { draftInput } = currentSelectedTranslationRuntimeContext();
  return resolvePermanentCandidateRuntimeState(
    state.workspace,
    state.workspaceSelection,
    state.selectedCandidateId,
    state.selectedPermanentCandidateId,
    draftInput
  );
}

function currentPermanentNoteState() {
  const { draftInput } = currentSelectedTranslationRuntimeContext();
  return resolvePermanentNoteRuntimeState(
    state.workspace,
    state.workspaceSelection,
    state.selectedPermanentCandidateId,
    state.selectedCandidateId,
    draftInput
  );
}

function persistDraftKickoff(candidateId = state.selectedCandidateId, overrides = {}) {
  const paperId = currentPaperId();
  const cleanCandidateId = String(candidateId || "").trim();
  if (!paperId || !cleanCandidateId) return;
  const content = String(overrides.content ?? state.form.draftKickoffText ?? "").trim();
  const translationSignature = String(overrides.translationSignature ?? state.form.draftKickoffSignature ?? "").trim();
  if (!content || !translationSignature) {
    clearStoredDraftKickoff(paperId, cleanCandidateId);
    return;
  }
  const key = draftKickoffStorageKey(paperId, cleanCandidateId);
  if (!key) return;
  try {
    window.localStorage?.setItem(
      key,
      JSON.stringify({
        paperId,
        candidateId: cleanCandidateId,
        content,
        translationSignature,
        updatedAt: new Date().toISOString()
      })
    );
  } catch {}
}

function persistDraftKickoffSnapshot(candidateId = state.selectedCandidateId, snapshot = null) {
  const paperId = currentPaperId();
  const cleanCandidateId = String(candidateId || "").trim();
  if (!paperId || !cleanCandidateId) return;
  const key = draftKickoffSnapshotStorageKey(paperId, cleanCandidateId);
  if (!key) return;
  const normalizedSnapshot = snapshot && typeof snapshot === "object" ? snapshot : null;
  const content = String(normalizedSnapshot?.content || "").trim();
  const previousSignature = String(normalizedSnapshot?.previousSignature || "").trim();
  const replacementSignature = String(normalizedSnapshot?.replacementSignature || "").trim();
  if (!content || !previousSignature || !replacementSignature) {
    clearStoredDraftKickoffSnapshot(paperId, cleanCandidateId);
    return;
  }
  try {
    window.localStorage?.setItem(
      key,
      JSON.stringify({
        paperId,
        candidateId: cleanCandidateId,
        content,
        previousSignature,
        replacementSignature,
        updatedAt: new Date().toISOString()
      })
    );
  } catch {}
}

async function runAction(action, successMessage) {
  syncFormFromDom();
  persistTranslationDraft();
  state.loading = true;
  setStatus(STATUS.loading, "loading");
  render();
  try {
    const result = await action();
    setResult(result);
    const resolvedSuccessMessage =
      typeof successMessage === "function" ? successMessage(result) : successMessage;
    const successStatus =
      resolvedSuccessMessage && typeof resolvedSuccessMessage === "object"
        ? {
            text: String(resolvedSuccessMessage.text || STATUS.loadedWorkspace),
            tone: String(resolvedSuccessMessage.tone || "").trim() || "ok"
          }
        : {
            text: String(resolvedSuccessMessage || STATUS.loadedWorkspace),
            tone: "ok"
          };
    setStatus(successStatus.text, successStatus.tone);
    return result;
  } catch (error) {
    setResult({
      stage: "error",
      code: error?.code || null,
      message: String(error?.message || error),
      details: error?.details || null
    });
    setStatus(`${STATUS.errorPrefix}${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    state.loading = false;
    render();
  }
}

async function handleCreateWorkspace() {
  await runAction(async () => {
    const workspace = await createPaperWorkspace({
      paperId: state.form.paperId,
      sourceId: state.form.sourceId,
      title: state.form.title
    });
    state.workspace = workspace;
    hydrateFormFromWorkspace(workspace);
    return { stage: "create_workspace", item: workspace };
  }, () =>
    chainedPaperWorkspaceStatusFeedback(
      STATUS.createdWorkspace,
      paperWorkspaceStatusFeedback("workspaceReadyForNotebookDraft", "createdWorkspace")
    ));
}

async function handleLoadWorkspace() {
  await runAction(async () => {
    const workspace = await fetchPaperWorkspace(state.form.paperId);
    state.workspace = workspace;
    const resumeStatus = hydrateFormFromWorkspace(workspace);
    return { stage: "load_workspace", item: workspace, resumeStatus };
  }, (result) => result?.resumeStatus || paperWorkspaceStatusFeedback("", "loadedWorkspace"));
}

async function handleAddNotebookDraft() {
  await runAction(async () => {
    const result = await addNotebookLmDraft(state.workspace?.paperId || state.form.paperId, buildNotebookLmPayload(state.form));
    state.workspace = result.item;
    const resumeStatus = hydrateFormFromWorkspace(state.workspace);
    return { stage: "notebooklm_draft", resumeStatus, ...result };
  }, (result) => chainedPaperWorkspaceStatusFeedback(STATUS.addedNotebookDraft, result?.resumeStatus));
}

async function handleSaveTranslation() {
  const translationSaveState = currentTranslationSaveState();
  if (!translationSaveState.action.enabled) {
    render();
    return;
  }
  const alignedPermanentCandidateBeforeSave = selectedAlignedPermanentCandidate(
    state.workspace,
    state.selectedPermanentCandidateId
  );
  const selectedPermanentCandidateIdBeforeSave =
    String(alignedPermanentCandidateBeforeSave?.paper_candidate_id || "").trim() === String(state.selectedCandidateId || "").trim()
      ? String(alignedPermanentCandidateBeforeSave?.id || "").trim()
      : "";
  const storedSignatureBeforeSave = resolvedTranslationSignatureForPermanentCandidate(
    state.workspaceSelection,
    selectedPermanentCandidateIdBeforeSave
  );
  const { translationSignature: baselineTranslationSignatureBeforeSave } =
    currentSelectedTranslationRuntimeContext(state.selectedCandidateId, { useForm: false });
  await runAction(async () => {
    const result = await savePaperTranslation(state.workspace?.paperId || state.form.paperId, {
      candidateId: state.selectedCandidateId,
      paraphraseText: state.form.paraphraseText,
      relationToQuestion: state.form.relationToQuestion,
      boundaryOrCondition: state.form.boundaryOrCondition
    });
    state.workspace = result.item;
    clearStoredTranslationDraft(currentPaperId(), state.selectedCandidateId);
    hydrateFormFromWorkspace(state.workspace);
    if (
      selectedPermanentCandidateIdBeforeSave &&
      !storedSignatureBeforeSave &&
      baselineTranslationSignatureBeforeSave
    ) {
      persistTranslationSignatureForPermanentCandidate(
        selectedPermanentCandidateIdBeforeSave,
        baselineTranslationSignatureBeforeSave
      );
    }
    return {
      stage: "save_translation",
      ...resolveTranslationSaveRuntimeState(
        state.workspace,
        state.workspaceSelection,
        state.selectedCandidateId,
        state.selectedPermanentCandidateId,
        {
          paraphraseText: state.form.paraphraseText,
          relationToQuestion: state.form.relationToQuestion,
          boundaryOrCondition: state.form.boundaryOrCondition
        }
      ),
      ...result
    };
  }, (result) => paperWorkspaceStatusFeedback(result?.successStatusKey, "savedTranslation"));
}

async function handleCreatePermanentCandidate() {
  const permanentCandidateState = currentPermanentCandidateState();
  if (!permanentCandidateState.action.enabled) {
    if (permanentCandidateState.blockedStatusKey) {
      const blockedStatus = paperWorkspaceStatusFeedback(
        permanentCandidateState.blockedStatusKey,
        "translationNeedsResaveBeforePermanentCandidate",
        permanentCandidateState.blockedStatusTone || "warn"
      );
      setStatus(blockedStatus.text, blockedStatus.tone);
    }
    render();
    return;
  }
  await runAction(async () => {
    const result = await createPaperPermanentCandidate(state.workspace?.paperId || state.form.paperId, {
      candidateId: state.selectedCandidateId
    });
    state.workspace = result.item;
    state.selectedPermanentCandidateId = result.permanentCandidate?.id || "";
    hydratePermanentCandidateForm();
    persistPermanentCandidateTranslationSignature(state.selectedPermanentCandidateId, state.selectedCandidateId);
    persistWorkspaceSelection();
    const resumeStatus = currentSelectionResumeStatus(state.workspaceSelection);
    return { stage: "permanent_candidate", resumeStatus, ...result };
  }, (result) => chainedPaperWorkspaceStatusFeedback(STATUS.createdPermanentCandidate, result?.resumeStatus));
}

async function handleSavePermanentNote() {
  syncFormFromDom();
  persistWorkspaceSelection();
  const permanentNoteState = currentPermanentNoteState();
  if (!permanentNoteState.action.enabled) {
    if (permanentNoteState.blockedStatusKey) {
      const blockedStatus = paperWorkspaceStatusFeedback(
        permanentNoteState.blockedStatusKey,
        "translationNeedsResaveBeforePermanentNote",
        permanentNoteState.blockedStatusTone || "warn"
      );
      setStatus(blockedStatus.text, blockedStatus.tone);
    }
    render();
    return;
  }
  await runAction(async () => {
    const result = await savePaperPermanentNote(state.workspace?.paperId || state.form.paperId, {
      permanentCandidateId: state.selectedPermanentCandidateId,
      confirmAuthorship: state.form.confirmAuthorship,
      status: state.form.saveStatus
    });
    state.workspace = result.item;
    const resumeStatus = hydrateFormFromWorkspace(state.workspace);
    return { stage: "save_permanent_note", resumeStatus, ...result };
  }, (result) => chainedPaperWorkspaceStatusFeedback(STATUS.savedPermanentNote, result?.resumeStatus));
}

async function handleCopyDraftBrief() {
  syncFormFromDom();
  const { draftBriefAction, draftContinuationAction, draftBrief } = currentDraftBriefState();
  if (!draftBriefAction.enabled || !String(draftBrief?.markdown || "").trim()) {
    const blockedStatus = blockedDraftContinuationStatusFeedback(draftContinuationAction);
    setStatus(blockedStatus.text, blockedStatus.tone);
    render();
    return;
  }
  try {
    await copyTextToClipboard(draftBrief.markdown);
    window.__paperWorkspaceLastDraftBrief = draftBrief.markdown;
    persistWorkspaceSelection({
      draftBriefCopy: {
        candidateId: state.selectedCandidateId,
        title: draftBrief.title,
        nextAction: draftContinuationAction?.label,
        translationSignature: currentSelectedTranslationRuntimeContext().translationSignature,
        copiedAt: new Date().toISOString()
      }
    });
    const nextAction = String(draftContinuationAction?.label || "").trim();
    const copyStatus = draftBriefCopyStatusFeedback(draftBrief.title, nextAction);
    setStatus(copyStatus.text, copyStatus.tone);
  } catch (error) {
    const copyStatus = draftBriefCopyStatusFeedback("", "", error);
    setStatus(copyStatus.text, copyStatus.tone);
  }
  render();
}

function focusDraftKickoffTextarea() {
  const textarea = document.getElementById("draftKickoffTextarea");
  if (!textarea) return;
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function currentDraftKickoffSignature() {
  return (
    String(state.form.draftKickoffSignature || "").trim() ||
    String(currentDraftKickoffState().currentTranslationSignature || "").trim()
  );
}

async function handleStartDraftKickoff() {
  syncFormFromDom();
  const { draftBriefAction, draftContinuationAction, draftBrief } = currentDraftBriefState();
  const kickoffState = currentDraftKickoffState();
  if (!draftBriefAction.enabled || !String(draftBrief?.markdown || "").trim()) {
    const blockedStatus = blockedDraftContinuationStatusFeedback(draftContinuationAction);
    setStatus(blockedStatus.text, blockedStatus.tone);
    render();
    return;
  }
  const shouldLoadFreshBrief = !kickoffState.hasContent || kickoffState.isStale;
  if (shouldLoadFreshBrief) {
    const { translationSignature } = currentSelectedTranslationRuntimeContext();
    const refreshedKickoff = resolveRefreshedDraftKickoff(state.form, kickoffState, draftBrief.markdown, translationSignature);
    if (!refreshedKickoff) {
      render();
      return;
    }
    state.form.draftKickoffText = refreshedKickoff.draftKickoffText;
    state.form.draftKickoffSignature = refreshedKickoff.draftKickoffSignature;
    state.form.draftKickoffPreviousText = refreshedKickoff.draftKickoffPreviousText;
    state.form.draftKickoffPreviousSignature = refreshedKickoff.draftKickoffPreviousSignature;
    state.form.draftKickoffReplacementSignature = refreshedKickoff.draftKickoffReplacementSignature;
    if (refreshedKickoff.snapshotToPersist) {
      persistDraftKickoffSnapshot(state.selectedCandidateId, refreshedKickoff.snapshotToPersist);
    }
    persistDraftKickoff(state.selectedCandidateId, {
      content: state.form.draftKickoffText,
      translationSignature: state.form.draftKickoffSignature
    });
    const nextAction = String(draftContinuationAction?.label || "").trim();
    const kickoffStatus = draftKickoffStatusFeedback("loaded", draftBrief.title, nextAction);
    setStatus(kickoffStatus.text, kickoffStatus.tone);
  } else {
    const nextAction = String(draftContinuationAction?.label || "").trim();
    const kickoffStatus = draftKickoffStatusFeedback("resumed", draftBrief.title, nextAction);
    setStatus(kickoffStatus.text, kickoffStatus.tone);
  }
  render();
  focusDraftKickoffTextarea();
}

async function handleAdoptPreviousKickoff() {
  syncFormFromDom();
  const kickoffState = currentDraftKickoffState();
  if (!kickoffState.previousSnapshot?.content) {
    render();
    return;
  }
  const adoptedKickoff = resolveAdoptedDraftKickoff(state.form, kickoffState, currentDraftKickoffSignature());
  if (!adoptedKickoff) {
    render();
    return;
  }
  state.form.draftKickoffText = adoptedKickoff.draftKickoffText;
  state.form.draftKickoffSignature = adoptedKickoff.draftKickoffSignature;
  state.form.draftKickoffPreviousText = adoptedKickoff.draftKickoffPreviousText;
  state.form.draftKickoffPreviousSignature = adoptedKickoff.draftKickoffPreviousSignature;
  state.form.draftKickoffReplacementSignature = adoptedKickoff.draftKickoffReplacementSignature;
  persistDraftKickoff(state.selectedCandidateId, {
    content: state.form.draftKickoffText,
    translationSignature: state.form.draftKickoffSignature
  });
  persistDraftKickoffSnapshot(state.selectedCandidateId, {
    content: state.form.draftKickoffPreviousText,
    previousSignature: state.form.draftKickoffPreviousSignature,
    replacementSignature: state.form.draftKickoffReplacementSignature
  });
  const kickoffStatus = draftKickoffStatusFeedback("adopted");
  setStatus(kickoffStatus.text, kickoffStatus.tone);
  render();
  focusDraftKickoffTextarea();
}

root?.addEventListener("input", (event) => {
  syncFormFromDom();
  persistTranslationDraft();
  if (event.target?.id === "draftKickoffTextarea") {
    persistDraftKickoff();
  }
  persistWorkspaceSelection();
  updateDynamicControls();
  if (shouldRefreshContinuityStatus(event.target)) {
    setLiveStatusFromCurrentSelection(readStoredWorkspaceSelection(currentPaperId()));
    rerenderPreservingContinuityFocus(event.target);
  }
});

root?.addEventListener("change", (event) => {
  syncFormFromDom();
  persistTranslationDraft();
  if (event.target?.id === "permanentStatusInput") {
    persistWorkspaceSelection({ saveStatus: event.target.value || "active" });
  } else if (event.target?.id === "confirmAuthorshipInput") {
    persistWorkspaceSelection({ confirmAuthorship: event.target.checked === true });
  } else {
    persistWorkspaceSelection();
  }
  updateDynamicControls();
  if (shouldRefreshContinuityStatus(event.target)) {
    setLiveStatusFromCurrentSelection(readStoredWorkspaceSelection(currentPaperId()));
    rerenderPreservingContinuityFocus(event.target);
  }
});

root?.addEventListener("click", (event) => {
  const candidateButton = event.target?.closest?.("[data-paper-candidate-id]");
  if (candidateButton) {
    syncFormFromDom();
    persistTranslationDraft();
    const storedSelection = readStoredWorkspaceSelection(currentPaperId());
    state.selectedCandidateId = candidateButton.getAttribute("data-paper-candidate-id") || "";
    hydrateSelectedPaperCandidateState(storedSelection);
    persistWorkspaceSelection();
    setLiveStatusFromCurrentSelection(readStoredWorkspaceSelection(currentPaperId()));
    render();
    return;
  }

  const permanentCandidateButton = event.target?.closest?.("[data-paper-permanent-candidate-id]");
  if (permanentCandidateButton) {
    syncFormFromDom();
    persistTranslationDraft();
    const storedSelection = readStoredWorkspaceSelection(currentPaperId());
    state.selectedPermanentCandidateId = permanentCandidateButton.getAttribute("data-paper-permanent-candidate-id") || "";
    const alignedPaperCandidateId = selectedPaperCandidateIdForPermanentCandidate(
      state.workspace,
      state.selectedPermanentCandidateId
    );
    if (alignedPaperCandidateId) {
      state.selectedCandidateId = alignedPaperCandidateId;
      hydrateTranslationForm(state.selectedCandidateId);
    }
    hydratePermanentCandidateForm(storedSelection);
    persistWorkspaceSelection();
    setLiveStatusFromCurrentSelection(readStoredWorkspaceSelection(currentPaperId()));
    render();
    return;
  }

  const id = event.target?.id || "";
  if (id === "btnCreatePaperWorkspace") void handleCreateWorkspace();
  if (id === "btnLoadPaperWorkspace") void handleLoadWorkspace();
  if (id === "btnAddNotebookDraft") void handleAddNotebookDraft();
  if (id === "btnSaveTranslation") void handleSaveTranslation();
  if (id === "btnCreatePermanentCandidate") void handleCreatePermanentCandidate();
  if (id === "btnSavePermanentNote") void handleSavePermanentNote();
  if (id === "btnCopyDraftBrief") void handleCopyDraftBrief();
  if (id === "btnStartDraftKickoff") void handleStartDraftKickoff();
  if (id === "btnAdoptPreviousKickoff") void handleAdoptPreviousKickoff();
});

setStatus(`${STATUS.connectedApiPrefix}${getPaperWorkspaceApiBase()}`, "ok");
render();
