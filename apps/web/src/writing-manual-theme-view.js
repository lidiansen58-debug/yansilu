import { applyWritingTab } from "./writing-tabs.js";

export function isManualWritingTheme(writingState = {}) {
  return Boolean(writingState.manualThemeEntry || writingState.project?.entry_mode === "manual");
}
export function syncWritingManualThemeView({ $ = () => null, writingState = {} } = {}) {
  const manual = isManualWritingTheme(writingState);
  const shell = $("writingPanel")?.querySelector?.(".writing-shell");
  const hasOutline = Boolean(writingState.scaffold?.id || writingState.project?.scaffold_id);
  const outlineTab = shell?.querySelector?.('[data-writing-tab="outline"]');
  if (outlineTab) outlineTab.hidden = manual && !hasOutline;
  if (manual && !hasOutline && shell?.dataset.writingActiveTab === "outline") {
    applyWritingTab(writingState.project?.id ? "draft" : "theme", { root: shell });
  }
  const title = $("writingTitle");
  const label = title?.ownerDocument?.querySelector('label[for="writingTitle"]');
  const goalLabel = $("writingGoal")?.ownerDocument?.querySelector('label[for="writingGoal"]');
  if (label) label.textContent = manual ? "想写什么？" : "文章题目";
  if (title) title.placeholder = manual ? "写下一个问题，或一句自己的想法。" : "例如：从卡片到文章提纲";
  if (goalLabel) goalLabel.hidden = manual;
  if ($("writingGoal")) $("writingGoal").hidden = manual;
  if ($("writingThemeDetailHint") && manual) $("writingThemeDetailHint").textContent = "";
  const heading = $("writingThemePanel")?.querySelector(".writing-section-title");
  if (heading) heading.textContent = manual ? "主题" : "先定题目";
  if ($("btnWritingCreateScaffold")) $("btnWritingCreateScaffold").hidden = manual;
  const start = $("btnWritingStartManualDraft");
  if (start) {
    start.hidden = !manual;
    start.disabled = !String(title?.value || "").trim() || Boolean(writingState.projectCreationPending);
  }
}
