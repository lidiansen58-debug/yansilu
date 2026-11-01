import { retainWritingDraftBaseline } from "./writing-project-form-sync.js";

export async function loadWritingEntryMaterials({ state = {}, writingState, loadWritingMaterials, renderWritingPanel, getVaultPath = () => "" }) {
  // Materials belong to this vault, across project changes. Saves can mutate
  // note objects in place, so compare content as well as the request context.
  const module = state.module, scope = state.noteMoveVaultScope, vault = getVaultPath();
  const snapshot = () => JSON.stringify(state.notes || []);
  const before = snapshot();
  const inView = () => state.module === module && state.noteMoveVaultScope === scope && getVaultPath() === vault
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain && !state.unresolvedNoteMove;
  const current = () => inView() && snapshot() === before;
  try { await loadWritingMaterials({ isCurrent: current }); }
  catch { if (current()) writingState.materialsError = "笔记暂未读取成功，请重新打开写作重试。"; }
  if (inView()) renderWritingPanel?.();
}

export function refreshWritingEntryProject({ writingState, setStatus }, project) {
  const previous = writingState.project;
  if (previous?.draft_note_id && previous.draft_note_id !== project.draft_note_id) {
    // The server selected another article, so the open editor cannot safely
    // supply a baseline for either binding. Reopening explicitly loads it.
    writingState.project = { ...project, draft_note_id: project.draft_note_id || previous.draft_note_id, draft_note: null };
    writingState.draftSaveState = "error";
    setStatus("当前草稿已在其他地方切换。输入仍保留，请先复制保留这份修改，刷新页面后再打开文章核对。", "warn", { notify: true, force: true });
    return;
  }
  writingState.project = retainWritingDraftBaseline(project, previous);
}
