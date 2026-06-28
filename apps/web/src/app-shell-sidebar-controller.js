export function renderSidebarTitleForRuntime({
  state = {},
  root = null,
  elements = {},
  documentRef = typeof document !== "undefined" ? document : null,
  windowRef = typeof window !== "undefined" ? window : null,
  displayFolderName = (folder) => folder?.name || "",
  currentModuleUi = () => ({}),
  syncNewNoteButtons = () => {}
} = {}) {
  const {
    sidebarTitle = null,
    sidebarPrimaryActions = null,
    filter = null,
    moduleSidebar = null,
    sidebarFlow = null,
    listArea = null,
    searchToggle = null,
    sidebarSubtitle = null,
    sidebarFoot = null,
    explorerActions = null
  } = elements;
  const editorMode = state.module === "explorer";

  if (editorMode) {
    if (sidebarTitle) sidebarTitle.textContent = root ? displayFolderName(root) : "目录";
    if (sidebarSubtitle) {
      sidebarSubtitle.textContent = "";
      sidebarSubtitle.classList.add("hidden");
    }
    const quickAction =
      state.browserRootId === "dir_fleeting_default"
        ? "quick-fleeting"
        : state.browserRootId === "dir_literature_default"
          ? "quick-literature"
          : "quick-original";
    const explorerActive = state.module === "explorer";
    documentRef
      ?.querySelectorAll?.(".quick-entry")
      ?.forEach((entry) => entry.classList.toggle("current-root", explorerActive && entry.dataset.action === quickAction));
    syncNewNoteButtons();
    explorerActions?.classList.add("hidden");
    if (explorerActions) explorerActions.innerHTML = "";
    sidebarPrimaryActions?.classList.remove("hidden");
    const showSearch = Boolean(state.searchVisible || String(state.searchQuery || "").trim());
    filter?.classList.toggle("hidden", !showSearch);
    searchToggle?.classList.toggle("is-ghost", !showSearch);
    sidebarFlow?.classList.add("hidden");
    if (sidebarFlow) sidebarFlow.innerHTML = "";
    listArea?.classList.remove("hidden");
    moduleSidebar?.classList.remove("visible");
    if (moduleSidebar) moduleSidebar.innerHTML = "";
    if (sidebarFoot) {
      sidebarFoot.textContent = "";
      sidebarFoot.classList.add("hidden");
    }
    return;
  }

  if (state.module === "graph") {
    if (sidebarTitle) sidebarTitle.textContent = "图谱笔记范围";
    if (sidebarSubtitle) {
      sidebarSubtitle.classList.remove("hidden");
      sidebarSubtitle.textContent = "这里不是永久笔记页；点目录或笔记是在切换图谱观察范围。";
    }
    explorerActions?.classList.add("hidden");
    if (explorerActions) explorerActions.innerHTML = "";
    sidebarPrimaryActions?.classList.add("hidden");
    filter?.classList.add("hidden");
    sidebarFlow?.classList.add("hidden");
    if (sidebarFlow) sidebarFlow.innerHTML = "";
    listArea?.classList.remove("hidden");
    moduleSidebar?.classList.remove("visible");
    if (moduleSidebar) moduleSidebar.innerHTML = "";
    if (sidebarFoot) {
      sidebarFoot.classList.remove("hidden");
      sidebarFoot.textContent = "待关联笔记会使用和永久笔记盒一致的提示样式；点进来可以关联一条笔记。";
    }
    return;
  }

  const moduleUi = currentModuleUi();
  const compactImportSidebar = state.module === "imports" && windowRef?.innerWidth <= 700;
  if (sidebarTitle) sidebarTitle.textContent = moduleUi.sidebarTitle || "";
  if (sidebarSubtitle) {
    sidebarSubtitle.classList.remove("hidden");
    sidebarSubtitle.textContent = compactImportSidebar ? "先预览，再写入。" : (moduleUi.sidebarSubtitle || "当前功能页。");
  }
  explorerActions?.classList.add("hidden");
  if (explorerActions) explorerActions.innerHTML = "";
  sidebarPrimaryActions?.classList.add("hidden");
  filter?.classList.add("hidden");
  sidebarFlow?.classList.add("hidden");
  if (sidebarFlow) sidebarFlow.innerHTML = "";
  listArea?.classList.add("hidden");
  moduleSidebar?.classList.toggle("visible", !compactImportSidebar);
  if (moduleSidebar) moduleSidebar.innerHTML = compactImportSidebar ? "" : (moduleUi.sidebarHtml || "");
  if (sidebarFoot) {
    if (compactImportSidebar) {
      sidebarFoot.textContent = "";
      sidebarFoot.classList.add("hidden");
    } else {
      sidebarFoot.classList.remove("hidden");
      sidebarFoot.textContent = moduleUi.sidebarFoot || "";
    }
  }
}

export function createSidebarTitleController(options = {}) {
  const depsProvider = options.depsProvider || (() => ({}));
  return {
    renderSidebarTitle: () => renderSidebarTitleForRuntime(depsProvider())
  };
}
