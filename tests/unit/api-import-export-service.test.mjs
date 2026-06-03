import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDirectory,
  createNoteInDirectory,
  deleteNoteById,
  initVault,
  listNoteCatalogEntriesByType,
  readNote,
  registerMarkdownNoteInCatalog,
  writeLiteratureNoteIfAbsent,
  writePermanentNoteIfAbsent,
  writeSourceIfAbsent
} from "../../packages/domain/src/index.mjs";
import { buildSelectedImportCandidates, createImportExportService } from "../../apps/api/src/import-export-service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const FIXTURES_ROOT = path.join(REPO_ROOT, "tests", "fixtures", "imports");

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function titleForCatalogNote(candidate) {
  const explicit = String(candidate?.title || "").trim();
  if (explicit) return explicit;
  const firstLine = String(candidate?.core_claim || candidate?.quote_text || "")
    .trim()
    .split(/\r?\n/)[0]
    ?.trim();
  return firstLine || String(candidate?.id || "imported-note");
}

function defaultDirectoryIdForImportNoteType(noteType) {
  if (noteType === "literature") return "dir_literature_default";
  return "dir_original_default";
}

async function registerImportCatalogNote(vaultPath, candidate, noteType, writeResult, directoryId = "") {
  if (!writeResult?.written) return null;
  return registerMarkdownNoteInCatalog(vaultPath, {
    noteId: candidate.id,
    noteType,
    title: titleForCatalogNote(candidate),
    status: candidate.status || "draft",
    markdownPath: path.relative(path.resolve(vaultPath), writeResult.path).replaceAll("\\", "/"),
    directoryId: String(directoryId || "").trim() || defaultDirectoryIdForImportNoteType(noteType)
  });
}

function createService(vaultPath, importRecords = new Map(), overrides = {}) {
  return createImportExportService({
    getVaultPath: () => vaultPath,
    getCwd: () => REPO_ROOT,
    importRecords,
    initVault: overrides.initVault || initVault,
    writeSourceIfAbsent: overrides.writeSourceIfAbsent || writeSourceIfAbsent,
    writeLiteratureNoteIfAbsent: overrides.writeLiteratureNoteIfAbsent || writeLiteratureNoteIfAbsent,
    writePermanentNoteIfAbsent: overrides.writePermanentNoteIfAbsent || writePermanentNoteIfAbsent,
    deleteNoteById: overrides.deleteNoteById || deleteNoteById,
    registerImportCatalogNote: (candidate, noteType, writeResult, directoryId) =>
      (overrides.registerImportCatalogNote || registerImportCatalogNote)(vaultPath, candidate, noteType, writeResult, directoryId)
  });
}

test("buildSelectedImportCandidates returns subset counts and preserves requested ids", () => {
  const result = buildSelectedImportCandidates(
    {
      sources: [{ id: "src_1" }, { id: "src_2" }],
      literature: [{ id: "ln_1" }],
      permanent: [{ id: "pn_1" }]
    },
    ["pn_1", "src_2"]
  );

  assert.equal(result.selection.mode, "subset");
  assert.deepEqual(result.selection.candidateIds, ["pn_1", "src_2"]);
  assert.deepEqual(result.selection.counts, {
    sources: 1,
    literatureNotes: 0,
    permanentNotes: 1
  });
  assert.deepEqual(result.candidates.sources.map((item) => item.id), ["src_2"]);
  assert.deepEqual(result.candidates.permanent.map((item) => item.id), ["pn_1"]);
});

test("createPreview only accepts obsidian and keeps records in memory", async () => {
  const vaultPath = await makeTempDir("yansilu-service-preview-");
  const service = createService(vaultPath);

  await assert.rejects(
    () => service.createPreview("markdown", { path: "ignored" }, {}, "req_markdown"),
    { code: "IMPORT_CONNECTOR_UNSUPPORTED" }
  );

  const preview = await service.createPreview(
    "obsidian",
    { path: path.join(FIXTURES_ROOT, "obsidian-realistic-vault") },
    { detectWikilinks: true },
    "req_obsidian"
  );

  assert.equal(preview.connector, "obsidian");
  assert.equal(preview.status, "preview");
  assert.deepEqual(preview.summary, {
    sources: 2,
    literatureNotes: 2,
    permanentNotes: 1,
    warnings: 1
  });
  assert.deepEqual(preview.originalityGuard.flaggedPermanentIds, preview.samples.permanentNoteIds);
  const record = await service.getImportRecord(preview.importRecordId);
  assert.equal(record?.state, "preview");
});

test("confirmImport writes obsidian notes and imported assets", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-");
  const importRecords = new Map();
  const service = createService(vaultPath, importRecords);

  const preview = await service.createPreview(
    "obsidian",
    { path: path.join(FIXTURES_ROOT, "obsidian-realistic-vault") },
    { detectWikilinks: true },
    "req_confirm"
  );
  const record = await service.getImportRecord(preview.importRecordId);

  const result = await service.confirmImport(
    record,
    { confirm: true, directoryId: "dir_literature_default", overrideOriginality: true },
    "req_confirm"
  );
  assert.equal(result.status, "completed");
  assert.deepEqual(result.result.created, {
    sources: 2,
    literatureNotes: 2,
    permanentNotes: 1
  });
  assert.ok(result.result.createdFiles.some((item) => item.noteType === "asset"));

  const literatureEntries = await listNoteCatalogEntriesByType(vaultPath, "literature");
  const permanentEntries = await listNoteCatalogEntriesByType(vaultPath, "permanent");
  assert.equal(literatureEntries.length, 2);
  assert.equal(permanentEntries.length, 1);

  const literatureNotes = await Promise.all(literatureEntries.map((entry) => readNote(vaultPath, "literature", entry.id)));
  assert.ok(literatureNotes.some((item) => /assets\/imports\//.test(item.markdown)));
});

test("confirmImport honors selectedCandidateIds subset", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-subset-");
  const service = createService(vaultPath);

  const preview = await service.createPreview(
    "obsidian",
    { path: path.join(FIXTURES_ROOT, "obsidian-realistic-vault") },
    { detectWikilinks: true },
    "req_subset"
  );
  const record = await service.getImportRecord(preview.importRecordId);
  const selectedSourceId = preview.samples.sourceIds[0];

  const result = await service.confirmImport(record, { confirm: true, selectedCandidateIds: [selectedSourceId] }, "req_subset");
  assert.deepEqual(result.result.created, {
    sources: 1,
    literatureNotes: 0,
    permanentNotes: 0
  });
  assert.deepEqual(result.result.selection, {
    mode: "subset",
    candidateIds: [selectedSourceId],
    totalCandidates: 5,
    selectedCandidates: 1,
    counts: {
      sources: 1,
      literatureNotes: 0,
      permanentNotes: 0
    }
  });
});

test("confirmImport blocks originality-flagged permanent notes by default and allows override", async () => {
  const vaultPath = await makeTempDir("yansilu-service-originality-vault-");
  const importRoot = await makeTempDir("yansilu-service-originality-import-");
  const service = createService(vaultPath);

  await fs.writeFile(
    path.join(importRoot, "copied-claim.md"),
    [
      "---",
      "title: Copied claim",
      "type: permanent",
      'tags: ["permanent"]',
      "---",
      "",
      "A copied claim should remain a source excerpt."
    ].join("\n"),
    "utf8"
  );

  const preview = await service.createPreview("obsidian", { path: importRoot }, {}, "req_originality_preview");
  assert.deepEqual(preview.originalityGuard.flaggedPermanentIds, preview.samples.permanentNoteIds);

  const record = await service.getImportRecord(preview.importRecordId);
  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_originality_blocked"),
    { code: "IMPORT_ORIGINALITY_BLOCKED" }
  );
  assert.equal(record?.state, "preview");

  const confirmed = await service.confirmImport(record, { confirm: true, overrideOriginality: true }, "req_originality_override");
  assert.equal(confirmed.status, "completed");
  assert.deepEqual(confirmed.originalityGuard.flaggedPermanentIds, preview.samples.permanentNoteIds);

  const permanentEntries = await listNoteCatalogEntriesByType(vaultPath, "permanent");
  assert.equal(permanentEntries.length, 1);
  const permanent = await readNote(vaultPath, "permanent", permanentEntries[0].id);
  assert.match(permanent.markdown, /originality_status: blocked/);
});

test("confirmImport cleans up already written files and marks the record failed when a downstream step throws", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-cleanup-");
  const importRoot = await makeTempDir("yansilu-service-confirm-cleanup-import-");
  const importRecords = new Map();
  const service = createService(vaultPath, importRecords, {
    registerImportCatalogNote: async () => {
      throw Object.assign(new Error("catalog unavailable"), { code: "CATALOG_UNAVAILABLE" });
    }
  });

  await fs.writeFile(
    path.join(importRoot, "cleanup.md"),
    [
      "---",
      "title: Cleanup candidate",
      "---",
      "",
      "This note should be removed when confirm fails."
    ].join("\n"),
    "utf8"
  );

  const preview = await service.createPreview("obsidian", { path: importRoot }, {}, "req_cleanup_preview");
  const record = await service.getImportRecord(preview.importRecordId);

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_cleanup_confirm"),
    { code: "CATALOG_UNAVAILABLE" }
  );

  assert.equal(record?.state, "failed");
  assert.equal(record?.failureResult?.code, "CATALOG_UNAVAILABLE");
  await assert.rejects(() => readNote(vaultPath, "source", preview.samples.sourceIds[0]), { code: "ENOENT" });
  await assert.rejects(() => readNote(vaultPath, "literature", preview.samples.literatureNoteIds[0]), { code: "ENOENT" });
});

test("runMarkdownExport resolves the active vault path at call time", async () => {
  const firstVault = await makeTempDir("yansilu-service-vault-a-");
  const secondVault = await makeTempDir("yansilu-service-vault-b-");
  const targetPath = await makeTempDir("yansilu-service-export-");
  let activeVaultPath = firstVault;

  await initVault(secondVault);
  await createNoteInDirectory(secondVault, {
    directoryId: "dir_original_default",
    title: "From second vault",
    body: "From second vault"
  });

  const service = createImportExportService({
    getVaultPath: () => activeVaultPath,
    getCwd: () => process.cwd(),
    importRecords: new Map(),
    initVault,
    writeSourceIfAbsent,
    writeLiteratureNoteIfAbsent,
    writePermanentNoteIfAbsent,
    registerImportCatalogNote: async () => null
  });

  activeVaultPath = secondVault;
  const result = await service.runMarkdownExport({ targetPath, directoryId: "dir_original_default" }, "req_test");

  assert.equal(result.copiedBreakdown.markdownFiles, 1);
  const exportedMarkdownFiles = (await fs.readdir(targetPath, { recursive: true })).filter((filePath) => String(filePath).toLowerCase().endsWith(".md"));
  assert.equal(exportedMarkdownFiles.length, 1);
});

test("runMarkdownExport requires a permanent-note directory id", async () => {
  const vaultPath = await makeTempDir("yansilu-service-export-scope-");
  await initVault(vaultPath);
  const literatureChild = await createDirectory(vaultPath, {
    title: "Literature child",
    parentDirectoryId: "dir_literature_default",
    fsPath: path.join(vaultPath, "notes", "literature", "child")
  });
  const service = createService(vaultPath);

  await assert.rejects(
    () => service.runMarkdownExport({ targetPath: path.join(vaultPath, "..", "out"), directoryId: literatureChild.id }, "req_bad_scope"),
    { code: "EXPORT_SCOPE_INVALID" }
  );
});

test("rollbackImport is explicitly unsupported in the simplified importer", async () => {
  const vaultPath = await makeTempDir("yansilu-service-rollback-");
  const service = createService(vaultPath);
  await assert.rejects(() => service.rollbackImport({}, "req_rollback"), {
    code: "IMPORT_ROLLBACK_UNSUPPORTED"
  });
});
