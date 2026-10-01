import { assertWritingDraftCanLeave } from "./writing-draft-save-controller.js";

export function createWritingProjectOpenController(depsProvider = () => ({})) {
  async function open(projectId) {
    const deps = depsProvider();
    const { writingState, state = {}, getVaultPath = () => "", parseWritingBasketIds = () => [],
      getWritingFormSnapshot = () => "", fetchWritingProject, fetchDraftScaffold, fetchNote,
      ensureNotesLoaded = async () => {}, listProjectScaffolds, listProjectDraftVersions,
      loadWritingRelationCounts, resetWritingStrongModelState, populateWritingFormFromProject,
      renderWritingPanel = () => {}, setStatus = () => {} } = deps;
    const id = String(projectId || "").trim();
    if (!id) throw new Error("请选择一个写作主题。");
    assertWritingDraftCanLeave(writingState);
    const revision = Number(writingState.projectOpenRevision || 0) + 1;
    writingState.projectOpenRevision = revision;
    const vaultPath = getVaultPath(), vaultScope = state.noteMoveVaultScope, module = state.module;
    const context = () => JSON.stringify([writingState.project?.id, writingState.project?.draft_note_id,
      writingState.scaffold?.id, writingState.selectedThemeIndexId, writingState.draftMarkdown,
      parseWritingBasketIds(), getWritingFormSnapshot()]);
    const before = context();
    const isCurrent = () => writingState.projectOpenRevision === revision
      && getVaultPath() === vaultPath && state.noteMoveVaultScope === vaultScope
      && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain
      && state.module === module && context() === before;
    writingState.openingProjectId = id;
    let committed = false;
    setStatus("正在打开写作主题...", "ok", { notify: true, force: true });
    try {
      const project = await fetchWritingProject(id);
      if (!isCurrent()) return null;
      if (project?.id !== id) throw new Error("未找到这个写作主题，请刷新主题列表后重试。");
      let scaffold = null, draft = null;
      if (project.scaffold_id) {
        try {
          scaffold = await fetchDraftScaffold(project.scaffold_id);
          if (!isCurrent()) return null;
          if (scaffold?.item?.id !== project.scaffold_id) throw new Error("提纲数据不完整");
        } catch (error) { throw new Error(`读取文章提纲失败：${String(error?.message || error)}`); }
      }
      if (project.draft_note_id) {
        try {
          draft = await fetchNote(project.draft_note_id);
          if (!isCurrent()) return null;
          if (draft?.id !== project.draft_note_id || typeof draft.body !== "string") throw new Error("草稿数据不完整");
        } catch (error) { throw new Error(`读取草稿正文失败：${String(error?.message || error)}`); }
      }
      if (!isCurrent()) return null;
      const ids = project.basket_note_ids || [];
      const warnings = [];
      const optional = async (load, fallback, label) => {
        try { return await load(); }
        catch (error) { warnings.push(`${label}：${String(error?.message || error)}`); return fallback; }
      };
      const [scaffoldVersions, draftVersions, relations] = await Promise.all([
        optional(() => listProjectScaffolds(id, 12), [], "提纲版本列表读取失败"),
        optional(() => listProjectDraftVersions(id, 12), [], "草稿版本列表读取失败"),
        optional(() => loadWritingRelationCounts(ids), { counts: {}, errors: Object.fromEntries(ids.map(noteId => [noteId, true])) }, "笔记关系读取失败"),
        optional(() => ensureNotesLoaded(ids), null, "相关笔记读取失败")
      ]);
      if (!isCurrent()) return null;
      assertWritingDraftCanLeave(writingState);
      // Commit only after essential reads succeed and this is still the selected request.
      resetWritingStrongModelState();
      writingState.project = draft ? { ...project, draft_note: draft } : project;
      writingState.scaffold = scaffold?.item || null;
      writingState.scaffoldMarkdown = scaffold?.export?.markdown || scaffold?.item?.markdown || "";
      writingState.draftMarkdown = draft?.body ?? "";
      writingState.draftSaveState = "idle";
      writingState.pendingDraftBinding = null;
      writingState.scaffoldVersions = Array.isArray(scaffoldVersions) ? scaffoldVersions : [];
      writingState.draftVersions = Array.isArray(draftVersions) ? draftVersions : [];
      writingState.relationCountRequestSerial = Number(writingState.relationCountRequestSerial || 0) + 1;
      writingState.relationCounts = relations?.counts || {};
      writingState.relationCountErrors = relations?.errors || {};
      writingState.loadingRelationCounts = false;
      writingState.loadingProjects = false;
      writingState.loadingScaffoldVersions = false;
      writingState.loadingDraftVersions = false;
      populateWritingFormFromProject(writingState.project);
      committed = true;
      renderWritingPanel();
      if (warnings.length) setStatus(`主题已打开；${warnings.join("；")}。可稍后刷新。`, "warn", { notify: true, force: true, holdMs: 8000 });
      return writingState.project;
    } catch (error) {
      if (!isCurrent()) return null;
      throw new Error(`${String(error?.message || error)}。原主题未切换，可重试。`);
    } finally {
      if (writingState.projectOpenRevision === revision && state.noteMoveVaultScope === vaultScope && getVaultPath() === vaultPath) {
        writingState.openingProjectId = "";
        if (!committed && state.module === module && context() !== before && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain) {
          setStatus("当前内容已变化，已取消切换主题。", "warn", { notify: true, requireModule: "writing" });
        }
      }
    }
  }
  return { open };
}
