import { graphIsolatedNodeIdsForGraph } from "./graph-relation-state-query.js";

export function graphIsolatedSelectionKeyForItem(note = {}, index = 0) {
  const raw = String(note?.noteId || note?.id || note?.title || index).trim();
  return raw || `isolated-${index}`;
}

export function graphNoteIdFromIsolatedItem(item = {}) {
  return String(item?.noteId || item?.id || "").trim();
}

export function graphComputedIsolatedNotesForGraph(
  nodes = [],
  edges = [],
  aiIsolatedNotes = [],
  { relationStatusCountsAsNetworkEdge = () => true } = {}
) {
  const isolatedNodeIds = graphIsolatedNodeIdsForGraph(nodes, edges, { relationStatusCountsAsNetworkEdge });
  const aiMetaById = new Map(
    (Array.isArray(aiIsolatedNotes) ? aiIsolatedNotes : [])
      .map((item) => [graphNoteIdFromIsolatedItem(item), item])
      .filter(([id]) => id)
  );
  return (Array.isArray(nodes) ? nodes : [])
    .filter((node) => {
      const noteId = String(node?.id || "").trim();
      return noteId && isolatedNodeIds.has(noteId);
    })
    .map((node) => {
      const noteId = String(node?.id || "").trim();
      const aiMeta = aiMetaById.get(noteId) || {};
      return {
        ...aiMeta,
        noteId,
        id: noteId,
        title: String(aiMeta.title || node?.title || noteId).trim() || noteId,
        thesis: String(aiMeta.thesis || node?.thesis || "").trim(),
        suggestedAction: String(aiMeta.suggestedAction || "review_missing_relations").trim()
      };
    });
}

export function graphMarkIsolatedNodesForGraph(
  nodes = [],
  isolatedNotes = [],
  {
    selectionKey = graphIsolatedSelectionKeyForItem,
    decisionMeta = () => ({ tone: "" })
  } = {}
) {
  const isolatedEntries = (Array.isArray(isolatedNotes) ? isolatedNotes : [])
    .map((item, index) => ({
      item,
      index,
      noteId: graphNoteIdFromIsolatedItem(item)
    }))
    .filter((entry) => entry.noteId);
  const isolatedById = new Map(isolatedEntries.map((entry) => [entry.noteId, entry]));
  return (Array.isArray(nodes) ? nodes : []).map((node) => {
    const noteId = String(node?.id || "").trim();
    const isolated = isolatedById.get(noteId);
    if (!isolated) return node;
    const decision = decisionMeta(isolated.item, node) || {};
    return {
      ...node,
      graphVisualState: "isolated",
      isGraphIsolatedCandidate: true,
      isolatedKey: selectionKey(isolated.item, isolated.index),
      isolatedIndex: isolated.index,
      isolatedDecisionTone: decision.tone
    };
  });
}

export function graphIsolatedQueueItemsForGraph({
  isolatedNotes = [],
  nodeMap = new Map(),
  edges = [],
  currentNoteId = "",
  limit = 8,
  fullNoteById = () => null,
  noteHasSavedIsolationDisposition = () => false,
  decisionMeta = () => ({ tone: "" }),
  aiRelationCandidatesForNote = () => [],
  localRelationCandidatesForNote = () => [],
  selectionKey = graphIsolatedSelectionKeyForItem
} = {}) {
  const cleanCurrentNoteId = String(currentNoteId || "").trim();
  const limitCount = Math.max(1, Number(limit) || 8);
  const items = (Array.isArray(isolatedNotes) ? isolatedNotes : [])
    .map((item, index) => {
      const noteId = graphNoteIdFromIsolatedItem(item);
      if (!noteId) return null;
      const note = fullNoteById(noteId, nodeMap) || {};
      if (noteHasSavedIsolationDisposition(note)) return null;
      const decision = decisionMeta(item, note) || {};
      const aiCandidates = aiRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 3 });
      const localCandidates = localRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 3 });
      const candidateCount = aiCandidates.length + localCandidates.length;
      const firstCandidate = aiCandidates[0] || localCandidates[0] || null;
      const title = String(item?.title || note?.title || noteId).trim() || noteId;
      const thesis = String(item?.thesis || note?.thesis || "").trim();
      const priority =
        (aiCandidates.length ? 40 : 0) +
        (localCandidates.length ? 24 : 0) +
        (decision.tone === "bridge" ? 12 : decision.tone === "rewrite" ? 8 : decision.tone === "keep" ? 4 : 0) -
        index * 0.01;
      return {
        item,
        index,
        noteId,
        isolatedKey: selectionKey(item, index),
        title,
        thesis,
        decision,
        aiCount: aiCandidates.length,
        localCount: localCandidates.length,
        candidateCount,
        firstCandidateTitle: String(firstCandidate?.counterpartTitle || firstCandidate?.targetTitle || "").trim(),
        priority,
        current: noteId === cleanCurrentNoteId
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0) || left.title.localeCompare(right.title, "zh-Hans-CN"));
  const limitedItems = items.slice(0, limitCount);
  if (!cleanCurrentNoteId || limitedItems.some((item) => item.noteId === cleanCurrentNoteId)) return limitedItems;
  const currentItem = items.find((item) => item.noteId === cleanCurrentNoteId);
  if (!currentItem) return limitedItems;
  return [...limitedItems.slice(0, Math.max(0, limitCount - 1)), currentItem];
}

export function graphNextIsolatedQueueItem(queueItems = [], currentNoteId = "") {
  const cleanCurrentNoteId = String(currentNoteId || "").trim();
  const items = Array.isArray(queueItems) ? queueItems : [];
  if (!items.length) return null;
  const currentIndex = items.findIndex((item) => String(item?.noteId || "").trim() === cleanCurrentNoteId);
  if (currentIndex >= 0) return items[(currentIndex + 1) % items.length] || null;
  return items[0] || null;
}
