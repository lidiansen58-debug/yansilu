export function graphLocalThemeGroups({ nodes = [], edges = [] } = {}) {
  const nodeMap = new Map(nodes.filter((note) => {
    const type = String(note?.noteType || note?.note_type || "").toLowerCase();
    return note?.id && (!type || type === "permanent" || type === "original");
  }).map((note) => [String(note.id), note]));
  const savedEdges = edges.filter((edge) =>
    (!edge.status || edge.status === "confirmed") &&
    nodeMap.has(String(edge.fromNoteId || "")) && nodeMap.has(String(edge.toNoteId || "")) &&
    edge.fromNoteId !== edge.toNoteId
  );
  const neighbors = new Map([...nodeMap.keys()].map((id) => [id, new Set()]));
  const noteEdges = new Map([...nodeMap.keys()].map((id) => [id, []]));
  for (const edge of savedEdges) {
    neighbors.get(edge.fromNoteId).add(edge.toNoteId);
    neighbors.get(edge.toNoteId).add(edge.fromNoteId);
    noteEdges.get(edge.fromNoteId).push(edge);
    noteEdges.get(edge.toNoteId).push(edge);
  }
  const seen = new Set();
  return [...nodeMap.values()].flatMap((anchor) => {
    const ids = [anchor.id, ...neighbors.get(anchor.id)];
    if (ids.length < 3) return [];
    const key = [...ids].sort().join("\u0000");
    if (seen.has(key)) return [];
    seen.add(key);
    const memberIds = new Set(ids);
    return [{
      anchor,
      noteIds: ids,
      notes: ids.map((id) => nodeMap.get(id)),
      edges: [...new Set(ids.flatMap((id) => noteEdges.get(id)))].filter((edge) => memberIds.has(edge.fromNoteId) && memberIds.has(edge.toNoteId))
    }];
  });
}
