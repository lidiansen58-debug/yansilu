export function installTodayOrganizingEvents(panel = null, depsProvider = () => ({})) {
  if (!panel?.addEventListener) return null;
  const themeEntryReason = (theme = null) => {
    const title = String(theme?.title || "这个可写主题").trim();
    const count = Number(theme?.noteCount || 0);
    return count > 0
      ? `${title}已经聚合了 ${count} 条相关笔记，适合先续接这个主题。`
      : `${title}已经在当前可写主题列表里，适合先从这里续接。`;
  };
  const noteEntryReason = (note = null) => {
    const title = String(note?.title || "这条永久笔记").trim();
    return `${title}已经有明确观点和三句摘要，适合先放入相关笔记继续组织。`;
  };
  const handler = async (event) => {
    const button = event.target?.closest?.("[data-today-action]");
    if (!button) return;
    const action = String(button.getAttribute("data-today-action") || "").trim();
    if (!action || button.disabled) return;
    event.preventDefault();
    const deps = depsProvider() || {};
    if (action === "connect-first-isolated") {
      const noteId = deps.todayState?.firstIsolated?.id || "";
      if (!noteId) return;
      await deps.handleStateChange?.("graph-associate-note", { noteId, source: "today-organizing" });
      return;
    }
    if (action === "open-first-theme") {
      const theme = deps.todayState?.firstTheme || null;
      const themeId = theme?.id || "";
      deps.activateModule?.("writing");
      await deps.openWritingModule?.({
        entryReason: themeEntryReason(theme),
        entrySourceLabel: "今日整理"
      });
      if (themeId) await deps.selectWritingThemeIndex?.(themeId);
      return;
    }
    if (action === "open-writing") {
      const theme = deps.todayState?.firstTheme || null;
      const note = deps.todayState?.firstWritingReady || null;
      const themeId = theme?.id || "";
      const noteId = themeId ? "" : note?.id || "";
      if (noteId) deps.addWritingBasketIds?.([noteId]);
      deps.activateModule?.("writing");
      await deps.openWritingModule?.({
        ...(noteId ? { statusMessage: "已把这条笔记加入写作中心" } : {}),
        entryReason: themeId ? themeEntryReason(theme) : noteEntryReason(note),
        entrySourceLabel: "今日整理"
      });
      if (themeId) await deps.selectWritingThemeIndex?.(themeId);
    }
  };
  panel.addEventListener("click", handler);
  return handler;
}
