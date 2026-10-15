import fs from "node:fs/promises";
import path from "node:path";

const EXTENSIONS = [".app.tar.gz", ".appimage", ".deb", ".dmg", ".exe", ".msi", ".rpm"];
const PACKAGE_FOLDERS = new Set(["macos", "appimage", "deb", "dmg", "nsis", "msi", "rpm"]);

export function isReleaseAssetFile(filePath) {
  const name = path.basename(filePath).toLowerCase();
  return EXTENSIONS.some((extension) => name.endsWith(extension) || name.endsWith(`${extension}.sig`));
}

export function isExpandedBundleDirectory(name) {
  return /\.(?:app|appdir|dsym)$/i.test(name) || name === "node_modules";
}

// Tauri's final packages are at the bundle root or one packager folder below it.
// Never descend into the expanded application, Linux AppDir or packaging tools.
export async function collectBundleAssets(bundleRoot) {
  const files = [];
  const entries = await fs.readdir(bundleRoot, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(bundleRoot, entry.name);
    if (entry.isFile() && isReleaseAssetFile(entry.name)) files.push(fullPath);
    if (!entry.isDirectory() || !PACKAGE_FOLDERS.has(entry.name.toLowerCase())) continue;
    for (const child of await fs.readdir(fullPath, { withFileTypes: true })) {
      if (child.isFile() && isReleaseAssetFile(child.name)) files.push(path.join(fullPath, child.name));
    }
  }
  return files.sort((a, b) => a.localeCompare(b, "en"));
}
