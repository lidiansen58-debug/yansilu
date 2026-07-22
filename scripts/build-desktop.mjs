import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { spawnSync } from "node:child_process";
import { hasCommand, withCargoBin } from "./rust-env.mjs";

const env = withCargoBin({ ...process.env });
const requestedBundles = process.argv.slice(2).filter(Boolean);
const TAURI_CONFIG_PATH = "./apps/desktop/src-tauri/tauri.conf.json";

function defaultBundlesForPlatform(platform) {
  if (platform === "win32") return ["nsis"];
  if (platform === "darwin") return ["app", "dmg"];
  if (platform === "linux") return ["deb", "appimage"];
  return [];
}

function resolveBundles() {
  if (requestedBundles.length) return requestedBundles;
  const envValue = String(process.env.YANSILU_DESKTOP_BUNDLES || "").trim();
  if (envValue) {
    return envValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  const defaults = defaultBundlesForPlatform(process.platform);
  if (!defaults.length) {
    console.error(`Unsupported platform for automatic desktop bundles: ${process.platform}`);
    process.exit(1);
  }
  return defaults;
}

function envFlagIsEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function resolveTauriConfigPath() {
  if (envFlagIsEnabled(process.env.YANSILU_DESKTOP_UPDATER_ARTIFACTS)) {
    console.log("Desktop updater artifacts: enabled");
    return TAURI_CONFIG_PATH;
  }

  const sourcePath = path.resolve(process.cwd(), TAURI_CONFIG_PATH);
  const config = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  config.bundle = {
    ...config.bundle,
    createUpdaterArtifacts: false
  };

  const generatedPath = path.join(path.dirname(sourcePath), "tauri.conf.no-updater-artifacts.json");
  fs.writeFileSync(generatedPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log("Desktop updater artifacts: disabled for this build");
  return `./${path.relative(process.cwd(), generatedPath).replaceAll(path.sep, "/")}`;
}

const bundles = resolveBundles();
const runtime = spawnSync(process.execPath, ["./scripts/prepare-desktop-api-runtime.mjs"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
  shell: false
});
if (runtime.status !== 0) {
  process.exit(runtime.status ?? 1);
}
const tauriConfigPath = resolveTauriConfigPath();
const bundleRoot = path.resolve(process.cwd(), "apps", "desktop", "src-tauri", "target", "release", "bundle");
const tauriConfig = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), TAURI_CONFIG_PATH), "utf8"));

for (const bundle of bundles) {
  const bundleDir = path.join(bundleRoot, bundle);
  if (!bundleDir.startsWith(bundleRoot)) {
    console.error(`Refusing to clean bundle output outside release bundle directory: ${bundleDir}`);
    process.exit(1);
  }
  fs.rmSync(bundleDir, { recursive: true, force: true });
}

if (!hasCommand("cargo", env) || !hasCommand("rustc", env)) {
  console.error("Rust toolchain not found. Expected cargo/rustc in PATH or ~/.cargo/bin.");
  process.exit(1);
}

console.log(`Desktop bundle targets: ${bundles.join(", ")}`);

const tauriArgs = ["build", "--bundles", bundles.join(","), "--config", tauriConfigPath];
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

function quoteWindowsArg(arg) {
  const value = String(arg);
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

const child =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", ["npm.cmd", "exec", "tauri", "--", ...tauriArgs].map(quoteWindowsArg).join(" ")], {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
        shell: false
      })
    : spawn(npmBin, ["exec", "tauri", "--", ...tauriArgs], {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
        shell: false
      });

child.on("exit", (code, signal) => {
  // Tauri bundler may fail on xattr cleanup step on macOS, but the .app is
  // already complete. Treat as success when the app binary exists.
  const exitCode = code ?? 0;
  if (exitCode !== 0) {
    const appPath = path.resolve(bundleRoot, "macos", "研思录.app");
    const binPath = path.join(appPath, "Contents", "MacOS", "yansilu-desktop");
    if (fs.existsSync(binPath)) {
      console.warn("Tauri bundler exited with code " + exitCode + " but .app is complete — continuing.");
    } else {
      if (signal) process.kill(process.pid, signal);
      process.exit(exitCode);
    }
  }
  if ((code ?? 0) === 0 || fs.existsSync(path.resolve(bundleRoot, "macos", "研思录.app", "Contents", "MacOS", "yansilu-desktop"))) {
    if (process.platform === "darwin" && bundles.includes("dmg")) {
      const appPath = path.resolve(bundleRoot, "macos", `${tauriConfig.productName}.app`);
      const architecture = process.arch === "arm64" ? "aarch64" : process.arch;
      const dmgPath = path.resolve(bundleRoot, "dmg", `${tauriConfig.productName}_${tauriConfig.version}_${architecture}.dmg`);
      const dmg = spawnSync(process.execPath, [
        "./scripts/package-macos-dmg.mjs",
        "--app", appPath,
        "--out", dmgPath,
        "--volume-name", tauriConfig.productName
      ], {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
        shell: false
      });
      if (dmg.status !== 0) process.exit(dmg.status ?? 1);
      const signature = spawnSync(process.execPath, [
        "./scripts/sign-tauri-artifact.mjs",
        ...(envFlagIsEnabled(process.env.YANSILU_DESKTOP_UPDATER_ARTIFACTS) ? ["--required"] : []),
        dmgPath
      ], {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
        shell: false
      });
      if (signature.status !== 0) process.exit(signature.status ?? 1);
    }
    const manifest = spawnSync(process.execPath, ["./scripts/desktop-bundle-manifest.mjs"], {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: false
    });
    if (manifest.status !== 0) {
      process.exit(manifest.status ?? 1);
    }

    // macOS: verify code signature
    if (process.platform === "darwin") {
      spawnSync(process.execPath, ["./scripts/verify-sign-macos.mjs"], {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
        shell: false
      });
    }
  }
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
