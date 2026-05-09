import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const REPO_ROOT = process.cwd();
const BUNDLE_ROOT = path.resolve(REPO_ROOT, "apps", "desktop", "src-tauri", "target", "release", "bundle");
const MANIFEST_FILE_NAMES = new Set(["bundle-manifest.json", "bundle-manifest.sha256.txt"]);

async function collectFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }
    if (MANIFEST_FILE_NAMES.has(entry.name)) continue;
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

async function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const buffer = await fs.readFile(filePath);
  hash.update(buffer);
  return hash.digest("hex").toUpperCase();
}

async function buildManifest() {
  const exists = await fs
    .access(BUNDLE_ROOT)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    throw new Error(`bundle directory not found: ${BUNDLE_ROOT}`);
  }

  const files = await collectFiles(BUNDLE_ROOT);
  const items = [];

  for (const fullPath of files) {
    const stats = await fs.stat(fullPath);
    items.push({
      file: path.relative(BUNDLE_ROOT, fullPath).replaceAll("\\", "/"),
      bytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      sha256: await sha256(fullPath)
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    root: BUNDLE_ROOT,
    totalFiles: items.length,
    items
  };
}

async function writeOutputs(manifest) {
  const jsonPath = path.join(BUNDLE_ROOT, "bundle-manifest.json");
  const textPath = path.join(BUNDLE_ROOT, "bundle-manifest.sha256.txt");

  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(
    textPath,
    `${manifest.items.map((item) => `${item.sha256}  ${item.file}`).join("\n")}\n`,
    "utf8"
  );

  return { jsonPath, textPath };
}

const manifest = await buildManifest();
const outputs = await writeOutputs(manifest);

console.log(`Bundle manifest written: ${outputs.jsonPath}`);
console.log(`Bundle checksums written: ${outputs.textPath}`);
