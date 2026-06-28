export function buildSidebarTitleRuntimeDeps({
  state = {},
  root = null,
  $ = () => null,
  documentRef = typeof document !== "undefined" ? document : null,
  windowRef = typeof window !== "undefined" ? window : null,
  displayFolderName = (folder) => folder?.name || "",
  currentModuleUi = () => ({}),
  syncNewNoteButtons = () => {}
} = {}) {
  return {
    state,
    root,
    elements: {
      sidebarTitle: $("sidebarTitle"),
      sidebarPrimaryActions: $("sidebarPrimaryActions"),
      filter: $("searchBar"),
      moduleSidebar: $("moduleSidebar"),
      sidebarFlow: $("sidebarFlow"),
      listArea: $("listArea"),
      searchToggle: $("btnToggleSearch"),
      sidebarSubtitle: $("sidebarSubtitle"),
      sidebarFoot: $("sidebarFoot"),
      explorerActions: $("explorerActions")
    },
    documentRef,
    windowRef,
    displayFolderName,
    currentModuleUi,
    syncNewNoteButtons
  };
}
