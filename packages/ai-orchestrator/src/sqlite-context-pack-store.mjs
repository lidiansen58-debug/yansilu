import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

function cleanText(value) {
  return String(value || "").trim();
}

function generatedId(prefix = "row") {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
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

function contentHash(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function contentExcerpt(item = {}, options = {}) {
  const privacyMode = cleanText(item.privacy?.mode) || "normal";
  if (privacyMode === "local_only" && options.storeLocalOnlyExcerpt !== true) return "";
  const text = String(item.content || "").replace(/\s+/g, " ").trim();
  const maxLength = Math.max(0, Math.min(500, Number(options.maxExcerptLength || 240) || 240));
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("SQLite context pack store requires node:sqlite (Node.js 22+). Current runtime does not provide it.");
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
    CREATE TABLE IF NOT EXISTS context_packs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_run_id TEXT,
      task_type TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      privacy_mode TEXT NOT NULL,
      cloud_allowed INTEGER NOT NULL DEFAULT 0,
      redactions_applied INTEGER NOT NULL DEFAULT 0,
      target_input_tokens INTEGER NOT NULL DEFAULT 0,
      estimated_input_tokens INTEGER NOT NULL DEFAULT 0,
      max_items INTEGER NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,
      omitted_count INTEGER NOT NULL DEFAULT 0,
      retrieval_trace_json TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS context_pack_items (
      id TEXT PRIMARY KEY,
      context_pack_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      source_id TEXT NOT NULL,
      title TEXT,
      content_format TEXT NOT NULL,
      content_excerpt TEXT,
      content_hash TEXT NOT NULL,
      origin TEXT NOT NULL,
      included_reason TEXT NOT NULL,
      relevance_json TEXT NOT NULL,
      relevance_score REAL,
      privacy_mode TEXT NOT NULL,
      redacted INTEGER NOT NULL DEFAULT 0,
      token_estimate INTEGER NOT NULL DEFAULT 0,
      source_pointer_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (context_pack_id) REFERENCES context_packs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS context_pack_omissions (
      id TEXT PRIMARY KEY,
      context_pack_id TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      source_id TEXT,
      title TEXT,
      reason TEXT NOT NULL,
      score REAL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (context_pack_id) REFERENCES context_packs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_context_packs_agent_run ON context_packs(agent_run_id);
    CREATE INDEX IF NOT EXISTS idx_context_packs_task ON context_packs(task_id);
    CREATE INDEX IF NOT EXISTS idx_context_packs_privacy_created ON context_packs(privacy_mode, created_at);
    CREATE INDEX IF NOT EXISTS idx_context_pack_items_pack ON context_pack_items(context_pack_id);
    CREATE INDEX IF NOT EXISTS idx_context_pack_items_source ON context_pack_items(kind, source_id);
    CREATE INDEX IF NOT EXISTS idx_context_pack_omissions_pack ON context_pack_omissions(context_pack_id);
  `);
}

function requireContextPackId(contextPack = {}) {
  const id = cleanText(contextPack.contextPackId || contextPack.context_pack_id || contextPack.id);
  if (!id) {
    const error = new Error("contextPackId is required");
    error.code = "AI_CONTEXT_PACK_ID_REQUIRED";
    throw error;
  }
  return id;
}

function insertItems(db, contextPackId, items = [], options = {}) {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO context_pack_items
      (id, context_pack_id, kind, source_id, title, content_format, content_excerpt, content_hash, origin,
       included_reason, relevance_json, relevance_score, privacy_mode, redacted, token_estimate, source_pointer_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const item of items) {
    insert.run(
      cleanText(item.itemId || item.item_id) || generatedId("ctx_item"),
      contextPackId,
      cleanText(item.kind || "note"),
      cleanText(item.sourceId || item.source_id),
      cleanText(item.title),
      cleanText(item.contentFormat || item.content_format) || "plain_text",
      contentExcerpt(item, options),
      contentHash(item.content),
      cleanText(item.origin) || "human_authored",
      cleanText(item.includedReason || item.included_reason) || "explicit",
      jsonString(item.relevance || null),
      item.relevance?.score === undefined ? null : Number(item.relevance.score),
      cleanText(item.privacy?.mode || item.privacyMode || item.privacy_mode) || "normal",
      item.privacy?.redacted === true || item.redacted === true ? 1 : 0,
      Number(item.tokenEstimate || item.token_estimate || 0),
      jsonString(item.sourcePointer || item.source_pointer || null),
      now
    );
  }
}

function insertOmissions(db, contextPackId, omissions = []) {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO context_pack_omissions
      (id, context_pack_id, source_kind, source_id, title, reason, score, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const omission of omissions) {
    insert.run(
      cleanText(omission.id || omission.omissionId || omission.omission_id) || generatedId("ctx_omit"),
      contextPackId,
      cleanText(omission.kind || omission.sourceKind || omission.source_kind) || "note",
      cleanText(omission.sourceId || omission.source_id || omission.id),
      cleanText(omission.title),
      cleanText(omission.reason) || "unspecified",
      omission.score === undefined ? null : Number(omission.score),
      jsonString(omission),
      now
    );
  }
}

function itemsForContextPack(db, contextPackId) {
  return db
    .prepare(
      `SELECT *
       FROM context_pack_items
       WHERE context_pack_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(contextPackId)
    .map((row) => ({
      itemId: row.id,
      kind: row.kind,
      sourceId: row.source_id,
      title: row.title || "",
      content: "",
      contentExcerpt: row.content_excerpt || "",
      contentHash: row.content_hash,
      contentFormat: row.content_format,
      origin: row.origin,
      includedReason: row.included_reason,
      relevance: parseJson(row.relevance_json, null),
      privacy: { mode: row.privacy_mode, redacted: row.redacted === 1 },
      tokenEstimate: Number(row.token_estimate || 0),
      sourcePointer: parseJson(row.source_pointer_json, null),
      createdAt: row.created_at
    }));
}

function omissionsForContextPack(db, contextPackId) {
  return db
    .prepare(
      `SELECT *
       FROM context_pack_omissions
       WHERE context_pack_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(contextPackId)
    .map((row) => ({
      omissionId: row.id,
      kind: row.source_kind,
      sourceId: row.source_id || "",
      title: row.title || "",
      reason: row.reason,
      score: row.score === null ? null : Number(row.score),
      payload: parseJson(row.payload_json, {}),
      createdAt: row.created_at
    }));
}

function rowToContextPack(db, row) {
  if (!row) return null;
  return {
    contextPackId: row.id,
    taskId: row.task_id,
    agentRunId: row.agent_run_id || "",
    createdAt: row.created_at,
    createdBy: row.created_by,
    task: {
      taskType: row.task_type,
      agentId: row.agent_id,
      trigger: row.trigger
    },
    privacy: {
      mode: row.privacy_mode,
      cloudAllowed: row.cloud_allowed === 1,
      redactionsApplied: row.redactions_applied === 1
    },
    budget: {
      targetInputTokens: Number(row.target_input_tokens || 0),
      estimatedInputTokens: Number(row.estimated_input_tokens || 0),
      maxItems: Number(row.max_items || 0)
    },
    items: itemsForContextPack(db, row.id),
    omitted: omissionsForContextPack(db, row.id),
    retrievalTrace: parseJson(row.retrieval_trace_json, []),
    summary: parseJson(row.summary_json, { humanSummary: "", machineSummary: "" })
  };
}

function listRows(db, filter = {}) {
  return db
    .prepare(
      `SELECT *
       FROM context_packs
       WHERE (? = '' OR agent_run_id = ?)
         AND (? = '' OR task_id = ?)
         AND (? = '' OR privacy_mode = ?)
       ORDER BY created_at DESC, id ASC
       LIMIT ?`
    )
    .all(
      cleanText(filter.agentRunId || filter.agent_run_id),
      cleanText(filter.agentRunId || filter.agent_run_id),
      cleanText(filter.taskId || filter.task_id),
      cleanText(filter.taskId || filter.task_id),
      cleanText(filter.privacyMode || filter.privacy_mode),
      cleanText(filter.privacyMode || filter.privacy_mode),
      normalizeLimit(filter.limit)
    );
}

export async function createSqliteContextPackStore(options = {}) {
  const dbPath = await resolveAiDbPath(options);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  ensureSchema(db);

  function getContextPack(id) {
    const contextPackId = cleanText(id);
    const row = db.prepare("SELECT * FROM context_packs WHERE id = ? LIMIT 1").get(contextPackId);
    return rowToContextPack(db, row);
  }

  return {
    dbPath,
    close() {
      db.close();
    },
    createContextPack(contextPack = {}) {
      const id = requireContextPackId(contextPack);
      const task = contextPack.task || {};
      const privacy = contextPack.privacy || {};
      const budget = contextPack.budget || {};
      db.exec("BEGIN IMMEDIATE;");
      try {
        db.prepare(
          `INSERT INTO context_packs
            (id, task_id, agent_run_id, task_type, agent_id, trigger, privacy_mode, cloud_allowed,
             redactions_applied, target_input_tokens, estimated_input_tokens, max_items, item_count,
             omitted_count, retrieval_trace_json, summary_json, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          cleanText(contextPack.taskId || contextPack.task_id),
          cleanText(contextPack.agentRunId || contextPack.agent_run_id),
          cleanText(task.taskType || task.task_type) || "reflection",
          cleanText(task.agentId || task.agent_id) || "reflection_agent",
          cleanText(task.trigger) || "user_command",
          cleanText(privacy.mode) || "normal",
          privacy.cloudAllowed === true ? 1 : 0,
          privacy.redactionsApplied === true ? 1 : 0,
          Number(budget.targetInputTokens || budget.target_input_tokens || 0),
          Number(budget.estimatedInputTokens || budget.estimated_input_tokens || 0),
          Number(budget.maxItems || budget.max_items || 0),
          Array.isArray(contextPack.items) ? contextPack.items.length : 0,
          Array.isArray(contextPack.omitted) ? contextPack.omitted.length : 0,
          jsonString(contextPack.retrievalTrace || contextPack.retrieval_trace || []),
          jsonString(contextPack.summary || { humanSummary: "", machineSummary: "" }),
          cleanText(contextPack.createdBy || contextPack.created_by) || "ai_orchestrator_context_builder_v1",
          cleanText(contextPack.createdAt || contextPack.created_at) || new Date().toISOString()
        );
        insertItems(db, id, contextPack.items || [], options);
        insertOmissions(db, id, contextPack.omitted || []);
        db.exec("COMMIT;");
      } catch (error) {
        db.exec("ROLLBACK;");
        if (String(error?.message || "").includes("UNIQUE constraint failed")) {
          error.code = "AI_CONTEXT_PACK_ALREADY_EXISTS";
        }
        throw error;
      }
      return getContextPack(id);
    },
    getContextPack,
    listContextPacks(filter = {}) {
      return listRows(db, filter).map((row) => rowToContextPack(db, row));
    },
    countContextPacks(filter = {}) {
      return listRows(db, { ...filter, limit: 200 }).length;
    }
  };
}
