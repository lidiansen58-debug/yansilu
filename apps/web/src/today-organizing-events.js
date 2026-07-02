export function installTodayOrganizingEvents(panel = null, depsProvider = () => ({})) {
  if (!panel?.addEventListener) return null;
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
      const themeId = deps.todayState?.firstTheme?.id || "";
      deps.activateModule?.("writing");
      await deps.openWritingModule?.();
      if (themeId) await deps.selectWritingThemeIndex?.(themeId);
      return;
    }
    if (action === "open-writing") {
      const themeId = deps.todayState?.firstTheme?.id || "";
      const noteId = themeId ? "" : deps.todayState?.firstWritingReady?.id || "";
      if (noteId) deps.addWritingBasketIds?.([noteId]);
      deps.activateModule?.("writing");
      await deps.openWritingModule?.(noteId ? { statusMessage: "已把这条笔记加入写作中心" } : {});
      if (themeId) await deps.selectWritingThemeIndex?.(themeId);
    }
  };
  panel.addEventListener("click", handler);
  return handler;
}
