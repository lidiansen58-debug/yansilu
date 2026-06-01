import path from "node:path";
import fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";

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

function uniqueCandidateIds(items = []) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item?.id || "").trim()).filter(Boolean))];
}

export function summarizeCandidateSelection(candidates = {}) {
  const sources = uniqueCandidateIds(candidates.sources);
  const literatureNotes = uniqueCandidateIds(candidates.literature);
  const permanentNotes = uniqueCandidateIds(candidates.permanent);
  return {
    sources,
    literatureNotes,
    permanentNotes,
    total: {
      sources: sources.length,
      literatureNotes: literatureNotes.length,
      permanentNotes: permanentNotes.length
    }
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
    candidateSelection: record.candidateSelection || summarizeCandidateSelection(record.candidates),
    warnings: record.warnings || [],
    originalityGuard: record.originalityGuard || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt || record.createdAt,
    payload: record.payload || {},
    options: record.options || {},
    failureResult: record.failureResult || null,
    confirmResult: record.confirmResult || null,
    rollbackResult: record.rollbackResult || null
  };
}

export async function appendImportRecord(vaultPath, connector, recordId, stage, body) {
  const dir = path.join(vaultPath, "imports", connector);
  await fs.mkdir(dir, { recursive: true });
  const recordPath = path.join(dir, `${recordId}.${stage}.json`);
  const tempPath = path.join(dir, `${recordId}.${stage}.${randomUUID().slice(0, 8)}.tmp`);
  const handle = await fs.open(tempPath, "w");
  try {
    await handle.writeFile(JSON.stringify(body, null, 2), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.rename(tempPath, recordPath);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {}
    throw error;
  }
  return recordPath;
}

export async function deleteImportRecordStage(vaultPath, connector, recordId, stage) {
  const dir = path.join(vaultPath, "imports", connector);
  const recordPath = path.join(dir, `${recordId}.${stage}.json`);
  try {
    await fs.unlink(recordPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function stageCorruption(stage, filePath, error) {
  return {
    stage,
    filePath,
    code: "IMPORT_RECORD_STAGE_CORRUPTED",
    message: String(error?.message || error || "stage json is corrupted")
  };
}

async function readStageEnvelope(filePath, stage) {
  try {
    return {
      stage,
      filePath,
      data: await readJsonIfExists(filePath),
      corruption: null
    };
  } catch (error) {
    if (error instanceof SyntaxError || error?.name === "SyntaxError") {
      return {
        stage,
        filePath,
        data: null,
        corruption: stageCorruption(stage, filePath, error)
      };
    }
    throw error;
  }
}

async function statIfExists(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function isoTimestamp(value) {
  return value instanceof Date && !Number.isNaN(value.valueOf()) ? value.toISOString() : null;
}

async function fileModifiedTimestamp(filePath) {
  const stat = await statIfExists(filePath);
  return isoTimestamp(stat?.mtime);
}

function latestTimestamp(values = []) {
  const timestamps = values.map((value) => String(value || "").trim()).filter(Boolean);
  if (!timestamps.length) return null;
  timestamps.sort((a, b) => b.localeCompare(a));
  return timestamps[0];
}

function emptyImportCandidates() {
  return { sources: [], literature: [], permanent: [], warnings: [] };
}

function emptyImportSelection() {
  return {
    sources: [],
    literatureNotes: [],
    permanentNotes: [],
    total: {
      sources: 0,
      literatureNotes: 0,
      permanentNotes: 0
    }
  };
}

function emptyImportSummary(warningCount = 0) {
  return {
    sources: 0,
    literatureNotes: 0,
    permanentNotes: 0,
    warnings: warningCount
  };
}

function emptyImportSamples() {
  return {
    sourceIds: [],
    literatureNoteIds: [],
    permanentNoteIds: []
  };
}

function selectionCandidateSelection(candidates = {}, selection = null) {
  const sourceItems = Array.isArray(candidates?.sources) ? candidates.sources : [];
  const literatureItems = Array.isArray(candidates?.literature) ? candidates.literature : [];
  const permanentItems = Array.isArray(candidates?.permanent) ? candidates.permanent : [];
  const requestedIds = Array.isArray(selection?.candidateIds)
    ? [...new Set(selection.candidateIds.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];
  if (!requestedIds.length) return null;
  const requested = new Set(requestedIds);
  return summarizeCandidateSelection({
    sources: sourceItems.filter((item) => requested.has(String(item?.id || "").trim())),
    literature: literatureItems.filter((item) => requested.has(String(item?.id || "").trim())),
    permanent: permanentItems.filter((item) => requested.has(String(item?.id || "").trim()))
  });
}

function corruptionWarning(corruption) {
  const stage = String(corruption?.stage || "unknown").trim() || "unknown";
  const fileName = path.basename(String(corruption?.filePath || "").trim() || `${stage}.json`);
  return {
    code: "IMPORT_RECORD_STAGE_CORRUPTED",
    stage,
    message: `导入记录阶段文件损坏: ${fileName}`
  };
}

function corruptionFailureResult(corruptStages = [], finishedAt = null) {
  return {
    code: "IMPORT_RECORD_STAGE_CORRUPTED",
    message: "import record stage data is corrupted",
    details: {
      stages: corruptStages.map((item) => ({
        stage: item.stage,
        filePath: item.filePath,
        message: item.message
      }))
    },
    selection: null,
    finishedAt
  };
}

function buildCorruptedImportRecord({ recordId, connector, corruptStages = [], createdAt, updatedAt }) {
  const normalizedCreatedAt = String(createdAt || updatedAt || new Date().toISOString()).trim();
  const normalizedUpdatedAt = String(updatedAt || normalizedCreatedAt).trim();
  return {
    importRecordId: recordId,
    connector,
    state: "failed",
    summary: emptyImportSummary(corruptStages.length),
    samples: emptyImportSamples(),
    candidateSelection: emptyImportSelection(),
    payload: {},
    options: {},
    candidates: emptyImportCandidates(),
    warnings: corruptStages.map(corruptionWarning),
    originalityGuard: null,
    failureResult: corruptionFailureResult(corruptStages, normalizedUpdatedAt),
    confirmResult: null,
    rollbackResult: null,
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedUpdatedAt
  };
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
  const previewPath = path.join(dir, `${recordId}.preview.json`);
  const confirmPath = path.join(dir, `${recordId}.confirm.json`);
  const cancelPath = path.join(dir, `${recordId}.cancel.json`);
  const failedPath = path.join(dir, `${recordId}.failed.json`);
  const rollbackPath = path.join(dir, `${recordId}.rollback.json`);
  const [previewStage, confirmStage, cancelStage, failedStage, rollbackStage] = await Promise.all([
    readStageEnvelope(previewPath, "preview"),
    readStageEnvelope(confirmPath, "confirm"),
    readStageEnvelope(cancelPath, "cancel"),
    readStageEnvelope(failedPath, "failed"),
    readStageEnvelope(rollbackPath, "rollback")
  ]);
  const corruptStages = [previewStage, confirmStage, cancelStage, failedStage, rollbackStage]
    .map((item) => item.corruption)
    .filter(Boolean);
  if (previewStage.corruption) {
    const [previewStat, confirmStat, cancelStat, failedStat, rollbackStat] = await Promise.all([
      statIfExists(previewPath),
      statIfExists(confirmPath),
      statIfExists(cancelPath),
      statIfExists(failedPath),
      statIfExists(rollbackPath)
    ]);
    const createdAt = isoTimestamp(previewStat?.mtime) || latestTimestamp([isoTimestamp(confirmStat?.mtime), isoTimestamp(cancelStat?.mtime), isoTimestamp(failedStat?.mtime), isoTimestamp(rollbackStat?.mtime)]) || new Date().toISOString();
    const updatedAt = latestTimestamp([
      isoTimestamp(previewStat?.mtime),
      isoTimestamp(confirmStat?.mtime),
      isoTimestamp(cancelStat?.mtime),
      isoTimestamp(failedStat?.mtime),
      isoTimestamp(rollbackStat?.mtime)
    ]) || createdAt;
    return buildCorruptedImportRecord({
      recordId,
      connector,
      corruptStages,
      createdAt,
      updatedAt
    });
  }

  const previewEnvelope = previewStage.data;
  if (!previewEnvelope?.preview) return null;

  const confirmEnvelope = confirmStage.data;
  const cancelEnvelope = cancelStage.data;
  const failedEnvelope = failedStage.data;
  const rollbackEnvelope = rollbackStage.data;
  const preview = previewEnvelope.preview;
  const failureResult = failedEnvelope
    ? {
        code: String(failedEnvelope.code || "").trim() || null,
        message: String(failedEnvelope.message || "").trim() || null,
        details: failedEnvelope.details || null,
        selection: failedEnvelope.selection || null,
        finishedAt: failedEnvelope.finishedAt || null
      }
    : null;
  const confirmResult = confirmEnvelope
    ? {
        created: confirmEnvelope.created || {},
        skipped: confirmEnvelope.skipped || {},
        selection: confirmEnvelope.selection || null,
        targetDirectories: confirmEnvelope.targetDirectories || [],
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
  const optionalCorruptStages = corruptStages.filter((item) => item.stage !== "preview");
  const optionalCorruptUpdatedAt = optionalCorruptStages.length
    ? latestTimestamp(await Promise.all(optionalCorruptStages.map((item) => fileModifiedTimestamp(item.filePath))))
    : null;
  const syntheticFailureResult =
    !rollbackResult && !confirmResult && !cancelEnvelope && !failureResult && optionalCorruptStages.length
      ? corruptionFailureResult(optionalCorruptStages, optionalCorruptUpdatedAt || preview.createdAt)
      : null;
  const state =
    rollbackResult
      ? "rolled_back"
      : failureResult || syntheticFailureResult
        ? "failed"
        : confirmResult
          ? "completed"
          : cancelEnvelope
            ? "cancelled"
            : preview.status || "preview";
  const warnings = [
    ...(Array.isArray(preview.warnings) ? preview.warnings : []),
    ...optionalCorruptStages.map(corruptionWarning)
  ];
  const effectiveFailureResult = rollbackResult ? null : failureResult || syntheticFailureResult;
  const previewCandidateSelection = preview.candidateSelection || summarizeCandidateSelection(previewEnvelope.candidates || {});
  const confirmedCandidateSelection = confirmResult ? selectionCandidateSelection(previewEnvelope.candidates || {}, confirmResult.selection) : null;
  const failedCandidateSelection =
    failedEnvelope?.candidateSelection ||
    (failureResult ? selectionCandidateSelection(previewEnvelope.candidates || {}, failureResult.selection) : null);
  const effectiveCandidateSelection =
    rollbackResult
      ? confirmedCandidateSelection || previewCandidateSelection
      : effectiveFailureResult
        ? failedCandidateSelection || previewCandidateSelection
        : confirmResult
          ? confirmedCandidateSelection || previewCandidateSelection
          : previewCandidateSelection;
  return {
    ...preview,
    state,
    warnings,
    candidateSelection: effectiveCandidateSelection,
    payload: previewEnvelope.payload || {},
    options: previewEnvelope.options || {},
    candidates: previewEnvelope.candidates || emptyImportCandidates(),
    originalityGuard: confirmEnvelope?.originalityGuard || failedEnvelope?.originalityGuard || preview.originalityGuard || null,
    failureResult: effectiveFailureResult,
    confirmResult,
    rollbackResult,
    updatedAt: rollbackResult?.finishedAt || effectiveFailureResult?.finishedAt || confirmResult?.finishedAt || cancelEnvelope?.finishedAt || optionalCorruptUpdatedAt || preview.createdAt
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
