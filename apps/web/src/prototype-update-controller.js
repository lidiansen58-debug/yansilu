import {
  createUpdateState,
  normalizeUpdateSettings,
  shouldAutoCheckForUpdates,
  updateStateAutoCheckEnabled,
  updateStateChecking,
  updateStateDownloaded,
  updateStateDownloading,
  updateStateFailed,
  updateStateFromCheckResult,
  updateStateFromVersionInfo,
  updateStatusLabel,
  updateStatusTone,
  UPDATE_STATUS
} from "./update-state.js";
import {
  checkDesktopUpdate,
  downloadAndInstallDesktopUpdate,
  isDesktopUpdaterAvailable,
  relaunchDesktopApp
} from "./desktop-update-adapter.js";

export function createPrototypeUpdateController(deps = {}) {
  const {
    settingsState,
    readStoredText = () => "",
    writeStoredText = () => {},
    updateSettingsKey: UPDATE_SETTINGS_KEY = "",
    updateLastResultKey: UPDATE_LAST_RESULT_KEY = "",
    appVersion: APP_VERSION = "",
    fetchAppVersion = async () => null,
    checkAppUpdate = async () => ({}),
    renderSettingsPanel = () => {},
    renderSystemMessages = () => {},
    setStatus = () => {},
    upsertSystemMessage = () => {},
    desktopCommands = {},
    getDirtyTabCount = () => 0
  } = deps;

  function loadUpdateSettingsFromStorage() {
    const settingsRaw = readStoredText(UPDATE_SETTINGS_KEY, "");
    const resultRaw = readStoredText(UPDATE_LAST_RESULT_KEY, "");
    let storedSettings = {};
    let storedResult = {};
    try {
      storedSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
    } catch {
      storedSettings = {};
    }
    try {
      storedResult = resultRaw ? JSON.parse(resultRaw) : {};
    } catch {
      storedResult = {};
    }
    const settings = normalizeUpdateSettings(storedSettings);
    settingsState.update = createUpdateState({
      ...settingsState.update,
      ...storedResult,
      ...settings
    });
  }

  function persistUpdateSettingsToStorage() {
    writeStoredText(UPDATE_SETTINGS_KEY, JSON.stringify(normalizeUpdateSettings(settingsState.update)));
  }

  function persistUpdateLastResultToStorage() {
    const state = settingsState.update || createUpdateState();
    writeStoredText(UPDATE_LAST_RESULT_KEY, JSON.stringify({
      status: state.status,
      currentVersion: state.currentVersion,
      latestVersion: state.latestVersion,
      checkedAt: state.checkedAt,
      manifestUrl: state.manifestUrl,
      manifest: state.manifest,
      changelog: state.changelog,
      downloadUrl: state.downloadUrl,
      critical: Boolean(state.critical),
      minimumSupported: state.minimumSupported !== false,
      error: state.error,
      installReadyForRestart: state.installReadyForRestart === true
    }));
  }

  function updateChangelogText(updateState = settingsState.update) {
    const lines = Array.isArray(updateState?.changelog) ? updateState.changelog : [];
    return lines.filter(Boolean).join("\n");
  }

  function updateSystemMessageId(version = "") {
    return `app-update:${String(version || "latest").trim() || "latest"}`;
  }

  function publishUpdateSystemMessage(updateState = settingsState.update) {
    if (updateState?.status !== UPDATE_STATUS.UPDATE_AVAILABLE || !updateState.latestVersion) return;
    const changelog = updateChangelogText(updateState);
    upsertSystemMessage({
      id: updateSystemMessageId(updateState.latestVersion),
      type: "app_update",
      title: updateState.critical ? "发现重要版本更新" : "发现新版本",
      body: [
        `当前版本 ${updateState.currentVersion || APP_VERSION}，最新版本 ${updateState.latestVersion}。`,
        updateState.critical ? "这是重要更新，请在方便时查看发布说明并手动下载安装。" : "可以稍后处理；研思录不会自动替换程序。",
        changelog
      ].filter(Boolean).join("\n\n"),
      action: "open-settings-update",
      actionLabel: "查看更新",
      createdAt: updateState.checkedAt || new Date().toISOString()
    }, { interrupt: false, preserveRead: true });
  }

  function updateCheckResultFromDesktopCheck(result = {}) {
    if (!result.supported) return null;
    const metadata = result.metadata || {};
    if (!result.available) {
      return {
        status: UPDATE_STATUS.UP_TO_DATE,
        currentVersion: metadata.currentVersion || settingsState.update?.currentVersion || APP_VERSION,
        latestVersion: metadata.version || settingsState.update?.currentVersion || APP_VERSION,
        checkedAt: new Date().toISOString()
      };
    }
    const body = metadata.body ? [metadata.body] : [];
    return {
      status: UPDATE_STATUS.UPDATE_AVAILABLE,
      currentVersion: metadata.currentVersion || settingsState.update?.currentVersion || APP_VERSION,
      latestVersion: metadata.version || result.update?.version || "",
      checkedAt: new Date().toISOString(),
      installable: result.installable === true,
      manifest: {
        version: metadata.version || result.update?.version || "",
        changelog: body,
        rawJson: metadata.rawJson || null
      },
      changelog: body
    };
  }

  async function refreshAppVersionInfo() {
    try {
      const info = await fetchAppVersion();
      settingsState.update = updateStateFromVersionInfo(settingsState.update, info || {});
      if (!settingsState.update.currentVersion) settingsState.update.currentVersion = APP_VERSION;
      persistUpdateLastResultToStorage();
      renderSettingsPanel();
      return info;
    } catch (error) {
      settingsState.update.currentVersion = settingsState.update.currentVersion || APP_VERSION;
      settingsState.update = updateStateFailed(settingsState.update, error);
      persistUpdateLastResultToStorage();
      renderSettingsPanel();
      return null;
    }
  }

  async function runAppUpdateCheck(options = {}) {
    if (settingsState.update.autoCheckEnabled === false && options.manual !== true) {
      settingsState.update = updateStateAutoCheckEnabled(settingsState.update, false);
      renderSettingsPanel();
      return settingsState.update;
    }
    if (options.manual !== true && !shouldAutoCheckForUpdates(settingsState.update)) {
      return settingsState.update;
    }
    settingsState.update = updateStateChecking(settingsState.update, { manual: options.manual === true });
    renderSettingsPanel();
    const requestToken = settingsState.update.requestToken;
    try {
      const desktopResult = await checkDesktopUpdate();
      const result = updateCheckResultFromDesktopCheck(desktopResult) || await checkAppUpdate({
        manifestUrl: settingsState.update.manifestUrl || undefined
      });
      if (requestToken !== settingsState.update.requestToken) return settingsState.update;
      settingsState.update = updateStateFromCheckResult(settingsState.update, result || {}, { manual: options.manual === true });
      persistUpdateLastResultToStorage();
      if (settingsState.update.status === UPDATE_STATUS.UPDATE_AVAILABLE) {
        publishUpdateSystemMessage(settingsState.update);
        setStatus(settingsState.update.critical ? "发现重要版本更新，请在设置里查看。" : "发现新版本，可在设置里查看。", settingsState.update.critical ? "bad" : "warn");
      } else if (options.manual === true && settingsState.update.status === UPDATE_STATUS.UP_TO_DATE) {
        setStatus("当前已经是最新版本。", "ok");
      } else if (options.manual === true && settingsState.update.status === UPDATE_STATUS.DISABLED) {
        setStatus("还没有配置更新清单 URL，已跳过检查。", "warn");
      }
      renderSettingsPanel();
      renderSystemMessages();
      return settingsState.update;
    } catch (error) {
      if (requestToken !== settingsState.update.requestToken) return settingsState.update;
      settingsState.update = updateStateFailed(settingsState.update, error);
      persistUpdateLastResultToStorage();
      if (options.manual === true) setStatus(`检查更新失败：${String(error?.message || error)}`, "bad");
      renderSettingsPanel();
      return settingsState.update;
    }
  }

  async function openUpdateDownloadUrl() {
    const url = String(settingsState.update.downloadUrl || settingsState.update.manifest?.downloadUrl || "").trim();
    if (!url) {
      setStatus("更新清单里没有下载链接。", "warn");
      return false;
    }
    const opened = await desktopCommands.openExternalUrl(url);
    if (!opened?.ok && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setStatus("已打开更新下载页；安装前请先保存当前工作。", "ok");
    return true;
  }

  function confirmUpdateInstall() {
    const latest = String(settingsState.update?.latestVersion || settingsState.update?.manifest?.version || "").trim();
    const message = [
      latest ? `将下载并安装研思录 ${latest}。` : "将下载并安装研思录更新。",
      "下载包会由 Tauri updater 使用签名校验；安装完成前不会改写你的笔记库。",
      "安装完成后需要重启应用。请先保存当前正在编辑的笔记。是否继续？"
    ].join("\n\n");
    if (typeof window === "undefined" || typeof window.confirm !== "function") return true;
    return window.confirm(message);
  }

  async function installUpdateFromDesktopUpdater() {
    if (!isDesktopUpdaterAvailable()) {
      setStatus("当前环境不支持应用内安装；可以打开下载页手动安装。", "warn");
      return false;
    }
    if (settingsState.update.installable !== true) {
      setStatus("当前更新接口只能检测更新，请打开下载页手动安装。", "warn");
      return false;
    }
    if (settingsState.update.status !== UPDATE_STATUS.UPDATE_AVAILABLE && settingsState.update.status !== UPDATE_STATUS.FAILED) {
      setStatus("请先检查到可用更新，再下载安装。", "warn");
      return false;
    }
    if (!confirmUpdateInstall()) return false;
    settingsState.update = updateStateDownloading(settingsState.update, { phase: "downloading", percent: 0 });
    renderSettingsPanel();

    try {
      const result = await downloadAndInstallDesktopUpdate({
        onProgress(progress) {
          settingsState.update = updateStateDownloading(settingsState.update, progress);
          renderSettingsPanel();
        }
      });
      if (result.status === "up-to-date") {
        settingsState.update = {
          ...settingsState.update,
          status: UPDATE_STATUS.UP_TO_DATE,
          installPhase: "",
          installProgress: null,
          installReadyForRestart: false,
          error: ""
        };
        persistUpdateLastResultToStorage();
        renderSettingsPanel();
        setStatus("桌面更新源显示当前已是最新版本。", "ok");
        return true;
      }
      settingsState.update = updateStateDownloaded(settingsState.update, {
        progress: result.progress,
        message: "更新已安装，重启后生效。"
      });
      persistUpdateLastResultToStorage();
      renderSettingsPanel();
      setStatus("更新已安装；请在保存工作后重启完成更新。", "ok");
      return true;
    } catch (error) {
      settingsState.update = updateStateFailed(settingsState.update, error);
      persistUpdateLastResultToStorage();
      renderSettingsPanel();
      setStatus(`应用内安装失败：${String(error?.message || error)}`, "bad");
      return false;
    }
  }

  async function relaunchAfterInstalledUpdate() {
    if (!settingsState.update?.installReadyForRestart) {
      setStatus("还没有完成可重启的更新安装。", "warn");
      return false;
    }
    const dirtyCount = typeof getDirtyTabCount === "function" ? Number(getDirtyTabCount() || 0) : 0;
    const message = dirtyCount
      ? `还有 ${dirtyCount} 个打开的笔记带着未同步修改。请先保存；仍要现在重启吗？`
      : "将重启研思录以完成更新。是否现在重启？";
    if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(message)) return false;
    try {
      await relaunchDesktopApp();
      return true;
    } catch (error) {
      setStatus(`重启应用失败：${String(error?.message || error)}`, "bad");
      return false;
    }
  }

  return {
    loadUpdateSettingsFromStorage,
    persistUpdateSettingsToStorage,
    persistUpdateLastResultToStorage,
    updateChangelogText,
    updateSystemMessageId,
    publishUpdateSystemMessage,
    refreshAppVersionInfo,
    runAppUpdateCheck,
    openUpdateDownloadUrl,
    confirmUpdateInstall,
    installUpdateFromDesktopUpdater,
    relaunchAfterInstalledUpdate
  };
}

export function formatUpdateDateTime(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  try {
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } catch {
    return raw;
  }
}

export function renderUpdateSettingsCard({ $, escapeHtml, settingsState, appVersion = "" } = {}) {
  const update = settingsState.update || createUpdateState();
  const statusBadge = $("settingsUpdateStatusBadge");
  const currentVersion = $("settingsUpdateCurrentVersion");
  const latestVersion = $("settingsUpdateLatestVersion");
  const checkedAt = $("settingsUpdateCheckedAt");
  const manifestUrl = $("settingsUpdateManifestUrl");
  const errorEl = $("settingsUpdateError");
  const criticalEl = $("settingsUpdateCriticalNotice");
  const changelogEl = $("settingsUpdateChangelog");
  const checkButton = $("settingsCheckUpdate");
  const downloadButton = $("settingsOpenUpdateDownload");
  const installButton = $("settingsInstallUpdate");
  const relaunchButton = $("settingsRelaunchUpdate");
  const downloadHint = $("settingsUpdateDownloadHint");
  const installProgress = $("settingsUpdateInstallProgress");
  const remindLaterButton = $("settingsRemindUpdateLater");
  const ignoreButton = $("settingsIgnoreUpdateVersion");
  const autoEnabled = $("settingsAutoUpdateEnabled");
  const tone = updateStatusTone(update);
  const latestLabel = update.latestVersion || update.manifest?.version || "";
  const hasDownload = Boolean(update.downloadUrl || update.manifest?.downloadUrl);
  const hasUpdate = update.status === UPDATE_STATUS.UPDATE_AVAILABLE;
  const installing = update.status === UPDATE_STATUS.DOWNLOADING;
  const installed = update.status === UPDATE_STATUS.DOWNLOADED || update.installReadyForRestart === true;
  const desktopUpdaterAvailable = isDesktopUpdaterAvailable();
  const canInstallInApp = desktopUpdaterAvailable && update.installable === true;

  if (statusBadge) {
    statusBadge.textContent = updateStatusLabel(update.status);
    statusBadge.classList.toggle("ok", tone === "ok");
    statusBadge.classList.toggle("warn", tone === "warn");
    statusBadge.classList.toggle("bad", tone === "bad");
    statusBadge.classList.toggle("muted", tone === "muted");
  }
  if (currentVersion) currentVersion.textContent = `当前版本：${update.currentVersion || appVersion}`;
  if (latestVersion) latestVersion.textContent = `最新版本：${latestLabel || "--"}`;
  if (checkedAt) {
    checkedAt.textContent = update.checkedAt
      ? `上次检查：${formatUpdateDateTime(update.checkedAt)}`
      : "尚未检查。";
  }
  if (manifestUrl) {
    manifestUrl.textContent = update.manifestUrl ? `更新清单：${update.manifestUrl}` : "更新清单：未配置";
  }
  if (errorEl) {
    errorEl.textContent = update.error ? `检查失败：${update.error}` : "";
    errorEl.classList.toggle("hidden", !update.error);
  }
  if (criticalEl) {
    const text = update.critical && hasUpdate
      ? "重要更新：请查看更新说明并在保存当前工作后手动下载安装。"
      : update.minimumSupported === false
        ? "当前版本低于最低支持版本，请尽快升级。"
        : "";
    criticalEl.textContent = text;
    criticalEl.classList.toggle("hidden", !text);
  }
  if (changelogEl) {
    const changelog = Array.isArray(update.changelog) ? update.changelog : [];
    changelogEl.innerHTML = changelog.length
      ? changelog.map((item, index) => `
        <div class="settings-help-topic">
          <strong>${index === 0 ? "更新说明" : `变更 ${index + 1}`}</strong>
          <span>${escapeHtml(item)}</span>
        </div>
      `).join("")
      : `
        <div class="settings-help-topic">
          <strong>更新说明</strong>
          <span>检查更新后显示。</span>
        </div>
      `;
  }
  if (checkButton) {
    checkButton.disabled = update.status === UPDATE_STATUS.CHECKING;
    checkButton.textContent = update.status === UPDATE_STATUS.CHECKING ? "检查中..." : "检查更新";
  }
  if (downloadButton) downloadButton.disabled = !hasUpdate || !hasDownload;
  if (installButton) {
    installButton.disabled = installing || installed || (!hasUpdate && update.status !== UPDATE_STATUS.FAILED) || !canInstallInApp;
    installButton.textContent = installing
      ? "安装中..."
      : installed
        ? "已安装"
        : canInstallInApp
          ? "一键下载并安装"
          : "桌面版可用";
  }
  if (relaunchButton) relaunchButton.disabled = !installed || !desktopUpdaterAvailable;
  if (downloadHint) {
    downloadHint.textContent = installed
      ? "更新已安装，重启应用后生效。"
      : installing
        ? "正在下载并安装更新，请不要关闭应用。"
        : hasUpdate
          ? canInstallInApp
            ? "桌面版可一键下载、签名校验并安装；也可以打开下载页手动安装。"
            : (hasDownload ? "当前环境不支持应用内安装，可打开下载页手动安装。" : "检测到新版本，但 manifest 没有提供下载链接。")
          : "有新版本时会显示下载入口。";
  }
  if (installProgress) {
    const progress = update.installProgress || {};
    const percent = Math.round(Number(progress.percent || 0) || 0);
    const phase = update.installPhase === "installing"
      ? "正在安装"
      : update.installPhase === "installed"
        ? "已安装，等待重启"
        : "正在下载";
    installProgress.textContent = installing || installed
      ? `${phase}${percent ? `：${percent}%` : ""}`
      : "";
    installProgress.classList.toggle("hidden", !(installing || installed));
  }
  if (remindLaterButton) remindLaterButton.disabled = update.status === UPDATE_STATUS.CHECKING;
  if (ignoreButton) ignoreButton.disabled = !hasUpdate || !latestLabel;
  if (autoEnabled) autoEnabled.checked = update.autoCheckEnabled !== false;
}
