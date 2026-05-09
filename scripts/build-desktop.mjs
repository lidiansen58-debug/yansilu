import { spawn } from "node:child_process";
import { spawnSync } from "node:child_process";
import { hasCommand, withCargoBin } from "./rust-env.mjs";

const env = withCargoBin({ ...process.env });
const requestedBundles = process.argv.slice(2).filter(Boolean);

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

const bundles = resolveBundles();

if (!hasCommand("cargo", env) || !hasCommand("rustc", env)) {
  console.error("Rust toolchain not found. Expected cargo/rustc in PATH or ~/.cargo/bin.");
  process.exit(1);
}

console.log(`Desktop bundle targets: ${bundles.join(", ")}`);

const tauriArgs = ["build", "--bundles", bundles.join(","), "--config", "./apps/desktop/src-tauri/tauri.conf.json"];

const child =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", `tauri.cmd ${tauriArgs.join(" ")}`], {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
        shell: false
      })
    : spawn("tauri", tauriArgs, {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
        shell: false
      });

child.on("exit", (code, signal) => {
  if ((code ?? 0) === 0) {
    const manifest = spawnSync(process.execPath, ["./scripts/desktop-bundle-manifest.mjs"], {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: false
    });
    if (manifest.status !== 0) {
      process.exit(manifest.status ?? 1);
    }
  }
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
