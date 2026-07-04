import { installVaultBackupPanelEvents } from "./settings-vault-backup-panel.js";

export function installSettingsEventBindings(deps = {}) {
  const {
    $ = () => null,
    state = {},
    settingsState = {},
    desktopCommands = {},
    editor = {},
    updateController = {},
    setSettingsSection = () => {},
    setSettingsItem = () => {},
    activateModule = () => {},
    refreshVaultSettings = async () => {},
    refreshMobileAccessStatus = async () => {},
    rotateMobileAccessPairingCodeFromUi = async () => {},
    confirmMobilePairRequestFromUi = async () => {},
    revokeMobileDeviceFromUi = async () => {},
    loadNoteTemplateSettingsFromStorage = () => {},
    syncDirectoriesFromApi = async () => {},
    syncNotesForDirectory = async () => {},
    createEncryptedVaultBackup = async () => {},
    restoreEncryptedVaultBackup = async () => {},
    renderAll = () => {},
    renderSettingsPanel = () => {},
    renderScheduledTasksWorkspace = () => {},
    setStatus = () => {},
    updateStateRemindLater = (value) => value,
    updateStateIgnoreLatest = (value) => value,
    updateStateAutoCheckEnabled = (value) => value,
    openNoteTemplatePreview = () => {},
    saveNoteTemplateFromEditor = () => {},
    resetNoteTemplateToDefault = () => {},
    updateNoteTemplatePreviewFromEditor = () => {},
    closeNoteTemplatePreview = () => {},
    scheduledTaskFiltersFromUi = () => ({}),
    scheduledTaskFormFromUi = () => ({}),
    resetScheduledTaskForm = () => {},
    refreshScheduledTasks = async () => {},
    runDueScheduledTasksFromUi = async () => {},
    saveScheduledTaskFromUi = async () => {},
    editScheduledTaskFromList = () => {},
    setScheduledTaskStatus = async () => {},
    applyScheduledTaskTemplateToForm = () => {}
  } = deps;

  installVaultBackupPanelEvents({
    $,
    settingsState,
    desktopCommands,
    createBackup: createEncryptedVaultBackup,
    restoreBackup: restoreEncryptedVaultBackup,
    renderSettingsPanel,
    setStatus,
    openRestoredVault: async (vaultPath) => {
      if (!editor.confirmDiscardDirtyTabs?.("打开恢复后的笔记库会关闭当前所有打开的笔记，未同步更改会丢失。是否继续？")) return;
      const nextVault = await desktopCommands.switchVault?.(vaultPath);
      settingsState.vault = nextVault;
      loadNoteTemplateSettingsFromStorage();
      state.notes = [];
      state.tabs = [];
      state.activeTabId = null;
      state.selectedFileId = null;
      await syncDirectoriesFromApi();
      state.browserRootId = "dir_original_default";
      state.selectedFolderId = "dir_original_default";
      await syncNotesForDirectory(state.selectedFolderId);
      renderAll();
      setStatus(`已打开恢复后的笔记库：${nextVault?.vaultPath || ""}`, "ok");
    }
  });

  $("settingsRefreshVault")?.addEventListener("click", async () => {
    setSettingsSection("workspace", { render: false });
    try {
      await refreshVaultSettings();
      setStatus("已刷新当前笔记库信息", "ok");
    } catch (error) {
      setStatus(`刷新笔记库信息失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("settingsSectionNav")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-settings-section]");
    if (!button) return;
    setSettingsSection(button.getAttribute("data-settings-section"), { announce: true });
  });

  $("settingsMobileItemSelect")?.addEventListener("change", (event) => {
    setSettingsItem(event.target.value, { announce: true });
    if (event.target.value === "mobile-access") refreshMobileAccessStatus({ silent: true });
  });

  $("settingsMobileAccessPanel")?.addEventListener("click", async (event) => {
    if (event.target.closest("[data-mobile-access-refresh]")) {
      await refreshMobileAccessStatus();
      return;
    }
    if (event.target.closest("[data-mobile-access-rotate]")) {
      await rotateMobileAccessPairingCodeFromUi();
      return;
    }
    const confirmButton = event.target.closest("[data-mobile-pair-confirm]");
    if (confirmButton) {
      await confirmMobilePairRequestFromUi(confirmButton.getAttribute("data-mobile-pair-confirm") || "");
      return;
    }
    const revokeButton = event.target.closest("[data-mobile-device-revoke]");
    if (revokeButton) {
      await revokeMobileDeviceFromUi(revokeButton.getAttribute("data-mobile-device-revoke") || "");
    }
  });

  $("settingsCheckUpdate")?.addEventListener("click", async () => {
    await updateController.refreshAppVersionInfo?.();
    await updateController.runAppUpdateCheck?.({ manual: true });
  });

  $("settingsOpenUpdateDownload")?.addEventListener("click", async () => {
    await updateController.openUpdateDownloadUrl?.();
  });

  $("settingsInstallUpdate")?.addEventListener("click", async () => {
    await updateController.installUpdateFromDesktopUpdater?.();
  });

  $("settingsRelaunchUpdate")?.addEventListener("click", async () => {
    await updateController.relaunchAfterInstalledUpdate?.();
  });

  $("settingsRemindUpdateLater")?.addEventListener("click", () => {
    settingsState.update = updateStateRemindLater(settingsState.update);
    updateController.persistUpdateSettingsToStorage?.();
    renderSettingsPanel();
    setStatus("已设置稍后提醒，今天不会自动提醒这个更新。", "ok");
  });

  $("settingsIgnoreUpdateVersion")?.addEventListener("click", () => {
    settingsState.update = updateStateIgnoreLatest(settingsState.update);
    updateController.persistUpdateSettingsToStorage?.();
    renderSettingsPanel();
    setStatus("已忽略当前检测到的版本；手动检查仍会显示结果。", "ok");
  });

  $("settingsAutoUpdateEnabled")?.addEventListener("change", (event) => {
    settingsState.update = updateStateAutoCheckEnabled(settingsState.update, event.target.checked);
    updateController.persistUpdateSettingsToStorage?.();
    renderSettingsPanel();
    setStatus(event.target.checked ? "已开启启动后的每日更新检查。" : "已关闭启动后的自动更新检查。", event.target.checked ? "ok" : "warn");
  });

  $("moduleSidebar")?.addEventListener("click", (event) => {
    if (state.module !== "settings") return;
    if (event.target.closest("#settingsSidebarBackToApp")) {
      activateModule("explorer");
      return;
    }
    const itemButton = event.target.closest("[data-settings-item]");
    if (itemButton) {
      const itemId = itemButton.getAttribute("data-settings-item");
      setSettingsItem(itemId, { announce: true });
      if (itemId === "mobile-access") refreshMobileAccessStatus({ silent: true });
      return;
    }
    const button = event.target.closest("[data-settings-section]");
    if (!button) return;
    setSettingsSection(button.getAttribute("data-settings-section"), { announce: true });
  });

  $("settingsBrowseVault")?.addEventListener("click", async () => {
    setSettingsSection("workspace", { render: false });
    const picked = await desktopCommands.pickVaultDirectory?.({ defaultPath: $("settingsVaultPath")?.value || settingsState.vault?.vaultPath || "" });
    if (picked?.path) {
      $("settingsVaultPath").value = picked.path;
      setStatus(`已选择笔记库路径（${picked.source}）`, "ok");
    }
  });

  $("settingsSwitchVault")?.addEventListener("click", async () => {
    setSettingsSection("workspace", { render: false });
    try {
      const currentInputPath = String($("settingsVaultPath")?.value || "").trim();
      const defaultPath = currentInputPath || settingsState.vault?.vaultPath || "";
      let nextPath = currentInputPath;
      if (!currentInputPath) {
        const picked = await desktopCommands.pickVaultDirectory?.({ defaultPath });
        if (!picked?.path) {
          setStatus("未选择新的笔记库路径", "warn");
          return;
        }
        nextPath = String(picked.path || "").trim();
        if ($("settingsVaultPath")) $("settingsVaultPath").value = nextPath;
      }
      if (!editor.confirmDiscardDirtyTabs?.("切换笔记库会关闭当前所有打开的笔记，未同步更改会丢失。是否继续？")) return;
      const nextVault = await desktopCommands.switchVault?.(nextPath);
      settingsState.vault = nextVault;
      loadNoteTemplateSettingsFromStorage();
      state.notes = [];
      state.tabs = [];
      state.activeTabId = null;
      state.selectedFileId = null;
      await syncDirectoriesFromApi();
      state.browserRootId = "dir_original_default";
      state.selectedFolderId = "dir_original_default";
      await syncNotesForDirectory(state.selectedFolderId);
      renderAll();
      setStatus(`已重新选择并初始化笔记库：${nextVault?.vaultPath || ""}`, "ok");
    } catch (error) {
      setStatus(`切换笔记库失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("settingsPreviewPermanentTemplate")?.addEventListener("click", () => {
    setSettingsSection("templates", { render: false });
    openNoteTemplatePreview("permanent");
  });

  $("settingsPreviewLiteratureTemplate")?.addEventListener("click", () => {
    setSettingsSection("templates", { render: false });
    openNoteTemplatePreview("literature");
  });

  $("settingsSavePermanentTemplate")?.addEventListener("click", () => {
    saveNoteTemplateFromEditor("permanent");
  });

  $("settingsResetPermanentTemplate")?.addEventListener("click", () => {
    resetNoteTemplateToDefault("permanent");
  });

  $("settingsSaveLiteratureTemplate")?.addEventListener("click", () => {
    saveNoteTemplateFromEditor("literature");
  });

  $("settingsResetLiteratureTemplate")?.addEventListener("click", () => {
    resetNoteTemplateToDefault("literature");
  });

  $("settingsPermanentTemplateEditor")?.addEventListener("input", () => {
    updateNoteTemplatePreviewFromEditor("permanent");
  });

  $("settingsLiteratureTemplateEditor")?.addEventListener("input", () => {
    updateNoteTemplatePreviewFromEditor("literature");
  });

  $("settingsTemplatePreviewClose")?.addEventListener("click", () => {
    closeNoteTemplatePreview();
  });

  $("settingsTemplatePreviewModal")?.addEventListener("click", (event) => {
    if (event.target === $("settingsTemplatePreviewModal")) closeNoteTemplatePreview();
  });

  $("settingsPaneAutomationBody")?.addEventListener("click", async (event) => {
    if (!event.target.closest("#settingsScheduledTasksPanel")) return;
    const formSummary = event.target.closest(".scheduled-task-form-details > summary");
    if (formSummary) {
      const details = formSummary.closest(".scheduled-task-form-details");
      settingsState.ai.scheduledTaskFormOpen = !details?.open;
      return;
    }

    if (event.target.closest("#btnScheduledTasksApplyFilters")) {
      settingsState.ai.scheduledTaskFilters = scheduledTaskFiltersFromUi();
      await refreshScheduledTasks();
      setStatus("计划任务已刷新", "ok");
      return;
    }

    if (event.target.closest("#btnScheduledTasksRefresh")) {
      await refreshScheduledTasks();
      setStatus("计划任务已刷新", "ok");
      return;
    }

    if (event.target.closest("#btnScheduledTasksRunDue")) {
      await runDueScheduledTasksFromUi();
      return;
    }

    if (event.target.closest("#btnScheduledTaskUseCurrentNote")) {
      const noteId = String(state.selectedFileId || state.activeTabId || "").trim();
      if (!noteId) return setStatus("还没有选中当前笔记", "warn");
      settingsState.ai.scheduledTaskForm = {
        ...scheduledTaskFormFromUi(),
        noteIdsText: noteId,
        directoryIdsText: ""
      };
      settingsState.ai.scheduledTaskFormOpen = true;
      renderScheduledTasksWorkspace();
      return;
    }

    if (event.target.closest("#btnScheduledTaskUseCurrentDirectory")) {
      const directoryId = String(state.selectedFolderId || "").trim();
      if (!directoryId) return setStatus("还没有选中当前目录", "warn");
      settingsState.ai.scheduledTaskForm = {
        ...scheduledTaskFormFromUi(),
        noteIdsText: "",
        directoryIdsText: directoryId
      };
      settingsState.ai.scheduledTaskFormOpen = true;
      renderScheduledTasksWorkspace();
      return;
    }

    if (event.target.closest("#btnScheduledTaskClearForm")) {
      resetScheduledTaskForm();
      setStatus("计划任务草稿已重置", "ok");
      return;
    }

    if (event.target.closest("#btnScheduledTaskSave")) {
      await saveScheduledTaskFromUi();
      return;
    }

    const editButton = event.target.closest("[data-scheduled-task-edit]");
    if (editButton) {
      editScheduledTaskFromList(editButton.getAttribute("data-scheduled-task-edit"));
      return;
    }

    const statusButton = event.target.closest("[data-scheduled-task-status]");
    if (statusButton) {
      await setScheduledTaskStatus(
        statusButton.getAttribute("data-scheduled-task-id"),
        statusButton.getAttribute("data-scheduled-task-status")
      );
    }
  });

  $("settingsPaneAutomationBody")?.addEventListener("input", (event) => {
    if (!event.target.closest("#settingsScheduledTasksPanel")) return;
    if (!event.target.closest("#scheduledTaskForm")) return;
    settingsState.ai.scheduledTaskForm = scheduledTaskFormFromUi();
    settingsState.ai.scheduledTaskFormOpen = true;
  });

  $("settingsPaneAutomationBody")?.addEventListener("change", (event) => {
    if (!event.target.closest("#settingsScheduledTasksPanel")) return;
    if (!event.target.closest("#scheduledTaskForm")) return;
    settingsState.ai.scheduledTaskForm = scheduledTaskFormFromUi();
    settingsState.ai.scheduledTaskFormOpen = true;
    if (event.target.closest("#scheduledTaskTemplateSelect")) {
      applyScheduledTaskTemplateToForm(event.target.value);
    }
  });
}
