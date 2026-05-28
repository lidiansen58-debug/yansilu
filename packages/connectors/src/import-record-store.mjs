import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";

export function contentHash(content) {
  // Prefer hashing raw bytes (Buffer) when available so both text + binary files are supported.
  const input = Buffer.isBuffer(content) ? content : Buffer.from(String(content ?? ""), "utf8");
  return createHash("sha1").update(input).digest("hex");
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

export async function createdEntryFromVaultPath(vaultPath, { noteId, noteType, filePath }) {
  const content = await fs.readFile(filePath);
  return {
    noteId,
    noteType,
    path: vaultRelativePath(vaultPath, filePath),
    hash: contentHash(content)
  };
}

export async function createdEntryFromWriteResult(vaultPath, result) {
  return createdEntryFromVaultPath(vaultPath, {
    noteId: result.noteId,
    noteType: result.noteType,
    filePath: result.path
  });
}

function excerpt(value, max = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}

function candidateTitle(candidate, fallback) {
  return String(candidate?.title || candidate?.id || fallback || "Untitled").trim();
}

function summarizeSource(candidate) {
  return {
    id: String(candidate?.id || ""),
    type: "Source",
    title: candidateTitle(candidate, "Source"),
    sourceType: candidate?.source_type || "",
    importedFrom: candidate?.imported_from || candidate?.connector || "",
    status: candidate?.status || "candidate",
    tags: Array.isArray(candidate?.tags) ? candidate.tags.slice(0, 8) : []
  };
}

function summarizeLiterature(candidate) {
  return {
    id: String(candidate?.id || ""),
    type: "LiteratureNote",
    title: candidateTitle(candidate, "LiteratureNote"),
    sourceId: candidate?.source_id || "",
    importedFrom: candidate?.imported_from || candidate?.connector || "",
    status: candidate?.status || "draft",
    locator: candidate?.locator || "",
    excerpt: excerpt(candidate?.quote_text || candidate?.paraphrase_text || ""),
    tags: Array.isArray(candidate?.tags) ? candidate.tags.slice(0, 8) : []
  };
}

function summarizePermanent(candidate, evaluationById) {
  const evaluation = evaluationById.get(candidate?.id) || null;
  return {
    id: String(candidate?.id || ""),
    type: "PermanentNote",
    title: candidateTitle(candidate, "PermanentNote"),
    status: candidate?.status || "draft",
    originalityStatus: evaluation?.status || candidate?.originality_status || "warning",
    reasons: Array.isArray(evaluation?.reasons) ? evaluation.reasons : [],
    excerpt: excerpt(candidate?.core_claim || candidate?.rationale || ""),
    tags: Array.isArray(candidate?.tags) ? candidate.tags.slice(0, 8) : []
  };
}

export function summarizeImportCandidates(candidates = {}, originalityGuard = null, limit = 12) {
  const sources = Array.isArray(candidates.sources) ? candidates.sources : [];
  const literature = Array.isArray(candidates.literature) ? candidates.literature : [];
  const permanent = Array.isArray(candidates.permanent) ? candidates.permanent : [];
  const evaluationById = new Map(
    (Array.isArray(originalityGuard?.evaluations) ? originalityGuard.evaluations : []).map((item) => [item.permanentId || item.id, item])
  );

  return {
    sources: sources.slice(0, limit).map(summarizeSource),
    literatureNotes: literature.slice(0, limit).map(summarizeLiterature),
    permanentNotes: permanent.slice(0, limit).map((candidate) => summarizePermanent(candidate, evaluationById)),
    total: {
      sources: sources.length,
      literatureNotes: literature.length,
      permanentNotes: permanent.length
    },
    truncated: sources.length > limit || literature.length > limit || permanent.length > limit
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
    candidatePreview: record.candidatePreview || summarizeImportCandidates(record.candidates, record.originalityGuard),
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
  const cancelEnvelope = await readJsonIfExists(path.join(dir, `${recordId}.cancel.json`));
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

  const state = rollbackResult ? "rolled_back" : confirmResult ? "completed" : cancelEnvelope ? "cancelled" : preview.status || "preview";
  return {
    ...preview,
    state,
    payload: previewEnvelope.payload || {},
    options: previewEnvelope.options || {},
    candidates: previewEnvelope.candidates || { sources: [], literature: [], permanent: [], warnings: [] },
    originalityGuard: confirmEnvelope?.originalityGuard || preview.originalityGuard || null,
    confirmResult,
    rollbackResult,
    updatedAt: rollbackResult?.finishedAt || confirmResult?.finishedAt || cancelEnvelope?.finishedAt || preview.createdAt
  };
}

export async function listImportRecords(vaultPath, { limit = 50 } = {}) {
  const importsDir = path.join(vaultPath, "imports");
  let connectorDirs = [];
  try {
    connectorDirs = await fs.readdir(importsDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const records = [];
  for (const connectorDir of connectorDirs) {
    if (!connectorDir.isDirectory()) continue;
    const connectorPath = path.join(importsDir, connectorDir.name);
    const files = await fs.readdir(connectorPath, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith(".preview.json")) continue;
      const recordId = file.name.slice(0, -".preview.json".length);
      const record = await loadImportRecord(vaultPath, recordId);
      if (record) records.push(record);
    }
  }

  records.sort((a, b) => {
    const byUpdatedAt = String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
    if (byUpdatedAt !== 0) return byUpdatedAt;
    return String(b.importRecordId || "").localeCompare(String(a.importRecordId || ""));
  });

  const n = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 50;
  return records.slice(0, n);
}

export async function rollbackCreatedFiles(vaultPath, createdFiles) {
  const rolledBack = [];
  const skipped = [];

  for (const item of Array.isArray(createdFiles) ? createdFiles : []) {
    const fullPath = resolveVaultRelativePath(vaultPath, item.path);
    try {
      const current = await fs.readFile(fullPath);
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
