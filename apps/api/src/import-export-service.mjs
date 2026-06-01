import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import {
  appendImportRecord,
  buildExternalCandidates,
  contentHash,
  createdEntryFromVaultPath,
  createdEntryFromWriteResult,
  deleteImportRecordStage,
  listImportRecords,
  loadImportRecord,
  rollbackCreatedFiles,
  summarizeCandidateSelection,
  summarizeImportCandidates,
  vaultRelativePath
} from "../../../packages/connectors/src/index.mjs";
import { buildNotePathIndex, listDirectories, listNoteCatalogEntriesByType, parseMarkdownWithFrontmatter } from "../../../packages/domain/src/index.mjs";
import { exportMarkdown } from "../../../packages/export-engine/src/index.mjs";
import { buildMarkdownCandidates } from "../../../packages/markdown-engine/src/index.mjs";
import { normalizeOriginalityPlan, originalityGuard } from "../../../packages/originality-guard/src/index.mjs";

function stableAssetId(importRecordId, relativePath) {
  const hash = createHash("sha1").update(`${importRecordId}:${relativePath}`).digest("hex").slice(0, 12);
  return `asset_${hash}`;
}

function normalizeRelativeFileTarget(value) {
  const raw = String(value || "").trim().replaceAll("\\", "/");
  if (!raw) return null;
  if (raw.startsWith("/") || raw.includes("://")) return null;
  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === "." || normalized.startsWith("..") || normalized.includes("/../")) return null;
  return normalized;
}

function isPermanentDirectoryId(value) {
  const directoryId = String(value || "").trim();
  if (!directoryId) return false;
  return directoryId === "dir_original_default";
}

function cleanMarkdownTitle(value) {
  return String(value || "").replace(/^#+\s*/, "").replace(/\r?\n/g, " ").trim();
}

function titleFromMarkdownBody(markdown = "", fallback = "") {
  const parsed = parseMarkdownWithFrontmatter(markdown);
  const frontmatterTitle = cleanMarkdownTitle(parsed?.frontmatter?.title);
  if (frontmatterTitle) {
    return {
      title: frontmatterTitle,
      status: String(parsed?.frontmatter?.status || "").trim() || null
    };
  }
  const firstMeaningfulLine = String(parsed?.body || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const headingMatch = firstMeaningfulLine?.match(/^#{1,6}\s+(.+)$/);
  const title = cleanMarkdownTitle(headingMatch ? headingMatch[1] : firstMeaningfulLine || fallback || "");
  return {
    title: title || cleanMarkdownTitle(fallback) || "Untitled",
    status: String(parsed?.frontmatter?.status || "").trim() || null
  };
}

function rootDirectoryIdFor(directories = [], directoryId = "") {
  const byId = new Map((Array.isArray(directories) ? directories : []).map((item) => [String(item?.id || "").trim(), item]));
  let cursor = byId.get(String(directoryId || "").trim());
  while (cursor?.parentDirectoryId) {
    cursor = byId.get(String(cursor.parentDirectoryId || "").trim());
  }
  return String(cursor?.id || "").trim();
}

function candidateSelectionFromSelection(candidates = {}, selection = null) {
  const requestedIds = Array.isArray(selection?.candidateIds)
    ? [...new Set(selection.candidateIds.map((item) => String(item || "").trim()).filter(Boolean))]
    : null;
  if (!requestedIds || !requestedIds.length) return summarizeCandidateSelection(candidates);
  return summarizeCandidateSelection(buildSelectedImportCandidates(candidates, requestedIds).candidates);
}

function importedNoteTargetDirectory(directories = [], selectedDirectoryId = "", noteType = "") {
  const cleanSelectedDirectoryId = String(selectedDirectoryId || "").trim();
  const rootDirectoryId = rootDirectoryIdFor(directories, cleanSelectedDirectoryId);
  const cleanNoteType = String(noteType || "").trim();
  if (cleanNoteType === "literature" && rootDirectoryId === "dir_literature_default") return cleanSelectedDirectoryId;
  if (cleanNoteType === "permanent" && rootDirectoryId === "dir_original_default") return cleanSelectedDirectoryId;
  if (cleanNoteType === "literature") return "dir_literature_default";
  if (cleanNoteType === "permanent") return "dir_original_default";
  return "";
}

function validateSelectedImportDirectoryScope(directories = [], selectedDirectoryId = "", selectedCandidates = {}) {
  const cleanSelectedDirectoryId = String(selectedDirectoryId || "").trim();
  if (!cleanSelectedDirectoryId) return;
  const rootDirectoryId = rootDirectoryIdFor(directories, cleanSelectedDirectoryId);
  const hasLiterature = Array.isArray(selectedCandidates.literature) && selectedCandidates.literature.length > 0;
  const hasPermanent = Array.isArray(selectedCandidates.permanent) && selectedCandidates.permanent.length > 0;

  if (hasLiterature && rootDirectoryId !== "dir_literature_default") {
    const error = new Error("directoryId must be a literature-note directory for the selected literature notes");
    error.code = "IMPORT_DIRECTORY_SCOPE_INVALID";
    throw error;
  }

  if (hasPermanent && rootDirectoryId !== "dir_original_default") {
    const error = new Error("directoryId must be a permanent-note directory for the selected permanent notes");
    error.code = "IMPORT_DIRECTORY_SCOPE_INVALID";
    throw error;
  }
}

function directoryById(directories = [], directoryId = "") {
  const cleanDirectoryId = String(directoryId || "").trim();
  return (Array.isArray(directories) ? directories : []).find((item) => String(item?.id || "").trim() === cleanDirectoryId) || null;
}

function directoryPathLabel(directories = [], directoryId = "") {
  const byId = new Map((Array.isArray(directories) ? directories : []).map((item) => [String(item?.id || "").trim(), item]));
  const names = [];
  let cursor = byId.get(String(directoryId || "").trim());
  while (cursor) {
    names.unshift(String(cursor.title || cursor.name || cursor.id || "").trim());
    cursor = cursor.parentDirectoryId ? byId.get(String(cursor.parentDirectoryId || "").trim()) : null;
  }
  return names.filter(Boolean).join(" / ");
}

function catalogEntryMap(entries = []) {
  return new Map((Array.isArray(entries) ? entries : []).map((item) => [String(item?.id || "").trim(), item]));
}

async function isPermanentDirectoryScope(vaultPath, directoryId) {
  const cleanDirectoryId = String(directoryId || "").trim();
  if (!cleanDirectoryId) return false;
  const directories = await listDirectories(vaultPath, { includeHidden: true });
  const originalRoot = directories.find((item) => isPermanentDirectoryId(item.id));
  const directory = directories.find((item) => item.id === cleanDirectoryId);
  if (!originalRoot || !directory) return false;
  const relativePath = path.relative(originalRoot.fsPath, directory.fsPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function bucketFromCandidateId(candidates = {}) {
  const buckets = new Map();
  for (const item of Array.isArray(candidates.sources) ? candidates.sources : []) {
    if (item?.id) buckets.set(String(item.id), "sources");
  }
  for (const item of Array.isArray(candidates.literature) ? candidates.literature : []) {
    if (item?.id) buckets.set(String(item.id), "literature");
  }
  for (const item of Array.isArray(candidates.permanent) ? candidates.permanent : []) {
    if (item?.id) buckets.set(String(item.id), "permanent");
  }
  return buckets;
}

export function buildSelectedImportCandidates(candidates = {}, selectedCandidateIds) {
  const sources = Array.isArray(candidates.sources) ? candidates.sources : [];
  const literature = Array.isArray(candidates.literature) ? candidates.literature : [];
  const permanent = Array.isArray(candidates.permanent) ? candidates.permanent : [];
  const totalCandidates = sources.length + literature.length + permanent.length;
  const byId = bucketFromCandidateId(candidates);

  if (selectedCandidateIds === undefined) {
    return {
      candidates: { sources, literature, permanent },
      selection: {
        mode: "all",
        candidateIds: [...byId.keys()],
        totalCandidates,
        selectedCandidates: totalCandidates,
        counts: {
          sources: sources.length,
          literatureNotes: literature.length,
          permanentNotes: permanent.length
        }
      }
    };
  }

  if (!Array.isArray(selectedCandidateIds)) {
    const error = new Error("selectedCandidateIds must be an array");
    error.code = "IMPORT_SELECTED_CANDIDATES_INVALID";
    throw error;
  }

  const requestedIds = [...new Set(selectedCandidateIds.map((item) => String(item || "").trim()).filter(Boolean))];
  if (!requestedIds.length) {
    const error = new Error("selectedCandidateIds must contain at least one candidate id");
    error.code = "IMPORT_SELECTION_EMPTY";
    throw error;
  }

  const unknownCandidateIds = requestedIds.filter((id) => !byId.has(id));
  if (unknownCandidateIds.length) {
    const error = new Error("selectedCandidateIds contains unknown candidate ids");
    error.code = "IMPORT_SELECTED_CANDIDATES_INVALID";
    error.details = { unknownCandidateIds };
    throw error;
  }

  const selectedSet = new Set(requestedIds);
  const selectedSources = sources.filter((item) => selectedSet.has(String(item?.id || "")));
  const selectedLiterature = literature.filter((item) => selectedSet.has(String(item?.id || "")));
  const selectedPermanent = permanent.filter((item) => selectedSet.has(String(item?.id || "")));

  return {
    candidates: {
      sources: selectedSources,
      literature: selectedLiterature,
      permanent: selectedPermanent
    },
    selection: {
      mode: requestedIds.length === totalCandidates ? "all" : "subset",
      candidateIds: requestedIds,
      totalCandidates,
      selectedCandidates: requestedIds.length,
      counts: {
        sources: selectedSources.length,
        literatureNotes: selectedLiterature.length,
        permanentNotes: selectedPermanent.length
      }
    }
  };
}

export function createImportExportService({
  getVaultPath,
  getCwd,
  importRecords,
  initVault,
  writeSourceIfAbsent,
  writeLiteratureNoteIfAbsent,
  writePermanentNoteIfAbsent,
  deleteNoteById,
  registerImportCatalogNote,
  appendImportRecord: appendImportRecordImpl = appendImportRecord,
  createdEntryFromWriteResult: materializeCreatedEntryFromWriteResult = createdEntryFromWriteResult,
  createdEntryFromVaultPath: materializeCreatedEntryFromVaultPath = createdEntryFromVaultPath,
  rollbackCreatedFiles: rollbackCreatedFilesImpl = rollbackCreatedFiles
}) {
  const vaultPath = () => getVaultPath();
  const cwd = () => getCwd();

  function createdFileAbsolutePath(item) {
    const relativePath = String(item?.path || "").trim();
    if (!relativePath) return "";
    const fullPath = path.resolve(vaultPath(), relativePath);
    const rel = path.relative(vaultPath(), fullPath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return "";
    return fullPath;
  }

  async function preserveSkippedCreatedArtifacts(skipped = []) {
    const preserved = [];
    const failed = [];
    for (const item of Array.isArray(skipped) ? skipped : []) {
      if (String(item?.reason || "").trim() !== "modified") continue;
      const sourcePath = createdFileAbsolutePath(item);
      if (!sourcePath) continue;
      try {
        await fs.access(sourcePath);
      } catch {
        continue;
      }
      const parsed = path.parse(sourcePath);
      const typeSegment = String(item?.noteType || "file")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_") || "file";
      const recoveryDir = path.join(vaultPath(), "imports", "recovered-failed-imports", typeSegment);
      const recoveredName = `${parsed.name}.preserved-${randomUUID().slice(0, 8)}${parsed.ext || ""}`;
      try {
        await fs.mkdir(recoveryDir, { recursive: true });
        const recoveredPath = path.join(recoveryDir, recoveredName);
        try {
          await fs.rename(sourcePath, recoveredPath);
        } catch (renameError) {
          await fs.copyFile(sourcePath, recoveredPath);
          await fs.unlink(sourcePath);
        }
        preserved.push({
          ...item,
          preservedPath: path.relative(vaultPath(), recoveredPath).replaceAll("\\", "/")
        });
      } catch (error) {
        failed.push({
          ...item,
          preserveError: String(error?.code || error?.message || error),
          reason: "modified_preserve_failed"
        });
      }
    }
    return { preserved, failed };
  }

  function buildCleanupFailure(failed = []) {
    if (!failed.length) return null;
    const error = new Error("failed to preserve modified files during import cleanup");
    error.code = "IMPORT_CLEANUP_PRESERVE_FAILED";
    error.details = {
      failedFiles: failed.map((item) => ({
        noteId: item.noteId || null,
        noteType: item.noteType || null,
        path: item.path || "",
        reason: item.reason || "",
        preserveError: item.preserveError || ""
      }))
    };
    return error;
  }

  async function cleanupCreatedArtifacts(createdFiles = []) {
    const { rolledBack, skipped } = await rollbackCreatedFilesImpl(vaultPath(), createdFiles);
    const { preserved, failed } = await preserveSkippedCreatedArtifacts(skipped);
    const cleanedNotes = new Set();
    for (const item of rolledBack) {
      if (item.noteType === "literature" || item.noteType === "permanent") {
        const key = `${item.noteType}:${item.noteId}`;
        if (cleanedNotes.has(key)) continue;
        cleanedNotes.add(key);
        try {
          await deleteNoteById(vaultPath(), item.noteId);
        } catch {}
      }
    }
    const preservedKeys = new Set(preserved.map((item) => `${item.noteType}:${item.noteId}:${item.path}`));
    for (const item of skipped) {
      if (item.noteType === "literature" || item.noteType === "permanent") {
        if (String(item.reason || "").trim() === "modified" && !preservedKeys.has(`${item.noteType}:${item.noteId}:${item.path}`)) {
          continue;
        }
        const key = `${item.noteType}:${item.noteId}`;
        if (cleanedNotes.has(key)) continue;
        cleanedNotes.add(key);
        try {
          await deleteNoteById(vaultPath(), item.noteId, { deleteFile: false });
        } catch {}
      }
    }
    const cleanupFailure = buildCleanupFailure(failed);
    if (cleanupFailure) throw cleanupFailure;
  }

  function rollbackBackupPath(stageRoot, relativePath = "") {
    return path.join(stageRoot, ...String(relativePath || "").split("/").filter(Boolean));
  }

  async function moveRollbackConflictBackup(item, rollbackId = "") {
    const conflictRoot = path.join(
      vaultPath(),
      "imports",
      "rollback-recovery-conflicts",
      `${String(rollbackId || "rollback").trim() || "rollback"}-${randomUUID().slice(0, 8)}`
    );
    const conflictPath = rollbackBackupPath(conflictRoot, item.path);
    await fs.mkdir(path.dirname(conflictPath), { recursive: true });
    await fs.rename(item.stagedPath, conflictPath);
    return path.relative(vaultPath(), conflictPath).replaceAll("\\", "/");
  }

  function buildRollbackRestoreConflict(conflicts = []) {
    const error = new Error("rollback restore preserved newer files without overwriting them");
    error.code = "IMPORT_ROLLBACK_RESTORE_CONFLICT";
    error.details = {
      conflicts: conflicts.map((item) => ({
        noteId: item.noteId || null,
        noteType: item.noteType || null,
        path: item.path || "",
        preservedPath: item.preservedPath || "",
        reason: item.reason || ""
      }))
    };
    return error;
  }

  async function rollbackCreatedFilesWithRecovery(createdFiles = [], rollbackId = "") {
    if (rollbackCreatedFilesImpl !== rollbackCreatedFiles) {
      const result = await rollbackCreatedFilesImpl(vaultPath(), createdFiles);
      return {
        rolledBack: Array.isArray(result?.rolledBack) ? result.rolledBack : [],
        skipped: Array.isArray(result?.skipped) ? result.skipped : [],
        backups: [],
        stageRoot: ""
      };
    }

    const rolledBack = [];
    const skipped = [];
    const backups = [];
    const stageRoot = path.join(vaultPath(), "imports", "rollback-staging", `${String(rollbackId || "rollback").trim() || "rollback"}-${randomUUID().slice(0, 8)}`);

    for (const item of Array.isArray(createdFiles) ? createdFiles : []) {
      const fullPath = createdFileAbsolutePath(item);
      if (!fullPath) {
        skipped.push({ ...item, reason: "PATH_INVALID" });
        continue;
      }
      try {
        const current = await fs.readFile(fullPath);
        const currentHash = contentHash(current);
        if (currentHash !== item.hash) {
          skipped.push({ ...item, reason: "modified" });
          continue;
        }
        const stagedPath = rollbackBackupPath(stageRoot, item.path);
        await fs.mkdir(path.dirname(stagedPath), { recursive: true });
        await fs.rename(fullPath, stagedPath);
        backups.push({
          ...item,
          fullPath,
          stagedPath
        });
        rolledBack.push(item);
      } catch (error) {
        skipped.push({ ...item, reason: String(error?.code || error?.message || error) });
      }
    }

    return { rolledBack, skipped, backups, stageRoot };
  }

  async function restoreRolledBackFiles(backups = [], rollbackId = "") {
    const restored = [];
    const conflicts = [];
    for (const item of Array.isArray(backups) ? backups : []) {
      if (!item?.fullPath || !item?.stagedPath) continue;
      await fs.mkdir(path.dirname(item.fullPath), { recursive: true });
      let current = null;
      try {
        current = await fs.readFile(item.fullPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      if (current) {
        const currentHash = contentHash(current);
        if (currentHash === item.hash) {
          await fs.unlink(item.stagedPath);
          restored.push({ ...item, restoredPath: item.path || "", restoreState: "already_present" });
          continue;
        }
        const preservedPath = await moveRollbackConflictBackup(item, rollbackId);
        conflicts.push({
          ...item,
          reason: "destination_modified",
          preservedPath
        });
        continue;
      }
      try {
        await fs.rename(item.stagedPath, item.fullPath);
        restored.push({ ...item, restoredPath: item.path || "" });
        continue;
      } catch {}

      try {
        current = await fs.readFile(item.fullPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        current = null;
      }
      if (current) {
        const currentHash = contentHash(current);
        if (currentHash === item.hash) {
          await fs.unlink(item.stagedPath);
          restored.push({ ...item, restoredPath: item.path || "", restoreState: "already_present" });
          continue;
        }
        const preservedPath = await moveRollbackConflictBackup(item, rollbackId);
        conflicts.push({
          ...item,
          reason: "destination_modified",
          preservedPath
        });
        continue;
      }
      await fs.copyFile(item.stagedPath, item.fullPath);
      await fs.unlink(item.stagedPath);
      restored.push({ ...item, restoredPath: item.path || "", restoreState: "copied" });
    }
    return { restored, conflicts };
  }

  async function discardRolledBackFileBackups(stageRoot = "") {
    const cleanStageRoot = String(stageRoot || "").trim();
    if (!cleanStageRoot) return;
    try {
      await fs.rm(cleanStageRoot, { recursive: true, force: true });
    } catch {}
  }

  function targetDirectoryMapForConfirmResult(confirmResult = null) {
    return new Map(
      (Array.isArray(confirmResult?.targetDirectories) ? confirmResult.targetDirectories : []).map((item) => [
        String(item?.noteType || "").trim(),
        String(item?.directoryId || "").trim()
      ])
    );
  }

  function importCandidateForRollback(candidates = {}, noteType = "", noteId = "") {
    const cleanNoteId = String(noteId || "").trim();
    const bucket =
      noteType === "literature"
        ? candidates?.literature
        : noteType === "permanent"
          ? candidates?.permanent
          : [];
    return (Array.isArray(bucket) ? bucket : []).find((item) => String(item?.id || "").trim() === cleanNoteId) || null;
  }

  async function deleteRolledBackCatalogEntries(rolledBack = []) {
    const deleted = [];
    for (const item of Array.isArray(rolledBack) ? rolledBack : []) {
      if (item.noteType !== "literature" && item.noteType !== "permanent") continue;
      try {
        await deleteNoteById(vaultPath(), item.noteId, { deleteFile: false });
        deleted.push(item);
      } catch (error) {
        error.deletedEntries = deleted;
        throw error;
      }
    }
    return deleted;
  }

  async function restoreRolledBackCatalogEntries(record, deletedEntries = [], backups = []) {
    const backupByKey = new Map((Array.isArray(backups) ? backups : []).map((item) => [`${item.noteType}:${item.noteId}`, item]));
    const directoryIds = targetDirectoryMapForConfirmResult(record?.confirmResult || null);
    for (const item of Array.isArray(deletedEntries) ? deletedEntries : []) {
      if (item.noteType !== "literature" && item.noteType !== "permanent") continue;
      const backup = backupByKey.get(`${item.noteType}:${item.noteId}`);
      if (!backup?.fullPath) continue;
      const candidate = importCandidateForRollback(record?.candidates || {}, item.noteType, item.noteId);
      if (!candidate) {
        const error = new Error(`rollback restore candidate missing: ${item.noteType}:${item.noteId}`);
        error.code = "IMPORT_ROLLBACK_RESTORE_CANDIDATE_MISSING";
        throw error;
      }
      const currentMarkdown = await fs.readFile(backup.fullPath, "utf8");
      const restoredMeta = titleFromMarkdownBody(currentMarkdown, candidate.title || item.noteId);
      await registerImportCatalogNote({
        ...candidate,
        title: restoredMeta.title || candidate.title,
        status: restoredMeta.status || candidate.status
      }, item.noteType, {
        written: true,
        noteId: item.noteId,
        noteType: item.noteType,
        path: backup.fullPath
      }, directoryIds.get(item.noteType) || "");
    }
  }

  async function restoreRolledBackArtifacts(record, deletedEntries = [], backups = [], stageRoot = "", requestId = "", causeError = null) {
    const restoreResult = await restoreRolledBackFiles(backups, record?.importRecordId || "");
    await restoreRolledBackCatalogEntries(record, deletedEntries, backups);
    await discardRolledBackFileBackups(stageRoot);
    if (restoreResult.conflicts.length) {
      const conflictError = buildRollbackRestoreConflict(restoreResult.conflicts);
      if (causeError && !conflictError.cause) conflictError.cause = causeError;
      await persistFailedImportRecord(record, record.connector, requestId, conflictError, {
        selection: record.confirmResult?.selection || null,
        candidateSelection: candidateSelectionFromSelection(record.candidates, record.confirmResult?.selection || null),
        originalityGuard: record.originalityGuard || null
      });
      throw conflictError;
    }
  }

  function fallbackCreatedEntryFromWriteResult(result) {
    const hash = String(result?.contentHash || "").trim();
    if (!result?.path || !hash) return null;
    return {
      noteId: result.noteId,
      noteType: result.noteType,
      path: vaultRelativePath(vaultPath(), result.path),
      hash
    };
  }

  function fallbackCreatedEntryFromVaultPath(input, hash) {
    const normalizedHash = String(hash || "").trim();
    if (!input?.filePath || !normalizedHash) return null;
    return {
      noteId: input.noteId,
      noteType: input.noteType,
      path: vaultRelativePath(vaultPath(), input.filePath),
      hash: normalizedHash
    };
  }

  async function rollbackStagedEntry(entry) {
    if (!entry) return;
    const { skipped } = await rollbackCreatedFilesImpl(vaultPath(), [entry]);
    const { failed } = await preserveSkippedCreatedArtifacts(skipped);
    const cleanupFailure = buildCleanupFailure(failed);
    if (cleanupFailure) throw cleanupFailure;
  }

  async function stageCreatedEntryFromWriteResult(result) {
    const fallbackEntry = fallbackCreatedEntryFromWriteResult(result);
    try {
      return await materializeCreatedEntryFromWriteResult(vaultPath(), result);
    } catch (error) {
      try {
        await rollbackStagedEntry(fallbackEntry);
      } catch (cleanupError) {
        cleanupError.cause = error;
        throw cleanupError;
      }
      throw error;
    }
  }

  async function stageCreatedEntryFromVaultPath(input, fallbackEntry = null) {
    try {
      return await materializeCreatedEntryFromVaultPath(vaultPath(), input);
    } catch (error) {
      try {
        await rollbackStagedEntry(fallbackEntry);
      } catch (cleanupError) {
        cleanupError.cause = error;
        throw cleanupError;
      }
      throw error;
    }
  }

  async function registerWrittenImportNote(candidate, noteType, result, directoryId) {
    const createdEntry = await stageCreatedEntryFromWriteResult(result);
    try {
      await registerImportCatalogNote(candidate, noteType, result, directoryId);
    } catch (error) {
      await cleanupCreatedArtifacts([createdEntry]);
      throw error;
    }
    return createdEntry;
  }

  function failureDetailsFor(error) {
    const details = error?.details;
    if (details !== undefined) return details;
    if (error?.cause) {
      return {
        cause: {
          code: error.cause.code || null,
          message: String(error.cause.message || error.cause),
          details: error.cause.details || null
        }
      };
    }
    return null;
  }

  async function persistFailedImportRecord(record, connector, requestId, error, context = {}) {
    const finishedAt = new Date().toISOString();
    const failureResult = {
      code: error?.code || null,
      message: String(error?.message || error),
      details: failureDetailsFor(error),
      finishedAt
    };
    const failedSelection = context?.selection || null;
    const failedCandidateSelection = context?.candidateSelection || null;
    const failedOriginalityGuard = context?.originalityGuard || null;
    await appendImportRecordImpl(vaultPath(), connector, record.importRecordId, "failed", {
      requestId,
      code: failureResult.code,
      message: failureResult.message,
      details: failureResult.details,
      finishedAt,
      selection: failedSelection,
      candidateSelection: failedCandidateSelection,
      originalityGuard: failedOriginalityGuard
    });
    record.state = "failed";
    record.updatedAt = finishedAt;
    record.failureResult = {
      ...failureResult,
      selection: failedSelection
    };
    if (failedCandidateSelection) record.candidateSelection = failedCandidateSelection;
    if (failedOriginalityGuard) record.originalityGuard = failedOriginalityGuard;
    importRecords.set(record.importRecordId, record);
  }

  async function createPreview(connector, payload, options, requestId) {
    const originalityPlan = normalizeOriginalityPlan(options?.originalityPlan || {});
    const built =
      connector === "markdown" || connector === "obsidian"
        ? await buildMarkdownCandidates({ connector, payload, options, cwd: cwd() })
        : buildExternalCandidates(connector, payload);
    const guard = originalityGuard(built, originalityPlan);
    const warnings = [...built.warnings, ...guard.warnings];
    const importRecordId = `imp_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const candidatePreview = summarizeImportCandidates(built, guard);
    const candidateSelection = summarizeCandidateSelection(built);
    const preview = {
      importRecordId,
      status: "preview",
      connector,
      summary: {
        sources: built.sources.length,
        literatureNotes: built.literature.length,
        permanentNotes: built.permanent.length,
        warnings: warnings.reduce((sum, item) => sum + Number(item.count || 1), 0)
      },
      samples: {
        sourceIds: built.sources.slice(0, 3).map((x) => x.id),
        literatureNoteIds: built.literature.slice(0, 3).map((x) => x.id),
        permanentNoteIds: built.permanent.slice(0, 3).map((x) => x.id)
      },
      candidatePreview,
      candidateSelection,
      warnings,
      originalityGuard: {
        plan: guard.plan,
        flaggedPermanentIds: guard.flaggedPermanentIds,
        evaluations: guard.evaluations
      },
      createdAt: new Date().toISOString()
    };

    await initVault(vaultPath());
    await appendImportRecordImpl(vaultPath(), connector, importRecordId, "preview", {
      requestId,
      preview,
      payload,
      options,
      candidates: built
    });
    importRecords.set(importRecordId, {
      ...preview,
      state: "preview",
      payload,
      options,
      candidates: built,
      updatedAt: preview.createdAt
    });
    return preview;
  }

  async function getImportRecord(recordId) {
    const memoryRecord = importRecords.get(recordId);
    if (memoryRecord) return memoryRecord;
    const diskRecord = await loadImportRecord(vaultPath(), recordId);
    if (diskRecord) importRecords.set(recordId, diskRecord);
    return diskRecord;
  }

  async function getImportRecordList({ limit = 50 } = {}) {
    const requestedLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.min(200, Number(limit))) : 50;
    const diskRecords = await listImportRecords(vaultPath(), { limit: Math.max(requestedLimit, importRecords.size, 50) });
    const byId = new Map(diskRecords.map((record) => [record.importRecordId, record]));
    for (const record of importRecords.values()) {
      byId.set(record.importRecordId, record);
    }
    const records = [...byId.values()].sort((a, b) => {
      const byUpdatedAt = String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
      if (byUpdatedAt !== 0) return byUpdatedAt;
      return String(b.importRecordId || "").localeCompare(String(a.importRecordId || ""));
    });
    return {
      total: records.length,
      items: records.slice(0, requestedLimit)
    };
  }

  async function confirmImport(record, body, requestId) {
    if (record.state !== "preview") {
      const error = new Error("import status invalid");
      error.code = "IMPORT_STATUS_INVALID";
      throw error;
    }
    if (body.confirm === false) {
      const finishedAt = new Date().toISOString();
      await initVault(vaultPath());
      await appendImportRecordImpl(vaultPath(), record.connector, record.importRecordId, "cancel", {
        requestId,
        finishedAt
      });
      record.state = "cancelled";
      record.updatedAt = finishedAt;
      importRecords.set(record.importRecordId, record);
      return { importRecordId: record.importRecordId, status: "cancelled", message: "Import cancelled." };
    }
    if (body.confirm !== true) {
      const error = new Error("confirm must be true/false");
      error.code = "IMPORT_CONFIRM_REQUIRED";
      throw error;
    }

    const selected = buildSelectedImportCandidates(record.candidates, body.selectedCandidateIds);
    const confirmPlan = normalizeOriginalityPlan(body.originalityPlan || record.originalityGuard?.plan || {});
    const confirmGuard = originalityGuard(selected.candidates, confirmPlan);
    const blocked = confirmGuard.evaluations.filter((item) => item.status === "blocked");
    const evaluationById = new Map(confirmGuard.evaluations.map((item) => [item.permanentId, item]));
    const allowOverride = body.overrideOriginality === true;
    if (confirmPlan.blockOnBlocked && blocked.length && !allowOverride) {
      const error = new Error("originality guard blocked confirmation");
      error.code = "IMPORT_ORIGINALITY_BLOCKED";
      error.details = {
        blockedPermanentIds: blocked.map((item) => item.permanentId),
        threshold: confirmPlan.blockThreshold
      };
      throw error;
    }

    await initVault(vaultPath());
    const created = { sources: 0, literatureNotes: 0, permanentNotes: 0 };
    const skipped = { conflicted: 0, invalid: 0 };
    const writtenPaths = new Set();
    const createdFiles = [];
    const directories = await listDirectories(vaultPath(), { includeHidden: true });
    const selectedDirectoryId = String(body.directoryId || "").trim();
    const selectedDirectory = selectedDirectoryId ? directoryById(directories, selectedDirectoryId) : null;
    if (selectedDirectoryId && !selectedDirectory) {
      const error = new Error(`directoryId not found: ${selectedDirectoryId}`);
      error.code = "IMPORT_DIRECTORY_INVALID";
      throw error;
    }
    validateSelectedImportDirectoryScope(directories, selectedDirectoryId, selected.candidates);
    const literatureTargetDirectoryId = importedNoteTargetDirectory(directories, selectedDirectoryId, "literature");
    const permanentTargetDirectoryId = importedNoteTargetDirectory(directories, selectedDirectoryId, "permanent");
    const literatureTargetDirectory = directoryById(directories, literatureTargetDirectoryId);
    const permanentTargetDirectory = directoryById(directories, permanentTargetDirectoryId);
    const [sourcePathIndex, literaturePathIndex, permanentPathIndex, sourceCatalogEntries, literatureCatalogEntries, permanentCatalogEntries] =
      await Promise.all([
        selected.candidates.sources.length ? buildNotePathIndex(vaultPath(), "source") : null,
        selected.candidates.literature.length ? buildNotePathIndex(vaultPath(), "literature") : null,
        selected.candidates.permanent.length ? buildNotePathIndex(vaultPath(), "permanent") : null,
        selected.candidates.sources.length ? listNoteCatalogEntriesByType(vaultPath(), "source") : [],
        selected.candidates.literature.length ? listNoteCatalogEntriesByType(vaultPath(), "literature") : [],
        selected.candidates.permanent.length ? listNoteCatalogEntriesByType(vaultPath(), "permanent") : []
      ]);
    const sourceCatalogById = catalogEntryMap(sourceCatalogEntries);
    const literatureCatalogById = catalogEntryMap(literatureCatalogEntries);
    const permanentCatalogById = catalogEntryMap(permanentCatalogEntries);

    try {
      for (const source of selected.candidates.sources) {
        const result = await writeSourceIfAbsent(vaultPath(), source, {
          notePathIndex: sourcePathIndex,
          catalogEntriesById: sourceCatalogById,
          skipInit: true
        });
        if (result.written) {
          created.sources += 1;
          createdFiles.push(await stageCreatedEntryFromWriteResult(result));
          writtenPaths.add(path.dirname(result.path));
        } else {
          skipped.conflicted += 1;
        }
      }

      for (const note of selected.candidates.literature) {
        const result = await writeLiteratureNoteIfAbsent(vaultPath(), note, {
          directoryFsPath: literatureTargetDirectory?.fsPath || "",
          notePathIndex: literaturePathIndex,
          catalogEntriesById: literatureCatalogById,
          skipInit: true
        });
        if (result.written) {
          created.literatureNotes += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await registerWrittenImportNote(note, "literature", result, literatureTargetDirectoryId));
        } else {
          skipped.conflicted += 1;
        }
      }

      if (record.connector === "obsidian") {
      const importRootRaw = String(record.payload?.path || "").trim();
      const importRoot = importRootRaw ? (path.isAbsolute(importRootRaw) ? importRootRaw : path.resolve(cwd(), importRootRaw)) : null;
      const assetTargets = new Set();

      for (const note of selected.candidates.literature) {
        for (const link of Array.isArray(note?.parsed_wikilinks) ? note.parsed_wikilinks : []) {
          if (!link?.embed || !link?.target) continue;
          const normalizedTarget = normalizeRelativeFileTarget(link.target);
          if (!normalizedTarget || normalizedTarget.toLowerCase().endsWith(".md")) continue;
          assetTargets.add(normalizedTarget);
        }
      }

        if (importRoot && assetTargets.size) {
          for (const normalizedTarget of assetTargets) {
            const sourcePath = path.resolve(importRoot, normalizedTarget);
            const relToImportRoot = path.relative(importRoot, sourcePath);
            if (relToImportRoot.startsWith("..") || path.isAbsolute(relToImportRoot)) continue;

            try {
              await fs.access(sourcePath);
            } catch {
              continue;
            }

            const destRel = path.posix.join("assets", "imports", record.importRecordId, normalizedTarget);
            const destFull = path.join(vaultPath(), destRel);
            const sourceContent = await fs.readFile(sourcePath);
            const fallbackEntry = fallbackCreatedEntryFromVaultPath(
              {
                noteId: stableAssetId(record.importRecordId, destRel),
                noteType: "asset",
                filePath: destFull
              },
              contentHash(sourceContent)
            );
            await fs.mkdir(path.dirname(destFull), { recursive: true });
            await fs.writeFile(destFull, sourceContent);
            createdFiles.push(
              await stageCreatedEntryFromVaultPath({
                noteId: stableAssetId(record.importRecordId, destRel),
                noteType: "asset",
                filePath: destFull
              }, fallbackEntry)
            );
            writtenPaths.add(path.dirname(destFull));
          }
        }
      }

      for (const note of selected.candidates.permanent) {
        const evalItem = evaluationById.get(note.id);
        if (evalItem?.status === "warning" && !confirmPlan.allowDraftOnWarning) {
          skipped.invalid += 1;
          continue;
        }
        const noteToWrite = {
          ...note,
          originality_status: evalItem?.status || note.originality_status || "warning"
        };
        const result = await writePermanentNoteIfAbsent(vaultPath(), noteToWrite, {
          directoryFsPath: permanentTargetDirectory?.fsPath || "",
          notePathIndex: permanentPathIndex,
          catalogEntriesById: permanentCatalogById,
          skipInit: true
        });
        if (result.written) {
          created.permanentNotes += 1;
          writtenPaths.add(path.dirname(result.path));
          createdFiles.push(await registerWrittenImportNote(noteToWrite, "permanent", result, permanentTargetDirectoryId));
        } else {
          skipped.conflicted += 1;
        }
      }
    } catch (error) {
      let failedError = error;
      try {
        await cleanupCreatedArtifacts(createdFiles);
      } catch (cleanupError) {
        if (!cleanupError.cause) cleanupError.cause = error;
        failedError = cleanupError;
      }
      await persistFailedImportRecord(record, record.connector, requestId, failedError, {
        selection: selected.selection,
        candidateSelection: summarizeCandidateSelection(selected.candidates),
        originalityGuard: {
          plan: confirmGuard.plan,
          blockedPermanentIds: confirmGuard.flaggedPermanentIds,
          evaluations: confirmGuard.evaluations
        }
      });
      throw failedError;
    }

    const targetDirectories = [];
    if (created.literatureNotes > 0 && literatureTargetDirectoryId) {
      targetDirectories.push({
        noteType: "literature",
        directoryId: literatureTargetDirectoryId,
        label: directoryPathLabel(directories, literatureTargetDirectoryId)
      });
    }
    if (created.permanentNotes > 0 && permanentTargetDirectoryId) {
      targetDirectories.push({
        noteType: "permanent",
        directoryId: permanentTargetDirectoryId,
        label: directoryPathLabel(directories, permanentTargetDirectoryId)
      });
    }

    const confirmResult = {
      created,
      skipped,
      selection: selected.selection,
      targetDirectories,
      writtenPaths: [...writtenPaths].map((item) => path.relative(vaultPath(), item).replaceAll("\\", "/")),
      createdFiles,
      finishedAt: new Date().toISOString()
    };
    try {
      await appendImportRecordImpl(vaultPath(), record.connector, record.importRecordId, "confirm", {
        requestId,
        created,
        skipped,
        selection: confirmResult.selection,
        targetDirectories,
        writtenPaths: confirmResult.writtenPaths,
        createdFiles,
        finishedAt: confirmResult.finishedAt,
        originalityGuard: {
          plan: confirmGuard.plan,
          blockedPermanentIds: confirmGuard.flaggedPermanentIds,
          evaluations: confirmGuard.evaluations
        }
      });
    } catch (error) {
      let failedError = error;
      try {
        await cleanupCreatedArtifacts(createdFiles);
      } catch (cleanupError) {
        if (!cleanupError.cause) cleanupError.cause = error;
        failedError = cleanupError;
      }
      if (failedError !== error) {
        await persistFailedImportRecord(record, record.connector, requestId, failedError, {
          selection: selected.selection,
          candidateSelection: summarizeCandidateSelection(selected.candidates),
          originalityGuard: {
            plan: confirmGuard.plan,
            blockedPermanentIds: confirmGuard.flaggedPermanentIds,
            evaluations: confirmGuard.evaluations
          }
        });
      }
      throw failedError;
    }

    record.state = "completed";
    record.originalityGuard = confirmGuard;
    record.confirmResult = confirmResult;
    record.candidateSelection = candidateSelectionFromSelection(record.candidates, confirmResult.selection);
    record.updatedAt = confirmResult.finishedAt;
    importRecords.set(record.importRecordId, record);

    return {
      importRecordId: record.importRecordId,
      status: "completed",
      result: {
        created,
        skipped,
        selection: confirmResult.selection,
        targetDirectories,
        writtenPaths: confirmResult.writtenPaths,
        createdFiles
      },
      originalityGuard: {
        plan: confirmGuard.plan,
        blockedPermanentIds: confirmGuard.flaggedPermanentIds,
        evaluations: confirmGuard.evaluations
      },
      finishedAt: confirmResult.finishedAt
    };
  }

  async function rollbackImport(record, requestId) {
    const rollbackRecoverableFailure = record.state === "failed" && record.confirmResult && !record.rollbackResult;
    if (record.state !== "completed" && !rollbackRecoverableFailure) {
      const error = new Error("only completed imports can be rolled back");
      error.code = "IMPORT_STATUS_INVALID";
      throw error;
    }

    const createdFiles = Array.isArray(record.confirmResult?.createdFiles) ? record.confirmResult.createdFiles : [];
    const { rolledBack, skipped, backups, stageRoot } = await rollbackCreatedFilesWithRecovery(createdFiles, record.importRecordId);
    let deletedCatalogEntries = [];
    try {
      deletedCatalogEntries = await deleteRolledBackCatalogEntries(rolledBack);
    } catch (error) {
      deletedCatalogEntries = Array.isArray(error?.deletedEntries) ? error.deletedEntries : deletedCatalogEntries;
      try {
        await restoreRolledBackArtifacts(record, deletedCatalogEntries, backups, stageRoot, requestId, error);
      } catch (restoreError) {
        if (!restoreError.cause) restoreError.cause = error;
        throw restoreError;
      }
      throw error;
    }

    const finishedAt = new Date().toISOString();
    const rollbackResult = {
      rolledBack,
      skipped,
      finishedAt
    };
    try {
      await appendImportRecordImpl(vaultPath(), record.connector, record.importRecordId, "rollback", {
        requestId,
        rolledBack,
        skipped,
        finishedAt
      });
    } catch (error) {
      try {
        await restoreRolledBackArtifacts(record, deletedCatalogEntries, backups, stageRoot, requestId, error);
      } catch (restoreError) {
        if (!restoreError.cause) restoreError.cause = error;
        throw restoreError;
      }
      throw error;
    }

    record.state = "rolled_back";
    record.rollbackResult = rollbackResult;
    record.failureResult = undefined;
    record.candidateSelection = candidateSelectionFromSelection(record.candidates, record.confirmResult?.selection || null);
    record.updatedAt = finishedAt;
    importRecords.set(record.importRecordId, record);
    try {
      await deleteImportRecordStage(vaultPath(), record.connector, record.importRecordId, "failed");
    } catch {}
    await discardRolledBackFileBackups(stageRoot);

    return {
      importRecordId: record.importRecordId,
      status: "rolled_back",
      result: {
        rolledBack: rolledBack.length,
        skipped: skipped.length,
        rolledBackPaths: rolledBack.map((item) => item.path),
        skippedFiles: skipped
      },
      finishedAt
    };
  }

  async function runMarkdownExport(body, requestId) {
    await initVault(vaultPath());
    const targetPathRaw = String(body.targetPath || "").trim();
    if (!targetPathRaw) {
      const error = new Error("targetPath required");
      error.code = "EXPORT_SCOPE_INVALID";
      throw error;
    }
    const noteIds = Array.isArray(body.noteIds) ? body.noteIds : null;
    const directoryId = String(body.directoryId || "").trim();
    if (directoryId && !(await isPermanentDirectoryScope(vaultPath(), directoryId))) {
      const error = new Error("directoryId must be a permanent-note directory");
      error.code = "EXPORT_SCOPE_INVALID";
      throw error;
    }

    const targetPath = path.isAbsolute(targetPathRaw) ? targetPathRaw : path.resolve(cwd(), targetPathRaw);
    const includeDescendants =
      body.includeDescendants === undefined
        ? true
        : body.includeDescendants !== false && String(body.includeDescendants).trim().toLowerCase() !== "false";

    const exportInput = {
      vaultPath: vaultPath(),
      targetPath,
      directoryId,
      includeDescendants,
      requestId
    };
    if (noteIds && noteIds.length > 0) {
      exportInput.noteIds = noteIds;
      delete exportInput.directoryId;
    }

    return exportMarkdown(exportInput);
  }

  return {
    createPreview,
    getImportRecord,
    getImportRecordList,
    confirmImport,
    rollbackImport,
    runMarkdownExport
  };
}
