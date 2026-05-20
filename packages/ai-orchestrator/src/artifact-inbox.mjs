const INBOX_VIEWS = {
  pending: ["pending_review"],
  reviewed: ["accepted", "ignored", "adopted_as_draft", "promoted_to_note", "linked_to_note"],
  archived: ["archived", "expired"],
  all: [
    "pending_review",
    "accepted",
    "ignored",
    "adopted_as_draft",
    "promoted_to_note",
    "linked_to_note",
    "archived",
    "expired"
  ]
};
const ACCEPTED_DECISIONS = new Set(["accepted", "adopted_as_draft", "promoted_to_note", "linked_to_note"]);

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeLimit(value) {
  const limit = Number(value || 50);
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(100, Math.floor(limit)));
}

function normalizeView(value) {
  const view = cleanText(value) || "pending";
  if (!INBOX_VIEWS[view]) {
    const error = new Error(`Unsupported AI inbox view: ${view}`);
    error.code = "AI_INBOX_VIEW_INVALID";
    throw error;
  }
  return view;
}

function statusBelongsToView(status, view) {
  return INBOX_VIEWS[view].includes(status);
}

function artifactMatchesInboxFilter(artifact = {}, filter = {}) {
  const rawType = cleanText(filter.type || filter.artifactType || filter.artifact_type);
  const type = rawType === "all" ? "" : rawType;
  const sourceNoteId = cleanText(filter.sourceNoteId || filter.source_note_id);
  const privacyMode = cleanText(filter.privacyMode || filter.privacy_mode);

  if (type && artifact.type !== type) return false;
  if (sourceNoteId && !(artifact.sources?.noteIds || []).includes(sourceNoteId)) return false;
  if (privacyMode && artifact.privacy?.mode !== privacyMode) return false;
  return true;
}

function itemActionState(status) {
  if (status === "pending_review") return "needs_review";
  if (INBOX_VIEWS.archived.includes(status)) return "closed";
  return "reviewed";
}

function latestDecision(artifact = {}) {
  const decisions = Array.isArray(artifact.userDecisions) ? artifact.userDecisions : [];
  return decisions[decisions.length - 1] || null;
}

function normalizedSummaryFilter(filter = {}) {
  const rawType = cleanText(filter.type || filter.artifactType || filter.artifact_type);
  const view = cleanText(filter.view) ? normalizeView(filter.view) : "all";
  return {
    view,
    type: rawType === "all" ? "" : rawType,
    sourceNoteId: cleanText(filter.sourceNoteId || filter.source_note_id),
    privacyMode: cleanText(filter.privacyMode || filter.privacy_mode)
  };
}

function incrementCount(target, key, amount = 1) {
  const cleanKey = cleanText(key) || "unknown";
  target[cleanKey] = (target[cleanKey] || 0) + amount;
}

function emptyFeedbackCounts() {
  return {
    useful: 0,
    noisy: 0,
    wrong: 0,
    alreadyKnown: 0,
    privacyConcern: 0
  };
}

function addFeedbackCounts(target, feedback = {}) {
  let hasFlag = false;
  for (const key of Object.keys(target)) {
    if (feedback[key] === true) {
      target[key] += 1;
      hasFlag = true;
    }
  }
  return hasFlag;
}

function emptyQualityBucket() {
  return {
    total: 0,
    reviewed: 0,
    accepted: 0,
    useful: 0,
    noisy: 0,
    wrong: 0,
    privacyConcern: 0
  };
}

function rate(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function qualityKey(value) {
  return cleanText(value) || "unknown";
}

function qualityBucket(target, key) {
  const cleanKey = qualityKey(key);
  if (!target[cleanKey]) target[cleanKey] = emptyQualityBucket();
  return target[cleanKey];
}

function addQualitySignal(bucket, artifact = {}, decision = null) {
  bucket.total += 1;
  if (!decision) return;
  bucket.reviewed += 1;
  if (ACCEPTED_DECISIONS.has(decision.decision)) bucket.accepted += 1;
  const feedback = decision.feedback || {};
  if (feedback.useful === true) bucket.useful += 1;
  if (feedback.noisy === true) bucket.noisy += 1;
  if (feedback.wrong === true) bucket.wrong += 1;
  if (feedback.privacyConcern === true) bucket.privacyConcern += 1;
}

function finalizeQualityBucket(bucket = emptyQualityBucket()) {
  return {
    ...bucket,
    reviewRate: rate(bucket.reviewed, bucket.total),
    acceptanceRate: rate(bucket.accepted, bucket.reviewed),
    usefulRate: rate(bucket.useful, bucket.reviewed),
    noisyRate: rate(bucket.noisy, bucket.reviewed),
    wrongRate: rate(bucket.wrong, bucket.reviewed),
    privacyConcernRate: rate(bucket.privacyConcern, bucket.reviewed)
  };
}

function finalizeQualityGroups(groups = {}) {
  return Object.fromEntries(Object.entries(groups).map(([key, bucket]) => [key, finalizeQualityBucket(bucket)]));
}

export function toAiInboxItem(artifact = {}) {
  const sourceNoteIds = artifact.sources?.noteIds || [];
  const sourceDocIds = artifact.sources?.sourceDocIds || [];
  const decision = latestDecision(artifact);
  return {
    artifactId: artifact.id,
    type: artifact.type,
    title: artifact.title,
    summary: artifact.summary || "",
    status: artifact.status,
    actionState: itemActionState(artifact.status),
    origin: artifact.origin,
    privacyMode: artifact.privacy?.mode || "normal",
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    agentRunId: artifact.agentRunId,
    contextPackId: artifact.contextPackId,
    primarySourceNoteId: sourceNoteIds[0] || "",
    sourceNoteIds,
    sourceDocIds,
    decisionCount: Array.isArray(artifact.userDecisions) ? artifact.userDecisions.length : 0,
    latestDecision: decision ? { ...decision } : null,
    confidence: artifact.confidence || null
  };
}

export function createAiInbox({ artifactStore } = {}) {
  if (!artifactStore || typeof artifactStore.listArtifacts !== "function") {
    const error = new Error("artifactStore with listArtifacts is required");
    error.code = "AI_INBOX_ARTIFACT_STORE_REQUIRED";
    throw error;
  }

  function listSourceArtifacts(filter = {}, statuses = INBOX_VIEWS.all) {
    const byId = new Map();
    const rawType = cleanText(filter.type || filter.artifactType || filter.artifact_type);
    const type = rawType === "all" ? "" : rawType;
    for (const status of statuses) {
      for (const artifact of artifactStore.listArtifacts({
        status,
        type,
        sourceNoteId: filter.sourceNoteId || filter.source_note_id,
        privacyMode: filter.privacyMode || filter.privacy_mode,
        limit: 200
      })) {
        byId.set(artifact.id, artifact);
      }
    }
    return [...byId.values()];
  }

  return {
    listItems(filter = {}) {
      const view = normalizeView(filter.view);
      const limit = normalizeLimit(filter.limit);
      return listSourceArtifacts(filter, INBOX_VIEWS[view])
        .filter((artifact) => artifactMatchesInboxFilter(artifact, filter))
        .filter((artifact) => statusBelongsToView(artifact.status, view))
        .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
        .slice(0, limit)
        .map(toAiInboxItem);
    },
    getItem(artifactId) {
      if (typeof artifactStore.getArtifact !== "function") return null;
      const artifact = artifactStore.getArtifact(artifactId);
      return artifact ? toAiInboxItem(artifact) : null;
    },
    counts(filter = {}) {
      const artifacts = listSourceArtifacts(filter, INBOX_VIEWS.all).filter((artifact) => artifactMatchesInboxFilter(artifact, filter));
      return {
        pending: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "pending")).length,
        reviewed: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "reviewed")).length,
        archived: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "archived")).length,
        all: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "all")).length
      };
    },
    evaluationSummary(filter = {}) {
      const normalizedFilter = normalizedSummaryFilter(filter);
      const artifacts = listSourceArtifacts(normalizedFilter, INBOX_VIEWS[normalizedFilter.view])
        .filter((artifact) => artifactMatchesInboxFilter(artifact, normalizedFilter))
        .filter((artifact) => statusBelongsToView(artifact.status, normalizedFilter.view));
      const statusCounts = {};
      const typeCounts = {};
      const agentRunCounts = {};
      const latestDecisionCounts = {};
      const allDecisionCounts = {};
      const feedbackCounts = emptyFeedbackCounts();
      const latestFeedbackCounts = emptyFeedbackCounts();
      const overallQuality = emptyQualityBucket();
      const qualityByType = {};
      const qualityByAgentRun = {};
      const qualityByModelTier = {};
      let totalDecisions = 0;
      let artifactsWithDecision = 0;
      let decisionsWithFeedback = 0;
      let artifactsWithLatestFeedback = 0;

      for (const artifact of artifacts) {
        incrementCount(statusCounts, artifact.status);
        incrementCount(typeCounts, artifact.type);
        incrementCount(agentRunCounts, artifact.agentRunId);
        const decisions = Array.isArray(artifact.userDecisions) ? artifact.userDecisions : [];
        const decision = latestDecision(artifact);
        totalDecisions += decisions.length;
        if (decision) {
          artifactsWithDecision += 1;
          incrementCount(latestDecisionCounts, decision.decision);
          if (addFeedbackCounts(latestFeedbackCounts, decision.feedback || {})) artifactsWithLatestFeedback += 1;
        }
        addQualitySignal(overallQuality, artifact, decision);
        addQualitySignal(qualityBucket(qualityByType, artifact.type), artifact, decision);
        addQualitySignal(qualityBucket(qualityByAgentRun, artifact.agentRunId), artifact, decision);
        addQualitySignal(qualityBucket(qualityByModelTier, artifact.model?.tier), artifact, decision);
        for (const item of decisions) {
          incrementCount(allDecisionCounts, item.decision);
          if (addFeedbackCounts(feedbackCounts, item.feedback || {})) decisionsWithFeedback += 1;
        }
      }

      return {
        filter: normalizedFilter,
        artifacts: {
          total: artifacts.length,
          pending: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "pending")).length,
          reviewed: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "reviewed")).length,
          archived: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "archived")).length,
          withDecision: artifactsWithDecision,
          withoutDecision: Math.max(0, artifacts.length - artifactsWithDecision)
        },
        statusCounts,
        typeCounts,
        agentRunCounts,
        decisions: {
          total: totalDecisions,
          artifactsWithDecision,
          latest: latestDecisionCounts,
          all: allDecisionCounts
        },
        feedback: {
          decisionsWithFeedback,
          artifactsWithLatestFeedback,
          all: feedbackCounts,
          latest: latestFeedbackCounts
        },
        quality: {
          overall: finalizeQualityBucket(overallQuality),
          byType: finalizeQualityGroups(qualityByType),
          byAgentRun: finalizeQualityGroups(qualityByAgentRun),
          byModelTier: finalizeQualityGroups(qualityByModelTier)
        }
      };
    },
    views() {
      return Object.keys(INBOX_VIEWS);
    }
  };
}

export function aiInboxViews() {
  return Object.keys(INBOX_VIEWS);
}
