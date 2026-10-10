import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { collectBundleAssets } from "./lib/desktop-release-assets.mjs";

const REPO_ROOT = process.cwd();
const desktopTarget = String(process.env.YANSILU_DESKTOP_TARGET || "").trim();
export const BUNDLE_ROOT = path.resolve(
  REPO_ROOT,
  "apps",
  "desktop",
  "src-tauri",
  "target",
  ...(desktopTarget ? [desktopTarget] : []),
  "release",
  "bundle"
);

async function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const buffer = await fs.readFile(filePath);
  hash.update(buffer);
  return hash.digest("hex").toUpperCase();
}

export async function buildManifest(bundleRoot = BUNDLE_ROOT) {
  const exists = await fs
    .access(bundleRoot)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    throw new Error(`bundle directory not found: ${bundleRoot}`);
  }

  const files = await collectBundleAssets(bundleRoot);
  if (!files.length) throw new Error(`No final desktop packages found: ${bundleRoot}`);
  const items = [];

  for (const fullPath of files) {
    const stats = await fs.stat(fullPath);
    items.push({
      file: path.relative(bundleRoot, fullPath).replaceAll("\\", "/"),
      bytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      sha256: await sha256(fullPath)
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    root: bundleRoot,
    totalFiles: items.length,
    items
  };
}

export async function writeOutputs(manifest) {
  const jsonPath = path.join(manifest.root, "bundle-manifest.json");
  const textPath = path.join(manifest.root, "bundle-manifest.sha256.txt");

  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(
    textPath,
    `${manifest.items.map((item) => `${item.sha256}  ${item.file}`).join("\n")}\n`,
    "utf8"
  );

  return { jsonPath, textPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputs = await writeOutputs(await buildManifest());
  console.log(`Bundle manifest written: ${outputs.jsonPath}`);
  console.log(`Bundle checksums written: ${outputs.textPath}`);
}
