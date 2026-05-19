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
  "ProjectDigest",
  "InsightCard",
  "BridgeCard",
  "TensionCard",
  "SourceGap",
  "WritingMove"
];

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function formatRate(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0%";
  const clamped = Math.max(0, Math.min(1, number));
  return `${Math.round(clamped * 100)}%`;
}

function endpointKind(endpoint = {}) {
  return cleanText(endpoint.kind || endpoint.type || "note").toLowerCase() || "note";
}

function endpointId(endpoint = {}) {
  return cleanText(endpoint.id || endpoint.noteId || endpoint.note_id);
}

function normalizeFieldName(value = "") {
  const field = cleanText(value).replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`).replace(/^_+/, "");
  if (field === "thesis") return "thesis";
  if (field === "three_line_summary" || field === "three_linesummary") return "three_line_summary";
  return field;
}

export function aiInboxViewOptions() {
  return [
    { value: "pending", label: "待判断" },
    { value: "reviewed", label: "已处理" },
    { value: "archived", label: "已归档" },
    { value: "all", label: "全部" }
  ];
}

export function aiInboxTypeOptions() {
  return [
    { value: "all", label: "全部建议" },
    { value: "LinkSuggestion", label: "关联建议" },
    { value: "ReflectionPrompt", label: "反思提示" },
    { value: "QuestionCard", label: "问题卡片" },
    { value: "ResearchCard", label: "研究卡片" },
    { value: "ConflictSuggestion", label: "冲突提示" },
    { value: "SynthesisDraft", label: "综合草稿" },
    { value: "OutlineDraft", label: "大纲草稿" },
    { value: "SourceSummary", label: "来源摘要" },
    { value: "ProjectDigest", label: "项目摘要" },
    { value: "InsightCard", label: "洞见卡片" },
    { value: "BridgeCard", label: "桥接卡片" },
    { value: "TensionCard", label: "张力卡片" },
    { value: "SourceGap", label: "证据缺口" },
    { value: "WritingMove", label: "写作动作" }
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
    pending_review: "待判断",
    accepted: "已采纳",
    revised: "已修订",
    ignored: "已忽略",
    archived: "已归档",
    adopted_as_draft: "已采纳为草稿",
    promoted_to_note: "已生成笔记",
    linked_to_note: "已建立关系",
    expired: "已过期"
  };
  return labels[cleanText(status)] || cleanText(status) || "未知状态";
}

export function aiInboxStatusTone(status = "") {
  const normalized = cleanText(status);
  if (normalized === "pending_review") return "warn";
  if (normalized === "accepted" || normalized === "adopted_as_draft" || normalized === "linked_to_note" || normalized === "promoted_to_note") return "ok";
  if (normalized === "ignored" || normalized === "archived" || normalized === "expired") return "muted";
  return "";
}

export function aiInboxTypeLabel(type = "") {
  const option = aiInboxTypeOptions().find((item) => item.value === cleanText(type));
  return option && option.value !== "all" ? option.label : cleanText(type) || "AI 建议";
}

export function aiInboxActionLabel(decision = "") {
  const labels = {
    accepted: "采纳",
    adopted_as_draft: "采纳为草稿",
    ignored: "忽略",
    archived: "归档"
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

export function aiInboxItemFromCanonical(item = {}) {
  const latestDecision = item.latest_decision
    ? {
        decisionId: cleanText(item.latest_decision.decision_id),
        artifactId: cleanText(item.latest_decision.artifact_id),
        decision: cleanText(item.latest_decision.decision),
        userId: cleanText(item.latest_decision.user_id),
        noteId: cleanText(item.latest_decision.note_id),
        comment: cleanText(item.latest_decision.comment),
        feedback: {
          useful: item.latest_decision.feedback?.useful === true,
          noisy: item.latest_decision.feedback?.noisy === true,
          wrong: item.latest_decision.feedback?.wrong === true,
          alreadyKnown: item.latest_decision.feedback?.already_known === true,
          privacyConcern: item.latest_decision.feedback?.privacy_concern === true
        },
        createdAt: cleanText(item.latest_decision.created_at)
      }
    : null;

  return {
    artifactId: cleanText(item.artifact_id),
    type: cleanText(item.type),
    title: cleanText(item.title),
    summary: cleanText(item.summary),
    status: cleanText(item.status),
    actionState: cleanText(item.action_state),
    origin: cleanText(item.origin),
    privacyMode: cleanText(item.privacy_mode),
    createdAt: cleanText(item.created_at),
    updatedAt: cleanText(item.updated_at),
    agentRunId: cleanText(item.agent_run_id),
    contextPackId: cleanText(item.context_pack_id),
    primarySourceNoteId: cleanText(item.primary_source_note_id),
    sourceNoteIds: Array.isArray(item.source_note_ids) ? [...item.source_note_ids] : [],
    sourceDocIds: Array.isArray(item.source_doc_ids) ? [...item.source_doc_ids] : [],
    decisionCount: normalizeCount(item.decision_count),
    latestDecision,
    confidence: item.confidence
      ? {
          score: typeof item.confidence.score === "number" ? item.confidence.score : null,
          label: cleanText(item.confidence.label) || "medium",
          reason: cleanText(item.confidence.reason)
        }
      : null
  };
}

export function aiArtifactFromCanonical(artifact = {}) {
  return {
    id: cleanText(artifact.id),
    type: cleanText(artifact.type),
    title: cleanText(artifact.title),
    summary: cleanText(artifact.summary),
    body: artifact.body ?? "",
    status: cleanText(artifact.status),
    origin: cleanText(artifact.origin),
    createdAt: cleanText(artifact.created_at),
    updatedAt: cleanText(artifact.updated_at),
    agentRunId: cleanText(artifact.agent_run_id),
    contextPackId: cleanText(artifact.context_pack_id),
    model: artifact.model ?? null,
    sources: {
      noteIds: Array.isArray(artifact.sources?.note_ids) ? [...artifact.sources.note_ids] : [],
      sourceDocIds: Array.isArray(artifact.sources?.source_doc_ids) ? [...artifact.sources.source_doc_ids] : [],
      artifactIds: Array.isArray(artifact.sources?.artifact_ids) ? [...artifact.sources.artifact_ids] : [],
      externalUrls: Array.isArray(artifact.sources?.external_urls) ? [...artifact.sources.external_urls] : []
    },
    provenance: {
      contentOrigin: cleanText(artifact.provenance?.content_origin),
      citationRequired: artifact.provenance?.citation_required === true,
      humanAccepted: artifact.provenance?.human_accepted === true,
      humanRewritten: artifact.provenance?.human_rewritten === true
    },
    confidence: artifact.confidence
      ? {
          score: typeof artifact.confidence.score === "number" ? artifact.confidence.score : null,
          label: cleanText(artifact.confidence.label) || "medium",
          reason: cleanText(artifact.confidence.reason)
        }
      : null,
    privacy: {
      mode: cleanText(artifact.privacy?.mode),
      cloudModelUsed: artifact.privacy?.cloud_model_used === true
    },
    fieldSuggestionId: cleanText(artifact.field_suggestion_id),
    userDecisions: Array.isArray(artifact.user_decisions)
      ? artifact.user_decisions.map((decision) => ({
          decisionId: cleanText(decision.decision_id),
          artifactId: cleanText(decision.artifact_id),
          decision: cleanText(decision.decision),
          userId: cleanText(decision.user_id),
          noteId: cleanText(decision.note_id),
          comment: cleanText(decision.comment),
          feedback: {
            useful: decision.feedback?.useful === true,
            noisy: decision.feedback?.noisy === true,
            wrong: decision.feedback?.wrong === true,
            alreadyKnown: decision.feedback?.already_known === true,
            privacyConcern: decision.feedback?.privacy_concern === true
          },
          createdAt: cleanText(decision.created_at)
        }))
      : [],
    payload: artifact.payload ?? {}
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
  const quality = summary.quality?.overall || {};
  const accepted = normalizeCount(latestDecisions.accepted) +
    normalizeCount(latestDecisions.adopted_as_draft) +
    normalizeCount(latestDecisions.promoted_to_note) +
    normalizeCount(latestDecisions.linked_to_note);
  return [
    { key: "artifacts", label: "建议数", value: normalizeCount(artifacts.total) },
    { key: "review_rate", label: "处理率", value: formatRate(quality.reviewRate), tone: "muted" },
    { key: "acceptance_rate", label: "采纳率", value: formatRate(quality.acceptanceRate), tone: "ok" },
    { key: "decisions", label: "处理记录", value: normalizeCount(decisions.total) },
    { key: "accepted", label: "已采纳", value: accepted, tone: "ok" },
    { key: "useful", label: "有用", value: normalizeCount(allFeedback.useful), tone: "ok" },
    { key: "noisy", label: "噪音", value: normalizeCount(allFeedback.noisy), tone: "warn" },
    { key: "wrong", label: "错误", value: normalizeCount(allFeedback.wrong), tone: "warn" },
    { key: "known", label: "已知", value: normalizeCount(allFeedback.alreadyKnown), tone: "muted" },
    { key: "privacy", label: "隐私风险", value: normalizeCount(allFeedback.privacyConcern), tone: "warn" }
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

export function fieldSuggestionSummary(artifact = {}) {
  const payload = artifact?.payload || {};
  const suggestion = payload.fieldSuggestion || payload.field_suggestion || {};
  const suggestionId = cleanText(artifact?.fieldSuggestionId || payload.fieldSuggestionId || payload.field_suggestion_id || suggestion.id);
  const target = suggestion.target || {};
  const content = suggestion.content && typeof suggestion.content === "object" ? suggestion.content : {};
  const field = normalizeFieldName(target.field || payload.targetField || payload.target_field);
  const sourceNoteIds = Array.isArray(artifact?.sources?.noteIds) ? artifact.sources.noteIds : [];
  const noteId = cleanText(target.id || sourceNoteIds[0]);
  const summary = Array.isArray(content.threeLineSummary || content.three_line_summary)
    ? (content.threeLineSummary || content.three_line_summary).map(cleanText).filter(Boolean)
    : [];
  const thesis = cleanText(content.thesis || content[field] || artifact?.body || payload.claim);
  const value = field === "three_line_summary" ? summary.join(" / ") : thesis;
  const adopted = cleanText(artifact.status) === "adopted_as_draft" ||
    (Array.isArray(artifact.userDecisions) ? artifact.userDecisions : []).some(
      (decision) => cleanText(decision?.decision) === "adopted_as_draft"
    );
  const hasAdoptableValue = field === "three_line_summary" ? summary.length === 3 : Boolean(thesis);
  return {
    suggestionId,
    canAdopt: cleanText(artifact?.type) === "InsightCard" && !adopted && Boolean(noteId) && ["thesis", "three_line_summary"].includes(field) && hasAdoptableValue,
    adopted,
    noteId,
    field,
    fieldLabel: field === "three_line_summary" ? "三句话压缩" : field === "thesis" ? "一句话判断" : field,
    value
  };
}

export function isAdoptableFieldSuggestionArtifact(artifact = {}) {
  return fieldSuggestionSummary(artifact).canAdopt;
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
