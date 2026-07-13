export const CONTEXTUAL_AI_TASK_LABELS = Object.freeze({
  distill_material: "帮我提炼",
  check_note: "AI 建议",
  recommend_relation: "AI推荐",
  suggest_theme: "建议主题",
  generate_outline: "生成提纲",
  check_outline: "检查提纲",
  find_gap: "找缺口"
});

export const CONTEXTUAL_AI_ACTIONS = Object.freeze({
  distill_material: Object.freeze({ id: "distill_material", label: CONTEXTUAL_AI_TASK_LABELS.distill_material, resultKind: "draft" }),
  check_note: Object.freeze({ id: "check_note", label: CONTEXTUAL_AI_TASK_LABELS.check_note, resultKind: "suggestions" }),
  recommend_relation: Object.freeze({ id: "recommend_relation", label: CONTEXTUAL_AI_TASK_LABELS.recommend_relation, resultKind: "recommendations" }),
  suggest_theme: Object.freeze({ id: "suggest_theme", label: CONTEXTUAL_AI_TASK_LABELS.suggest_theme, resultKind: "theme" }),
  generate_outline: Object.freeze({ id: "generate_outline", label: CONTEXTUAL_AI_TASK_LABELS.generate_outline, resultKind: "outline" }),
  check_outline: Object.freeze({ id: "check_outline", label: CONTEXTUAL_AI_TASK_LABELS.check_outline, resultKind: "suggestions" }),
  find_gap: Object.freeze({ id: "find_gap", label: CONTEXTUAL_AI_TASK_LABELS.find_gap, resultKind: "gap" })
});

export const CONTEXTUAL_AI_ACTION_STATUS = Object.freeze({
  idle: "idle",
  checking: "checking",
  needs_setup: "needs_setup",
  needs_remote_confirmation: "needs_remote_confirmation",
  running: "running",
  awaiting_confirmation: "awaiting_confirmation",
  completed: "completed",
  failed: "failed",
  adopted: "adopted",
  ignored: "ignored"
});

const FORBIDDEN_TERMS = ["artifact", "candidate", "queue", "route", "provider", "model id"];

function cleanText(value = "") {
  return String(value || "").trim();
}

function compactObject(values = {}) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return cleanText(value) || (value && typeof value === "object");
    })
  );
}

function artifactSuggestion(artifact = {}) {
  const payload = artifact.payload && typeof artifact.payload === "object" ? artifact.payload : {};
  const payloadLines = [
    payload.text,
    payload.claim,
    payload.whyItMatters,
    payload.suggestedLocation ? `建议位置：${payload.suggestedLocation}` : "",
    Array.isArray(payload.sections) ? `提纲：${payload.sections.join(" / ")}` : "",
    Array.isArray(payload.gaps) ? `缺口：${payload.gaps.join("；")}` : "",
    payload.gap ? `缺口：${payload.gap}` : ""
  ].map(cleanText).filter(Boolean);
  const text = cleanText(artifact.body) || cleanText(artifact.summary) || payloadLines.join("\n");
  return {
    title: cleanText(artifact.title) || cleanText(artifact.type) || "建议",
    text,
    editable: true,
    value: text
  };
}

function sameId(left = "", right = "") {
  return cleanText(left) && cleanText(left) === cleanText(right);
}

function linkSuggestionTarget(payload = {}, context = {}) {
  const from = payload.from || {};
  const to = payload.to || {};
  const currentId = cleanText(
    context.currentNoteId ||
      context.current_note_id ||
      context.noteId ||
      context.note_id ||
      context.sourceNoteId ||
      context.source_note_id ||
      context.sourceId ||
      context.source_id ||
      context.fromNoteId ||
      context.from_note_id
  );
  if (currentId && sameId(recommendationNoteId(to), currentId) && recommendationNoteId(from)) return from;
  if (currentId && sameId(recommendationNoteId(from), currentId) && recommendationNoteId(to)) return to;
  return to;
}

function artifactRecommendation(artifact = {}, options = {}) {
  const payload = artifact.payload && typeof artifact.payload === "object" ? artifact.payload : {};
  const target = payload.target || payload.note || linkSuggestionTarget(payload, options.context);
  const title = cleanText(target.title || payload.noteTitle || artifact.title) || "推荐笔记";
  const text = cleanText(payload.rationale || payload.reason || artifact.summary || artifact.body);
  return {
    title,
    text,
    value: text,
    noteId: recommendationNoteId(target) || recommendationNoteId(payload)
  };
}

function recommendationNoteType(value = {}) {
  return cleanText(value.type || value.kind || value.noteType || value.note_type || value.targetType || value.target_type).toLowerCase();
}

function recommendationNoteId(value = {}) {
  return cleanText(value.id || value.noteId || value.note_id || value.targetNoteId || value.target_note_id || value.toNoteId || value.to_note_id);
}

function permanentNoteIdSet(context = {}) {
  const values = [
    ...(Array.isArray(context.permanentNoteIds) ? context.permanentNoteIds : []),
    ...(Array.isArray(context.permanent_note_ids) ? context.permanent_note_ids : []),
    ...(Array.isArray(context.permanentNotes) ? context.permanentNotes.map((note) => note?.id || note?.noteId || note?.note_id) : []),
    ...(Array.isArray(context.permanent_notes) ? context.permanent_notes.map((note) => note?.id || note?.noteId || note?.note_id) : [])
  ].map(cleanText).filter(Boolean);
  return new Set(values);
}

function isPermanentRecommendationTarget(value = {}, context = {}) {
  const type = recommendationNoteType(value);
  const id = recommendationNoteId(value);
  if (!id) return false;
  if (permanentNoteIdSet(context).has(id)) return true;
  if (["permanent", "permanent_note"].includes(type)) return true;
  if (type && type !== "note") return false;
  return id.startsWith("pn_");
}

function normalizeRecommendation(item = {}, options = {}) {
  const target = item.target || item.note || item.to || {};
  if (!isPermanentRecommendationTarget(target, options.context) && !isPermanentRecommendationTarget(item, options.context)) return null;
  const title = cleanText(target.title || item.title || item.noteTitle) || "推荐笔记";
  const text = cleanText(item.text || item.reason || item.rationale || item.content);
  return {
    title,
    text,
    value: item.value ?? item.reason ?? item.rationale ?? item.content ?? "",
    noteId: recommendationNoteId(target) || recommendationNoteId(item)
  };
}

function resultArtifacts(source = {}) {
  if (Array.isArray(source.artifacts)) return source.artifacts;
  if (Array.isArray(source.result?.artifacts)) return source.result.artifacts;
  return [];
}

function recommendationArtifacts(artifacts = [], options = {}) {
  return artifacts.filter((artifact) => {
    if (cleanText(artifact?.type) !== "LinkSuggestion") return false;
    const payload = artifact.payload && typeof artifact.payload === "object" ? artifact.payload : {};
    const target = payload.target || payload.note || linkSuggestionTarget(payload, options.context);
    return isPermanentRecommendationTarget(target, options.context) ||
      isPermanentRecommendationTarget({
        type: payload.targetNoteType || payload.toNoteType || payload.target_note_type || payload.to_note_type,
        id: payload.targetNoteId || payload.toNoteId || payload.target_note_id || payload.to_note_id
      }, options.context);
  });
}

function summaryText(source = {}) {
  const summary = source.summary ?? source.result?.summary;
  if (!summary) return cleanText(source.description);
  if (typeof summary === "string") return cleanText(summary);
  if (typeof summary === "object") {
    return cleanText(summary.message || summary.text || summary.description);
  }
  return cleanText(summary);
}

export function contextualAiActionMeta(actionId) {
  return CONTEXTUAL_AI_ACTIONS[actionId] || null;
}

export function createContextualAiActionState(actionId = "") {
  const meta = contextualAiActionMeta(actionId);
  return {
    actionId: meta?.id || String(actionId || "").trim(),
    status: CONTEXTUAL_AI_ACTION_STATUS.idle,
    result: null,
    error: "",
    returnContext: null,
    remoteConfirmed: false
  };
}

export function normalizeContextualAiResult(result = {}, options = {}) {
  const source = result && typeof result === "object" ? result : { value: result };
  const kind = String(options.kind || source.kind || "result");
  const artifacts = resultArtifacts(source);
  const suggestions = kind !== "recommendations" && Array.isArray(source.suggestions)
    ? source.suggestions.slice(0, 3).map((item) => ({
        title: String(item?.title || "").trim(),
        text: String(item?.text || item?.reason || item?.content || "").trim(),
        editable: item?.editable !== false,
        value: item?.value ?? item?.content ?? ""
      }))
    : artifacts.length && kind !== "recommendations"
      ? artifacts.slice(0, 3).map(artifactSuggestion)
    : [];
  const recommendations = Array.isArray(source.recommendations)
    ? source.recommendations.map((item) => normalizeRecommendation(item, options)).filter(Boolean).slice(0, 5)
    : artifacts.length && kind === "recommendations"
      ? recommendationArtifacts(artifacts, options).slice(0, 5).map((artifact) => artifactRecommendation(artifact, options))
    : [];
  return {
    kind,
    title: String(source.title || "").trim(),
    summary: summaryText(source),
    suggestions,
    recommendations,
    draft: source.draft && typeof source.draft === "object"
      ? { ...source.draft }
      : kind === "draft"
        ? compactObject({ title: source.title, coreArgument: source.coreArgument || source.thesis, content: source.content || source.body, questions: source.questions })
        : source.draft || null,
    theme: source.theme && typeof source.theme === "object"
      ? { ...source.theme }
      : kind === "theme"
        ? compactObject({ title: source.title || source.name, centralQuestion: source.centralQuestion, membershipReason: source.membershipReason || source.reason, notes: source.notes || source.keyNotes })
        : source.theme || null,
    outline: source.outline && typeof source.outline === "object"
      ? { ...source.outline }
      : kind === "outline"
        ? compactObject({ title: source.title, sections: source.sections || source.outlineDrafts, content: source.content || source.body })
        : source.outline || null,
    gap: source.gap && typeof source.gap === "object"
      ? { ...source.gap }
      : kind === "gap"
        ? compactObject({ title: source.title, text: source.text || source.claim, reason: source.reason, evidenceGap: source.evidenceGap, contradiction: source.contradiction, transitionGap: source.transitionGap })
        : source.gap || null,
    raw: source.raw ?? source,
    requiresConfirmation: true,
    autoWrite: false
  };
}

export function contextualAiAvailability(preferences = {}) {
  const mode = String(preferences.runtimeMode || "")
    .trim()
    .toLowerCase()
    .replace(/[\s/-]+/g, "_");
  const ready = preferences.routePreview?.access?.ready === true || preferences.ready === true;
  if (mode === "off" || mode === "none") return { ready: false, mode: "off" };
  if (["remote", "online", "cloud", "cloud_only"].includes(mode)) return { ready, mode: "remote" };
  return { ready, mode: "local" };
}

export function hasForbiddenContextualAiTerm(value = "") {
  const text = String(value || "").toLowerCase();
  return FORBIDDEN_TERMS.some((term) => text.includes(term));
}
