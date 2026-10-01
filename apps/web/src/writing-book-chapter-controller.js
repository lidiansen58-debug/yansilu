import { acknowledgeWritingNoteBinding, createWritingNoteWithRecovery } from "./writing-note-creation-recovery.js";
import { checkpointChapterInput, clearWritingInput, readWritingInput } from "./writing-input-recovery.js";
import { saveEditorNoteWithRecovery } from "./editor-save-recovery.js";

export function selectedWritingBookChapter(writingState = {}) {
  const chapter = writingState.bookChapter;
  return chapter?.projectId === writingState.project?.id ? chapter : null;
}

function chapters(project) {
  return (project?.book_structure?.parts || []).flatMap((part) => part.chapters || []);
}

export function assertWritingBookChapterCanLeave(writingState = {}) {
  const chapter = selectedWritingBookChapter(writingState);
  if (chapter?.saveState === "saving") throw new Error("章节正在保存，请等保存结束后再切换。");
  if (["dirty", "error"].includes(chapter?.saveState)) throw new Error("章节还有未保存内容，请先保存或重试，再切换。");
}

export async function selectWritingDraftTarget(deps, chapterId = "") {
  const { writingState, state = {}, getVaultPath = () => "", fetchNote, assertWritingDraftCanLeave,
    renderWritingPanel = () => {}, setStatus = () => {} } = deps;
  const currentChapter = selectedWritingBookChapter(writingState);
  const id = String(chapterId || "");
  if (id === (currentChapter?.id || "")) {
    writingState.chapterOpenRevision = Number(writingState.chapterOpenRevision || 0) + 1;
    return;
  }
  let requestCurrent = () => true;
  try {
    assertWritingDraftCanLeave(writingState);
    const revision = Number(writingState.chapterOpenRevision || 0) + 1;
    writingState.chapterOpenRevision = revision;
    const projectId = writingState.project?.id;
    const vaultPath = getVaultPath(), scope = state.noteMoveVaultScope;
    const module = state.module;
    const articleBody = writingState.draftMarkdown;
    const chapterBody = currentChapter?.markdown;
    const structure = JSON.stringify(writingState.project?.book_structure);
    const stillCurrent = () => writingState.chapterOpenRevision === revision && writingState.project?.id === projectId
      && getVaultPath() === vaultPath && state.noteMoveVaultScope === scope
      && state.module === module
      && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain
      && selectedWritingBookChapter(writingState) === currentChapter
      && writingState.draftMarkdown === articleBody && currentChapter?.markdown === chapterBody
      && JSON.stringify(writingState.project?.book_structure) === structure;
    requestCurrent = stillCurrent;
    if (!id) {
      writingState.bookChapter = null;
      renderWritingPanel();
      return;
    }
    const chapter = chapters(writingState.project).find((item) => item.id === id);
    if (!chapter) throw new Error("这个章节已不存在，请重新打开主题。");
    const select = deps.$?.("writingDraftTarget");
    if (select) select.value = currentChapter?.id || "";
    setStatus("正在打开章节...", "busy", { notify: true, force: true });
    let markdown, fileRevision;
    if (chapter.draft_note_id) {
      const note = await fetchNote(chapter.draft_note_id);
      if (!stillCurrent()) return;
      if (note?.id !== chapter.draft_note_id || typeof note.body !== "string") throw new Error("章节正文数据不完整。");
      markdown = note.body;
      fileRevision = note.fileRevision;
    } else {
      const titles = [...new Set((chapter.evidence_note_ids || []).map((noteId) => state.notes?.find((note) => note.id === noteId)?.title).filter(Boolean))];
      markdown = `# ${chapter.title}\n\n${titles.length ? `参考笔记：${titles.map((title) => `[[${title}]]`).join("、")}\n\n` : ""}`;
    }
    if (!stillCurrent()) return;
    assertWritingDraftCanLeave(writingState);
    const recovered = readWritingInput(deps, JSON.stringify(["chapter", projectId, id]));
    writingState.bookChapter = { projectId, id, title: chapter.title, noteId: chapter.draft_note_id || "", markdown,
      savedBody: chapter.draft_note_id ? markdown : undefined, savedFileRevision: fileRevision, saveState: "idle" };
    if (recovered) {
      Object.assign(writingState.bookChapter, { markdown: recovered.markdown, saveState: "dirty",
        savedBody: recovered.noteId === (chapter.draft_note_id || "") ? recovered.savedBody : undefined,
        savedFileRevision: recovered.noteId === (chapter.draft_note_id || "") ? recovered.savedFileRevision : undefined });
    }
    renderWritingPanel();
    setStatus(recovered ? "已恢复本机未保存的章节内容，请核对后保存。" : `已打开：${chapter.title}`, recovered ? "warn" : "ok", { notify: true, force: true });
  } catch (error) {
    if (requestCurrent()) setStatus(`未切换正文：${String(error?.message || error)}`, "warn", { notify: true, force: true });
  } finally {
    const select = deps.$?.("writingDraftTarget");
    if (select) select.value = selectedWritingBookChapter(writingState)?.id || "";
  }
}

export function recordWritingBookChapterInput(deps, value) {
  const chapter = selectedWritingBookChapter(deps.writingState);
  if (!chapter) return false;
  chapter.markdown = String(value ?? "");
  if (chapter.saveState !== "saving") chapter.saveState = "dirty";
  try { checkpointChapterInput(deps, chapter); }
  catch { deps.setStatus?.("输入仍保留，但本机草稿保存失败，请勿刷新或关闭页面。", "warn", { notify: true, force: true }); }
  const button = deps.$?.("btnWritingSaveDraft");
  if (button) { button.disabled = chapter.saveState === "saving"; button.textContent = button.disabled ? "正在保存..." : "保存章节"; }
  return true;
}

export async function saveWritingBookChapter(deps) {
  const { writingState, state = {}, getVaultPath = () => "", updateNote, fetchWritingProject,
    updateWritingProjectBookStructure, writingDraftDirectoryId, renderWritingPanel = () => {}, setStatus = () => {} } = deps;
  const chapter = selectedWritingBookChapter(writingState);
  if (!chapter || chapter.saveState === "saving") return;
  const vaultPath = getVaultPath(), scope = state.noteMoveVaultScope;
  const stillCurrent = () => selectedWritingBookChapter(writingState) === chapter && getVaultPath() === vaultPath
    && state.noteMoveVaultScope === scope && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  if (!stillCurrent()) return;
  const editor = deps.$?.("writingDraftEditor");
  if (typeof editor?.value === "string") chapter.markdown = editor.value;
  let body = chapter.markdown;
  if (!body.trim()) return setStatus("请先写入章节正文。", "warn", { notify: true, force: true });
  chapter.saveState = "saving";
  renderWritingPanel();
  try {
    checkpointChapterInput(deps, chapter);
    const payload = { directoryId: writingDraftDirectoryId(), title: chapter.title, status: "draft", body };
    let recoveredCreation = false;
    const noteId = chapter.noteId || chapter.pendingNoteId;
    if (noteId) {
      if (typeof chapter.savedBody !== "string") throw new Error("缺少已保存正文，请先保留当前修改，再重新打开章节核对。");
      payload.expectedBody = chapter.savedBody;
      if (chapter.savedFileRevision !== undefined) payload.expectedRevision = chapter.savedFileRevision;
    }
    let note;
    if (!chapter.noteId && chapter.pendingNoteId) {
      note = { id: chapter.pendingNoteId, directoryId: payload.directoryId, title: chapter.title,
        body: chapter.savedBody, fileRevision: chapter.savedFileRevision };
      body = chapter.savedBody;
      recoveredCreation = true;
    }
    else if (noteId) note = await saveEditorNoteWithRecovery({ ...deps, updateNote }, noteId, payload);
    else {
      const result = await createWritingNoteWithRecovery(chapter, { ...deps, retainCreationRecovery: true }, payload, JSON.stringify([chapter.projectId, chapter.id]));
      note = result.note;
      body = result.submittedBody;
      recoveredCreation = result.recovered === true;
    }
    if (!stillCurrent()) return;
    if (!note?.id) throw new Error("保存结果缺少笔记标识，请核查本地服务。");
    chapter.pendingNoteId = note.id;
    chapter.savedBody = note.body ?? body;
    chapter.savedFileRevision = note.fileRevision;
    if (!chapter.noteId) {
      const fresh = await fetchWritingProject(chapter.projectId);
      if (!stillCurrent()) return;
      if (fresh?.id !== chapter.projectId) throw new Error("章节文件已保存，但无法读取所属主题。");
      const structure = structuredClone(fresh.book_structure);
      const target = chapters({ book_structure: structure }).find((item) => item.id === chapter.id);
      if (!target) throw new Error("章节文件已保存，但目录项已不存在。");
      if (target.draft_note_id && target.draft_note_id !== note.id) throw new Error("该章节已绑定另一份正文，请重开主题核查。");
      target.draft_note_id = note.id;
      const project = await updateWritingProjectBookStructure(chapter.projectId, { bookStructure: structure, expectedVaultPath: vaultPath });
      if (!stillCurrent()) return;
      if (project?.id !== chapter.projectId || chapters(project).find((item) => item.id === chapter.id)?.draft_note_id !== note.id) {
        throw new Error("章节文件已保存，但绑定结果未确认。请重试，不会重复创建。");
      }
      writingState.project = project;
    }
    chapter.noteId = note.id;
    acknowledgeWritingNoteBinding(deps, JSON.stringify([chapter.projectId, chapter.id]), note.id);
    chapter.pendingNoteId = "";
    const live = typeof editor?.value === "string" ? editor.value : chapter.markdown;
    const changed = ((recoveredCreation || note.recoveredSave === true) && live !== note.body) || live !== body || chapter.markdown !== body;
    chapter.markdown = changed ? live : (note.body ?? body);
    chapter.saveState = changed ? "dirty" : "saved";
    chapter.saveErrorCode = "";
    if (changed) checkpointChapterInput(deps, chapter);
    else clearWritingInput(deps, JSON.stringify(["chapter", chapter.projectId, chapter.id]));
    const mapped = deps.mapNoteItem ? deps.mapNoteItem(note) : note;
    state.notes = [mapped, ...(state.notes || []).filter((item) => item.id !== note.id)];
    writingState.projects = [writingState.project, ...(writingState.projects || []).filter((item) => item.id !== chapter.projectId)];
    renderWritingPanel();
    setStatus(changed ? "已保存此前内容；刚写的修改尚未保存，请再保存一次。" : "章节已保存", changed ? "warn" : "ok", { notify: true, force: true });
  } catch (error) {
    if (!stillCurrent()) return;
    chapter.saveState = "error";
    chapter.saveErrorCode = error?.code || "";
    renderWritingPanel();
    setStatus(error?.code === "NOTE_SAVE_CONFLICT"
      ? "章节已在其他地方修改，本次未覆盖。当前输入仍保留，请先保留这份修改，再重新打开核对。"
      : error?.code === "NOTE_SAVE_RESULT_UNCERTAIN" ? error.message
      : `章节保存失败：${String(error?.message || error)}。修改仍保留，请重试。`, "bad", { notify: true, force: true });
  }
}

export function renderWritingBookChapterSelector(deps) {
  const select = deps.$?.("writingDraftTarget");
  if (!select) return;
  const escape = deps.escapeHtml;
  const parts = deps.writingState.project?.book_structure?.parts || [];
  select.innerHTML = `<option value="">文章正文</option>${parts.map((part) => `<optgroup label="${escape(part.title || part.label || "章节")}">${(part.chapters || []).map((chapter) => `<option value="${escape(chapter.id)}">${escape(chapter.title)}</option>`).join("")}</optgroup>`).join("")}`;
  select.value = selectedWritingBookChapter(deps.writingState)?.id || "";
  select.disabled = !deps.writingState.project?.id;
}
