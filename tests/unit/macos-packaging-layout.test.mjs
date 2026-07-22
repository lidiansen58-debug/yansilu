import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { macosDmgLayout, macosNodeRuntimeLayout } from "../../scripts/macos-runtime-layout.mjs";

test("macOS runtime places libnode where the embedded node executable can resolve it", () => {
  const layout = macosNodeRuntimeLayout(path.join("tmp", "desktop-api-runtime"));

  assert.equal(layout.nodePath, path.resolve("tmp", "desktop-api-runtime", "node", "node"));
  assert.equal(layout.libraryDir, path.resolve("tmp", "desktop-api-runtime", "lib"));
});

test("macOS DMG layout always includes an Applications shortcut beside the app", () => {
  const layout = macosDmgLayout({
    appPath: path.join("bundle", "macos", "研思录.app"),
    outputPath: path.join("bundle", "dmg", "研思录_0.1.1_aarch64.dmg"),
    volumeName: "研思录"
  });

  assert.equal(layout.applicationsLinkName, "Applications");
  assert.equal(layout.volumeName, "研思录");
  assert.match(layout.appPath, /研思录\.app$/u);
  assert.match(layout.outputPath, /研思录_0\.1\.1_aarch64\.dmg$/u);
});

test("macOS desktop build wires the runtime layout and DMG packager into the release path", async () => {
  const [runtimeScript, buildScript, dmgScript, signingScript] = await Promise.all([
    fs.readFile(path.resolve("scripts", "prepare-desktop-api-runtime.mjs"), "utf8"),
    fs.readFile(path.resolve("scripts", "build-desktop.mjs"), "utf8"),
    fs.readFile(path.resolve("scripts", "package-macos-dmg.mjs"), "utf8"),
    fs.readFile(path.resolve("scripts", "sign-tauri-artifact.mjs"), "utf8")
  ]);

  assert.match(runtimeScript, /macosNodeRuntimeLayout\(runtimeRoot\)\.libraryDir/);
  assert.match(runtimeScript, /run\(bundledNodePath, \["--version"\]/);
  assert.doesNotMatch(runtimeScript, /node-universal/);
  assert.match(buildScript, /package-macos-dmg\.mjs/);
  assert.match(buildScript, /bundles\.includes\("dmg"\)/);
  assert.match(buildScript, /sign-tauri-artifact\.mjs/);
  assert.match(dmgScript, /fs\.symlink\("\/Applications"/);
  assert.match(dmgScript, /fs\.rm\(`\$\{layout\.outputPath\}\.sig`/);
  assert.match(dmgScript, /verifyMacosDmg\(layout\)/);
  assert.match(signingScript, /npmCommand, \["exec", "tauri", "signer", "sign", "--", target\]/);
});

test("signed macOS releases repackage and notarize the same DMG path", async () => {
  const releaseScript = await fs.readFile(path.resolve("scripts", "build-mac-release.sh"), "utf8");

  assert.match(releaseScript, /package-macos-dmg\.mjs/);
  assert.match(releaseScript, /target\/release\/bundle\/dmg/);
  assert.match(releaseScript, /xcrun notarytool submit "\$dmg_path"/);
  assert.match(releaseScript, /sign_tauri_dmg/);
  assert.match(releaseScript, /sign-tauri-artifact\.mjs" --required "\$dmg_path"/);
  assert.doesNotMatch(releaseScript, /yansilu-dmg-staging/);
  assert.match(releaseScript, /RUST_TARGET="aarch64-apple-darwin"/);
  assert.match(releaseScript, /RUST_TARGET="x86_64-apple-darwin"/);
  assert.doesNotMatch(releaseScript, /Universal Binary/);
});
