import { checkDesktopUpdate, normalizeDesktopDownloadEvent } from "./desktop-update-adapter.js";

// Keep the native update and its downloaded-byte resource together until approval.
// Tauri 2.10.1 install() consumes the bytes; download() alone never quits Windows.
export function createDesktopUpdateSession({ check = checkDesktopUpdate } = {}) {
  let pending = null;
  let installed = null;
  let generation = 0;
  let installing = false;
  const owner = () => globalThis.window?.__TAURI__;
  const close = async update => { if (typeof update?.close === "function") await update.close(); };

  function has(version) {
    const target = String(version || "");
    return Boolean((pending?.ready && pending.owner === owner() && pending.version === target)
      || (installed?.owner === owner() && installed?.version === target));
  }

  async function discard() {
    if (installing) throw new Error("更新正在安装，请稍候。");
    generation++;
    const previous = pending;
    pending = null;
    installed = null;
    await close(previous?.update);
  }

  async function download({ version, onProgress, timeout } = {}) {
    if (installing) throw new Error("更新正在安装，请稍候。");
    if (has(version)) return { status: "downloaded", version: String(version), progress: pending?.progress || { phase: "installed", percent: 100 } };
    await discard();
    const ticket = generation, nativeOwner = owner();
    const checked = await check();
    const update = checked.update;
    let retained = false;
    try {
      if (!checked.supported) throw new Error("当前环境不支持桌面更新。");
      if (!update) return { status: "up-to-date" };
      if (typeof update.download !== "function" || typeof update.install !== "function") throw new Error("当前更新接口不支持先下载后安装，请打开下载页。");
      if (String(update.version || "") !== String(version || "")) throw new Error("可用版本已变化，请重新检查更新。");
      let progress = {};
      await update.download(event => {
        if (ticket !== generation || nativeOwner !== owner()) return;
        progress = normalizeDesktopDownloadEvent(event, progress);
        if (typeof onProgress === "function") onProgress(progress);
      }, { timeout: Number(timeout || 10 * 60 * 1000) });
      if (ticket !== generation || nativeOwner !== owner()) throw new Error("更新下载已失效，请重新检查。");
      pending = { update, owner: nativeOwner, version: String(version), ready: true,
        progress: { ...progress, phase: "downloaded", percent: 100 } };
      retained = true;
      return { status: "downloaded", version: pending.version, progress: pending.progress };
    } finally {
      if (!retained) await close(update);
    }
  }

  async function install(version) {
    if (installing) throw new Error("更新正在安装，请稍候。");
    if (!has(version)) throw new Error("更新文件已失效，请重新下载后安装。");
    if (installed?.version === String(version) && installed.owner === owner()) return { status: "installed", version: installed.version };
    const selected = pending;
    installing = true;
    try {
      await selected.update.install();
      pending = null;
      installed = { version: selected.version, owner: selected.owner };
      await close(selected.update);
      return { status: "installed", version: selected.version };
    } finally {
      installing = false;
    }
  }

  return { download, install, has, discard };
}
