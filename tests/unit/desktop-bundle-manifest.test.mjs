import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { buildManifest, writeOutputs } from "../../scripts/desktop-bundle-manifest.mjs";
import { stageDesktopBundles } from "../../scripts/stage-desktop-bundles.mjs";
import { collectReleaseAssets } from "../../scripts/collect-release-assets.mjs";
import { shouldWriteDesktopBundleManifest } from "../../scripts/desktop-build-config.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-final-assets-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const bundleRoot = path.join(root, "bundle");
  const put = async (name, content = name) => {
    const target = path.join(bundleRoot, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
  };
  return { root, bundleRoot, put };
}

test("bundle manifest and staged upload contain only final packages with exact bytes and hashes", async (t) => {
  const f = await fixture(t);
  const final = ["nsis/研思录-setup.exe", "nsis/研思录-setup.exe.sig", "msi/notes.msi", "deb/notes.deb", "deb/notes.deb.sig",
    "appimage/notes.AppImage", "appimage/notes.AppImage.sig", "macos/研思录.app.tar.gz", "macos/研思录.app.tar.gz.sig", "dmg/notes.dmg", "dmg/notes.dmg.sig", "rpm/notes.rpm"];
  const intermediate = [".gitkeep", "bundle-manifest.json", "nsis/installer.nsi", "nsis/tools/helper.exe", "deb/data/usr/bin/node",
    "appimage/notes.AppDir/usr/bin/helper.exe", "appimage/notes.AppDir/usr/share/package.deb", "macos/研思录.app/Contents/Resources/node.exe",
    "macos/研思录.app.dSYM/Contents/debug.exe", "unknown/helper.exe"];
  for (const name of [...final, ...intermediate]) await f.put(name);
  const manifest = await buildManifest(f.bundleRoot);
  assert.deepEqual(manifest.items.map(item => item.file).sort(), [...final].sort());
  for (const item of manifest.items) {
    assert.equal(item.bytes, Buffer.byteLength(item.file));
    assert.equal(item.sha256, crypto.createHash("sha256").update(item.file).digest("hex").toUpperCase());
  }
  await writeOutputs(manifest);
  const outputRoot = path.join(f.root, "dist", "artifact");
  const staged = await stageDesktopBundles({ bundleRoot: f.bundleRoot, outputRoot });
  const bytesAndHashes = items => items.map(({ file, bytes, sha256 }) => ({ file, bytes, sha256 }));
  assert.deepEqual(bytesAndHashes(staged.items), bytesAndHashes(manifest.items));
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(outputRoot, "bundle-manifest.json"), "utf8")), staged);
  await assert.rejects(fs.access(path.join(outputRoot, ".gitkeep")));
  await assert.rejects(fs.access(path.join(outputRoot, "appimage/notes.AppDir")));
  const flattened = await collectReleaseAssets({ distDir: path.dirname(outputRoot), outDir: path.join(f.root, "release-assets") });
  assert.equal(flattened.totalFiles, final.length);
  assert.equal(await fs.readFile(path.join(f.bundleRoot, ".gitkeep"), "utf8"), ".gitkeep");
});

test("staging refuses existing destinations without deleting data or retaining old packages", async (t) => {
  const f = await fixture(t);
  await f.put("nsis/notes.exe");
  const outputRoot = path.join(f.root, "existing");
  await fs.mkdir(outputRoot);
  await fs.writeFile(path.join(outputRoot, "keep.txt"), "existing data");
  await assert.rejects(stageDesktopBundles({ bundleRoot: f.bundleRoot, outputRoot }), { code: "EEXIST" });
  assert.equal(await fs.readFile(path.join(outputRoot, "keep.txt"), "utf8"), "existing data");
  assert.deepEqual(await fs.readdir(outputRoot), ["keep.txt"]);
});

test("empty or nested-only build output cannot produce a successful release manifest", async (t) => {
  const f = await fixture(t);
  await f.put("appimage/notes.AppDir/usr/share/stale.deb");
  await assert.rejects(buildManifest(f.bundleRoot), /No final desktop packages/);
  const outputRoot = path.join(f.root, "staged");
  await assert.rejects(stageDesktopBundles({ bundleRoot: f.bundleRoot, outputRoot }), /No final desktop packages/);
  await assert.rejects(fs.access(outputRoot));
});

test("app-only macOS signing stage defers its manifest until final notarized packages exist", async (t) => {
  const f = await fixture(t);
  await f.put("macos/研思录.app/Contents/MacOS/yansilu-desktop", "expanded app");
  const signingBuild = { platform: "darwin", bundles: ["app"], updaterArtifacts: false };
  assert.equal(shouldWriteDesktopBundleManifest(signingBuild), false);
  await assert.rejects(buildManifest(f.bundleRoot), /No final desktop packages/);
  for (const overrides of [
    { updaterArtifacts: true }, { bundles: ["app", "dmg"] }, { bundles: ["dmg"] },
    { platform: "win32", bundles: ["nsis"] }, { platform: "linux", bundles: ["deb", "appimage"] }
  ]) assert.equal(shouldWriteDesktopBundleManifest({ ...signingBuild, ...overrides }), true);

  const final = ["macos/研思录_universal.app.tar.gz", "macos/研思录_universal.app.tar.gz.sig",
    "dmg/研思录_0.1.1-beta.3_universal.dmg", "dmg/研思录_0.1.1-beta.3_universal.dmg.sig"];
  for (const name of final) await f.put(name);
  const staged = await stageDesktopBundles({ bundleRoot: f.bundleRoot, outputRoot: path.join(f.root, "final") });
  assert.deepEqual(staged.items.map(item => item.file).sort(), final.sort());
  assert.equal(await fs.readFile(path.join(f.bundleRoot, "macos/研思录.app/Contents/MacOS/yansilu-desktop"), "utf8"), "expanded app");
  const build = await fs.readFile(new URL("../../scripts/build-desktop.mjs", import.meta.url), "utf8");
  assert.match(build, /if \(shouldWriteDesktopBundleManifest\([\s\S]*?desktop-bundle-manifest\.mjs/);
});

test("staging cannot copy recursively into its source bundle", async (t) => {
  const f = await fixture(t);
  await f.put("nsis/notes.exe");
  for (const outputRoot of [f.bundleRoot, path.join(f.bundleRoot, "staged")]) {
    await assert.rejects(stageDesktopBundles({ bundleRoot: f.bundleRoot, outputRoot }), /outside the source/);
  }
});
