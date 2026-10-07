import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { copyMacosBundleDirectory } from "../../scripts/macos-bundle-copy.mjs";

test("macOS bundle copying explicitly preserves link text without dereferencing", async () => {
  let calls = 0;
  await copyMacosBundleDirectory("source", "target", async (source, target, options) => {
    calls++;
    assert.equal(source, "source");
    assert.equal(target, "target");
    assert.deepEqual(options, { recursive: true, force: true, verbatimSymlinks: true });
  });
  assert.equal(calls, 1);
});

test("macOS bundle copying propagates filesystem failures", async () => {
  const failure = new Error("copy failed");
  await assert.rejects(copyMacosBundleDirectory("source", "target", async () => { throw failure; }),
    (error) => error === failure);
});

test("macOS bundle copying keeps ordinary nested files after removing the source", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-copy-test-"));
  try {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await fs.mkdir(path.join(source, "nested"), { recursive: true });
    await fs.writeFile(path.join(source, "nested", "file.txt"), "payload");
    await copyMacosBundleDirectory(source, target);
    await fs.rm(source, { recursive: true, force: true });
    assert.equal(await fs.readFile(path.join(target, "nested", "file.txt"), "utf8"), "payload");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

const posixOnly = { skip: process.platform === "win32" ? "Real POSIX symlink regression runs on macOS CI" : false };

test("npm bin and workspace links survive Universal runtime relocation and source deletion", posixOnly, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-runtime-links-test-"));
  try {
    const runtime = path.join(root, "desktop-api-runtime");
    const armRuntime = `${runtime}-arm64`;
    await fs.mkdir(path.join(runtime, "node_modules", ".bin"), { recursive: true });
    await fs.mkdir(path.join(runtime, "node_modules", "which", "bin"), { recursive: true });
    await fs.mkdir(path.join(runtime, "node_modules", "@yansilu"), { recursive: true });
    await fs.mkdir(path.join(runtime, "packages", "shared"), { recursive: true });
    await fs.writeFile(path.join(runtime, "node_modules", "which", "bin", "which.js"), "cli");
    await fs.writeFile(path.join(runtime, "packages", "shared", "index.js"), "workspace");
    await fs.symlink("../which/bin/which.js", path.join(runtime, "node_modules", ".bin", "node-which"));
    await fs.symlink("../../packages/shared", path.join(runtime, "node_modules", "@yansilu", "shared"), "dir");
    await fs.rename(runtime, armRuntime);

    const brokenCopy = path.join(root, "old-copy");
    await fs.cp(armRuntime, brokenCopy, { recursive: true, force: true });
    await copyMacosBundleDirectory(armRuntime, runtime);
    await fs.rm(armRuntime, { recursive: true, force: true });

    await assert.rejects(fs.readFile(path.join(brokenCopy, "node_modules", ".bin", "node-which")), { code: "ENOENT" });
    assert.equal(await fs.readlink(path.join(runtime, "node_modules", ".bin", "node-which")), "../which/bin/which.js");
    assert.equal(await fs.readFile(path.join(runtime, "node_modules", ".bin", "node-which"), "utf8"), "cli");
    assert.equal(await fs.readFile(path.join(runtime, "node_modules", "@yansilu", "shared", "index.js"), "utf8"), "workspace");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("DMG staging preserves chained relative framework links", posixOnly, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-framework-links-test-"));
  try {
    const source = path.join(root, "Example.app");
    const target = path.join(root, "stage", "Example.app");
    const framework = path.join("Contents", "Frameworks", "Example.framework");
    await fs.mkdir(path.join(source, framework, "Versions", "A"), { recursive: true });
    await fs.writeFile(path.join(source, framework, "Versions", "A", "Example"), "framework");
    await fs.symlink("A", path.join(source, framework, "Versions", "Current"), "dir");
    await fs.symlink("Versions/Current/Example", path.join(source, framework, "Example"));
    await copyMacosBundleDirectory(source, target);
    await fs.rm(source, { recursive: true, force: true });
    assert.equal(await fs.readlink(path.join(target, framework, "Versions", "Current")), "A");
    assert.equal(await fs.readlink(path.join(target, framework, "Example")), "Versions/Current/Example");
    assert.equal(await fs.readFile(path.join(target, framework, "Example"), "utf8"), "framework");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("Universal runtime and DMG staging use the same link-preserving copier", async () => {
  const runtime = await fs.readFile(new URL("../../scripts/prepare-universal-desktop-api-runtime.mjs", import.meta.url), "utf8");
  const dmg = await fs.readFile(new URL("../../scripts/package-macos-dmg.mjs", import.meta.url), "utf8");
  assert.match(runtime, /await copyMacosBundleDirectory\(armRuntimeRoot, runtimeRoot\)/);
  assert.match(dmg, /await copyMacosBundleDirectory\(layout.appPath, stagingApp\)/);
  assert.doesNotMatch(runtime, /fs\.cpSync/);
  assert.doesNotMatch(dmg, /fs\.cp\(/);
});
