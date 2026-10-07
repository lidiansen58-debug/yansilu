import { prepareWritingOutlineSave, acknowledgeWritingOutlineSave } from "./writing-outline-recovery.js";

const pendingSaves = new WeakMap();

function outlineInput(scaffold = {}) {
  return JSON.stringify([scaffold.sections || [], scaffold.open_questions || []]);
}

export async function persistWritingOutline(deps = {}) {
  const { writingState = {}, state = {}, getVaultPath = () => "", updateDraftScaffold = async () => null,
    setStatus = () => {} } = deps;
  const scaffold = writingState.scaffold;
  if (!scaffold?.id) return null;
  const scaffoldId = String(scaffold.id), vault = getVaultPath(), scope = state.noteMoveVaultScope;
  const projectId = scaffold.writing_project_id || writingState.project?.id;
  const canWrite = () => getVaultPath() === vault && state.noteMoveVaultScope === scope
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
  const isCurrent = () => canWrite() && String(writingState.scaffold?.id || "") === scaffoldId;
  const snapshot = outlineInput(scaffold);
  const sections = structuredClone(scaffold.sections || []);
  const openQuestions = structuredClone(scaffold.open_questions || []);
  const pending = pendingSaves.get(writingState) || new Map();
  pendingSaves.set(writingState, pending);
  const key = JSON.stringify([vault, scaffoldId]);
  const previousSave = writingState.outlineSaveQueue || Promise.resolve();
  // Coalesce only waiting snapshots of the same outline, not another project's save.
  const save = previousSave.catch(() => null).then(() => canWrite() && pending.get(key) === save
    ? updateDraftScaffold(scaffoldId, { sections, openQuestions, expectedCurrentScaffoldId: scaffoldId, ...(vault ? { expectedVaultPath: vault } : {}),
      ...prepareWritingOutlineSave(deps, scaffoldId, projectId, { sections, openQuestions }) }) : null);
  pending.set(key, save);
  writingState.outlineSaveQueue = save;
  try {
    const updated = await save;
    let recoveryWarning = "";
    if (canWrite() && updated?.id === scaffoldId) {
      try { acknowledgeWritingOutlineSave(deps, updated, projectId); }
      catch (error) { recoveryWarning = `提纲已保存，但本机恢复记录未能更新：${String(error?.message || error)}`; }
    }
    if (writingState.outlineSaveQueue !== save || !isCurrent()) return updated;
    if (String(updated?.id || "") !== scaffoldId) throw new Error("提纲保存结果不匹配，请重新核对。");
    const edited = outlineInput(writingState.scaffold) !== snapshot;
    const live = writingState.scaffold;
    writingState.scaffold = edited ? { ...updated, sections: live.sections, open_questions: live.open_questions,
      markdown: writingState.scaffoldMarkdown } : updated;
    if (!edited) writingState.scaffoldMarkdown = updated.markdown || writingState.scaffoldMarkdown;
    // Autosave updates the record, not the user's live fields or cursor.
    setStatus(recoveryWarning || (edited ? "已保存此前提纲；正在编辑的修改仍保留。" : "提纲已保存"), recoveryWarning || edited ? "warn" : "ok");
    return updated;
  } catch (error) {
    if (writingState.outlineSaveQueue === save && isCurrent()) setStatus(`保存提纲失败：${String(error?.message || error)}${error?.code === "WRITING_CURRENT_OUTLINE_CHANGED"
      ? "可先导出当前提纲，再重新打开主题。" : error?.code === "WRITING_OUTLINE_CONFLICT"
        ? "可先导出当前提纲，再从“更多”载入已保存提纲。" : ""}`, "bad");
    return null;
  } finally {
    if (pending.get(key) === save) pending.delete(key);
  }
}
