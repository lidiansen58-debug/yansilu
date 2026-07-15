import { originalityGuard, similarityScore, tokenizeText } from "../../originality-guard/src/index.mjs";
import { normalizeArtifact } from "./artifacts.mjs";
import { DEFAULT_LOCAL_AI_MODEL } from "./local-model-catalog.mjs";
import { buildPotentialRelationCandidates, isPotentialRelationNetworkStatus } from "./potential-relations.mjs";
import { normalizeSuggestion } from "./suggestions.mjs";

export const DEFAULT_VIEWPOINT_DISTILLATION_TIMEOUT_MS = 60000;
export const DEFAULT_VIEWPOINT_DISTILLATION_NUM_PREDICT = 800;

const PRINCIPLE_CHECKS = [
  "judgment_not_material",
  "has_thesis",
  "has_three_line_summary",
  "has_reason_or_boundary",
  "reusable_for_writing",
  "traceable_sources",
  "authorship_boundary"
];

const JUDGMENT_SIGNAL_PATTERN =
  /should|must|because|therefore|rather than|instead of|means|risk|value|boundary|condition|cannot|can\s+help|matters|supports|contradicts|应该|必须|因为|所以|不是|而是|意味着|风险|价值|边界|条件|不能|可以|关键|支撑|反驳|矛盾|张力/iu;

const MATERIAL_SIGNAL_PATTERN =
  /quote|excerpt|source|citation|摘录|原文|引用|出处|文献|资料|高亮|转述/iu;

function cleanText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function compactText(value) {
  return cleanText(value).replace(/\s+/g, " ");
}

function stringItems(value) {
  return (Array.isArray(value) ? value : []).map((item) => cleanText(item)).filter(Boolean);
}

function normalizeNoteRef(input = {}) {
  const noteId = cleanText(input.noteId || input.note_id || input.id);
  return {
    noteId,
    title: cleanText(input.title),
    noteType: cleanText(input.noteType || input.note_type),
    body: cleanText(input.body || input.markdown || input.markdownBody || input.markdown_body),
    thesis: cleanText(input.thesis),
    threeLineSummary: stringItems(input.threeLineSummary || input.three_line_summary),
    boundaryOrCounterpoint: cleanText(input.boundaryOrCounterpoint || input.boundary_or_counterpoint),
    tags: stringItems(input.tags),
    citations: Array.isArray(input.citations) ? input.citations.map((item) => ({ ...item })) : []
  };
}

function normalizeLiteratureRef(input = {}) {
  return {
    id: cleanText(input.id || input.noteId || input.note_id || input.sourceId || input.source_id),
    source_id: cleanText(input.source_id || input.sourceId || input.id || "unknown"),
    quote_text: cleanText(input.quote_text || input.quoteText || input.body || input.markdown),
    locator: cleanText(input.locator || input.page || input.location)
  };
}

function firstCandidateLine(text = "") {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => cleanText(line).replace(/^#{1,6}\s*/, "").replace(/^[-*]\s+/, ""))
    .filter(Boolean)
    .filter((line) => !/^---+$/.test(line))
    .filter((line) => !/^\w+:\s*/.test(line));
  return lines[0] || "";
}

function firstSentence(text = "", maxLength = 120) {
  const compact = compactText(text);
  if (!compact) return "";
  const boundary = compact.search(/[。！？!?]\s*/u);
  const sentence = boundary >= 12 ? compact.slice(0, boundary + 1) : compact;
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1).trim()}…` : sentence;
}

function textForAnalysis(note = {}) {
  return compactText(
    [
      note.thesis,
      ...(note.threeLineSummary || []),
      note.boundaryOrCounterpoint,
      note.title,
      note.body
    ].join("\n")
  );
}

function hasJudgmentSignal(text = "") {
  return JUDGMENT_SIGNAL_PATTERN.test(text);
}

function hasMaterialSignal(text = "") {
  return MATERIAL_SIGNAL_PATTERN.test(text);
}

function statusRank(status) {
  if (status === "blocked") return 3;
  if (status === "warning") return 2;
  if (status === "pass") return 1;
  return 0;
}

function worstStatus(items = []) {
  return items.reduce((worst, item) => (statusRank(item.status) > statusRank(worst) ? item.status : worst), "pass");
}

function makeCheck(checkId, status, message, recommendedAction = "") {
  return {
    checkId,
    status,
    message,
    recommendedAction
  };
}

function action(actionId, label, targetField, priority = "medium") {
  return { actionId, label, targetField, priority };
}

function stablePart(value = "") {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/giu, "_").replace(/^_+|_+$/g, "").slice(0, 48);
}

function stableId(prefix, parts = []) {
  const suffix = parts.map(stablePart).filter(Boolean).join("_");
  return `${prefix}_${suffix || "item"}`;
}

function buildThreeLineSummary(note = {}) {
  if (note.threeLineSummary?.length === 3) return note.threeLineSummary;
  const thesis = cleanText(note.thesis);
  const bodyLine = firstSentence(firstCandidateLine(note.body), 110);
  const reasonLine = cleanText(note.boundaryOrCounterpoint);
  const result = [];
  if (thesis) result.push(thesis);
  if (bodyLine && bodyLine !== thesis) result.push(bodyLine);
  if (reasonLine && !result.includes(reasonLine)) result.push(reasonLine);
  return result.slice(0, 3);
}

function distillationStatusFor(note = {}) {
  const suggestedThesis = note.thesis || firstSentence(firstCandidateLine(note.body || note.title), 120);
  const suggestedThreeLineSummary = buildThreeLineSummary(note);
  const reasons = [];
  const openQuestions = [];

  if (!note.thesis) {
    reasons.push("thesis_missing");
    openQuestions.push("这条永久笔记到底主张什么？");
  }
  if (note.threeLineSummary.length !== 3) {
    reasons.push("three_line_summary_incomplete");
    openQuestions.push("这条观点是什么、为什么重要、未来服务于哪个问题？");
  }
  if (!note.boundaryOrCounterpoint) {
    reasons.push("boundary_or_reason_missing");
    openQuestions.push("这个判断在哪些条件下不成立，或需要什么边界？");
  }

  return {
    status: reasons.length ? "warning" : "pass",
    suggestedThesis,
    suggestedThreeLineSummary,
    openQuestions,
    reasons
  };
}

function buildPrincipleChecks(note = {}, options = {}) {
  const text = textForAnalysis(note);
  const hasThesis = Boolean(note.thesis);
  const hasThreeLineSummary = note.threeLineSummary.length === 3;
  const hasBoundary = Boolean(note.boundaryOrCounterpoint);
  const hasCitation = note.citations.length > 0 || options.requireCitation === false;
  const looksLikeJudgment = hasJudgmentSignal(text) || hasThesis;
  const looksLikeMaterial = hasMaterialSignal(text) && !looksLikeJudgment;
  const reusable = hasThesis || hasThreeLineSummary || hasJudgmentSignal(text);
  const authorshipConfirmed = options.authorshipConfirmed === true || note.authorship?.user_confirmed === true;
  const aiAssisted = options.aiAssisted === true || note.authorship?.ai_assisted === true;

  return [
    makeCheck(
      "judgment_not_material",
      looksLikeJudgment && !looksLikeMaterial ? "pass" : "warning",
      looksLikeJudgment
        ? "笔记已经呈现为可讨论的判断。"
        : "笔记更像材料或主题记录，还需要压成用户自己的判断。",
      "补一句话论点"
    ),
    makeCheck(
      "has_thesis",
      hasThesis ? "pass" : "warning",
      hasThesis ? "已有一句话论点。" : "缺少一句话论点。",
      "填写 thesis"
    ),
    makeCheck(
      "has_three_line_summary",
      hasThreeLineSummary ? "pass" : "warning",
      hasThreeLineSummary ? "已有三句话压缩。" : "三句话压缩还不完整。",
      "补全 threeLineSummary"
    ),
    makeCheck(
      "has_reason_or_boundary",
      hasBoundary ? "pass" : "warning",
      hasBoundary ? "已有理由、边界或反方。" : "还缺少理由、边界或不适用条件。",
      "补一个理由或边界"
    ),
    makeCheck(
      "reusable_for_writing",
      reusable ? "pass" : "warning",
      reusable ? "笔记已经有复用于主题或写作的信号。" : "笔记还不够可复用，未来写作难以直接调用。",
      "写清它服务的问题"
    ),
    makeCheck(
      "traceable_sources",
      hasCitation ? "pass" : "warning",
      hasCitation ? "已有来源追溯线索。" : "缺少来源追溯线索。",
      "补充来源或引用位置"
    ),
    makeCheck(
      "authorship_boundary",
      !aiAssisted || authorshipConfirmed ? "pass" : "warning",
      !aiAssisted || authorshipConfirmed
        ? "没有发现 AI 越权确认风险。"
        : "AI 参与过内容生成，但还缺少用户确认。",
      "确认这是我的判断"
    )
  ].filter((item) => PRINCIPLE_CHECKS.includes(item.checkId));
}

function buildOriginality(note = {}, literature = [], options = {}) {
  if (!literature.length) {
    return {
      status: note.citations.length ? "pass" : "warning",
      reasons: note.citations.length ? [] : ["source_trace_missing"],
      similarity: 0,
      evaluations: [],
      sourceRefs: [],
      recommendedAction: note.citations.length ? "none" : "add_source_trace"
    };
  }

  const sourceId = cleanText(note.citations?.[0]?.source_id || note.citations?.[0]?.sourceId || literature[0]?.source_id || "unknown");
  const locator = cleanText(note.citations?.[0]?.locator || note.citations?.[0]?.location);
  const guard = originalityGuard(
    {
      literature,
      permanent: [
        {
          id: note.noteId,
          core_claim: note.thesis || firstCandidateLine(note.body),
          citations: [{ source_id: sourceId, locator }]
        }
      ]
    },
    options.originalityPlan || {}
  );
  const evaluation = guard.evaluations[0] || { status: "pass", reasons: [], similarity: 0 };
  return {
    status: evaluation.status,
    reasons: [...(evaluation.reasons || [])],
    similarity: evaluation.similarity || 0,
    evaluations: guard.evaluations,
    sourceRefs: literature.map((item) => ({ sourceId: item.source_id, literatureId: item.id, locator: item.locator || "" })),
    recommendedAction:
      evaluation.status === "blocked"
        ? "rewrite_as_original_judgment"
        : evaluation.status === "warning"
          ? "review_originality_and_source_trace"
          : "none"
  };
}

function relationTypeFor(currentText, otherText, score) {
  const combined = `${currentText}\n${otherText}`;
  if (/contradict|tension|conflict|however|but|反驳|矛盾|张力|但是|然而/iu.test(combined)) {
    return "contrasts";
  }
  if (score >= 0.5) return "same_topic";
  return "related";
}

function cjkBigrams(text = "") {
  const chars = [...String(text || "").matchAll(/\p{Script=Han}/gu)].map((match) => match[0]);
  const grams = [];
  for (let index = 0; index < chars.length - 1; index += 1) {
    grams.push(`${chars[index]}${chars[index + 1]}`);
  }
  return grams;
}

function jaccardScore(aItems = [], bItems = []) {
  const a = new Set(aItems);
  const b = new Set(bItems);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function localRelationScore(currentText = "", otherText = "") {
  const lexical = similarityScore(currentText, otherText);
  const cjk = jaccardScore(cjkBigrams(currentText), cjkBigrams(otherText));
  const bothMentionRelations = /关系|关联|连接|图谱|link|relation/iu.test(currentText) && /关系|关联|连接|图谱|link|relation/iu.test(otherText);
  return Number(Math.max(lexical, cjk, bothMentionRelations ? 0.18 : 0).toFixed(4));
}

function buildRelationCandidates(note = {}, relatedNotes = [], options = {}) {
  const limit = Math.max(1, Math.min(Number(options.relationLimit || 5) || 5, 20));
  const currentText = textForAnalysis(note);
  if (!currentText) return [];

  return relatedNotes
    .filter((item) => item.noteId && item.noteId !== note.noteId)
    .map((item) => {
      const otherText = textForAnalysis(item);
      const similarity = localRelationScore(currentText, otherText);
      return {
        fromNoteId: note.noteId,
        toNoteId: item.noteId,
        relationType: relationTypeFor(currentText, otherText, similarity),
        rationale: similarity >= 0.2
          ? "本地初判发现两条笔记存在词汇或判断重叠，建议人工确认关系。"
          : "本地初判发现弱相关信号，适合稍后人工复核。",
        evidence: [
          { noteId: note.noteId, summary: firstSentence(note.thesis || note.body || note.title, 80) },
          { noteId: item.noteId, summary: firstSentence(item.thesis || item.body || item.title, 80) }
        ],
        confidence: similarity,
        status: "suggested",
        suggestedAction: "review_relation"
      };
    })
    .filter((item) => item.confidence >= (Number(options.minRelationConfidence) || 0.12))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

function buildTopicCandidates(note = {}, relatedNotes = []) {
  const tags = [...new Set([...(note.tags || []), ...relatedNotes.flatMap((item) => item.tags || [])].map(cleanText).filter(Boolean))];
  return tags.slice(0, 5).map((tag) => ({
    title: tag,
    rationale: "本地初判根据标签或相关笔记聚合出主题候选。",
    noteIds: [note.noteId, ...relatedNotes.filter((item) => (item.tags || []).includes(tag)).map((item) => item.noteId)].filter(Boolean),
    status: "suggested"
  }));
}

function recommendedActionsFor({ distillation, originality, checks, relationCandidates }) {
  const actions = [];
  if (distillation.reasons.includes("thesis_missing")) {
    actions.push(action("write_thesis", "补一句话论点", "thesis", "high"));
  }
  if (distillation.reasons.includes("three_line_summary_incomplete")) {
    actions.push(action("write_three_line_summary", "补三句话压缩", "threeLineSummary", "high"));
  }
  if (distillation.reasons.includes("boundary_or_reason_missing")) {
    actions.push(action("write_boundary", "补理由或边界", "boundaryOrCounterpoint", "medium"));
  }
  if (originality.status !== "pass") {
    actions.push(action("review_originality", "复核原创度和来源", "originality", originality.status === "blocked" ? "high" : "medium"));
  }
  if (checks.some((item) => item.checkId === "traceable_sources" && item.status !== "pass")) {
    actions.push(action("add_source_trace", "补来源追溯", "citations", "medium"));
  }
  if (relationCandidates.length) {
    actions.push(action("review_relation_candidates", "查看可能关联", "relations", "low"));
  }
  return actions;
}

export function normalizePermanentNoteAnalysisInput(input = {}) {
  const note = normalizeNoteRef(input.note || input);
  if (!note.noteId) {
    const error = new Error("noteId is required for permanent note analysis");
    error.code = "NOTE_ANALYSIS_NOTE_ID_REQUIRED";
    throw error;
  }

  return {
    note,
    relatedNotes: (Array.isArray(input.relatedNotes || input.related_notes) ? input.relatedNotes || input.related_notes : []).map(normalizeNoteRef),
    literatureNotes: (Array.isArray(input.literatureNotes || input.literature_notes) ? input.literatureNotes || input.literature_notes : []).map(normalizeLiteratureRef),
    options: input.options || {}
  };
}

export function analyzePermanentNoteLocally(input = {}) {
  const { note, relatedNotes, literatureNotes, options } = normalizePermanentNoteAnalysisInput(input);
  const distillation = distillationStatusFor(note);
  const originality = buildOriginality(note, literatureNotes, options);
  const principleChecks = buildPrincipleChecks(note, options);
  const relationCandidates = buildRelationCandidates(note, relatedNotes, options);
  const topicCandidates = buildTopicCandidates(note, relatedNotes);
  const analysisStatus = worstStatus([
    distillation,
    originality,
    ...principleChecks
  ]);
  const recommendedActions = recommendedActionsFor({
    distillation,
    originality,
    checks: principleChecks,
    relationCandidates
  });

  return {
    noteId: note.noteId,
    title: note.title,
    analysisMode: "local_rule",
    analysisStatus,
    distillation,
    originality,
    principleChecks,
    relationCandidates,
    topicCandidates,
    recommendedActions,
    provenance: {
      contentOrigin: "system_rule",
      modelUsed: false,
      cloudModelUsed: false,
      canAutoConfirm: false
    }
  };
}

function artifactSources(noteIds = [], context = {}) {
  return {
    noteIds: [...new Set(noteIds.map(cleanText).filter(Boolean))],
    sourceDocIds: Array.isArray(context.sourceDocIds || context.source_doc_ids) ? [...(context.sourceDocIds || context.source_doc_ids)] : [],
    artifactIds: Array.isArray(context.artifactIds || context.artifact_ids) ? [...(context.artifactIds || context.artifact_ids)] : [],
    externalUrls: Array.isArray(context.externalUrls || context.external_urls) ? [...(context.externalUrls || context.external_urls)] : []
  };
}

function artifactContext(context = {}) {
  return {
    agentRunId: cleanText(context.agentRunId || context.agent_run_id) || "run_local_note_analysis",
    contextPackId: cleanText(context.contextPackId || context.context_pack_id),
    model: context.model || {
      provider: "local_rule",
      model: "local_rule",
      tier: "local_rule",
      mode: "Local / Private"
    },
    privacy: context.privacy || {
      mode: cleanText(context.privacyMode || context.privacy_mode) || "local_only",
      cloudModelUsed: false
    },
    now: context.now
  };
}

function modelForSuggestion(context = {}) {
  return context.model || {
    provider: "local_rule",
    model: "local_rule",
    tier: "local_rule",
    mode: "Local / Private"
  };
}

function artifactOrigin(context = {}) {
  return cleanText(context.origin || context.contentOrigin || context.content_origin) || "system_rule";
}

function graphCandidateArtifactId(prefix = "artifact_link_suggestion", candidate = {}, context = {}) {
  const candidateId = cleanText(candidate.id || candidate.candidateId || candidate.candidate_id);
  if (candidateId) return stableId(prefix, [context.artifactIdSalt, candidateId]);
  return stableId(prefix, [context.artifactIdSalt, candidate.fromNoteId, candidate.toNoteId, candidate.relationType]);
}

function graphCandidateArtifactSummary(candidate = {}) {
  return cleanText(candidate.aiRationale || candidate.ai_rationale || candidate.rationale);
}

function graphCandidateArtifactBody(candidate = {}, fallback = "") {
  const aiRationale = cleanText(candidate.aiRationale || candidate.ai_rationale);
  if (aiRationale) return `AI 已补充复核理由：${aiRationale}`;
  return fallback;
}

function relationArtifact(candidate = {}, context = {}) {
  const sources = artifactSources([candidate.fromNoteId, candidate.toNoteId], context);
  const sourceTitle = cleanText(candidate.sourceTitle || candidate.fromTitle || candidate.source_title);
  const targetTitle = cleanText(candidate.targetTitle || candidate.toTitle || candidate.target_title);
  const readableTitle = sourceTitle && targetTitle
    ? `《${sourceTitle}》可能可以关联到《${targetTitle}》`
    : sourceTitle
      ? `《${sourceTitle}》有一条待确认关系`
      : "有一条永久笔记关系待确认";
  return normalizeArtifact(
    {
      id: graphCandidateArtifactId("artifact_link_suggestion", candidate, context),
      type: "LinkSuggestion",
      title: readableTitle,
      summary: graphCandidateArtifactSummary(candidate),
      body: graphCandidateArtifactBody(candidate, "本地初判发现一条可能关系。请人工复核后再确认是否写入图谱。"),
      status: "pending_review",
      origin: artifactOrigin(context),
      sources,
      confidence: {
        score: candidate.confidence,
        label: candidate.confidence >= 0.5 ? "high" : candidate.confidence >= 0.2 ? "medium" : "low",
        reason: "local relation score"
      },
      payload: {
        from: { id: candidate.fromNoteId, kind: "note", title: sourceTitle },
        to: { id: candidate.toNoteId, kind: "note", title: targetTitle },
        sourceTitle,
        source_title: sourceTitle,
        targetTitle,
        target_title: targetTitle,
        relationType: candidate.relationType,
        relation_type: candidate.relationType,
        rationale: candidate.rationale,
        evidence: candidate.evidence,
        coarseScore: candidate.coarseScore,
        coarse_score: candidate.coarseScore,
        coarseReasons: candidate.coarseReasons,
        coarse_reasons: candidate.coarseReasons,
        coarseType: candidate.coarseType,
        coarse_type: candidate.coarseType,
        aiDecision: candidate.aiDecision,
        ai_decision: candidate.aiDecision,
        aiRelationType: candidate.aiRelationType,
        ai_relation_type: candidate.aiRelationType,
        aiConfidence: candidate.aiConfidence,
        ai_confidence: candidate.aiConfidence,
        aiRationale: candidate.aiRationale,
        ai_rationale: candidate.aiRationale,
        reviewQuestion: candidate.reviewQuestion,
        review_question: candidate.reviewQuestion,
        candidateId: candidate.id,
        candidate_id: candidate.id,
        sourceContentHash: candidate.sourceContentHash,
        source_content_hash: candidate.sourceContentHash,
        targetContentHash: candidate.targetContentHash,
        target_content_hash: candidate.targetContentHash,
        algorithmVersion: candidate.algorithmVersion,
        algorithm_version: candidate.algorithmVersion,
        suggestedAction: candidate.suggestedAction,
        suggested_action: candidate.suggestedAction
      }
    },
    artifactContext(context)
  );
}

function originalityArtifact(analysis = {}, context = {}) {
  const originality = analysis.originality || {};
  if (originality.status === "pass") return null;
  return normalizeArtifact(
    {
      id: stableId("artifact_originality_gap", [context.artifactIdSalt, analysis.noteId, originality.status]),
      type: "SourceGap",
      title: originality.status === "blocked" ? "原创度风险需要重写" : "原创度需要人工复核",
      summary: originality.reasons?.join(", ") || "本地初判发现原创度或来源追溯风险。",
      body: "这条永久笔记可能过于接近来源材料，或缺少可追溯来源。请复核后再确认判断。",
      status: "pending_review",
      origin: artifactOrigin(context),
      sources: artifactSources([analysis.noteId], context),
      confidence: {
        score: originality.similarity || null,
        label: originality.status === "blocked" ? "high" : "medium",
        reason: "originality guard"
      },
      payload: {
        gap: "originality_or_source_trace",
        claim: analysis.distillation?.suggestedThesis || "",
        requiredSourceType: "citation",
        required_source_type: "citation",
        relatedNoteIds: [analysis.noteId],
        related_note_ids: [analysis.noteId],
        suggestedAction: originality.recommendedAction || "review_originality_and_source_trace",
        suggested_action: originality.recommendedAction || "review_originality_and_source_trace",
        originality
      }
    },
    artifactContext(context)
  );
}

function principleArtifact(analysis = {}, check = {}, context = {}) {
  const type = check.checkId === "traceable_sources" ? "SourceGap" : "InsightCard";
  const sourceGapPayload = {
    gap: check.checkId,
    claim: analysis.distillation?.suggestedThesis || "",
    requiredSourceType: "user_note",
    required_source_type: "user_note",
    relatedNoteIds: [analysis.noteId],
    related_note_ids: [analysis.noteId],
    suggestedAction: check.recommendedAction || "review",
    suggested_action: check.recommendedAction || "review"
  };
  const insightPayload = {
    claim: check.message,
    whyItMatters: "这会影响永久笔记是否能成为用户可承担、可复用的判断。",
    why_it_matters: "这会影响永久笔记是否能成为用户可承担、可复用的判断。",
    sourceNoteIds: [analysis.noteId],
    source_note_ids: [analysis.noteId],
    confidenceReason: "local principle check",
    confidence_reason: "local principle check",
    suggestedAction: check.recommendedAction || "review",
    suggested_action: check.recommendedAction || "review",
    checkId: check.checkId
  };
  return normalizeArtifact(
    {
      id: stableId("artifact_principle_check", [context.artifactIdSalt, analysis.noteId, check.checkId]),
      type,
      title: `原则检查：${check.checkId}`,
      summary: check.message,
      body: check.recommendedAction ? `建议动作：${check.recommendedAction}` : check.message,
      status: "pending_review",
      origin: artifactOrigin(context),
      sources: artifactSources([analysis.noteId], context),
      confidence: {
        score: null,
        label: "medium",
        reason: "local principle check"
      },
      payload: type === "SourceGap" ? sourceGapPayload : insightPayload
    },
    artifactContext(context)
  );
}

function topicArtifact(analysis = {}, topic = {}, context = {}) {
  return normalizeArtifact(
    {
      id: stableId("artifact_topic_candidate", [context.artifactIdSalt, analysis.noteId, topic.title]),
      type: "InsightCard",
      title: `主题候选：${topic.title}`,
      summary: topic.rationale,
      body: "本地初判发现一个可能主题。请人工确认后再创建或补全索引卡。",
      status: "pending_review",
      origin: artifactOrigin(context),
      sources: artifactSources(topic.noteIds || [analysis.noteId], context),
      confidence: {
        score: null,
        label: "low",
        reason: "tag/topic local heuristic"
      },
      payload: {
        claim: topic.title,
        whyItMatters: topic.rationale,
        why_it_matters: topic.rationale,
        sourceNoteIds: topic.noteIds || [analysis.noteId],
        source_note_ids: topic.noteIds || [analysis.noteId],
        confidenceReason: "local topic candidate",
        confidence_reason: "local topic candidate",
        suggestedAction: "review_topic_candidate",
        suggested_action: "review_topic_candidate",
        topicCandidate: topic
      }
    },
    artifactContext(context)
  );
}

function distillationSuggestions(analysis = {}, context = {}) {
  const suggestions = [];
  const distillation = analysis.distillation || {};
  const model = modelForSuggestion(context);
  const now = context.now;
  const origin = artifactOrigin(context);
  const targetTitle = cleanText(analysis.title);
  const shouldSuggestThesis =
    distillation.reasons?.includes("thesis_missing") ||
    distillation.reasons?.includes("local_model_thesis_suggestion") ||
    distillation.reasons?.includes("model_thesis_suggestion");
  const shouldSuggestThreeLine =
    distillation.reasons?.includes("three_line_summary_incomplete") ||
    distillation.reasons?.includes("local_model_three_line_summary_suggestion") ||
    distillation.reasons?.includes("model_three_line_summary_suggestion");
  if (shouldSuggestThesis && cleanText(distillation.suggestedThesis)) {
    suggestions.push(
      normalizeSuggestion(
        {
          id: stableId("suggestion_note_analysis", [analysis.noteId, "thesis"]),
          target: { type: "permanent_note", id: analysis.noteId, field: "thesis", ...(targetTitle ? { title: targetTitle } : {}) },
          scope: "permanent_note_distillation",
          content: {
            thesis: distillation.suggestedThesis
          },
          status: "suggested",
          origin,
          model,
          provenance: {
            contentOrigin: origin,
            humanConfirmed: false,
            humanEdited: false
          }
        },
        { now, model }
      )
    );
  }
  if (shouldSuggestThreeLine && distillation.suggestedThreeLineSummary?.length) {
    suggestions.push(
      normalizeSuggestion(
        {
          id: stableId("suggestion_note_analysis", [analysis.noteId, "three_line_summary"]),
          target: { type: "permanent_note", id: analysis.noteId, field: "three_line_summary", ...(targetTitle ? { title: targetTitle } : {}) },
          scope: "permanent_note_distillation",
          content: {
            threeLineSummary: distillation.suggestedThreeLineSummary
          },
          status: "suggested",
          origin,
          model,
          provenance: {
            contentOrigin: origin,
            humanConfirmed: false,
            humanEdited: false
          }
        },
        { now, model }
      )
    );
  }
  return suggestions;
}

function distillationSuggestionArtifact(analysis = {}, suggestion = {}, context = {}) {
  const field = cleanText(suggestion?.target?.field);
  if (!field) return null;
  const content = suggestion.content && typeof suggestion.content === "object" ? suggestion.content : {};
  const value =
    field === "three_line_summary" && Array.isArray(content.threeLineSummary)
      ? content.threeLineSummary.join(" / ")
      : cleanText(content.thesis || content[field] || suggestion.content);
  if (!value) return null;

  const title = field === "thesis" ? "字段建议：补充 thesis" : "字段建议：补充三句话压缩";
  const summary =
    field === "thesis"
      ? "本地初判生成了一条 thesis 候选。请人工改写、采纳为草稿或拒绝。"
      : "本地初判生成了三句话压缩候选。请人工改写、采纳为草稿或拒绝。";
  return normalizeArtifact(
    {
      id: stableId("artifact_field_suggestion", [context.artifactIdSalt, analysis.noteId, field]),
      type: "InsightCard",
      title,
      summary,
      body: value,
      status: "pending_review",
      origin: artifactOrigin(context),
      sources: artifactSources([analysis.noteId], context),
      confidence: {
        score: null,
        label: "low",
        reason: "local distillation heuristic"
      },
      payload: {
        claim: value,
        whyItMatters: "永久笔记需要先形成用户可承担、可复用的压缩判断，再进入主题和写作流程。",
        why_it_matters: "永久笔记需要先形成用户可承担、可复用的压缩判断，再进入主题和写作流程。",
        sourceNoteIds: [analysis.noteId],
        source_note_ids: [analysis.noteId],
        confidenceReason: "local distillation heuristic",
        confidence_reason: "local distillation heuristic",
        suggestedAction: "review_field_suggestion",
        suggested_action: "review_field_suggestion",
        fieldSuggestionId: suggestion.id,
        field_suggestion_id: suggestion.id,
        fieldSuggestion: suggestion,
        field_suggestion: suggestion,
        targetField: field,
        target_field: field
      }
    },
    artifactContext(context)
  );
}

export function buildPermanentNoteLocalModelRequest(input = {}, baseAnalysis = null, context = {}) {
  const normalized = normalizePermanentNoteAnalysisInput(input);
  const analysis = baseAnalysis || analyzePermanentNoteLocally(normalized);
  const relatedNotes = normalized.relatedNotes.slice(0, 12).map((note) => ({
    noteId: note.noteId,
    title: note.title,
    thesis: note.thesis,
    excerpt: firstSentence(note.body || note.title, 320),
    tags: note.tags
  }));
  const literatureNotes = normalized.literatureNotes.slice(0, 8).map((note) => ({
    noteId: cleanText(note.noteId || note.id || note.source_id),
    title: note.title || note.source_id || note.id,
    excerpt: firstSentence(note.body || note.quote_text || note.title, 320),
    source: note.source || note.source_id || null,
    locator: note.locator || ""
  }));
  const payload = {
    task: "permanent_note_analysis_local_model",
    privacyMode: "local_only",
    instructions: [
      "Only return JSON.",
      "Treat every output as a suggestion that needs human review.",
      "Do not claim a relation, topic, or field is confirmed.",
      "Return candidate viewpoints only; do not make the final conclusion for the user.",
      "Bind every suggestion to concrete note evidence anchors.",
      "Prefer concise Chinese output when the note is Chinese."
    ],
    requiredOutputShape: {
      candidateViewpoint: {
        coreViewpoint: "string",
        evidenceAnchors: ["string"],
        uncertainties: ["string"],
        counterQuestions: ["string"],
        permanentNoteDraft: "string"
      },
      distilledViewpoint: {
        thesis: "string",
        threeLineSummary: ["string", "string", "string"],
        confidenceReason: "string"
      },
      relationCandidates: [
        {
          toNoteId: "string",
          relationType: "supports|contrasts|extends|qualifies|questions|bridges|associated_with",
          rationale: "string",
          confidence: "number 0..1"
        }
      ],
      topicCandidates: [
        {
          title: "string",
          rationale: "string"
        }
      ],
      principleWarnings: [
        {
          checkId: "string",
          message: "string",
          recommendedAction: "string"
        }
      ]
    },
    note: {
      noteId: normalized.note.noteId,
      title: normalized.note.title,
      thesis: normalized.note.thesis,
      threeLineSummary: normalized.note.threeLineSummary,
      boundaryOrCounterpoint: normalized.note.boundaryOrCounterpoint,
      tags: normalized.note.tags,
      body: firstSentence(normalized.note.body || normalized.note.title, 1200)
    },
    relatedNotes,
    literatureNotes,
    localRuleBaseline: {
      distillation: analysis.distillation,
      originality: analysis.originality,
      principleChecks: analysis.principleChecks,
      relationCandidates: analysis.relationCandidates,
      topicCandidates: analysis.topicCandidates,
      recommendedActions: analysis.recommendedActions
    }
  };

  return {
    requestType: "permanent_note_local_model_analysis",
    privacy: {
      mode: "local_only",
      cloudModelUsed: false
    },
    model: context.model || {
      provider: "local_model",
      model: cleanText(context.localModel || context.local_model) || DEFAULT_LOCAL_AI_MODEL,
      tier: "local_private",
      mode: "Local / Private"
    },
    messages: [
      {
        role: "system",
        content: "You help review permanent notes locally. You never confirm or mutate user notes. Return compact JSON only."
      },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2)
      }
    ],
    responseContract: payload.requiredOutputShape,
    canAutoConfirm: false,
    executionDefaults: {
      timeoutMs: DEFAULT_VIEWPOINT_DISTILLATION_TIMEOUT_MS,
      numPredict: DEFAULT_VIEWPOINT_DISTILLATION_NUM_PREDICT
    },
    fallbackAnalysis: analysis
  };
}

function extractJsonObject(value) {
  if (value && typeof value === "object") return value;
  const text = cleanText(value);
  if (!text) return {};
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/iu);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("local model response must be JSON");
  }
}

function boundedConfidence(value, fallback = 0.35) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, Number(number.toFixed(4))));
}

function normalizeRelationType(value) {
  const relationType = cleanText(value);
  if (["supports", "contrasts", "extends", "qualifies", "questions", "bridges", "associated_with"].includes(relationType)) {
    return relationType;
  }
  if (["same_topic", "related"].includes(relationType)) return "associated_with";
  return "associated_with";
}

function normalizePermanentNoteModelOutput(response = {}, request = {}, context = {}) {
  const fallbackAnalysis = request?.fallbackAnalysis || {};
  let parsed = {};
  let parseError = null;
  try {
    parsed = extractJsonObject(response?.content ?? response?.text ?? response?.output ?? response);
  } catch (error) {
    parseError = error;
    parsed = {};
  }
  const noteId = cleanText(context.noteId || fallbackAnalysis.noteId || parsed.noteId || parsed.note_id);
  if (!noteId) {
    const error = new Error("noteId is required to normalize local model note analysis");
    error.code = "NOTE_ANALYSIS_MODEL_NOTE_ID_REQUIRED";
    throw error;
  }

  const viewpoint = parsed.distilledViewpoint || parsed.distilled_viewpoint || {};
  const candidateViewpoint = parsed.candidateViewpoint || parsed.candidate_viewpoint || {};
  const thesis = cleanText(viewpoint.thesis || candidateViewpoint.coreViewpoint || candidateViewpoint.core_viewpoint || parsed.thesis);
  const evidenceAnchors = stringItems(candidateViewpoint.evidenceAnchors || candidateViewpoint.evidence_anchors || parsed.evidenceAnchors || parsed.evidence_anchors).slice(0, 8);
  const uncertainties = stringItems(candidateViewpoint.uncertainties || parsed.uncertainties).slice(0, 6);
  const counterQuestions = stringItems(candidateViewpoint.counterQuestions || candidateViewpoint.counter_questions || parsed.counterQuestions || parsed.counter_questions).slice(0, 6);
  const permanentNoteDraft = cleanText(candidateViewpoint.permanentNoteDraft || candidateViewpoint.permanent_note_draft || parsed.permanentNoteDraft || parsed.permanent_note_draft);
  const threeLineSummary = stringItems(viewpoint.threeLineSummary || viewpoint.three_line_summary || parsed.threeLineSummary || parsed.three_line_summary).slice(0, 3);
  const relationCandidates = (Array.isArray(parsed.relationCandidates || parsed.relation_candidates)
    ? parsed.relationCandidates || parsed.relation_candidates
    : [])
    .map((candidate) => {
      const toNoteId = cleanText(candidate.toNoteId || candidate.to_note_id || candidate.noteId || candidate.note_id);
      if (!toNoteId || toNoteId === noteId) return null;
      return {
        fromNoteId: noteId,
        toNoteId,
        relationType: normalizeRelationType(candidate.relationType || candidate.relation_type),
        rationale: cleanText(candidate.rationale || candidate.reason || candidate.summary) || "local model relation candidate",
        evidence: Array.isArray(candidate.evidence) ? candidate.evidence : [],
        confidence: boundedConfidence(candidate.confidence),
        status: "suggested",
        suggestedAction: "review_relation",
        origin: "local_model"
      };
    })
    .filter(Boolean);

  const topicCandidates = (Array.isArray(parsed.topicCandidates || parsed.topic_candidates)
    ? parsed.topicCandidates || parsed.topic_candidates
    : [])
    .map((topic) => {
      const title = cleanText(topic.title || topic.name || topic.topic);
      if (!title) return null;
      return {
        title,
        rationale: cleanText(topic.rationale || topic.reason || topic.summary) || "local model topic candidate",
        noteIds: [noteId, ...stringItems(topic.noteIds || topic.note_ids)],
        status: "suggested",
        origin: "local_model"
      };
    })
    .filter(Boolean);

  const principleWarnings = (Array.isArray(parsed.principleWarnings || parsed.principle_warnings)
    ? parsed.principleWarnings || parsed.principle_warnings
    : [])
    .map((warning) => {
      const checkId = cleanText(warning.checkId || warning.check_id || warning.id) || "local_model_warning";
      return {
        checkId,
        status: "warning",
        message: cleanText(warning.message || warning.summary || warning.rationale) || checkId,
        recommendedAction: cleanText(warning.recommendedAction || warning.recommended_action || warning.action) || "review"
      };
    });

  return {
    noteId,
    distilledViewpoint: {
      thesis,
      threeLineSummary,
      confidenceReason: cleanText(viewpoint.confidenceReason || viewpoint.confidence_reason || parsed.confidenceReason)
    },
    candidateViewpoint: {
      coreViewpoint: thesis,
      evidenceAnchors,
      uncertainties,
      counterQuestions,
      permanentNoteDraft
    },
    relationCandidates,
    topicCandidates,
    principleWarnings,
    parseError: parseError
      ? {
          code: "LOCAL_MODEL_JSON_PARSE_FAILED",
          message: cleanText(parseError.message || parseError)
        }
      : null,
    raw: parsed
  };
}

function mergeBy(items = [], keyFor) {
  const seen = new Set();
  const merged = [];
  for (const item of items) {
    const key = keyFor(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

export function mergePermanentNoteLocalModelResponse(request = {}, response = {}, context = {}) {
  const fallbackAnalysis = request?.fallbackAnalysis || null;
  const modelOutput = normalizePermanentNoteModelOutput(response, request, context);
  const base = fallbackAnalysis || analyzePermanentNoteLocally({ noteId: modelOutput.noteId, title: "" });
  const reasons = [...(base.distillation?.reasons || [])];
  if (modelOutput.distilledViewpoint.thesis) reasons.push("local_model_thesis_suggestion");
  if (modelOutput.distilledViewpoint.threeLineSummary.length) reasons.push("local_model_three_line_summary_suggestion");

  const modelWarningsById = new Map(modelOutput.principleWarnings.map((item) => [item.checkId, item]));
  const principleChecks = [
    ...(base.principleChecks || []).map((check) => modelWarningsById.get(check.checkId) || check),
    ...modelOutput.principleWarnings.filter((check) => !(base.principleChecks || []).some((baseCheck) => baseCheck.checkId === check.checkId))
  ];
  const relationCandidates = mergeBy(
    [...modelOutput.relationCandidates, ...(base.relationCandidates || [])],
    (item) => `${item.toNoteId}:${item.relationType}`
  );
  const topicCandidates = mergeBy(
    [...modelOutput.topicCandidates, ...(base.topicCandidates || [])],
    (item) => cleanText(item.title).toLowerCase()
  );
  const distillation = {
    ...(base.distillation || {}),
    status: reasons.length ? "warning" : base.distillation?.status || "pass",
    suggestedThesis: modelOutput.distilledViewpoint.thesis || base.distillation?.suggestedThesis || "",
    suggestedThreeLineSummary: modelOutput.distilledViewpoint.threeLineSummary.length
      ? modelOutput.distilledViewpoint.threeLineSummary
      : base.distillation?.suggestedThreeLineSummary || [],
    reasons: [...new Set(reasons)],
    confidenceReason: modelOutput.distilledViewpoint.confidenceReason
  };
  const modelWarnings = modelOutput.parseError
    ? [
        {
          checkId: "local_model_json_parse_failed",
          status: "warning",
          message: "Local model output was not valid JSON; kept the rule-based review candidates instead.",
          recommendedAction: "retry_local_model_or_review_rule_candidates"
        }
      ]
    : [];
  const analysis = {
    ...base,
    noteId: modelOutput.noteId,
    analysisMode: "local_model_assisted",
    analysisStatus: worstStatus([distillation, base.originality || {}, ...principleChecks, ...modelWarnings]),
    distillation,
    principleChecks: [...principleChecks, ...modelWarnings],
    relationCandidates,
    topicCandidates,
    provenance: {
      contentOrigin: "local_model",
      modelUsed: true,
      cloudModelUsed: false,
      canAutoConfirm: false,
      fallbackContentOrigin: base.provenance?.contentOrigin || "system_rule"
    },
    candidateViewpoint: modelOutput.candidateViewpoint,
    modelParseError: modelOutput.parseError
  };
  const modelContext = {
    ...context,
    origin: "local_model",
    model: request.model || context.model || modelForSuggestion(context),
    privacy: {
      mode: "local_only",
      cloudModelUsed: false
    }
  };

  return {
    analysis,
    modelOutput,
    reviewItems: buildPermanentNoteAnalysisReviewItems(analysis, modelContext)
  };
}

function normalizeGraphRelation(input = {}) {
  return {
    fromNoteId: cleanText(input.fromNoteId || input.from_note_id || input.from || input.sourceNoteId || input.source_note_id),
    toNoteId: cleanText(input.toNoteId || input.to_note_id || input.to || input.targetNoteId || input.target_note_id),
    relationType: cleanText(input.relationType || input.relation_type || input.type) || "related",
    status: cleanText(input.status) || "confirmed"
  };
}

function connectedComponents(noteIds = [], relations = []) {
  const adjacency = new Map(noteIds.map((id) => [id, new Set()]));
  for (const relation of relations) {
    if (!adjacency.has(relation.fromNoteId) || !adjacency.has(relation.toNoteId)) continue;
    adjacency.get(relation.fromNoteId).add(relation.toNoteId);
    adjacency.get(relation.toNoteId).add(relation.fromNoteId);
  }
  const componentByNoteId = new Map();
  const components = [];
  for (const noteId of noteIds) {
    if (componentByNoteId.has(noteId)) continue;
    const queue = [noteId];
    const component = [];
    componentByNoteId.set(noteId, components.length);
    while (queue.length) {
      const current = queue.shift();
      component.push(current);
      for (const next of adjacency.get(current) || []) {
        if (componentByNoteId.has(next)) continue;
        componentByNoteId.set(next, components.length);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return { components, componentByNoteId };
}

function graphTopicCandidates(notes = [], minTopicSize = 2) {
  const byTag = new Map();
  for (const note of notes) {
    const bodyTags = [...String(note.body || "").matchAll(/(^|[\s([{])#([\p{L}\p{N}_/-]+)/gu)].map((match) => match[2]);
    for (const tag of [...(note.tags || []), ...bodyTags]) {
      const key = cleanText(tag);
      if (!key) continue;
      if (!byTag.has(key)) byTag.set(key, []);
      byTag.get(key).push(note.noteId);
    }
  }
  return [...byTag.entries()]
    .filter(([, noteIds]) => noteIds.length >= minTopicSize)
    .map(([title, noteIds]) => ({
      title,
      rationale: "Several permanent notes share this tag; review whether it should become an explicit theme.",
      noteIds,
      status: "suggested"
    }));
}

export function analyzePermanentNoteGraphLocally(input = {}) {
  const notes = (Array.isArray(input.notes) ? input.notes : [])
    .map(normalizeNoteRef)
    .filter((note) => note.noteId);
  const noteIds = notes.map((note) => note.noteId);
  const noteIdSet = new Set(noteIds);
  const relations = (Array.isArray(input.relations) ? input.relations : [])
    .map(normalizeGraphRelation)
    .filter((relation) => noteIdSet.has(relation.fromNoteId) && noteIdSet.has(relation.toNoteId));
  const confirmedRelations = relations.filter((relation) => isPotentialRelationNetworkStatus(relation.status));
  const { components, componentByNoteId } = connectedComponents(noteIds, confirmedRelations);
  const degree = new Map(noteIds.map((id) => [id, 0]));
  for (const relation of confirmedRelations) {
    degree.set(relation.fromNoteId, (degree.get(relation.fromNoteId) || 0) + 1);
    degree.set(relation.toNoteId, (degree.get(relation.toNoteId) || 0) + 1);
  }

  const options = input.options || {};
  const relationLimit = Math.max(1, Math.min(Number(options.relationLimit ?? options.relation_limit) || 80, 100));
  const potentialScan = buildPotentialRelationCandidates({
    notes,
    relations,
    options: {
      minScore: options.minScore ?? options.min_score ?? options.minRelationScore ?? options.min_relation_score,
      perNoteLimit: options.perNoteLimit ?? options.per_note_limit ?? 5,
      globalLimit: relationLimit,
      focusNoteId: options.focusNoteId ?? options.focus_note_id,
      currentNoteId: options.currentNoteId ?? options.current_note_id,
      recentNoteIds: options.recentNoteIds ?? options.recent_note_ids
    }
  });
  const limitedRelationCandidates = potentialScan.candidates.map((candidate) => ({
    ...candidate,
    potentialStatus: candidate.status,
    status: "suggested",
    componentBridge:
      candidate.componentBridge ||
      componentByNoteId.get(candidate.fromNoteId) !== componentByNoteId.get(candidate.toNoteId),
    suggestedAction: "review_potential_relation"
  }));
  const bridgeCandidates = limitedRelationCandidates.filter((candidate) => candidate.componentBridge);
  const isolatedNotes = notes
    .filter((note) => (degree.get(note.noteId) || 0) === 0)
    .map((note) => ({
      noteId: note.noteId,
      title: note.title,
      thesis: note.thesis,
      suggestedAction: "review_missing_relations"
    }));
  const topicCandidates = graphTopicCandidates(notes, Number(options.minTopicSize ?? options.min_topic_size) || 2);

  return {
    analysisMode: "local_graph_rule",
    analysisStatus: topicCandidates.length || isolatedNotes.length || limitedRelationCandidates.length ? "warning" : "pass",
    noteCount: notes.length,
    relationCount: confirmedRelations.length,
    componentCount: components.length,
    topicCandidates,
    isolatedNotes,
    relationCandidates: limitedRelationCandidates,
    bridgeCandidates,
    potentialRelationMetrics: potentialScan.metrics,
    potentialRelationAlgorithmVersion: potentialScan.algorithmVersion,
    provenance: {
      contentOrigin: "system_rule",
      modelUsed: false,
      cloudModelUsed: false,
      canAutoConfirm: false
    }
  };
}

function graphBridgeArtifact(candidate = {}, context = {}) {
  const sourceTitle = cleanText(candidate.sourceTitle || candidate.fromTitle || candidate.source_title);
  const targetTitle = cleanText(candidate.targetTitle || candidate.toTitle || candidate.target_title);
  const readableTitle = sourceTitle && targetTitle
    ? `《${sourceTitle}》可能可以关联到《${targetTitle}》`
    : sourceTitle
      ? `《${sourceTitle}》缺少一条关键连接`
      : "有一条缺失连接待确认";
  return normalizeArtifact(
    {
      id: graphCandidateArtifactId("artifact_graph_bridge", candidate, context),
      type: "BridgeCard",
      title: readableTitle,
      summary: graphCandidateArtifactSummary(candidate),
      body: graphCandidateArtifactBody(candidate, "本地图谱扫描发现两条笔记之间可能缺少一条连接。请先判断理由是否成立，再决定是否建立正式关系。"),
      status: "pending_review",
      origin: artifactOrigin(context),
      sources: artifactSources([candidate.fromNoteId, candidate.toNoteId], context),
      confidence: {
        score: candidate.confidence,
        label: candidate.confidence >= 0.5 ? "high" : "medium",
        reason: "local graph bridge score"
      },
      payload: {
        from: { id: candidate.fromNoteId, kind: "note", title: sourceTitle },
        to: { id: candidate.toNoteId, kind: "note", title: targetTitle },
        sourceTitle,
        source_title: sourceTitle,
        targetTitle,
        target_title: targetTitle,
        relationType: candidate.relationType,
        relation_type: candidate.relationType,
        rationale: candidate.rationale,
        evidence: candidate.evidence,
        aiDecision: candidate.aiDecision,
        ai_decision: candidate.aiDecision,
        aiRelationType: candidate.aiRelationType,
        ai_relation_type: candidate.aiRelationType,
        aiConfidence: candidate.aiConfidence,
        ai_confidence: candidate.aiConfidence,
        aiRationale: candidate.aiRationale,
        ai_rationale: candidate.aiRationale,
        reviewQuestion: candidate.reviewQuestion,
        review_question: candidate.reviewQuestion,
        candidateId: candidate.id,
        candidate_id: candidate.id,
        sourceContentHash: candidate.sourceContentHash,
        source_content_hash: candidate.sourceContentHash,
        targetContentHash: candidate.targetContentHash,
        target_content_hash: candidate.targetContentHash,
        suggestedAction: "review_graph_bridge",
        suggested_action: "review_graph_bridge"
      }
    },
    artifactContext(context)
  );
}

function isolatedNoteArtifact(note = {}, context = {}) {
  const noteTitle = cleanText(note.title || note.thesis || note.noteId);
  return normalizeArtifact(
    {
      id: stableId("artifact_isolated_note", [context.artifactIdSalt, note.noteId]),
      type: "QuestionCard",
      title: noteTitle ? `《${noteTitle}》还没有进入关系网` : "有一条永久笔记还没有进入关系网",
      summary: noteTitle,
      body: "这条永久笔记在当前图谱里还没有正式关系。请判断它需要关联到哪条笔记，还是应该暂时保留为独立观察。",
      status: "pending_review",
      origin: artifactOrigin(context),
      sources: artifactSources([note.noteId], context),
      confidence: {
        score: null,
        label: "medium",
        reason: "local graph degree check"
      },
      payload: {
        noteId: note.noteId,
        note_id: note.noteId,
        noteTitle,
        note_title: noteTitle,
        suggestedAction: note.suggestedAction,
        suggested_action: note.suggestedAction
      }
    },
    artifactContext(context)
  );
}

export function buildPermanentNoteGraphReviewItems(graphAnalysis = {}, context = {}) {
  const bridgeCandidateIds = new Set(
    (Array.isArray(graphAnalysis.bridgeCandidates) ? graphAnalysis.bridgeCandidates : [])
      .map((candidate) => cleanText(candidate?.id || `${candidate?.fromNoteId || ""}:${candidate?.toNoteId || ""}:${candidate?.relationType || ""}`))
      .filter(Boolean)
  );
  const artifacts = [
    ...(graphAnalysis.topicCandidates || []).map((topic) => topicArtifact({ noteId: "graph_scan" }, topic, context)),
    ...(graphAnalysis.relationCandidates || [])
      .filter((candidate) => {
        const candidateId = cleanText(candidate?.id || `${candidate?.fromNoteId || ""}:${candidate?.toNoteId || ""}:${candidate?.relationType || ""}`);
        return !candidate?.componentBridge && !bridgeCandidateIds.has(candidateId);
      })
      .map((candidate) => relationArtifact(candidate, context)),
    ...(graphAnalysis.bridgeCandidates || []).map((candidate) => graphBridgeArtifact(candidate, context)),
    ...(graphAnalysis.isolatedNotes || []).map((note) => isolatedNoteArtifact(note, context))
  ].filter(Boolean);

  return {
    artifacts,
    summary: {
      artifactCount: artifacts.length,
      topicCandidateCount: (graphAnalysis.topicCandidates || []).length,
      relationCandidateCount: (graphAnalysis.relationCandidates || []).length,
      bridgeCandidateCount: (graphAnalysis.bridgeCandidates || []).length,
      isolatedNoteCount: (graphAnalysis.isolatedNotes || []).length,
      canAutoConfirm: false
    }
  };
}

export function buildPermanentNoteAnalysisReviewItems(analysis = {}, context = {}) {
  const noteId = cleanText(analysis.noteId);
  if (!noteId) {
    const error = new Error("analysis.noteId is required");
    error.code = "NOTE_ANALYSIS_RESULT_NOTE_ID_REQUIRED";
    throw error;
  }

  const suggestions = distillationSuggestions(analysis, context);
  const artifacts = [
    ...suggestions.map((suggestion) => distillationSuggestionArtifact(analysis, suggestion, context)),
    ...(analysis.relationCandidates || []).map((candidate) => relationArtifact(candidate, context)),
    originalityArtifact(analysis, context),
    ...(analysis.principleChecks || [])
      .filter((check) => check.status !== "pass")
      .map((check) => principleArtifact(analysis, check, context)),
    ...(analysis.topicCandidates || []).map((topic) => topicArtifact(analysis, topic, context))
  ].filter(Boolean);

  return {
    noteId,
    artifacts,
    suggestions,
    summary: {
      artifactCount: artifacts.length,
      suggestionCount: suggestions.length,
      relationCandidateCount: (analysis.relationCandidates || []).length,
      warningCount: artifacts.filter((artifact) => artifact.type !== "LinkSuggestion").length,
      canAutoConfirm: false
    }
  };
}

export function analyzePermanentNoteForReview(input = {}, context = {}) {
  const analysis = analyzePermanentNoteLocally(input);
  return {
    analysis,
    reviewItems: buildPermanentNoteAnalysisReviewItems(analysis, context)
  };
}

export function noteAnalysisPrincipleCheckIds() {
  return [...PRINCIPLE_CHECKS];
}

export function tokenizeNoteAnalysisText(input = {}) {
  return tokenizeText(textForAnalysis(normalizeNoteRef(input)));
}
