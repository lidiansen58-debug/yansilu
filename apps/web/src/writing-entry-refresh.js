import { retainWritingDraftBaseline } from "./writing-project-form-sync.js";

export async function loadWritingEntryMaterials({ state = {}, writingState, loadWritingMaterials, renderWritingPanel }, isCurrent) {
  // Note saves and preparation publish a new cache array. A read begun earlier
  // must not replace those newer bodies or confirmation results.
  const notes = state.notes;
  const current = () => isCurrent() && state.notes === notes;
  try { await loadWritingMaterials({ isCurrent: current }); }
  catch { if (current()) writingState.materialsError = "笔记暂未读取成功，请重新打开写作重试。"; }
  if (isCurrent()) renderWritingPanel?.();
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
