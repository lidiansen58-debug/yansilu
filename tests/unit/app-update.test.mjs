import test from "node:test";
import assert from "node:assert/strict";

import {
  checkForAppUpdate,
  checkManifestForUpdate,
  compareVersions,
  normalizeUpdateManifest
} from "../../packages/app-update/src/index.mjs";

test("app update reports up-to-date when current version equals latest version", () => {
  const result = checkManifestForUpdate({
    currentVersion: "0.1.1-beta.1",
    manifest: {
      version: "0.1.1-beta.1",
      releaseDate: "2026-06-20",
      channel: "beta",
      changelog: ["No update needed."],
      downloadUrl: "https://example.test/yansilu",
      minimumSupportedVersion: "0.1.0",
      critical: false
    },
    checkedAt: "2026-06-20T00:00:00.000Z"
  });

  assert.equal(result.status, "up-to-date");
  assert.equal(result.updateAvailable, false);
  assert.equal(result.latestVersion, "0.1.1-beta.1");
});

test("app update reports available when current version is lower than latest version", () => {
  const result = checkManifestForUpdate({
    currentVersion: "0.1.1-beta.1",
    manifest: {
      version: "0.1.2",
      releaseDate: "2026-06-21",
      channel: "beta",
      changelog: ["Fix update checks."],
      downloadUrl: "https://example.test/yansilu-0.1.2.exe",
      minimumSupportedVersion: "0.1.0"
    }
  });

  assert.equal(result.status, "update-available");
  assert.equal(result.updateAvailable, true);
  assert.equal(result.manifest.downloadUrl, "https://example.test/yansilu-0.1.2.exe");
});

test("app update wraps manifest fetch failure without throwing", async () => {
  const result = await checkForAppUpdate({
    currentVersion: "0.1.1-beta.1",
    manifestUrl: "https://example.test/update.json",
    fetchManifest: async () => {
      const error = new Error("network unavailable");
      error.code = "TEST_FETCH_FAILED";
      throw error;
    },
    now: () => new Date("2026-06-20T01:00:00.000Z")
  });

  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "TEST_FETCH_FAILED");
  assert.match(result.error.message, /network unavailable/);
});

test("app update preserves critical update metadata", () => {
  const result = checkManifestForUpdate({
    currentVersion: "0.1.1-beta.1",
    manifest: {
      version: "0.1.2",
      critical: true,
      changelog: "Security and data-safety fix.",
      minimumSupportedVersion: "0.1.1-beta.1"
    }
  });

  assert.equal(result.status, "update-available");
  assert.equal(result.critical, true);
  assert.deepEqual(result.manifest.changelog, ["Security and data-safety fix."]);
  assert.equal(result.minimumSupported, true);
});

test("app update tolerates missing optional manifest fields", () => {
  const manifest = normalizeUpdateManifest({ version: "0.1.2" });
  assert.equal(manifest.version, "0.1.2");
  assert.equal(manifest.channel, "beta");
  assert.deepEqual(manifest.changelog, []);
  assert.equal(manifest.downloadUrl, "");
  assert.equal(manifest.critical, false);
  assert.equal(manifest.checksum, null);
});

test("app update treats manifest without version as failed", () => {
  const result = checkManifestForUpdate({
    currentVersion: "0.1.1-beta.1",
    manifest: {
      changelog: ["Missing version should not crash."]
    }
  });

  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "UPDATE_MANIFEST_VERSION_MISSING");
});

test("app update compares prerelease versions conservatively", () => {
  assert.equal(compareVersions("0.1.1-beta.1", "0.1.1"), -1);
  assert.equal(compareVersions("0.1.1-beta.2", "0.1.1-beta.1"), 1);
  assert.equal(compareVersions("v0.1.2", "0.1.1"), 1);
});
