export function installEditorShellEventBindings(deps = {}) {
  const {
    $ = () => null,
    state = {},
    editor = {},
    getSaveAiSuggestion = () => null,
    setEditorHelperDismissed = () => {},
    setEditorHelperMuted = () => {},
    writeStoredBoolean = () => {},
    editorHelperMuteKey = "",
    hideEditorHelper = () => {},
    openNoteById = () => false,
    dismissSaveAiSuggestionForLater = () => {},
    dismissedSaveAiSuggestionKeys = new Set(),
    clearSaveAiSuggestion = () => {},
    renderWorkspaceStatusHint = () => {},
    applyFocusModeChrome = () => {},
    setStatus = () => {}
  } = deps;

  $("btnFocusMode")?.addEventListener("click", () => {
    state.focusMode = !state.focusMode;
    applyFocusModeChrome();
    editor.setFocusMode?.(state.focusMode);
    setStatus(state.focusMode ? "已开启专注模式" : "已退出专注模式", "ok", { requireModule: "explorer" });
    renderWorkspaceStatusHint();
  });

  $("btnDismissEditorHelper")?.addEventListener("click", () => {
    setEditorHelperDismissed(true);
    hideEditorHelper();
  });

  $("btnEditorHelperAction")?.addEventListener("click", () => {
    const button = $("btnEditorHelperAction");
    const helperAction = String(button?.dataset.helperAction || "noop").trim();
    const targetNoteId = String(button?.dataset.targetNoteId || "").trim();
    if (helperAction === "noop") {
      setEditorHelperDismissed(true);
      hideEditorHelper();
      return;
    }
    if (helperAction === "open-generated-original" && targetNoteId) {
      const opened = openNoteById(targetNoteId, { preferTitleSelection: false });
      if (opened) {
        setStatus("已打开对应永久笔记", "ok", { requireModule: "explorer" });
        return;
      }
      setStatus("没有找到对应永久笔记", "warn", { requireModule: "explorer" });
      return;
    }
    setStatus("已记录当前建议，你可以继续编辑", "ok", { requireModule: "explorer" });
  });

  $("btnSaveAiSuggestionLater")?.addEventListener("click", () => {
    dismissSaveAiSuggestionForLater(getSaveAiSuggestion(), dismissedSaveAiSuggestionKeys);
    clearSaveAiSuggestion();
  });

  $("btnEditorHelperMute")?.addEventListener("click", () => {
    setEditorHelperDismissed(true);
    setEditorHelperMuted(true);
    writeStoredBoolean(editorHelperMuteKey, true);
    hideEditorHelper();
    setStatus("后续将不再显示这类编辑提示", "ok", { requireModule: "explorer" });
  });
}
