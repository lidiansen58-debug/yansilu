import {
  buildSidebarTitleRuntimeDeps
} from "./app-shell-sidebar-deps.js";

export function buildSidebarTitleHostDeps(host = {}) {
  const {
    state = {},
    folderById = () => null
  } = host;
  return {
    state,
    root: folderById(state, state.browserRootId),
    $: host.$,
    documentRef: host.documentRef,
    windowRef: host.windowRef,
    displayFolderName: host.displayFolderName,
    currentModuleUi: host.currentModuleUi,
    syncNewNoteButtons: host.syncNewNoteButtons
  };
}

export function createSidebarTitlePrototypeDepsProvider(hostProvider = () => ({})) {
  return () => buildSidebarTitleRuntimeDeps(buildSidebarTitleHostDeps(hostProvider()));
}
