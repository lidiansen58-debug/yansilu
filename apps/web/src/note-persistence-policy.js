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
