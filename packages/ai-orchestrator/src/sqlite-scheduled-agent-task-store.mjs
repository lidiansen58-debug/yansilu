import fs from "node:fs/promises";
import path from "node:path";

import { createInMemoryScheduledAgentTaskStore, normalizeScheduledAgentTask } from "./scheduled-agent-tasks.mjs";

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

function normalizeLimit(value, fallback = 50) {
  const limit = Number(value || fallback);
  if (!Number.isFinite(limit)) return fallback;
  return Math.max(1, Math.min(500, Math.floor(limit)));
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("SQLite scheduled agent task store requires node:sqlite (Node.js 22+). Current runtime does not provide it.");
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
    CREATE TABLE IF NOT EXISTS scheduled_agent_tasks (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      task_type TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      schedule_json TEXT NOT NULL DEFAULT '{}',
      scope_json TEXT NOT NULL DEFAULT '{}',
      model_json TEXT NOT NULL DEFAULT '{}',
      budget_json TEXT NOT NULL DEFAULT '{}',
      privacy_json TEXT NOT NULL DEFAULT '{}',
      output_json TEXT NOT NULL DEFAULT '{}',
      run_input_json TEXT NOT NULL DEFAULT 'null',
      failure_count INTEGER NOT NULL DEFAULT 0,
      last_run_at TEXT,
      last_run_status TEXT,
      last_run_reason TEXT,
      last_agent_run_id TEXT,
      next_run_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_agent_tasks_due ON scheduled_agent_tasks(status, next_run_at);
    CREATE INDEX IF NOT EXISTS idx_scheduled_agent_tasks_workspace ON scheduled_agent_tasks(workspace_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_scheduled_agent_tasks_user ON scheduled_agent_tasks(workspace_id, user_id, updated_at);
  `);

  const columns = db.prepare("PRAGMA table_info(scheduled_agent_tasks)").all().map((column) => column.name);
  if (!columns.includes("last_run_reason")) {
    db.exec("ALTER TABLE scheduled_agent_tasks ADD COLUMN last_run_reason TEXT;");
  }
}

function taskId(input = {}) {
  return cleanText(input.scheduledTaskId || input.scheduled_task_id || input.id);
}

function rowToScheduledTask(row) {
  if (!row) return null;
  return normalizeScheduledAgentTask({
    scheduledTaskId: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    name: row.name,
    status: row.status,
    taskType: row.task_type,
    agentId: row.agent_id,
    schedule: parseJson(row.schedule_json, {}),
    scope: parseJson(row.scope_json, {}),
    model: parseJson(row.model_json, {}),
    budget: parseJson(row.budget_json, {}),
    privacy: parseJson(row.privacy_json, {}),
    output: parseJson(row.output_json, {}),
    runInput: parseJson(row.run_input_json, null),
    failureCount: row.failure_count,
    lastRunAt: row.last_run_at || "",
    lastRunStatus: row.last_run_status || "",
    lastRunReason: row.last_run_reason || "",
    lastAgentRunId: row.last_agent_run_id || "",
    nextRunAt: row.next_run_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

export async function createSqliteScheduledAgentTaskStore(options = {}) {
  const dbPath = await resolveAiDbPath(options);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  ensureSchema(db);

  const normalizer = createInMemoryScheduledAgentTaskStore();

  function getScheduledTask(id = "") {
    return rowToScheduledTask(
      db
        .prepare(
          `SELECT *
           FROM scheduled_agent_tasks
           WHERE id = ?
           LIMIT 1`
        )
        .get(cleanText(id))
    );
  }

  function upsertScheduledTask(input = {}) {
    const existing = getScheduledTask(taskId(input)) || {};
    const task = normalizer.upsertScheduledTask({ ...existing, ...input });
    normalizer.deleteScheduledTask(task);
    db.prepare(
      `INSERT INTO scheduled_agent_tasks
        (id, workspace_id, user_id, name, status, task_type, agent_id, schedule_json, scope_json,
         model_json, budget_json, privacy_json, output_json, run_input_json, failure_count,
         last_run_at, last_run_status, last_run_reason, last_agent_run_id, next_run_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         workspace_id = excluded.workspace_id,
         user_id = excluded.user_id,
         name = excluded.name,
         status = excluded.status,
         task_type = excluded.task_type,
         agent_id = excluded.agent_id,
         schedule_json = excluded.schedule_json,
         scope_json = excluded.scope_json,
         model_json = excluded.model_json,
         budget_json = excluded.budget_json,
         privacy_json = excluded.privacy_json,
         output_json = excluded.output_json,
         run_input_json = excluded.run_input_json,
         failure_count = excluded.failure_count,
         last_run_at = excluded.last_run_at,
         last_run_status = excluded.last_run_status,
         last_run_reason = excluded.last_run_reason,
         last_agent_run_id = excluded.last_agent_run_id,
         next_run_at = excluded.next_run_at,
         updated_at = excluded.updated_at`
    ).run(
      task.scheduledTaskId,
      task.workspaceId,
      task.userId,
      task.name,
      task.status,
      task.taskType,
      task.agentId,
      jsonString(task.schedule),
      jsonString(task.scope),
      jsonString(task.model),
      jsonString(task.budget),
      jsonString(task.privacy),
      jsonString(task.output),
      jsonString(task.runInput),
      task.failureCount,
      task.lastRunAt,
      task.lastRunStatus,
      task.lastRunReason,
      task.lastAgentRunId,
      task.nextRunAt,
      task.createdAt,
      task.updatedAt
    );
    return getScheduledTask(task.scheduledTaskId);
  }

  function listScheduledTasks(filter = {}) {
    const workspaceId = cleanText(filter.workspaceId || filter.workspace_id);
    const userId = cleanText(filter.userId || filter.user_id);
    const status = cleanText(filter.status);
    const taskType = cleanText(filter.taskType || filter.task_type);
    const rows = db
      .prepare(
        `SELECT *
         FROM scheduled_agent_tasks
         WHERE (? = '' OR workspace_id = ?)
           AND (? = '' OR user_id = ?)
           AND (? = '' OR status = ?)
           AND (? = '' OR task_type = ?)
         ORDER BY updated_at DESC, id ASC
         LIMIT ?`
      )
      .all(workspaceId, workspaceId, userId, userId, status, status, taskType, taskType, normalizeLimit(filter.limit));
    return rows.map(rowToScheduledTask);
  }

  return {
    dbPath,
    close() {
      db.close();
    },
    upsertScheduledTask,
    createScheduledTask: upsertScheduledTask,
    getScheduledTask,
    listScheduledTasks,
    listDueScheduledTasks(filter = {}) {
      const now = cleanText(filter.now || filter.nowAt || filter.now_at) || new Date().toISOString();
      const workspaceId = cleanText(filter.workspaceId || filter.workspace_id);
      const userId = cleanText(filter.userId || filter.user_id);
      const rows = db
        .prepare(
          `SELECT *
           FROM scheduled_agent_tasks
           WHERE status = 'active'
             AND next_run_at IS NOT NULL
             AND next_run_at != ''
             AND next_run_at <= ?
             AND (? = '' OR workspace_id = ?)
             AND (? = '' OR user_id = ?)
           ORDER BY next_run_at ASC, id ASC
           LIMIT ?`
        )
        .all(now, workspaceId, workspaceId, userId, userId, normalizeLimit(filter.limit, 20));
      return rows.map(rowToScheduledTask);
    },
    updateScheduledTaskStatus(input = {}) {
      const existing = getScheduledTask(taskId(input));
      if (!existing) return null;
      return upsertScheduledTask({ ...existing, status: input.status });
    },
    recordScheduledTaskRun(input = {}) {
      const existing = getScheduledTask(taskId(input));
      if (!existing) return null;
      const updated = normalizer.upsertScheduledTask(existing);
      const recorded = normalizer.recordScheduledTaskRun(input);
      normalizer.deleteScheduledTask(updated);
      return upsertScheduledTask(recorded);
    },
    deleteScheduledTask(input = {}) {
      const id = taskId(input);
      if (!id) return false;
      const result = db.prepare("DELETE FROM scheduled_agent_tasks WHERE id = ?").run(id);
      return Number(result.changes || 0) > 0;
    }
  };
}
