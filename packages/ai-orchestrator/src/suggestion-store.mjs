import { normalizeSuggestion, transitionSuggestionStatus } from "./suggestions.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function matchesFilters(suggestion = {}, filters = {}) {
  const status = cleanText(filters.status);
  const targetType = cleanText(filters.targetType || filters.target_type);
  const targetId = cleanText(filters.targetId || filters.target_id);
  const sourceArtifactId = cleanText(filters.sourceArtifactId || filters.source_artifact_id);
  const scope = cleanText(filters.scope);
  if (status && status !== "all" && suggestion.status !== status) return false;
  if (targetType && suggestion.target?.type !== targetType) return false;
  if (targetId && suggestion.target?.id !== targetId) return false;
  if (sourceArtifactId && suggestion.sourceArtifactId !== sourceArtifactId) return false;
  if (scope && suggestion.scope !== scope) return false;
  return true;
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

export function createInMemorySuggestionStore(seed = []) {
  const records = new Map();
  for (const item of Array.isArray(seed) ? seed : []) {
    const suggestion = normalizeSuggestion(item);
    records.set(suggestion.id, suggestion);
  }

  return {
    create(input, context = {}) {
      assertRequestedSuggestionCreateStatus(input, context);
      const suggestion = normalizeSuggestion(input, context);
      assertInitialSuggestionCreate(suggestion, context);
      records.set(suggestion.id, suggestion);
      return clone(suggestion);
    },
    get(id) {
      const suggestion = records.get(cleanText(id));
      return suggestion ? clone(suggestion) : null;
    },
    list(filters = {}) {
      const limit = normalizeLimit(filters.limit);
      return [...records.values()]
        .filter((item) => matchesFilters(item, filters))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        .slice(0, limit)
        .map(clone);
    },
    transition(id, toStatus, input = {}) {
      const suggestionId = cleanText(id);
      const current = records.get(suggestionId);
      if (!current) {
        const error = new Error(`suggestionId not found: ${suggestionId}`);
        error.code = "AI_SUGGESTION_NOT_FOUND";
        throw error;
      }
      const next = transitionSuggestionStatus(current, toStatus, input);
      records.set(next.id, next);
      return clone(next);
    },
    replace(input, context = {}) {
      const suggestion = normalizeSuggestion(input, context);
      records.set(suggestion.id, suggestion);
      return clone(suggestion);
    },
    close() {}
  };
}
