function cleanText(value = "") {
  return String(value ?? "").trim();
}

function normalizeSlashPath(value = "") {
  return cleanText(value).replaceAll("\\", "/").replace(/^\/+/, "");
}

function encodedReleaseAssetName(filePath = "") {
  const normalized = normalizeSlashPath(filePath);
  const name = normalized.split("/").filter(Boolean).at(-1) || normalized;
  return encodeURIComponent(name);
}

export function githubReleaseDownloadUrl({ repository = "", tag = "", file = "", githubBaseUrl = "https://github.com" } = {}) {
  const repo = cleanText(repository).replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  const releaseTag = cleanText(tag).replace(/^refs\/tags\//, "");
  const assetName = encodedReleaseAssetName(file);
  const base = cleanText(githubBaseUrl).replace(/\/+$/, "") || "https://github.com";
  if (!repo) throw new Error("GitHub repository is required, for example owner/repo.");
  if (!releaseTag) throw new Error("Release tag is required.");
  if (!assetName) throw new Error("Release asset file is required.");
  return `${base}/${repo}/releases/download/${encodeURIComponent(releaseTag)}/${assetName}`;
}

function scoreBundleItem(item = {}) {
  const file = normalizeSlashPath(item.file).toLowerCase();
  if (!file) return -1;
  if (file.includes("/nsis/") && file.endsWith(".exe")) return 100;
  if (file.endsWith("-setup.exe") || file.endsWith("_setup.exe")) return 95;
  if (file.endsWith(".exe")) return 90;
  if (file.endsWith(".msi")) return 80;
  if (file.endsWith(".dmg")) return 70;
  if (file.endsWith(".appimage")) return 60;
  if (file.endsWith(".deb")) return 50;
  return 0;
}

export function selectPrimaryBundleItem(bundleManifest = {}, options = {}) {
  const items = Array.isArray(bundleManifest?.items) ? bundleManifest.items : [];
  const requestedFile = normalizeSlashPath(options.file || "");
  if (requestedFile) {
    const found = items.find((item) => normalizeSlashPath(item.file) === requestedFile);
    if (!found) throw new Error(`Requested bundle file not found in bundle manifest: ${requestedFile}`);
    return found;
  }
  const candidates = items
    .filter((item) => scoreBundleItem(item) > 0)
    .sort((a, b) => scoreBundleItem(b) - scoreBundleItem(a) || normalizeSlashPath(a.file).localeCompare(normalizeSlashPath(b.file), "en"));
  if (!candidates.length) {
    throw new Error("No installer-like bundle item was found in bundle manifest.");
  }
  return candidates[0];
}

export function inferReleaseChannel(version = "") {
  const value = cleanText(version).toLowerCase();
  if (value.includes("alpha")) return "alpha";
  if (value.includes("beta")) return "beta";
  if (value.includes("rc")) return "rc";
  return "stable";
}

export function buildUpdateManifestFromBundleManifest({
  bundleManifest = {},
  packageVersion = "",
  repository = "",
  tag = "",
  channel = "",
  changelog = [],
  minimumSupportedVersion = "",
  critical = false,
  releaseDate = "",
  file = "",
  githubBaseUrl = "https://github.com"
} = {}) {
  const version = cleanText(packageVersion || bundleManifest.version);
  if (!version) throw new Error("Package version is required.");
  const releaseTag = cleanText(tag || `v${version}`);
  const item = selectPrimaryBundleItem(bundleManifest, { file });
  const downloadUrl = githubReleaseDownloadUrl({
    repository,
    tag: releaseTag,
    file: item.file,
    githubBaseUrl
  });
  const normalizedChangelog = Array.isArray(changelog)
    ? changelog.map((entry) => cleanText(entry)).filter(Boolean)
    : cleanText(changelog)
      ? [cleanText(changelog)]
      : [];
  return {
    version,
    releaseDate: cleanText(releaseDate) || new Date().toISOString(),
    channel: cleanText(channel) || inferReleaseChannel(version),
    changelog: normalizedChangelog,
    downloadUrl,
    minimumSupportedVersion: cleanText(minimumSupportedVersion) || version,
    critical: Boolean(critical),
    checksum: item.sha256
      ? {
          algorithm: "sha256",
          value: cleanText(item.sha256)
        }
      : null
  };
}

export function parseGithubRepositoryFromRemote(remoteUrl = "") {
  const value = cleanText(remoteUrl);
  if (!value) return "";
  const httpsMatch = value.match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i);
  if (!httpsMatch) return "";
  return `${httpsMatch[1]}/${httpsMatch[2]}`;
}
