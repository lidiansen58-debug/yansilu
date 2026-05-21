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
  canSubmitNotebookDraft,
  createInitialPaperWorkspaceState,
  nextSelectedCandidateId,
  nextSelectedPermanentCandidateId,
  normalizeTranslationDraftInput,
  translationDraftHasLocalChanges,
  translationDraftForCandidate
} from "./paper-workspace-model.js";
import { renderPaperWorkspacePage } from "./paper-workspace-panel.js";

const TRANSLATION_DRAFT_STORAGE_PREFIX = "yansilu:paper-workspace:translation-draft";
const WORKSPACE_SELECTION_STORAGE_PREFIX = "yansilu:paper-workspace:selection";

const STATUS = {
  loading: "\u5904\u7406\u4e2d...",
  errorPrefix: "\u64cd\u4f5c\u5931\u8d25\uff1a",
  createdWorkspace: "\u8bba\u6587\u5de5\u4f5c\u53f0\u5df2\u521b\u5efa",
  loadedWorkspace: "\u8bba\u6587\u5de5\u4f5c\u53f0\u5df2\u8bfb\u53d6",
  addedNotebookDraft: "NotebookLM \u5185\u5bb9\u5df2\u8f6c\u6210 literature \u5019\u9009",
  savedTranslation: "\u7528\u6237\u8f6c\u8ff0\u5df2\u4fdd\u5b58",
  createdPermanentCandidate: "\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u5df2\u751f\u6210",
  savedPermanentNote: "\u6c38\u4e45\u7b14\u8bb0\u5df2\u4fdd\u5b58",
  restoredSavedTranslation:
    "\u5df2\u6062\u590d\u8fd9\u6761\u5019\u9009\u7684\u7528\u6237\u8f6c\u8ff0\uff0c\u53ef\u4ee5\u7ee7\u7eed\u4fee\u6539\u6216\u8fdb\u5165\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002",
  selectedCandidate:
    "\u5df2\u9009\u62e9\u5019\u9009\u3002\u5148\u7528\u81ea\u5df1\u7684\u8bdd\u5b8c\u6210\u8f6c\u8ff0\u5e76\u4fdd\u5b58\uff0c\u518d\u8fdb\u5165\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002",
  restoredPermanentCandidate:
    "\u5df2\u6062\u590d\u8fd9\u6761\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\uff0c\u53ef\u7ee7\u7eed\u786e\u8ba4\u4fdd\u5b58\u6216\u56de\u770b\u98ce\u9669\u63d0\u793a\u3002",
  connectedApiPrefix: "\u5df2\u8fde\u63a5 API\uff1a"
};

const state = createInitialPaperWorkspaceState();
const root = document.getElementById("paperWorkspaceApp");

function setStatus(text, tone = "") {
  state.statusText = text;
  state.statusTone = tone;
}

function setResult(result) {
  state.lastResult = result;
}

function currentPaperId() {
  return String(state.workspace?.paperId || state.form.paperId || "").trim();
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

function readStoredTranslationDraft(paperId, candidateId) {
  const key = translationDraftStorageKey(paperId, candidateId);
  if (!key) return null;
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeTranslationDraftInput(parsed || {});
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
    return {
      selectedCandidateId: String(parsed.selectedCandidateId || "").trim(),
      selectedPermanentCandidateId: String(parsed.selectedPermanentCandidateId || "").trim(),
      saveStatus: String(parsed.saveStatus || "").trim()
    };
  } catch {
    return null;
  }
}

function persistWorkspaceSelection(overrides = {}) {
  const paperId = currentPaperId();
  const key = workspaceSelectionStorageKey(paperId);
  if (!key) return;
  try {
    window.localStorage?.setItem(
      key,
      JSON.stringify({
        paperId,
        selectedCandidateId: String(state.selectedCandidateId || "").trim(),
        selectedPermanentCandidateId: String(state.selectedPermanentCandidateId || "").trim(),
        saveStatus: String(overrides.saveStatus ?? state.form.saveStatus ?? "").trim(),
        updatedAt: new Date().toISOString()
      })
    );
  } catch {}
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
  state.form.confirmAuthorship = document.getElementById("confirmAuthorshipInput")?.checked === true;
  state.form.saveStatus = document.getElementById("permanentStatusInput")?.value || "active";
}

function hydrateTranslationForm(candidateId = "") {
  const draft = translationDraftForCandidate(
    state.workspace,
    candidateId,
    readStoredTranslationDraft(currentPaperId(), candidateId)
  );
  state.form.paraphraseText = draft.paraphraseText;
  state.form.relationToQuestion = draft.relationToQuestion;
  state.form.boundaryOrCondition = draft.boundaryOrCondition;
}

function hydrateFormFromWorkspace(workspace) {
  if (!workspace) return;
  const storedSelection = readStoredWorkspaceSelection(workspace.paperId);
  state.form.paperId = workspace.paperId || state.form.paperId;
  state.form.sourceId = workspace.sourceId || state.form.sourceId;
  state.form.title = workspace.title || state.form.title;
  state.form.saveStatus = storedSelection?.saveStatus || state.form.saveStatus;
  state.selectedCandidateId = nextSelectedCandidateId(
    workspace,
    state.selectedCandidateId || storedSelection?.selectedCandidateId || "",
    {
      candidateIdHasLocalDraft: (candidateId) => candidateHasStoredTranslationDraft(workspace.paperId, candidateId)
    }
  );
  state.selectedPermanentCandidateId = nextSelectedPermanentCandidateId(
    workspace,
    state.selectedPermanentCandidateId || storedSelection?.selectedPermanentCandidateId || state.selectedCandidateId || ""
  );
  hydrateTranslationForm(state.selectedCandidateId);
  persistWorkspaceSelection();
}

function render() {
  if (!root) return;
  root.innerHTML = renderPaperWorkspacePage(state);
  updateDynamicControls();
}

function updateDynamicControls() {
  const notebookDraftButton = document.getElementById("btnAddNotebookDraft");
  if (notebookDraftButton) {
    notebookDraftButton.disabled = !canSubmitNotebookDraft(state.form, state.workspace);
  }
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
    setStatus(successMessage, "ok");
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
    hydrateFormFromWorkspace(workspace);
    return { stage: "load_workspace", item: workspace };
  }, STATUS.loadedWorkspace);
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
    return { stage: "save_translation", ...result };
  }, STATUS.savedTranslation);
}

async function handleCreatePermanentCandidate() {
  await runAction(async () => {
    const result = await createPaperPermanentCandidate(state.workspace?.paperId || state.form.paperId, {
      candidateId: state.selectedCandidateId
    });
    state.workspace = result.item;
    state.selectedPermanentCandidateId = result.permanentCandidate?.id || nextSelectedPermanentCandidateId(state.workspace, "");
    persistWorkspaceSelection();
    return { stage: "permanent_candidate", ...result };
  }, STATUS.createdPermanentCandidate);
}

async function handleSavePermanentNote() {
  syncFormFromDom();
  persistWorkspaceSelection();
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

root?.addEventListener("input", () => {
  syncFormFromDom();
  persistTranslationDraft();
  persistWorkspaceSelection();
  updateDynamicControls();
});

root?.addEventListener("change", (event) => {
  syncFormFromDom();
  persistTranslationDraft();
  if (event.target?.id === "permanentStatusInput") {
    persistWorkspaceSelection({ saveStatus: event.target.value || "active" });
  } else {
    persistWorkspaceSelection();
  }
  updateDynamicControls();
});

root?.addEventListener("click", (event) => {
  const candidateButton = event.target?.closest?.("[data-paper-candidate-id]");
  if (candidateButton) {
    syncFormFromDom();
    persistTranslationDraft();
    state.selectedCandidateId = candidateButton.getAttribute("data-paper-candidate-id") || "";
    hydrateTranslationForm(state.selectedCandidateId);
    persistWorkspaceSelection();
    if (canCreatePermanentCandidate(state.workspace, state.selectedCandidateId)) {
      setStatus(STATUS.restoredSavedTranslation, "ok");
    } else {
      setStatus(STATUS.selectedCandidate, "");
    }
    render();
    return;
  }

  const permanentCandidateButton = event.target?.closest?.("[data-paper-permanent-candidate-id]");
  if (permanentCandidateButton) {
    syncFormFromDom();
    state.selectedPermanentCandidateId = permanentCandidateButton.getAttribute("data-paper-permanent-candidate-id") || "";
    persistWorkspaceSelection();
    setStatus(STATUS.restoredPermanentCandidate, "ok");
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
});

setStatus(`${STATUS.connectedApiPrefix}${getPaperWorkspaceApiBase()}`, "ok");
render();
