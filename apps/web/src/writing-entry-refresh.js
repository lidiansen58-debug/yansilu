import { retainWritingDraftBaseline } from "./writing-project-form-sync.js";

export async function loadWritingEntryMaterials({ state = {}, writingState, loadWritingMaterials, renderWritingPanel, getVaultPath = () => "" }) {
  // Materials belong to this vault, across project changes. Saves can mutate
  // note objects in place, so compare content as well as the request context.
  const module = state.module, scope = state.noteMoveVaultScope, vault = getVaultPath();
  const snapshot = () => JSON.stringify(state.notes || []);
  const inView = () => state.module === module && state.noteMoveVaultScope === scope && getVaultPath() === vault
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain && !state.unresolvedNoteMove;
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = snapshot();
    let stale = false;
    const current = () => {
      if (!inView()) return false;
      if (snapshot() !== before) stale = true;
      return !stale;
    };
    try { await loadWritingMaterials({ isCurrent: current }); }
    catch {
      if (!inView()) return;
      if (!stale) { writingState.materialsError = "笔记暂未读取成功，请重新打开写作重试。"; break; }
    }
    if (!inView()) return;
    if (!stale) break;
    // A save invalidated this read; fetch a new snapshot instead of dropping
    // unopened materials for the rest of the writing session.
    if (attempt === 2) writingState.materialsError = "笔记仍在更新，请重新打开写作读取。";
  }
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
