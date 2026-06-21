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
  if (/^(因为|鍥犱负)[:：锛氶敍姝歖?]*$/u.test(compact)) return false;
  if (/因为[:：]?$/u.test(compact)) return false;
  if (text.includes("存在需要一起复核的论证或主题联系")) return false;
  if (text.includes("存在可说明的论证或主题联系")) return false;
  if (text.includes("瀛樺湪闇€瑕佷竴璧峰鏍哥殑璁鸿瘉")) return false;
  if (/请补|补充|待补|璇疯ˉ|寰呰ˉ|TODO|TBD/i.test(text)) return false;
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
