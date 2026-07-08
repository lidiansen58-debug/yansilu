import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const tauriRoot = path.join(repoRoot, "apps", "desktop", "src-tauri");
const runtimeRoot = path.join(tauriRoot, "desktop-api-runtime");

function rm(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function copyDir(source, target, options = {}) {
  const { filter = () => true } = options;
  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    filter: (src) => filter(src)
  });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: process.env,
    stdio: "inherit",
    shell: false
  });
  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function resolveNodeExe() {
  // For macOS universal builds, build a universal (arm64+x86_64) Node.js binary
  // by downloading both archs and merging with lipo.
  // Node.js v26 does not ship darwin-universal prebuilt packages.
  if (process.platform === "darwin") {
    const nodeVersion = process.version.startsWith("v") ? process.version.slice(1) : process.version;
    const cacheDir = path.join(repoRoot, ".cache", "node-universal");
    const universalNode = path.join(cacheDir, "node");
    if (fs.existsSync(universalNode)) {
      const fileInfo = spawnSync("file", [universalNode], { encoding: "utf8" });
      if (String(fileInfo.stdout || "").includes("universal")) {
        return universalNode;
      }
      // Stale single-arch cache
      fs.rmSync(universalNode, { force: true });
    }
    ensureDir(cacheDir);

    const archs = ["arm64", "x64"];
    const binaries = [];
    for (const arch of archs) {
      const archDir = path.join(cacheDir, arch);
      const archBin = path.join(archDir, "bin", "node");
      if (!fs.existsSync(archBin)) {
        const tarFile = path.join(cacheDir, `node-${arch}.tar.gz`);
        const url = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-darwin-${arch}.tar.gz`;
        console.log(`Downloading Node.js ${nodeVersion} (${arch})...`);
        ensureDir(archDir);
        run("curl", ["-fsSL", "-o", tarFile, url], { cwd: cacheDir });
        run("tar", ["-xzf", tarFile, "-C", archDir, "--strip-components=1"], { cwd: cacheDir });
        fs.unlinkSync(tarFile);
      }
      binaries.push(archBin);
    }

    // Merge into universal binary with lipo
    console.log("Creating universal Node.js binary with lipo...");
    run("lipo", ["-create", "-output", universalNode, ...binaries]);
    console.log("Universal Node.js binary ready.");
    return universalNode;
  }
  if (process.platform === "win32") {
    const result = spawnSync("where.exe", ["node"], {
      encoding: "utf8",
      shell: false
    });
    const first = String(result.stdout || "")
      .split(/\r?\n/u)
      .map((item) => item.trim())
      .find(Boolean);
    if (first && fs.existsSync(first)) return first;
  }
  return process.execPath;
}

function resolveCommand(command) {
  if (process.platform === "win32") {
    const result = spawnSync("where.exe", [command], {
      encoding: "utf8",
      shell: false
    });
    const first = String(result.stdout || "")
      .split(/\r?\n/u)
      .map((item) => item.trim())
      .find((item) => item && fs.existsSync(item));
    if (first) return first;
  }
  return command;
}

function resolveNpmCli() {
  if (process.env.npm_execpath && fs.existsSync(process.env.npm_execpath)) {
    return process.env.npm_execpath;
  }

  const localNpmCli = path.join(
    path.dirname(resolveNodeExe()),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js"
  );
  if (fs.existsSync(localNpmCli)) {
    return localNpmCli;
  }

  // Homebrew (macOS): /opt/homebrew/lib/node_modules/npm/bin/npm-cli.js
  const homebrewNpmCli = "/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js";
  if (fs.existsSync(homebrewNpmCli)) {
    return homebrewNpmCli;
  }

  const npmCommand = resolveCommand(process.platform === "win32" ? "npm.cmd" : "npm");
  const npmDir = path.dirname(npmCommand);
  const siblingNpmCli = path.join(npmDir, "node_modules", "npm", "bin", "npm-cli.js");
  if (fs.existsSync(siblingNpmCli)) {
    return siblingNpmCli;
  }

  throw new Error("Unable to locate npm-cli.js for desktop API runtime install.");
}

rm(runtimeRoot);
ensureDir(runtimeRoot);

const nodeDest = path.join(runtimeRoot, "node", process.platform === "win32" ? "node.exe" : "node");
copyFile(resolveNodeExe(), nodeDest);
// Fix permissions and clean extended attributes to prevent Tauri bundler failures
if (process.platform === "darwin") {
  try {
    // Make readable+writable first so xattr and Cargo can access it
    fs.chmodSync(nodeDest, 0o755);
    spawnSync("xattr", ["-cr", nodeDest], { stdio: "ignore" });
  } catch (_) { /* ignore */ }
}

copyFile(path.join(repoRoot, "package.json"), path.join(runtimeRoot, "package.json"));
copyFile(path.join(repoRoot, "package-lock.json"), path.join(runtimeRoot, "package-lock.json"));
copyDir(path.join(repoRoot, "apps", "api"), path.join(runtimeRoot, "apps", "api"));
copyDir(path.join(repoRoot, "packages"), path.join(runtimeRoot, "packages"));

ensureDir(path.join(runtimeRoot, "scripts"));
copyFile(
  path.join(repoRoot, "scripts", "seed-smart-notes-product-thinking.mjs"),
  path.join(runtimeRoot, "scripts", "seed-smart-notes-product-thinking.mjs")
);
copyDir(
  path.join(repoRoot, "tests", "fixtures", "demo-smart-notes-product-thinking"),
  path.join(runtimeRoot, "tests", "fixtures", "demo-smart-notes-product-thinking")
);

run(resolveNodeExe(), [resolveNpmCli(), "ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
  cwd: runtimeRoot
});

const manifest = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  entry: "apps/api/src/server.mjs"
};
fs.writeFileSync(path.join(runtimeRoot, "desktop-api-runtime.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Desktop API runtime prepared: ${runtimeRoot}`);
