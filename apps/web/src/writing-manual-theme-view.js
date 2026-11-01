export function isManualWritingTheme(writingState = {}) {
  return Boolean(writingState.manualThemeEntry || writingState.project?.entry_mode === "manual");
}

export function syncWritingManualThemeView({ $ = () => null, writingState = {} } = {}) {
  const manual = isManualWritingTheme(writingState);
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
