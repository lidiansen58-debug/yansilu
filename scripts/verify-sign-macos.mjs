import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const desktopTarget = String(process.env.YANSILU_DESKTOP_TARGET || "").trim();
const bundleRoot = path.resolve(
  process.cwd(),
  "apps", "desktop", "src-tauri", "target", ...(desktopTarget ? [desktopTarget] : []), "release", "bundle"
);
const appPath = path.join(bundleRoot, "macos", "研思录.app");

if (!fs.existsSync(appPath)) {
  console.log("No macOS .app found — skipping signature verification.");
  process.exit(0);
}

console.log();
console.log("🔐 Verifying code signature...");
const verify = spawnSync("codesign", ["--verify", "--deep", "--strict", "--verbose=1", appPath], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: false
});

if (verify.status !== 0) {
  console.warn("⚠️  Code signature verification failed.");
} else {
  console.log("✅ Code signature verified successfully.");
}

console.log();
console.log("📌 To notarize the DMG for distribution, set these env vars and run:");
console.log('   APPLE_ID="your@email.com" \\');
console.log('   APPLE_TEAM_ID="T7G29AJ3L5" \\');
console.log('   APPLE_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx" \\');
console.log("   bash ./scripts/notarize-dmg.sh");
console.log();
console.log("   (Generate app-specific password at https://appleid.apple.com)");
