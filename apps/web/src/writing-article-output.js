import { completeSmartNotesDemoExport } from "./smart-notes-demo-practice-progress.js";

export function buildWritingArticleOutput({ markdown = "", title = "", projectId = "", scaffoldId = "" } = {}) {
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  const footer = [projectId && `可写主题：${projectId}`, scaffoldId && `文章提纲：${scaffoldId}`].filter(Boolean);
  const footerStart = lines.length - footer.length - 1;
  // Only remove the generated trailing metadata for this exact project.
  if (footer.length && footerStart >= 0 && lines[footerStart] === "---"
    && footer.every((line, index) => lines[footerStart + index + 1] === line)) {
    lines.splice(footerStart);
  }
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  let body = lines.join("\n");
  if (!body.trim()) throw new Error("请先写入正文。");
  const heading = body.match(/^ {0,3}#\s+([^\n]+)/)?.[1]?.trim();
  const articleTitle = heading || String(title).trim() || "未命名文章";
  if (!heading) body = `# ${articleTitle}\n\n${body}`;
  const base = Array.from(articleTitle.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")).slice(0, 100).join("").replace(/[. ]+$/g, "") || "文章";
  const safeBase = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(base) ? `_${base}` : base;
  return { markdown: `${body}\n`, fileName: `${safeBase}.md` };
}

export function installWritingArticleOutputEvents({ $ = () => null, depsProvider = () => ({}) } = {}) {
  let pending = false;
  const run = async (mode) => {
    if (pending) return;
    const deps = depsProvider();
    const { writingState = {}, state = {}, copyTextToClipboard, exportWritingArticle, pickExportDirectory, getVaultPath = () => "", setStatus = () => {} } = deps;
    const projectId = writingState.project?.id || "";
    const chapterId = writingState.bookChapter?.id || "";
    const demoPending = state.smartNotesDemoPendingSteps?.["practice-export"];
    const vaultScopeKey = state.vaultScopeKey;
    const module = state.module;
    const vaultPath = getVaultPath();
    const stillCurrent = () => {
      const current = depsProvider();
      return (current.writingState?.project?.id || "") === projectId && (current.writingState?.bookChapter?.id || "") === chapterId && current.state?.vaultScopeKey === vaultScopeKey && current.state?.module === module && (current.getVaultPath?.() || "") === vaultPath;
    };
    const buttons = [$("btnWritingCopyArticle"), $("btnWritingExportArticle")].filter(Boolean);
    const previous = buttons.map((button) => button.disabled);
    pending = true;
    buttons.forEach((button) => { button.disabled = true; });
    try {
      if (writingState.bookChapter?.projectId === projectId && writingState.bookChapter) throw new Error("请先切回文章正文，或使用导出整稿。");
      const editor = $("writingDraftEditor");
      const markdown = typeof editor?.value === "string" ? editor.value : String(writingState.draftMarkdown ?? "");
      if (!writingState.project?.draft_note_id && writingState.draftSaveState !== "dirty" && !writingState.draftMarkdown) {
        throw new Error("请先开始写草稿。");
      }
      const output = buildWritingArticleOutput({ markdown, title: writingState.project?.title, projectId, scaffoldId: writingState.scaffold?.id });
      let exported = null;
      if (mode === "copy") {
        if (!copyTextToClipboard) throw new Error("当前环境无法复制，请改用导出文章。");
        await copyTextToClipboard(output.markdown);
      } else {
        if (!exportWritingArticle || !pickExportDirectory) throw new Error("当前环境无法导出文章。");
        if (!vaultPath) throw new Error("笔记库状态尚未就绪，请稍后重试。");
        const picked = await pickExportDirectory({ purpose: "文章导出目录" });
        if (!picked?.path) return null;
        if (!stillCurrent() || (typeof editor?.value === "string" && editor.value !== markdown)) throw new Error("正文或笔记库已变化，请重新导出。");
        setStatus("正在导出文章与附件...", "busy", { notify: true, force: true });
        exported = await exportWritingArticle({ targetPath: picked.path, expectedVaultPath: vaultPath, noteId: writingState.project?.draft_note_id || "", fileName: output.fileName, markdown: output.markdown });
        if (exported?.status !== "completed" || !exported?.articlePath) throw new Error("未确认导出结果，请检查目标目录后重试。");
      }
      if (stillCurrent()) {
        if (mode === "export" && completeSmartNotesDemoExport(state, projectId, exported, demoPending)) deps.renderAll?.();
        const menu = $("writingMoreMenu");
        if (menu) menu.open = false;
        setStatus(mode === "copy" ? "已复制当前正文（未自动保存草稿）。" : `已导出文章及 ${exported.assetCount || 0} 个附件：${exported.targetPath}`, "ok", { notify: true, force: true });
      }
      return { ...output, ...(exported || {}) };
    } catch (error) {
      if (stillCurrent()) setStatus(`${mode === "copy" ? "复制正文" : "导出文章"}失败：${String(error?.message || error)}`, "bad", { notify: true, force: true });
      return null;
    } finally {
      pending = false;
      if (stillCurrent()) buttons.forEach((button, index) => { button.disabled = depsProvider().writingState?.draftSaveState === "saving" || previous[index]; });
    }
  };
  $("btnWritingCopyArticle")?.addEventListener("click", () => run("copy"));
  $("btnWritingExportArticle")?.addEventListener("click", () => run("export"));
  return { copy: () => run("copy"), export: () => run("export") };
}
