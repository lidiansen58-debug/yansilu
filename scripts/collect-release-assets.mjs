import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SKIPPED_FILE_NAMES = new Set(["bundle-manifest.json", "bundle-manifest.sha256.txt"]);
const RELEASE_ASSET_EXTENSIONS = [
  ".app.tar.gz",
  ".app.tar.gz.sig",
  ".appimage",
  ".appimage.sig",
  ".deb",
  ".deb.sig",
  ".dmg",
  ".dmg.sig",
  ".exe",
  ".exe.sig",
  ".msi",
  ".msi.sig",
  ".rpm",
  ".rpm.sig"
];

function cleanText(value = "") {
  return String(value ?? "").trim();
}

async function pathExists(targetPath) {
  return fs.access(targetPath).then(() => true).catch(() => false);
}

function isReleaseAssetFile(filePath = "") {
  const fileName = path.basename(filePath).toLowerCase();
  return RELEASE_ASSET_EXTENSIONS.some((extension) => fileName.endsWith(extension));
}

async function collectFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.endsWith(".dSYM")) continue;
      files.push(...(await collectFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && !SKIPPED_FILE_NAMES.has(entry.name) && isReleaseAssetFile(fullPath)) files.push(fullPath);
  }
  return files;
}

async function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const buffer = await fs.readFile(filePath);
  hash.update(buffer);
  return hash.digest("hex").toUpperCase();
}

function releaseAssetName(record = {}, collisionCount = 1) {
  const baseName = path.basename(record.fullPath);
  if (collisionCount <= 1) return baseName;
  return `${record.artifactName}-${baseName}`;
}

export async function collectReleaseAssets({
  distDir = "dist",
  outDir = "release-assets",
  manifestOut = ""
} = {}) {
  const sourceRoot = path.resolve(cleanText(distDir) || "dist");
  const outputRoot = path.resolve(cleanText(outDir) || "release-assets");
  if (!(await pathExists(sourceRoot))) throw new Error(`Downloaded artifact directory not found: ${sourceRoot}`);

  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });

  const artifactEntries = (await fs.readdir(sourceRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  const records = [];
  for (const entry of artifactEntries) {
    const artifactRoot = path.join(sourceRoot, entry.name);
    const files = await collectFiles(artifactRoot);
    for (const fullPath of files) {
      records.push({
        artifactName: entry.name,
        fullPath,
        baseName: path.basename(fullPath)
      });
    }
  }

  if (!records.length) throw new Error(`No release asset files found under: ${sourceRoot}`);

  const collisionCounts = records.reduce((counts, record) => {
    counts.set(record.baseName, (counts.get(record.baseName) || 0) + 1);
    return counts;
  }, new Map());

  const usedNames = new Set();
  const items = [];
  for (const record of records) {
    const assetName = releaseAssetName(record, collisionCounts.get(record.baseName) || 1);
    if (usedNames.has(assetName)) throw new Error(`Release asset name collision after prefixing: ${assetName}`);
    usedNames.add(assetName);

    const targetPath = path.join(outputRoot, assetName);
    await fs.copyFile(record.fullPath, targetPath);
    const stats = await fs.stat(targetPath);
    items.push({
      file: assetName,
      bytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      sha256: await sha256(targetPath)
    });
  }

  items.sort((a, b) => a.file.localeCompare(b.file, "en"));
  const manifest = {
    generatedAt: new Date().toISOString(),
    root: outputRoot,
    totalFiles: items.length,
    items
  };

  const manifestPath = path.resolve(cleanText(manifestOut) || path.join(outputRoot, "bundle-manifest.json"));
  const checksumsPath = path.join(path.dirname(manifestPath), "bundle-manifest.sha256.txt");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(checksumsPath, `${items.map((item) => `${item.sha256}  ${item.file}`).join("\n")}\n`, "utf8");

  return {
    outputRoot,
    manifestPath,
    checksumsPath,
    totalFiles: items.length
  };
}

function parseArgs(argv = []) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Option ${key} requires a value.`);
    index += 1;
    if (key === "--dist") options.distDir = value;
    else if (key === "--out") options.outDir = value;
    else if (key === "--manifest-out") options.manifestOut = value;
    else throw new Error(`Unknown option: ${key}`);
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  collectReleaseAssets(parseArgs(process.argv.slice(2)))
    .then((result) => {
      console.log(`Release assets collected: ${result.outputRoot}`);
      console.log(`Bundle manifest written: ${result.manifestPath}`);
      console.log(`Bundle checksums written: ${result.checksumsPath}`);
      console.log(`Release asset files: ${result.totalFiles}`);
    })
    .catch((error) => {
      console.error(error?.message || error);
      process.exit(1);
    });
}
