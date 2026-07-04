export function renderAppShell(deps = {}) {
  const {
    state = {},
    ensureSelection = () => {},
    syncRailSelectionState = () => {},
    renderSidebarTitle = () => {},
    renderModulePanels = () => {},
    syncExportDirectoryOptions = () => {},
    renderAiInboxWorkspace = () => {},
    renderDistillationPanel = () => {},
    renderGraphPanel = () => {},
    renderSettingsPanel = () => {},
    explorerRender = () => {},
    renderExplorerSidebarFlow = () => {},
    renderSmartNotesDemoGuide = () => {},
    renderWritingPanel = () => {},
    renderEditorTabs = () => {},
    applyFocusModeChrome = () => {},
    renderStatusMeta = () => {},
    renderWorkspaceStatusHint = () => {},
    renderSaveAiSuggestion = () => {},
    renderSystemMessages = () => {}
  } = deps;

  ensureSelection();
  syncRailSelectionState();
  renderSidebarTitle();
  renderModulePanels();
  syncExportDirectoryOptions();
  renderAiInboxWorkspace();
  renderDistillationPanel();
  renderGraphPanel();
  renderSettingsPanel();
  if (state.module === "explorer" || state.module === "graph") {
    explorerRender();
  }
  renderExplorerSidebarFlow();
  renderSmartNotesDemoGuide();
  renderWritingPanel();
  renderEditorTabs();
  applyFocusModeChrome();
  renderStatusMeta();
  renderWorkspaceStatusHint();
  renderSaveAiSuggestion();
  renderSystemMessages();
}

export function createRenderAppShellController(options = {}) {
  const depsProvider = options.depsProvider || (() => ({}));
  return {
    renderAll: () => renderAppShell(depsProvider())
  };
}
