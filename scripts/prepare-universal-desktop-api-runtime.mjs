import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const tauriRoot = path.join(repoRoot, "apps", "desktop", "src-tauri");
const runtimeRoot = path.join(tauriRoot, "desktop-api-runtime");
const armRuntimeRoot = `${runtimeRoot}-arm64`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: process.env,
    stdio: "inherit",
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with code ${result.status ?? 1}.`);
}

function copyDir(source, target) {
  fs.cpSync(source, target, { recursive: true, force: true });
}

function findLibnode(directory) {
  return fs.readdirSync(directory).find((name) => /^libnode(?:\.\d+)*\.dylib$/u.test(name));
}

function combineMachOBinaries(armPath, intelPath, destination) {
  const temporaryPath = `${destination}.universal`;
  fs.rmSync(temporaryPath, { force: true });
  run("lipo", ["-create", armPath, intelPath, "-output", temporaryPath]);
  fs.renameSync(temporaryPath, destination);
}

function findNativeAddons(rootPath, results = []) {
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) findNativeAddons(fullPath, results);
    else if (entry.isFile() && entry.name.endsWith(".node")) results.push(fullPath);
  }
  return results;
}

if (process.platform !== "darwin") {
  throw new Error("Universal macOS runtime preparation can only run on macOS.");
}
if (process.arch !== "arm64") {
  throw new Error("Universal macOS runtime preparation must run on an Apple Silicon builder.");
}

const nodeVersion = process.version;
const archiveName = `node-${nodeVersion}-darwin-x64.tar.gz`;
const archiveRoot = `node-${nodeVersion}-darwin-x64`;
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "yansilu-node-x64-"));
const archivePath = path.join(tempRoot, archiveName);

try {
  run(process.execPath, ["./scripts/prepare-desktop-api-runtime.mjs"]);
  fs.rmSync(armRuntimeRoot, { recursive: true, force: true });
  fs.renameSync(runtimeRoot, armRuntimeRoot);

  run("curl", ["--fail", "--location", `https://nodejs.org/dist/${nodeVersion}/${archiveName}`, "--output", archivePath]);
  run("tar", ["-xzf", archivePath, "-C", tempRoot]);

  const intelNodeRoot = path.join(tempRoot, archiveRoot);
  const intelNode = path.join(intelNodeRoot, "bin", "node");
  const intelLibraryDir = path.join(intelNodeRoot, "lib");
  const armNode = path.join(armRuntimeRoot, "node", "node");
  const armLibraryDir = path.join(armRuntimeRoot, "lib");
  const libnodeName = findLibnode(armLibraryDir);
  if (!libnodeName || !fs.existsSync(path.join(intelLibraryDir, libnodeName))) {
    throw new Error("The ARM and Intel Node distributions do not provide matching libnode dylibs.");
  }

  copyDir(armRuntimeRoot, runtimeRoot);
  combineMachOBinaries(armNode, intelNode, path.join(runtimeRoot, "node", "node"));
  combineMachOBinaries(
    path.join(armLibraryDir, libnodeName),
    path.join(intelLibraryDir, libnodeName),
    path.join(runtimeRoot, "lib", libnodeName)
  );

  const nativeAddons = findNativeAddons(path.join(runtimeRoot, "node_modules"));
  if (nativeAddons.length) {
    throw new Error(`Universal runtime contains unsupported native Node addons: ${nativeAddons.join(", ")}`);
  }

  const manifestPath = path.join(runtimeRoot, "desktop-api-runtime.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.arch = "universal";
  manifest.nodeArchitectures = ["arm64", "x64"];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  fs.rmSync(armRuntimeRoot, { recursive: true, force: true });
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log(`Universal desktop API runtime prepared: ${runtimeRoot}`);
