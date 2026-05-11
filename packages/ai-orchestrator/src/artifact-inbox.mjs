const INBOX_VIEWS = {
  pending: ["pending_review"],
  reviewed: ["accepted", "revised", "ignored", "promoted_to_note", "linked_to_note"],
  archived: ["archived", "expired"],
  all: [
    "pending_review",
    "accepted",
    "revised",
    "ignored",
    "promoted_to_note",
    "linked_to_note",
    "archived",
    "expired"
  ]
};

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
  const type = cleanText(filter.type || filter.artifactType || filter.artifact_type);
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

  function listSourceArtifacts(filter = {}) {
    return artifactStore.listArtifacts({
      type: filter.type || filter.artifactType || filter.artifact_type,
      sourceNoteId: filter.sourceNoteId || filter.source_note_id,
      privacyMode: filter.privacyMode || filter.privacy_mode,
      limit: 200
    });
  }

  return {
    listItems(filter = {}) {
      const view = normalizeView(filter.view);
      const limit = normalizeLimit(filter.limit);
      return listSourceArtifacts(filter)
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
      const artifacts = listSourceArtifacts(filter).filter((artifact) => artifactMatchesInboxFilter(artifact, filter));
      return {
        pending: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "pending")).length,
        reviewed: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "reviewed")).length,
        archived: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "archived")).length,
        all: artifacts.filter((artifact) => statusBelongsToView(artifact.status, "all")).length
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
