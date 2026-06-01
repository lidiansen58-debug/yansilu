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
    registerImportCatalogNote: overrides.registerImportCatalogNote || (async () => null),
    appendImportRecord: overrides.appendImportRecord,
    createdEntryFromWriteResult: overrides.createdEntryFromWriteResult,
    createdEntryFromVaultPath: overrides.createdEntryFromVaultPath,
    rollbackCreatedFiles: overrides.rollbackCreatedFiles
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
  await appendImportRecord(vaultPath, "markdown", record.importRecordId, "preview", {
    preview: {
      importRecordId: record.importRecordId,
      status: "preview",
      connector: "markdown",
      summary: { sources: 1, literatureNotes: 0, permanentNotes: 0, warnings: 0 },
      samples: { sourceIds: ["src_preserve_failed_record"], literatureNoteIds: [], permanentNoteIds: [] },
      candidatePreview: {
        sources: [{ id: "src_preserve_failed_record", type: "Source", title: "Preserve failed record", status: "candidate" }],
        literatureNotes: [],
        permanentNotes: [],
        total: { sources: 1, literatureNotes: 0, permanentNotes: 0 },
        truncated: false
      },
      candidateSelection: {
        sources: ["src_preserve_failed_record"],
        literatureNotes: [],
        permanentNotes: [],
        total: { sources: 1, literatureNotes: 0, permanentNotes: 0 }
      },
      warnings: [],
      originalityGuard: null,
      createdAt: record.createdAt
    },
    payload: record.payload,
    options: record.options,
    candidates: record.candidates
  });

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

test("confirmImport rejects an unknown selected directory id instead of silently falling back", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-invalid-dir-");
  const importRecords = new Map();
  await initVault(vaultPath);

  const record = {
    importRecordId: "imp_invalid_dir_1",
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
          id: "ln_invalid_dir",
          source_id: "src_invalid_dir",
          title: "Invalid directory target",
          quote_text: "Body",
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
    writeLiteratureNoteIfAbsent
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true, directoryId: "dir_missing_target" }, "req_invalid_dir"),
    {
      code: "IMPORT_DIRECTORY_INVALID",
      message: "directoryId not found: dir_missing_target"
    }
  );
});

test("confirmImport rejects a literature directory when the selected candidates include permanent notes", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-scope-dir-");
  const importRecords = new Map();
  await initVault(vaultPath);
  const literatureChild = await createDirectory(vaultPath, {
    title: "Imported reading batch",
    parentDirectoryId: "dir_literature_default",
    fsPath: path.join(vaultPath, "notes", "literature", "imported-reading-batch")
  });

  const record = {
    importRecordId: "imp_scope_dir_1",
    connector: "markdown",
    state: "preview",
    status: "preview",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    payload: {},
    options: {},
    candidates: {
      sources: [],
      literature: [],
      permanent: [
        {
          id: "pn_scope_dir",
          title: "Permanent target",
          core_claim: "A permanent claim",
          rationale: "Rationale",
          authorship: { user_confirmed: true, ai_assisted: false },
          originality_status: "pass",
          status: "draft",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z"
        }
      ],
      warnings: []
    }
  };
  importRecords.set(record.importRecordId, record);

  const service = createService({
    getVaultPath: () => vaultPath,
    importRecords,
    initVault,
    writePermanentNoteIfAbsent: async () => {
      throw new Error("should not write");
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true, directoryId: literatureChild.id }, "req_scope_dir"),
    {
      code: "IMPORT_DIRECTORY_SCOPE_INVALID",
      message: "directoryId must be a permanent-note directory for the selected permanent notes"
    }
  );
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

test("confirmImport cleans up source files when staged entry creation fails", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-source-stage-");
  const importRecords = new Map();
  await initVault(vaultPath);

  const record = {
    importRecordId: "imp_source_stage_1",
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
          id: "src_stage_fail",
          source_type: "markdown",
          title: "Source stage fail",
          imported_from: "local",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
          description: "Body"
        }
      ],
      literature: [],
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
    createdEntryFromWriteResult: async () => {
      throw Object.assign(new Error("entry build failed"), { code: "ENTRY_BUILD_FAILED" });
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_source_stage"),
    { code: "ENTRY_BUILD_FAILED" }
  );
  await assert.rejects(() => readNote(vaultPath, "source", "src_stage_fail"), { code: "ENOENT" });
});

test("confirmImport does not delete source files that changed before staged cleanup runs", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-source-modified-");
  const importRecords = new Map();
  await initVault(vaultPath);

  const record = {
    importRecordId: "imp_source_modified_1",
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
          id: "src_modified_stage",
          source_type: "markdown",
          title: "Modified during stage",
          imported_from: "local",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
          description: "Original content"
        }
      ],
      literature: [],
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
    createdEntryFromWriteResult: async (_vaultPath, result) => {
      await fs.writeFile(result.path, "# Modified during failure\n\nChanged body", "utf8");
      throw Object.assign(new Error("entry build failed after modification"), { code: "ENTRY_BUILD_FAILED" });
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_source_modified"),
    { code: "ENTRY_BUILD_FAILED" }
  );
  await assert.rejects(() => readNote(vaultPath, "source", "src_modified_stage"), { code: "ENOENT" });
  const recoveredFiles = (await listFiles(path.join(vaultPath, "imports", "recovered-failed-imports", "source"))).filter((filePath) =>
    path.basename(filePath).startsWith("src_modified_stage.preserved-")
  );
  assert.equal(recoveredFiles.length, 1);
  const recovered = await fs.readFile(recoveredFiles[0], "utf8");
  assert.match(recovered, /Modified during failure/);
  assert.match(recovered, /Changed body/);
});

test("confirmImport moves modified failed literature notes aside so retries are unblocked", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-literature-modified-");
  const importRecords = new Map();
  await initVault(vaultPath);

  const record = {
    importRecordId: "imp_literature_modified_1",
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
          id: "ln_modified_retry",
          source_id: "src_modified_retry",
          title: "Modified before rollback",
          quote_text: "Original body",
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
    writeLiteratureNoteIfAbsent,
    registerImportCatalogNote: async (_candidate, _noteType, result) => {
      await fs.writeFile(result.path, "# Preserved failed import\n\nChanged after write", "utf8");
      throw Object.assign(new Error("catalog registration failed"), { code: "CATALOG_WRITE_FAILED" });
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_literature_modified"),
    { code: "CATALOG_WRITE_FAILED" }
  );
  await assert.rejects(() => readNote(vaultPath, "literature", "ln_modified_retry"), { code: "ENOENT" });

  const recoveredFiles = (await listFiles(path.join(vaultPath, "imports", "recovered-failed-imports", "literature"))).filter((filePath) =>
    path.basename(filePath).startsWith("ln_modified_retry.preserved-")
  );
  assert.equal(recoveredFiles.length, 1);
  const retried = await writeLiteratureNoteIfAbsent(vaultPath, {
    id: "ln_modified_retry",
    source_id: "src_modified_retry",
    title: "Retry succeeds",
    quote_text: "Fresh content"
  });
  assert.equal(retried.written, true);
});

test("confirmImport surfaces cleanup failures when modified files cannot be moved into recovery storage", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-preserve-failure-");
  const importRecords = new Map();
  await initVault(vaultPath);
  await fs.mkdir(path.join(vaultPath, "imports"), { recursive: true });
  await fs.writeFile(path.join(vaultPath, "imports", "recovered-failed-imports"), "blocked", "utf8");

  const record = {
    importRecordId: "imp_preserve_fail_1",
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
          id: "src_preserve_fail",
          source_type: "markdown",
          title: "Preserve fail source",
          imported_from: "local",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
          description: "Original content"
        }
      ],
      literature: [],
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
    createdEntryFromWriteResult: async (_vaultPath, result) => {
      await fs.writeFile(result.path, "# Modified before preserve\n\nChanged body", "utf8");
      throw Object.assign(new Error("entry build failed after modification"), { code: "ENTRY_BUILD_FAILED" });
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_preserve_fail"),
    {
      code: "IMPORT_CLEANUP_PRESERVE_FAILED"
    }
  );
  const note = await readNote(vaultPath, "source", "src_preserve_fail");
  assert.equal(note.note.title, "Modified before preserve");
  assert.equal(note.note.body, "Changed body");
});

test("confirmImport persists failed lifecycle records when preserve cleanup fails", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-preserve-failed-record-");
  const importRecords = new Map();
  await initVault(vaultPath);
  await fs.mkdir(path.join(vaultPath, "imports"), { recursive: true });
  await fs.writeFile(path.join(vaultPath, "imports", "recovered-failed-imports"), "blocked", "utf8");

  const record = {
    importRecordId: "imp_preserve_failed_record_1",
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
          id: "src_preserve_failed_record",
          source_type: "markdown",
          title: "Preserve failed record",
          imported_from: "local",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
          description: "Original content"
        }
      ],
      literature: [],
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
    createdEntryFromWriteResult: async (_vaultPath, result) => {
      await fs.writeFile(result.path, "# Modified before preserve\n\nChanged body", "utf8");
      throw Object.assign(new Error("entry build failed after modification"), { code: "ENTRY_BUILD_FAILED" });
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_preserve_failed_record"),
    {
      code: "IMPORT_CLEANUP_PRESERVE_FAILED"
    }
  );

  const failedStagePath = path.join(vaultPath, "imports", "markdown", `${record.importRecordId}.failed.json`);
  const failedStage = JSON.parse(await fs.readFile(failedStagePath, "utf8"));
  assert.equal(failedStage.code, "IMPORT_CLEANUP_PRESERVE_FAILED");

});

test("confirmImport does not switch memory state to failed when failed stage persistence itself fails", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-failed-persist-");
  const importRecords = new Map();
  await initVault(vaultPath);
  await fs.mkdir(path.join(vaultPath, "imports"), { recursive: true });
  await fs.writeFile(path.join(vaultPath, "imports", "recovered-failed-imports"), "blocked", "utf8");

  const record = {
    importRecordId: "imp_failed_persist_1",
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
          id: "src_failed_persist",
          source_type: "markdown",
          title: "Failed persist source",
          imported_from: "local",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
          description: "Original content"
        }
      ],
      literature: [],
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
    appendImportRecord: async (_vaultPath, _connector, _recordId, stage) => {
      if (stage === "failed") {
        throw Object.assign(new Error("failed stage write failed"), { code: "IMPORT_FAILED_STAGE_WRITE_FAILED" });
      }
      return "";
    },
    createdEntryFromWriteResult: async (_vaultPath, result) => {
      await fs.writeFile(result.path, "# Modified before preserve\n\nChanged body", "utf8");
      throw Object.assign(new Error("entry build failed after modification"), { code: "ENTRY_BUILD_FAILED" });
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_failed_persist"),
    {
      code: "IMPORT_FAILED_STAGE_WRITE_FAILED"
    }
  );

  const memoryRecord = importRecords.get(record.importRecordId);
  assert.equal(memoryRecord?.state, "preview");
  assert.equal(memoryRecord?.failureResult, undefined);
});

test("confirmImport logically removes written notes when rollback skips modified files", async () => {
  const vaultPath = await makeTempDir("yansilu-service-modified-cleanup-");
  await initVault(vaultPath);
  const importRecords = new Map();
  const deletedCalls = [];
  const notePath = path.join(vaultPath, "notes", "literature", "ln_modified_cleanup.md");
  await fs.mkdir(path.dirname(notePath), { recursive: true });
  await fs.writeFile(notePath, "# Modified cleanup\n\nChanged body", "utf8");
  const record = {
    importRecordId: "imp_modified_cleanup_1",
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
          id: "ln_modified_cleanup",
          source_id: "src_modified_cleanup",
          title: "Modified cleanup",
          quote_text: "Body",
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
    writeLiteratureNoteIfAbsent: async () => ({
      written: true,
      skipped: false,
      noteId: "ln_modified_cleanup",
      noteType: "literature",
      path: notePath,
      contentHash: "abc123"
    }),
    createdEntryFromWriteResult: async () => ({
      noteId: "ln_modified_cleanup",
      noteType: "literature",
      path: "notes/literature/ln_modified_cleanup.md",
      hash: "abc123"
    }),
    registerImportCatalogNote: async () => {
      throw new Error("confirm downstream failed");
    },
    rollbackCreatedFiles: async (currentVaultPath, createdFiles = []) => {
      assert.equal(currentVaultPath, vaultPath);
      return {
        rolledBack: [],
        skipped: createdFiles.length
          ? [
              {
                noteId: "ln_modified_cleanup",
                noteType: "literature",
                path: "notes/literature/ln_modified_cleanup.md",
                hash: "abc123",
                reason: "modified"
              }
            ]
          : []
      };
    },
    deleteNoteById: async (_vaultPath, noteId, options = {}) => {
      deletedCalls.push({ noteId, options });
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_modified_cleanup"),
    /confirm downstream failed/
  );
  assert.deepEqual(deletedCalls, [{ noteId: "ln_modified_cleanup", options: { deleteFile: false } }]);
  await assert.rejects(() => fs.access(notePath), { code: "ENOENT" });
});

test("confirmImport cleans up copied obsidian assets when staged entry creation fails", async () => {
  const vaultPath = await makeTempDir("yansilu-service-confirm-asset-stage-vault-");
  const importRoot = await makeTempDir("yansilu-service-confirm-asset-stage-import-");
  const importRecords = new Map();
  await initVault(vaultPath);
  await fs.mkdir(path.join(importRoot, "images"), { recursive: true });
  await fs.writeFile(path.join(importRoot, "images", "figure.png"), "fake-image", "utf8");

  const record = {
    importRecordId: "imp_asset_stage_1",
    connector: "obsidian",
    state: "preview",
    status: "preview",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    payload: { path: importRoot },
    options: {},
    candidates: {
      sources: [],
      literature: [
        {
          id: "ln_asset_stage",
          source_id: "src_asset_stage",
          title: "Asset stage",
          quote_text: "Body",
          paraphrase_text: "",
          status: "draft",
          created_at: "2026-06-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
          parsed_wikilinks: [{ embed: true, target: "images/figure.png" }]
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
    writeLiteratureNoteIfAbsent,
    createdEntryFromVaultPath: async (_vaultPath, input) => {
      if (input?.noteType === "asset") {
        throw Object.assign(new Error("asset entry failed"), { code: "ASSET_ENTRY_FAILED" });
      }
      const rel = path.relative(vaultPath, input.filePath).replaceAll("\\", "/");
      return { noteId: input.noteId, noteType: input.noteType, path: rel, hash: "ok" };
    }
  });

  await assert.rejects(
    () => service.confirmImport(record, { confirm: true }, "req_asset_stage"),
    { code: "ASSET_ENTRY_FAILED" }
  );
  await assert.rejects(() => readNote(vaultPath, "literature", "ln_asset_stage"), { code: "ENOENT" });
  await fs.access(path.join(vaultPath, "assets", "imports"));
  const copiedAsset = path.join(vaultPath, "assets", "imports", record.importRecordId, "images", "figure.png");
  await assert.rejects(() => fs.access(copiedAsset), { code: "ENOENT" });
});
