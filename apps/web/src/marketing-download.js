const DOWNLOAD_API_BASE = globalThis.window?.location?.origin || "";
const RELEASES_URL = "https://github.com/lidiansen58-debug/yansilu/releases";
const RELEASES_API_URL = "https://api.github.com/repos/lidiansen58-debug/yansilu/releases";

const COPY = {
  choosePlatform: "\u9009\u62e9\u4f60\u7684\u7cfb\u7edf\uff1a"
};

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

export function platformForFile(item) {
  const file = String(item?.file || "").toLowerCase();
  if (file.endsWith(".dmg")) return { key: "macos", label: "下载 macOS 版" };
  if (file.endsWith(".exe") || file.endsWith(".msi")) return { key: "windows", label: "下载 Windows 版" };
  return null;
}

export function renderDownloadButtons(items, { fallback = false } = {}) {
  const container = document.querySelector("[data-download-buttons]");
  if (!container) return [];

  container.replaceChildren();
  const platforms = new Map();
  for (const item of items) {
    const platform = platformForFile(item);
    if (platform && item?.downloadUrl && !platforms.has(platform.key)) {
      platforms.set(platform.key, { ...platform, item });
    }
  }

  for (const { label, item } of platforms.values()) {
    const link = document.createElement("a");
    link.className = "btn btn-primary";
    link.href = item.downloadUrl;
    link.textContent = label;
    container.appendChild(link);
  }

  if (fallback) {
    const link = document.createElement("a");
    link.className = "btn btn-secondary";
    link.href = RELEASES_URL;
    link.textContent = "前往官方下载页";
    container.appendChild(link);
  }
  return [...platforms.values()];
}

async function fetchReleaseAssets(version = "") {
  const endpoint = version
    ? `${RELEASES_API_URL}/tags/v${encodeURIComponent(version)}`
    : `${RELEASES_API_URL}?per_page=1`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) return [];
    const payload = await response.json();
    const release = Array.isArray(payload) ? payload.find((item) => !item.draft) : payload;
    return Array.isArray(release?.assets)
      ? release.assets.map((asset) => ({ file: asset.name, downloadUrl: asset.browser_download_url }))
      : [];
  } catch {
    return [];
  }
}

function showDownloads(status, items, version) {
  const platforms = renderDownloadButtons(items);
  if (!platforms.length) {
    status.textContent = "当前没有可直接安装的文件，请前往官方下载页选择 Windows 或 macOS 版本。";
    setText("[data-download-primary-note]", "GitHub Release 提供全部已发布版本。");
    renderDownloadButtons([], { fallback: true });
    return false;
  }
  status.textContent = COPY.choosePlatform;
  setText("[data-download-primary-note]", version ? `当前版本 ${version}` : "来自最新发布版本");
  return true;
}

export async function initDownloadPage() {
  const status = document.querySelector("[data-download-status]");
  if (!status) return;

  try {
    const response = await fetch(`${DOWNLOAD_API_BASE}/api/download-manifest`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || COPY.readFailed);
    }

    const item = payload?.item || {};
    setText("[data-download-version]", item.version || "0.1.0");

    if (!item.bundleReady) {
      const releaseAssets = await fetchReleaseAssets(item.version);
      status.dataset.tone = "info";
      showDownloads(status, releaseAssets, item.version);
      return;
    }

    status.dataset.tone = "info";
    const releaseAssets = await fetchReleaseAssets(item.version);
    showDownloads(status, [...(Array.isArray(item.items) ? item.items : []), ...releaseAssets], item.version);
  } catch {
    const releaseAssets = await fetchReleaseAssets();
    status.dataset.tone = "error";
    showDownloads(status, releaseAssets, "");
  }
}

if (globalThis.document) initDownloadPage();
