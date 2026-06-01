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
  const siblingFiles = await fs.readdir(path.dirname(filePath));
  assert.equal(siblingFiles.some((name) => name.endsWith(".tmp")), false);
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
  assert.equal(records[0].updatedAt, "2026-04-22T00:02:00.000Z");
});

test("loadImportRecord returns a recoverable failed record when preview stage json is corrupt", async () => {
  const vaultPath = await makeTempVault();
  const connectorDir = path.join(vaultPath, "imports", "markdown");
  await fs.mkdir(connectorDir, { recursive: true });
  await fs.writeFile(path.join(connectorDir, "imp_corrupt_preview.preview.json"), '{"preview": ', "utf8");

  const record = await loadImportRecord(vaultPath, "imp_corrupt_preview");

  assert.equal(record?.importRecordId, "imp_corrupt_preview");
  assert.equal(record?.state, "failed");
  assert.equal(record?.failureResult?.code, "IMPORT_RECORD_STAGE_CORRUPTED");
  assert.equal(record?.failureResult?.details?.stages?.[0]?.stage, "preview");
  assert.deepEqual(record?.candidateSelection, {
    sources: [],
    literatureNotes: [],
    permanentNotes: [],
    total: { sources: 0, literatureNotes: 0, permanentNotes: 0 }
  });
});

test("listImportRecords tolerates corrupt optional stage json without dropping healthy records", async () => {
  const vaultPath = await makeTempVault();
  const preview = {
    importRecordId: "imp_confirm_corrupt",
    connector: "markdown",
    status: "preview",
    state: "preview",
    summary: { sources: 1, literatureNotes: 0, permanentNotes: 0, warnings: 0 },
    samples: { sourceIds: ["src_corrupt"], literatureNoteIds: [], permanentNoteIds: [] },
    warnings: [],
    createdAt: "2026-06-01T00:00:00.000Z"
  };

  await appendImportRecord(vaultPath, "markdown", "imp_confirm_corrupt", "preview", {
    preview,
    payload: {},
    options: {},
    candidates: { sources: [{ id: "src_corrupt" }], literature: [], permanent: [], warnings: [] }
  });
  await fs.writeFile(
    path.join(vaultPath, "imports", "markdown", "imp_confirm_corrupt.confirm.json"),
    '{"created": ',
    "utf8"
  );
  await appendImportRecord(vaultPath, "markdown", "imp_healthy", "preview", {
    preview: {
      ...preview,
      importRecordId: "imp_healthy",
      createdAt: "2026-06-01T00:01:00.000Z"
    },
    payload: {},
    options: {},
    candidates: { sources: [{ id: "src_healthy" }], literature: [], permanent: [], warnings: [] }
  });

  const records = await listImportRecords(vaultPath, { limit: 10 });
  const byId = new Map(records.map((record) => [record.importRecordId, record]));

  assert.equal(records.length, 2);
  assert.equal(byId.get("imp_healthy")?.state, "preview");
  assert.equal(byId.get("imp_confirm_corrupt")?.state, "failed");
  assert.equal(byId.get("imp_confirm_corrupt")?.failureResult?.code, "IMPORT_RECORD_STAGE_CORRUPTED");
  assert.equal(byId.get("imp_confirm_corrupt")?.warnings?.some((item) => item.code === "IMPORT_RECORD_STAGE_CORRUPTED"), true);
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
    candidateSelection: {
      sources: ["src_1"],
      literatureNotes: ["ln_1"],
      permanentNotes: [],
      total: { sources: 1, literatureNotes: 1, permanentNotes: 0 }
    },
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
    selection: {
      mode: "subset",
      candidateIds: ["ln_1"],
      totalCandidates: 2,
      selectedCandidates: 1,
      counts: { sources: 0, literatureNotes: 1, permanentNotes: 0 }
    },
    candidateSelection: {
      sources: [],
      literatureNotes: ["ln_1"],
      permanentNotes: [],
      total: { sources: 0, literatureNotes: 1, permanentNotes: 0 }
    },
    originalityGuard: {
      plan: { allowDraftOnWarning: true, blockOnBlocked: true, blockThreshold: 0.85, warnThreshold: 0.6 },
      blockedPermanentIds: [],
      evaluations: []
    },
    finishedAt: "2026-06-01T00:05:00.000Z"
  });

  const record = await loadImportRecord(vaultPath, "imp_failed");

  assert.equal(record?.state, "failed");
  assert.equal(record?.status, "preview");
  assert.equal(record?.failureResult?.code, "IMPORT_CLEANUP_PRESERVE_FAILED");
  assert.equal(record?.failureResult?.message, "preserve move failed");
  assert.equal(record?.failureResult?.selection?.selectedCandidates, 1);
  assert.deepEqual(record?.candidateSelection, {
    sources: [],
    literatureNotes: ["ln_1"],
    permanentNotes: [],
    total: { sources: 0, literatureNotes: 1, permanentNotes: 0 }
  });
  assert.equal(record?.updatedAt, "2026-06-01T00:05:00.000Z");
});

test("loadImportRecord prioritizes failed lifecycle over completed confirm records", async () => {
  const vaultPath = await makeTempVault();
  const preview = {
    importRecordId: "imp_failed_after_confirm",
    connector: "markdown",
    status: "preview",
    state: "preview",
    summary: { sources: 1, literatureNotes: 1, permanentNotes: 0, warnings: 0 },
    samples: { sourceIds: ["src_1"], literatureNoteIds: ["ln_1"], permanentNoteIds: [] },
    warnings: [],
    createdAt: "2026-06-01T00:00:00.000Z"
  };

  await appendImportRecord(vaultPath, "markdown", "imp_failed_after_confirm", "preview", {
    preview,
    payload: {},
    options: {},
    candidates: { sources: [], literature: [], permanent: [], warnings: [] }
  });
  await appendImportRecord(vaultPath, "markdown", "imp_failed_after_confirm", "confirm", {
    created: { sources: 1, literatureNotes: 1, permanentNotes: 0 },
    skipped: { conflicted: 0, invalid: 0 },
    selection: {
      mode: "all",
      candidateIds: ["src_1", "ln_1"],
      totalCandidates: 2,
      selectedCandidates: 2,
      counts: { sources: 1, literatureNotes: 1, permanentNotes: 0 }
    },
    targetDirectories: [],
    writtenPaths: ["notes/sources", "notes/literature"],
    createdFiles: [],
    finishedAt: "2026-06-01T00:03:00.000Z"
  });
  await appendImportRecord(vaultPath, "markdown", "imp_failed_after_confirm", "failed", {
    code: "IMPORT_ROLLBACK_RESTORE_CONFLICT",
    message: "rollback restore preserved newer files without overwriting them",
    details: {
      conflicts: [{ noteId: "ln_1", noteType: "literature", path: "notes/literature/ln_1.md", preservedPath: "imports/rollback-recovery-conflicts/conflict.md" }]
    },
    selection: {
      mode: "all",
      candidateIds: ["src_1", "ln_1"],
      totalCandidates: 2,
      selectedCandidates: 2,
      counts: { sources: 1, literatureNotes: 1, permanentNotes: 0 }
    },
    candidateSelection: {
      sources: ["src_1"],
      literatureNotes: ["ln_1"],
      permanentNotes: [],
      total: { sources: 1, literatureNotes: 1, permanentNotes: 0 }
    },
    originalityGuard: null,
    finishedAt: "2026-06-01T00:04:00.000Z"
  });

  const record = await loadImportRecord(vaultPath, "imp_failed_after_confirm");

  assert.equal(record?.state, "failed");
  assert.equal(record?.confirmResult?.finishedAt, "2026-06-01T00:03:00.000Z");
  assert.equal(record?.failureResult?.code, "IMPORT_ROLLBACK_RESTORE_CONFLICT");
  assert.equal(record?.updatedAt, "2026-06-01T00:04:00.000Z");
});

test("loadImportRecord ignores stale failed lifecycle once rollback completes", async () => {
  const vaultPath = await makeTempVault();
  const preview = {
    importRecordId: "imp_rolled_back_after_failed",
    connector: "markdown",
    status: "preview",
    state: "preview",
    summary: { sources: 1, literatureNotes: 1, permanentNotes: 0, warnings: 0 },
    samples: { sourceIds: ["src_1"], literatureNoteIds: ["ln_1"], permanentNoteIds: [] },
    warnings: [],
    createdAt: "2026-06-01T00:00:00.000Z"
  };

  await appendImportRecord(vaultPath, "markdown", "imp_rolled_back_after_failed", "preview", {
    preview,
    payload: {},
    options: {},
    candidates: {
      sources: [{ id: "src_1" }],
      literature: [{ id: "ln_1" }],
      permanent: [],
      warnings: []
    }
  });
  await appendImportRecord(vaultPath, "markdown", "imp_rolled_back_after_failed", "confirm", {
    created: { sources: 0, literatureNotes: 1, permanentNotes: 0 },
    skipped: { conflicted: 0, invalid: 0 },
    selection: {
      mode: "subset",
      candidateIds: ["ln_1"],
      totalCandidates: 2,
      selectedCandidates: 1,
      counts: { sources: 0, literatureNotes: 1, permanentNotes: 0 }
    },
    targetDirectories: [],
    writtenPaths: ["notes/literature"],
    createdFiles: [],
    finishedAt: "2026-06-01T00:03:00.000Z"
  });
  await appendImportRecord(vaultPath, "markdown", "imp_rolled_back_after_failed", "failed", {
    code: "IMPORT_ROLLBACK_RESTORE_CONFLICT",
    message: "rollback restore preserved newer files without overwriting them",
    details: { conflicts: [] },
    selection: {
      mode: "subset",
      candidateIds: ["ln_1"],
      totalCandidates: 2,
      selectedCandidates: 1,
      counts: { sources: 0, literatureNotes: 1, permanentNotes: 0 }
    },
    candidateSelection: {
      sources: [],
      literatureNotes: ["ln_1"],
      permanentNotes: [],
      total: { sources: 0, literatureNotes: 1, permanentNotes: 0 }
    },
    originalityGuard: null,
    finishedAt: "2026-06-01T00:04:00.000Z"
  });
  await appendImportRecord(vaultPath, "markdown", "imp_rolled_back_after_failed", "rollback", {
    rolledBack: [],
    skipped: [],
    finishedAt: "2026-06-01T00:05:00.000Z"
  });

  const record = await loadImportRecord(vaultPath, "imp_rolled_back_after_failed");

  assert.equal(record?.state, "rolled_back");
  assert.equal(record?.failureResult, null);
  assert.deepEqual(record?.candidateSelection, {
    sources: [],
    literatureNotes: ["ln_1"],
    permanentNotes: [],
    total: { sources: 0, literatureNotes: 1, permanentNotes: 0 }
  });
  assert.equal(record?.updatedAt, "2026-06-01T00:05:00.000Z");
});
