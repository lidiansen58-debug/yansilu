import { graphConnectedNoteIdsForNote as queryGraphConnectedNoteIdsForNote } from "./graph-relation-state-query.js";

export function graphNoteTagsForLocalRelation(note = {}, { parseTags = () => [] } = {}) {
  const explicitTags = Array.isArray(note?.tags)
    ? note.tags
    : Array.isArray(note?.tagNames)
      ? note.tagNames
      : [];
  const parsedTags = explicitTags.length ? explicitTags : parseTags(String(note?.body || note?.markdown || ""));
  return [...new Set(parsedTags.map((tag) => String(tag || "").trim()).filter(Boolean))].slice(0, 12);
}

function titleCharacters(value = "") {
  return new Set([...String(value || "").trim()].map(char => char.toLowerCase()).filter(char => /[\p{L}\p{N}]/u.test(char)));
}

function characterOverlap(leftChars, rightChars) {
  if (!leftChars.size || !rightChars.size) return 0;
  const shared = [...leftChars].filter((char) => rightChars.has(char)).length;
  return shared / Math.max(1, Math.min(leftChars.size, rightChars.size));
}

export function graphTitleCharacterOverlap(left = "", right = "") {
  return characterOverlap(titleCharacters(left), titleCharacters(right));
}

export function graphConnectedNoteIdsForNote(noteId = "", edges = [], { relationStatusCountsAsNetworkEdge = () => true } = {}) {
  return queryGraphConnectedNoteIdsForNote(noteId, edges, { relationStatusCountsAsNetworkEdge });
}

function graphPermanentLikeNote(note = {}) {
  const noteType = String(note?.noteType || note?.note_type || "").trim().toLowerCase();
  return !noteType || noteType === "permanent" || noteType === "original";
}

const NOTE_CLASSIFICATION_TAGS = new Set(["permanent", "original", "永久笔记", "原创笔记"]);
const titleCollator = new Intl.Collator("zh-Hans-CN");

export function prepareGraphLocalRelationCandidates(nodeMap, { noteTags = graphNoteTagsForLocalRelation } = {}) {
  const features = new Map();
  const tagFrequency = new Map();
  for (const [key, note] of nodeMap) {
    if (!graphPermanentLikeNote(note)) continue;
    const id = String(note?.id || "").trim();
    const title = String(note?.title || id).trim() || id;
    const tags = noteTags(note);
    features.set(key, { id, title, tags, characters: titleCharacters(title) });
    for (const tag of new Set(tags)) tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
  }
  return { nodeMap, features, tagFrequency };
}

export function graphLocalRelationCandidatesForNote(
  noteId = "",
  { nodeMap = new Map(), edges = [], limit = 5, prepared = null } = {},
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
  const context = prepared?.nodeMap === nodeMap ? prepared : prepareGraphLocalRelationCandidates(nodeMap, { noteTags });
  const sourceTags = context.features.get(cleanNoteId)?.tags || noteTags(source);
  const sourceTagSet = new Set(sourceTags);
  const sourceTitle = String(source.title || cleanNoteId).trim() || cleanNoteId;
  const sourceCharacters = titleCharacters(sourceTitle);
  const { features, tagFrequency } = context;
  // Tags used by most notes describe the library, not a specific shared topic.
  const isSpecificTag = (tag) => !NOTE_CLASSIFICATION_TAGS.has(String(tag).toLowerCase()) &&
    (features.size < 4 || (tagFrequency.get(tag) || 0) / features.size < 0.6);
  return [...features.values()]
    .filter((candidate) => {
      const targetId = candidate.id;
      return targetId && targetId !== cleanNoteId && !connectedIds.has(targetId);
    })
    .map((candidate) => {
      const targetId = candidate.id;
      const targetTitle = candidate.title;
      const targetTags = candidate.tags;
      const sharedTags = targetTags.filter((tag) => sourceTagSet.has(tag) && isSpecificTag(tag));
      const titleOverlap = characterOverlap(sourceCharacters, candidate.characters);
      if (!sharedTags.length && titleOverlap < 0.62) return null;
      const score = sharedTags.length * 3 + titleOverlap * 2;
      if (score < 0.62) return null;
      const relationType = "associated_with";
      const relationLabel = relationTypeLabel(relationType);
      const reasonParts = [
        sharedTags.length ? `共同标签：${sharedTags.slice(0, 3).map((tag) => `#${tag}`).join("、")}` : "",
        titleOverlap >= 0.62 ? "标题用词相近，需对照内容" : ""
      ].filter(Boolean);
      return {
        sourceNoteId: cleanNoteId,
        targetNoteId: targetId,
        sourceTitle,
        targetTitle,
        relationType,
        relationLabel,
        confidence: Math.min(0.92, 0.38 + score / 8),
        evidenceText: reasonParts.join("；") || "标题或标签出现相近主题。",
        rationaleDraft: "",
        insightQuestionDraft: ""
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.confidence || 0) - Number(left.confidence || 0) || titleCollator.compare(left.targetTitle, right.targetTitle))
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
