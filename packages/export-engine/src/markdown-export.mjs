import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { listMarkdownFiles } from "../../domain/src/index.mjs";

async function listAllFiles(root) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listAllFiles(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

export async function exportMarkdown({ vaultPath, targetPath, requestId = null, now = new Date() }) {
  if (!vaultPath) throw new Error("vaultPath is required");
  if (!targetPath) throw new Error("targetPath is required");

  const sourceRoot = path.join(vaultPath, "notes");
  const files = await listMarkdownFiles(sourceRoot).catch(() => []);
  const assetsRoot = path.join(vaultPath, "assets");
  const assetFiles = await listAllFiles(assetsRoot);
  const exportJobId = `exp_${Date.now()}_${randomUUID().slice(0, 8)}`;

  await fs.mkdir(targetPath, { recursive: true });
  for (const src of files) {
    const rel = path.relative(sourceRoot, src);
    const dest = path.join(targetPath, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }

  if (assetFiles.length) {
    for (const src of assetFiles) {
      const rel = path.relative(assetsRoot, src);
      const dest = path.join(targetPath, "assets", rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
    }
  }

  const copiedBreakdown = {
    markdownFiles: files.length,
    assetFiles: assetFiles.length,
    totalFiles: files.length + assetFiles.length
  };

  const record = {
    exportJobId,
    copied: copiedBreakdown.totalFiles,
    copiedBreakdown,
    targetPath,
    requestId,
    time: now.toISOString()
  };

  const exportDir = path.join(vaultPath, "exports");
  await fs.mkdir(exportDir, { recursive: true });
  const recordPath = path.join(exportDir, `${exportJobId}.json`);
  await fs.writeFile(recordPath, JSON.stringify(record, null, 2), "utf8");

  return {
    exportJobId,
    status: "queued",
    copied: record.copied,
    copiedBreakdown,
    recordPath,
    record
  };
}
