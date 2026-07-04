export function createDefaultVaultBackupState() {
  return {
    creating: false,
    restoring: false,
    backupTargetDirectory: "",
    backupPassword: "",
    restoreBackupPath: "",
    restoreTargetVaultPath: "",
    restorePassword: "",
    lastBackup: null,
    lastRestore: null,
    status: "",
    statusType: "",
    restoreStatus: "",
    restoreStatusType: ""
  };
}

function ensureBackupState(settingsState = {}) {
  if (!settingsState.backup) settingsState.backup = createDefaultVaultBackupState();
  return settingsState.backup;
}

function backupErrorMessage(error) {
  const code = error?.error?.code || error?.code || "";
  const message = String(error?.error?.message || error?.message || error || "");
  if (code === "VAULT_BACKUP_TARGET_REQUIRED") return "请选择加密备份保存位置，例如 U 盘、网盘、NAS 或本地文件夹。";
  if (code === "VAULT_BACKUP_TARGET_INSIDE_VAULT") return "请把加密备份保存到当前笔记库外面，避免以后备份时把旧备份一起打包。";
  if (code === "VAULT_BACKUP_TOO_LARGE") return "当前笔记库太大，暂时无法创建加密备份。请先清理不需要的附件，或换一个空间更充足的位置。";
  if (code === "VAULT_BACKUP_ALREADY_RUNNING") return "已有备份或恢复任务正在进行，请等待完成后再试。";
  const labels = {
    VAULT_BACKUP_PASSWORD_REQUIRED: "请输入备份密码。请牢记密码，研思录无法找回。",
    VAULT_BACKUP_WRITES_BUSY: "当前仍有写入任务没有完成。请稍等几秒后再创建加密备份。",
    VAULT_WRITES_PAUSED: "正在创建加密备份，新的写入会暂时暂停。",
    VAULT_BACKUP_SPACE_NOT_ENOUGH: "磁盘空间不足，无法创建加密备份。",
    VAULT_BACKUP_TARGET_INVALID: "备份文件需要使用 .yansilu-backup 扩展名。",
    VAULT_BACKUP_CREATE_FAILED: "创建加密备份失败，请稍后重试。"
  };
  return labels[code] || message || "创建加密备份失败，请稍后重试。";
}

function restoreErrorMessage(error) {
  const code = error?.error?.code || error?.code || "";
  const message = String(error?.error?.message || error?.message || error || "");
  if (code === "VAULT_BACKUP_ALREADY_RUNNING") return "已有备份或恢复任务正在进行，请等待完成后再试。";
  if (code === "VAULT_BACKUP_FILE_REQUIRED") return "请选择要恢复的 .yansilu-backup 备份文件。";
  if (code === "VAULT_BACKUP_FILE_NOT_FOUND") return "没有找到这个备份文件，请检查路径或重新选择。";
  const labels = {
    VAULT_BACKUP_PASSWORD_REQUIRED: "请输入备份密码。请牢记密码，研思录无法找回。",
    VAULT_BACKUP_PASSWORD_OR_FILE_INVALID: "密码错误，或备份文件已损坏。",
    VAULT_BACKUP_FILE_DAMAGED: "备份文件损坏，无法恢复。",
    VAULT_BACKUP_FORMAT_UNSUPPORTED: "这个备份文件版本暂不支持。",
    VAULT_RESTORE_TARGET_REQUIRED: "请选择一个新的恢复文件夹。",
    VAULT_RESTORE_TARGET_EXISTS: "目标文件夹已存在。为避免覆盖当前笔记库，请换一个新文件夹。",
    VAULT_RESTORE_SPACE_NOT_ENOUGH: "磁盘空间不足，无法恢复备份。",
    VAULT_BACKUP_RESTORE_FAILED: "恢复备份失败，请检查路径、密码和磁盘空间。"
  };
  return labels[code] || message || "恢复备份失败，请检查路径、密码和磁盘空间。";
}

function setInputValue($, id, value = "") {
  const input = $(id);
  if (input && String(input.value || "") !== String(value || "")) input.value = String(value || "");
}

function pathJoinLike(base = "", child = "") {
  const text = String(base || "").trim();
  if (!text) return child;
  const separator = text.includes("\\") && !text.includes("/") ? "\\" : "/";
  return `${text.replace(/[\\/]+$/g, "")}${separator}${child}`;
}

function restoreFolderName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `yansilu-restored-vault-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function renderVaultBackupPanel({
  $ = () => null,
  settingsState = {},
  escapeHtml = (value = "") => String(value ?? "")
} = {}) {
  const backup = ensureBackupState(settingsState);
  setInputValue($, "settingsBackupTargetDirectory", backup.backupTargetDirectory);
  setInputValue($, "settingsRestoreBackupPath", backup.restoreBackupPath);
  setInputValue($, "settingsRestoreTargetVaultPath", backup.restoreTargetVaultPath);

  const createButton = $("settingsCreateVaultBackup");
  if (createButton) {
    createButton.disabled = backup.creating;
    createButton.textContent = backup.creating ? "正在创建加密备份..." : "创建加密备份";
  }
  const restoreButton = $("settingsRestoreVaultBackup");
  if (restoreButton) {
    restoreButton.disabled = backup.restoring;
    restoreButton.textContent = backup.restoring ? "正在恢复备份..." : "恢复到新文件夹";
  }

  const status = $("settingsBackupStatus");
  if (status) {
    status.textContent = backup.status || "备份会包含笔记、附件、关系、主题、写作项目和设置。备份文件已加密，可以保存到 U 盘、网盘、NAS、私有 GitHub 仓库。请牢记密码，研思录无法找回。";
    status.classList.toggle("ok", backup.statusType === "ok");
    status.classList.toggle("warn", backup.statusType === "warn");
    status.classList.toggle("bad", backup.statusType === "bad");
  }
  const result = $("settingsBackupResult");
  if (result) {
    result.innerHTML = backup.lastBackup?.backupPath
      ? `<div class="settings-card-note">已创建：${escapeHtml(backup.lastBackup.backupPath)}</div>`
      : "";
  }
  $("settingsRevealBackup")?.classList.toggle("hidden", !backup.lastBackup?.backupPath);

  const restoreStatus = $("settingsRestoreStatus");
  if (restoreStatus) {
    restoreStatus.textContent = backup.restoreStatus || "恢复备份会默认写入一个新文件夹，不会覆盖当前笔记库。恢复成功后，你可以打开恢复后的笔记库继续使用。";
    restoreStatus.classList.toggle("ok", backup.restoreStatusType === "ok");
    restoreStatus.classList.toggle("warn", backup.restoreStatusType === "warn");
    restoreStatus.classList.toggle("bad", backup.restoreStatusType === "bad");
  }
  const restoreResult = $("settingsRestoreResult");
  if (restoreResult) {
    restoreResult.innerHTML = backup.lastRestore?.vaultPath
      ? `<div class="settings-card-note">已恢复：${escapeHtml(backup.lastRestore.vaultPath)}</div>`
      : "";
  }
  $("settingsOpenRestoredVault")?.classList.toggle("hidden", !backup.lastRestore?.vaultPath);
}

export function installVaultBackupPanelEvents(deps = {}) {
  const {
    $ = () => null,
    settingsState = {},
    desktopCommands = {},
    createBackup = async () => {},
    restoreBackup = async () => {},
    openRestoredVault = async () => {},
    renderSettingsPanel = () => {},
    setStatus = () => {}
  } = deps;
  const backup = ensureBackupState(settingsState);

  $("settingsBrowseBackupTarget")?.addEventListener("click", async () => {
    const picked = await desktopCommands.browseDirectory?.({
      defaultPath: backup.backupTargetDirectory || settingsState.vault?.vaultPath || "",
      purpose: "加密备份保存位置"
    });
    if (!picked?.path) return;
    backup.backupTargetDirectory = picked.path;
    renderSettingsPanel();
  });

  $("settingsCreateVaultBackup")?.addEventListener("click", async () => {
    backup.backupTargetDirectory = String($("settingsBackupTargetDirectory")?.value || "").trim();
    backup.backupPassword = String($("settingsBackupPassword")?.value || "");
    const confirmPassword = String($("settingsBackupPasswordConfirm")?.value || "");
    if (!backup.backupTargetDirectory) {
      backup.status = "请选择加密备份保存位置，例如 U 盘、网盘、NAS 或本地文件夹。";
      backup.statusType = "bad";
      renderSettingsPanel();
      return;
    }
    if (!backup.backupPassword) {
      backup.status = "请输入备份密码。请牢记密码，研思录无法找回。";
      backup.statusType = "bad";
      renderSettingsPanel();
      return;
    }
    if (backup.backupPassword !== confirmPassword) {
      backup.status = "两次输入的密码不一致。";
      backup.statusType = "bad";
      renderSettingsPanel();
      return;
    }
    backup.creating = true;
    backup.status = "正在暂停新的写入并等待当前保存完成，然后创建加密备份...";
    backup.statusType = "warn";
    renderSettingsPanel();
    try {
      const response = await createBackup({
        targetDirectory: backup.backupTargetDirectory,
        password: backup.backupPassword
      });
      backup.lastBackup = response?.item || null;
      backup.status = `加密备份已创建：${backup.lastBackup?.fileName || "备份文件"}`;
      backup.statusType = "ok";
      setStatus("加密备份已创建。请把备份文件保存到可靠位置，并牢记密码。", "ok");
    } catch (error) {
      backup.status = backupErrorMessage(error);
      backup.statusType = "bad";
      setStatus(backup.status, "bad");
    } finally {
      backup.creating = false;
      backup.backupPassword = "";
      if ($("settingsBackupPassword")) $("settingsBackupPassword").value = "";
      if ($("settingsBackupPasswordConfirm")) $("settingsBackupPasswordConfirm").value = "";
      renderSettingsPanel();
    }
  });

  $("settingsRevealBackup")?.addEventListener("click", async () => {
    if (!backup.lastBackup?.backupPath) return;
    await desktopCommands.revealInFileManager?.(backup.lastBackup.backupPath);
  });

  $("settingsBrowseRestoreTarget")?.addEventListener("click", async () => {
    const picked = await desktopCommands.browseDirectory?.({
      defaultPath: settingsState.vault?.vaultPath || "",
      purpose: "恢复备份的父文件夹"
    });
    if (!picked?.path) return;
    backup.restoreTargetVaultPath = pathJoinLike(picked.path, restoreFolderName());
    renderSettingsPanel();
  });

  $("settingsBrowseRestoreBackupFile")?.addEventListener("click", async () => {
    const picked = await desktopCommands.pickBackupFile?.({
      defaultPath: backup.restoreBackupPath || ""
    });
    if (!picked?.path) return;
    backup.restoreBackupPath = picked.path;
    renderSettingsPanel();
  });

  $("settingsRestoreVaultBackup")?.addEventListener("click", async () => {
    backup.restoreBackupPath = String($("settingsRestoreBackupPath")?.value || "").trim();
    backup.restoreTargetVaultPath = String($("settingsRestoreTargetVaultPath")?.value || "").trim();
    backup.restorePassword = String($("settingsRestorePassword")?.value || "");
    if (!backup.restoreBackupPath || !backup.restoreTargetVaultPath || !backup.restorePassword) {
      backup.restoreStatus = "请填写备份文件路径、新文件夹路径和备份密码。";
      backup.restoreStatusType = "bad";
      renderSettingsPanel();
      return;
    }
    backup.restoring = true;
    backup.restoreStatus = "正在解密并恢复到新文件夹，不会覆盖当前笔记库...";
    backup.restoreStatusType = "warn";
    renderSettingsPanel();
    try {
      const response = await restoreBackup({
        backupPath: backup.restoreBackupPath,
        targetVaultPath: backup.restoreTargetVaultPath,
        password: backup.restorePassword
      });
      backup.lastRestore = response?.item || null;
      backup.restoreStatus = "恢复成功。下一步：打开恢复后的笔记库。";
      backup.restoreStatusType = "ok";
      setStatus("恢复备份成功，可以打开恢复后的笔记库。", "ok");
    } catch (error) {
      backup.restoreStatus = restoreErrorMessage(error);
      backup.restoreStatusType = "bad";
      setStatus(backup.restoreStatus, "bad");
    } finally {
      backup.restoring = false;
      backup.restorePassword = "";
      if ($("settingsRestorePassword")) $("settingsRestorePassword").value = "";
      renderSettingsPanel();
    }
  });

  $("settingsOpenRestoredVault")?.addEventListener("click", async () => {
    if (!backup.lastRestore?.vaultPath) return;
    await openRestoredVault(backup.lastRestore.vaultPath);
  });
}
