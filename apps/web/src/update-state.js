export const UPDATE_STATUS = Object.freeze({
  IDLE: "idle",
  CHECKING: "checking",
  UPDATE_AVAILABLE: "update-available",
  UP_TO_DATE: "up-to-date",
  DOWNLOADING: "downloading",
  DOWNLOADED: "downloaded",
  FAILED: "failed",
  DISABLED: "disabled"
});

export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const UPDATE_REMIND_LATER_MS = 24 * 60 * 60 * 1000;

function cleanText(value = "") {
  return String(value ?? "").trim();
}

function isoNow(now = () => new Date()) {
  return now().toISOString();
}

function normalizeTimestamp(value = "") {
  const raw = cleanText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function createUpdateState(overrides = {}) {
  return {
    status: UPDATE_STATUS.IDLE,
    currentVersion: "",
    latestVersion: "",
    checkedAt: "",
    manifestUrl: "",
    manifest: null,
    changelog: [],
    downloadUrl: "",
    critical: false,
    minimumSupported: true,
    error: "",
    installPhase: "",
    installProgress: null,
    installReadyForRestart: false,
    requestToken: 0,
    autoCheckEnabled: true,
    remindAfter: "",
    ignoredVersion: "",
    manualCheckCount: 0,
    ...overrides
  };
}

export function normalizeUpdateSettings(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return {
    autoCheckEnabled: source.autoCheckEnabled !== false,
    remindAfter: normalizeTimestamp(source.remindAfter),
    ignoredVersion: cleanText(source.ignoredVersion)
  };
}

export function shouldAutoCheckForUpdates(state = {}, options = {}) {
  const nowMs = Number(options.nowMs ?? Date.now());
  const intervalMs = Math.max(60 * 60 * 1000, Number(options.intervalMs || UPDATE_CHECK_INTERVAL_MS) || UPDATE_CHECK_INTERVAL_MS);
  if (state.autoCheckEnabled === false) return false;
  const remindAfter = Date.parse(state.remindAfter || "");
  if (Number.isFinite(remindAfter) && remindAfter > nowMs) return false;
  const checkedAt = Date.parse(state.checkedAt || "");
  if (!Number.isFinite(checkedAt)) return true;
  return nowMs - checkedAt >= intervalMs;
}

export function shouldShowUpdateAttention(state = {}, options = {}) {
  const update = { ...createUpdateState(), ...(state || {}) };
  const latestVersion = cleanText(update.latestVersion || update.manifest?.version);
  if (update.status !== UPDATE_STATUS.UPDATE_AVAILABLE || !latestVersion) return false;
  if (cleanText(update.ignoredVersion) === latestVersion) return false;
  const nowMs = Number(options.nowMs ?? Date.now());
  const remindAfter = Date.parse(update.remindAfter || "");
  if (Number.isFinite(remindAfter) && remindAfter > nowMs) return false;
  return true;
}

export function updateStateFromVersionInfo(state = {}, versionInfo = {}) {
  const next = { ...createUpdateState(), ...state };
  next.currentVersion = cleanText(versionInfo.version || versionInfo.currentVersion || next.currentVersion);
  next.manifestUrl = cleanText(versionInfo.manifestUrl || next.manifestUrl);
  if (next.installReadyForRestart && next.currentVersion && next.latestVersion && next.currentVersion === next.latestVersion) {
    next.status = UPDATE_STATUS.UP_TO_DATE;
    next.installPhase = "";
    next.installProgress = null;
    next.installReadyForRestart = false;
    next.error = "";
  }
  if (versionInfo.status === UPDATE_STATUS.DISABLED || versionInfo.updateStatus === UPDATE_STATUS.DISABLED) {
    next.status = UPDATE_STATUS.DISABLED;
    next.error = cleanText(versionInfo.message || versionInfo.error || "");
  }
  return next;
}

export function updateStateChecking(state = {}, options = {}) {
  return {
    ...createUpdateState(),
    ...state,
    status: UPDATE_STATUS.CHECKING,
    error: "",
    requestToken: Number(state.requestToken || 0) + 1,
    manualCheckCount: options.manual === true ? Number(state.manualCheckCount || 0) + 1 : Number(state.manualCheckCount || 0)
  };
}

export function updateStateFromCheckResult(state = {}, result = {}, options = {}) {
  const manifest = result?.manifest || null;
  const latestVersion = cleanText(result?.latestVersion || manifest?.version);
  const ignoredVersion = cleanText(state.ignoredVersion);
  const ignored = !options.manual && ignoredVersion && latestVersion && ignoredVersion === latestVersion && result?.status === UPDATE_STATUS.UPDATE_AVAILABLE;
  return {
    ...createUpdateState(),
    ...state,
    status: ignored ? UPDATE_STATUS.IDLE : cleanText(result?.status) || UPDATE_STATUS.FAILED,
    currentVersion: cleanText(result?.currentVersion || state.currentVersion),
    latestVersion,
    checkedAt: normalizeTimestamp(result?.checkedAt) || isoNow(options.now),
    manifestUrl: cleanText(result?.manifestUrl || state.manifestUrl),
    manifest,
    changelog: Array.isArray(manifest?.changelog) ? manifest.changelog : [],
    downloadUrl: cleanText(manifest?.downloadUrl || result?.downloadUrl),
    critical: Boolean(result?.critical || manifest?.critical),
    minimumSupported: result?.minimumSupported !== false,
    error: cleanText(result?.error?.message || result?.error || "")
  };
}

export function updateStateFailed(state = {}, error = "", options = {}) {
  return {
    ...createUpdateState(),
    ...state,
    status: UPDATE_STATUS.FAILED,
    checkedAt: isoNow(options.now),
    error: cleanText(error?.message || error),
    installPhase: "",
    installProgress: null,
    installReadyForRestart: false
  };
}

export function updateStateDownloading(state = {}, progress = {}) {
  const normalizedProgress = progress && typeof progress === "object" ? progress : {};
  return {
    ...createUpdateState(),
    ...state,
    status: UPDATE_STATUS.DOWNLOADING,
    error: "",
    installPhase: cleanText(normalizedProgress.phase) || "downloading",
    installProgress: {
      downloadedBytes: Number(normalizedProgress.downloadedBytes || 0) || 0,
      totalBytes: Number(normalizedProgress.totalBytes || 0) || 0,
      percent: Math.max(0, Math.min(100, Number(normalizedProgress.percent || 0) || 0))
    },
    installReadyForRestart: false
  };
}

export function updateStateDownloaded(state = {}, options = {}) {
  return {
    ...createUpdateState(),
    ...state,
    status: UPDATE_STATUS.DOWNLOADED,
    error: cleanText(options.message || ""),
    installPhase: "installed",
    installProgress: {
      ...(state.installProgress || {}),
      ...(options.progress || {}),
      percent: 100
    },
    installReadyForRestart: true
  };
}

export function updateStateRemindLater(state = {}, options = {}) {
  const nowMs = Number(options.nowMs ?? Date.now());
  const delayMs = Math.max(60 * 60 * 1000, Number(options.delayMs || UPDATE_REMIND_LATER_MS) || UPDATE_REMIND_LATER_MS);
  return {
    ...createUpdateState(),
    ...state,
    remindAfter: new Date(nowMs + delayMs).toISOString()
  };
}

export function updateStateIgnoreLatest(state = {}) {
  return {
    ...createUpdateState(),
    ...state,
    ignoredVersion: cleanText(state.latestVersion || state.manifest?.version || state.ignoredVersion)
  };
}

export function updateStateAutoCheckEnabled(state = {}, enabled = true) {
  return {
    ...createUpdateState(),
    ...state,
    autoCheckEnabled: enabled !== false,
    status: enabled === false ? UPDATE_STATUS.DISABLED : state.status === UPDATE_STATUS.DISABLED ? UPDATE_STATUS.IDLE : state.status,
    error: enabled === false ? "" : state.error
  };
}

export function updateStatusLabel(status = "") {
  const labels = {
    [UPDATE_STATUS.IDLE]: "等待检查",
    [UPDATE_STATUS.CHECKING]: "检查中",
    [UPDATE_STATUS.UPDATE_AVAILABLE]: "发现新版本",
    [UPDATE_STATUS.UP_TO_DATE]: "已是最新",
    [UPDATE_STATUS.DOWNLOADING]: "下载中",
    [UPDATE_STATUS.DOWNLOADED]: "已下载",
    [UPDATE_STATUS.FAILED]: "检查失败",
    [UPDATE_STATUS.DISABLED]: "未配置/已关闭"
  };
  return labels[cleanText(status)] || labels[UPDATE_STATUS.IDLE];
}

export function updateStatusTone(state = {}) {
  if (state.critical && state.status === UPDATE_STATUS.UPDATE_AVAILABLE) return "bad";
  if (state.status === UPDATE_STATUS.UPDATE_AVAILABLE) return "warn";
  if (state.status === UPDATE_STATUS.UP_TO_DATE) return "ok";
  if (state.status === UPDATE_STATUS.FAILED) return "bad";
  if (state.status === UPDATE_STATUS.DOWNLOADING) return "warn";
  if (state.status === UPDATE_STATUS.DOWNLOADED) return "ok";
  if (state.status === UPDATE_STATUS.DISABLED) return "muted";
  return "";
}
