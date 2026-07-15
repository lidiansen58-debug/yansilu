function normalizeText(value) {
  return String(value || "").trim();
}

export function isGeneratedWritingTitle(value = "") {
  const title = normalizeText(value).replace(/\s+草稿$/u, "").trim();
  if (!title) return true;
  return /^缺失笔记(?:\s+等\s+\d+\s+条笔记)?(?:的可写)?\s*主题?$/u.test(title)
    || /^导入笔记主题\s*\d*$/u.test(title)
    || /^(?:未命名|新的可写)主题$/u.test(title);
}

export function resolveWritingProjectFormTitle({ project = null, indexCard = null } = {}) {
  const projectTitle = normalizeText(project?.title);
  if (projectTitle && !isGeneratedWritingTitle(projectTitle)) return projectTitle;

  const themeTitle = normalizeText(indexCard?.title);
  if (themeTitle && !isGeneratedWritingTitle(themeTitle)) return themeTitle;

  const basketTitle = (Array.isArray(project?.basket_notes) ? project.basket_notes : [])
    .map((note) => normalizeText(note?.title || note?.id))
    .find((title) => title && title !== "缺失笔记");
  return basketTitle || "未命名文章";
}

export function syncWritingThemeFormFields({
  $ = () => null,
  indexCard = null,
  noteIds = [],
  previousSelectedThemeIndexId = "",
  selectedThemeIndexId = "",
  normalizeWritingProjectTitleSeed = normalizeText,
  suggestedWritingProjectTitle = () => ""
} = {}) {
  const titleInput = $("writingTitle");
  const goalInput = $("writingGoal");
  const themeChanged = normalizeText(previousSelectedThemeIndexId) !== normalizeText(selectedThemeIndexId);
  const themeTitle = normalizeText(indexCard?.title);
  const titleSeed = themeTitle || normalizeWritingProjectTitleSeed(suggestedWritingProjectTitle(noteIds));
  const goalSeed = normalizeText(indexCard?.central_question || indexCard?.centralQuestion || indexCard?.summary);

  if (titleInput && (themeChanged || !normalizeText(titleInput.value))) {
    titleInput.value = titleSeed;
  }
  if (goalInput && (themeChanged || !normalizeText(goalInput.value))) {
    goalInput.value = goalSeed;
  }

  return {
    themeChanged,
    title: titleInput?.value || "",
    goal: goalInput?.value || ""
  };
}
