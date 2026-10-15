import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import os from "node:os";
import { spawnSync } from "node:child_process";
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
  assert.match(releaseScript, /codesign -d --entitlements - --xml "\$node_bin" >"\$node_entitlements"/);
  assert.match(releaseScript, /Print :com\.apple\.security\.cs\.allow-jit/);
  assert.match(releaseScript, /Embedded Node\.js is missing com\.apple\.security\.cs\.allow-jit/);
});

test("actual macOS codesign XML output distinguishes granted and missing Node JIT permission", {
  skip: process.platform !== "darwin" ? "Requires real macOS codesign and PlistBuddy" : false
}, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yansilu-jit-check-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const binary = path.join(root, "node");
  const output = path.join(root, "entitlements.plist");
  fs.copyFileSync(process.execPath, binary);
  fs.chmodSync(binary, 0o700);
  for (const granted of [true, false]) {
    const signed = spawnSync("codesign", ["--force", "--sign", "-", "--options", "runtime",
      ...(granted ? ["--entitlements", entitlementsPath] : []), binary], { encoding: "utf8" });
    assert.equal(signed.status, 0, signed.stderr);
    const displayed = spawnSync("codesign", ["-d", "--entitlements", "-", "--xml", binary], { encoding: "utf8" });
    assert.equal(displayed.status, 0, displayed.stderr);
    fs.writeFileSync(output, displayed.stdout, "utf8");
    const checked = spawnSync("/usr/libexec/PlistBuddy", ["-c", "Print :com.apple.security.cs.allow-jit", output], { encoding: "utf8" });
    if (granted) { assert.equal(checked.status, 0, checked.stderr); assert.equal(checked.stdout.trim(), "true"); }
    else assert.notEqual(checked.status, 0);
  }
});
