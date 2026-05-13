import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeArtifact } from "./artifacts.mjs";

const DECISION_STATUSES = new Set(["accepted", "revised", "ignored", "archived", "promoted_to_note", "linked_to_note"]);

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

function booleanFeedback(input = {}, feedback = {}, camelKey, snakeKey) {
  if (typeof input[camelKey] === "boolean") return input[camelKey];
  if (typeof input[snakeKey] === "boolean") return input[snakeKey];
  if (typeof feedback[camelKey] === "boolean") return feedback[camelKey];
  if (typeof feedback[snakeKey] === "boolean") return feedback[snakeKey];
  return false;
}

function normalizeFeedback(input = {}) {
  const feedback = input.feedback && typeof input.feedback === "object" ? input.feedback : {};
  return {
    useful: booleanFeedback(input, feedback, "useful", "useful"),
    noisy: booleanFeedback(input, feedback, "noisy", "noisy"),
    wrong: booleanFeedback(input, feedback, "wrong", "wrong"),
    alreadyKnown: booleanFeedback(input, feedback, "alreadyKnown", "already_known"),
    privacyConcern: booleanFeedback(input, feedback, "privacyConcern", "privacy_concern")
  };
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("SQLite artifact store requires node:sqlite (Node.js 22+). Current runtime does not provide it.");
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
    CREATE TABLE IF NOT EXISTS ai_artifacts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      body_json TEXT NOT NULL,
      status TEXT NOT NULL,
      origin TEXT NOT NULL,
      agent_run_id TEXT NOT NULL,
      context_pack_id TEXT,
      model_json TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      confidence_json TEXT NOT NULL,
      privacy_mode TEXT NOT NULL,
      privacy_json TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_artifact_sources (
      id TEXT PRIMARY KEY,
      artifact_id TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      source_id TEXT,
      source_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (artifact_id) REFERENCES ai_artifacts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_artifact_decisions (
      id TEXT PRIMARY KEY,
      artifact_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      note_id TEXT,
      comment TEXT,
      feedback_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (artifact_id) REFERENCES ai_artifacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_artifacts_status_created ON ai_artifacts(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_artifacts_type_status ON ai_artifacts(type, status);
    CREATE INDEX IF NOT EXISTS idx_ai_artifacts_agent_run ON ai_artifacts(agent_run_id);
    CREATE INDEX IF NOT EXISTS idx_ai_artifact_sources_source ON ai_artifact_sources(source_kind, source_id);
    CREATE INDEX IF NOT EXISTS idx_ai_artifact_decisions_artifact ON ai_artifact_decisions(artifact_id, created_at);
  `);

  const decisionColumns = new Set(db.prepare("PRAGMA table_info(ai_artifact_decisions)").all().map((row) => row.name));
  if (!decisionColumns.has("feedback_json")) {
    db.exec("ALTER TABLE ai_artifact_decisions ADD COLUMN feedback_json TEXT NOT NULL DEFAULT '{}';");
  }
}

function normalizeDecision(input = {}, artifactId) {
  const decision = cleanText(input.decision || input.status);
  if (!DECISION_STATUSES.has(decision)) {
    const error = new Error(`Unsupported artifact decision: ${decision}`);
    error.code = "AI_ARTIFACT_DECISION_INVALID";
    throw error;
  }

  return {
    decisionId: cleanText(input.decisionId || input.decision_id) || generatedId("decision"),
    artifactId,
    decision,
    userId: cleanText(input.userId || input.user_id) || "local_user",
    noteId: cleanText(input.noteId || input.note_id),
    comment: cleanText(input.comment),
    feedback: normalizeFeedback(input),
    createdAt: cleanText(input.createdAt || input.created_at) || new Date().toISOString()
  };
}

function sourcesForArtifact(db, artifactId) {
  const rows = db
    .prepare(
      `SELECT source_kind, source_id, source_url
       FROM ai_artifact_sources
       WHERE artifact_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(artifactId);

  return {
    noteIds: rows.filter((row) => row.source_kind === "note").map((row) => row.source_id).filter(Boolean),
    sourceDocIds: rows.filter((row) => row.source_kind === "source_doc").map((row) => row.source_id).filter(Boolean),
    artifactIds: rows.filter((row) => row.source_kind === "artifact").map((row) => row.source_id).filter(Boolean),
    externalUrls: rows.filter((row) => row.source_kind === "external_url").map((row) => row.source_url || row.source_id).filter(Boolean)
  };
}

function decisionsForArtifact(db, artifactId) {
  return db
    .prepare(
      `SELECT id, artifact_id, user_id, decision, note_id, comment, feedback_json, created_at
       FROM ai_artifact_decisions
       WHERE artifact_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(artifactId)
    .map((row) => ({
      decisionId: row.id,
      artifactId: row.artifact_id,
      decision: row.decision,
      userId: row.user_id,
      noteId: row.note_id || "",
      comment: row.comment || "",
      feedback: normalizeFeedback({ feedback: parseJson(row.feedback_json, {}) }),
      createdAt: row.created_at
    }));
}

function rowToArtifact(db, row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary || "",
    body: parseJson(row.body_json, ""),
    status: row.status,
    origin: row.origin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agentRunId: row.agent_run_id,
    contextPackId: row.context_pack_id || "",
    model: parseJson(row.model_json, null),
    sources: sourcesForArtifact(db, row.id),
    provenance: parseJson(row.provenance_json, {
      contentOrigin: "ai_generated",
      citationRequired: false,
      humanAccepted: false,
      humanRewritten: false
    }),
    confidence: parseJson(row.confidence_json, { score: null, label: "medium", reason: "" }),
    privacy: parseJson(row.privacy_json, { mode: row.privacy_mode || "normal", cloudModelUsed: false }),
    userDecisions: decisionsForArtifact(db, row.id),
    payload: parseJson(row.payload_json, {})
  };
}

function insertSources(db, artifact) {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO ai_artifact_sources
      (id, artifact_id, source_kind, source_id, source_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const noteId of artifact.sources?.noteIds || []) {
    insert.run(generatedId("src"), artifact.id, "note", noteId, "", now);
  }
  for (const sourceDocId of artifact.sources?.sourceDocIds || []) {
    insert.run(generatedId("src"), artifact.id, "source_doc", sourceDocId, "", now);
  }
  for (const sourceArtifactId of artifact.sources?.artifactIds || []) {
    insert.run(generatedId("src"), artifact.id, "artifact", sourceArtifactId, "", now);
  }
  for (const externalUrl of artifact.sources?.externalUrls || []) {
    insert.run(generatedId("src"), artifact.id, "external_url", "", externalUrl, now);
  }
}

function insertDecision(db, decision) {
  db.prepare(
    `INSERT INTO ai_artifact_decisions
      (id, artifact_id, user_id, decision, note_id, comment, feedback_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    decision.decisionId,
    decision.artifactId,
    decision.userId,
    decision.decision,
    decision.noteId || "",
    decision.comment || "",
    jsonString(decision.feedback || normalizeFeedback()),
    decision.createdAt
  );
}

function insertArtifact(db, artifact) {
  db.prepare(
    `INSERT INTO ai_artifacts
      (id, type, title, summary, body_json, status, origin, agent_run_id, context_pack_id,
       model_json, provenance_json, confidence_json, privacy_mode, privacy_json, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    artifact.id,
    artifact.type,
    artifact.title,
    artifact.summary || "",
    jsonString(artifact.body),
    artifact.status,
    artifact.origin,
    artifact.agentRunId,
    artifact.contextPackId || "",
    jsonString(artifact.model),
    jsonString(artifact.provenance),
    jsonString(artifact.confidence),
    artifact.privacy?.mode || "normal",
    jsonString(artifact.privacy),
    jsonString(artifact.payload),
    artifact.createdAt,
    artifact.updatedAt
  );
  insertSources(db, artifact);
  for (const decision of artifact.userDecisions || []) {
    insertDecision(db, normalizeDecision(decision, artifact.id));
  }
}

function listRows(db, filter = {}) {
  const rows = db
    .prepare(
      `SELECT a.*
       FROM ai_artifacts a
       WHERE (? = '' OR a.status = ?)
         AND (? = '' OR a.type = ?)
         AND (? = '' OR a.agent_run_id = ?)
         AND (? = '' OR a.context_pack_id = ?)
         AND (? = '' OR a.privacy_mode = ?)
         AND (
           ? = ''
           OR EXISTS (
             SELECT 1 FROM ai_artifact_sources s
             WHERE s.artifact_id = a.id
               AND s.source_kind = 'note'
               AND s.source_id = ?
           )
         )
       ORDER BY a.created_at DESC, a.id ASC
       LIMIT ?`
    )
    .all(
      cleanText(filter.status),
      cleanText(filter.status),
      cleanText(filter.type || filter.artifactType || filter.artifact_type),
      cleanText(filter.type || filter.artifactType || filter.artifact_type),
      cleanText(filter.agentRunId || filter.agent_run_id),
      cleanText(filter.agentRunId || filter.agent_run_id),
      cleanText(filter.contextPackId || filter.context_pack_id),
      cleanText(filter.contextPackId || filter.context_pack_id),
      cleanText(filter.privacyMode || filter.privacy_mode),
      cleanText(filter.privacyMode || filter.privacy_mode),
      cleanText(filter.sourceNoteId || filter.source_note_id),
      cleanText(filter.sourceNoteId || filter.source_note_id),
      normalizeLimit(filter.limit)
    );
  return rows;
}

export async function createSqliteArtifactStore(options = {}) {
  const dbPath = await resolveAiDbPath(options);
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  ensureSchema(db);

  function getArtifact(id) {
    const artifactId = cleanText(id);
    const row = db.prepare("SELECT * FROM ai_artifacts WHERE id = ? LIMIT 1").get(artifactId);
    return rowToArtifact(db, row);
  }

  return {
    dbPath,
    close() {
      db.close();
    },
    createArtifact(input = {}, context = {}) {
      const artifact = normalizeArtifact(input, context);
      db.exec("BEGIN IMMEDIATE;");
      try {
        insertArtifact(db, artifact);
        db.exec("COMMIT;");
        return getArtifact(artifact.id);
      } catch (error) {
        db.exec("ROLLBACK;");
        if (String(error?.message || "").includes("UNIQUE constraint failed")) {
          error.code = "AI_ARTIFACT_ALREADY_EXISTS";
        }
        throw error;
      }
    },
    createMany(values = [], context = {}) {
      if (!Array.isArray(values)) {
        const error = new Error("artifacts must be an array");
        error.code = "AI_ARTIFACTS_INVALID";
        throw error;
      }
      const artifacts = values.map((artifact) => normalizeArtifact(artifact, context));
      db.exec("BEGIN IMMEDIATE;");
      try {
        for (const artifact of artifacts) insertArtifact(db, artifact);
        db.exec("COMMIT;");
      } catch (error) {
        db.exec("ROLLBACK;");
        if (String(error?.message || "").includes("UNIQUE constraint failed")) {
          error.code = "AI_ARTIFACT_ALREADY_EXISTS";
        }
        throw error;
      }
      return artifacts.map((artifact) => getArtifact(artifact.id));
    },
    getArtifact,
    listArtifacts(filter = {}) {
      return listRows(db, filter).map((row) => rowToArtifact(db, row));
    },
    countArtifacts(filter = {}) {
      return listRows(db, { ...filter, limit: 200 }).length;
    },
    recordDecision(artifactId, input = {}) {
      const id = cleanText(artifactId || input.artifactId || input.artifact_id);
      const existing = getArtifact(id);
      if (!existing) {
        const error = new Error(`artifactId not found: ${id}`);
        error.code = "AI_ARTIFACT_NOT_FOUND";
        throw error;
      }

      const decision = normalizeDecision(input, id);
      const provenance = {
        ...(existing.provenance || {}),
        humanAccepted: ["accepted", "promoted_to_note", "linked_to_note"].includes(decision.decision)
          ? true
          : existing.provenance?.humanAccepted === true,
        humanRewritten: decision.decision === "revised" ? true : existing.provenance?.humanRewritten === true
      };
      const now = new Date().toISOString();

      db.exec("BEGIN IMMEDIATE;");
      try {
        insertDecision(db, decision);
        db.prepare(
          `UPDATE ai_artifacts
           SET status = ?, updated_at = ?, provenance_json = ?
           WHERE id = ?`
        ).run(decision.decision, now, jsonString(provenance), id);
        db.exec("COMMIT;");
        return getArtifact(id);
      } catch (error) {
        db.exec("ROLLBACK;");
        throw error;
      }
    }
  };
}
