export function detectDownloadPlatform(navigator = {}) {
  const userAgent = String(navigator.userAgent || "");
  if (/Android|iPhone|iPad|iPod/i.test(userAgent)
    || (/Mac/i.test(navigator.platform || "") && navigator.maxTouchPoints > 1)) return "mobile";
  const platform = String(navigator.userAgentData?.platform || navigator.platform || userAgent);
  if (/Windows|Win32|Win64/i.test(platform)) return "windows";
  if (/macOS|Macintosh|MacIntel/i.test(platform)) return "macos";
  if (/Linux/i.test(platform)) return "linux";
  return "unknown";
}

export function platformForFile(item) {
  const file = String(item?.file || "").toLowerCase();
  const architecture = /(?:^|[_-])universal(?:[_.-]|$)/.test(file) ? "universal"
    : /(?:^|[_-])(?:aarch64|arm64)(?:[_.-]|$)/.test(file) ? "arm64"
      : /(?:^|[_-])(?:x64|x86_64|amd64)(?:[_.-]|$)/.test(file) ? "x64" : "unknown";
  if (file.endsWith(".dmg")) {
    const suffix = { universal: "通用版", arm64: "M 系列", x64: "Intel", unknown: "芯片未注明" }[architecture];
    return { key: "macos", architecture, format: "dmg", label: `下载 macOS 版（${suffix}）` };
  }
  const suffix = { x64: "x64", arm64: "ARM64", unknown: "架构未注明" }[architecture] || architecture;
  if (file.endsWith(".exe") || file.endsWith(".msi")) {
    return { key: "windows", architecture, format: file.endsWith(".exe") ? "exe" : "msi", label: `下载 Windows 版（${suffix}）` };
  }
  if (file.endsWith(".appimage") || file.endsWith(".deb")) {
    const format = file.endsWith(".deb") ? "deb" : "AppImage";
    return { key: "linux", architecture, format, label: `下载 Linux ${format}（${suffix}）` };
  }
  return null;
}

export function downloadChoices(items = []) {
  const choices = new Map();
  for (const item of items) {
    const platform = platformForFile(item);
    if (!platform || !item?.downloadUrl) continue;
    const id = `${platform.key}-${platform.architecture}-${platform.key === "linux" ? platform.format : "installer"}`;
    const previous = choices.get(id);
    if (!previous || (platform.format === "exe" && previous.format === "msi")) {
      choices.set(id, { ...platform, item });
    }
  }
  const universalMac = choices.has("macos-universal-installer");
  return [...choices.values()].filter(choice => !universalMac || choice.key !== "macos" || choice.architecture === "universal");
}

export function recommendedDownload(choices, platform) {
  if (platform === "macos") return choices.find(choice => choice.key === "macos" && choice.architecture === "universal");
  if (platform === "windows") return choices.find(choice => choice.key === "windows" && choice.architecture === "x64");
  if (platform === "linux") return choices.find(choice => choice.key === "linux" && choice.architecture === "x64" && choice.format === "AppImage");
  return undefined;
}
