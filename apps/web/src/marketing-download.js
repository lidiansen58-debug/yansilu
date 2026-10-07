import { detectDownloadPlatform, downloadChoices, recommendedDownload } from "./marketing-download-model.js";
export { platformForFile } from "./marketing-download-model.js";

const DOWNLOAD_API_BASE = globalThis.window?.location?.origin || "";
const RELEASES_URL = "https://github.com/lidiansen58-debug/yansilu/releases";
const RELEASES_API_URL = "https://api.github.com/repos/lidiansen58-debug/yansilu/releases";

const COPY = {
  choosePlatform: "选择桌面系统："
};

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

async function readDownloadJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return { ok: response.ok, payload: response.ok ? await response.json() : null };
  } finally {
    clearTimeout(timeout);
  }
}

export function renderDownloadButtons(items, { fallback = false, platform = detectDownloadPlatform(globalThis.navigator) } = {}) {
  const container = document.querySelector("[data-download-buttons]");
  if (!container) return [];

  container.replaceChildren();
  const others = document.querySelector("[data-download-other-buttons]");
  const options = document.querySelector("[data-download-other-options]");
  others?.replaceChildren();
  if (options) { options.hidden = true; options.open = false; }
  const platforms = downloadChoices(items);
  const recommended = recommendedDownload(platforms, platform);
  let mainChoices = recommended ? [recommended] : platforms.filter(choice =>
    ["windows", "macos", "linux"].includes(platform) ? choice.key === platform : choice.key !== "linux");
  if (!mainChoices.length) mainChoices = platforms;

  for (const choice of platforms) {
    const secondary = Boolean(!mainChoices.includes(choice) && others && options);
    const link = document.createElement("a");
    link.className = secondary ? "btn btn-secondary" : "btn btn-primary";
    link.href = choice.item.downloadUrl;
    link.textContent = choice.label;
    (secondary ? others : container).appendChild(link);
    if (secondary) options.hidden = false;
  }

  if (fallback) {
    const link = document.createElement("a");
    link.className = "btn btn-secondary";
    link.href = RELEASES_URL;
    link.textContent = "前往官方下载页";
    container.appendChild(link);
  }
  return platforms;
}

async function fetchReleaseAssets(version = "") {
  const endpoint = version
    ? `${RELEASES_API_URL}/tags/v${encodeURIComponent(version)}`
    : `${RELEASES_API_URL}?per_page=1`;
  try {
    const response = await readDownloadJson(endpoint);
    if (!response.ok) return null;
    const payload = response.payload;
    const release = Array.isArray(payload) ? payload.find((item) => !item.draft) : payload;
    if (!release || release.draft) return null;
    return {
      version: String(release.tag_name || "").replace(/^v/, "") || version,
      items: Array.isArray(release.assets)
        ? release.assets.map((asset) => ({ file: asset.name, downloadUrl: asset.browser_download_url })) : []
    };
  } catch {
    return null;
  }
}

function showDownloads(status, items, version) {
  const platforms = renderDownloadButtons(items);
  if (!platforms.length) {
    status.textContent = "暂未获取到安装包，请前往官方下载页。";
    setText("[data-download-primary-note]", "GitHub Release 提供全部已发布版本。");
    renderDownloadButtons([], { fallback: true });
    return false;
  }
  const platform = detectDownloadPlatform(globalThis.navigator);
  const recommended = recommendedDownload(platforms, platform);
  status.textContent = recommended ? "推荐下载："
    : platform === "macos" && platforms.some(choice => choice.key === "macos") ? "请选择与你的 Mac 芯片对应的版本：" : COPY.choosePlatform;
  const compatibility = recommended?.architecture === "universal" ? " · Intel 和 M 系列均可使用" : "";
  setText("[data-download-primary-note]", `${version ? `当前版本 ${version}` : "来自已发布版本"}${compatibility}`);
  return true;
}

export async function initDownloadPage() {
  const status = document.querySelector("[data-download-status]");
  if (!status) return;

  try {
    const response = await readDownloadJson(`${DOWNLOAD_API_BASE}/api/download-manifest`);
    const payload = response.payload;
    if (!response.ok) {
      throw new Error(payload?.message || "Download manifest unavailable");
    }

    const item = payload?.item || {};
    const localItems = item.bundleReady && Array.isArray(item.items) ? item.items : [];
    const hasLocalInstaller = downloadChoices(localItems).length > 0;
    status.dataset.tone = "info";
    if (hasLocalInstaller) showDownloads(status, localItems, item.version);
    const release = await fetchReleaseAssets(item.version);
    if (hasLocalInstaller || downloadChoices(release?.items || []).length) {
      showDownloads(status, [...localItems, ...(release?.items || [])], item.version || release?.version);
    } else {
      const latest = item.version ? await fetchReleaseAssets() : release;
      showDownloads(status, latest?.items || [], latest?.version || "");
    }
  } catch {
    const release = await fetchReleaseAssets();
    status.dataset.tone = "error";
    showDownloads(status, release?.items || [], release?.version || "");
  }
}

if (globalThis.document) initDownloadPage();
