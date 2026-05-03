import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const DB_FILES = {
  catalog: "catalog.db",
  graphCache: "graph-cache.db",
  vectors: "vectors.db"
};

const MIGRATION_PLAN = {
  catalog: [
    { id: "001_catalog_v1_2", file: "001_catalog_v1_2.sql" },
    { id: "002_catalog_v1_3", file: "002_catalog_v1_3.sql" },
    { id: "003_catalog_v1_4", file: "003_catalog_v1_4.sql" },
    { id: "004_catalog_v1_5", file: "004_catalog_v1_5.sql" }
  ],
  graphCache: [{ id: "001_graph_cache_v1_2", file: "001_graph_cache_v1_2.sql" }],
  vectors: [{ id: "001_vectors_v1_2", file: "001_vectors_v1_2.sql" }]
};

function hashSql(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

async function readMigrationSql(fileName) {
  const fileUrl = new URL(`./sqlite/${fileName}`, import.meta.url);
  return fs.readFile(fileUrl, "utf8");
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error(
      "SQLite migrations require node:sqlite (Node.js 22+). Current runtime does not provide it."
    );
  }
}

function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function hasMigration(db, id) {
  const row = db
    .prepare("SELECT id, checksum FROM schema_migrations WHERE id = ? LIMIT 1")
    .get(id);
  return row || null;
}

function applySingleMigration(db, migrationId, sql) {
  const checksum = hashSql(sql);
  const existing = hasMigration(db, migrationId);
  if (existing) {
    if (existing.checksum !== checksum) {
      throw new Error(`Migration checksum mismatch for ${migrationId}`);
    }
    return { id: migrationId, applied: false, skipped: true };
  }

  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec(sql);
    db.prepare(
      "INSERT INTO schema_migrations (id, checksum, applied_at) VALUES (?, ?, ?)"
    ).run(migrationId, checksum, new Date().toISOString());
    db.exec("COMMIT;");
    return { id: migrationId, applied: true, skipped: false };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

async function applyPlanToDatabase(dbPath, plan) {
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    ensureMigrationTable(db);

    const results = [];
    for (const migration of plan) {
      const sql = await readMigrationSql(migration.file);
      const result = applySingleMigration(db, migration.id, sql);
      results.push(result);
    }
    return results;
  } finally {
    db.close();
  }
}

export async function applySqliteMigrations(vaultPath) {
  if (!vaultPath) throw new Error("vaultPath is required");

  const root = path.resolve(vaultPath);
  const metaDir = path.join(root, ".yansilu");
  await fs.mkdir(metaDir, { recursive: true });

  const catalogPath = path.join(metaDir, DB_FILES.catalog);
  const graphCachePath = path.join(metaDir, DB_FILES.graphCache);
  const vectorsPath = path.join(metaDir, DB_FILES.vectors);

  const [catalog, graphCache, vectors] = await Promise.all([
    applyPlanToDatabase(catalogPath, MIGRATION_PLAN.catalog),
    applyPlanToDatabase(graphCachePath, MIGRATION_PLAN.graphCache),
    applyPlanToDatabase(vectorsPath, MIGRATION_PLAN.vectors)
  ]);

  return {
    catalogPath,
    graphCachePath,
    vectorsPath,
    results: { catalog, graphCache, vectors }
  };
}

export const SQLITE_DB_FILES = DB_FILES;
