function cleanText(value) {
  return String(value || "").trim();
}

export function traceDisplayState({
  trace = null,
  target = null,
  sourceArtifactId = "",
  linkedArtifactId = "",
  sourceNoteIds = [],
  primarySourceNoteId = "",
  status = ""
} = {}) {
  const safeTrace = trace && typeof trace === "object" ? trace : {};
  const safeTarget = target && typeof target === "object" ? target : {};
  const nextSourceNoteIds = Array.isArray(safeTrace.sourceNoteIds)
    ? safeTrace.sourceNoteIds.filter(Boolean)
    : Array.isArray(sourceNoteIds)
      ? sourceNoteIds.filter(Boolean)
      : [];
  return {
    sourceArtifactId: cleanText(safeTrace.sourceArtifactId || sourceArtifactId || linkedArtifactId),
    sourceNoteIds: nextSourceNoteIds,
    primarySourceNoteId: cleanText(safeTrace.primarySourceNoteId || primarySourceNoteId || nextSourceNoteIds[0]),
    targetNoteId: cleanText(safeTrace.targetNoteId || safeTarget.id),
    targetField: cleanText(safeTrace.targetField || safeTarget.field),
    status: cleanText(safeTrace.suggestionStatus || status)
  };
}

export function tracePlaceholderCopy({ suggestionId = "", sourceArtifactId = "", targetNoteId = "" } = {}) {
  if (cleanText(sourceArtifactId) || cleanText(targetNoteId)) return "";
  return "Trace placeholder: this linked review item exists, but its source/target trace is incomplete.";
}

export function traceMissingTargetCopy() {
  return "This linked review item is not connected to a target note yet.";
}
