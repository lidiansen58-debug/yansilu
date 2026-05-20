const SUGGESTION_STATUSES = new Set([
  "suggested",
  "adopted_as_draft",
  "rejected",
  "edited",
  "confirmed"
]);

const SUGGESTION_TRANSITIONS = new Map([
  ["suggested", new Set(["adopted_as_draft", "rejected"])],
  ["adopted_as_draft", new Set(["edited"])],
  ["edited", new Set(["confirmed"])],
  ["rejected", new Set()],
  ["confirmed", new Set()]
]);

function cleanText(value) {
  return String(value || "").trim();
}

function generatedId(prefix = "suggestion") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createSuggestionError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeStatus(value) {
  const status = cleanText(value) || "suggested";
  if (!SUGGESTION_STATUSES.has(status)) {
    throw createSuggestionError(`Unsupported suggestion status: ${status}`, "AI_SUGGESTION_STATUS_INVALID");
  }
  return status;
}

function normalizeTarget(input = {}) {
  const target = input.target && typeof input.target === "object" ? input.target : {};
  const type = cleanText(
    target.type ||
      target.kind ||
      input.targetType ||
      input.target_type ||
      input.targetKind ||
      input.target_kind
  );
  const id = cleanText(target.id || input.targetId || input.target_id);
  const field = cleanText(target.field || input.targetField || input.target_field);

  if (!type || !id) {
    throw createSuggestionError(
      "suggestion target requires a type and id",
      "AI_SUGGESTION_TARGET_REQUIRED"
    );
  }

  return field ? { type, id, field } : { type, id };
}

function normalizeContent(value) {
  if (value === undefined || value === null) {
    throw createSuggestionError("suggestion content is required", "AI_SUGGESTION_CONTENT_REQUIRED");
  }
  if (typeof value === "string" && !cleanText(value)) {
    throw createSuggestionError("suggestion content is required", "AI_SUGGESTION_CONTENT_REQUIRED");
  }
  return value;
}

function normalizeHistory(value) {
  return Array.isArray(value) ? value.map((item) => ({ ...item })) : [];
}

function reviewedSuggestionStatuses() {
  return new Set(["adopted_as_draft", "rejected", "edited", "confirmed"]);
}

function hasHumanConfirmation(provenance = {}) {
  return provenance.humanConfirmed === true || provenance.userConfirmed === true;
}

function normalizeProvenance(input = {}, status = "suggested") {
  const provenance = input.provenance && typeof input.provenance === "object" ? input.provenance : {};
  const normalized = {
    contentOrigin: cleanText(provenance.contentOrigin || provenance.content_origin) || "ai_generated",
    humanConfirmed: provenance.humanConfirmed === true || provenance.userConfirmed === true,
    humanEdited: provenance.humanEdited === true || provenance.userEdited === true
  };

  if (status === "confirmed" && !hasHumanConfirmation(normalized)) {
    throw createSuggestionError(
      "confirmed suggestions require user confirmation provenance",
      "AI_SUGGESTION_CONFIRMATION_REQUIRED"
    );
  }

  return normalized;
}

function isAiOrSystemActor(input = {}) {
  const actor = cleanText(input.actor || input.actorType || input.actor_type);
  return actor === "ai" || actor === "system" || input.aiGenerated === true || input.ai_generated === true;
}

function isUserConfirmation(input = {}) {
  if (isAiOrSystemActor(input)) return false;

  const action = cleanText(input.action || input.decision);
  const actor = cleanText(input.actor || input.actorType || input.actor_type);
  const userId = cleanText(input.userId || input.user_id);
  const userConfirmed = input.userConfirmed === true || input.user_confirmed === true;

  return userConfirmed || (action === "confirm" && (actor === "user" || Boolean(userId)));
}

function normalizeTransitionEndpoint(value) {
  return normalizeStatus(value);
}

export function normalizeSuggestion(input = {}, context = {}) {
  const status = normalizeStatus(input.status || context.status);
  const now = context.now || new Date().toISOString();
  const scope = cleanText(input.scope || context.scope);
  if (!scope) {
    throw createSuggestionError("suggestion scope is required", "AI_SUGGESTION_SCOPE_REQUIRED");
  }
  const history = normalizeHistory(input.history || input.transitions);
  if (reviewedSuggestionStatuses().has(status) && history.length === 0) {
    throw createSuggestionError(
      "reviewed suggestion statuses require review history",
      "AI_SUGGESTION_HISTORY_REQUIRED"
    );
  }
  if (history.length) {
    const lastStatus = cleanText(history[history.length - 1]?.toStatus || history[history.length - 1]?.to_status);
    if (lastStatus && lastStatus !== status) {
      throw createSuggestionError(
        `suggestion status ${status} must match the latest review history status ${lastStatus}`,
        "AI_SUGGESTION_HISTORY_STATUS_MISMATCH"
      );
    }
  }

  return {
    id: cleanText(input.id) || generatedId("suggestion"),
    target: normalizeTarget(input),
    scope,
    content: normalizeContent(input.content),
    status,
    origin: cleanText(input.origin || context.origin) || "ai_generated",
    createdAt: cleanText(input.createdAt || input.created_at) || now,
    updatedAt: cleanText(input.updatedAt || input.updated_at) || now,
    model: input.model || context.model || null,
    sourceArtifactId: cleanText(input.sourceArtifactId || input.source_artifact_id || context.sourceArtifactId || context.source_artifact_id),
    provenance: normalizeProvenance(input, status),
    history
  };
}

export function suggestionStatuses() {
  return [...SUGGESTION_STATUSES];
}

export function allowedNextSuggestionStatuses(status) {
  return [...(SUGGESTION_TRANSITIONS.get(normalizeTransitionEndpoint(status)) || [])];
}

export function canTransitionSuggestionStatus(fromStatus, toStatus) {
  const from = normalizeTransitionEndpoint(fromStatus);
  const to = normalizeTransitionEndpoint(toStatus);
  return SUGGESTION_TRANSITIONS.get(from)?.has(to) === true;
}

export function assertSuggestionTransition(fromStatus, toStatus, input = {}) {
  const from = normalizeTransitionEndpoint(fromStatus);
  const to = normalizeTransitionEndpoint(toStatus);

  if (!canTransitionSuggestionStatus(from, to)) {
    throw createSuggestionError(
      `Suggestion status cannot transition from ${from} to ${to}`,
      "AI_SUGGESTION_TRANSITION_INVALID"
    );
  }

  if (to === "confirmed" && !isUserConfirmation(input)) {
    throw createSuggestionError(
      "confirmed suggestions require an explicit user confirmation action",
      "AI_SUGGESTION_CONFIRMATION_REQUIRED"
    );
  }

  return { fromStatus: from, toStatus: to };
}

export function transitionSuggestionStatus(suggestion = {}, toStatus, input = {}) {
  const current = normalizeSuggestion(suggestion);
  const { fromStatus, toStatus: normalizedToStatus } = assertSuggestionTransition(current.status, toStatus, input);
  const now = cleanText(input.createdAt || input.created_at || input.at) || new Date().toISOString();
  const nextContent = Object.prototype.hasOwnProperty.call(input, "content")
    ? normalizeContent(input.content)
    : current.content;
  const actor = cleanText(input.actor || input.actorType || input.actor_type) || (isUserConfirmation(input) ? "user" : "system");
  const allowTargetRetarget = input.allowTargetRetarget === true || input.allow_target_retarget === true;
  const nextTargetId = allowTargetRetarget
    ? cleanText(input.targetId || input.target_id || input.noteId || input.note_id || current.target?.id)
    : cleanText(current.target?.id);
  const nextTargetField = allowTargetRetarget
    ? cleanText(input.targetField || input.target_field || current.target?.field)
    : cleanText(current.target?.field);
  const transition = {
    fromStatus,
    toStatus: normalizedToStatus,
    action: cleanText(input.action || input.decision),
    actor,
    userId: cleanText(input.userId || input.user_id),
    targetId: nextTargetId,
    targetField: nextTargetField,
    comment: cleanText(input.comment),
    createdAt: now
  };

  return {
    ...current,
    target: {
      ...(current.target || {}),
      id: nextTargetId,
      ...(nextTargetField ? { field: nextTargetField } : {})
    },
    content: nextContent,
    status: normalizedToStatus,
    updatedAt: now,
    sourceArtifactId: current.sourceArtifactId || cleanText(input.sourceArtifactId || input.source_artifact_id),
    provenance: {
      ...(current.provenance || {}),
      humanConfirmed: normalizedToStatus === "confirmed" || current.provenance?.humanConfirmed === true,
      humanEdited: normalizedToStatus === "edited" || current.provenance?.humanEdited === true
    },
    history: [...current.history, transition]
  };
}
