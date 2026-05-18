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
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
    const permanentColumns = db.prepare("PRAGMA table_info('permanent_note_meta')").all().map((row) => row.name);
    const indexCardColumns = db.prepare("PRAGMA table_info('index_cards')").all().map((row) => row.name);
    const projectColumns = db.prepare("PRAGMA table_info('writing_projects')").all().map((row) => row.name);
    const linkColumns = db.prepare("PRAGMA table_info('links')").all().map((row) => row.name);

    assert.equal(permanentColumns.includes("thesis"), true);
    assert.equal(permanentColumns.includes("three_line_summary_json"), true);
    assert.equal(permanentColumns.includes("distillation_status"), true);

    assert.equal(indexCardColumns.includes("thesis"), true);
    assert.equal(indexCardColumns.includes("three_line_summary_json"), true);
    assert.equal(indexCardColumns.includes("central_question"), true);
    assert.equal(indexCardColumns.includes("boundary_or_counterpoint"), true);

    assert.equal(projectColumns.includes("intent"), true);
    assert.equal(projectColumns.includes("desired_reader_takeaway"), true);
    assert.equal(projectColumns.includes("knowledge_work_id"), true);

    assert.equal(linkColumns.includes("insight_question"), true);
    assert.equal(linkColumns.includes("status"), true);
    assert.equal(linkColumns.includes("updated_at"), true);
    assert.equal(linkColumns.includes("rationale_quality_score"), true);
    assert.equal(linkColumns.includes("rationale_quality_level"), true);

    assert.equal(tables.includes("knowledge_works"), true);
  } finally {
    db.close();
  }
});

test("catalog migration backfills historical wikilink relations to implicit status", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);
  const result = await applySqliteMigrations(vaultPath);

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(result.catalogPath);
  try {
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO notes (id, note_type, title, status, markdown_path, created_at, updated_at) VALUES (?, 'permanent', ?, 'active', ?, ?, ?)"
    ).run("note_src", "Source", "notes/original/source.md", now, now);
    db.prepare(
      "INSERT INTO notes (id, note_type, title, status, markdown_path, created_at, updated_at) VALUES (?, 'permanent', ?, 'active', ?, ?, ?)"
    ).run("note_tgt", "Target", "notes/original/target.md", now, now);
    db.prepare(
      "INSERT INTO notes (id, note_type, title, status, markdown_path, created_at, updated_at) VALUES (?, 'permanent', ?, 'active', ?, ?, ?)"
    ).run("note_other", "Other", "notes/original/other.md", now, now);
    db.prepare(
      `INSERT INTO links
        (id, from_note_id, to_note_id, relation_type, rationale, created_by, confidence, created_at, status, updated_at)
       VALUES (?, ?, ?, 'associated_with', 'markdown_wikilink', 'user', 1, ?, 'confirmed', ?)`
    ).run("lnk_old", "note_src", "note_tgt", now, now);
    db.prepare(
      `INSERT INTO links
        (id, from_note_id, to_note_id, relation_type, rationale, created_by, confidence, created_at, status, updated_at)
       VALUES (?, ?, ?, 'associated_with', 'markdown_wikilink', 'user', 1, ?, 'confirmed', ?)`
    ).run("lnk_edited", "note_src", "note_other", now, "2026-05-18T00:00:00.000Z");

    const migrationSql = await fs.readFile(
      path.join(process.cwd(), "packages", "domain", "src", "sqlite", "011_catalog_v2_2.sql"),
      "utf8"
    );
    db.exec(migrationSql);

    const row = db.prepare("SELECT status FROM links WHERE id = ? LIMIT 1").get("lnk_old");
    assert.equal(row.status, "implicit");
    const edited = db.prepare("SELECT status FROM links WHERE id = ? LIMIT 1").get("lnk_edited");
    assert.equal(edited.status, "confirmed");
  } finally {
    db.close();
  }
});
