import { assertWritingDraftCanLeave } from "./writing-draft-save-controller.js";

export function installWritingBookOutputEvents({ $ = () => null, depsProvider = () => ({}) } = {}) {
  let pending = false;
  const run = async () => {
    if (pending) return null;
    const deps = depsProvider();
    const { writingState, state = {}, getVaultPath = () => "", pickExportDirectory, exportWritingBook, setStatus = () => {} } = deps;
    const projectId = writingState.project?.id;
    const structure = JSON.stringify(writingState.project?.book_structure);
    const vault = getVaultPath(), scope = state.noteMoveVaultScope, module = state.module;
    const chapterId = writingState.bookChapter?.id, chapterBody = writingState.bookChapter?.markdown, articleBody = writingState.draftMarkdown;
    const stillCurrent = () => writingState.project?.id === projectId && getVaultPath() === vault
      && state.noteMoveVaultScope === scope && state.module === module
      && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain
      && JSON.stringify(writingState.project?.book_structure) === structure
      && writingState.bookChapter?.id === chapterId && writingState.bookChapter?.markdown === chapterBody && writingState.draftMarkdown === articleBody;
    pending = true;
    const operation = { projectId };
    writingState.bookExportPending = operation;
    const button = $("btnWritingExportBook");
    if (button) button.disabled = true;
    try {
      const menu = $("writingMoreMenu"); if (menu) menu.open = false;
      assertWritingDraftCanLeave(writingState);
      if (!projectId || !vault) throw new Error("请先打开书稿。");
      const chapters = (writingState.project.book_structure?.parts || []).flatMap(part => part.chapters || []);
      if (!chapters.length) throw new Error("请先新增章节并保存正文。");
      const missing = chapters.filter(chapter => !chapter.draft_note_id);
      if (missing.length) throw new Error(`以下章节尚未保存正文：${missing.map(chapter => chapter.title).join("、")}。`);
      const picked = await pickExportDirectory({ purpose: "书稿导出目录" });
      if (!picked?.path || !stillCurrent()) return null;
      assertWritingDraftCanLeave(writingState);
      setStatus("正在按目录导出书稿与附件...", "busy", { notify: true, force: true });
      const result = await exportWritingBook({ targetPath: picked.path, expectedVaultPath: vault, projectId, expectedBookStructure: JSON.parse(structure) });
      if (result?.status !== "completed" || !result.bookPath || result.chapterCount !== chapters.length) throw new Error("未确认整稿导出结果，请检查目标目录后重试。");
      if (stillCurrent()) {
        setStatus(`已导出 ${result.chapterCount} 章及 ${result.assetCount || 0} 个附件：${result.bookPath}`, "ok", { notify: true, force: true, holdMs: 8000 });
      }
      return result;
    } catch (error) {
      if (stillCurrent()) setStatus(`整稿导出失败：${String(error?.message || error)}`, "bad", { notify: true, force: true });
      return null;
    } finally {
      pending = false;
      if (writingState.bookExportPending === operation) writingState.bookExportPending = null;
      deps.renderWritingPanel?.();
    }
  };
  $("btnWritingExportBook")?.addEventListener("click", run);
  return { export: run };
}
