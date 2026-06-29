const GENERATED_ORIGINAL_MARKER_PATTERN = /<!--\s*yansilu:generated-original=([^\s>]+)\s*-->/i;

export function isPersistableRelationNetworkStatus(status = "") {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "connected" || normalized === "isolated";
}

export function normalizePersistableRelationNetworkStatus(status = "") {
  const normalized = String(status || "").trim().toLowerCase();
  return isPersistableRelationNetworkStatus(normalized) ? normalized : "";
}

export function resolveFolderRootNoteType(note = null, { typeFromFolder = () => "" } = {}) {
  return String((note?.folderId ? typeFromFolder(note.folderId) : "") || note?.noteType || "").trim().toLowerCase();
}

export function relationNetworkStatusForNotePolicy({
  note = null,
  noteType = "",
  connectedIds = null,
  connectivityReady = false,
  storedStatus = ""
} = {}) {
  const cleanType = String(noteType || "").trim().toLowerCase();
  const permanentLike = cleanType === "permanent" || cleanType === "original";
  if (permanentLike && connectivityReady && connectedIds instanceof Set) {
    return connectedIds.has(note?.id) ? "connected" : "isolated";
  }
  const explicitStatus = normalizePersistableRelationNetworkStatus(note?.relationNetworkStatus || note?.relation_network_status || "");
  if (explicitStatus) return explicitStatus;
  const stored = normalizePersistableRelationNetworkStatus(storedStatus);
  if (stored) return stored;
  if (!permanentLike) return "";
  if (!connectivityReady || !(connectedIds instanceof Set)) return "unknown";
  return connectedIds.has(note?.id) ? "connected" : "isolated";
}

export function notePersistenceFieldsForSave(note = null) {
  return {
    generatedOriginalNoteId: note?.generatedOriginalNoteId || undefined,
    relationNetworkStatus: normalizePersistableRelationNetworkStatus(note?.relationNetworkStatus) || undefined
  };
}

export function generatedOriginalNoteIdFromBody(body = "") {
  const match = String(body || "").match(GENERATED_ORIGINAL_MARKER_PATTERN);
  return String(match?.[1] || "").trim();
}

export function stripGeneratedOriginalMarker(body = "") {
  return String(body || "")
    .replace(/\n?<!--\s*yansilu:generated-original=[^\s>]+\s*-->\s*\n?/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export function withGeneratedOriginalMarker(body = "", originalNoteId = "") {
  const cleanId = String(originalNoteId || "").trim();
  const base = stripGeneratedOriginalMarker(body);
  if (!cleanId) return base;
  const separator = base.trim() ? "\n\n" : "";
  return `${base}${separator}<!-- yansilu:generated-original=${cleanId} -->`;
}

export function withGeneratedOriginalReference(body = "", originalTitle = "") {
  const cleanTitle = String(originalTitle || "").trim();
  const base = stripGeneratedOriginalMarker(body);
  if (!cleanTitle) return base;
  const visibleLink = `[[${cleanTitle}]]`;
  const visibleLine = `关联永久笔记：${visibleLink}`;
  if (base.includes(visibleLine)) return base;
  const separator = base.trim() ? "\n\n" : "";
  return `${base}${separator}${visibleLine}`;
}
