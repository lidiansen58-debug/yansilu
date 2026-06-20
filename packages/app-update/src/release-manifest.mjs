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

export function githubReleasePageUrl({ repository = "", tag = "", githubBaseUrl = "https://github.com" } = {}) {
  const repo = cleanText(repository).replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  const releaseTag = cleanText(tag).replace(/^refs\/tags\//, "");
  const base = cleanText(githubBaseUrl).replace(/\/+$/, "") || "https://github.com";
  if (!repo) throw new Error("GitHub repository is required, for example owner/repo.");
  if (!releaseTag) throw new Error("Release tag is required.");
  return `${base}/${repo}/releases/tag/${encodeURIComponent(releaseTag)}`;
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

function inferArchFromFile(file = "") {
  const value = normalizeSlashPath(file).toLowerCase();
  if (/(aarch64|arm64)/.test(value)) return "aarch64";
  if (/(i686|x86|ia32)/.test(value) && !/(x86_64|x64)/.test(value)) return "i686";
  if (/armv7/.test(value)) return "armv7";
  return "x86_64";
}

function inferTauriOsFromFile(file = "") {
  const value = normalizeSlashPath(file).toLowerCase();
  if (value.includes("/nsis/") || value.includes("/msi/") || value.endsWith(".exe") || value.endsWith(".msi")) return "windows";
  if (value.includes("/macos/") || value.includes("/dmg/") || value.endsWith(".app.tar.gz") || value.endsWith(".dmg")) return "darwin";
  if (value.includes("/appimage/") || value.includes("/deb/") || value.endsWith(".appimage") || value.endsWith(".deb")) return "linux";
  return "";
}

function scoreTauriUpdaterItem(item = {}) {
  const file = normalizeSlashPath(item.file).toLowerCase();
  if (!file || file.endsWith(".sig")) return -1;
  if (file.includes("/nsis/") && file.endsWith(".exe")) return 100;
  if (file.endsWith("-setup.exe") || file.endsWith("_setup.exe")) return 95;
  if (file.endsWith(".msi")) return 80;
  if (file.endsWith(".app.tar.gz")) return 75;
  if (file.endsWith(".appimage")) return 70;
  if (file.endsWith(".deb")) return 50;
  return -1;
}

export function tauriPlatformKeyForBundleItem(item = {}) {
  const file = normalizeSlashPath(item.file);
  const os = inferTauriOsFromFile(file);
  if (!os) return "";
  return `${os}-${inferArchFromFile(file)}`;
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
  const downloadUrl = githubReleasePageUrl({ repository, tag: releaseTag, githubBaseUrl });
  const items = Array.isArray(bundleManifest?.items) ? bundleManifest.items : [];
  const assets = items
    .filter((candidate) => scoreBundleItem(candidate) > 0)
    .map((candidate) => ({
      file: normalizeSlashPath(candidate.file),
      platform: tauriPlatformKeyForBundleItem(candidate) || "",
      bytes: Number(candidate.bytes || 0) || 0,
      url: githubReleaseDownloadUrl({
        repository,
        tag: releaseTag,
        file: candidate.file,
        githubBaseUrl
      }),
      checksum: candidate.sha256
        ? {
            algorithm: "sha256",
            value: cleanText(candidate.sha256)
          }
        : null
    }))
    .sort((a, b) => a.file.localeCompare(b.file, "en"));
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
    assets,
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

export function buildTauriStaticUpdateManifestFromBundleManifest({
  bundleManifest = {},
  packageVersion = "",
  repository = "",
  tag = "",
  notes = [],
  releaseDate = "",
  githubBaseUrl = "https://github.com",
  signatureByFile = {}
} = {}) {
  const version = cleanText(packageVersion || bundleManifest.version);
  if (!version) throw new Error("Package version is required.");
  const releaseTag = cleanText(tag || `v${version}`);
  const items = Array.isArray(bundleManifest?.items) ? bundleManifest.items : [];
  const signatureMap = signatureByFile && typeof signatureByFile === "object" ? signatureByFile : {};
  const selectedByPlatform = new Map();

  for (const item of items) {
    if (scoreTauriUpdaterItem(item) < 0) continue;
    const file = normalizeSlashPath(item.file);
    const signatureFile = `${file}.sig`;
    const signature = cleanText(signatureMap[file] || signatureMap[signatureFile] || item.signature);
    if (!signature) continue;
    const platformKey = tauriPlatformKeyForBundleItem(item);
    if (!platformKey) continue;
    const existing = selectedByPlatform.get(platformKey);
    if (!existing || scoreTauriUpdaterItem(item) > scoreTauriUpdaterItem(existing.item)) {
      selectedByPlatform.set(platformKey, { item, signature });
    }
  }

  if (!selectedByPlatform.size) {
    throw new Error("No signed Tauri updater artifact was found in bundle manifest.");
  }

  const platforms = {};
  for (const [platformKey, entry] of [...selectedByPlatform.entries()].sort(([a], [b]) => a.localeCompare(b, "en"))) {
    platforms[platformKey] = {
      signature: entry.signature,
      url: githubReleaseDownloadUrl({
        repository,
        tag: releaseTag,
        file: entry.item.file,
        githubBaseUrl
      })
    };
  }

  const notesText = Array.isArray(notes)
    ? notes.map((entry) => cleanText(entry)).filter(Boolean).join("\n")
    : cleanText(notes);

  return {
    version,
    notes: notesText,
    pub_date: cleanText(releaseDate) || new Date().toISOString(),
    platforms
  };
}

export function parseGithubRepositoryFromRemote(remoteUrl = "") {
  const value = cleanText(remoteUrl);
  if (!value) return "";
  const httpsMatch = value.match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i);
  if (!httpsMatch) return "";
  return `${httpsMatch[1]}/${httpsMatch[2]}`;
}
