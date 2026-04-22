import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import {
  appendImportRecord,
  contentHash,
  createdEntryFromWriteResult,
  publicImportRecord,
  rollbackCreatedFiles
} from "../../packages/connectors/src/index.mjs";

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-import-record-"));
}

test("appendImportRecord writes stage logs under imports connector directory", async () => {
  const vaultPath = await makeTempVault();
  const filePath = await appendImportRecord(vaultPath, "markdown", "imp_test", "preview", {
    ok: true
  });

  const raw = await fs.readFile(filePath, "utf8");
  assert.equal(path.basename(filePath), "imp_test.preview.json");
  assert.deepEqual(JSON.parse(raw), { ok: true });
});

test("publicImportRecord returns the safe API-facing record shape", () => {
  const publicRecord = publicImportRecord({
    importRecordId: "imp_1",
    connector: "markdown",
    state: "completed",
    summary: { sources: 1 },
    samples: { sourceIds: ["src_1"] },
    payload: { path: "notes" },
    options: { detectWikilinks: true },
    confirmResult: { created: { sources: 1 } },
    createdAt: "2026-04-22T00:00:00.000Z"
  });

  assert.equal(publicRecord.importRecordId, "imp_1");
  assert.equal(publicRecord.status, "completed");
  assert.equal(publicRecord.summary.sources, 1);
  assert.equal(publicRecord.confirmResult.created.sources, 1);
});

test("createdEntryFromWriteResult records vault-relative path and content hash", async () => {
  const vaultPath = await makeTempVault();
  const filePath = path.join(vaultPath, "notes", "sources", "src_1.md");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "source content", "utf8");

  const entry = await createdEntryFromWriteResult(vaultPath, {
    path: filePath,
    noteId: "src_1",
    noteType: "source"
  });

  assert.equal(entry.path, "notes/sources/src_1.md");
  assert.equal(entry.hash, contentHash("source content"));
});

test("rollbackCreatedFiles removes unchanged files and skips modified files", async () => {
  const vaultPath = await makeTempVault();
  const unchangedPath = path.join(vaultPath, "notes", "sources", "src_1.md");
  const modifiedPath = path.join(vaultPath, "notes", "literature", "ln_1.md");
  await fs.mkdir(path.dirname(unchangedPath), { recursive: true });
  await fs.mkdir(path.dirname(modifiedPath), { recursive: true });
  await fs.writeFile(unchangedPath, "unchanged", "utf8");
  await fs.writeFile(modifiedPath, "original", "utf8");

  const createdFiles = [
    {
      noteId: "src_1",
      noteType: "source",
      path: "notes/sources/src_1.md",
      hash: contentHash("unchanged")
    },
    {
      noteId: "ln_1",
      noteType: "literature",
      path: "notes/literature/ln_1.md",
      hash: contentHash("original")
    }
  ];

  await fs.writeFile(modifiedPath, "edited by user", "utf8");
  const result = await rollbackCreatedFiles(vaultPath, createdFiles);

  assert.equal(result.rolledBack.length, 1);
  assert.equal(result.rolledBack[0].noteId, "src_1");
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, "modified");
  await assert.rejects(() => fs.access(unchangedPath));
  await fs.access(modifiedPath);
});
