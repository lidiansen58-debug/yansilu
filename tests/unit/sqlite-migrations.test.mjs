import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { initVault, SQLITE_DB_FILES, applySqliteMigrations } from "../../packages/domain/src/index.mjs";

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-sqlite-"));
}

async function hasNodeSqlite() {
  try {
    await import("node:sqlite");
    return true;
  } catch {
    return false;
  }
}

test("applySqliteMigrations creates three database files when node:sqlite is available", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);

  const result = await applySqliteMigrations(vaultPath);
  assert.ok(result.catalogPath.endsWith(SQLITE_DB_FILES.catalog));
  assert.ok(result.graphCachePath.endsWith(SQLITE_DB_FILES.graphCache));
  assert.ok(result.vectorsPath.endsWith(SQLITE_DB_FILES.vectors));

  const files = [result.catalogPath, result.graphCachePath, result.vectorsPath];
  for (const filePath of files) {
    const stat = await fs.stat(filePath);
    assert.equal(stat.isFile(), true);
  }

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(result.catalogPath);
  try {
    const permanentColumns = db.prepare("PRAGMA table_info('permanent_note_meta')").all().map((row) => row.name);
    const indexCardColumns = db.prepare("PRAGMA table_info('index_cards')").all().map((row) => row.name);
    const projectColumns = db.prepare("PRAGMA table_info('writing_projects')").all().map((row) => row.name);

    assert.equal(permanentColumns.includes("thesis"), true);
    assert.equal(permanentColumns.includes("three_line_summary_json"), true);
    assert.equal(permanentColumns.includes("distillation_status"), true);

    assert.equal(indexCardColumns.includes("thesis"), true);
    assert.equal(indexCardColumns.includes("three_line_summary_json"), true);
    assert.equal(indexCardColumns.includes("central_question"), true);

    assert.equal(projectColumns.includes("intent"), true);
    assert.equal(projectColumns.includes("desired_reader_takeaway"), true);
  } finally {
    db.close();
  }
});
