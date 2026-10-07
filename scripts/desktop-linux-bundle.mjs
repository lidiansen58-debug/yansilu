import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8", shell: false, timeout: 120_000, maxBuffer: 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr || result.stdout}`.trim());
  }
  return result.stdout.trim();
}

export function verifyLinuxDebBundle({ filePath, version, architecture, runCommand = run }) {
  const file = path.resolve(filePath);
  for (const [field, expected] of [["Package", "yansilu"], ["Version", version], ["Architecture", architecture]]) {
    const actual = runCommand("dpkg-deb", ["--field", file, field]);
    if (actual !== expected) throw new Error(`${field}: expected ${expected}, found ${actual || "missing"}.`);
    if (field === "Package") runCommand("dpkg", ["--validate-pkgname", actual]);
    if (field === "Version") runCommand("dpkg", ["--validate-version", actual]);
  }

  const extracted = fs.mkdtempSync(path.join(os.tmpdir(), "yansilu-deb-check-"));
  try {
    runCommand("dpkg-deb", ["--extract", file, extracted]);
    const entry = fs.readFileSync(path.join(extracted, "usr/share/applications/yansilu.desktop"), "utf8");
    for (const line of ["Name=研思录", "Exec=yansilu-desktop", "Icon=yansilu-desktop", "Type=Application"]) {
      if (!entry.split(/\r?\n/u).includes(line)) throw new Error(`Desktop entry is missing ${line}.`);
    }
    const runtime = path.join(extracted, "usr/lib/yansilu/desktop-api-runtime");
    const binary = path.join(extracted, "usr/bin/yansilu-desktop");
    const node = path.join(runtime, "node/node");
    for (const required of [binary, node, path.join(runtime, "apps/api/src/server.mjs")]) {
      if (!fs.statSync(required).isFile()) throw new Error(`Required Linux bundle file is missing: ${required}`);
    }
    const nodeVersion = runCommand(node, ["--version"]);
    if (!/^v\d+\.\d+\.\d+$/u.test(nodeVersion)) throw new Error(`Invalid bundled Node version: ${nodeVersion}`);
    console.log(`Linux Debian bundle verified: yansilu ${version} ${architecture}; bundled Node ${nodeVersion}`);
  } finally {
    fs.rmSync(extracted, { recursive: true, force: true });
  }
}
