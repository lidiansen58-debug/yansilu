import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUNDLE_ROOT, buildManifest, writeOutputs } from "./desktop-bundle-manifest.mjs";

export async function stageDesktopBundles({ bundleRoot = BUNDLE_ROOT, outputRoot = path.resolve("output/desktop-release-assets") } = {}) {
  bundleRoot = path.resolve(bundleRoot);
  outputRoot = path.resolve(outputRoot);
  const relative = path.relative(bundleRoot, outputRoot);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Staged assets must be outside the source bundle directory.");
  }
  const manifest = await buildManifest(bundleRoot);
  await fs.mkdir(path.dirname(outputRoot), { recursive: true });
  // Refuse an existing destination instead of deleting files or retaining stale installers.
  await fs.mkdir(outputRoot);
  for (const item of manifest.items) {
    const destination = path.join(outputRoot, item.file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(bundleRoot, item.file), destination);
  }
  const stagedManifest = await buildManifest(outputRoot);
  for (const item of manifest.items) {
    const staged = stagedManifest.items.find((candidate) => candidate.file === item.file);
    if (!staged || staged.bytes !== item.bytes || staged.sha256 !== item.sha256) {
      throw new Error("Desktop asset changed while staging: " + item.file);
    }
  }
  await writeOutputs(stagedManifest);
  return stagedManifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await stageDesktopBundles();
  console.log(`Staged ${manifest.totalFiles} final desktop assets: ${manifest.root}`);
}
