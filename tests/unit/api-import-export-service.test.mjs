import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { appendImportRecord } from "../../packages/connectors/src/import-record-store.mjs";
import { createNoteInDirectory, initVault } from "../../packages/domain/src/index.mjs";
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
  const service = createService({
    getVaultPath: () => "",
    getCwd: () => process.cwd()
  });

  await assert.rejects(() => service.runMarkdownExport({ targetPath: "E:\\exports" }, "req_missing_dir"), {
    code: "EXPORT_SCOPE_INVALID",
    message: "directoryId required"
  });

  await assert.rejects(
    () => service.runMarkdownExport({ targetPath: "E:\\exports", directoryId: "dir_literature_default" }, "req_bad_dir"),
    {
      code: "EXPORT_SCOPE_INVALID",
      message: "directoryId must be a permanent-note directory"
    }
  );
});
