import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { macosNodeRuntimeLayout } from "./macos-runtime-layout.mjs";

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

const bundledNodePath = process.platform === "darwin"
  ? macosNodeRuntimeLayout(runtimeRoot).nodePath
  : path.join(runtimeRoot, "node", process.platform === "win32" ? "node.exe" : "node");
copyFile(resolveNodeExe(), bundledNodePath);
makeExecutable(bundledNodePath);

// On macOS, Node resolves libnode.*.dylib from ../lib relative to its executable.
// The packaged executable lives in desktop-api-runtime/node/node, so lib must live
// in desktop-api-runtime/lib rather than inside the node directory.
if (process.platform === "darwin") {
  const nodeExePath = resolveNodeExe();
  const libSrcDir = path.join(path.dirname(nodeExePath), "..", "lib");
  const libDestDir = macosNodeRuntimeLayout(runtimeRoot).libraryDir;
  if (fs.existsSync(libSrcDir)) {
    copyDir(libSrcDir, libDestDir);
  }

  // Fail the build here instead of shipping a DMG whose local API cannot start.
  run(bundledNodePath, ["--version"], { cwd: runtimeRoot });
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
