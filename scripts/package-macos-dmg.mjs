import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { macosDmgLayout } from "./macos-runtime-layout.mjs";

function parseArgs(argv = []) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = String(argv[index] || "");
    const value = String(argv[index + 1] || "");
    if (!key.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`Expected --app, --out, and --volume-name options. Received: ${key}`);
    }
    index += 1;
    if (key === "--app") options.appPath = value;
    else if (key === "--out") options.outputPath = value;
    else if (key === "--volume-name") options.volumeName = value;
    else throw new Error(`Unknown option: ${key}`);
  }
  if (!options.appPath || !options.outputPath || !options.volumeName) {
    throw new Error("Expected --app <path> --out <path> --volume-name <name>.");
  }
  return options;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with code ${result.status ?? 1}.`);
}

async function verifyMacosDmg(layout) {
  const mountPoint = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-dmg-check-"));
  let attached = false;
  try {
    run("hdiutil", ["attach", layout.outputPath, "-nobrowse", "-readonly", "-mountpoint", mountPoint]);
    attached = true;
    const appStat = await fs.stat(path.join(mountPoint, path.basename(layout.appPath))).catch(() => null);
    const applicationsStat = await fs.lstat(path.join(mountPoint, layout.applicationsLinkName)).catch(() => null);
    if (!appStat?.isDirectory()) throw new Error("Packaged DMG is missing the app bundle.");
    if (!applicationsStat?.isSymbolicLink()) throw new Error("Packaged DMG is missing the Applications shortcut.");
    if (await fs.readlink(path.join(mountPoint, layout.applicationsLinkName)) !== "/Applications") {
      throw new Error("Packaged DMG Applications shortcut points to an unexpected location.");
    }
  } finally {
    if (attached) run("hdiutil", ["detach", mountPoint]);
    await fs.rm(mountPoint, { recursive: true, force: true });
  }
}

export async function packageMacosDmg(options = {}) {
  if (process.platform !== "darwin") {
    throw new Error("macOS DMG packaging can only run on macOS.");
  }
  const layout = macosDmgLayout(options);
  const appStat = await fs.stat(layout.appPath).catch(() => null);
  if (!appStat?.isDirectory()) throw new Error(`macOS app bundle was not found: ${layout.appPath}`);

  const stagingRoot = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-dmg-"));
  const stagingApp = path.join(stagingRoot, path.basename(layout.appPath));
  try {
    await fs.cp(layout.appPath, stagingApp, { recursive: true, force: true });
    await fs.symlink("/Applications", path.join(stagingRoot, layout.applicationsLinkName), "dir");
    await fs.mkdir(path.dirname(layout.outputPath), { recursive: true });
    await fs.rm(layout.outputPath, { force: true });
    await fs.rm(`${layout.outputPath}.sig`, { force: true });
    run("hdiutil", [
      "create",
      "-volname",
      layout.volumeName,
      "-srcfolder",
      stagingRoot,
      "-ov",
      "-format",
      "UDZO",
      layout.outputPath
    ]);
    await verifyMacosDmg(layout);
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }

  console.log(`macOS DMG packaged: ${layout.outputPath}`);
  console.log("Verified the image contains the app and an Applications shortcut for drag-and-drop installation.");
  return layout;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageMacosDmg(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}
