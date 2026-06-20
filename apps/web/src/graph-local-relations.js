export function graphNoteTagsForLocalRelation(note = {}, { parseTags = () => [] } = {}) {
  const explicitTags = Array.isArray(note?.tags)
    ? note.tags
    : Array.isArray(note?.tagNames)
      ? note.tagNames
      : [];
  const parsedTags = explicitTags.length ? explicitTags : parseTags(String(note?.body || note?.markdown || ""));
  return [...new Set(parsedTags.map((tag) => String(tag || "").trim()).filter(Boolean))].slice(0, 12);
}

export function graphTitleCharacterOverlap(left = "", right = "") {
  const normalizeChars = (value) =>
    new Set(
      [...String(value || "").trim()]
        .map((char) => char.toLowerCase())
        .filter((char) => /[\p{L}\p{N}]/u.test(char))
    );
  const leftChars = normalizeChars(left);
  const rightChars = normalizeChars(right);
  if (!leftChars.size || !rightChars.size) return 0;
  const shared = [...leftChars].filter((char) => rightChars.has(char)).length;
  return shared / Math.max(1, Math.min(leftChars.size, rightChars.size));
}

export function graphConnectedNoteIdsForNote(noteId = "", edges = [], { relationStatusCountsAsNetworkEdge = () => true } = {}) {
  const cleanNoteId = String(noteId || "").trim();
  return new Set(
    (Array.isArray(edges) ? edges : [])
      .filter((edge) => relationStatusCountsAsNetworkEdge(edge?.status))
      .flatMap((edge) => {
        const fromId = String(edge?.fromNoteId || "").trim();
        const toId = String(edge?.toNoteId || "").trim();
        if (fromId === cleanNoteId) return [toId];
        if (toId === cleanNoteId) return [fromId];
        return [];
      })
      .filter(Boolean)
  );
}

function graphPermanentLikeNote(note = {}) {
  const noteType = String(note?.noteType || note?.note_type || "").trim().toLowerCase();
  return !noteType || noteType === "permanent" || noteType === "original";
}

export function graphLocalRelationCandidatesForNote(
  noteId = "",
  { nodeMap = new Map(), edges = [], limit = 5 } = {},
  {
    relationStatusCountsAsNetworkEdge = () => true,
    noteTags = graphNoteTagsForLocalRelation,
    relationTypeLabel = (type) => type
  } = {}
) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId || !(nodeMap instanceof Map)) return [];
  const source = nodeMap.get(cleanNoteId);
  if (!source || !graphPermanentLikeNote(source)) return [];
  const connectedIds = graphConnectedNoteIdsForNote(cleanNoteId, edges, { relationStatusCountsAsNetworkEdge });
  const sourceTags = noteTags(source);
  const sourceTagSet = new Set(sourceTags);
  const sourceTitle = String(source.title || cleanNoteId).trim() || cleanNoteId;
  return [...nodeMap.values()]
    .filter((candidate) => {
      const targetId = String(candidate?.id || "").trim();
      return graphPermanentLikeNote(candidate) && targetId && targetId !== cleanNoteId && !connectedIds.has(targetId);
    })
    .map((candidate) => {
      const targetId = String(candidate?.id || "").trim();
      const targetTitle = String(candidate?.title || targetId).trim() || targetId;
      const targetTags = noteTags(candidate);
      const sharedTags = targetTags.filter((tag) => sourceTagSet.has(tag));
      const titleOverlap = graphTitleCharacterOverlap(sourceTitle, targetTitle);
      const score = sharedTags.length * 3 + titleOverlap * 2;
      if (score < 0.62) return null;
      const relationType = sharedTags.length ? "same_topic" : "associated_with";
      const relationLabel = relationTypeLabel(relationType);
      const reasonParts = [
        sharedTags.length ? `共同标签：${sharedTags.slice(0, 3).map((tag) => `#${tag}`).join("、")}` : "",
        titleOverlap >= 0.62 ? "标题概念接近" : ""
      ].filter(Boolean);
      return {
        sourceNoteId: cleanNoteId,
        targetNoteId: targetId,
        sourceTitle,
        targetTitle,
        relationType,
        relationLabel,
        confidence: Math.min(0.92, 0.38 + score / 8),
        evidenceText: reasonParts.join("；") || "标题或标签出现相近线索。",
        rationaleDraft: `我确认“${sourceTitle}”和“${targetTitle}”可以建立${relationLabel}，因为：________。`,
        insightQuestionDraft: `这条${relationLabel}能帮助我如何理解“${sourceTitle}”在当前主题网络中的位置？`
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.confidence || 0) - Number(left.confidence || 0) || left.targetTitle.localeCompare(right.targetTitle, "zh-Hans-CN"))
    .slice(0, Math.max(1, Number(limit) || 5));
}

export function graphManualRelationTargetsForNote(
  noteId = "",
  { nodeMap = new Map(), edges = [], limit = 80 } = {},
  { relationStatusCountsAsNetworkEdge = () => true } = {}
) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId || !(nodeMap instanceof Map)) return [];
  const connectedIds = graphConnectedNoteIdsForNote(cleanNoteId, edges, { relationStatusCountsAsNetworkEdge });
  return [...nodeMap.values()]
    .map((note) => ({
      id: String(note?.id || "").trim(),
      title: String(note?.title || note?.id || "").trim(),
      folder: String(note?.folderPath || note?.folderLabel || note?.folderName || "").trim(),
      noteType: String(note?.noteType || note?.note_type || "").trim()
    }))
    .filter((note) => {
      const noteType = String(note.noteType || "").trim().toLowerCase();
      const permanentLike = !noteType || noteType === "permanent" || noteType === "original";
      return permanentLike && note.id && note.id !== cleanNoteId && !connectedIds.has(note.id);
    })
    .sort((left, right) => left.title.localeCompare(right.title, "zh-Hans-CN"))
    .slice(0, Math.max(1, Number(limit) || 80));
}

export function graphNotePreviewTextForLocalRelation(note = {}) {
  const text = String(note?.thesis || note?.summary || note?.body || note?.markdown || "").replace(/[#*_`>\-[\]()]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "这条笔记还没有可预览的正文摘要。";
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

export function graphFullNoteByIdFromSources(noteId = "", { nodeMap = new Map(), notes = [] } = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return null;
  const graphNode = nodeMap.get(cleanNoteId) || {};
  const knownNote = (Array.isArray(notes) ? notes : []).find((item) => String(item?.id || "").trim() === cleanNoteId) || {};
  if (!graphNode.id && !knownNote.id) return null;
  return {
    ...graphNode,
    ...knownNote,
    id: cleanNoteId,
    title: String(knownNote.title || graphNode.title || cleanNoteId).trim() || cleanNoteId
  };
}

export function graphIsolatedPreviewTargetForNote(
  noteId = "",
  { nodeMap = new Map(), preferredTargetNoteId = "", previewTargetByNoteId = {}, notes = [] } = {},
  {
    fullNoteById = graphFullNoteByIdFromSources,
    nodeTitle = (_nodeMap, targetNoteId, fallback = "") => fallback || targetNoteId,
    noteTypeLabel = (value) => value || "",
    notePreviewText = graphNotePreviewTextForLocalRelation,
    noteTags = graphNoteTagsForLocalRelation
  } = {}
) {
  const cleanNoteId = String(noteId || "").trim();
  const targetNoteId = String(preferredTargetNoteId || "").trim() || (cleanNoteId ? String(previewTargetByNoteId?.[cleanNoteId] || "").trim() : "");
  if (!targetNoteId) return null;
  const note = fullNoteById(targetNoteId, { nodeMap, notes });
  if (!note) return null;
  return {
    id: targetNoteId,
    title: nodeTitle(nodeMap, targetNoteId, "相关笔记"),
    type: noteTypeLabel(note.noteType),
    text: notePreviewText(note),
    tags: noteTags(note).slice(0, 5)
  };
}
