import fs from "node:fs/promises";
import path from "node:path";
import { normalizeSuggestion, transitionSuggestionStatus } from "./suggestions.mjs";

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
  return Math.max(1, Math.min(200, Math.floor(limit)));
}

function assertInitialSuggestionCreate(suggestion = {}, context = {}) {
  if (context.allowReviewedCreate === true || context.allow_reviewed_create === true) return;
  if (suggestion.status !== "suggested") {
    const error = new Error("new suggestions must start in suggested status");
    error.code = "AI_SUGGESTION_CREATE_STATUS_INVALID";
    throw error;
  }
}

function assertRequestedSuggestionCreateStatus(input = {}, context = {}) {
  if (context.allowReviewedCreate === true || context.allow_reviewed_create === true) return;
  const requestedStatus = cleanText(input.status || context.status) || "suggested";
  if (requestedStatus !== "suggested") {
    const error = new Error("new suggestions must start in suggested status");
    error.code = "AI_SUGGESTION_CREATE_STATUS_INVALID";
    throw error;
  }
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("SQLite suggestion store requires node:sqlite (Node.js 22+). Current runtime does not provide it.");
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
    CREATE TABLE IF NOT EXISTS ai_suggestions (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_field TEXT,
      source_artifact_id TEXT,
      target_json TEXT NOT NULL,
      scope TEXT NOT NULL,
      content_json TEXT NOT NULL,
      status TEXT NOT NULL,
      origin TEXT NOT NULL,
      model_json TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      history_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status_updated ON ai_suggestions(status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_target ON ai_suggestions(target_type, target_id, target_field);
  `);

  const columns = db.prepare("PRAGMA table_info(ai_suggestions)").all().map((column) => column.name);
  if (!columns.includes("source_artifact_id")) {
    db.exec("ALTER TABLE ai_suggestions ADD COLUMN source_artifact_id TEXT;");
  }
}

function rowToSuggestion(row) {
  if (!row) return null;
  return {
    id: row.id,
    target: parseJson(row.target_json, {
      type: row.target_type,
      id: row.target_id,
      ...(row.target_field ? { field: row.target_field } : {})
    }),
    sourceArtifactId: row.source_artifact_id || "",
    scope: row.scope,
    content: parseJson(row.content_json, null),
    status: row.status,
    origin: row.origin,
    model: parseJson(row.model_json, null),
    provenance: parseJson(row.provenance_json, {}),
    history: parseJson(row.history_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function insertOrReplaceSuggestion(db, suggestion) {
  db.prepare(
    `INSERT OR REPLACE INTO ai_suggestions
      (id, target_type, target_id, target_field, source_artifact_id, target_json, scope, content_json, status, origin, model_json, provenance_json, history_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    suggestion.id,
    suggestion.target.type,
    suggestion.target.id,
    suggestion.target.field || "",
    suggestion.sourceArtifactId || "",
    jsonString(suggestion.target),
    suggestion.scope,
    jsonString(suggestion.content),
    suggestion.status,
    suggestion.origin,
    jsonString(suggestion.model),
    jsonString(suggestion.provenance),
    jsonString(suggestion.history),
    suggestion.createdAt,
    suggestion.updatedAt
  );
}

export async function createSqliteSuggestionStore(options = {}) {
  const dbPath = await resolveAiDbPath(options);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  ensureSchema(db);

  return {
    dbPath,
    create(input, context = {}) {
      assertRequestedSuggestionCreateStatus(input, context);
      const suggestion = normalizeSuggestion(input, context);
      assertInitialSuggestionCreate(suggestion, context);
      insertOrReplaceSuggestion(db, suggestion);
      return suggestion;
    },
    get(id) {
      const row = db.prepare("SELECT * FROM ai_suggestions WHERE id = ? LIMIT 1").get(cleanText(id));
      return rowToSuggestion(row);
    },
    list(filters = {}) {
      const where = [];
      const params = [];
      const status = cleanText(filters.status);
      const targetType = cleanText(filters.targetType || filters.target_type);
      const targetId = cleanText(filters.targetId || filters.target_id);
      const sourceArtifactId = cleanText(filters.sourceArtifactId || filters.source_artifact_id);
      const scope = cleanText(filters.scope);
      if (status && status !== "all") {
        where.push("status = ?");
        params.push(status);
      }
      if (targetType) {
        where.push("target_type = ?");
        params.push(targetType);
      }
      if (targetId) {
        where.push("target_id = ?");
        params.push(targetId);
      }
      if (sourceArtifactId) {
        where.push("source_artifact_id = ?");
        params.push(sourceArtifactId);
      }
      if (scope) {
        where.push("scope = ?");
        params.push(scope);
      }
      const limit = normalizeLimit(filters.limit);
      const sql = `
        SELECT * FROM ai_suggestions
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, id ASC
        LIMIT ?
      `;
      return db.prepare(sql).all(...params, limit).map(rowToSuggestion);
    },
    transition(id, toStatus, input = {}) {
      const current = this.get(id);
      if (!current) {
        const error = new Error(`suggestionId not found: ${cleanText(id)}`);
        error.code = "AI_SUGGESTION_NOT_FOUND";
        throw error;
      }
      const next = transitionSuggestionStatus(current, toStatus, input);
      insertOrReplaceSuggestion(db, next);
      return next;
    },
    close() {
      db.close();
    }
  };
}
