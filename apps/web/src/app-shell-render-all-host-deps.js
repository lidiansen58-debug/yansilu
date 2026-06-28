export function buildRenderAppShellHostDeps(host = {}) {
  return {
    state: host.state,
    explorer: host.explorer,
    editor: host.editor,
    ensureSelection: host.ensureSelection,
    syncRailSelectionState: host.syncRailSelectionState,
    renderSidebarTitle: host.renderSidebarTitle,
    renderModulePanels: host.renderModulePanels,
    syncExportDirectoryOptions: host.syncExportDirectoryOptions,
    renderAiInboxWorkspace: host.renderAiInboxWorkspace,
    renderDistillationPanel: host.renderDistillationPanel,
    renderGraphPanel: host.renderGraphPanel,
    renderSettingsPanel: host.renderSettingsPanel,
    renderWritingPanel: host.renderWritingPanel,
    applyFocusModeChrome: host.applyFocusModeChrome,
    renderStatusMeta: host.renderStatusMeta,
    renderWorkspaceStatusHint: host.renderWorkspaceStatusHint,
    renderSaveAiSuggestion: host.renderSaveAiSuggestion,
    renderSystemMessages: host.renderSystemMessages
  };
}
