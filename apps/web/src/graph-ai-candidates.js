import {
  graphCandidateEndpointIds,
  graphExistingRelationKeys,
  graphExistingRelationPairKeys,
  graphRelationCandidateKey,
  graphRelationPairKey,
  graphRelationStatusCountsAsNetworkEdge,
  graphRelationStatusKey
} from "./graph-relation-state-query.js";

export const GRAPH_CONFIRMABLE_RELATION_TYPES = new Set(["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with"]);

export {
  graphCandidateEndpointIds,
  graphExistingRelationKeys,
  graphExistingRelationPairKeys,
  graphRelationCandidateKey,
  graphRelationPairKey,
  graphRelationStatusCountsAsNetworkEdge,
  graphRelationStatusKey
};

export function graphCandidateCountKey(candidate = {}) {
  const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
  const pairKey = graphRelationPairKey(sourceNoteId, targetNoteId);
  if (pairKey) return pairKey;
  const id = String(candidate.id || candidate.candidateId || candidate.candidate_id || "").trim();
  return id ? `candidate:${id}` : "";
}

export function graphPreferredPotentialRelationType(candidate = {}, confirmableRelationTypes = GRAPH_CONFIRMABLE_RELATION_TYPES) {
  const aiRelationType = String(candidate.aiRelationType || candidate.ai_relation_type || "").trim().toLowerCase();
  if (aiRelationType && confirmableRelationTypes.has(aiRelationType) && aiRelationType !== "no_relation") return aiRelationType;
  const fallback = String(candidate.relationType || candidate.relation_type || (candidate.componentBridge ? "bridges" : "associated_with")).trim().toLowerCase();
  return confirmableRelationTypes.has(fallback) ? fallback : "associated_with";
}

export function graphCandidateBlocksFormalRelation(candidate = {}) {
  const decision = String(candidate.aiDecision || candidate.ai_decision || "").trim().toLowerCase();
  const aiRelationType = String(candidate.aiRelationType || candidate.ai_relation_type || "").trim().toLowerCase();
  const relationType = String(candidate.relationType || candidate.relation_type || "").trim().toLowerCase();
  return decision === "reject" || aiRelationType === "no_relation" || relationType === "no_relation";
}

export function graphCandidateCanSaveRelation(candidate = {}, confirmableRelationTypes = GRAPH_CONFIRMABLE_RELATION_TYPES) {
  return !graphCandidateBlocksFormalRelation(candidate) && confirmableRelationTypes.has(graphPreferredPotentialRelationType(candidate, confirmableRelationTypes));
}

export function graphRelationRationaleIsActionable(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return false;
  const compact = text.replace(/\s+/g, "");
  if (/[_＿]{3,}/u.test(compact)) return false;
  if (/^因为[:：]?$/u.test(compact)) return false;
  if (text.includes("存在需要一起复核的论证或主题联系")) return false;
  if (text.includes("存在可说明的论证或主题联系")) return false;
  if (/请补|补充|待补|TODO|TBD/i.test(text)) return false;
  return true;
}

export function graphCandidatePercent(candidate = {}) {
  const confidence = Number(candidate.aiConfidence ?? candidate.confidence);
  if (Number.isFinite(confidence) && confidence > 0) {
    const normalized = confidence > 1 ? Math.round(confidence) : Math.round(confidence * 100);
    return Math.min(99, Math.max(1, normalized));
  }
  const coarseScore = Number(candidate.coarseScore ?? candidate.coarse_score);
  if (Number.isFinite(coarseScore) && coarseScore > 0) {
    const normalized = coarseScore <= 1
      ? Math.round(coarseScore * 100)
      : Math.round((1 - Math.exp(-coarseScore / 5)) * 100);
    return Math.min(99, Math.max(1, normalized));
  }
  return 45;
}

export function graphCandidateUndirectedPairKey(candidate = {}) {
  const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
  return graphRelationPairKey(sourceNoteId, targetNoteId);
}

export function graphMergeRelationCandidatesForDisplay(aiCandidates = [], localCandidates = [], { limit = 6, blockedPairKeys = new Set() } = {}) {
  const allAiCandidates = Array.isArray(aiCandidates) ? aiCandidates : [];
  const usableAiCandidates = allAiCandidates.filter((candidate) => graphCandidateCanSaveRelation(candidate));
  const blockedPairs = blockedPairKeys instanceof Set || Array.isArray(blockedPairKeys) ? Array.from(blockedPairKeys) : [];
  const seenPairs = new Set([
    ...blockedPairs,
    ...allAiCandidates
      .map(graphCandidateUndirectedPairKey)
      .filter(Boolean)
  ]);
  return [
    ...usableAiCandidates.map((candidate) => ({ ...candidate, candidateSource: "ai" })),
    ...(Array.isArray(localCandidates) ? localCandidates : [])
      .filter((candidate) => {
        const key = graphCandidateUndirectedPairKey(candidate);
        if (seenPairs.has(key)) return false;
        seenPairs.add(key);
        return true;
      })
      .map((candidate) => ({ ...candidate, candidateSource: "local" }))
  ].slice(0, Math.max(1, Number(limit) || 6));
}

export function graphPendingAiCandidateCount(candidates = [], { existingRelationPairKeys = new Set(), excludePairs = new Set(), bridgeOnly = false, excludeBridge = false } = {}) {
  const seenPairs = new Set();
  let count = 0;
  (Array.isArray(candidates) ? candidates : []).forEach((candidate) => {
    if (!candidate || !graphCandidateCanSaveRelation(candidate)) return;
    if (bridgeOnly && candidate.componentBridge !== true) return;
    if (excludeBridge && candidate.componentBridge === true) return;
    const pairKey = graphCandidateCountKey(candidate);
    if (!pairKey || existingRelationPairKeys.has(pairKey) || excludePairs.has(pairKey) || seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);
    count += 1;
  });
  return { count, pairKeys: seenPairs };
}

export const GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES = new Set(["bridges", "same_topic", "associated_with"]);

export function graphPotentialRelationActionEndpoints(cleanNoteId = "", sourceNoteId = "", targetNoteId = "", relationType = "", reversibleTypes = GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES) {
  const currentNoteId = String(cleanNoteId || "").trim();
  const cleanSourceNoteId = String(sourceNoteId || "").trim();
  const cleanTargetNoteId = String(targetNoteId || "").trim();
  const cleanRelationType = String(relationType || "").trim().toLowerCase();
  if (
    currentNoteId &&
    cleanTargetNoteId &&
    currentNoteId !== cleanSourceNoteId &&
    reversibleTypes.has(cleanRelationType)
  ) {
    return {
      actionSourceNoteId: currentNoteId,
      actionTargetNoteId: currentNoteId === cleanTargetNoteId ? cleanSourceNoteId : cleanTargetNoteId
    };
  }
  return {
    actionSourceNoteId: cleanSourceNoteId,
    actionTargetNoteId: cleanTargetNoteId
  };
}

export function graphPotentialRelationEvidenceText(candidate = {}) {
  const explicitEvidenceText = String(candidate.evidenceText || "").trim();
  if (explicitEvidenceText) return explicitEvidenceText;
  const evidenceItems = Array.isArray(candidate.evidence) ? candidate.evidence : [];
  const evidenceText = evidenceItems
    .map((item) => String(item?.summary || item?.text || item?.excerpt || "").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
  if (evidenceText) return evidenceText;
  return String(candidate.rationale || "").trim();
}

export function graphPotentialRelationRationaleDraft({
  relationLabel = "",
  actionSourceTitle = "",
  actionTargetTitle = "",
  aiRationale = "",
  evidenceText = ""
} = {}) {
  const rationaleSeed = aiRationale || evidenceText;
  const cleanRationaleSeed = String(rationaleSeed || "").replace(/[。！？!?；;：:\s]+$/gu, "").trim();
  return cleanRationaleSeed
    ? `我确认“${actionSourceTitle}”和“${actionTargetTitle}”可以建立${relationLabel}，因为${cleanRationaleSeed}。`
    : `我确认“${actionSourceTitle}”和“${actionTargetTitle}”可以建立${relationLabel}，因为：________。`;
}

export function graphDecoratePotentialRelationCandidate(candidate = {}, { nodeMap = new Map() } = {}, deps = {}) {
  const {
    graphNodeTitle = (map, noteId, fallback = "") => map.get(noteId)?.title || fallback || noteId,
    graphRelationTypeLabel = (type = "") => String(type || "相关关系"),
    graphPreferredRelationType = graphPreferredPotentialRelationType,
    evidenceTextForCandidate = graphPotentialRelationEvidenceText,
    rationaleDraftForCandidate = graphPotentialRelationRationaleDraft
  } = deps;
  const sourceNoteId = String(candidate.sourceNoteId || candidate.fromNoteId || "").trim();
  const targetNoteId = String(candidate.targetNoteId || candidate.toNoteId || "").trim();
  if (!sourceNoteId || !targetNoteId) return { ...candidate };
  const relationType = graphPreferredRelationType(candidate);
  const relationLabel = graphRelationTypeLabel(relationType);
  const actionSourceNoteId = String(candidate.actionSourceNoteId || sourceNoteId).trim() || sourceNoteId;
  const actionTargetNoteId = String(candidate.actionTargetNoteId || targetNoteId).trim() || targetNoteId;
  const sourceTitle = String(candidate.sourceTitle || graphNodeTitle(nodeMap, sourceNoteId, sourceNoteId || "当前笔记")).trim() || sourceNoteId;
  const targetTitle = String(candidate.targetTitle || graphNodeTitle(nodeMap, targetNoteId, targetNoteId || "目标笔记")).trim() || targetNoteId;
  const actionSourceTitle =
    String(candidate.actionSourceTitle || graphNodeTitle(nodeMap, actionSourceNoteId, sourceTitle || "当前笔记")).trim() || sourceTitle;
  const actionTargetTitle =
    String(candidate.actionTargetTitle || graphNodeTitle(nodeMap, actionTargetNoteId, targetTitle || "相关笔记")).trim() || targetTitle;
  const counterpartNoteId = String(candidate.counterpartNoteId || actionTargetNoteId || targetNoteId).trim() || targetNoteId;
  const counterpartTitle =
    String(candidate.counterpartTitle || graphNodeTitle(nodeMap, counterpartNoteId, actionTargetTitle || targetTitle || "相关笔记")).trim() ||
    actionTargetTitle ||
    targetTitle;
  const evidenceText = evidenceTextForCandidate(candidate);
  const aiRationale = String(candidate.aiRationale || candidate.ai_rationale || "").trim();
  const reviewQuestion = String(candidate.reviewQuestion || candidate.review_question || "").trim();
  return {
    ...candidate,
    sourceNoteId,
    targetNoteId,
    fromNoteId: String(candidate.fromNoteId || sourceNoteId).trim() || sourceNoteId,
    toNoteId: String(candidate.toNoteId || targetNoteId).trim() || targetNoteId,
    actionSourceNoteId,
    actionTargetNoteId,
    sourceTitle,
    targetTitle,
    actionSourceTitle,
    actionTargetTitle,
    counterpartNoteId,
    counterpartTitle,
    relationType,
    relationLabel,
    evidenceText,
    rationaleDraft: rationaleDraftForCandidate({
      relationLabel,
      actionSourceTitle,
      actionTargetTitle,
      aiRationale,
      evidenceText
    }),
    insightQuestionDraft: reviewQuestion || `这条${relationLabel}会如何改变你对“${actionTargetTitle}”的理解、支撑或边界判断？`
  };
}

export function graphAiRelationCandidatesForNote(noteId = "", { analysis = null, nodeMap = new Map(), edges = [], limit = 5 } = {}, deps = {}) {
  const {
    graphExistingRelationPairKeys: existingRelationPairKeysForEdges = graphExistingRelationPairKeys,
    graphCandidateCanSaveRelation: canSaveRelation = graphCandidateCanSaveRelation,
    graphPreferredRelationType = graphPreferredPotentialRelationType,
    decorateCandidate = graphDecoratePotentialRelationCandidate,
    actionEndpoints = graphPotentialRelationActionEndpoints,
    graphNodeTitle = (map, id, fallback = "") => map.get(id)?.title || fallback || id,
    graphRelationTypeLabel = (type = "") => String(type || "相关关系"),
    graphPotentialRelationNeedsConfirmation = () => false
  } = deps;
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return [];
  const rawCandidates = [
    ...(Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates : []),
    ...(Array.isArray(analysis?.bridgeCandidates) ? analysis.bridgeCandidates : [])
  ];
  const seenPairKeys = new Set();
  const existingRelationPairKeys = existingRelationPairKeysForEdges(edges);
  return rawCandidates
    .map((candidate = {}) => {
      const { sourceNoteId: fromNoteId, targetNoteId: toNoteId } = graphCandidateEndpointIds(candidate);
      if (!fromNoteId || !toNoteId) return null;
      if (fromNoteId !== cleanNoteId && toNoteId !== cleanNoteId) return null;
      if (!canSaveRelation(candidate)) return null;
      const sourceNoteId = fromNoteId;
      const targetNoteId = toNoteId;
      if (!targetNoteId || targetNoteId === sourceNoteId) return null;
      const relationType = graphPreferredRelationType(candidate);
      const pairKey = graphRelationPairKey(sourceNoteId, targetNoteId);
      if (!pairKey || seenPairKeys.has(pairKey) || existingRelationPairKeys.has(pairKey)) return null;
      seenPairKeys.add(pairKey);
      const counterpartNoteId = fromNoteId === cleanNoteId ? toNoteId : fromNoteId;
      const { actionSourceNoteId, actionTargetNoteId } = actionEndpoints(cleanNoteId, sourceNoteId, targetNoteId, relationType);
      const sourceTitle = graphNodeTitle(nodeMap, sourceNoteId, "当前笔记");
      const targetTitle = graphNodeTitle(nodeMap, targetNoteId, "目标笔记");
      const counterpartTitle = graphNodeTitle(nodeMap, counterpartNoteId, "相关笔记");
      const actionSourceTitle = graphNodeTitle(nodeMap, actionSourceNoteId, "当前笔记");
      const actionTargetTitle = graphNodeTitle(nodeMap, actionTargetNoteId, "相关笔记");
      const evidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
      const coarseReasons = Array.isArray(candidate.coarseReasons || candidate.coarse_reasons) ? candidate.coarseReasons || candidate.coarse_reasons : [];
      const aiRationale = String(candidate.aiRationale || candidate.ai_rationale || "").trim();
      const reviewQuestion = String(candidate.reviewQuestion || candidate.review_question || "").trim();
      return decorateCandidate({
        id: String(candidate.id || candidate.candidateId || candidate.candidate_id || "").trim(),
        sourceNoteId,
        targetNoteId,
        fromNoteId,
        toNoteId,
        counterpartNoteId,
        actionSourceNoteId,
        actionTargetNoteId,
        sourceTitle,
        targetTitle,
        counterpartTitle,
        actionSourceTitle,
        actionTargetTitle,
        confidence: Number(candidate.confidence || 0) || 0,
        coarseScore: Number(candidate.coarseScore ?? candidate.coarse_score ?? 0) || 0,
        componentBridge: candidate.componentBridge === true,
        rationale: String(candidate.rationale || "").trim(),
        evidenceText:
          evidence
            .map((item) => String(item?.summary || "").trim())
            .filter(Boolean)
            .slice(0, 2)
            .join(" / ") || String(candidate.rationale || "").trim(),
        coarseReasons,
        coarseType: String(candidate.coarseType || candidate.coarse_type || "").trim(),
        sharedTags: Array.isArray(candidate.sharedTags || candidate.shared_tags) ? candidate.sharedTags || candidate.shared_tags : [],
        aiDecision: String(candidate.aiDecision || candidate.ai_decision || "").trim(),
        aiRelationType: String(candidate.aiRelationType || candidate.ai_relation_type || "").trim(),
        aiConfidence: Number(candidate.aiConfidence ?? candidate.ai_confidence ?? 0) || 0,
        aiRationale,
        aiError: String(candidate.aiError || candidate.ai_error || "").trim(),
        aiErrorCode: String(candidate.aiErrorCode || candidate.ai_error_code || "").trim(),
        aiNeedsConfirmation: candidate.aiNeedsConfirmation === true || candidate.ai_needs_confirmation === true || graphPotentialRelationNeedsConfirmation(candidate),
        evidenceA: String(candidate.evidenceA || candidate.evidence_a || "").trim(),
        evidenceB: String(candidate.evidenceB || candidate.evidence_b || "").trim(),
        reviewQuestion,
        sourceContentHash: String(candidate.sourceContentHash || candidate.source_content_hash || "").trim(),
        targetContentHash: String(candidate.targetContentHash || candidate.target_content_hash || "").trim(),
        algorithmVersion: String(candidate.algorithmVersion || candidate.algorithm_version || "").trim(),
        modelName: String(candidate.modelName || candidate.model_name || "").trim(),
        relationType
      }, { nodeMap }, { graphNodeTitle, graphRelationTypeLabel, graphPreferredRelationType });
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.confidence || 0) - Number(left.confidence || 0))
    .slice(0, Math.max(1, Number(limit) || 5));
}

export function graphBlockedAiRelationPairKeysForNote(noteId = "", analysis = null) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return new Set();
  const rawCandidates = [
    ...(Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates : []),
    ...(Array.isArray(analysis?.bridgeCandidates) ? analysis.bridgeCandidates : [])
  ];
  return new Set(
    rawCandidates
      .filter((candidate = {}) => {
        const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
        return (
          sourceNoteId &&
          targetNoteId &&
          (sourceNoteId === cleanNoteId || targetNoteId === cleanNoteId) &&
          !graphCandidateCanSaveRelation(candidate)
        );
      })
      .map(graphCandidateUndirectedPairKey)
      .filter(Boolean)
  );
}
