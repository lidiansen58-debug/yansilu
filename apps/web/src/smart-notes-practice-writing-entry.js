const pendingEntries = new WeakMap();

export function openShortPracticeWriting(projectId, deps, { exportStep = false } = {}) {
  const { writingState } = deps;
  if (pendingEntries.has(writingState)) return pendingEntries.get(writingState);
  const operation = open(projectId, deps, exportStep).finally(() => pendingEntries.delete(writingState));
  pendingEntries.set(writingState, operation);
  return operation;
}

async function open(projectId, deps, exportStep) {
  const { state, writingState, continueWritingProjectEntry, createDraftScaffold, getVaultPath = () => "" } = deps;
  const vaultPath = getVaultPath(), scope = state.noteMoveVaultScope, vaultKey = state.vaultScopeKey;
  const sameVault = () => getVaultPath() === vaultPath && state.noteMoveVaultScope === scope
    && state.vaultScopeKey === vaultKey && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  let project = await continueWritingProjectEntry(projectId, { openDraft: exportStep,
    statusMessage: exportStep ? "在“更多”中导出文章。" : "查看提纲里的观点来源，再开始写草稿。" });
  if (!project || !sameVault() || state.module !== "writing" || writingState.project?.id !== projectId) return null;
  if (!project.scaffold_id && !exportStep) {
    const notes = (project.basket_note_ids || []).map(id => state.notes?.find(note => note.id === id));
    if (notes.length !== 3 || notes.some(note => !String(note?.thesis || "").trim()
      || (note?.distillationStatus || note?.distillation_status) !== "confirmed")) {
      throw new Error("请先保存三个自己的判断，再生成短文提纲。");
    }
    const revision = writingState.projectOpenRevision;
    deps.setStatus?.("正在用你的三个判断生成提纲...", "ok");
    const result = await createDraftScaffold(projectId, "短练习：三个已确认的判断");
    if (!sameVault() || state.module !== "writing" || writingState.project?.id !== projectId
      || writingState.projectOpenRevision !== revision) return null;
    if (!result?.item?.id) throw new Error("未确认提纲生成结果，请重新打开短文主题。");
    project = await continueWritingProjectEntry(projectId, { openDraft: false, statusMessage: "提纲已生成，查看来源后开始写草稿。" });
    if (!project || !sameVault() || state.module !== "writing" || writingState.project?.id !== projectId) return null;
  }
  return project;
}
