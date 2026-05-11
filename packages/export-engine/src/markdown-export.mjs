import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getNoteById, listMarkdownFiles, listNotesInDirectoryScope } from "../../domain/src/index.mjs";
import { findVaultAssetLinks } from "../../domain/src/markdown-asset-links.mjs";

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

function exportScopeError(message) {
  const error = new Error(message);
  error.code = "EXPORT_SCOPE_INVALID";
  return error;
}

function uniqueNonEmptyStrings(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function validateNotePath({ vaultPath, sourceRoot, note }) {
  const relPath = String(note.markdownPath || "").replaceAll("\\", "/").trim();
  const fullPath = path.resolve(vaultPath, relPath);
  if (!relPath || !isPathInsideOrEqual(sourceRoot, fullPath) || !fullPath.toLowerCase().endsWith(".md")) {
    throw exportScopeError(`noteId has invalid markdown path: ${note.id || ""}`.trim());
  }
  return fullPath;
}

async function resolveMarkdownFiles({ vaultPath, sourceRoot, noteIds, directoryId, includeDescendants = true }) {
  const requestedDirectoryId = String(directoryId || "").trim();
  if (noteIds !== undefined && requestedDirectoryId) {
    throw exportScopeError("noteIds and directoryId cannot be used together");
  }

  if (noteIds === undefined && !requestedDirectoryId) {
    const files = await listMarkdownFiles(sourceRoot).catch(() => []);
    return {
      files,
      scope: { type: "all" }
    };
  }

  if (requestedDirectoryId) {
    return resolveDirectoryMarkdownFiles({
      vaultPath,
      sourceRoot,
      directoryId: requestedDirectoryId,
      includeDescendants
    });
  }

  if (!Array.isArray(noteIds)) {
    throw exportScopeError("noteIds must be an array when provided");
  }

  const ids = uniqueNonEmptyStrings(noteIds);
  if (!ids.length) throw exportScopeError("noteIds must contain at least one note id");

  const files = [];
  for (const noteId of ids) {
    let note;
    try {
      note = await getNoteById(vaultPath, noteId);
    } catch {
      throw exportScopeError(`noteId not found: ${noteId}`);
    }

    files.push(validateNotePath({ vaultPath, sourceRoot, note }));
  }

  return {
    files,
    scope: { type: "noteIds", noteIds: ids }
  };
}

async function resolveDirectoryMarkdownFiles({ vaultPath, sourceRoot, directoryId, includeDescendants }) {
  let notes;
  try {
    notes = await listNotesInDirectoryScope(vaultPath, directoryId, { includeDescendants });
  } catch (error) {
    throw exportScopeError(String(error?.message || error));
  }

  return {
    files: notes.map((note) => validateNotePath({ vaultPath, sourceRoot, note })),
    scope: { type: "directory", directoryId, includeDescendants }
  };
}

async function resolveAssetFiles({ vaultPath, assetsRoot, sourceRoot, files, scope }) {
  if (scope.type === "all") return listAllFiles(assetsRoot);

  const assetPaths = new Set();
  for (const file of files) {
    const markdown = await fs.readFile(file, "utf8");
    const noteRelPath = toPortablePath(path.join("notes", path.relative(sourceRoot, file)));
    for (const assetRelPath of findVaultAssetLinks(markdown, noteRelPath)) {
      assetPaths.add(assetRelPath);
    }
  }

  const out = [];
  for (const assetRelPath of [...assetPaths].sort((a, b) => a.localeCompare(b))) {
    const fullPath = path.resolve(vaultPath, assetRelPath);
    if (!isPathInsideOrEqual(assetsRoot, fullPath)) continue;
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) out.push(fullPath);
    } catch {}
  }
  return out;
}

export async function exportMarkdown({
  vaultPath,
  targetPath,
  noteIds,
  directoryId,
  includeDescendants = true,
  requestId = null,
  now = new Date()
}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  if (!targetPath) throw new Error("targetPath is required");

  const resolvedVaultPath = path.resolve(vaultPath);
  const resolvedTargetPath = path.resolve(targetPath);
  if (isPathInsideOrEqual(resolvedVaultPath, resolvedTargetPath)) {
    throw exportTargetInsideVaultError();
  }

  const sourceRoot = path.join(resolvedVaultPath, "notes");
  const { files, scope } = await resolveMarkdownFiles({
    vaultPath: resolvedVaultPath,
    sourceRoot,
    noteIds,
    directoryId,
    includeDescendants
  });
  const assetsRoot = path.join(resolvedVaultPath, "assets");
  const assetFiles = await resolveAssetFiles({
    vaultPath: resolvedVaultPath,
    assetsRoot,
    sourceRoot,
    files,
    scope
  });
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
    scope,
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
    scope,
    exportedFiles,
    recordPath,
    record
  };
}
