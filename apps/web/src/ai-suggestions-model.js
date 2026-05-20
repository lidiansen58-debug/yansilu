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
      ...(cleanText(item.target?.field) ? { field: cleanText(item.target.field) } : {})
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

export function aiSuggestionStatusOptions() {
  return [
    { value: "all", label: "All statuses" },
    { value: "suggested", label: "Suggested" },
    { value: "adopted_as_draft", label: "Adopted as draft" },
    { value: "edited", label: "Edited" },
    { value: "confirmed", label: "Confirmed" },
    { value: "rejected", label: "Rejected" }
  ];
}

export function aiSuggestionStatusLabel(status = "") {
  const labels = {
    suggested: "Suggested",
    adopted_as_draft: "Adopted as draft",
    edited: "Edited",
    confirmed: "Confirmed",
    rejected: "Rejected"
  };
  return labels[cleanText(status)] || cleanText(status) || "Unknown";
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
  const type = cleanText(target.type) || "target";
  const id = cleanText(target.id);
  const field = cleanText(target.field);
  return [type, id, field].filter(Boolean).join(" / ") || "Unknown target";
}

export function aiSuggestionActionSet(suggestion = {}) {
  const status = cleanText(suggestion.status);
  if (status === "suggested") return ["adopted_as_draft", "rejected"];
  if (status === "adopted_as_draft") return ["edited"];
  if (status === "edited") return ["confirmed"];
  return [];
}
