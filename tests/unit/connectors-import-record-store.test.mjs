import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import {
  appendImportRecord,
  contentHash,
  createdEntryFromWriteResult,
  loadImportRecord,
  listImportRecords,
  publicImportRecord,
  summarizeCandidateSelection,
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

test("listImportRecords restores records from disk in updated order with limit", async () => {
  const vaultPath = await makeTempVault();
  const olderPreview = {
    importRecordId: "imp_older",
    connector: "markdown",
    status: "preview",
    state: "preview",
    summary: { sources: 1, literatureNotes: 1, permanentNotes: 0, warnings: 0 },
    samples: { sourceIds: ["src_old"], literatureNoteIds: ["ln_old"], permanentNoteIds: [] },
    warnings: [],
    createdAt: "2026-04-22T00:00:00.000Z"
  };
  const newerPreview = {
    importRecordId: "imp_newer",
    connector: "readwise",
    status: "preview",
    state: "preview",
    summary: { sources: 1, literatureNotes: 1, permanentNotes: 0, warnings: 0 },
    samples: { sourceIds: ["src_new"], literatureNoteIds: ["ln_new"], permanentNoteIds: [] },
    warnings: [],
    createdAt: "2026-04-22T00:01:00.000Z"
  };

  await appendImportRecord(vaultPath, "markdown", "imp_older", "preview", {
    preview: olderPreview,
    payload: {},
    options: {},
    candidates: { sources: [], literature: [], permanent: [], warnings: [] }
  });
  await appendImportRecord(vaultPath, "readwise", "imp_newer", "preview", {
    preview: newerPreview,
    payload: {},
    options: {},
    candidates: { sources: [], literature: [], permanent: [], warnings: [] }
  });
  await appendImportRecord(vaultPath, "readwise", "imp_newer", "confirm", {
    created: { sources: 1, literatureNotes: 1, permanentNotes: 0 },
    skipped: { conflicted: 0, invalid: 0 },
    writtenPaths: ["notes/sources", "notes/literature"],
    createdFiles: [],
    finishedAt: "2026-04-22T00:02:00.000Z"
  });

  const records = await listImportRecords(vaultPath, { limit: 1 });

  assert.equal(records.length, 1);
  assert.equal(records[0].importRecordId, "imp_newer");
  assert.equal(records[0].state, "completed");
});

test("publicImportRecord returns the safe API-facing record shape", () => {
  const publicRecord = publicImportRecord({
    importRecordId: "imp_1",
    connector: "markdown",
    state: "completed",
    summary: { sources: 1 },
    samples: { sourceIds: ["src_1"] },
    candidates: {
      sources: [{ id: "src_1", title: "Source One", source_type: "markdown" }],
      literature: [{ id: "ln_1", title: "Literature One", quote_text: "Quote body." }],
      permanent: [],
      warnings: []
    },
    payload: { path: "notes" },
    options: { detectWikilinks: true },
    confirmResult: { created: { sources: 1 } },
    createdAt: "2026-04-22T00:00:00.000Z"
  });

  assert.equal(publicRecord.importRecordId, "imp_1");
  assert.equal(publicRecord.status, "completed");
  assert.equal(publicRecord.summary.sources, 1);
  assert.equal(publicRecord.candidatePreview.sources[0].title, "Source One");
  assert.equal(publicRecord.candidatePreview.literatureNotes[0].title, "Literature One");
  assert.deepEqual(publicRecord.candidateSelection, {
    sources: ["src_1"],
    literatureNotes: ["ln_1"],
    permanentNotes: [],
    total: { sources: 1, literatureNotes: 1, permanentNotes: 0 }
  });
  assert.equal(publicRecord.confirmResult.created.sources, 1);
});

test("summarizeCandidateSelection returns full candidate ids by group", () => {
  const selection = summarizeCandidateSelection({
    sources: [{ id: "src_1" }, { id: "src_2" }, { id: "src_1" }],
    literature: [{ id: "ln_1" }],
    permanent: [{ id: "pn_1" }, { id: "pn_2" }]
  });

  assert.deepEqual(selection, {
    sources: ["src_1", "src_2"],
    literatureNotes: ["ln_1"],
    permanentNotes: ["pn_1", "pn_2"],
    total: { sources: 2, literatureNotes: 1, permanentNotes: 2 }
  });
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

test("loadImportRecord restores failed lifecycle records from disk", async () => {
  const vaultPath = await makeTempVault();
  const preview = {
    importRecordId: "imp_failed",
    connector: "markdown",
    status: "preview",
    state: "preview",
    summary: { sources: 1, literatureNotes: 1, permanentNotes: 0, warnings: 0 },
    samples: { sourceIds: ["src_1"], literatureNoteIds: ["ln_1"], permanentNoteIds: [] },
    warnings: [],
    createdAt: "2026-06-01T00:00:00.000Z"
  };

  await appendImportRecord(vaultPath, "markdown", "imp_failed", "preview", {
    preview,
    payload: {},
    options: {},
    candidates: { sources: [], literature: [], permanent: [], warnings: [] }
  });
  await appendImportRecord(vaultPath, "markdown", "imp_failed", "failed", {
    code: "IMPORT_CLEANUP_PRESERVE_FAILED",
    message: "preserve move failed",
    details: { preserved: 1 },
    finishedAt: "2026-06-01T00:05:00.000Z"
  });

  const record = await loadImportRecord(vaultPath, "imp_failed");

  assert.equal(record?.state, "failed");
  assert.equal(record?.status, "preview");
  assert.equal(record?.failureResult?.code, "IMPORT_CLEANUP_PRESERVE_FAILED");
  assert.equal(record?.failureResult?.message, "preserve move failed");
  assert.equal(record?.updatedAt, "2026-06-01T00:05:00.000Z");
});
