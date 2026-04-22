import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";

export function contentHash(content) {
  return createHash("sha1").update(String(content ?? "")).digest("hex");
}

export function vaultRelativePath(vaultPath, filePath) {
  const rel = path.relative(vaultPath, filePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes vault: ${filePath}`);
  }
  return rel.replaceAll("\\", "/");
}

export function resolveVaultRelativePath(vaultPath, relativePath) {
  const fullPath = path.resolve(vaultPath, relativePath);
  const rel = path.relative(vaultPath, fullPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes vault: ${relativePath}`);
  }
  return fullPath;
}

export async function createdEntryFromWriteResult(vaultPath, result) {
  const content = await fs.readFile(result.path, "utf8");
  return {
    noteId: result.noteId,
    noteType: result.noteType,
    path: vaultRelativePath(vaultPath, result.path),
    hash: contentHash(content)
  };
}

export function publicImportRecord(record) {
  if (!record) return null;
  return {
    importRecordId: record.importRecordId,
    connector: record.connector,
    status: record.state,
    state: record.state,
    summary: record.summary,
    samples: record.samples,
    warnings: record.warnings || [],
    originalityGuard: record.originalityGuard || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt || record.createdAt,
    payload: record.payload || {},
    options: record.options || {},
    confirmResult: record.confirmResult || null,
    rollbackResult: record.rollbackResult || null
  };
}

export async function appendImportRecord(vaultPath, connector, recordId, stage, body) {
  const dir = path.join(vaultPath, "imports", connector);
  await fs.mkdir(dir, { recursive: true });
  const recordPath = path.join(dir, `${recordId}.${stage}.json`);
  await fs.writeFile(recordPath, JSON.stringify(body, null, 2), "utf8");
  return recordPath;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function findImportRecordConnector(vaultPath, recordId) {
  const importsDir = path.join(vaultPath, "imports");
  let entries = [];
  try {
    entries = await fs.readdir(importsDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const connector = entry.name;
    const previewPath = path.join(importsDir, connector, `${recordId}.preview.json`);
    try {
      await fs.access(previewPath);
      return connector;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return null;
}

export async function loadImportRecord(vaultPath, recordId) {
  const connector = await findImportRecordConnector(vaultPath, recordId);
  if (!connector) return null;

  const dir = path.join(vaultPath, "imports", connector);
  const previewEnvelope = await readJsonIfExists(path.join(dir, `${recordId}.preview.json`));
  if (!previewEnvelope?.preview) return null;

  const confirmEnvelope = await readJsonIfExists(path.join(dir, `${recordId}.confirm.json`));
  const rollbackEnvelope = await readJsonIfExists(path.join(dir, `${recordId}.rollback.json`));
  const preview = previewEnvelope.preview;
  const confirmResult = confirmEnvelope
    ? {
        created: confirmEnvelope.created || {},
        skipped: confirmEnvelope.skipped || {},
        writtenPaths: confirmEnvelope.writtenPaths || [],
        createdFiles: confirmEnvelope.createdFiles || [],
        finishedAt: confirmEnvelope.finishedAt || null
      }
    : null;
  const rollbackResult = rollbackEnvelope
    ? {
        rolledBack: rollbackEnvelope.rolledBack || [],
        skipped: rollbackEnvelope.skipped || [],
        finishedAt: rollbackEnvelope.finishedAt || null
      }
    : null;

  const state = rollbackResult ? "rolled_back" : confirmResult ? "completed" : preview.status || "preview";
  return {
    ...preview,
    state,
    payload: previewEnvelope.payload || {},
    options: previewEnvelope.options || {},
    candidates: previewEnvelope.candidates || { sources: [], literature: [], permanent: [], warnings: [] },
    originalityGuard: confirmEnvelope?.originalityGuard || preview.originalityGuard || null,
    confirmResult,
    rollbackResult,
    updatedAt: rollbackResult?.finishedAt || confirmResult?.finishedAt || preview.createdAt
  };
}

export async function rollbackCreatedFiles(vaultPath, createdFiles) {
  const rolledBack = [];
  const skipped = [];

  for (const item of Array.isArray(createdFiles) ? createdFiles : []) {
    const fullPath = resolveVaultRelativePath(vaultPath, item.path);
    try {
      const current = await fs.readFile(fullPath, "utf8");
      const currentHash = contentHash(current);
      if (currentHash !== item.hash) {
        skipped.push({ ...item, reason: "modified" });
        continue;
      }
      await fs.unlink(fullPath);
      rolledBack.push(item);
    } catch (error) {
      skipped.push({ ...item, reason: String(error?.code || error?.message || error) });
    }
  }

  return { rolledBack, skipped };
}
