import fs from "node:fs/promises";

export async function copyMacosBundleDirectory(source, target, copy = fs.cp) {
  // npm and framework links must remain relative after staging folders are removed.
  await copy(source, target, { recursive: true, force: true, verbatimSymlinks: true });
}
