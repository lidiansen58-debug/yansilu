import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { collectReleaseAssets } from "../../scripts/collect-release-assets.mjs";

async function writeFixtureFile(root, relativePath, content = relativePath) {
  const fullPath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
  return fullPath;
}

async function makeTempFixture() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-release-assets-"));
}

test("release asset collector flattens downloaded desktop artifacts and writes a bundle manifest", async () => {
  const root = await makeTempFixture();
  try {
    const distDir = path.join(root, "dist");
    const outDir = path.join(root, "release-assets");
    await writeFixtureFile(distDir, "yansilu-windows-nsis/nsis/Yansilu_0.1.2_x64-setup.exe", "windows installer");
    await writeFixtureFile(distDir, "yansilu-windows-nsis/nsis/Yansilu_0.1.2_x64-setup.exe.sig", "WINDOWS_SIG");
    await writeFixtureFile(distDir, "yansilu-linux-bundles/appimage/yansilu.AppImage", "linux appimage");
    await writeFixtureFile(distDir, "yansilu-linux-bundles/appimage/yansilu.AppImage.sig", "LINUX_SIG");
    await writeFixtureFile(distDir, "yansilu-linux-bundles/bundle-manifest.json", "{}");
    await writeFixtureFile(distDir, "yansilu-macos-arm64-bundles/Yansilu.app.dSYM/Contents/ignored", "debug symbols");

    const result = await collectReleaseAssets({ distDir, outDir });
    const manifest = JSON.parse(await fs.readFile(result.manifestPath, "utf8"));
    const outputFiles = (await fs.readdir(outDir)).sort((a, b) => a.localeCompare(b, "en"));

    assert.equal(result.totalFiles, 4);
    assert.deepEqual(outputFiles, [
      "bundle-manifest.json",
      "bundle-manifest.sha256.txt",
      "Yansilu_0.1.2_x64-setup.exe",
      "Yansilu_0.1.2_x64-setup.exe.sig",
      "yansilu.AppImage",
      "yansilu.AppImage.sig"
    ]);
    assert.deepEqual(
      manifest.items.map((item) => item.file),
      [
        "Yansilu_0.1.2_x64-setup.exe",
        "Yansilu_0.1.2_x64-setup.exe.sig",
        "yansilu.AppImage",
        "yansilu.AppImage.sig"
      ]
    );
    assert.match(await fs.readFile(result.checksumsPath, "utf8"), /Yansilu_0\.1\.2_x64-setup\.exe/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("release asset collector prefixes colliding file names with the artifact name", async () => {
  const root = await makeTempFixture();
  try {
    const distDir = path.join(root, "dist");
    const outDir = path.join(root, "release-assets");
    await writeFixtureFile(distDir, "yansilu-macos-arm64-bundles/macos/Yansilu.app.tar.gz", "arm64");
    await writeFixtureFile(distDir, "yansilu-macos-intel-bundles/macos/Yansilu.app.tar.gz", "intel");

    const result = await collectReleaseAssets({ distDir, outDir });
    const manifest = JSON.parse(await fs.readFile(result.manifestPath, "utf8"));

    assert.equal(result.totalFiles, 2);
    assert.deepEqual(
      manifest.items.map((item) => item.file),
      [
        "yansilu-macos-arm64-bundles-Yansilu.app.tar.gz",
        "yansilu-macos-intel-bundles-Yansilu.app.tar.gz"
      ]
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("release asset collector fails clearly when no files were downloaded", async () => {
  const root = await makeTempFixture();
  try {
    const distDir = path.join(root, "dist");
    await fs.mkdir(path.join(distDir, "empty-artifact"), { recursive: true });

    await assert.rejects(
      () => collectReleaseAssets({ distDir, outDir: path.join(root, "release-assets") }),
      /No release asset files found/
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
