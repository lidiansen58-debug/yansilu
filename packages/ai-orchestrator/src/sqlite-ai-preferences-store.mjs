import fs from "node:fs/promises";
import path from "node:path";

import { normalizeAiPreferences } from "./ai-preferences.mjs";

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

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("SQLite AI preferences store requires node:sqlite (Node.js 22+). Current runtime does not provide it.");
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
    CREATE TABLE IF NOT EXISTS user_ai_preferences (
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_mode TEXT NOT NULL,
      model_pack TEXT NOT NULL,
      monthly_budget REAL,
      confirmation_threshold REAL,
      fallback_policy_json TEXT NOT NULL DEFAULT '{}',
      privacy_json TEXT NOT NULL DEFAULT '{}',
      budget_json TEXT NOT NULL DEFAULT '{}',
      budget_state_json TEXT NOT NULL DEFAULT '{}',
      advanced_settings_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (workspace_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_ai_preferences_workspace ON user_ai_preferences(workspace_id, updated_at);
  `);
}

function rowToPreferences(row) {
  if (!row) return null;
  return normalizeAiPreferences({
    workspaceId: row.workspace_id,
    userId: row.user_id,
    userMode: row.user_mode,
    modelPack: row.model_pack,
    monthlyBudget: optionalNumber(row.monthly_budget),
    confirmationThreshold: optionalNumber(row.confirmation_threshold),
    fallbackPolicy: parseJson(row.fallback_policy_json, {}),
    privacy: parseJson(row.privacy_json, {}),
    budget: parseJson(row.budget_json, {}),
    budgetState: parseJson(row.budget_state_json, {}),
    advancedSettings: parseJson(row.advanced_settings_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

export async function createSqliteAiPreferencesStore(options = {}) {
  const dbPath = await resolveAiDbPath(options);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  ensureSchema(db);

  function getUserPreferences(input = {}) {
    const workspaceId = cleanText(input.workspaceId || input.workspace_id) || "local_workspace";
    const userId = cleanText(input.userId || input.user_id) || "local_user";
    return rowToPreferences(
      db
        .prepare(
          `SELECT *
           FROM user_ai_preferences
           WHERE workspace_id = ? AND user_id = ?
           LIMIT 1`
        )
        .get(workspaceId, userId)
    );
  }

  function setUserPreferences(input = {}) {
    const existing = getUserPreferences(input) || {};
    const preferences = normalizeAiPreferences(input, existing);
    db.prepare(
      `INSERT INTO user_ai_preferences
        (workspace_id, user_id, user_mode, model_pack, monthly_budget, confirmation_threshold,
         fallback_policy_json, privacy_json, budget_json, budget_state_json, advanced_settings_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(workspace_id, user_id) DO UPDATE SET
         user_mode = excluded.user_mode,
         model_pack = excluded.model_pack,
         monthly_budget = excluded.monthly_budget,
         confirmation_threshold = excluded.confirmation_threshold,
         fallback_policy_json = excluded.fallback_policy_json,
         privacy_json = excluded.privacy_json,
         budget_json = excluded.budget_json,
         budget_state_json = excluded.budget_state_json,
         advanced_settings_json = excluded.advanced_settings_json,
         updated_at = excluded.updated_at`
    ).run(
      preferences.workspaceId,
      preferences.userId,
      preferences.userMode,
      preferences.modelPack,
      preferences.monthlyBudget,
      preferences.confirmationThreshold,
      jsonString(preferences.fallbackPolicy || {}),
      jsonString(preferences.privacy || {}),
      jsonString(preferences.budget || {}),
      jsonString(preferences.budgetState || {}),
      jsonString(preferences.advancedSettings || {}),
      preferences.createdAt,
      preferences.updatedAt
    );
    return getUserPreferences(preferences);
  }

  return {
    dbPath,
    close() {
      db.close();
    },
    setUserPreferences,
    upsertUserPreferences: setUserPreferences,
    getUserPreferences,
    listUserPreferences(filter = {}) {
      const workspaceId = cleanText(filter.workspaceId || filter.workspace_id);
      const rows = db
        .prepare(
          `SELECT *
           FROM user_ai_preferences
           WHERE (? = '' OR workspace_id = ?)
           ORDER BY updated_at DESC, workspace_id ASC, user_id ASC
           LIMIT ?`
        )
        .all(workspaceId, workspaceId, Math.max(1, Math.min(200, Number(filter.limit || 50) || 50)));
      return rows.map(rowToPreferences);
    },
    deleteUserPreferences(input = {}) {
      const workspaceId = cleanText(input.workspaceId || input.workspace_id) || "local_workspace";
      const userId = cleanText(input.userId || input.user_id) || "local_user";
      const result = db
        .prepare("DELETE FROM user_ai_preferences WHERE workspace_id = ? AND user_id = ?")
        .run(workspaceId, userId);
      return Number(result.changes || 0) > 0;
    }
  };
}
