import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import {
  appendImportRecord,
  buildExternalCandidates,
  contentHash,
  createdEntryFromVaultPath,
  createdEntryFromWriteResult,
  listImportRecords,
  loadImportRecord,
  rollbackCreatedFiles,
  summarizeImportCandidates,
  vaultRelativePath
} from "../../../packages/connectors/src/index.mjs";
import { buildNotePathIndex, listDirectories, listNoteCatalogEntriesByType } from "../../../packages/domain/src/index.mjs";
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

function rootDirectoryIdFor(directories = [], directoryId = "") {
  const byId = new Map((Array.isArray(directories) ? directories : []).map((item) => [String(item?.id || "").trim(), item]));
  let cursor = byId.get(String(directoryId || "").trim());
  while (cursor?.parentDirectoryId) {
    cursor = byId.get(String(cursor.parentDirectoryId || "").trim());
  }
  return String(cursor?.id || "").trim();
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
  createdEntryFromWriteResult: materializeCreatedEntryFromWriteResult = createdEntryFromWriteResult,
  createdEntryFromVaultPath: materializeCreatedEntryFromVaultPath = createdEntryFromVaultPath,
  rollbackCreatedFiles: rollbackCreatedFilesImpl = rollbackCreatedFiles
}) {
  const vaultPath = () => getVaultPath();
  const cwd = () => getCwd();

  async function cleanupCreatedArtifacts(createdFiles = []) {
    const { rolledBack, skipped } = await rollbackCreatedFilesImpl(vaultPath(), createdFiles);
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
    for (const item of skipped) {
      if (item.noteType === "literature" || item.noteType === "permanent") {
        const key = `${item.noteType}:${item.noteId}`;
        if (cleanedNotes.has(key)) continue;
        cleanedNotes.add(key);
        try {
          await deleteNoteById(vaultPath(), item.noteId, { deleteFile: false });
        } catch {}
      }
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
    try {
      await rollbackCreatedFilesImpl(vaultPath(), [entry]);
    } catch {}
  }

  async function stageCreatedEntryFromWriteResult(result) {
    const fallbackEntry = fallbackCreatedEntryFromWriteResult(result);
    try {
      return await materializeCreatedEntryFromWriteResult(vaultPath(), result);
    } catch (error) {
      await rollbackStagedEntry(fallbackEntry);
      throw error;
    }
  }

  async function stageCreatedEntryFromVaultPath(input, fallbackEntry = null) {
    try {
      return await materializeCreatedEntryFromVaultPath(vaultPath(), input);
    } catch (error) {
      await rollbackStagedEntry(fallbackEntry);
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
      warnings,
      originalityGuard: {
        plan: guard.plan,
        flaggedPermanentIds: guard.flaggedPermanentIds,
        evaluations: guard.evaluations
      },
      createdAt: new Date().toISOString()
    };

    importRecords.set(importRecordId, {
      ...preview,
      state: "preview",
      payload,
      options,
      candidates: built,
      updatedAt: preview.createdAt
    });
    await initVault(vaultPath());
    await appendImportRecord(vaultPath(), connector, importRecordId, "preview", {
      requestId,
      preview,
      payload,
      options,
      candidates: built
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
      record.state = "cancelled";
      record.updatedAt = finishedAt;
      importRecords.set(record.importRecordId, record);
      await initVault(vaultPath());
      await appendImportRecord(vaultPath(), record.connector, record.importRecordId, "cancel", {
        requestId,
        finishedAt
      });
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
      await cleanupCreatedArtifacts(createdFiles);
      throw error;
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

    record.state = "completed";
    record.originalityGuard = confirmGuard;
    record.confirmResult = {
      created,
      skipped,
      selection: selected.selection,
      targetDirectories,
      writtenPaths: [...writtenPaths].map((item) => path.relative(vaultPath(), item).replaceAll("\\", "/")),
      createdFiles,
      finishedAt: new Date().toISOString()
    };
    record.updatedAt = record.confirmResult.finishedAt;
    importRecords.set(record.importRecordId, record);
    await appendImportRecord(vaultPath(), record.connector, record.importRecordId, "confirm", {
      requestId,
      created,
      skipped,
      selection: record.confirmResult.selection,
      targetDirectories,
      writtenPaths: record.confirmResult.writtenPaths,
      createdFiles,
      originalityGuard: {
        plan: confirmGuard.plan,
        blockedPermanentIds: confirmGuard.flaggedPermanentIds,
        evaluations: confirmGuard.evaluations
      }
    });

    return {
      importRecordId: record.importRecordId,
      status: "completed",
      result: {
        created,
        skipped,
        selection: record.confirmResult.selection,
        targetDirectories,
        writtenPaths: record.confirmResult.writtenPaths,
        createdFiles
      },
      originalityGuard: {
        plan: confirmGuard.plan,
        blockedPermanentIds: confirmGuard.flaggedPermanentIds,
        evaluations: confirmGuard.evaluations
      },
      finishedAt: record.confirmResult.finishedAt
    };
  }

  async function rollbackImport(record, requestId) {
    if (record.state !== "completed") {
      const error = new Error("only completed imports can be rolled back");
      error.code = "IMPORT_STATUS_INVALID";
      throw error;
    }

    const createdFiles = Array.isArray(record.confirmResult?.createdFiles) ? record.confirmResult.createdFiles : [];
    const { rolledBack, skipped } = await rollbackCreatedFiles(vaultPath(), createdFiles);
    for (const item of rolledBack) {
      if (item.noteType === "literature" || item.noteType === "permanent") {
        try {
          await deleteNoteById(vaultPath(), item.noteId);
        } catch {}
      }
    }

    const finishedAt = new Date().toISOString();
    record.state = "rolled_back";
    record.rollbackResult = {
      rolledBack,
      skipped,
      finishedAt
    };
    record.updatedAt = finishedAt;
    importRecords.set(record.importRecordId, record);
    await appendImportRecord(vaultPath(), record.connector, record.importRecordId, "rollback", {
      requestId,
      rolledBack,
      skipped,
      finishedAt
    });

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
