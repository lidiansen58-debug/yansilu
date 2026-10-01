import { selectedWritingBookChapter, selectWritingDraftTarget } from "./writing-book-chapter-controller.js";

function locateChapter(structure, id) {
  for (const part of structure?.parts || []) {
    const index = (part.chapters || []).findIndex((chapter) => chapter.id === id);
    if (index >= 0) return { part, index, chapter: part.chapters[index] };
  }
  return null;
}

function directoryIdentity(structure) {
  return JSON.stringify((structure?.parts || []).map((part) => [part.id,
    (part.chapters || []).map((chapter) => [chapter.id, chapter.title, chapter.draft_note_id || ""])]));
}

export function writingBookDirectoryPending(writingState) {
  return writingState.bookDirectoryPending?.projectId === writingState.project?.id
    && Boolean(writingState.bookDirectoryPending);
}

export async function changeWritingBookDirectory(deps, action) {
  const { writingState, state = {}, assertWritingDraftCanLeave, getVaultPath = () => "",
    requestTextInput, confirm = (message) => requestTextInput({ title: "移出章节", note: message, confirmOnly: true, confirmLabel: "移出目录" }), fetchWritingProject, updateWritingProjectBookStructure,
    renderWritingPanel = () => {}, setStatus = () => {}, makeChapterId = () => `chapter_${globalThis.crypto.randomUUID()}` } = deps;
  if (writingBookDirectoryPending(writingState)) return;
  const projectId = writingState.project?.id;
  const selected = selectedWritingBookChapter(writingState);
  const original = JSON.stringify(writingState.project?.book_structure);
  const vault = getVaultPath(), scope = state.noteMoveVaultScope, module = state.module;
  const chapterBody = selected?.markdown, articleBody = writingState.draftMarkdown;
  const chapterSaveState = selected?.saveState, articleSaveState = writingState.draftSaveState;
  const operation = { projectId };
  const contextCurrent = () => writingState.project?.id === projectId && getVaultPath() === vault
    && state.noteMoveVaultScope === scope && state.module === module
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain
    && selectedWritingBookChapter(writingState) === selected
    && selected?.markdown === chapterBody && writingState.draftMarkdown === articleBody
    && selected?.saveState === chapterSaveState && writingState.draftSaveState === articleSaveState
    && JSON.stringify(writingState.project?.book_structure) === original;
  let pending = false;
  try {
    if (!projectId) throw new Error("请先打开一个写作主题。");
    if (!["add", "remove", "up", "down"].includes(action)) throw new Error("不支持的目录操作。");
    assertWritingDraftCanLeave(writingState);
    if (action !== "add" && !selected) throw new Error("请先选择一个章节。");
    // Reserve the operation before opening a dialog so repeated clicks cannot enqueue writes.
    writingState.bookDirectoryPending = operation;
    pending = true;
    renderWritingPanel();
    let title = "";
    if (action === "add") {
      title = String(await requestTextInput({ title: "新增章节", label: "章节名称", note: "", value: "" }) || "").trim();
      if (!title) return;
      if (title.length > 120) throw new Error("章节名称请控制在 120 个字以内。");
    } else if (action === "remove") {
      if (!await confirm(`将“${selected.title}”移出目录？\n正文文件会保留，不会删除。`)) return;
    }
    if (!contextCurrent()) return;
    const fresh = await fetchWritingProject(projectId);
    if (!contextCurrent()) return;
    if (fresh?.id !== projectId) throw new Error("无法读取当前主题，请重试。");
    if (JSON.stringify(fresh.book_structure) !== original) throw new Error("目录已发生变化，请重新打开主题后再操作。");
    const structure = structuredClone(fresh.book_structure || { schema_version: 1, parts: [] });
    let nextId = selected?.id || "";
    if (action === "add") {
      structure.parts ||= [];
      const part = locateChapter(structure, selected?.id)?.part || structure.parts[0];
      const target = part || { id: "part_1", title: "章节", chapters: [] };
      if (!part) structure.parts.push(target);
      target.chapters ||= [];
      nextId = makeChapterId();
      if (!nextId || locateChapter(structure, nextId)) throw new Error("无法生成唯一章节标识，请重试。");
      target.chapters.push({ id: nextId, title, evidence_note_ids: [], sections: [] });
    } else {
      const found = locateChapter(structure, selected.id);
      if (!found) throw new Error("这个章节已不在目录中，请重新打开主题。");
      if (action === "remove") {
        found.part.chapters.splice(found.index, 1);
        nextId = "";
      } else {
        const nextIndex = found.index + (action === "up" ? -1 : 1);
        if (nextIndex < 0 || nextIndex >= found.part.chapters.length) return;
        [found.part.chapters[found.index], found.part.chapters[nextIndex]] = [found.part.chapters[nextIndex], found.part.chapters[found.index]];
      }
    }
    if (!contextCurrent()) return;
    setStatus("正在保存章节目录...", "busy", { notify: true, force: true });
    const result = await updateWritingProjectBookStructure(projectId, { bookStructure: structure, expectedVaultPath: vault });
    if (!contextCurrent()) return;
    if (result?.id !== projectId || directoryIdentity(result.book_structure) !== directoryIdentity(structure)) {
      throw new Error("目录保存结果未确认，请重新打开主题核查。");
    }
    writingState.project = result;
    writingState.projects = [result, ...(writingState.projects || []).filter((item) => item.id !== projectId)];
    writingState.chapterOpenRevision = Number(writingState.chapterOpenRevision || 0) + 1;
    writingState.bookDirectoryPending = null;
    pending = false;
    if (action === "remove") writingState.bookChapter = null;
    renderWritingPanel();
    if (action === "add") await selectWritingDraftTarget(deps, nextId);
    if (writingState.project?.id !== projectId || getVaultPath() !== vault || state.noteMoveVaultScope !== scope || state.module !== module) return;
    if (action === "add" && selectedWritingBookChapter(writingState)?.id !== nextId) return;
    setStatus(action === "remove" ? "已移出目录，正文文件保留。" : action === "add" ? "章节已新增，可以开始写正文。" : "章节顺序已保存。", "ok", { notify: true, force: true });
  } catch (error) {
    if (contextCurrent()) setStatus(`目录未更新：${String(error?.message || error)}`, "warn", { notify: true, force: true });
  } finally {
    if (pending && writingState.bookDirectoryPending === operation) {
      writingState.bookDirectoryPending = null;
      renderWritingPanel();
    }
  }
}

export function renderWritingBookDirectoryTools(deps) {
  const { writingState, $ } = deps;
  const selected = selectedWritingBookChapter(writingState);
  const location = locateChapter(writingState.project?.book_structure, selected?.id);
  const pending = writingBookDirectoryPending(writingState);
  for (const [id, unavailable] of [
    ["btnWritingChapterAdd", !writingState.project?.id],
    ["btnWritingChapterRemove", !location],
    ["btnWritingChapterUp", !location || location.index === 0],
    ["btnWritingChapterDown", !location || location.index === location.part.chapters.length - 1]
  ]) {
    const button = $(id);
    if (button) button.disabled = pending || unavailable;
  }
}
