import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { appendImportRecord } from "../../packages/connectors/src/import-record-store.mjs";
import {
  readNote,
  createDirectory,
  createNoteInDirectory,
  initVault,
  writeLiteratureNoteIfAbsent,
  writeSourceIfAbsent
} from "../../packages/domain/src/index.mjs";
import {
  buildSelectedImportCandidates,
  createImportExportService
} from "../../apps/api/src/import-export-service.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function listFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(fullPath)));
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function createService(overrides = {}) {
  return createImportExportService({
    getVaultPath: overrides.getVaultPath || (() => ""),
    getCwd: overrides.getCwd || (() => process.cwd()),
    importRecords: overrides.importRecords || new Map(),
    initVault: overrides.initVault || (async () => {}),
    writeSourceIfAbsent: overrides.writeSourceIfAbsent || (async () => ({ written: false })),
    writeLiteratureNoteIfAbsent: overrides.writeLiteratureNoteIfAbsent || (async () => ({ written: false })),
    writePermanentNoteIfAbsent: overrides.writePermanentNoteIfAbsent || (async () => ({ written: false })),
    deleteNoteById: overrides.deleteNoteById || (async () => {}),
    registerImportCatalogNote: overrides.registerImportCatalogNote || (async () => null)
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

  const service = createService({
    getVaultPath: () => activeVaultPath,
    initVault
  });

  activeVaultPath = secondVault;
  const result = await service.runMarkdownExport({ targetPath, directoryId: "dir_original_default" }, "req_test");

  assert.equal(result.copiedBreakdown.markdownFiles, 1);
  const exportedMarkdownFiles = (await listFiles(targetPath)).filter((filePath) => filePath.toLowerCase().endsWith(".md"));
  assert.equal(exportedMarkdownFiles.length, 1);
  const exported = await fs.readFile(exportedMarkdownFiles[0], "utf8");
  assert.match(exported, /From second vault/);
});

test("confirmImport persists cancelled records so history survives reload", async () => {
  const vaultPath = await makeTempDir("yansilu-service-cancel-");
  const importRecords = new Map();
  const record = {
    importRecordId: "imp_cancel_1",
    connector: "markdown",
    state: "preview",
    status: "preview",
    createdAt: "2026-05-28T00:00:00.000Z",
    payload: {},
    options: {},
    candidates: { sources: [], literature: [], permanent: [], warnings: [] }
  };
  importRecords.set(record.importRecordId, record);
  await appendImportRecord(vaultPath, "markdown", record.importRecordId, "preview", {
    preview: {
      importRecordId: record.importRecordId,
      status: "preview",
      connector: "markdown",
      summary: { sources: 0, literatureNotes: 0, permanentNotes: 0, warnings: 0 },
      samples: { sourceIds: [], literatureNoteIds: [], permanentNoteIds: [] },
      candidatePreview: { total: { sources: 0, literatureNotes: 0, permanentNotes: 0 } },
      warnings: [],
      originalityGuard: null,
      createdAt: record.createdAt
    },
    payload: {},
    options: {},
    candidates: record.candidates
  });

  const service = createService({
    getVaultPath: () => vaultPath,
    importRecords
  });

  const result = await service.confirmImport(record, { confirm: false }, "req_cancel");
  assert.equal(result.status, "cancelled");
  assert.equal(importRecords.get(record.importRecordId)?.state, "cancelled");

  importRecords.clear();
  const reloaded = await service.getImportRecord(record.importRecordId);
  assert.equal(reloaded?.state, "cancelled");
  assert.match(String(reloaded?.updatedAt || ""), /T/);
});

test("runMarkdownExport requires a permanent-note directory id", async () => {
  const vaultPath = await makeTempDir("yansilu-service-export-scope-");
  await initVault(vaultPath);
  const literatureChild = await createDirectory(vaultPath, {
    title: "Literature child",
    parentDirectoryId: "dir_literature_default",
    fsPath: path.join(vaultPath, "notes", "literature", "literature-child")
  });
  const service = createService({
    getVaultPath: () => vaultPath,
    getCwd: () => process.cwd()
  });

  await assert.rejects(
    () => service.runMarkdownExport({ targetPath: "E:\\exports", directoryId: "dir_literature_default" }, "req_bad_dir"),
    {
      code: "EXPORT_SCOPE_INVALID",
      message: "directoryId must be a permanent-note directory"
    }
  );

  await assert.rejects(
    () => service.runMarkdownExport({ targetPath: "E:\\exports", directoryId: literatureChild.id }, "req_lit_child"),
    {
      code: "EXPORT_SCOPE_INVALID",
      message: "directoryId must be a permanent-note directory"
    }
  );
});

test("runMarkdownExport allows exporting the entire vault when no scope is provided", async () => {
  const vaultPath = await makeTempDir("yansilu-service-export-all-");
  const targetPath = await makeTempDir("yansilu-service-export-all-target-");
  await initVault(vaultPath);

  await createNoteInDirectory(vaultPath, {
    directoryId: "dir_literature_default",
    title: "All export literature",
    body: "Literature note for full export."
  });
  await createNoteInDirectory(vaultPath, {
    directoryId: "dir_original_default",
    title: "All export permanent",
    body: "Permanent note for full export."
  });
  await fs.mkdir(path.join(vaultPath, "assets", "images"), { recursive: true });
  await fs.writeFile(path.join(vaultPath, "assets", "images", "full-export.txt"), "asset", "utf8");

  const service = createService({
    getVaultPath: () => vaultPath,
    getCwd: () => process.cwd(),
    initVault
  });

  const result = await service.runMarkdownExport({ targetPath }, "req_export_all");

  assert.deepEqual(result.scope, { type: "all" });
  assert.equal(result.copiedBreakdown.markdownFiles, 2);
  assert.equal(result.copiedBreakdown.assetFiles, 1);
  await fs.access(path.join(targetPath, "literature"));
  await fs.access(path.join(targetPath, "original"));
  await fs.access(path.join(targetPath, "assets", "images", "full-export.txt"));
});

test("confirmImport reports only directories that received imported notes", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-targets-");
  const importRecords = new Map();
  await initVault(vaultPath);

  const literatureChild = await createDirectory(vaultPath, {
    title: "Imported reading batch",
    parentDirectoryId: "dir_literature_default",
    fsPath: path.join(vaultPath, "notes", "literature", "imported-reading-batch")
  });

  const record = {
    importRecordId: "imp_targets_1",
    connector: "markdown",
    state: "preview",
    status: "preview",
    createdAt: "2026-05-30T00:00:00.000Z",
    updatedAt: "2026-05-30T00:00:00.000Z",
    payload: {},
    options: {},
    candidates: {
      sources: [
        {
          id: "src_target",
          source_type: "markdown",
          title: "Source",
          imported_from: "local",
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:00:00.000Z",
          description: "Source body"
        }
      ],
      literature: [
        {
          id: "ln_target",
          source_id: "src_target",
          title: "Literature",
          quote_text: "Literature body",
          paraphrase_text: "",
          status: "draft",
          created_at: "2026-05-30T00:00:00.000Z",
          updated_at: "2026-05-30T00:00:00.000Z"
        }
      ],
      permanent: [],
      warnings: []
    }
  };
  importRecords.set(record.importRecordId, record);

  const service = createService({
    getVaultPath: () => vaultPath,
    importRecords,
    initVault,
    writeSourceIfAbsent,
    writeLiteratureNoteIfAbsent
  });

  const result = await service.confirmImport(
    record,
    {
      confirm: true,
      selectedCandidateIds: ["src_target", "ln_target"],
      directoryId: literatureChild.id
    },
    "req_targets"
  );

  assert.equal(result.result.targetDirectories.length, 1);
  assert.equal(result.result.targetDirectories[0].noteType, "literature");
  assert.equal(result.result.targetDirectories[0].directoryId, literatureChild.id);
  assert.match(result.result.targetDirectories[0].label, /Imported reading batch/);
});

test("confirmImport cleans up already written files when catalog registration fails", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-cleanup-");
  const importRecords = new Map();
  await initVault(vaultPath);

  const record = {
    importRecordId: "imp_cleanup_1",
    connector: "markdown",
    state: "preview",
    status: "preview",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    payload: {},
    options: {},
    candidates: {
      sources: [
        {
          id: "src_cleanup",
          source_type: "markdown",
          title: "Cleanup source",
          imported_from: "local",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
          description: "Cleanup body"
        }
      ],
      literature: [
        {
          id: "ln_cleanup",
          source_id: "src_cleanup",
          title: "Cleanup literature",
          quote_text: "Cleanup quote",
          paraphrase_text: "",
          status: "draft",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z"
        }
      ],
      permanent: [],
      warnings: []
    }
  };
  importRecords.set(record.importRecordId, record);

  const service = createService({
    getVaultPath: () => vaultPath,
    importRecords,
    initVault,
    writeSourceIfAbsent,
    writeLiteratureNoteIfAbsent,
    registerImportCatalogNote: async () => {
      throw new Error("catalog unavailable");
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_cleanup"),
    /catalog unavailable/
  );

  await assert.rejects(() => readNote(vaultPath, "source", "src_cleanup"), { code: "ENOENT" });
  await assert.rejects(() => readNote(vaultPath, "literature", "ln_cleanup"), { code: "ENOENT" });
});

test("confirmImport does not register catalog entries when write result cannot be materialized", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-created-entry-");
  const importRecords = new Map();
  await initVault(vaultPath);
  const calls = [];

  const record = {
    importRecordId: "imp_created_entry_1",
    connector: "markdown",
    state: "preview",
    status: "preview",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    payload: {},
    options: {},
    candidates: {
      sources: [],
      literature: [
        {
          id: "ln_missing_file",
          source_id: "src_missing_file",
          title: "Broken literature",
          quote_text: "Broken quote",
          paraphrase_text: "",
          status: "draft",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z"
        }
      ],
      permanent: [],
      warnings: []
    }
  };
  importRecords.set(record.importRecordId, record);

  const service = createService({
    getVaultPath: () => vaultPath,
    importRecords,
    initVault,
    writeLiteratureNoteIfAbsent: async () => ({
      written: true,
      skipped: false,
      noteId: "ln_missing_file",
      noteType: "literature",
      path: path.join(vaultPath, "notes", "literature", "missing-file.md")
    }),
    registerImportCatalogNote: async () => {
      calls.push("register");
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_created_entry"),
    { code: "ENOENT" }
  );
  assert.deepEqual(calls, []);
});
