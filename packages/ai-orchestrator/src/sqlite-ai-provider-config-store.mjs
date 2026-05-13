import fs from "node:fs/promises";
import path from "node:path";

import { assertValidAiProviderConfig, normalizeAiProviderConfig } from "./ai-provider-configs.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function jsonString(value) {
  return JSON.stringify(value ?? {});
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
    throw new Error("SQLite AI provider config store requires node:sqlite (Node.js 22+). Current runtime does not provide it.");
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
    CREATE TABLE IF NOT EXISTS ai_provider_configs (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      adapter_type TEXT NOT NULL,
      status TEXT NOT NULL,
      auth_mode TEXT NOT NULL,
      secret_ref TEXT NOT NULL DEFAULT '',
      endpoint_url TEXT NOT NULL DEFAULT '',
      headers_json TEXT NOT NULL DEFAULT '{}',
      capabilities_json TEXT NOT NULL DEFAULT '{}',
      model_map_json TEXT NOT NULL DEFAULT '{}',
      runtime_model_map_json TEXT NOT NULL DEFAULT '{}',
      health_check_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_status ON ai_provider_configs(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_provider ON ai_provider_configs(provider_id);
  `);
}

function rowToProviderConfig(row) {
  if (!row) return null;
  return normalizeAiProviderConfig({
    id: row.id,
    providerId: row.provider_id,
    displayName: row.display_name,
    adapterType: row.adapter_type,
    status: row.status,
    authMode: row.auth_mode,
    secretRef: row.secret_ref,
    endpointUrl: row.endpoint_url,
    headers: parseJson(row.headers_json, {}),
    capabilities: parseJson(row.capabilities_json, {}),
    modelMap: parseJson(row.model_map_json, {}),
    runtimeModelMap: parseJson(row.runtime_model_map_json, {}),
    healthCheck: parseJson(row.health_check_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

export async function createSqliteAiProviderConfigStore(options = {}) {
  const dbPath = await resolveAiDbPath(options);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  ensureSchema(db);

  function getProviderConfig(input = {}) {
    const id = cleanText(input.id || input.configId || input.config_id);
    const providerId = cleanText(input.providerId || input.provider_id);
    if (!id && !providerId) return null;
    const row = db
      .prepare(
        `SELECT *
         FROM ai_provider_configs
         WHERE (? != '' AND id = ?)
            OR (? != '' AND provider_id = ?)
         LIMIT 1`
      )
      .get(id, id, providerId, providerId);
    return rowToProviderConfig(row);
  }

  function setProviderConfig(input = {}) {
    const lookup = cleanText(input.id || input.configId || input.config_id);
    const providerId = cleanText(input.providerId || input.provider_id);
    const existing = getProviderConfig({ id: lookup, providerId }) || {};
    const config = assertValidAiProviderConfig({ ...existing, ...input });
    db.prepare(
      `INSERT INTO ai_provider_configs
        (id, provider_id, display_name, adapter_type, status, auth_mode, secret_ref, endpoint_url,
         headers_json, capabilities_json, model_map_json, runtime_model_map_json, health_check_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         provider_id = excluded.provider_id,
         display_name = excluded.display_name,
         adapter_type = excluded.adapter_type,
         status = excluded.status,
         auth_mode = excluded.auth_mode,
         secret_ref = excluded.secret_ref,
         endpoint_url = excluded.endpoint_url,
         headers_json = excluded.headers_json,
         capabilities_json = excluded.capabilities_json,
         model_map_json = excluded.model_map_json,
         runtime_model_map_json = excluded.runtime_model_map_json,
         health_check_json = excluded.health_check_json,
         updated_at = excluded.updated_at`
    ).run(
      config.id,
      config.providerId,
      config.displayName,
      config.adapterType,
      config.status,
      config.authMode,
      config.secretRef,
      config.endpointUrl,
      jsonString(config.headers || {}),
      jsonString(config.capabilities || {}),
      jsonString(config.modelMap || {}),
      jsonString(config.runtimeModelMap || {}),
      jsonString(config.healthCheck || {}),
      config.createdAt,
      config.updatedAt
    );
    return getProviderConfig({ id: config.id });
  }

  return {
    dbPath,
    close() {
      db.close();
    },
    setProviderConfig,
    upsertProviderConfig: setProviderConfig,
    getProviderConfig,
    listProviderConfigs(filter = {}) {
      const status = cleanText(filter.status);
      const rows = db
        .prepare(
          `SELECT *
           FROM ai_provider_configs
           WHERE (? = '' OR status = ?)
           ORDER BY updated_at DESC, provider_id ASC
           LIMIT ?`
        )
        .all(status, status, normalizeLimit(filter.limit));
      return rows.map(rowToProviderConfig);
    },
    deleteProviderConfig(input = {}) {
      const id = cleanText(input.id || input.configId || input.config_id);
      const providerId = cleanText(input.providerId || input.provider_id);
      if (!id && !providerId) return false;
      const result = db
        .prepare(
          `DELETE FROM ai_provider_configs
           WHERE (? != '' AND id = ?)
              OR (? != '' AND provider_id = ?)`
        )
        .run(id, id, providerId, providerId);
      return Number(result.changes || 0) > 0;
    }
  };
}
