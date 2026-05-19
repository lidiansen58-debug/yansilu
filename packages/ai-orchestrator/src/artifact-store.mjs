import { normalizeArtifact } from "./artifacts.mjs";

const DECISION_STATUSES = new Set(["accepted", "revised", "ignored", "archived", "adopted_as_draft", "promoted_to_note", "linked_to_note"]);

function cleanText(value) {
  return String(value || "").trim();
}

function generatedId(prefix = "decision") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function matchesFilter(artifact, filter = {}) {
  const status = cleanText(filter.status);
  const type = cleanText(filter.type || filter.artifactType || filter.artifact_type);
  const agentRunId = cleanText(filter.agentRunId || filter.agent_run_id);
  const contextPackId = cleanText(filter.contextPackId || filter.context_pack_id);
  const sourceNoteId = cleanText(filter.sourceNoteId || filter.source_note_id);
  const privacyMode = cleanText(filter.privacyMode || filter.privacy_mode);

  if (status && artifact.status !== status) return false;
  if (type && artifact.type !== type) return false;
  if (agentRunId && artifact.agentRunId !== agentRunId) return false;
  if (contextPackId && artifact.contextPackId !== contextPackId) return false;
  if (sourceNoteId && !(artifact.sources?.noteIds || []).includes(sourceNoteId)) return false;
  if (privacyMode && artifact.privacy?.mode !== privacyMode) return false;
  return true;
}

export function createInMemoryArtifactStore() {
  const artifacts = new Map();

  function getArtifact(id) {
    const artifact = artifacts.get(cleanText(id));
    return artifact ? clone(artifact) : null;
  }

  function createArtifact(input = {}, context = {}) {
    const artifact = normalizeArtifact(input, context);
    if (artifacts.has(artifact.id)) {
      const error = new Error(`artifactId already exists: ${artifact.id}`);
      error.code = "AI_ARTIFACT_ALREADY_EXISTS";
      throw error;
    }
    artifacts.set(artifact.id, clone(artifact));
    return getArtifact(artifact.id);
  }

  return {
    createArtifact,
    createMany(values = [], context = {}) {
      if (!Array.isArray(values)) {
        const error = new Error("artifacts must be an array");
        error.code = "AI_ARTIFACTS_INVALID";
        throw error;
      }
      return values.map((artifact) => createArtifact(artifact, context));
    },
    getArtifact,
    listArtifacts(filter = {}) {
      return [...artifacts.values()]
        .filter((artifact) => matchesFilter(artifact, filter))
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, normalizeLimit(filter.limit))
        .map(clone);
    },
    countArtifacts(filter = {}) {
      return [...artifacts.values()].filter((artifact) => matchesFilter(artifact, filter)).length;
    },
    updateArtifact(artifactId, updates = {}) {
      const id = cleanText(artifactId || updates.artifactId || updates.artifact_id);
      const artifact = artifacts.get(id);
      if (!artifact) {
        const error = new Error(`artifactId not found: ${id}`);
        error.code = "AI_ARTIFACT_NOT_FOUND";
        throw error;
      }

      const now = new Date().toISOString();
      const next = {
        ...artifact,
        ...(Object.prototype.hasOwnProperty.call(updates, "payload") ? { payload: updates.payload || {} } : {}),
        ...(Object.prototype.hasOwnProperty.call(updates, "provenance") ? { provenance: updates.provenance || {} } : {}),
        ...(Object.prototype.hasOwnProperty.call(updates, "status") ? { status: updates.status } : {}),
        updatedAt: cleanText(updates.updatedAt || updates.updated_at) || now
      };
      artifacts.set(id, next);
      return getArtifact(id);
    },
    recordDecision(artifactId, input = {}) {
      const id = cleanText(artifactId || input.artifactId || input.artifact_id);
      const artifact = artifacts.get(id);
      if (!artifact) {
        const error = new Error(`artifactId not found: ${id}`);
        error.code = "AI_ARTIFACT_NOT_FOUND";
        throw error;
      }

      const decision = normalizeDecision(input, id);
      const now = new Date().toISOString();
      artifact.status = decision.decision;
      artifact.updatedAt = now;
      artifact.userDecisions = [...(artifact.userDecisions || []), decision];
      artifact.provenance = {
        ...(artifact.provenance || {}),
        humanAccepted: ["accepted", "adopted_as_draft", "promoted_to_note", "linked_to_note"].includes(decision.decision)
          ? true
          : artifact.provenance?.humanAccepted === true,
        humanRewritten: decision.decision === "revised" ? true : artifact.provenance?.humanRewritten === true
      };
      artifacts.set(id, artifact);
      return getArtifact(id);
    }
  };
}
