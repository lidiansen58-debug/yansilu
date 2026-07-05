import { currentModuleSidebarUi } from "./app-shell-module-ui.js";
import { renderModuleWorkspaceHeaderForRuntime } from "./app-shell-module-header.js";

export function createModuleWorkspaceHeaderRuntimeRoutes(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};

  function currentModuleUi() {
    const current = deps();
    const root = current.folderById(current.state, current.state.browserRootId);
    return currentModuleSidebarUi({
      module: current.state.module,
      rootName: root?.name || "当前目录",
      escapeHtml: current.escapeHtml,
      settingsSidebarNavigationHtml: current.settingsSidebarNavigationHtml
    });
  }

  function renderModuleWorkspaceHeader() {
    const current = deps();
    const moduleTitle = current.$("moduleTitle");
    const moduleSummary = current.$("moduleSummary");
    const moduleHeaderActions = current.$("moduleHeaderActions");
    const settingsPackSelect = current.$("settingsAiModelPack");
    const packOptionsHtml = settingsPackSelect
      ? [...settingsPackSelect.querySelectorAll("option")]
          .map((option) => `<option value="${current.escapeHtml(option.value)}">${current.escapeHtml(option.textContent || option.value)}</option>`)
          .join("")
      : `
        <option value="Starter Auto">日常整理</option>
        <option value="Privacy First">本地私密</option>
        <option value="Ollama Local">本地 AI</option>
      `;

    return renderModuleWorkspaceHeaderForRuntime({
      state: current.state,
      elements: {
        moduleTitle,
        moduleSummary,
        moduleHeaderActions,
        moduleBackToNotes: current.$("moduleBackToNotes"),
        moduleAiModelPack: current.$("moduleAiModelPack"),
        moduleAiRefreshRoute: current.$("moduleAiRefreshRoute")
      },
      settingsState: current.settingsState,
      moduleUi: currentModuleUi(),
      settingsHeader: current.settingsModuleHeaderCopy(),
      settingsPackOptionsHtml: packOptionsHtml,
      currentAiProviderId: current.currentAiProviderId,
      activateModule: current.activateModule,
      applyAiModelPackChange: current.applyAiModelPackChange,
      refreshAiRoutePreview: current.refreshAiRoutePreview,
      renderModuleWorkspaceHeader,
      renderSettingsPanel: current.renderSettingsPanel,
      setStatus: current.setStatus,
      todayReturnTarget: current.todayReturnTarget,
      escapeHtml: current.escapeHtml
    });
  }

  return {
    currentModuleUi,
    renderModuleWorkspaceHeader
  };
}
