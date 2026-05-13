const ARTIFACT_TYPES = new Set([
  "ResearchCard",
  "ReflectionPrompt",
  "LinkSuggestion",
  "ConflictSuggestion",
  "SynthesisDraft",
  "OutlineDraft",
  "QuestionCard",
  "SourceSummary",
  "ProjectDigest",
  "InsightCard",
  "BridgeCard",
  "TensionCard",
  "SourceGap",
  "WritingMove"
]);

const ARTIFACT_STATUSES = new Set([
  "pending_review",
  "accepted",
  "revised",
  "ignored",
  "archived",
  "promoted_to_note",
  "linked_to_note",
  "expired"
]);

function cleanText(value) {
  return String(value || "").trim();
}

function generatedId(prefix = "artifact") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeArtifact(input = {}, context = {}) {
  const type = cleanText(input.type || input.artifactType || input.artifact_type);
  if (!ARTIFACT_TYPES.has(type)) {
    const error = new Error(`Unsupported artifact type: ${type}`);
    error.code = "AI_ARTIFACT_TYPE_INVALID";
    throw error;
  }

  const status = cleanText(input.status) || "pending_review";
  if (!ARTIFACT_STATUSES.has(status)) {
    const error = new Error(`Unsupported artifact status: ${status}`);
    error.code = "AI_ARTIFACT_STATUS_INVALID";
    throw error;
  }

  const title = cleanText(input.title);
  if (!title) {
    const error = new Error("artifact title is required");
    error.code = "AI_ARTIFACT_TITLE_REQUIRED";
    throw error;
  }

  const now = context.now || new Date().toISOString();
  const agentRunId = cleanText(input.agentRunId || input.agent_run_id || context.agentRunId);
  if (!agentRunId) {
    const error = new Error("artifact agentRunId is required");
    error.code = "AI_ARTIFACT_RUN_REQUIRED";
    throw error;
  }

  return {
    id: cleanText(input.id) || generatedId("artifact"),
    type,
    title,
    summary: cleanText(input.summary),
    body: input.body ?? "",
    status,
    origin: cleanText(input.origin) || "ai_generated",
    createdAt: cleanText(input.createdAt || input.created_at) || now,
    updatedAt: cleanText(input.updatedAt || input.updated_at) || now,
    agentRunId,
    contextPackId: cleanText(input.contextPackId || input.context_pack_id || context.contextPackId),
    model: input.model || context.model || null,
    sources: input.sources || context.sources || { noteIds: [], sourceDocIds: [], artifactIds: [], externalUrls: [] },
    provenance: input.provenance || {
      contentOrigin: "ai_generated",
      citationRequired: false,
      humanAccepted: false,
      humanRewritten: false
    },
    confidence: input.confidence || { score: null, label: "medium", reason: "" },
    privacy: input.privacy || context.privacy || { mode: "normal", cloudModelUsed: false },
    userDecisions: Array.isArray(input.userDecisions || input.user_decisions)
      ? [...(input.userDecisions || input.user_decisions)]
      : [],
    payload: input.payload || {}
  };
}

export function normalizeArtifacts(values = [], context = {}) {
  if (!Array.isArray(values)) {
    const error = new Error("artifacts must be an array");
    error.code = "AI_ARTIFACTS_INVALID";
    throw error;
  }
  return values.map((artifact) => normalizeArtifact(artifact, context));
}

export function artifactTypes() {
  return [...ARTIFACT_TYPES];
}
