export function installEditorShellEventBindings(deps = {}) {
  const {
    $ = () => null,
    state = {},
    editor = {},
    applyFocusModeChrome = () => {},
    setStatus = () => {}
  } = deps;

  $("btnFocusMode")?.addEventListener("click", () => {
    state.focusMode = !state.focusMode;
    applyFocusModeChrome();
    editor.setFocusMode?.(state.focusMode);
    setStatus(state.focusMode ? "已开启专注模式" : "已退出专注模式", "ok", { requireModule: "explorer" });
  });

}
