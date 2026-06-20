import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTauriStaticUpdateManifestFromBundleManifest,
  buildUpdateManifestFromBundleManifest,
  githubReleaseDownloadUrl,
  githubReleasePageUrl,
  inferReleaseChannel,
  parseGithubRepositoryFromRemote,
  selectPrimaryBundleItem
} from "../../packages/app-update/src/release-manifest.mjs";

const bundleManifest = {
  items: [
    {
      file: "msi/研思录_0.1.2_x64_en-US.msi",
      sha256: "MSI_HASH"
    },
    {
      file: "nsis/研思录_0.1.2_x64-setup.exe",
      sha256: "NSIS_HASH"
    },
    {
      file: "dmg/研思录_0.1.2_aarch64.dmg",
      sha256: "DMG_HASH"
    }
  ]
};

test("release manifest selects the NSIS installer as the primary bundle on Windows", () => {
  const item = selectPrimaryBundleItem(bundleManifest);

  assert.equal(item.file, "nsis/研思录_0.1.2_x64-setup.exe");
  assert.equal(item.sha256, "NSIS_HASH");
});

test("release manifest builds a signed Tauri static updater feed", () => {
  const feed = buildTauriStaticUpdateManifestFromBundleManifest({
    bundleManifest: {
      items: [
        { file: "nsis/研思录_0.1.2_x64-setup.exe" },
        { file: "nsis/研思录_0.1.2_x64-setup.exe.sig" },
        { file: "macos/研思录.app.tar.gz" },
        { file: "macos/研思录.app.tar.gz.sig" }
      ]
    },
    packageVersion: "0.1.2",
    repository: "lidiansen58-debug/yansilu",
    tag: "v0.1.2",
    notes: ["One-click updater support."],
    releaseDate: "2026-06-20T00:00:00.000Z",
    signatureByFile: {
      "nsis/研思录_0.1.2_x64-setup.exe.sig": "WINDOWS_SIG",
      "macos/研思录.app.tar.gz.sig": "MAC_SIG"
    }
  });

  assert.equal(feed.version, "0.1.2");
  assert.equal(feed.notes, "One-click updater support.");
  assert.equal(feed.pub_date, "2026-06-20T00:00:00.000Z");
  assert.equal(feed.platforms["windows-x86_64"].signature, "WINDOWS_SIG");
  assert.equal(feed.platforms["darwin-x86_64"].signature, "MAC_SIG");
  assert.match(feed.platforms["windows-x86_64"].url, /releases\/download\/v0\.1\.2/);
});

test("release manifest refuses a Tauri updater feed without signatures", () => {
  assert.throws(
    () => buildTauriStaticUpdateManifestFromBundleManifest({
      bundleManifest: { items: [{ file: "nsis/研思录_0.1.2_x64-setup.exe" }] },
      packageVersion: "0.1.2",
      repository: "lidiansen58-debug/yansilu"
    }),
    /No signed Tauri updater artifact/
  );
});

test("release manifest can select an explicit bundle item", () => {
  const item = selectPrimaryBundleItem(bundleManifest, {
    file: "dmg/研思录_0.1.2_aarch64.dmg"
  });

  assert.equal(item.file, "dmg/研思录_0.1.2_aarch64.dmg");
});

test("release manifest throws when an explicit bundle item is missing", () => {
  assert.throws(
    () => selectPrimaryBundleItem(bundleManifest, { file: "nsis/missing.exe" }),
    /Requested bundle file not found/
  );
});

test("release manifest builds an encoded GitHub release asset URL", () => {
  const url = githubReleaseDownloadUrl({
    repository: "lidiansen58-debug/yansilu",
    tag: "v0.1.2-beta.1",
    file: "nsis/研思录_0.1.2_x64-setup.exe"
  });

  assert.equal(
    url,
    "https://github.com/lidiansen58-debug/yansilu/releases/download/v0.1.2-beta.1/%E7%A0%94%E6%80%9D%E5%BD%95_0.1.2_x64-setup.exe"
  );
});

test("release manifest builds an encoded GitHub release page URL", () => {
  const url = githubReleasePageUrl({
    repository: "https://github.com/lidiansen58-debug/yansilu.git",
    tag: "refs/tags/v0.1.2-beta.1"
  });

  assert.equal(url, "https://github.com/lidiansen58-debug/yansilu/releases/tag/v0.1.2-beta.1");
});

test("release manifest parses GitHub repository names from common remotes", () => {
  assert.equal(
    parseGithubRepositoryFromRemote("https://github.com/lidiansen58-debug/yansilu.git"),
    "lidiansen58-debug/yansilu"
  );
  assert.equal(parseGithubRepositoryFromRemote("git@github.com:owner/repo.git"), "owner/repo");
});

test("release manifest infers channel from prerelease labels", () => {
  assert.equal(inferReleaseChannel("0.1.2-alpha.1"), "alpha");
  assert.equal(inferReleaseChannel("0.1.2-beta.1"), "beta");
  assert.equal(inferReleaseChannel("0.1.2-rc.1"), "rc");
  assert.equal(inferReleaseChannel("0.1.2"), "stable");
});

test("release manifest includes checksum and release metadata", () => {
  const manifest = buildUpdateManifestFromBundleManifest({
    bundleManifest,
    packageVersion: "0.1.2-beta.1",
    repository: "lidiansen58-debug/yansilu",
    tag: "v0.1.2-beta.1",
    changelog: ["GitHub release manifest generation."],
    minimumSupportedVersion: "0.1.1-beta.1",
    releaseDate: "2026-06-20T00:00:00.000Z"
  });

  assert.equal(manifest.version, "0.1.2-beta.1");
  assert.equal(manifest.channel, "beta");
  assert.deepEqual(manifest.changelog, ["GitHub release manifest generation."]);
  assert.equal(manifest.minimumSupportedVersion, "0.1.1-beta.1");
  assert.equal(manifest.checksum.algorithm, "sha256");
  assert.equal(manifest.checksum.value, "NSIS_HASH");
  assert.equal(manifest.downloadUrl, "https://github.com/lidiansen58-debug/yansilu/releases/tag/v0.1.2-beta.1");
  assert.equal(manifest.assets.length, 3);
  const nsisAsset = manifest.assets.find((asset) => asset.file.includes("nsis/"));
  assert.equal(nsisAsset.platform, "windows-x86_64");
  assert.equal(nsisAsset.bytes, 0);
  assert.match(nsisAsset.url, /github\.com\/lidiansen58-debug\/yansilu\/releases\/download\/v0\.1\.2-beta\.1/);
  assert.deepEqual(nsisAsset.checksum, {
    algorithm: "sha256",
    value: "NSIS_HASH"
  });
});

test("release manifest does not mark ordinary releases below the support floor by default", () => {
  const manifest = buildUpdateManifestFromBundleManifest({
    bundleManifest,
    packageVersion: "0.1.2",
    repository: "lidiansen58-debug/yansilu",
    tag: "v0.1.2"
  });

  assert.equal(manifest.minimumSupportedVersion, "");
});
