import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createImportRecordJournal } from "../../apps/api/src/import-record-journal.mjs";

test("interrupted checkpoints reject paths outside the recorded vault", async t => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-import-invalid-checkpoint-"));
  t.after(() => fs.rm(vault, { recursive: true, force: true }));
  const journal = createImportRecordJournal();
  await journal.write({ importRecordId: "imp_escape", targetVaultPath: vault, state: "confirming",
    writeProgress: { files: [{ relativePath: "../outside.md", hash: "a".repeat(64) }], skipped: [] } });
  await assert.rejects(journal.read(vault, "imp_escape"), { code: "IMPORT_JOURNAL_INVALID" });
});

test("import journal retains completed records and fences interrupted imports", async t => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-import-journal-"));
  t.after(() => fs.rm(vault, { recursive: true, force: true }));
  const journal = createImportRecordJournal();
  await journal.write({ importRecordId: "imp_done", targetVaultPath: vault, state: "completed", confirmResult: { created: { sources: 1 } } });
  await journal.write({ importRecordId: "imp_pending", targetVaultPath: vault, state: "confirming" });
  const restarted = createImportRecordJournal();
  assert.equal((await restarted.read(vault, "imp_done")).state, "completed");
  assert.equal((await restarted.read(vault, "imp_pending")).state, "interrupted");
  assert.equal((await restarted.list(vault)).length, 2);
  await assert.rejects(restarted.read(vault, "../escape"), { code: "IMPORT_JOURNAL_INVALID" });
  await fs.writeFile(path.join(vault, ".yansilu", "import-records", "imp_done.json"), "{broken", "utf8");
  await assert.rejects(restarted.read(vault, "imp_done"), { code: "IMPORT_JOURNAL_INVALID" });
});
