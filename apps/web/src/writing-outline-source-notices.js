const sourceChecks = new Set(["source_files", "source_note_types", "basket_notes_missing_thesis", "basket_notes_missing_three_line_summary"]);
const qualityChecks = new Map([
  ["confirmed_distillation", "观点尚未确认"], ["distillation_quality", "观点说明需要完善"]
]);
const pendingOpens = new WeakMap();

export function writingOutlineSourceNotices(writingState = {}) {
  const notes = new Map([
    ...(writingState.project?.basket_notes || []), ...(writingState.scaffold?.basket_notes || []), ...(writingState.scaffold?.evidence_notes || [])
  ].map(note => [String(note.id), note]));
  const warnings = (writingState.scaffold?.preflight?.checks || [])
    .filter(check => ["warning", "warn"].includes(check.status));
  const covered = new Set(warnings.filter(check => sourceChecks.has(check.id))
    .flatMap(check => (check.targetNoteIds || []).map(String)));
  const checks = warnings.filter(check => sourceChecks.has(check.id));
  for (const [id, message] of qualityChecks) {
    const targets = [...new Set(warnings.filter(check => check.id === id)
      .flatMap(check => (check.targetNoteIds || []).map(String)))].filter(target => !covered.has(target));
    if (!targets.length) continue;
    targets.forEach(target => covered.add(target));
    checks.push({ id, targetNoteIds: targets, message: `${targets.length} 条相关笔记的${message}，请打开笔记核对。` });
  }
  return checks.map(check => ({
      message: String(check.message || "请核对来源笔记。"),
      targets: [...new Set((check.targetNoteIds || []).map(String))].map(id => {
        const note = notes.get(String(id));
        const missing = check.id === "source_files" || note?.status === "missing" || note?.note_type === "missing";
        return { id: String(id), title: missing ? "来源文件缺失" : String(note?.title || "来源笔记"), missing };
      })
    }));
}

export function renderWritingOutlineSourceNotices(writingState, escapeHtml) {
  const notices = writingOutlineSourceNotices(writingState);
  if (!notices.length) return "";
  return `<ul class="writing-outline-source-notices" aria-label="来源核对">${notices.map(notice => `
    <li><p>${escapeHtml(notice.message)}</p><div class="writing-outline-source-links">${notice.targets.map(target =>
      target.missing ? `<span>${escapeHtml(target.title)}</span>`
        : `<button type="button" class="writing-outline-source-note" data-writing-outline-source-note="${escapeHtml(target.id)}" title="打开笔记核对">核对：${escapeHtml(target.title)}</button>`
    ).join("")}</div></li>`).join("")}</ul>`;
}

export async function handleWritingOutlineSourceClick(event, deps = {}) {
  const button = event?.target?.closest?.("[data-writing-outline-source-note]");
  if (!button) return false;
  const writingState = deps.writingState || {}, state = deps.state || {};
  const id = String(button.getAttribute("data-writing-outline-source-note") || "");
  const allowed = () => writingOutlineSourceNotices(writingState).some(notice =>
    notice.targets.some(target => target.id === id && !target.missing));
  if (!allowed() || button.disabled) return true;
  const token = {}, scope = state.noteMoveVaultScope ||= {}, vault = deps.getVaultPath?.();
  const projectId = writingState.project?.id, scaffoldId = writingState.scaffold?.id, module = state.module;
  pendingOpens.set(writingState, token);
  const isCurrent = () => pendingOpens.get(writingState) === token && state.noteMoveVaultScope === scope
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain && deps.getVaultPath?.() === vault
    && writingState.project?.id === projectId && writingState.scaffold?.id === scaffoldId
    && state.module === module && allowed();
  button.disabled = true;
  try {
    if (!isCurrent()) return true;
    if (typeof deps.openWritingSourceNote !== "function") throw new Error("笔记入口暂不可用，请重新打开主题后重试。");
    await deps.openWritingSourceNote(id, { isCurrent });
  } catch (error) {
    if (isCurrent()) deps.setStatus?.(`无法打开来源笔记：${String(error?.message || error)}`, "warn");
  } finally {
    button.disabled = false;
    if (pendingOpens.get(writingState) === token) pendingOpens.delete(writingState);
  }
  return true;
}
