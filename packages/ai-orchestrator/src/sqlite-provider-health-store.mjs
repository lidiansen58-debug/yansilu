import fs from "node:fs/promises";
import path from "node:path";

import { createInMemoryProviderHealthStore } from "./provider-health-store.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function jsonString(value) {
  return JSON.stringify(value ?? null);
}

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeLimit(value) {
  const limit = Number(value || 50);
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(500, Math.floor(limit)));
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("SQLite provider health store requires node:sqlite (Node.js 22+). Current runtime does not provide it.");
  }
}

async function resolveAiDbPath(options = {}) {
  const explicitPath = cleanText(options.dbPath || options.db_path);
  if (explicitPath) {
    await fs.mkdir(path.dirname(path.resolve(explicitPath)), { recursive: true });
    return path.resolve(explicitPath);
  }

  const vaultPath = cleanText(options.vaultPath || options.vault_path);
  if (!vaultPath) throw new Error("vaultPath or dbPath is required");
  const metaDir = path.join(path.resolve(vaultPath), ".yansilu");
  await fs.mkdir(metaDir, { recursive: true });
  return path.join(metaDir, "ai-agent.db");
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_health_checks (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      provider_config_id TEXT,
      status TEXT NOT NULL,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      checked_at TEXT NOT NULL,
      source TEXT NOT NULL,
      trigger TEXT,
      agent_run_id TEXT,
      message TEXT,
      error_type TEXT,
      retryable INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_provider_health_provider_checked ON provider_health_checks(provider_id, checked_at DESC);
    CREATE INDEX IF NOT EXISTS idx_provider_health_status_checked ON provider_health_checks(status, checked_at DESC);
    CREATE INDEX IF NOT EXISTS idx_provider_health_agent_run ON provider_health_checks(agent_run_id);
  `);
}

function rowToProviderHealth(row) {
  if (!row) return null;
  return {
    id: row.id,
    providerId: row.provider_id,
    providerConfigId: row.provider_config_id || "",
    status: row.status,
    latencyMs: Number(row.latency_ms || 0),
    checkedAt: row.checked_at,
    source: row.source,
    trigger: row.trigger || "",
    agentRunId: row.agent_run_id || "",
    message: row.message || "",
    errorType: row.error_type || "",
    retryable: row.retryable === 1,
    payload: parseJson(row.payload_json, {}),
    createdAt: row.created_at
  };
}

export async function createSqliteProviderHealthStore(options = {}) {
  const dbPath = await resolveAiDbPath(options);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  ensureSchema(db);

  const normalizer = createInMemoryProviderHealthStore();

  function recordProviderHealth(input = {}) {
    const record = normalizer.recordProviderHealth(input);
    normalizer.deleteProviderHealth({ id: record.id });
    db.prepare(
      `INSERT INTO provider_health_checks
        (id, provider_id, provider_config_id, status, latency_ms, checked_at, source, trigger, agent_run_id,
         message, error_type, retryable, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         provider_id = excluded.provider_id,
         provider_config_id = excluded.provider_config_id,
         status = excluded.status,
         latency_ms = excluded.latency_ms,
         checked_at = excluded.checked_at,
         source = excluded.source,
         trigger = excluded.trigger,
         agent_run_id = excluded.agent_run_id,
         message = excluded.message,
         error_type = excluded.error_type,
         retryable = excluded.retryable,
         payload_json = excluded.payload_json,
         created_at = excluded.created_at`
    ).run(
      record.id,
      record.providerId,
      record.providerConfigId,
      record.status,
      record.latencyMs,
      record.checkedAt,
      record.source,
      record.trigger,
      record.agentRunId,
      record.message,
      record.errorType,
      record.retryable ? 1 : 0,
      jsonString(record.payload || {}),
      record.createdAt
    );
    return getProviderHealthById(record.id);
  }

  function getProviderHealthById(id = "") {
    return rowToProviderHealth(
      db
        .prepare(
          `SELECT *
           FROM provider_health_checks
           WHERE id = ?
           LIMIT 1`
        )
        .get(cleanText(id))
    );
  }

  function listProviderHealth(filter = {}) {
    const providerId = cleanText(filter.providerId || filter.provider_id);
    const status = cleanText(filter.status);
    const source = cleanText(filter.source);
    const rows = db
      .prepare(
        `SELECT *
         FROM provider_health_checks
         WHERE (? = '' OR provider_id = ?)
           AND (? = '' OR status = ?)
           AND (? = '' OR source = ?)
         ORDER BY checked_at DESC, created_at DESC
         LIMIT ?`
      )
      .all(providerId, providerId, status, status, source, source, normalizeLimit(filter.limit));
    return rows.map(rowToProviderHealth);
  }

  function getLatestProviderHealth(input = {}) {
    const providerId = cleanText(input.providerId || input.provider_id);
    if (!providerId) return null;
    return listProviderHealth({ providerId, limit: 1 })[0] || null;
  }

  function listLatestProviderHealth(filter = {}) {
    const status = cleanText(filter.status);
    const rows = db
      .prepare(
        `SELECT ph.*
         FROM provider_health_checks ph
         INNER JOIN (
           SELECT provider_id, MAX(checked_at) AS checked_at
           FROM provider_health_checks
           GROUP BY provider_id
         ) latest
           ON latest.provider_id = ph.provider_id AND latest.checked_at = ph.checked_at
         WHERE (? = '' OR ph.status = ?)
         ORDER BY ph.checked_at DESC, ph.provider_id ASC
         LIMIT ?`
      )
      .all(status, status, normalizeLimit(filter.limit));
    return rows.map(rowToProviderHealth);
  }

  return {
    dbPath,
    close() {
      db.close();
    },
    recordProviderHealth,
    addProviderHealth: recordProviderHealth,
    getProviderHealthById,
    getLatestProviderHealth,
    listProviderHealth,
    listLatestProviderHealth,
    deleteProviderHealth(input = {}) {
      const id = cleanText(input.id || input.healthRecordId || input.health_record_id);
      if (!id) return false;
      const result = db.prepare("DELETE FROM provider_health_checks WHERE id = ?").run(id);
      return Number(result.changes || 0) > 0;
    }
  };
}
