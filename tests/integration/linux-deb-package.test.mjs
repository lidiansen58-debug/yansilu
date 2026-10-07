import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { verifyLinuxDebBundle } from "../../scripts/desktop-linux-bundle.mjs";

test("real dpkg package validates and resource/branding defects are rejected", { skip: process.platform !== "linux" }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "yansilu-deb-regression-"));
  const payload = path.join(root, "payload");
  const file = path.join(root, "yansilu.deb");
  const entryPath = path.join(payload, "usr/share/applications/yansilu.desktop");
  const nodePath = path.join(payload, "usr/lib/yansilu/desktop-api-runtime/node/node");
  const write = (relative, content) => {
    const target = path.join(payload, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  const build = () => {
    const result = spawnSync("dpkg-deb", ["--build", "--root-owner-group", payload, file], { encoding: "utf8", timeout: 30_000 });
    assert.equal(result.status, 0, result.error?.message || result.stderr);
  };
  try {
    write("DEBIAN/control", "Package: yansilu\nVersion: 0.1.1-beta.2\nArchitecture: amd64\nMaintainer: Yansilu Team\nDescription: Linux packaging regression fixture\n");
    write("usr/bin/yansilu-desktop", "fixture");
    write("usr/lib/yansilu/desktop-api-runtime/apps/api/src/server.mjs", "// fixture\n");
    const template = fs.readFileSync(new URL("../../apps/desktop/src-tauri/linux/yansilu.desktop.hbs", import.meta.url), "utf8");
    write("usr/share/applications/yansilu.desktop", template
      .replace(/\{\{#if comment\}\}[\s\S]*?\{\{\/if\}\}/u, "")
      .replace(/\{\{#if mime_type\}\}[\s\S]*?\{\{\/if\}\}/u, "")
      .replaceAll("{{categories}}", "Office;").replaceAll("{{exec}}", "yansilu-desktop").replaceAll("{{icon}}", "yansilu-desktop"));
    fs.mkdirSync(path.dirname(nodePath), { recursive: true });
    fs.copyFileSync(process.execPath, nodePath);
    fs.chmodSync(nodePath, 0o755);
    build();
    const verify = () => verifyLinuxDebBundle({ filePath: file, version: "0.1.1-beta.2", architecture: "amd64" });
    verify();
    fs.writeFileSync(entryPath, "Name=yansilu\nExec=yansilu-desktop\nIcon=yansilu-desktop\nType=Application\n");
    build();
    assert.throws(verify, /Name=/u);
    fs.writeFileSync(entryPath, "Name=研思录\nExec=yansilu-desktop\nIcon=yansilu-desktop\nType=Application\n");
    fs.rmSync(path.join(payload, "usr/lib/yansilu/desktop-api-runtime/apps/api/src/server.mjs"));
    build();
    assert.throws(verify, /server\.mjs/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
