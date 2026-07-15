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

function makeExecutable(target) {
  if (process.platform === "win32") return;
  fs.chmodSync(target, 0o755);
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

function assertDesktopApiServerHasHostBinding(serverPath) {
  const source = fs.readFileSync(serverPath, "utf8");
  const hasHostConfig = source.includes('const HOST = String(process.env.API_HOST || "127.0.0.1");');
  const listensOnConfiguredHost = source.includes("server.listen(PORT, HOST,");
  if (!hasHostConfig || !listensOnConfiguredHost) {
    throw new Error(
      `Desktop API runtime server must bind to a configured host before bundling: ${serverPath}`
    );
  }
}

function resolveNodeExe() {
  // macOS: build universal (arm64+x86_64) Node.js via lipo
  if (process.platform === "darwin") {
    const nodeVersion = process.version.startsWith("v") ? process.version.slice(1) : process.version;
    const cacheDir = path.join(repoRoot, ".cache", "node-universal");
    const universalNode = path.join(cacheDir, "node");
    if (fs.existsSync(universalNode)) {
      const fileInfo = spawnSync("file", [universalNode], { encoding: "utf8" });
      if (String(fileInfo.stdout || "").includes("universal")) {
        return universalNode;
      }
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
    console.log("Creating universal Node.js binary with lipo...");
    run("lipo", ["-create", "-output", universalNode, ...binaries]);
    console.log("Universal Node.js binary ready.");
    return universalNode;
  }
  if (process.platform === "win32") {
    const result = spawnSync("where.exe", ["node"], { encoding: "utf8", shell: false });
    const first = String(result.stdout || "").split(/\r?\n/u).map(item => item.trim()).find(Boolean);
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

const bundledNodePath = path.join(runtimeRoot, "node", process.platform === "win32" ? "node.exe" : "node");
copyFile(resolveNodeExe(), bundledNodePath);
makeExecutable(bundledNodePath);

// On macOS, the Node.js binary depends on libnode.*.dylib in ../lib relative to bin/node.
// Copy the lib directory alongside the binary so it works after bundling into .app.
if (process.platform === "darwin") {
  const nodeExePath = resolveNodeExe();
  const libSrcDir = path.join(path.dirname(nodeExePath), "..", "lib");
  const libDestDir = path.join(runtimeRoot, "node", "lib");
  if (fs.existsSync(libSrcDir)) {
    copyDir(libSrcDir, libDestDir);
  }
}

copyFile(path.join(repoRoot, "package.json"), path.join(runtimeRoot, "package.json"));
copyFile(path.join(repoRoot, "package-lock.json"), path.join(runtimeRoot, "package-lock.json"));
copyDir(path.join(repoRoot, "apps", "api"), path.join(runtimeRoot, "apps", "api"));
assertDesktopApiServerHasHostBinding(path.join(runtimeRoot, "apps", "api", "src", "server.mjs"));
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
// Copy mobile web files for phone access
const mobileWebDir = path.join(runtimeRoot, "apps", "web", "src");
ensureDir(mobileWebDir);
copyFile(
  path.join(repoRoot, "apps", "web", "src", "mobile.html"),
  path.join(mobileWebDir, "mobile.html")
);
copyFile(
  path.join(repoRoot, "apps", "web", "src", "mobile.js"),
  path.join(mobileWebDir, "mobile.js")
);
copyFile(
  path.join(repoRoot, "apps", "web", "src", "mobile.css"),
  path.join(mobileWebDir, "mobile.css")
);

run(resolveNodeExe(), [resolveNpmCli(), "ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
  cwd: runtimeRoot
});

// Fix permissions: npm ci may create read-only files/dirs
if (process.platform === "darwin") {
  run("chmod", ["-R", "u+w", runtimeRoot]);
  run("find", [runtimeRoot, "-type", "d", "-exec", "chmod", "755", "{}", "+"]);
  run("xattr", ["-rc", runtimeRoot]);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  entry: "apps/api/src/server.mjs"
};
fs.writeFileSync(path.join(runtimeRoot, "desktop-api-runtime.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Desktop API runtime prepared: ${runtimeRoot}`);
