const VIEW_VALUES = ["pending", "reviewed", "archived", "all"];
const NOTE_PROMOTION_TYPES = new Set(["QuestionCard", "ReflectionPrompt"]);
const TYPE_VALUES = [
  "all",
  "LinkSuggestion",
  "ReflectionPrompt",
  "QuestionCard",
  "ResearchCard",
  "ConflictSuggestion",
  "SynthesisDraft",
  "OutlineDraft",
  "SourceSummary",
  "ProjectDigest"
];

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function endpointKind(endpoint = {}) {
  return cleanText(endpoint.kind || endpoint.type || "note").toLowerCase() || "note";
}

function endpointId(endpoint = {}) {
  return cleanText(endpoint.id || endpoint.noteId || endpoint.note_id);
}

export function aiInboxViewOptions() {
  return [
    { value: "pending", label: "Pending" },
    { value: "reviewed", label: "Reviewed" },
    { value: "archived", label: "Archived" },
    { value: "all", label: "All" }
  ];
}

export function aiInboxTypeOptions() {
  return [
    { value: "all", label: "All types" },
    { value: "LinkSuggestion", label: "Link suggestions" },
    { value: "ReflectionPrompt", label: "Reflection prompts" },
    { value: "QuestionCard", label: "Questions" },
    { value: "ResearchCard", label: "Research cards" },
    { value: "ConflictSuggestion", label: "Conflicts" },
    { value: "SynthesisDraft", label: "Synthesis drafts" },
    { value: "OutlineDraft", label: "Outlines" },
    { value: "SourceSummary", label: "Source summaries" },
    { value: "ProjectDigest", label: "Project digests" }
  ];
}

export function normalizeAiInboxFilters(filters = {}) {
  const view = VIEW_VALUES.includes(cleanText(filters.view)) ? cleanText(filters.view) : "pending";
  const type = TYPE_VALUES.includes(cleanText(filters.type)) ? cleanText(filters.type) : "all";
  const privacyMode = cleanText(filters.privacyMode);
  const sourceNoteId = cleanText(filters.sourceNoteId);
  const limit = Math.max(1, Math.min(100, Number(filters.limit || 50) || 50));
  return { view, type, privacyMode, sourceNoteId, limit };
}

export function aiInboxStatusLabel(status = "") {
  const labels = {
    pending_review: "Pending review",
    accepted: "Accepted",
    revised: "Revised",
    ignored: "Ignored",
    archived: "Archived",
    promoted_to_note: "Promoted",
    linked_to_note: "Linked",
    expired: "Expired"
  };
  return labels[cleanText(status)] || cleanText(status) || "Unknown";
}

export function aiInboxStatusTone(status = "") {
  const normalized = cleanText(status);
  if (normalized === "pending_review") return "warn";
  if (normalized === "accepted" || normalized === "linked_to_note" || normalized === "promoted_to_note") return "ok";
  if (normalized === "ignored" || normalized === "archived" || normalized === "expired") return "muted";
  return "";
}

export function aiInboxTypeLabel(type = "") {
  const option = aiInboxTypeOptions().find((item) => item.value === cleanText(type));
  return option && option.value !== "all" ? option.label : cleanText(type) || "Artifact";
}

export function aiInboxActionLabel(decision = "") {
  const labels = {
    accepted: "Accept",
    ignored: "Ignore",
    archived: "Archive"
  };
  return labels[cleanText(decision)] || cleanText(decision);
}

export function aiInboxCounts(counts = {}) {
  return {
    pending: normalizeCount(counts.pending),
    reviewed: normalizeCount(counts.reviewed),
    archived: normalizeCount(counts.archived),
    all: normalizeCount(counts.all)
  };
}

export function selectedAiInboxItem(items = [], selectedArtifactId = "") {
  const id = cleanText(selectedArtifactId);
  if (id) {
    const selected = items.find((item) => cleanText(item.artifactId) === id);
    if (selected) return selected;
  }
  return items[0] || null;
}

export function aiInboxSummary({ items = [], counts = {}, filters = {} } = {}) {
  const normalizedCounts = aiInboxCounts(counts);
  const view = normalizeAiInboxFilters(filters).view;
  const viewCount = normalizedCounts[view] ?? items.length;
  return {
    visible: Array.isArray(items) ? items.length : 0,
    view,
    viewCount,
    counts: normalizedCounts
  };
}

export function aiInboxEvaluationMetrics(summary = {}) {
  const artifacts = summary.artifacts || {};
  const decisions = summary.decisions || {};
  const latestDecisions = decisions.latest || {};
  const feedback = summary.feedback || {};
  const allFeedback = feedback.all || {};
  const accepted = normalizeCount(latestDecisions.accepted) +
    normalizeCount(latestDecisions.promoted_to_note) +
    normalizeCount(latestDecisions.linked_to_note);
  return [
    { key: "artifacts", label: "Artifacts", value: normalizeCount(artifacts.total) },
    { key: "decisions", label: "Decisions", value: normalizeCount(decisions.total) },
    { key: "accepted", label: "Accepted", value: accepted, tone: "ok" },
    { key: "useful", label: "Useful", value: normalizeCount(allFeedback.useful), tone: "ok" },
    { key: "noisy", label: "Noisy", value: normalizeCount(allFeedback.noisy), tone: "warn" },
    { key: "wrong", label: "Wrong", value: normalizeCount(allFeedback.wrong), tone: "warn" },
    { key: "known", label: "Known", value: normalizeCount(allFeedback.alreadyKnown), tone: "muted" },
    { key: "privacy", label: "Privacy", value: normalizeCount(allFeedback.privacyConcern), tone: "warn" }
  ];
}

export function isNoteToNoteLinkSuggestion(artifact = {}) {
  if (cleanText(artifact?.type) !== "LinkSuggestion") return false;
  const payload = artifact.payload || {};
  const fromKind = endpointKind(payload.from || {});
  const toKind = endpointKind(payload.to || {});
  return fromKind === "note" && toKind === "note" && Boolean(endpointId(payload.from || {})) && Boolean(endpointId(payload.to || {}));
}

export function linkSuggestionSummary(artifact = {}) {
  const payload = artifact?.payload || {};
  const from = payload.from || {};
  const to = payload.to || {};
  return {
    fromNoteId: endpointId(from),
    toNoteId: endpointId(to),
    fromKind: endpointKind(from),
    toKind: endpointKind(to),
    relationType: cleanText(payload.relationType || payload.relation_type || "related"),
    rationale: cleanText(payload.rationale || artifact.summary),
    confidence: artifact.confidence?.score ?? payload.confidence ?? null,
    canAccept: isNoteToNoteLinkSuggestion(artifact)
  };
}

export function isPromotableNoteArtifact(artifact = {}) {
  if (!NOTE_PROMOTION_TYPES.has(cleanText(artifact?.type))) return false;
  const decisions = Array.isArray(artifact.userDecisions) ? artifact.userDecisions : [];
  return !decisions.some((decision) => cleanText(decision?.decision) === "promoted_to_note" && cleanText(decision?.noteId || decision?.note_id));
}

export function notePromotionSummary(artifact = {}) {
  const decisions = Array.isArray(artifact.userDecisions) ? artifact.userDecisions : [];
  const promoted = decisions
    .slice()
    .reverse()
    .find((decision) => cleanText(decision?.decision) === "promoted_to_note" && cleanText(decision?.noteId || decision?.note_id));
  return {
    canPromote: isPromotableNoteArtifact(artifact),
    promotedNoteId: cleanText(promoted?.noteId || promoted?.note_id),
    suggestedTitle: cleanText(artifact?.payload?.noteTitle || artifact?.payload?.note_title || artifact?.payload?.title || artifact?.payload?.question || artifact?.payload?.prompt || artifact?.title),
    artifactType: cleanText(artifact?.type)
  };
}

export function latestFeedbackFlags(itemOrArtifact = {}) {
  const decision = itemOrArtifact.latestDecision ||
    (Array.isArray(itemOrArtifact.userDecisions) ? itemOrArtifact.userDecisions[itemOrArtifact.userDecisions.length - 1] : null) ||
    {};
  const feedback = decision.feedback || {};
  return {
    useful: Boolean(feedback.useful),
    noisy: Boolean(feedback.noisy),
    wrong: Boolean(feedback.wrong),
    alreadyKnown: Boolean(feedback.alreadyKnown ?? feedback.already_known),
    privacyConcern: Boolean(feedback.privacyConcern ?? feedback.privacy_concern)
  };
}
