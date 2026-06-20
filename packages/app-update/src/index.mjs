import fs from "node:fs/promises";

export const UPDATE_STATUSES = Object.freeze([
  "idle",
  "checking",
  "update-available",
  "up-to-date",
  "downloading",
  "downloaded",
  "failed",
  "disabled"
]);

export const DEFAULT_UPDATE_CHANNEL = "beta";
export const DEFAULT_UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_UPDATE_MANIFEST_TIMEOUT_MS = 10000;
export const DEFAULT_GITHUB_UPDATE_REPOSITORY = "lidiansen58-debug/yansilu";
export const DEFAULT_UPDATE_MANIFEST_URL = `https://github.com/${DEFAULT_GITHUB_UPDATE_REPOSITORY}/releases/latest/download/update-manifest.json`;

function cleanText(value = "") {
  return String(value ?? "").trim();
}

function toIsoOrEmpty(value = "") {
  const raw = cleanText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

function parseVersion(version = "") {
  const raw = cleanText(version).replace(/^v/i, "");
  const [coreRaw, prereleaseRaw = ""] = raw.split("-", 2);
  const core = coreRaw.split(".").map((part) => {
    const match = String(part || "").match(/^\d+/);
    return match ? Number(match[0]) : 0;
  });
  while (core.length < 3) core.push(0);
  const prerelease = prereleaseRaw
    ? prereleaseRaw.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : String(part || "")))
    : [];
  return { raw, core: core.slice(0, 3), prerelease };
}

function comparePrerelease(left = [], right = []) {
  if (!left.length && !right.length) return 0;
  if (!left.length) return 1;
  if (!right.length) return -1;
  const size = Math.max(left.length, right.length);
  for (let index = 0; index < size; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    if (a === b) continue;
    if (typeof a === "number" && typeof b === "number") return a > b ? 1 : -1;
    if (typeof a === "number") return -1;
    if (typeof b === "number") return 1;
    return String(a).localeCompare(String(b), "en");
  }
  return 0;
}

export function compareVersions(currentVersion = "", latestVersion = "") {
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);
  for (let index = 0; index < 3; index += 1) {
    if (current.core[index] > latest.core[index]) return 1;
    if (current.core[index] < latest.core[index]) return -1;
  }
  return comparePrerelease(current.prerelease, latest.prerelease);
}

export function isNewerVersion(currentVersion = "", latestVersion = "") {
  if (!cleanText(currentVersion) || !cleanText(latestVersion)) return false;
  return compareVersions(currentVersion, latestVersion) < 0;
}

export function normalizeUpdateManifest(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const changelogInput = source.changelog ?? source.releaseNotes ?? source.notes ?? [];
  const changelog = Array.isArray(changelogInput)
    ? changelogInput.map((item) => cleanText(item)).filter(Boolean)
    : cleanText(changelogInput)
      ? [cleanText(changelogInput)]
      : [];
  const checksum = source.checksum && typeof source.checksum === "object"
    ? {
        algorithm: cleanText(source.checksum.algorithm || source.checksum.alg || "sha256") || "sha256",
        value: cleanText(source.checksum.value || source.checksum.sha256 || source.checksum.digest)
      }
    : cleanText(source.checksum)
      ? { algorithm: "sha256", value: cleanText(source.checksum) }
      : null;
  const assets = Array.isArray(source.assets)
    ? source.assets
        .filter((asset) => asset && typeof asset === "object")
        .map((asset) => {
          const assetChecksum = asset.checksum && typeof asset.checksum === "object"
            ? {
                algorithm: cleanText(asset.checksum.algorithm || asset.checksum.alg || "sha256") || "sha256",
                value: cleanText(asset.checksum.value || asset.checksum.sha256 || asset.checksum.digest)
              }
            : cleanText(asset.checksum)
              ? { algorithm: "sha256", value: cleanText(asset.checksum) }
              : null;
          return {
            file: cleanText(asset.file || asset.name),
            platform: cleanText(asset.platform),
            bytes: Number(asset.bytes || asset.size || 0) || 0,
            url: cleanText(asset.url || asset.downloadUrl || asset.download_url),
            checksum: assetChecksum?.value ? assetChecksum : null
          };
        })
        .filter((asset) => asset.file || asset.url)
    : [];

  return {
    version: cleanText(source.version || source.latestVersion || source.latest_version),
    releaseDate: toIsoOrEmpty(source.releaseDate || source.release_date || source.publishedAt || source.published_at),
    channel: cleanText(source.channel || DEFAULT_UPDATE_CHANNEL) || DEFAULT_UPDATE_CHANNEL,
    changelog,
    downloadUrl: cleanText(source.downloadUrl || source.download_url || source.releaseUrl || source.release_url),
    minimumSupportedVersion: cleanText(source.minimumSupportedVersion || source.minimum_supported_version),
    critical: Boolean(source.critical),
    checksum: checksum?.value ? checksum : null,
    assets
  };
}

export function checkManifestForUpdate({ currentVersion = "", manifest = null, manifestUrl = "", checkedAt = new Date().toISOString() } = {}) {
  const normalized = normalizeUpdateManifest(manifest || {});
  if (!normalized.version) {
    return {
      status: "failed",
      currentVersion: cleanText(currentVersion),
      latestVersion: "",
      checkedAt,
      manifestUrl: cleanText(manifestUrl),
      manifest: normalized,
      updateAvailable: false,
      error: {
        code: "UPDATE_MANIFEST_VERSION_MISSING",
        message: "Update manifest is missing version."
      }
    };
  }
  const updateAvailable = isNewerVersion(currentVersion, normalized.version);
  return {
    status: updateAvailable ? "update-available" : "up-to-date",
    currentVersion: cleanText(currentVersion),
    latestVersion: normalized.version,
    checkedAt,
    manifestUrl: cleanText(manifestUrl),
    manifest: normalized,
    updateAvailable,
    critical: Boolean(normalized.critical),
    minimumSupported: normalized.minimumSupportedVersion
      ? compareVersions(currentVersion, normalized.minimumSupportedVersion) >= 0
      : true,
    error: null
  };
}

export async function readPackageVersion(packageJsonPath) {
  const raw = await fs.readFile(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw);
  return cleanText(parsed.version);
}

function updateManifestUrlIsDisabled(value = "") {
  return /^(disabled|off|none|false)$/i.test(cleanText(value));
}

export function resolveUpdateManifestUrl(env = process.env) {
  const explicitUrl = cleanText(env.YANSILU_UPDATE_MANIFEST_URL ?? env.UPDATE_MANIFEST_URL);
  if (explicitUrl) return updateManifestUrlIsDisabled(explicitUrl) ? "" : explicitUrl;
  return DEFAULT_UPDATE_MANIFEST_URL;
}

export async function fetchUpdateManifest(manifestUrl = "", options = {}) {
  const cleanUrl = cleanText(manifestUrl);
  if (!cleanUrl) {
    const error = new Error("Update manifest URL is not configured.");
    error.code = "UPDATE_MANIFEST_URL_MISSING";
    throw error;
  }
  let url;
  try {
    url = new URL(cleanUrl);
  } catch {
    const error = new Error("Update manifest URL is invalid.");
    error.code = "UPDATE_MANIFEST_URL_INVALID";
    throw error;
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    const error = new Error("Update manifest URL must use http or https.");
    error.code = "UPDATE_MANIFEST_URL_UNSUPPORTED";
    throw error;
  }
  const timeoutMs = Math.max(0, Number(options.timeoutMs ?? DEFAULT_UPDATE_MANIFEST_TIMEOUT_MS) || 0);
  const externalSignal = options.signal;
  const controller = timeoutMs > 0 && typeof AbortController === "function" ? new AbortController() : null;
  let timeoutId = null;
  let timedOut = false;
  let response;
  try {
    if (controller) {
      if (externalSignal?.aborted) controller.abort(externalSignal.reason);
      else if (externalSignal && typeof externalSignal.addEventListener === "function") {
        externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), { once: true });
      }
      timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    }
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller?.signal || externalSignal
    });
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error(`Update manifest request timed out after ${timeoutMs}ms.`);
      timeoutError.code = "UPDATE_MANIFEST_TIMEOUT";
      timeoutError.timeoutMs = timeoutMs;
      throw timeoutError;
    }
    if (String(error?.name || "") === "AbortError") {
      const abortError = new Error("Update manifest request was aborted.");
      abortError.code = "UPDATE_MANIFEST_ABORTED";
      throw abortError;
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  const body = await response.text();
  if (!response.ok) {
    const error = new Error(`Update manifest request failed with HTTP ${response.status}.`);
    error.code = "UPDATE_MANIFEST_FETCH_FAILED";
    error.status = response.status;
    error.body = body.slice(0, 500);
    throw error;
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    const error = new Error("Update manifest response is not valid JSON.");
    error.code = "UPDATE_MANIFEST_JSON_INVALID";
    throw error;
  }
}

export async function checkForAppUpdate({ currentVersion = "", manifestUrl = "", fetchManifest = fetchUpdateManifest, now = () => new Date(), timeoutMs = DEFAULT_UPDATE_MANIFEST_TIMEOUT_MS } = {}) {
  const cleanManifestUrl = cleanText(manifestUrl);
  const checkedAt = now().toISOString();
  if (!cleanManifestUrl) {
    return {
      status: "disabled",
      currentVersion: cleanText(currentVersion),
      latestVersion: "",
      checkedAt,
      manifestUrl: "",
      manifest: null,
      updateAvailable: false,
      critical: false,
      error: {
        code: "UPDATE_MANIFEST_URL_MISSING",
        message: "Update manifest URL is not configured."
      }
    };
  }
  try {
    const manifest = await fetchManifest(cleanManifestUrl, { timeoutMs });
    return checkManifestForUpdate({ currentVersion, manifest, manifestUrl: cleanManifestUrl, checkedAt });
  } catch (error) {
    return {
      status: "failed",
      currentVersion: cleanText(currentVersion),
      latestVersion: "",
      checkedAt,
      manifestUrl: cleanManifestUrl,
      manifest: null,
      updateAvailable: false,
      critical: false,
      error: {
        code: cleanText(error?.code) || "UPDATE_CHECK_FAILED",
        message: cleanText(error?.message || error)
      }
    };
  }
}
