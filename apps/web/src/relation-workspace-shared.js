function cleanText(value = "") {
  return String(value || "").trim();
}

export function relationWorkspaceEdgeEndpointIds(edge = {}) {
  return {
    fromNoteId: cleanText(edge?.fromNoteId || edge?.from_note_id || edge?.sourceNoteId || edge?.source_note_id),
    toNoteId: cleanText(edge?.toNoteId || edge?.to_note_id || edge?.targetNoteId || edge?.target_note_id)
  };
}

export function relationWorkspaceEdgeTouchesNote(edge = {}, noteId = "") {
  const cleanNoteId = cleanText(noteId);
  if (!cleanNoteId) return false;
  const { fromNoteId, toNoteId } = relationWorkspaceEdgeEndpointIds(edge);
  return fromNoteId === cleanNoteId || toNoteId === cleanNoteId;
}

export function relationWorkspaceOtherEndpoint(edge = {}, noteId = "") {
  const cleanNoteId = cleanText(noteId);
  const { fromNoteId, toNoteId } = relationWorkspaceEdgeEndpointIds(edge);
  if (fromNoteId === cleanNoteId) return toNoteId;
  if (toNoteId === cleanNoteId) return fromNoteId;
  return "";
}

export function relationWorkspaceDirectEdges(noteId = "", edges = [], { edgeCounts = () => true } = {}) {
  return (Array.isArray(edges) ? edges : []).filter((edge) => edgeCounts(edge) && relationWorkspaceEdgeTouchesNote(edge, noteId));
}

export function relationWorkspaceExistingEdge(edges = [], sourceNoteId = "", targetNoteId = "") {
  const sourceId = cleanText(sourceNoteId);
  const targetId = cleanText(targetNoteId);
  if (!sourceId || !targetId) return null;
  return (Array.isArray(edges) ? edges : []).find((edge) => {
    const { fromNoteId, toNoteId } = relationWorkspaceEdgeEndpointIds(edge);
    return (fromNoteId === sourceId && toNoteId === targetId) || (fromNoteId === targetId && toNoteId === sourceId);
  }) || null;
}

export function relationWorkspaceCandidateTargetId(candidate = {}) {
  return cleanText(candidate?.targetNoteId || candidate?.counterpartNoteId || candidate?.toNoteId || candidate?.to_note_id || candidate?.to?.id);
}

export function relationWorkspaceAvailableTargetCandidates(candidates = [], {
  sourceNoteId = "",
  edges = [],
  excludeTargetIds = []
} = {}) {
  const sourceId = cleanText(sourceNoteId);
  const seenTargetIds = new Set((Array.isArray(excludeTargetIds) ? excludeTargetIds : []).map(cleanText).filter(Boolean));
  return (Array.isArray(candidates) ? candidates : []).filter((candidate) => {
    const targetId = relationWorkspaceCandidateTargetId(candidate);
    if (!targetId || targetId === sourceId || seenTargetIds.has(targetId) || relationWorkspaceExistingEdge(edges, sourceId, targetId)) return false;
    seenTargetIds.add(targetId);
    return true;
  });
}

export function relationWorkspaceNextTargetCandidate(candidates = [], options = {}) {
  return relationWorkspaceAvailableTargetCandidates(candidates, options)[0] || null;
}
