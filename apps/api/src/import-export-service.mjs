import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import {
  createdEntryFromVaultPath,
  createdEntryFromWriteResult,
  summarizeCandidateSelection,
  summarizeImportCandidates
} from "../../../packages/connectors/src/index.mjs";
import { buildNotePathIndex, listDirectories, listNoteCatalogEntriesByType } from "../../../packages/domain/src/index.mjs";
import { exportMarkdown } from "../../../packages/export-engine/src/index.mjs";
import { buildMarkdownCandidates } from "../../../packages/markdown-engine/src/index.mjs";

function stableAssetId(importRecordId, relativePath) {
  const hash = createHash("sha1").update(`${importRecordId}:${relativePath}`).digest("hex").slice(0, 12);
  return `asset_${hash}`;
}

function portablePath(value) {
  return String(value || "").replaceAll("\\", "/");
}

function normalizeRelativeFileTarget(value) {
  const raw = portablePath(value).trim();
  if (!raw) return null;
  if (raw.startsWith("/") || raw.includes("://")) return null;
  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === "." || normalized.startsWith("..") || normalized.includes("/../")) return null;
  return normalized;
}

function unwrapTarget(value) {
  const raw = String(value || "").trim();
  if (raw.startsWith("<") && raw.endsWith(">")) {
    return { wrapped: true, target: raw.slice(1, -1).trim() };
  }
  return { wrapped: false, target: raw };
}

function rootDirectoryIdFor(directories = [], directoryId = "") {
  const byId = new Map((Array.isArray(directories) ? directories : []).map((item) => [String(item?.id || "").trim(), item]));
  let cursor = byId.get(String(directoryId || "").trim());
  while (cursor?.parentDirectoryId) {
    cursor = byId.get(String(cursor.parentDirectoryId || "").trim());
  }
  return String(cursor?.id || "").trim();
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

function isPermanentDirectoryId(value) {
  return String(value || "").trim() === "dir_original_default";
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

function importedNoteTargetDirectory(directories = [], selectedDirectoryId = "", noteType = "") {
  const cleanSelectedDirectoryId = String(selectedDirectoryId || "").trim();
  const rootDirectoryId = rootDirectoryIdFor(directories, cleanSelectedDirectoryId);
  const cleanNoteType = String(noteType || "").trim();

  if (cleanNoteType === "literature") {
    return rootDirectoryId === "dir_literature_default" ? cleanSelectedDirectoryId : "dir_literature_default";
  }
  if (cleanNoteType === "permanent") {
    return rootDirectoryId === "dir_original_default" ? cleanSelectedDirectoryId : "dir_original_default";
  }
  return "";
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

function candidateSelectionFromSelection(candidates = {}, selection = null) {
  const requestedIds = Array.isArray(selection?.candidateIds)
    ? [...new Set(selection.candidateIds.map((item) => String(item || "").trim()).filter(Boolean))]
    : null;
  if (!requestedIds || !requestedIds.length) return summarizeCandidateSelection(candidates);
  return summarizeCandidateSelection(buildSelectedImportCandidates(candidates, requestedIds).candidates);
}

function relativeAssetTarget(noteMarkdownPath, assetRelativePath) {
  const noteDir = path.posix.dirname(portablePath(noteMarkdownPath));
  const nextTarget = path.posix.relative(noteDir, portablePath(assetRelativePath)) || path.posix.basename(portablePath(assetRelativePath));
  return /\s/.test(nextTarget) ? `<${nextTarget}>` : nextTarget;
}

function rewriteImportedAssetLinks(markdown = "", noteMarkdownPath = "", assetPathByTarget = new Map()) {
  let nextMarkdown = String(markdown || "");
  const notePath = portablePath(noteMarkdownPath);
  if (!nextMarkdown || !notePath || !(assetPathByTarget instanceof Map) || assetPathByTarget.size === 0) return nextMarkdown;

  nextMarkdown = nextMarkdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (fullMatch, rawTarget) => {
    const normalizedTarget = normalizeRelativeFileTarget(rawTarget);
    const assetRelativePath = normalizedTarget ? assetPathByTarget.get(normalizedTarget) : null;
    if (!assetRelativePath) return fullMatch;
    return `![](${relativeAssetTarget(notePath, assetRelativePath)})`;
  });

  nextMarkdown = nextMarkdown.replace(/(!?\[[^\]]*?\]\()(<[^>]+>|[^)]+)(\))/g, (fullMatch, prefix, rawTarget, suffix) => {
    const unwrapped = unwrapTarget(rawTarget);
    const normalizedTarget = normalizeRelativeFileTarget(unwrapped.target);
    const assetRelativePath = normalizedTarget ? assetPathByTarget.get(normalizedTarget) : null;
    if (!assetRelativePath) return fullMatch;
    return `${prefix}${relativeAssetTarget(notePath, assetRelativePath)}${suffix}`;
  });

  return nextMarkdown;
}

async function rewriteImportedAssetLinksInFile(filePath, vaultRoot, assetPathByTarget) {
  if (!(assetPathByTarget instanceof Map) || assetPathByTarget.size === 0) return false;
  const currentMarkdown = await fs.readFile(filePath, "utf8");
  const noteMarkdownPath = portablePath(path.relative(vaultRoot, filePath));
  const nextMarkdown = rewriteImportedAssetLinks(currentMarkdown, noteMarkdownPath, assetPathByTarget);
  if (nextMarkdown === currentMarkdown) return false;
  await fs.writeFile(filePath, nextMarkdown, "utf8");
  return true;
}

async function collectObsidianAssetPlans(record, cwdResolver, literatureCandidates = []) {
  if (record?.connector !== "obsidian") return new Map();

  const importRootRaw = String(record?.payload?.path || "").trim();
  if (!importRootRaw) return new Map();
  const importRoot = path.isAbsolute(importRootRaw) ? importRootRaw : path.resolve(cwdResolver(), importRootRaw);

  const assetPathByTarget = new Map();
  for (const note of Array.isArray(literatureCandidates) ? literatureCandidates : []) {
    for (const link of Array.isArray(note?.parsed_wikilinks) ? note.parsed_wikilinks : []) {
      if (!link?.embed || !link?.target) continue;
      const normalizedTarget = normalizeRelativeFileTarget(link.target);
      if (!normalizedTarget || normalizedTarget.toLowerCase().endsWith(".md")) continue;
      if (assetPathByTarget.has(normalizedTarget)) continue;

      const sourcePath = path.resolve(importRoot, normalizedTarget);
      const relative = path.relative(importRoot, sourcePath);
      if (relative.startsWith("..") || path.isAbsolute(relative)) continue;

      try {
        const stat = await fs.stat(sourcePath);
        if (!stat.isFile()) continue;
      } catch {
        continue;
      }

      assetPathByTarget.set(normalizedTarget, {
        sourcePath,
        assetRelativePath: path.posix.join("assets", "imports", record.importRecordId, normalizedTarget)
      });
    }
  }
  return assetPathByTarget;
}

function emptyOriginalityGuard() {
  return {
    plan: null,
    flaggedPermanentIds: [],
    evaluations: []
  };
}

function sortRecords(records = []) {
  return [...records].sort((a, b) => {
    const byUpdatedAt = String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
    if (byUpdatedAt !== 0) return byUpdatedAt;
    return String(b.importRecordId || "").localeCompare(String(a.importRecordId || ""));
  });
}

export function createImportExportService({
  getVaultPath,
  getCwd,
  importRecords,
  initVault,
  writeSourceIfAbsent,
  writeLiteratureNoteIfAbsent,
  writePermanentNoteIfAbsent,
  registerImportCatalogNote
}) {
  const vaultPath = () => getVaultPath();
  const cwd = () => getCwd();

  async function createPreview(connector, payload, options, _requestId) {
    if (connector !== "obsidian") {
      const error = new Error("only obsidian imports are supported in the simplified importer");
      error.code = "IMPORT_CONNECTOR_UNSUPPORTED";
      throw error;
    }

    const built = await buildMarkdownCandidates({ connector, payload, options, cwd: cwd() });
    const warnings = [...built.warnings];
    const importRecordId = `imp_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const candidatePreview = summarizeImportCandidates(built, null);
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
      originalityGuard: emptyOriginalityGuard(),
      createdAt: new Date().toISOString()
    };

    await initVault(vaultPath());
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
    return importRecords.get(recordId) || null;
  }

  async function getImportRecordList({ limit = 50 } = {}) {
    const requestedLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.min(200, Number(limit))) : 50;
    const records = sortRecords([...importRecords.values()]);
    return {
      total: records.length,
      items: records.slice(0, requestedLimit)
    };
  }

  async function confirmImport(record, body, _requestId) {
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
      return { importRecordId: record.importRecordId, status: "cancelled", message: "Import cancelled." };
    }

    if (body.confirm !== true) {
      const error = new Error("confirm must be true/false");
      error.code = "IMPORT_CONFIRM_REQUIRED";
      throw error;
    }

    await initVault(vaultPath());

    const selected = buildSelectedImportCandidates(record.candidates, body.selectedCandidateIds);
    const directories = await listDirectories(vaultPath(), { includeHidden: true });
    const selectedDirectoryId = String(body.directoryId || "").trim();
    const selectedDirectory = selectedDirectoryId ? directoryById(directories, selectedDirectoryId) : null;
    if (selectedDirectoryId && !selectedDirectory) {
      const error = new Error(`directoryId not found: ${selectedDirectoryId}`);
      error.code = "IMPORT_DIRECTORY_INVALID";
      throw error;
    }

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

    const created = { sources: 0, literatureNotes: 0, permanentNotes: 0 };
    const skipped = { conflicted: 0, invalid: 0 };
    const writtenPaths = new Set();
    const createdFiles = [];
    const assetPlans = await collectObsidianAssetPlans(record, cwd, selected.candidates.literature);
    const assetPathByTarget = new Map([...assetPlans.entries()].map(([key, value]) => [key, value.assetRelativePath]));

    for (const source of selected.candidates.sources) {
      const result = await writeSourceIfAbsent(vaultPath(), source, {
        notePathIndex: sourcePathIndex,
        catalogEntriesById: sourceCatalogById,
        skipInit: true
      });
      if (!result.written) {
        skipped.conflicted += 1;
        continue;
      }
      created.sources += 1;
      writtenPaths.add(path.dirname(result.path));
      createdFiles.push(await createdEntryFromWriteResult(vaultPath(), result));
    }

    for (const note of selected.candidates.literature) {
      const result = await writeLiteratureNoteIfAbsent(vaultPath(), note, {
        directoryFsPath: literatureTargetDirectory?.fsPath || "",
        notePathIndex: literaturePathIndex,
        catalogEntriesById: literatureCatalogById,
        skipInit: true
      });
      if (!result.written) {
        skipped.conflicted += 1;
        continue;
      }
      await registerImportCatalogNote(note, "literature", result, literatureTargetDirectoryId);
      await rewriteImportedAssetLinksInFile(result.path, vaultPath(), assetPathByTarget);
      created.literatureNotes += 1;
      writtenPaths.add(path.dirname(result.path));
      createdFiles.push(await createdEntryFromWriteResult(vaultPath(), result));
    }

    for (const note of selected.candidates.permanent) {
      const result = await writePermanentNoteIfAbsent(vaultPath(), note, {
        directoryFsPath: permanentTargetDirectory?.fsPath || "",
        notePathIndex: permanentPathIndex,
        catalogEntriesById: permanentCatalogById,
        skipInit: true
      });
      if (!result.written) {
        skipped.conflicted += 1;
        continue;
      }
      await registerImportCatalogNote(note, "permanent", result, permanentTargetDirectoryId);
      await rewriteImportedAssetLinksInFile(result.path, vaultPath(), assetPathByTarget);
      created.permanentNotes += 1;
      writtenPaths.add(path.dirname(result.path));
      createdFiles.push(await createdEntryFromWriteResult(vaultPath(), result));
    }

    for (const [normalizedTarget, plan] of assetPlans.entries()) {
      const destinationPath = path.join(vaultPath(), plan.assetRelativePath);
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.copyFile(plan.sourcePath, destinationPath);
      writtenPaths.add(path.dirname(destinationPath));
      createdFiles.push(
        await createdEntryFromVaultPath(vaultPath(), {
          noteType: "asset",
          noteId: stableAssetId(record.importRecordId, normalizedTarget),
          filePath: destinationPath
        })
      );
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

    const finishedAt = new Date().toISOString();
    const confirmResult = {
      created,
      skipped,
      selection: selected.selection,
      targetDirectories,
      writtenPaths: [...writtenPaths].map((item) => portablePath(path.relative(vaultPath(), item))),
      createdFiles,
      finishedAt
    };

    record.state = "completed";
    record.confirmResult = confirmResult;
    record.originalityGuard = emptyOriginalityGuard();
    record.candidateSelection = candidateSelectionFromSelection(record.candidates, confirmResult.selection);
    record.updatedAt = finishedAt;
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
      originalityGuard: emptyOriginalityGuard(),
      finishedAt
    };
  }

  async function rollbackImport() {
    const error = new Error("rollback is not supported in the simplified importer");
    error.code = "IMPORT_ROLLBACK_UNSUPPORTED";
    throw error;
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
