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
  renderWritingPanel();
  renderEditorTabs();
  applyFocusModeChrome();
  renderStatusMeta();
  renderWorkspaceStatusHint();
  renderSaveAiSuggestion();
  renderSystemMessages();
}
