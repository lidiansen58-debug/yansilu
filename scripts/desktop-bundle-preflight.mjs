import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { commandVersion, hasCommand, withCargoBin } from "./rust-env.mjs";

const REPO_ROOT = process.cwd();
const DESKTOP_ROOT = path.resolve(REPO_ROOT, "apps", "desktop", "src-tauri");
const TAURI_CONFIG_PATH = path.join(DESKTOP_ROOT, "tauri.conf.json");
const DEFAULT_CAPABILITY_PATH = path.join(DESKTOP_ROOT, "capabilities", "default.json");
const ICON_PNG_PATH = path.join(DESKTOP_ROOT, "icons", "icon.png");
const ICON_ICO_PATH = path.join(DESKTOP_ROOT, "icons", "icon.ico");
const EXPECTED_APP_NAME = "研思录";
const EXPECTED_FRONTEND_ENTRY = "index.html";

function logResult(label, ok, detail = "") {
  const status = ok ? "PASS" : "FAIL";
  const suffix = detail ? ` - ${detail}` : "";
  console.log(`[${status}] ${label}${suffix}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function pngDimensions(filePath) {
  const data = fs.readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (data.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("not a PNG file");
  }
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20)
  };
}

function runCargoCheck(env) {
  const result = spawnSync("cargo", ["check"], {
    cwd: DESKTOP_ROOT,
    env,
    encoding: "utf8",
    shell: false
  });
  return {
    ok: result.status === 0,
    detail: String(result.stdout || result.stderr || "").trim()
  };
}

const env = withCargoBin({ ...process.env });
const cargoOk = hasCommand("cargo", env);
const rustcOk = hasCommand("rustc", env);

logResult("cargo", cargoOk, cargoOk ? commandVersion("cargo", env) : "~/.cargo/bin not detected in PATH");
logResult("rustc", rustcOk, rustcOk ? commandVersion("rustc", env) : "~/.cargo/bin not detected in PATH");

let overallOk = cargoOk && rustcOk;

try {
  const config = readJson(TAURI_CONFIG_PATH);
  const defaultCapability = readJson(DEFAULT_CAPABILITY_PATH);
  const productName = String(config.productName || "").trim();
  const windowTitle = String(config.app?.windows?.[0]?.title || "").trim();
  const bundleActive = Boolean(config.bundle?.active);
  const bundleIcons = Array.isArray(config.bundle?.icon) ? config.bundle.icon : [];
  const createsUpdaterArtifacts = Boolean(config.bundle?.createUpdaterArtifacts);
  const hasUpdaterConfig = Boolean(config.plugins?.updater);
  const permissions = Array.isArray(defaultCapability.permissions) ? defaultCapability.permissions : [];
  const frontendDist = String(config.build?.frontendDist || "").trim();
  const frontendDistPath = frontendDist ? path.resolve(DESKTOP_ROOT, frontendDist) : "";
  const frontendEntryPath = frontendDistPath ? path.join(frontendDistPath, EXPECTED_FRONTEND_ENTRY) : "";

  const productOk = productName === EXPECTED_APP_NAME;
  const titleOk = windowTitle === EXPECTED_APP_NAME;
  const bundleOk = bundleActive;
  const iconConfigOk = bundleIcons.includes("icons/icon.png") && bundleIcons.includes("icons/icon.ico");
  const updaterArtifactsOk = !createsUpdaterArtifacts || hasUpdaterConfig;
  const updaterPermissionOk = !hasUpdaterConfig || permissions.includes("updater:default");
  const frontendDistOk = Boolean(frontendDist) && fs.existsSync(frontendDistPath);
  const frontendEntryOk = frontendDistOk && fs.existsSync(frontendEntryPath);

  logResult("tauri productName", productOk, productName || "missing");
  logResult("tauri window title", titleOk, windowTitle || "missing");
  logResult("tauri bundle active", bundleOk, bundleActive ? "enabled" : "disabled");
  logResult("tauri bundle icons", iconConfigOk, bundleIcons.join(", ") || "missing");
  logResult("tauri frontendDist", frontendDistOk, frontendDist || "missing");
  logResult(
    "tauri frontend entry",
    frontendEntryOk,
    frontendEntryOk ? EXPECTED_FRONTEND_ENTRY : `missing ${EXPECTED_FRONTEND_ENTRY}`
  );
  logResult(
    "tauri updater artifacts",
    updaterArtifactsOk,
    createsUpdaterArtifacts ? "enabled with updater config" : "disabled"
  );
  logResult(
    "tauri updater permission",
    updaterPermissionOk,
    updaterPermissionOk ? "updater:default granted" : "missing updater:default"
  );

  overallOk &&=
    productOk &&
    titleOk &&
    bundleOk &&
    iconConfigOk &&
    frontendDistOk &&
    frontendEntryOk &&
    updaterArtifactsOk &&
    updaterPermissionOk;
} catch (error) {
  logResult("tauri desktop config parse", false, String(error?.message || error));
  overallOk = false;
}

const pngExists = fs.existsSync(ICON_PNG_PATH);
const icoExists = fs.existsSync(ICON_ICO_PATH);
logResult("desktop icon.png", pngExists, pngExists ? ICON_PNG_PATH : "missing");
logResult("desktop icon.ico", icoExists, icoExists ? ICON_ICO_PATH : "missing");
overallOk &&= pngExists && icoExists;

if (pngExists) {
  try {
    const { width, height } = pngDimensions(ICON_PNG_PATH);
    const sizeOk = width >= 256 && height >= 256;
    logResult("desktop icon.png size", sizeOk, `${width}x${height}`);
    overallOk &&= sizeOk;
  } catch (error) {
    logResult("desktop icon.png size", false, String(error?.message || error));
    overallOk = false;
  }
}

if (cargoOk && rustcOk) {
  const cargoCheck = runCargoCheck(env);
  logResult(
    "cargo check",
    cargoCheck.ok,
    cargoCheck.ok ? "passed" : cargoCheck.detail.split(/\r?\n/).slice(-1)[0] || "failed"
  );
  overallOk &&= cargoCheck.ok;
}

if (!overallOk) {
  process.exit(1);
}
