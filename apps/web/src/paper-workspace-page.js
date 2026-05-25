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
  canCreatePermanentCandidate,
  canSavePermanentNote,
  canSubmitNotebookDraft,
  createInitialPaperWorkspaceState,
  draftBriefActionState,
  draftKickoffActionState,
  draftContinuationActionState,
  draftContinuationBrief,
  nextSelectedCandidateId,
  permanentCandidatePersistenceDefaults,
  permanentCandidateActionState,
  permanentNoteActionState,
  permanentNoteContinuityState,
  paperWorkspaceLiveStatusKey,
  paperWorkspaceResumeStatusKey,
  preferredPaperCandidateIdForWorkspaceResume,
  resolveSelectedPaperCandidateState,
  resolveSelectedPaperWorkspaceState,
  resolvedTranslationSignatureForPermanentCandidate,
  resolvedConfirmAuthorshipForPermanentCandidate,
  resolvedSaveStatusForPermanentCandidate,
  translationSaveActionState,
  translationDraftSupportsNextStep,
  translationContinuitySignature,
  normalizeTranslationDraftInput,
  resolvedStoredTranslationDraft,
  selectedAlignedPermanentCandidate,
  selectedPaperCandidateIdForPermanentCandidate,
  selectedPermanentCandidate,
  translationDraftHasLocalChanges,
  translationDraftForCandidate
} from "./paper-workspace-model.js";
import { renderPaperWorkspacePage } from "./paper-workspace-panel.js";

const TRANSLATION_DRAFT_STORAGE_PREFIX = "yansilu:paper-workspace:translation-draft";
const DRAFT_KICKOFF_STORAGE_PREFIX = "yansilu:paper-workspace:draft-kickoff";
const DRAFT_KICKOFF_SNAPSHOT_STORAGE_PREFIX = "yansilu:paper-workspace:draft-kickoff-snapshot";
const WORKSPACE_SELECTION_STORAGE_PREFIX = "yansilu:paper-workspace:selection";

const STATUS = {
  loading: "\u5904\u7406\u4e2d...",
  errorPrefix: "\u64cd\u4f5c\u5931\u8d25\uff1a",
  createdWorkspace: "\u8bba\u6587\u5de5\u4f5c\u53f0\u5df2\u521b\u5efa",
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
  const translationSignature = translationContinuitySignature(state.workspace, candidateId, {
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
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

  const draftInput = normalizeTranslationDraftInput({
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
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

function currentSelectionResumeStatus(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  const draft = translationDraftForCandidate(state.workspace, state.selectedCandidateId, {
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
  const workspaceState = {
    selectedPermanentCandidateId: String(state.selectedPermanentCandidateId || "").trim(),
    permanentNoteContinuityReason: permanentNoteContinuityState(
      state.workspace,
      storedSelection,
      state.selectedPermanentCandidateId,
      state.selectedCandidateId,
      {
        paraphraseText: state.form.paraphraseText,
        relationToQuestion: state.form.relationToQuestion,
        boundaryOrCondition: state.form.boundaryOrCondition
      }
    ).reason
  };
  const statusKey = paperWorkspaceResumeStatusKey(
    {
      selectedCandidateId: String(state.selectedCandidateId || "").trim(),
      hasSavedTranslation: draft.hasSavedTranslation,
      hasLocalChanges: draft.hasLocalChanges,
      supportsNextStep: Boolean(String(draft.relationToQuestion || "").trim() && String(draft.boundaryOrCondition || "").trim())
    },
    workspaceState
  );
  return {
    key: statusKey,
    tone: continuityStatusTone(statusKey)
  };
}

function currentSelectionLiveStatus(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  const draft = translationDraftForCandidate(state.workspace, state.selectedCandidateId, {
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
  const workspaceState = {
    selectedPermanentCandidateId: String(state.selectedPermanentCandidateId || "").trim(),
    permanentNoteContinuityReason: permanentNoteContinuityState(
      state.workspace,
      storedSelection,
      state.selectedPermanentCandidateId,
      state.selectedCandidateId,
      {
        paraphraseText: state.form.paraphraseText,
        relationToQuestion: state.form.relationToQuestion,
        boundaryOrCondition: state.form.boundaryOrCondition
      }
    ).reason
  };
  const statusKey = paperWorkspaceLiveStatusKey(
    {
      selectedCandidateId: String(state.selectedCandidateId || "").trim(),
      hasSavedTranslation: draft.hasSavedTranslation,
      hasLocalChanges: draft.hasLocalChanges,
      supportsNextStep: Boolean(String(draft.relationToQuestion || "").trim() && String(draft.boundaryOrCondition || "").trim())
    },
    workspaceState
  );
  return {
    key: statusKey,
    tone: continuityStatusTone(statusKey)
  };
}

function continuityStatusTone(statusKey = "") {
  const cleanKey = String(statusKey || "").trim();
  if (
    cleanKey.startsWith("translationNeeds") ||
    cleanKey === "savedTranslationNeedsDraftSupport" ||
    cleanKey === "restoredLocalTranslationDraftForPermanentNote" ||
    cleanKey === "restoredLocalTranslationDraftForSavedPermanentNote"
  ) {
    return "warn";
  }
  if (cleanKey === "selectedCandidate") return "";
  return "ok";
}

function setStatusFromCurrentSelection(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  const resumeStatus = currentSelectionResumeStatus(storedSelection);
  setStatus(STATUS[resumeStatus.key] || STATUS.loadedWorkspace, resumeStatus.tone);
}

function setLiveStatusFromCurrentSelection(storedSelection = readStoredWorkspaceSelection(currentPaperId())) {
  if (!currentLoadedWorkspacePaperId()) return;
  const liveStatus = currentSelectionLiveStatus(storedSelection);
  setStatus(STATUS[liveStatus.key] || STATUS.loadedWorkspace, liveStatus.tone);
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
  return paperWorkspaceResumeStatusKey(resolvedCandidateState, resolvedState);
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
  const translationSaveAction = translationSaveActionState(state.workspace, state.selectedCandidateId, {
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
  const saveTranslationButton = document.getElementById("btnSaveTranslation");
  if (saveTranslationButton) {
    saveTranslationButton.disabled = !translationSaveAction.enabled;
    saveTranslationButton.textContent = translationSaveAction.label;
  }
  const notebookDraftButton = document.getElementById("btnAddNotebookDraft");
  if (notebookDraftButton) {
    notebookDraftButton.disabled = !canSubmitNotebookDraft(state.form, state.workspace);
  }
  const permanentCandidateButton = document.getElementById("btnCreatePermanentCandidate");
  if (permanentCandidateButton) {
    const permanentCandidateAction = permanentCandidateActionState(
      state.workspace,
      state.workspaceSelection,
      state.selectedCandidateId,
      state.selectedPermanentCandidateId,
      {
        paraphraseText: state.form.paraphraseText,
        relationToQuestion: state.form.relationToQuestion,
        boundaryOrCondition: state.form.boundaryOrCondition
      }
    );
    permanentCandidateButton.disabled = !permanentCandidateAction.enabled;
    permanentCandidateButton.textContent = permanentCandidateAction.label;
  }
  const savePermanentNoteButton = document.getElementById("btnSavePermanentNote");
  const confirmAuthorshipInput = document.getElementById("confirmAuthorshipInput");
  const permanentStatusInput = document.getElementById("permanentStatusInput");
  if (savePermanentNoteButton) {
    const permanentNoteAction = permanentNoteActionState(
      state.workspace,
      state.workspaceSelection,
      state.selectedPermanentCandidateId,
      state.selectedCandidateId,
      {
        paraphraseText: state.form.paraphraseText,
        relationToQuestion: state.form.relationToQuestion,
        boundaryOrCondition: state.form.boundaryOrCondition
      }
    );
    savePermanentNoteButton.disabled = !permanentNoteAction.enabled;
    savePermanentNoteButton.textContent = permanentNoteAction.label;
    if (confirmAuthorshipInput) {
      confirmAuthorshipInput.disabled = !permanentNoteAction.enabled;
    }
    if (permanentStatusInput) {
      permanentStatusInput.disabled = !permanentNoteAction.enabled;
    }
  }
  const copyDraftBriefButton = document.getElementById("btnCopyDraftBrief");
  if (copyDraftBriefButton) {
    const { draftBriefAction, draftContinuationAction } = currentDraftBriefState();
    copyDraftBriefButton.disabled = !draftBriefAction.enabled;
    copyDraftBriefButton.textContent = runtimeDraftBriefButtonLabel(draftBriefAction, draftContinuationAction);
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
  const draft = translationDraftForCandidate(state.workspace, state.selectedCandidateId, {
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
  const continuityReason = permanentNoteContinuityState(
    state.workspace,
    state.workspaceSelection,
    state.selectedPermanentCandidateId,
    state.selectedCandidateId,
    {
      paraphraseText: state.form.paraphraseText,
      relationToQuestion: state.form.relationToQuestion,
      boundaryOrCondition: state.form.boundaryOrCondition
    }
  ).reason;
  const candidateState = {
    selectedCandidateId: state.selectedCandidateId,
    hasSavedTranslation: draft.hasSavedTranslation,
    hasLocalChanges: draft.hasLocalChanges,
    supportsNextStep: Boolean(String(draft.relationToQuestion || "").trim() && String(draft.boundaryOrCondition || "").trim())
  };
  const workspaceState = {
    selectedPermanentCandidateId: state.selectedPermanentCandidateId,
    permanentNoteContinuityReason: continuityReason
  };
  const draftBrief = draftContinuationBrief(
    state.workspace,
    state.workspaceSelection,
    state.selectedCandidateId,
    state.selectedPermanentCandidateId,
    {
      paraphraseText: state.form.paraphraseText,
      relationToQuestion: state.form.relationToQuestion,
      boundaryOrCondition: state.form.boundaryOrCondition
    }
  );
  const currentTranslationSignature = translationContinuitySignature(state.workspace, state.selectedCandidateId, {
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
  const recentDraftBriefCopy = (() => {
    const selectedCandidateId = String(state.selectedCandidateId || "").trim();
    if (!selectedCandidateId || !currentTranslationSignature) return null;
    const storedCopy = state.workspaceSelection?.draftBriefByCandidate?.[selectedCandidateId];
    if (!storedCopy || storedCopy.translationSignature !== currentTranslationSignature) return null;
    return storedCopy;
  })();
  return {
    draftBriefAction: draftBriefActionState(candidateState, workspaceState),
    draftContinuationAction: draftContinuationActionState(candidateState, workspaceState),
    draftBrief,
    recentDraftBriefCopy
  };
}

function currentDraftKickoffState() {
  const currentTranslationSignature = translationContinuitySignature(state.workspace, state.selectedCandidateId, {
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
  const content = String(state.form.draftKickoffText || "").trim();
  const storedSignature = String(state.form.draftKickoffSignature || "").trim();
  const previousContent = String(state.form.draftKickoffPreviousText || "").trim();
  const previousSignature = String(state.form.draftKickoffPreviousSignature || "").trim();
  const replacementSignature = String(state.form.draftKickoffReplacementSignature || "").trim();
  const draft = translationDraftForCandidate(state.workspace, state.selectedCandidateId, {
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
  const continuityReason = permanentNoteContinuityState(
    state.workspace,
    state.workspaceSelection,
    state.selectedPermanentCandidateId,
    state.selectedCandidateId,
    {
      paraphraseText: state.form.paraphraseText,
      relationToQuestion: state.form.relationToQuestion,
      boundaryOrCondition: state.form.boundaryOrCondition
    }
  ).reason;
  const isStale = Boolean(content && storedSignature && currentTranslationSignature && storedSignature !== currentTranslationSignature);
  const showPreviousSnapshot = Boolean(
    previousContent &&
      previousSignature &&
      replacementSignature &&
      storedSignature &&
      replacementSignature === storedSignature
  );
  return {
    content,
    translationSignature: storedSignature,
    currentTranslationSignature,
    hasContent: Boolean(content),
    isStale,
    previousSnapshot: showPreviousSnapshot
      ? {
          content: previousContent,
          previousSignature,
          replacementSignature
        }
      : null,
    action: draftKickoffActionState(
      {
        selectedCandidateId: state.selectedCandidateId,
        hasSavedTranslation: draft.hasSavedTranslation,
        hasLocalChanges: draft.hasLocalChanges,
        supportsNextStep: Boolean(String(draft.relationToQuestion || "").trim() && String(draft.boundaryOrCondition || "").trim())
      },
      {
        selectedPermanentCandidateId: state.selectedPermanentCandidateId,
        permanentNoteContinuityReason: continuityReason
      },
      {
        hasContent: Boolean(content),
        isStale
      }
    )
  };
}

function runtimeDraftBriefButtonLabel(draftBriefAction, draftContinuationAction) {
  if (!draftBriefAction?.enabled) {
    switch (String(draftContinuationAction?.key || "").trim()) {
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
        return String(draftBriefAction?.label || "当前还不能复制 draft brief");
    }
  }
  switch (String(draftContinuationAction?.key || "").trim()) {
    case "review_saved_permanent_note":
      return "复制 brief，回看已保存路径";
    case "review_permanent_candidate":
      return "复制 brief，回看 Step 4";
    case "draft_ready":
    default:
      return "复制 brief，继续写 draft";
  }
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
    setStatus(String(resolvedSuccessMessage || STATUS.loadedWorkspace), "ok");
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
  }, STATUS.createdWorkspace);
}

async function handleLoadWorkspace() {
  await runAction(async () => {
    const workspace = await fetchPaperWorkspace(state.form.paperId);
    state.workspace = workspace;
    const resumeStatusKey = hydrateFormFromWorkspace(workspace);
    return { stage: "load_workspace", item: workspace, resumeStatusKey };
  }, (result) => STATUS[result?.resumeStatusKey] || STATUS.loadedWorkspace);
  if (state.workspace) {
    setStatusFromCurrentSelection(readStoredWorkspaceSelection(currentPaperId()));
    render();
  }
}

async function handleAddNotebookDraft() {
  await runAction(async () => {
    const result = await addNotebookLmDraft(state.workspace?.paperId || state.form.paperId, buildNotebookLmPayload(state.form));
    state.workspace = result.item;
    hydrateFormFromWorkspace(state.workspace);
    return { stage: "notebooklm_draft", ...result };
  }, STATUS.addedNotebookDraft);
}

async function handleSaveTranslation() {
  const translationSaveAction = translationSaveActionState(state.workspace, state.selectedCandidateId, {
    paraphraseText: state.form.paraphraseText,
    relationToQuestion: state.form.relationToQuestion,
    boundaryOrCondition: state.form.boundaryOrCondition
  });
  if (!translationSaveAction.enabled) {
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
  const baselineTranslationSignatureBeforeSave = translationContinuitySignature(
    state.workspace,
    state.selectedCandidateId
  );
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
    const continuityState = permanentNoteContinuityState(
      state.workspace,
      state.workspaceSelection,
      state.selectedPermanentCandidateId,
      state.selectedCandidateId,
      {
        paraphraseText: state.form.paraphraseText,
        relationToQuestion: state.form.relationToQuestion,
        boundaryOrCondition: state.form.boundaryOrCondition
      }
    );
    return {
      stage: "save_translation",
      permanentNoteContinuityReason: continuityState.reason,
      supportsNextStep: translationDraftSupportsNextStep(state.workspace, state.selectedCandidateId, {
        paraphraseText: state.form.paraphraseText,
        relationToQuestion: state.form.relationToQuestion,
        boundaryOrCondition: state.form.boundaryOrCondition
      }),
      ...result
    };
  }, (result) =>
    result?.permanentNoteContinuityReason === "stale_translation_signature"
      ? STATUS.translationNeedsFreshPermanentCandidate
      : result?.supportsNextStep === false
      ? STATUS.savedTranslationNeedsDraftSupport
      : STATUS.savedTranslation);
}

async function handleCreatePermanentCandidate() {
  if (
    !canCreatePermanentCandidate(state.workspace, state.selectedCandidateId, {
      paraphraseText: state.form.paraphraseText,
      relationToQuestion: state.form.relationToQuestion,
      boundaryOrCondition: state.form.boundaryOrCondition
    })
  ) {
    setStatus(STATUS.translationNeedsResaveBeforePermanentCandidate, "warn");
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
    return { stage: "permanent_candidate", ...result };
  }, STATUS.createdPermanentCandidate);
}

async function handleSavePermanentNote() {
  syncFormFromDom();
  persistWorkspaceSelection();
  const continuityState = permanentNoteContinuityState(
    state.workspace,
    state.workspaceSelection,
    state.selectedPermanentCandidateId,
    state.selectedCandidateId,
    {
      paraphraseText: state.form.paraphraseText,
      relationToQuestion: state.form.relationToQuestion,
      boundaryOrCondition: state.form.boundaryOrCondition
    }
  );
  if (
    !continuityState.allowed
  ) {
    setStatus(
      continuityState.reason === "stale_translation_signature"
        ? STATUS.translationNeedsFreshPermanentCandidate
        : STATUS.translationNeedsResaveBeforePermanentNote,
      "warn"
    );
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
    hydrateFormFromWorkspace(state.workspace);
    return { stage: "save_permanent_note", ...result };
  }, STATUS.savedPermanentNote);
}

async function handleCopyDraftBrief() {
  syncFormFromDom();
  const { draftBriefAction, draftContinuationAction, draftBrief } = currentDraftBriefState();
  if (!draftBriefAction.enabled || !String(draftBrief?.markdown || "").trim()) {
    setStatus(String(draftContinuationAction?.label || "当前还不能继续写 draft。"), "warn");
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
        translationSignature: translationContinuitySignature(state.workspace, state.selectedCandidateId, {
          paraphraseText: state.form.paraphraseText,
          relationToQuestion: state.form.relationToQuestion,
          boundaryOrCondition: state.form.boundaryOrCondition
        }),
        copiedAt: new Date().toISOString()
      }
    });
    const nextAction = String(draftContinuationAction?.label || "").trim();
    setStatus(nextAction ? `已复制 draft brief：${draftBrief.title}。下一步：${nextAction}` : `已复制 draft brief：${draftBrief.title}`, "ok");
  } catch (error) {
    setStatus(`复制 draft brief 失败：${String(error?.message || error)}`, "bad");
  }
  render();
}

function focusDraftKickoffTextarea() {
  const textarea = document.getElementById("draftKickoffTextarea");
  if (!textarea) return;
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

async function handleStartDraftKickoff() {
  syncFormFromDom();
  const { draftBriefAction, draftContinuationAction, draftBrief } = currentDraftBriefState();
  const kickoffState = currentDraftKickoffState();
  if (!draftBriefAction.enabled || !String(draftBrief?.markdown || "").trim()) {
    setStatus(String(draftContinuationAction?.label || "当前还不能继续写 draft。"), "warn");
    render();
    return;
  }
  const shouldLoadFreshBrief = !kickoffState.hasContent || kickoffState.isStale;
  if (shouldLoadFreshBrief) {
    const translationSignature = translationContinuitySignature(state.workspace, state.selectedCandidateId, {
      paraphraseText: state.form.paraphraseText,
      relationToQuestion: state.form.relationToQuestion,
      boundaryOrCondition: state.form.boundaryOrCondition
    });
    if (kickoffState.isStale && kickoffState.hasContent) {
      state.form.draftKickoffPreviousText = state.form.draftKickoffText;
      state.form.draftKickoffPreviousSignature = state.form.draftKickoffSignature;
      state.form.draftKickoffReplacementSignature = translationSignature;
      persistDraftKickoffSnapshot(state.selectedCandidateId, {
        content: state.form.draftKickoffPreviousText,
        previousSignature: state.form.draftKickoffPreviousSignature,
        replacementSignature: state.form.draftKickoffReplacementSignature
      });
    }
    state.form.draftKickoffText = draftBrief.markdown;
    state.form.draftKickoffSignature = translationSignature;
    persistDraftKickoff(state.selectedCandidateId, {
      content: state.form.draftKickoffText,
      translationSignature
    });
    const nextAction = String(draftContinuationAction?.label || "").trim();
    setStatus(
      nextAction
        ? `已载入本地 draft kickoff：${draftBrief.title}。下一步：${nextAction}`
        : `已载入本地 draft kickoff：${draftBrief.title}`,
      "ok"
    );
  } else {
    const nextAction = String(draftContinuationAction?.label || "").trim();
    setStatus(
      nextAction ? `继续本地 draft：${draftBrief.title}。下一步：${nextAction}` : `继续本地 draft：${draftBrief.title}`,
      "ok"
    );
  }
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
});

setStatus(`${STATUS.connectedApiPrefix}${getPaperWorkspaceApiBase()}`, "ok");
render();
