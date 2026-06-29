export function installDirtyTabsBeforeUnloadEventBindings(deps = {}) {
  const {
    windowRef = globalThis.window,
    editor = {}
  } = deps;

  windowRef?.addEventListener?.("beforeunload", (event) => {
    if (!editor.hasDirtyTabs?.()) return;
    event.preventDefault();
    event.returnValue = "";
  });
}
