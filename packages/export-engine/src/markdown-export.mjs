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

function toPortablePath(value) {
  return String(value || "").split(path.sep).join("/");
}

function isPathInsideOrEqual(parentPath, childPath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function exportTargetInsideVaultError() {
  const error = new Error("targetPath must be outside the active vault");
  error.code = "EXPORT_TARGET_INSIDE_VAULT";
  return error;
}

export async function exportMarkdown({ vaultPath, targetPath, requestId = null, now = new Date() }) {
  if (!vaultPath) throw new Error("vaultPath is required");
  if (!targetPath) throw new Error("targetPath is required");

  const resolvedVaultPath = path.resolve(vaultPath);
  const resolvedTargetPath = path.resolve(targetPath);
  if (isPathInsideOrEqual(resolvedVaultPath, resolvedTargetPath)) {
    throw exportTargetInsideVaultError();
  }

  const sourceRoot = path.join(resolvedVaultPath, "notes");
  const files = await listMarkdownFiles(sourceRoot).catch(() => []);
  const assetsRoot = path.join(resolvedVaultPath, "assets");
  const assetFiles = await listAllFiles(assetsRoot);
  const exportJobId = `exp_${Date.now()}_${randomUUID().slice(0, 8)}`;

  await fs.mkdir(resolvedTargetPath, { recursive: true });
  const exportedFiles = [];
  for (const src of files) {
    const rel = path.relative(sourceRoot, src);
    const dest = path.join(resolvedTargetPath, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    exportedFiles.push({
      kind: "markdown",
      sourcePath: toPortablePath(path.join("notes", rel)),
      targetPath: toPortablePath(rel)
    });
  }

  if (assetFiles.length) {
    for (const src of assetFiles) {
      const rel = path.relative(assetsRoot, src);
      const dest = path.join(resolvedTargetPath, "assets", rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
      exportedFiles.push({
        kind: "asset",
        sourcePath: toPortablePath(path.join("assets", rel)),
        targetPath: toPortablePath(path.join("assets", rel))
      });
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
    targetPath: resolvedTargetPath,
    requestId,
    exportedFiles,
    time: now.toISOString()
  };

  const exportDir = path.join(resolvedVaultPath, "exports");
  await fs.mkdir(exportDir, { recursive: true });
  const recordPath = path.join(exportDir, `${exportJobId}.json`);
  await fs.writeFile(recordPath, JSON.stringify(record, null, 2), "utf8");

  return {
    exportJobId,
    status: "queued",
    copied: record.copied,
    copiedBreakdown,
    exportedFiles,
    recordPath,
    record
  };
}
