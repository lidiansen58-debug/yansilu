export function graphAiConnectAnalysisOptions(noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  return {
    includeDescendants: true,
    minScore: 0.05,
    relationLimit: 24,
    focusNoteId: cleanNoteId,
    currentNoteId: cleanNoteId,
    persistArtifacts: true
  };
}

export function graphAiConnectPreviewTargetId(candidates = []) {
  const first = Array.isArray(candidates) ? candidates[0] : null;
  return String(first?.counterpartNoteId || first?.targetNoteId || "").trim();
}

export function graphAiConnectCandidateTitles(candidates = [], limit = 3) {
  return (Array.isArray(candidates) ? candidates : [])
    .map((candidate) => String(candidate?.counterpartTitle || candidate?.targetTitle || candidate?.targetNoteId || "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function graphAiConnectArtifactCount(result = null) {
  return Number(result?.reviewItems?.summary?.artifactCount || 0);
}
