import { GRAPH_MEANINGFUL_RELATION_TYPES } from "./graph-view-mode-state.js";

export function graphLocalThemeGroups({ nodes = [], edges = [] } = {}) {
  const nodeMap = new Map(nodes.filter((note) => {
    const type = String(note?.noteType || note?.note_type || "").toLowerCase();
    return note?.id && (!type || type === "permanent" || type === "original");
  }).map((note) => [String(note.id), note]));
  const savedEdges = edges.filter((edge) =>
    (!edge.status || edge.status === "confirmed") &&
    nodeMap.has(edge.fromNoteId) && nodeMap.has(edge.toNoteId) &&
    edge.fromNoteId !== edge.toNoteId
  );
  const specificEdges = savedEdges.filter(edge => GRAPH_MEANINGFUL_RELATION_TYPES.has(edge.relationType));
  // Prefer specific relationships; a reference-only graph can still supply materials.
  const specificGroups = groupsForEdges(specificEdges);
  const candidates = specificGroups.length ? specificGroups : groupsForEdges(savedEdges);
  const selected = [];
  for (const group of candidates) {
    if (selected.some(other => {
      const overlap = group.noteIds.filter(id => other.noteIds.includes(id)).length;
      return overlap / Math.min(group.noteIds.length, other.noteIds.length) >= 2 / 3;
    })) continue;
    selected.push(group);
  }
  return selected;

  function groupsForEdges(groupEdges) {
    const neighbors = new Map([...nodeMap.keys()].map(id => [id, new Set()]));
    for (const edge of groupEdges) {
      neighbors.get(edge.fromNoteId).add(edge.toNoteId);
      neighbors.get(edge.toNoteId).add(edge.fromNoteId);
    }
    return [...nodeMap.values()].flatMap(anchor => {
      const ids = [anchor.id, ...neighbors.get(anchor.id)];
      if (ids.length < 3) return [];
      const members = new Set(ids);
      return [{
        anchor,
        noteIds: ids,
        notes: ids.map(id => nodeMap.get(id)),
        edges: groupEdges.filter(edge => members.has(edge.fromNoteId) && members.has(edge.toNoteId))
      }];
    }).sort((a, b) => b.edges.length - a.edges.length || b.noteIds.length - a.noteIds.length || a.anchor.id.localeCompare(b.anchor.id));
  }
}
