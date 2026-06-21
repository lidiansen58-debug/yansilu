import {
  relationWorkspaceDirectEdges,
  relationWorkspaceEdgeEndpointIds,
  relationWorkspaceEdgeTouchesNote,
  relationWorkspaceExistingEdge,
  relationWorkspaceOtherEndpoint
} from "./relation-workspace-shared.js";

function cleanText(value = "") {
  return String(value || "").trim();
}

function normalizedEdges(edges = []) {
  return Array.isArray(edges) ? edges : [];
}

function edgeCountsAsNetworkEdge(edge = {}, edgeCounts = graphRelationStatusCountsAsNetworkEdge) {
  return edgeCounts(edge?.status);
}

export {
  relationWorkspaceEdgeEndpointIds as graphRelationEdgeEndpointIds,
  relationWorkspaceEdgeTouchesNote as graphRelationEdgeTouchesNote,
  relationWorkspaceExistingEdge as graphExistingRelationBetweenNotes,
  relationWorkspaceOtherEndpoint as graphRelationOtherEndpoint
};

export function graphRelationCandidateKey(fromNoteId = "", toNoteId = "", relationType = "") {
  return `${cleanText(fromNoteId)}->${cleanText(toNoteId)}:${cleanText(relationType).toLowerCase()}`;
}

export function graphRelationPairKey(leftNoteId = "", rightNoteId = "") {
  const normalized = [cleanText(leftNoteId), cleanText(rightNoteId)].filter(Boolean).sort();
  return normalized.length === 2 ? `${normalized[0]}::${normalized[1]}` : "";
}

export function graphCandidateEndpointIds(candidate = {}) {
  const sourceNoteId = cleanText(
    candidate.fromNoteId ||
    candidate.from_note_id ||
    candidate.sourceNoteId ||
    candidate.source_note_id ||
    candidate.actionSourceNoteId ||
    candidate.action_source_note_id ||
    candidate.from?.id ||
    (Array.isArray(candidate.noteIds) ? candidate.noteIds[0] : "") ||
    ""
  );
  const targetNoteId = cleanText(
    candidate.toNoteId ||
    candidate.to_note_id ||
    candidate.targetNoteId ||
    candidate.target_note_id ||
    candidate.actionTargetNoteId ||
    candidate.action_target_note_id ||
    candidate.counterpartNoteId ||
    candidate.counterpart_note_id ||
    candidate.to?.id ||
    (Array.isArray(candidate.targetNoteIds) ? candidate.targetNoteIds[0] : "") ||
    (Array.isArray(candidate.noteIds) ? candidate.noteIds[1] : "") ||
    ""
  );
  return { sourceNoteId, targetNoteId };
}

export function graphRelationStatusKey(value = "") {
  return cleanText(value || "confirmed").toLowerCase();
}

export function graphRelationStatusCountsAsNetworkEdge(value = "") {
  const status = graphRelationStatusKey(value);
  return status === "suggested" || status === "draft" || status === "confirmed";
}

export function graphExistingRelationKeys(edges = []) {
  return new Set(
    graphNetworkRelationEdges(edges)
      .map((edge) => {
        const { fromNoteId, toNoteId } = relationWorkspaceEdgeEndpointIds(edge);
        return graphRelationCandidateKey(fromNoteId, toNoteId, edge?.relationType);
      })
      .filter((key) => key !== "->:")
  );
}

export function graphExistingRelationPairKeys(edges = []) {
  return new Set(
    graphNetworkRelationEdges(edges)
      .map((edge) => {
        const { fromNoteId, toNoteId } = relationWorkspaceEdgeEndpointIds(edge);
        return graphRelationPairKey(fromNoteId, toNoteId);
      })
      .filter(Boolean)
  );
}

export function graphNetworkRelationEdges(edges = [], { relationStatusCountsAsNetworkEdge: edgeCounts = graphRelationStatusCountsAsNetworkEdge } = {}) {
  return normalizedEdges(edges).filter((edge) => edgeCountsAsNetworkEdge(edge, edgeCounts));
}

export function graphDirectNetworkEdgesForNote(
  noteId = "",
  edges = [],
  { relationStatusCountsAsNetworkEdge: edgeCounts = graphRelationStatusCountsAsNetworkEdge } = {}
) {
  return relationWorkspaceDirectEdges(noteId, edges, { edgeCounts: (edge) => edgeCountsAsNetworkEdge(edge, edgeCounts) });
}

export function graphDirectNetworkEdgeCount(
  noteId = "",
  edges = [],
  { relationStatusCountsAsNetworkEdge: edgeCounts = graphRelationStatusCountsAsNetworkEdge } = {}
) {
  return graphDirectNetworkEdgesForNote(noteId, edges, { relationStatusCountsAsNetworkEdge: edgeCounts }).length;
}

export function graphConnectedNoteIdsForNote(
  noteId = "",
  edges = [],
  { relationStatusCountsAsNetworkEdge: edgeCounts = graphRelationStatusCountsAsNetworkEdge } = {}
) {
  const cleanNoteId = cleanText(noteId);
  if (!cleanNoteId) return new Set();
  return new Set(
    graphDirectNetworkEdgesForNote(cleanNoteId, edges, { relationStatusCountsAsNetworkEdge: edgeCounts })
      .map((edge) => relationWorkspaceOtherEndpoint(edge, cleanNoteId))
      .filter(Boolean)
  );
}

export function graphLinkedNoteIdsForNetwork(
  edges = [],
  { relationStatusCountsAsNetworkEdge: edgeCounts = graphRelationStatusCountsAsNetworkEdge } = {}
) {
  return new Set(
    graphNetworkRelationEdges(edges, { relationStatusCountsAsNetworkEdge: edgeCounts })
      .flatMap((edge) => {
        const { fromNoteId, toNoteId } = relationWorkspaceEdgeEndpointIds(edge);
        return [fromNoteId, toNoteId];
      })
      .filter(Boolean)
  );
}

export function graphIsolatedNodeIdsForGraph(
  nodes = [],
  edges = [],
  { relationStatusCountsAsNetworkEdge: edgeCounts = graphRelationStatusCountsAsNetworkEdge } = {}
) {
  const linkedIds = graphLinkedNoteIdsForNetwork(edges, { relationStatusCountsAsNetworkEdge: edgeCounts });
  return new Set(
    (Array.isArray(nodes) ? nodes : [])
      .map((node) => cleanText(node?.id))
      .filter((noteId) => noteId && !linkedIds.has(noteId))
  );
}

export function graphCandidateHasExistingRelation(candidate = {}, edges = []) {
  const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
  if (!sourceNoteId || !targetNoteId) return false;
  return Boolean(relationWorkspaceExistingEdge(graphNetworkRelationEdges(edges), sourceNoteId, targetNoteId));
}

export function graphRelationSaveResultForNote(noteId = "", saveResultsByNoteId = {}) {
  const cleanNoteId = cleanText(noteId);
  if (!cleanNoteId || !saveResultsByNoteId || typeof saveResultsByNoteId !== "object") return {};
  const result = saveResultsByNoteId[cleanNoteId];
  return result && typeof result === "object" ? result : {};
}
