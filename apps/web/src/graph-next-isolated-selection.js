function cleanId(value = "") {
  return String(value || "").trim();
}

function edgeConnectedNoteIds(edges = []) {
  const connected = new Set();
  for (const edge of Array.isArray(edges) ? edges : []) {
    const fromNoteId = cleanId(edge?.fromNoteId || edge?.from_note_id || edge?.sourceNoteId || edge?.source_note_id || edge?.from || edge?.source);
    const toNoteId = cleanId(edge?.toNoteId || edge?.to_note_id || edge?.targetNoteId || edge?.target_note_id || edge?.to || edge?.target);
    if (fromNoteId) connected.add(fromNoteId);
    if (toNoteId) connected.add(toNoteId);
  }
  return connected;
}

function relationCandidateSelection(note = {}, source = "after-save") {
  const noteId = cleanId(note?.id || note?.noteId);
  if (!noteId) return null;
  return {
    kind: "isolated",
    noteId,
    nodeId: noteId,
    isolatedKey: cleanId(note.isolatedKey || noteId),
    title: cleanId(note.title || note.label || noteId),
    source
  };
}

export function nextIsolatedSelectionAfterRelationSave({
  savedNoteId = "",
  nodes = [],
  edges = [],
  notes = [],
  importScopeNoteIds = []
} = {}) {
  const cleanSavedNoteId = cleanId(savedNoteId);
  const graphNodes = Array.isArray(nodes) ? nodes : [];
  const connected = edgeConnectedNoteIds(edges);
  const scopedNextNoteId = (Array.isArray(importScopeNoteIds) ? importScopeNoteIds : [])
    .map(cleanId)
    .find((noteId) => noteId && noteId !== cleanSavedNoteId && !connected.has(noteId));
  if (scopedNextNoteId) {
    const scopedNote = notes.find((note) => cleanId(note?.id) === scopedNextNoteId)
      || graphNodes.find((node) => cleanId(node?.id || node?.noteId) === scopedNextNoteId)
      || { id: scopedNextNoteId };
    return relationCandidateSelection(scopedNote, "import-after-save");
  }
  const nextNode = graphNodes.find((node) => {
    const noteId = cleanId(node?.id || node?.noteId);
    if (!noteId || noteId === cleanSavedNoteId) return false;
    const type = cleanId(node?.noteType || node?.type).toLowerCase();
    if (type && type !== "permanent") return false;
    return !connected.has(noteId) && Number(node?.degree || 0) <= 0;
  });
  if (nextNode) return relationCandidateSelection(nextNode, "after-save");
  return null;
}
