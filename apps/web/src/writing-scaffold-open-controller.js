import { acceptSavedWritingOutline } from "./writing-outline-recovery.js";
import { readWritingInput } from "./writing-input-recovery.js";

const content = item => JSON.stringify([item?.sections || [], item?.open_questions || []]);

export async function openWritingScaffoldVersion(deps, scaffoldId) {
  const { writingState, state = {}, getVaultPath = () => "", fetchDraftScaffold,
    confirm = () => false, renderWritingPanel = () => {}, setStatus = () => {}, $ = () => null } = deps;
  const id = String(scaffoldId || "").trim(), projectId = writingState.project?.id;
  if (!id || !projectId) throw new Error("请选择一个已有提纲的写作主题。");
  const revision = Number(writingState.scaffoldOpenRevision || 0) + 1;
  writingState.scaffoldOpenRevision = revision;
  const vault = getVaultPath(), scope = state.noteMoveVaultScope, module = state.module;
  const queue = writingState.outlineSaveQueue;
  const snapshot = () => JSON.stringify([writingState.project?.id, writingState.scaffold?.id,
    content(writingState.scaffold), writingState.draftMarkdown, writingState.bookChapter]);
  const before = snapshot();
  const current = () => writingState.scaffoldOpenRevision === revision && snapshot() === before
    && getVaultPath() === vault && state.noteMoveVaultScope === scope && state.module === module
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain && writingState.outlineSaveQueue === queue;
  const button = $("btnWritingReloadScaffold");
  const disabled = writingState.scaffoldOpenPending ? writingState.scaffoldOpenButtonDisabled : button?.disabled;
  writingState.scaffoldOpenPending = true;
  writingState.scaffoldOpenButtonDisabled = disabled;
  let committed = false;
  if (button) button.disabled = true;
  setStatus("正在读取已保存提纲...", "ok");
  try {
    await queue?.catch(() => null);
    if (!current()) return null;
    const bundle = await fetchDraftScaffold(id), saved = bundle?.item;
    if (!current()) return null;
    if (saved?.id !== id || saved.writing_project_id !== projectId || !Array.isArray(saved.sections)) {
      throw new Error("提纲数据与当前主题不匹配，未替换当前内容。");
    }
    const cached = readWritingInput(deps, JSON.stringify(["outline", projectId, id]));
    if ((cached || content(writingState.scaffold) !== content(saved)) && !(await confirm(
      "载入已保存提纲？当前未保存的修改会被替换。可以先取消并导出当前提纲。"))) {
      if (current()) setStatus("已取消载入，保留当前提纲。", "ok");
      return null;
    }
    if (!current()) return null;
    acceptSavedWritingOutline(deps, projectId, saved);
    writingState.scaffold = saved;
    writingState.scaffoldMarkdown = bundle.export?.markdown || saved.markdown || "";
    committed = true;
    renderWritingPanel();
    return bundle;
  } catch (error) {
    if (!current()) return null;
    throw error;
  } finally {
    if (writingState.scaffoldOpenRevision === revision) writingState.scaffoldOpenPending = false;
    if (writingState.scaffoldOpenRevision === revision && getVaultPath() === vault && state.noteMoveVaultScope === scope) {
      if (button) button.disabled = disabled;
      if (!committed && snapshot() !== before && state.module === module) setStatus("当前内容已变化，已取消载入提纲。", "warn");
    }
  }
}

export async function handleWritingReloadScaffoldClick(deps) {
  const menu = deps.$?.("writingMoreMenu");
  if (menu) menu.open = false;
  try {
    const result = await deps.openScaffoldVersion?.(deps.writingState?.scaffold?.id);
    if (result) {
      deps.setStatus?.("已载入已保存提纲，可继续编辑。", "ok");
    }
    return result;
  } catch (error) {
    deps.setStatus?.(`载入提纲失败：${String(error?.message || error)}。当前编辑仍保留。`, "bad");
    return null;
  }
}
