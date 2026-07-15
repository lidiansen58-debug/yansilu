import { aiArtifactFromCanonical } from "./ai-inbox-model.js";

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export function aiSuggestionFromCanonical(item = {}) {
  return {
    id: cleanText(item.id),
    target: {
      type: cleanText(item.target?.type),
      id: cleanText(item.target?.id),
      ...(cleanText(item.target?.field) ? { field: cleanText(item.target.field) } : {}),
      ...(cleanText(item.target?.title || item.target?.note_title) ? { title: cleanText(item.target?.title || item.target?.note_title) } : {}),
      ...(cleanText(item.target?.name) && !cleanText(item.target?.title || item.target?.note_title) ? { name: cleanText(item.target.name) } : {})
    },
    scope: cleanText(item.scope),
    content: item.content ?? null,
    status: cleanText(item.status),
    origin: cleanText(item.origin),
    createdAt: cleanText(item.created_at),
    updatedAt: cleanText(item.updated_at),
    model: item.model ?? null,
    sourceArtifactId: cleanText(item.source_artifact_id),
    provenance: {
      contentOrigin: cleanText(item.provenance?.content_origin),
      humanConfirmed: item.provenance?.human_confirmed === true,
      humanEdited: item.provenance?.human_edited === true
    },
    history: Array.isArray(item.history)
      ? item.history.map((entry) => ({
          fromStatus: cleanText(entry.from_status),
          toStatus: cleanText(entry.to_status),
          action: cleanText(entry.action),
          actor: cleanText(entry.actor),
          userId: cleanText(entry.user_id),
          comment: cleanText(entry.comment),
          createdAt: cleanText(entry.created_at)
        }))
      : []
  };
}

export function aiSuggestionReviewEventFromCanonical(event = {}) {
  return {
    adoptionEventId: cleanText(event.adoption_event_id),
    subjectKind: cleanText(event.subject_kind),
    subjectId: cleanText(event.subject_id),
    eventType: cleanText(event.event_type),
    actorType: cleanText(event.actor_type),
    actorId: cleanText(event.actor_id),
    target: {
      kind: cleanText(event.target?.kind),
      id: cleanText(event.target?.id),
      field: cleanText(event.target?.field)
    },
    comment: cleanText(event.comment),
    feedback: {
      useful: event.feedback?.useful === true,
      noisy: event.feedback?.noisy === true,
      wrong: event.feedback?.wrong === true,
      alreadyKnown: event.feedback?.already_known === true,
      privacyConcern: event.feedback?.privacy_concern === true
    },
    metadata: {
      fromStatus: cleanText(event.metadata?.from_status),
      toStatus: cleanText(event.metadata?.to_status),
      noteId: cleanText(event.metadata?.note_id)
    },
    createdAt: cleanText(event.created_at)
  };
}

export function aiSuggestionTraceFromCanonical(trace = {}) {
  return {
    suggestionId: cleanText(trace.suggestion_id),
    sourceArtifactId: cleanText(trace.source_artifact_id),
    primarySourceNoteId: cleanText(trace.primary_source_note_id),
    sourceNoteIds: Array.isArray(trace.source_note_ids) ? [...trace.source_note_ids] : [],
    targetNoteId: cleanText(trace.target_note_id),
    targetField: cleanText(trace.target_field),
    suggestionStatus: cleanText(trace.suggestion_status)
  };
}

function fallbackSuggestionItem(response = {}) {
  if (!response || typeof response !== "object" || Array.isArray(response)) return null;
  if (cleanText(response.id) || response.target || cleanText(response.status)) return response;
  if (response.item && typeof response.item === "object" && !Array.isArray(response.item)) return response.item;
  return null;
}

export function aiSuggestionDetailFromResponse(response = {}) {
  const canonical = response?.canonical || {};
  const item = canonical.item ? aiSuggestionFromCanonical(canonical.item) : fallbackSuggestionItem(response);
  const reviewEvents = Array.isArray(canonical.review_events)
    ? canonical.review_events.map((event) => aiSuggestionReviewEventFromCanonical(event))
    : Array.isArray(response?.reviewEvents)
      ? response.reviewEvents
      : [];
  const latestReviewEvent = canonical.latest_review_event
    ? aiSuggestionReviewEventFromCanonical(canonical.latest_review_event)
    : response?.latestReviewEvent || null;
  const trace = canonical.trace
    ? aiSuggestionTraceFromCanonical(canonical.trace)
    : response?.trace || null;
  const linkedArtifact = canonical.artifact
    ? aiArtifactFromCanonical(canonical.artifact)
    : response?.artifact || null;
  return {
    item,
    reviewEvents,
    latestReviewEvent,
    trace,
    linkedArtifact
  };
}

export function aiSuggestionStatusOptions() {
  return [
    { value: "all", label: "全部状态" },
    { value: "suggested", label: "待建议" },
    { value: "adopted_as_draft", label: "已采纳为草稿" },
    { value: "edited", label: "已编辑" },
    { value: "confirmed", label: "已确认" },
    { value: "rejected", label: "已拒绝" }
  ];
}

export function aiSuggestionStatusLabel(status = "") {
  const labels = {
    suggested: "待建议",
    adopted_as_draft: "已采纳为草稿",
    edited: "已编辑",
    confirmed: "已确认",
    rejected: "已拒绝"
  };
  return labels[cleanText(status)] || cleanText(status) || "未知";
}

export function aiSuggestionStatusTone(status = "") {
  const value = cleanText(status);
  if (value === "suggested") return "warn";
  if (value === "adopted_as_draft" || value === "edited" || value === "confirmed") return "ok";
  if (value === "rejected") return "muted";
  return "";
}

export function normalizeAiSuggestionFilters(filters = {}) {
  const validStatuses = new Set(aiSuggestionStatusOptions().map((item) => item.value));
  const status = validStatuses.has(cleanText(filters.status)) ? cleanText(filters.status) : "all";
  const targetType = cleanText(filters.targetType || filters.target_type);
  const targetId = cleanText(filters.targetId || filters.target_id);
  const scope = cleanText(filters.scope);
  const limit = Math.max(1, Math.min(100, Number(filters.limit || 50) || 50));
  return { status, targetType, targetId, scope, limit };
}

export function aiSuggestionSummary({ items = [], total = 0 } = {}) {
  const list = Array.isArray(items) ? items : [];
  const counts = list.reduce(
    (acc, item) => {
      const key = cleanText(item.status) || "unknown";
      acc[key] = normalizeCount(acc[key]) + 1;
      return acc;
    },
    { suggested: 0, adopted_as_draft: 0, edited: 0, confirmed: 0, rejected: 0 }
  );
  return {
    visible: list.length,
    total: normalizeCount(total || list.length),
    counts
  };
}

export function aiSuggestionTargetLabel(suggestion = {}) {
  const target = suggestion.target || {};
  const type = cleanText(target.type) || "目标";
  const id = cleanText(target.id);
  const field = cleanText(target.field);
  return [type, id, field].filter(Boolean).join(" / ") || "未知目标";
}

export function aiSuggestionActionSet(suggestion = {}) {
  const status = cleanText(suggestion.status);
  if (status === "suggested") return ["adopted_as_draft", "rejected"];
  if (status === "adopted_as_draft") return ["edited"];
  if (status === "edited") return ["confirmed"];
  return [];
}
