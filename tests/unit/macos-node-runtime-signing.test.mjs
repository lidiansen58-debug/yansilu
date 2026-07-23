import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const entitlementsPath = path.join(repoRoot, "apps", "desktop", "src-tauri", "entitlements.plist");
const releaseScriptPath = path.join(repoRoot, "scripts", "build-mac-release.sh");

test("macOS signing grants the embedded Node runtime JIT permission", () => {
  const entitlements = fs.readFileSync(entitlementsPath, "utf8");
  const releaseScript = fs.readFileSync(releaseScriptPath, "utf8");

  assert.match(entitlements, /<key>com\.apple\.security\.cs\.allow-jit<\/key>\s*<true\/>/);
  assert.match(entitlements, /<key>com\.apple\.security\.cs\.allow-unsigned-executable-memory<\/key>\s*<true\/>/);
  assert.match(releaseScript, /Signing embedded Node\.js binary/);
  assert.match(releaseScript, /--entitlements "\$ENTITLEMENTS" "\$node_bin"/);
  assert.match(releaseScript, /codesign -d --entitlements "\$node_entitlements" "\$node_bin"/);
  assert.match(releaseScript, /Print :com\.apple\.security\.cs\.allow-jit/);
  assert.match(releaseScript, /Embedded Node\.js is missing com\.apple\.security\.cs\.allow-jit/);
});
