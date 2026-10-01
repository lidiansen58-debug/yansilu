import { completeSmartNotesDemoSavedDraft, smartNotesDemoPendingDraft } from "./smart-notes-demo-practice-progress.js";
import { assertWritingBookChapterCanLeave, recordWritingBookChapterInput, saveWritingBookChapter, selectedWritingBookChapter } from "./writing-book-chapter-controller.js";
import { writingBookDirectoryPending } from "./writing-book-directory-controller.js";
import { acknowledgeWritingNoteBinding, createWritingNoteWithRecovery } from "./writing-note-creation-recovery.js";
import { checkpointArticleInput, clearWritingInput } from "./writing-input-recovery.js";
import { saveEditorNoteWithRecovery } from "./editor-save-recovery.js";

const pendingSaves = new WeakMap();

export function normalizeWritingDraftTitle(title = "") {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return "未命名文章";
  return cleanTitle.replace(/\s+主题\s+草稿$/u, "").replace(/\s+草稿$/u, "").trim() || "未命名文章";
}

export function writingDraftSavePending(writingState = {}) {
  return pendingSaves.get(writingState)?.isCurrent() === true;
}

export function assertWritingDraftCanLeave(writingState = {}) {
  if (writingBookDirectoryPending(writingState)) throw new Error("章节目录正在更新，请稍后再操作。");
  assertWritingBookChapterCanLeave(writingState);
  if (writingDraftSavePending(writingState) || writingState.draftSaveState === "saving") {
    throw new Error("草稿正在保存，请等保存结束后再切换主题。");
  }
  if (["dirty", "error"].includes(writingState.draftSaveState)) {
    throw new Error("草稿还有未保存内容，请先保存或重试，再切换主题。");
  }
}

export function recordWritingDraftInput(deps, value) {
  if (recordWritingBookChapterInput(deps, value)) return;
  const writingState = deps.writingState || {};
  if (!writingState.scaffold?.id) return;
  writingState.draftMarkdown = String(value ?? "");
  const saving = writingDraftSavePending(writingState);
  writingState.draftSaveState = saving ? "saving" : "dirty";
  try { checkpointArticleInput(deps); }
  catch { deps.setStatus?.("输入仍保留，但本机草稿保存失败，请勿刷新或关闭页面。", "warn", { notify: true, force: true }); }
  const button = deps.$?.("btnWritingSaveDraft");
  if (button && writingState.scaffold?.id) {
    button.disabled = saving;
    button.textContent = saving ? "正在保存..." : "保存草稿";
  }
}

export function handleWritingSaveDraftClick(deps = {}) {
  const writingState = deps.writingState || {};
  if (writingBookDirectoryPending(writingState)) return;
  if (selectedWritingBookChapter(writingState)) return saveWritingBookChapter(deps);
  const pending = pendingSaves.get(writingState);
  if (pending?.isCurrent()) return pending.promise;
  const state = deps.state || {};
  const projectId = String(writingState.project?.id || "");
  const scaffoldId = String(writingState.scaffold?.id || "");
  const themeId = String(writingState.selectedThemeIndexId || "");
  const vaultScope = state.noteMoveVaultScope;
  const vaultPath = deps.getVaultPath?.();
  const operation = {
    draftNoteId: String(writingState.project?.draft_note_id || ""),
    isCurrent: () => pendingSaves.get(writingState) === operation
      && String(writingState.project?.id || "") === projectId
      && String(writingState.project?.draft_note_id || "") === operation.draftNoteId
      && String(writingState.scaffold?.id || "") === scaffoldId
      && String(writingState.selectedThemeIndexId || "") === themeId
      && state.noteMoveVaultScope === vaultScope
      && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain
      && deps.getVaultPath?.() === vaultPath
  };
  pendingSaves.set(writingState, operation);
  operation.promise = saveDraft(deps, operation, { projectId, scaffoldId, vaultPath }).finally(() => {
    if (pendingSaves.get(writingState) === operation) pendingSaves.delete(writingState);
  });
  return operation.promise;
}

async function saveDraft(deps, operation, { projectId, scaffoldId, vaultPath }) {
  const {
    $ = () => null, state = {}, writingState = {},
    writingDraftDirectoryId = () => "", writingDraftTitle = () => "", writingDraftBody = () => "",
    updateNote = async () => ({}), bindWritingDraftNote = async () => ({}),
    currentWritingVersionNote = () => "", mapNoteItem = item => item,
    showWritingResult = () => {}, renderWritingPanel = () => {}, setStatus = () => {}
  } = deps;
  if (!projectId || !scaffoldId || !String(writingState.scaffoldMarkdown || "").trim()) {
    showWritingResult({ stage: "writing_draft_note_error", code: "WRITING_DRAFT_INVALID", message: "scaffold is required before creating a draft note" });
    setStatus(String($("btnWritingSaveDraft")?.textContent || "").trim() || "先生成文章提纲", "warn");
    return;
  }
  if (!operation.isCurrent()) return;
  const title = normalizeWritingDraftTitle(writingDraftTitle() || writingState.project?.title);
  const titleAtStart = writingDraftTitle();
  const editorAtStart = $("writingDraftEditor")?.value;
  if (typeof editorAtStart === "string") writingState.draftMarkdown = editorAtStart;
  const currentBody = () => String(writingDraftBody() || "").replace(/^#\s+.*$/m, `# ${title}`);
  let body = currentBody();
  const directoryId = writingDraftDirectoryId();
  const currentDraftId = String(writingState.project?.draft_note_id || "").trim();
  const demoPending = smartNotesDemoPendingDraft(state, projectId);
  const pendingBinding = writingState.pendingDraftBinding;
  const reusableNote = pendingBinding?.projectId === projectId && pendingBinding?.scaffoldId === scaffoldId
    && pendingBinding?.vaultScope === state.noteMoveVaultScope ? pendingBinding.note : null;
  const noteId = currentDraftId || reusableNote?.id;
  writingState.draftSaveState = "saving";
  const button = $("btnWritingSaveDraft");
  if (button) { button.disabled = true; button.textContent = "正在保存..."; }
  try {
    checkpointArticleInput(deps);
    const payload = { directoryId, title, status: "draft", body };
    let recoveredCreation = false;
    if (noteId) {
      const baseline = currentDraftId ? writingState.project?.draft_note : reusableNote;
      if (baseline?.id !== noteId || typeof baseline.body !== "string") throw new Error("缺少已保存正文，请先保留当前修改，再重新打开文章核对。");
      payload.expectedBody = baseline.body;
      if (baseline.fileRevision !== undefined) payload.expectedRevision = baseline.fileRevision;
    }
    let saved;
    if (!currentDraftId && reusableNote) {
      saved = reusableNote;
      body = saved.body;
      recoveredCreation = true;
    }
    else if (noteId) saved = await saveEditorNoteWithRecovery({ ...deps, updateNote }, noteId, payload);
    else {
      const result = await createWritingNoteWithRecovery(writingState, { ...deps, retainCreationRecovery: true }, payload, JSON.stringify([projectId, scaffoldId]));
      saved = result.note;
      body = result.submittedBody;
      recoveredCreation = result.recovered === true;
    }
    if (!operation.isCurrent()) return;
    if (!saved?.id) throw new Error("保存结果缺少笔记标识，请核查本地服务后重试。");
    let project = writingState.project;
    if (!currentDraftId) {
      writingState.pendingDraftBinding = { projectId, scaffoldId, vaultScope: state.noteMoveVaultScope, note: saved };
      project = await bindWritingDraftNote(projectId, saved.id, scaffoldId, currentWritingVersionNote(), { expectedVaultPath: vaultPath });
      if (!operation.isCurrent()) return;
      if (project?.id !== projectId) throw new Error("草稿文件已保存，但关联主题失败。请重试，不会重复创建。");
      writingState.pendingDraftBinding = null;
    }
    const savedBody = typeof saved.body === "string" ? saved.body : body;
    writingState.project = { ...(project || writingState.project), draft_note_id: saved.id,
      draft_note: { ...(writingState.project?.draft_note || {}), ...saved, body: savedBody } };
    operation.draftNoteId = String(saved.id);
    acknowledgeWritingNoteBinding(deps, JSON.stringify([projectId, scaffoldId]), saved.id);
    const note = mapNoteItem({ ...saved, body: savedBody });
    state.notes = [note, ...(state.notes || []).filter(item => item.id !== note.id)];
    writingState.projects = [writingState.project, ...(writingState.projects || []).filter(item => item.id !== projectId)];
    let refreshError = null;
    if (typeof deps.listProjectDraftVersions === "function") {
      try {
        const versions = await deps.listProjectDraftVersions(projectId, 12);
        if (!operation.isCurrent()) return;
        writingState.draftVersions = Array.isArray(versions) ? versions : writingState.draftVersions;
      } catch (error) {
        if (!operation.isCurrent()) return;
        refreshError = error;
      }
    }
    const liveText = $("writingDraftEditor")?.value;
    const changedDuringSave = ((recoveredCreation || saved.recoveredSave === true) && currentBody() !== savedBody)
      || currentBody() !== body || writingDraftTitle() !== titleAtStart
      || (typeof editorAtStart === "string" && liveText !== editorAtStart);
    const latestMarkdown = typeof liveText === "string" ? liveText : String(writingState.draftMarkdown ?? "");
    writingState.draftMarkdown = changedDuringSave ? latestMarkdown : savedBody;
    writingState.draftSaveState = changedDuringSave ? "dirty" : "saved";
    if (changedDuringSave) checkpointArticleInput(deps);
    else clearWritingInput(deps, JSON.stringify(["article", projectId, scaffoldId]));
    const demoAdvanced = completeSmartNotesDemoSavedDraft(state, projectId, savedBody, demoPending);
    showWritingResult({ stage: "writing_draft_note", writingProjectId: projectId, draftScaffoldId: scaffoldId, noteId: note.id, directoryId, title: note.title });
    renderWritingPanel();
    if (demoAdvanced) deps.renderAll?.();
    const renderedButton = $("btnWritingSaveDraft");
    if (renderedButton) { renderedButton.disabled = false; renderedButton.textContent = changedDuringSave ? "保存草稿" : "已保存"; }
    setStatus(changedDuringSave ? "已保存此前内容；刚写的修改尚未保存，请再保存一次。" : currentDraftId ? "草稿已保存" : "草稿已创建", changedDuringSave ? "warn" : "ok", { notify: true, force: true });
    if (refreshError) setStatus(`草稿正文已保存，但版本列表刷新失败：${String(refreshError?.message || refreshError)}。`, "warn", { notify: true, force: true });
  } catch (error) {
    if (!operation.isCurrent()) return;
    writingState.draftSaveState = "error";
    const renderedButton = $("btnWritingSaveDraft");
    if (renderedButton) { renderedButton.disabled = false; renderedButton.textContent = error?.code === "NOTE_SAVE_RESULT_UNCERTAIN" ? "核查后再保存" : "保存失败，重试"; }
    showWritingResult({ stage: "writing_draft_note_error", writingProjectId: projectId, draftScaffoldId: scaffoldId,
      message: String(error?.message || error), code: error?.code || null, details: error?.details || null });
    setStatus(error?.code === "NOTE_SAVE_CONFLICT"
      ? "文章已在其他地方修改，本次未覆盖。当前输入仍保留，请先保留这份修改，再重新打开核对。"
      : error?.code === "NOTE_SAVE_RESULT_UNCERTAIN" ? error.message
      : `草稿保存失败：${String(error?.message || error)}。修改仍保留，请重试。`, "bad", { notify: true, force: true });
  }
}
