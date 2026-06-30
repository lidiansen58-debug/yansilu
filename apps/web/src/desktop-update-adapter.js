function tauriGlobal() {
  return typeof window !== "undefined" ? window.__TAURI__ : null;
}

function cleanText(value = "") {
  return String(value ?? "").trim();
}

function hasUpdaterApi(tauri = tauriGlobal()) {
  return typeof tauri?.updater?.check === "function" || typeof tauri?.core?.invoke === "function";
}

function hasRelaunchApi(tauri = tauriGlobal()) {
  return (
    typeof tauri?.process?.relaunch === "function" ||
    typeof tauri?.process?.restart === "function" ||
    typeof tauri?.core?.invoke === "function"
  );
}

export function isDesktopUpdaterAvailable() {
  const tauri = tauriGlobal();
  return Boolean(hasUpdaterApi(tauri) && hasRelaunchApi(tauri));
}

export function normalizeDesktopUpdateMetadata(update = null) {
  if (!update) return null;
  return {
    currentVersion: cleanText(update.currentVersion),
    version: cleanText(update.version),
    date: cleanText(update.date),
    body: cleanText(update.body),
    rawJson: update.rawJson && typeof update.rawJson === "object" ? update.rawJson : null
  };
}

export function normalizeDesktopDownloadEvent(event = {}, previous = {}) {
  const name = cleanText(event.event || event.type || event.status).toLowerCase();
  const data = event.data && typeof event.data === "object" ? event.data : event;
  const previousDownloaded = Number(previous.downloadedBytes || 0) || 0;
  const previousTotal = Number(previous.totalBytes || 0) || 0;
  let downloadedBytes = previousDownloaded;
  let totalBytes = Number(data.contentLength ?? data.totalBytes ?? data.total ?? previousTotal) || previousTotal;
  let phase = cleanText(previous.phase) || "downloading";

  if (name === "started" || name === "start") {
    phase = "downloading";
    downloadedBytes = 0;
  } else if (name === "progress") {
    phase = "downloading";
    downloadedBytes += Number(data.chunkLength ?? data.deltaBytes ?? data.downloadedBytes ?? 0) || 0;
  } else if (name === "finished" || name === "finish") {
    phase = "installing";
    if (totalBytes > 0) downloadedBytes = totalBytes;
  }

  const percent = totalBytes > 0 ? Math.max(0, Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))) : 0;
  return {
    phase,
    downloadedBytes,
    totalBytes,
    percent
  };
}

export async function checkDesktopUpdate(options = {}) {
  const tauri = tauriGlobal();
  if (!hasUpdaterApi(tauri)) {
    return { supported: false, available: false, update: null };
  }
  let update = null;
  if (typeof tauri?.updater?.check === "function") {
    update = await tauri.updater.check({ timeout: Number(options.timeout || 30000) });
  } else {
    try {
      update = await tauri.core.invoke("plugin:updater|check", { timeout: Number(options.timeout || 30000) });
    } catch (error) {
      return { supported: false, available: false, update: null, error };
    }
  }
  if (!update || update.available === false) {
    return { supported: true, available: false, update: null, metadata: null };
  }
  return {
    supported: true,
    available: Boolean(update),
    installable: typeof update?.downloadAndInstall === "function",
    update,
    metadata: normalizeDesktopUpdateMetadata(update)
  };
}

export async function downloadAndInstallDesktopUpdate(options = {}) {
  const checked = await checkDesktopUpdate({ timeout: options.checkTimeout });
  if (!checked.supported) {
    const error = new Error("当前环境不支持桌面自动安装。");
    error.code = "DESKTOP_UPDATER_UNAVAILABLE";
    throw error;
  }
  if (!checked.update) {
    return { status: "up-to-date", supported: true, update: null };
  }
  if (typeof checked.update.downloadAndInstall !== "function") {
    const error = new Error("当前桌面更新接口只能检测更新，不能直接安装。");
    error.code = "DESKTOP_UPDATER_INSTALL_UNAVAILABLE";
    throw error;
  }

  let progress = {};
  const onEvent = (event) => {
    progress = normalizeDesktopDownloadEvent(event, progress);
    if (typeof options.onProgress === "function") options.onProgress(progress, event);
  };

  try {
    await checked.update.downloadAndInstall(onEvent, {
      timeout: Number(options.downloadTimeout || 10 * 60 * 1000)
    });
  } finally {
    if (typeof checked.update.close === "function") {
      try {
        await checked.update.close();
      } catch {}
    }
  }

  return {
    status: "installed",
    supported: true,
    update: null,
    metadata: checked.metadata,
    progress: {
      ...progress,
      phase: "installed",
      percent: progress.totalBytes > 0 ? 100 : progress.percent || 0
    }
  };
}

export async function relaunchDesktopApp() {
  const tauri = tauriGlobal();
  if (typeof tauri?.process?.relaunch === "function") {
    await tauri.process.relaunch();
    return { ok: true, source: "tauri-process" };
  }
  if (typeof tauri?.process?.restart === "function") {
    await tauri.process.restart();
    return { ok: true, source: "tauri-process" };
  }
  if (typeof tauri?.core?.invoke === "function") {
    await tauri.core.invoke("plugin:process|restart");
    return { ok: true, source: "tauri-core" };
  }
  const error = new Error("当前环境不支持应用重启。");
  error.code = "DESKTOP_RELAUNCH_UNAVAILABLE";
  throw error;
}
