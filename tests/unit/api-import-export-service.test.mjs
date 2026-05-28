import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildSelectedImportCandidates,
  createImportExportService
} from "../../apps/api/src/import-export-service.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
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

  await fs.mkdir(path.join(secondVault, "notes", "literature"), { recursive: true });
  await fs.writeFile(
    path.join(secondVault, "notes", "literature", "note-from-second-vault.md"),
    "---\ntype: literature\n---\n\n# From second vault\n",
    "utf8"
  );

  const service = createService({
    getVaultPath: () => activeVaultPath
  });

  activeVaultPath = secondVault;
  const result = await service.runMarkdownExport({ targetPath }, "req_test");

  assert.equal(result.copiedBreakdown.markdownFiles, 1);
  const exported = await fs.readFile(path.join(targetPath, "literature", "note-from-second-vault.md"), "utf8");
  assert.match(exported, /From second vault/);
});
