import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  createDirectory,
  createNoteInDirectory,
  deleteNoteById,
  initVault,
  listNoteCatalogEntriesByType,
  listNoteRelations,
  listNotesInDirectoryScope,
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
  if (noteType === "source") return "dir_source_default";
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

test("confirmImport rejects previews that ended up with zero import candidates", async () => {
  const vaultPath = await makeTempDir("yansilu-service-empty-preview-");
  const importRoot = await makeTempDir("yansilu-service-empty-preview-import-");
  const service = createService(vaultPath);

  const cp1252Hex = "2d2d2d0a7469746c653a20436166e9206e6f74650a2d2d2d0a0a426f64790a";
  await fs.writeFile(path.join(importRoot, "cp1252.md"), Buffer.from(cp1252Hex, "hex"));

  const preview = await service.createPreview("obsidian", { path: importRoot }, {}, "req_empty_preview");
  assert.deepEqual(preview.summary, {
    sources: 0,
    literatureNotes: 0,
    permanentNotes: 0,
    warnings: 1
  });
  assert.ok(preview.warnings.some((warning) => warning.code === "IMPORT_MARKDOWN_ENCODING_UNSUPPORTED"));

  const record = await service.getImportRecord(preview.importRecordId);
  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_empty_confirm"),
    { code: "IMPORT_SELECTION_EMPTY" }
  );
  assert.equal(record?.state, "preview");
});

test("confirmImport registers each imported note exactly once", async () => {
  const vaultPath = await makeTempDir("yansilu-service-single-register-");
  const importRoot = await makeTempDir("yansilu-service-single-register-import-");
  const calls = [];
  const service = createService(vaultPath, new Map(), {
    registerImportCatalogNote: async (currentVaultPath, candidate, noteType, writeResult, directoryId) => {
      calls.push({
        noteId: candidate.id,
        noteType,
        directoryId: String(directoryId || "").trim(),
        filePath: writeResult.path
      });
      return registerImportCatalogNote(currentVaultPath, candidate, noteType, writeResult, directoryId);
    }
  });

  await fs.writeFile(
    path.join(importRoot, "single.md"),
    ["---", "title: Single import note", "---", "", "A simple imported note."].join("\n"),
    "utf8"
  );

  const preview = await service.createPreview("obsidian", { path: importRoot }, {}, "req_single_register");
  const record = await service.getImportRecord(preview.importRecordId);
  const result = await service.confirmImport(record, { confirm: true, directoryId: "dir_literature_default" }, "req_single_register");

  assert.equal(result.status, "completed");
  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map((item) => [item.noteId, item.noteType, item.directoryId]),
    [
      [preview.samples.sourceIds[0], "source", ""],
      [preview.samples.literatureNoteIds[0], "literature", "dir_literature_default"]
    ]
  );
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

  const sourceEntries = await listNoteCatalogEntriesByType(vaultPath, "source");
  const literatureEntries = await listNoteCatalogEntriesByType(vaultPath, "literature");
  const permanentEntries = await listNoteCatalogEntriesByType(vaultPath, "permanent");
  assert.equal(sourceEntries.length, 2);
  assert.deepEqual([...new Set(sourceEntries.map((entry) => entry.directoryId))], ["dir_source_default"]);
  assert.equal(literatureEntries.length, 2);
  assert.equal(permanentEntries.length, 1);

  const literatureNotes = await Promise.all(literatureEntries.map((entry) => readNote(vaultPath, "literature", entry.id)));
  assert.ok(literatureNotes.some((item) => /assets\/imports\//.test(item.markdown)));
  const createdLiteratureFile = result.result.createdFiles.find((item) => item.noteType === "literature");
  const createdLiteratureBuffer = await fs.readFile(path.join(vaultPath, createdLiteratureFile.path));
  const createdLiteratureHash = createHash("sha1").update(createdLiteratureBuffer).digest("hex");
  assert.equal(createdLiteratureFile.hash, createdLiteratureHash);
});

test("confirmImport extracts permanent-note distillation fields and returns organizing overview", async (t) => {
  let sqlite;
  try {
    sqlite = await import("node:sqlite");
  } catch {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }
  const vaultPath = await makeTempDir("yansilu-service-distillation-");
  const importRoot = await makeTempDir("yansilu-service-distillation-source-");
  await fs.writeFile(
    path.join(importRoot, "slow-reading.md"),
    [
      "---",
      "type: permanent",
      "tags: [permanent, 易经]",
      "---",
      "# 易经需要慢读",
      "",
      "## 一句话论点",
      "易经需要慢读，才能把变化判断放回具体处境。",
      "",
      "## 三句话摘要",
      "- 慢读不是拖延，而是让判断条件浮现。",
      "- 关系网络能帮助看见支持和边界。",
      "- 进入写作前要先确认核心关系。",
      "",
      "## 边界与反例",
      "只做资料摘录时，不应该急着连入永久笔记网络。",
      "",
      "## 来源追溯",
      "验收导入样例。",
      ""
    ].join("\n"),
    "utf8"
  );

  const service = createService(vaultPath);
  const preview = await service.createPreview("obsidian", { path: importRoot }, { detectWikilinks: true }, "req_distillation_preview");
  const record = await service.getImportRecord(preview.importRecordId);
  const result = await service.confirmImport(
    record,
    { confirm: true, directoryId: "dir_original_default", overrideOriginality: true },
    "req_distillation_confirm"
  );

  assert.equal(result.status, "completed");
  assert.equal(result.result.organizingOverview.permanentCount, 1);
  assert.equal(result.result.organizingOverview.isolatedCount, 1);
  assert.equal(result.result.organizingOverview.recommendedFirst[0].title, "易经需要慢读");

  const db = new sqlite.DatabaseSync(path.join(vaultPath, ".yansilu", "catalog.db"));
  try {
    const row = db.prepare("SELECT thesis, three_line_summary_json, boundary_or_counterpoint, distillation_status FROM permanent_note_meta LIMIT 1").get();
    assert.equal(row.thesis, "易经需要慢读，才能把变化判断放回具体处境。");
    assert.deepEqual(JSON.parse(row.three_line_summary_json), [
      "慢读不是拖延，而是让判断条件浮现。",
      "关系网络能帮助看见支持和边界。",
      "进入写作前要先确认核心关系。"
    ]);
    assert.equal(row.boundary_or_counterpoint, "只做资料摘录时，不应该急着连入永久笔记网络。");
    assert.equal(row.distillation_status, "draft");
  } finally {
    db.close();
  }
});

test("confirmImport syncs imported wikilinks into relation links after all notes are registered", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-wikilink-relations-");
  const importRoot = await makeTempDir("yansilu-service-confirm-wikilink-relations-import-");
  const service = createService(vaultPath);

  await fs.writeFile(
    path.join(importRoot, "a-source.md"),
    [
      "---",
      "title: Import Source",
      "---",
      "",
      "This imported note points to ;[[Import Target]] before the target is registered."
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(importRoot, "z-target.md"),
    [
      "---",
      "title: Import Target",
      "---",
      "",
      "This imported note is the relation target."
    ].join("\n"),
    "utf8"
  );

  const preview = await service.createPreview("obsidian", { path: importRoot }, { detectWikilinks: true }, "req_wikilink_relations");
  const record = await service.getImportRecord(preview.importRecordId);
  assert.equal(record.candidates.literature.length, 2);
  const sourceCandidate = record.candidates.literature.find((item) => item.title === "Import Source");
  const targetCandidate = record.candidates.literature.find((item) => item.title === "Import Target");
  assert.ok(sourceCandidate);
  assert.ok(targetCandidate);
  assert.deepEqual(sourceCandidate.wikilink_targets, ["Import Target"]);

  const result = await service.confirmImport(
    record,
    { confirm: true, directoryId: "dir_literature_default", overrideOriginality: true },
    "req_wikilink_relations"
  );
  assert.equal(result.status, "completed");
  assert.equal(result.result.created.literatureNotes, 2);

  const sourceRelations = await listNoteRelations(vaultPath, sourceCandidate.id);
  assert.equal(sourceRelations.outgoingLinks.length, 1);
  assert.equal(sourceRelations.outgoingLinks[0].toNoteId, targetCandidate.id);
  assert.equal(sourceRelations.outgoingLinks[0].relationType, "associated_with");
  assert.equal(sourceRelations.outgoingLinks[0].rationale, "markdown_wikilink");

  const targetRelations = await listNoteRelations(vaultPath, targetCandidate.id);
  assert.equal(targetRelations.backlinks.length, 1);
  assert.equal(targetRelations.backlinks[0].fromNoteId, sourceCandidate.id);
});

test("confirmImport copies permanent-note embedded assets even when only permanent candidates are selected", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-permanent-assets-");
  const importRoot = await makeTempDir("yansilu-service-confirm-permanent-assets-import-");
  const service = createService(vaultPath);

  await fs.mkdir(path.join(importRoot, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(importRoot, "permanent-asset.md"),
    [
      "---",
      "title: Permanent asset note",
      "type: permanent",
      'tags: ["permanent"]',
      "---",
      "",
      "An original claim with an embedded chart.",
      "",
      "![Chart](assets/chart.png)"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(path.join(importRoot, "assets", "chart.png"), "chart-bytes", "utf8");

  const preview = await service.createPreview("obsidian", { path: importRoot }, {}, "req_permanent_asset_preview");
  const record = await service.getImportRecord(preview.importRecordId);
  const permanentId = preview.samples.permanentNoteIds[0];

  const result = await service.confirmImport(
    record,
    {
      confirm: true,
      selectedCandidateIds: [permanentId],
      overrideOriginality: true
    },
    "req_permanent_asset_confirm"
  );

  assert.deepEqual(result.result.created, {
    sources: 0,
    literatureNotes: 0,
    permanentNotes: 1
  });
  assert.ok(result.result.createdFiles.some((item) => item.noteType === "asset"));

  const permanentEntries = await listNoteCatalogEntriesByType(vaultPath, "permanent");
  assert.equal(permanentEntries.length, 1);
  const permanent = await readNote(vaultPath, "permanent", permanentEntries[0].id);
  assert.match(permanent.markdown, /assets\/imports\/.*chart\.png/);
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
  const sourceEntries = await listNoteCatalogEntriesByType(vaultPath, "source");
  assert.deepEqual(sourceEntries.map((entry) => entry.id), [selectedSourceId]);
  assert.deepEqual(sourceEntries.map((entry) => entry.directoryId), ["dir_source_default"]);
  const originalScopeNotes = await listNotesInDirectoryScope(vaultPath, "dir_original_default", { includeDescendants: true });
  assert.deepEqual(originalScopeNotes, []);
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
    deleteNoteById: async (_vaultPath, noteId) => {
      for (const relativeDir of [
        path.join("notes", "sources"),
        path.join("notes", "literature"),
        path.join("notes", "original")
      ]) {
        const fullPath = path.join(vaultPath, relativeDir, `${noteId}.md`);
        try {
          await fs.unlink(fullPath);
          return;
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
        }
      }
    },
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

test("confirmImport surfaces catalog cleanup failures without deleting the note file behind a lingering catalog row", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-catalog-cleanup-");
  const importRoot = await makeTempDir("yansilu-service-confirm-catalog-cleanup-import-");
  const importRecords = new Map();
  let literatureNoteId = "";
  let literatureNotePath = "";

  const service = createService(vaultPath, importRecords, {
    deleteNoteById: async (currentVaultPath, noteId) => {
      if (noteId === literatureNoteId) {
        const error = new Error("catalog delete failed");
        error.code = "CATALOG_DELETE_FAILED";
        throw error;
      }
      const fileName = `${noteId}.md`;
      for (const relativeDir of [
        path.join("notes", "sources"),
        path.join("notes", "literature"),
        path.join("notes", "original")
      ]) {
        const fullPath = path.join(currentVaultPath, relativeDir, fileName);
        try {
          await fs.unlink(fullPath);
          return;
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
        }
      }
    },
    registerImportCatalogNote: async (currentVaultPath, candidate, noteType, writeResult, directoryId) => {
      const registered = await registerImportCatalogNote(currentVaultPath, candidate, noteType, writeResult, directoryId);
      if (noteType === "literature") {
        literatureNoteId = candidate.id;
        literatureNotePath = writeResult.path;
        const error = new Error("late failure after catalog registration");
        error.code = "LATE_FAILURE";
        throw error;
      }
      return registered;
    }
  });

  await fs.writeFile(
    path.join(importRoot, "cleanup-row.md"),
    [
      "---",
      "title: Cleanup row candidate",
      "---",
      "",
      "This note should stay on disk if catalog cleanup fails."
    ].join("\n"),
    "utf8"
  );

  const preview = await service.createPreview("obsidian", { path: importRoot }, {}, "req_catalog_cleanup_preview");
  const record = await service.getImportRecord(preview.importRecordId);

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_catalog_cleanup_confirm"),
    { code: "CATALOG_DELETE_FAILED" }
  );

  assert.equal(record?.state, "failed");
  assert.equal(record?.failureResult?.code, "CATALOG_DELETE_FAILED");
  await fs.access(literatureNotePath);
  const literatureEntries = await listNoteCatalogEntriesByType(vaultPath, "literature");
  assert.ok(literatureEntries.some((entry) => entry.id === literatureNoteId));
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
