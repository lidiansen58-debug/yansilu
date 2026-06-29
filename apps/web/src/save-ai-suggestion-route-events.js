export function installSaveAiSuggestionRouteEventBindings(deps = {}) {
  const {
    $ = () => null,
    windowRef = globalThis.window,
    state = {},
    editor = {},
    getSaveAiSuggestion = () => null,
    clearSaveAiSuggestion = () => {},
    saveAiSuggestionPrimaryRoute = () => ({ kind: "no-action" }),
    activateModule = () => {},
    openNoteById = () => false,
    handleStateChange = async () => {},
    setStatus = () => {}
  } = deps;

  $("btnSaveAiSuggestionPrimary")?.addEventListener("click", async () => {
    const suggestion = getSaveAiSuggestion();
    clearSaveAiSuggestion();
    if (!suggestion?.noteId) return;
    const note = state.notes?.find((item) => item.id === suggestion.noteId) || null;
    const route = saveAiSuggestionPrimaryRoute(suggestion, note);
    if (route.kind === "missing-note") {
      setStatus("没有找到这条笔记", "warn", { requireModule: "explorer" });
      return;
    }

    try {
      if (route.kind === "record-permanent") {
        activateModule("explorer");
        const opened = openNoteById(route.noteId, { preferTitleSelection: false });
        if (!opened) {
          setStatus("没有找到这条笔记", "warn", { requireModule: "explorer" });
          return;
        }
        windowRef.setTimeout?.(() => {
          const button = editor?.els?.recordPermanent;
          if (!button || button.disabled) {
            setStatus("当前笔记暂时不能创建永久笔记", "warn", { requireModule: "explorer" });
            return;
          }
          button.click();
        }, 30);
        return;
      }

      if (route.kind === "open-note-main-route") {
        await handleStateChange("open-note-main-route", {
          noteId: route.noteId,
          action: route.action,
          mode: route.mode
        });
        return;
      }

      setStatus("这条建议暂时没有可执行动作", "warn", { requireModule: "explorer" });
    } catch (error) {
      setStatus(`处理建议失败：${String(error?.message || error)}`, "bad", { requireModule: "explorer" });
    }
  });
}
