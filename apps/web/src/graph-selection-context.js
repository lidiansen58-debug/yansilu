// Rendering normalizes selections into new objects. Compare the selected
// object on the graph, rather than the identity of that temporary JS object.
export function graphSelectionContextKey(selection = null) {
  if (!selection) return "";
  const clean = value => String(value || "").trim();
  return JSON.stringify([
    clean(selection.kind).toLowerCase(),
    clean(selection.noteId || selection.nodeId || selection.id),
    clean(selection.edgeKey),
    clean(selection.fromNoteId),
    clean(selection.toNoteId),
    clean(selection.relationType),
    clean(selection.clusterKey),
    clean(selection.topicKey)
  ]);
}
