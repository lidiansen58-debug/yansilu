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
  translationDraftForCandidate
} from "./paper-workspace-model.js";
import { renderPaperWorkspacePage } from "./paper-workspace-panel.js";

const state = createInitialPaperWorkspaceState();
const root = document.getElementById("paperWorkspaceApp");

function setStatus(text, tone = "") {
  state.statusText = text;
  state.statusTone = tone;
}

function setResult(result) {
  state.lastResult = result;
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
  const draft = translationDraftForCandidate(state.workspace, candidateId);
  state.form.paraphraseText = draft.paraphraseText;
  state.form.relationToQuestion = draft.relationToQuestion;
  state.form.boundaryOrCondition = draft.boundaryOrCondition;
}

function hydrateFormFromWorkspace(workspace) {
  if (!workspace) return;
  state.form.paperId = workspace.paperId || state.form.paperId;
  state.form.sourceId = workspace.sourceId || state.form.sourceId;
  state.form.title = workspace.title || state.form.title;
  state.selectedCandidateId = nextSelectedCandidateId(workspace, state.selectedCandidateId);
  state.selectedPermanentCandidateId = nextSelectedPermanentCandidateId(workspace, state.selectedPermanentCandidateId);
  hydrateTranslationForm(state.selectedCandidateId);
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
  state.loading = true;
  setStatus("处理中...", "loading");
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
    setStatus(`操作失败：${String(error?.message || error)}`, "bad");
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
  }, "论文工作台已创建");
}

async function handleLoadWorkspace() {
  await runAction(async () => {
    const workspace = await fetchPaperWorkspace(state.form.paperId);
    state.workspace = workspace;
    hydrateFormFromWorkspace(workspace);
    return { stage: "load_workspace", item: workspace };
  }, "论文工作台已读取");
}

async function handleAddNotebookDraft() {
  await runAction(async () => {
    const result = await addNotebookLmDraft(state.workspace?.paperId || state.form.paperId, buildNotebookLmPayload(state.form));
    state.workspace = result.item;
    hydrateFormFromWorkspace(state.workspace);
    return { stage: "notebooklm_draft", ...result };
  }, "NotebookLM 内容已转成 literature 候选");
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
    hydrateFormFromWorkspace(state.workspace);
    return { stage: "save_translation", ...result };
  }, "用户转述已保存");
}

async function handleCreatePermanentCandidate() {
  await runAction(async () => {
    const result = await createPaperPermanentCandidate(state.workspace?.paperId || state.form.paperId, {
      candidateId: state.selectedCandidateId
    });
    state.workspace = result.item;
    state.selectedPermanentCandidateId = result.permanentCandidate?.id || nextSelectedPermanentCandidateId(state.workspace, "");
    return { stage: "permanent_candidate", ...result };
  }, "永久笔记候选已生成");
}

async function handleSavePermanentNote() {
  await runAction(async () => {
    const result = await savePaperPermanentNote(state.workspace?.paperId || state.form.paperId, {
      permanentCandidateId: state.selectedPermanentCandidateId,
      confirmAuthorship: state.form.confirmAuthorship,
      status: state.form.saveStatus
    });
    state.workspace = result.item;
    hydrateFormFromWorkspace(state.workspace);
    return { stage: "save_permanent_note", ...result };
  }, "永久笔记已保存");
}

root?.addEventListener("input", () => {
  syncFormFromDom();
  updateDynamicControls();
});

root?.addEventListener("change", () => {
  syncFormFromDom();
  updateDynamicControls();
});

root?.addEventListener("click", (event) => {
  const candidateButton = event.target?.closest?.("[data-paper-candidate-id]");
  if (candidateButton) {
    syncFormFromDom();
    state.selectedCandidateId = candidateButton.getAttribute("data-paper-candidate-id") || "";
    hydrateTranslationForm(state.selectedCandidateId);
    if (canCreatePermanentCandidate(state.workspace, state.selectedCandidateId)) {
      setStatus("已恢复这条候选的用户转述，可以继续修改或进入永久笔记候选。", "ok");
    } else {
      setStatus("已选择候选。先用自己的话完成转述并保存，再进入永久笔记候选。", "");
    }
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

setStatus(`已连接 API：${getPaperWorkspaceApiBase()}`, "ok");
render();
