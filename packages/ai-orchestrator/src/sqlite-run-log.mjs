import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

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

function normalizeUsage(value = {}) {
  return {
    inputTokens: Number(value.inputTokens ?? value.input_tokens ?? 0),
    outputTokens: Number(value.outputTokens ?? value.output_tokens ?? 0),
    cachedInputTokens: Number(value.cachedInputTokens ?? value.cached_input_tokens ?? 0),
    totalTokens: Number(value.totalTokens ?? value.total_tokens ?? 0),
    estimatedCost: Number(value.estimatedCost ?? value.estimated_cost ?? 0),
    currency: cleanText(value.currency) || "USD",
    usageSource: cleanText(value.usageSource || value.usage_source) || "locally_estimated"
  };
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("SQLite run log requires node:sqlite (Node.js 22+). Current runtime does not provide it.");
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
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_version TEXT NOT NULL,
      trigger TEXT NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT NOT NULL,
      user_mode TEXT NOT NULL,
      model_pack TEXT NOT NULL DEFAULT 'Starter Auto',
      privacy_mode TEXT NOT NULL,
      provider_id TEXT,
      model_ref TEXT,
      model_tier TEXT,
      context_pack_id TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cached_input_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      estimated_cost REAL NOT NULL DEFAULT 0,
      cost_currency TEXT NOT NULL DEFAULT 'USD',
      usage_source TEXT NOT NULL DEFAULT 'locally_estimated',
      artifact_ids_json TEXT NOT NULL DEFAULT '[]',
      error_json TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_run_events (
      id TEXT PRIMARY KEY,
      agent_run_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_order INTEGER NOT NULL,
      status TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      usage_json TEXT,
      error_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_runs_status_created ON agent_runs(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_created ON agent_runs(agent_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_trigger_created ON agent_runs(trigger, created_at);
    CREATE INDEX IF NOT EXISTS idx_agent_run_events_run_order ON agent_run_events(agent_run_id, event_order);
  `);

  const columns = db.prepare("PRAGMA table_info(agent_runs)").all().map((column) => column.name);
  if (!columns.includes("model_pack")) {
    db.exec("ALTER TABLE agent_runs ADD COLUMN model_pack TEXT NOT NULL DEFAULT 'Starter Auto';");
  }
}

function rowToEvent(row) {
  if (!row) return null;
  return {
    eventId: row.id,
    eventType: row.event_type,
    eventOrder: Number(row.event_order || 0),
    status: row.status,
    summary: parseJson(row.summary_json, {}),
    usage: parseJson(row.usage_json, null),
    error: parseJson(row.error_json, null),
    createdAt: row.created_at
  };
}

function eventsForRun(db, agentRunId) {
  return db
    .prepare(
      `SELECT id, agent_run_id, event_type, event_order, status, summary_json, usage_json, error_json, created_at
       FROM agent_run_events
       WHERE agent_run_id = ?
       ORDER BY event_order ASC`
    )
    .all(agentRunId)
    .map(rowToEvent);
}

function rowToRun(db, row) {
  if (!row) return null;
  return {
    agentRunId: row.id,
    taskId: row.task_id,
    agentId: row.agent_id,
    agentVersion: row.agent_version,
    trigger: row.trigger,
    taskType: row.task_type,
    status: row.status,
    userMode: row.user_mode,
    modelPack: row.model_pack || "Starter Auto",
    privacyMode: row.privacy_mode,
    providerId: row.provider_id || "",
    modelRef: row.model_ref || "",
    modelTier: row.model_tier || "standard",
    contextPackId: row.context_pack_id || "",
    usage: {
      inputTokens: Number(row.input_tokens || 0),
      outputTokens: Number(row.output_tokens || 0),
      cachedInputTokens: Number(row.cached_input_tokens || 0),
      totalTokens: Number(row.total_tokens || 0),
      estimatedCost: Number(row.estimated_cost || 0),
      currency: row.cost_currency || "USD",
      usageSource: row.usage_source || "locally_estimated"
    },
    artifactIds: parseJson(row.artifact_ids_json, []),
    events: eventsForRun(db, row.id),
    error: parseJson(row.error_json, null),
    startedAt: row.started_at,
    endedAt: row.ended_at || null,
    createdAt: row.created_at
  };
}

function runRowParams(input = {}, id, now) {
  const usage = normalizeUsage(input.usage || {});
  return {
    id,
    taskId: cleanText(input.taskId || input.task_id),
    agentId: cleanText(input.agentId || input.agent_id),
    agentVersion: cleanText(input.agentVersion || input.agent_version) || "v1",
    trigger: cleanText(input.trigger) || "user_command",
    taskType: cleanText(input.taskType || input.task_type) || "reflection",
    status: cleanText(input.status) || "running",
    userMode: cleanText(input.userMode || input.user_mode) || "Auto",
    modelPack: cleanText(input.modelPack || input.model_pack) || "Starter Auto",
    privacyMode: cleanText(input.privacyMode || input.privacy_mode) || "normal",
    providerId: cleanText(input.providerId || input.provider_id),
    modelRef: cleanText(input.modelRef || input.model_ref),
    modelTier: cleanText(input.modelTier || input.model_tier) || "standard",
    contextPackId: cleanText(input.contextPackId || input.context_pack_id),
    usage,
    artifactIds: Array.isArray(input.artifactIds || input.artifact_ids) ? [...(input.artifactIds || input.artifact_ids)] : [],
    error: input.error || null,
    startedAt: cleanText(input.startedAt || input.started_at) || now,
    endedAt: cleanText(input.endedAt || input.ended_at),
    createdAt: cleanText(input.createdAt || input.created_at) || now
  };
}

function nextEventOrder(db, agentRunId) {
  const row = db.prepare("SELECT COALESCE(MAX(event_order), 0) + 1 AS next_order FROM agent_run_events WHERE agent_run_id = ?").get(agentRunId);
  return Number(row?.next_order || 1);
}

export async function createSqliteRunLog(options = {}) {
  const dbPath = await resolveAiDbPath(options);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  ensureSchema(db);

  function getRun(id) {
    const runId = cleanText(id);
    const row = db.prepare("SELECT * FROM agent_runs WHERE id = ? LIMIT 1").get(runId);
    return rowToRun(db, row);
  }

  return {
    dbPath,
    close() {
      db.close();
    },
    startRun(input = {}) {
      const id = cleanText(input.agentRunId || input.agent_run_id) || generatedId("run");
      const now = new Date().toISOString();
      const params = runRowParams(input, id, now);
      try {
        db.prepare(
        `INSERT INTO agent_runs
            (id, task_id, agent_id, agent_version, trigger, task_type, status, user_mode, model_pack, privacy_mode,
             provider_id, model_ref, model_tier, context_pack_id, input_tokens, output_tokens,
             cached_input_tokens, total_tokens, estimated_cost, cost_currency, usage_source,
             artifact_ids_json, error_json, started_at, ended_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          params.id,
          params.taskId,
          params.agentId,
          params.agentVersion,
          params.trigger,
          params.taskType,
          params.status,
          params.userMode,
          params.modelPack,
          params.privacyMode,
          params.providerId,
          params.modelRef,
          params.modelTier,
          params.contextPackId,
          params.usage.inputTokens,
          params.usage.outputTokens,
          params.usage.cachedInputTokens,
          params.usage.totalTokens,
          params.usage.estimatedCost,
          params.usage.currency,
          params.usage.usageSource,
          jsonString(params.artifactIds),
          jsonString(params.error),
          params.startedAt,
          params.endedAt || null,
          params.createdAt
        );
      } catch (error) {
        if (String(error?.message || "").includes("UNIQUE constraint failed")) {
          error.code = "AI_RUN_ALREADY_EXISTS";
        }
        throw error;
      }
      return getRun(id);
    },
    addEvent(agentRunId, event = {}) {
      const id = cleanText(agentRunId);
      if (!getRun(id)) throw new Error(`agentRunId not found: ${id}`);
      const eventId = cleanText(event.eventId || event.event_id) || generatedId("evt");
      const createdAt = cleanText(event.createdAt || event.created_at) || new Date().toISOString();
      const eventOrder = Number(event.eventOrder || event.event_order) || nextEventOrder(db, id);
      db.prepare(
        `INSERT INTO agent_run_events
          (id, agent_run_id, event_type, event_order, status, summary_json, usage_json, error_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        eventId,
        id,
        cleanText(event.eventType || event.event_type) || "event",
        eventOrder,
        cleanText(event.status) || "succeeded",
        jsonString(event.summary || {}),
        event.usage === undefined ? null : jsonString(event.usage),
        event.error === undefined ? null : jsonString(event.error),
        createdAt
      );
      return rowToEvent(
        db.prepare("SELECT * FROM agent_run_events WHERE id = ? LIMIT 1").get(eventId)
      );
    },
    finishRun(agentRunId, updates = {}) {
      const id = cleanText(agentRunId);
      const existing = getRun(id);
      if (!existing) throw new Error(`agentRunId not found: ${id}`);
      const usage = normalizeUsage(updates.usage || existing.usage || {});
      const status = cleanText(updates.status) || existing.status;
      const endedAt = cleanText(updates.endedAt || updates.ended_at) || new Date().toISOString();
      const artifactIds = Array.isArray(updates.artifactIds || updates.artifact_ids)
        ? [...(updates.artifactIds || updates.artifact_ids)]
        : existing.artifactIds;
      db.prepare(
        `UPDATE agent_runs
         SET status = ?,
             model_pack = ?,
             provider_id = ?,
             model_ref = ?,
             model_tier = ?,
             context_pack_id = ?,
             input_tokens = ?,
             output_tokens = ?,
             cached_input_tokens = ?,
             total_tokens = ?,
             estimated_cost = ?,
             cost_currency = ?,
             usage_source = ?,
             artifact_ids_json = ?,
             error_json = ?,
             ended_at = ?
         WHERE id = ?`
      ).run(
        status,
        cleanText(updates.modelPack || updates.model_pack) || existing.modelPack,
        cleanText(updates.providerId || updates.provider_id) || existing.providerId,
        cleanText(updates.modelRef || updates.model_ref) || existing.modelRef,
        cleanText(updates.modelTier || updates.model_tier) || existing.modelTier,
        cleanText(updates.contextPackId || updates.context_pack_id) || existing.contextPackId,
        usage.inputTokens,
        usage.outputTokens,
        usage.cachedInputTokens,
        usage.totalTokens,
        usage.estimatedCost,
        usage.currency,
        usage.usageSource,
        jsonString(artifactIds),
        jsonString(updates.error || existing.error),
        endedAt,
        id
      );
      return getRun(id);
    },
    getRun,
    listRuns(filter = {}) {
      const rows = db
        .prepare(
          `SELECT *
           FROM agent_runs
           WHERE (? = '' OR status = ?)
             AND (? = '' OR agent_id = ?)
             AND (? = '' OR trigger = ?)
           ORDER BY created_at DESC, id ASC
           LIMIT ?`
        )
        .all(
          cleanText(filter.status),
          cleanText(filter.status),
          cleanText(filter.agentId || filter.agent_id),
          cleanText(filter.agentId || filter.agent_id),
          cleanText(filter.trigger),
          cleanText(filter.trigger),
          normalizeLimit(filter.limit)
        );
      return rows.map((row) => rowToRun(db, row));
    }
  };
}
