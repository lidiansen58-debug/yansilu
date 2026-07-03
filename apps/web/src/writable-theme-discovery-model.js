import { uniqueStrings } from "./prototype-collection-utils.js";
import {
  buildThemeIndexSuggestionFromRelationCluster,
  THEME_INDEX_MIN_NOTE_COUNT
} from "./theme-index-entry-model.js";

const WEAK_RELATION_TYPES = new Set(["markdown_link", "wikilink", "same_topic_weak"]);
const BLOCKED_STATUSES = new Set(["dismissed", "archived", "rejected", "ignored"]);
const MAX_SUGGESTION_NOTE_COUNT = 18;

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function noteIdOf(note = null) {
  return cleanText(note?.id || note?.noteId || note?.note_id);
}

function relationEndpoint(edge = {}, side = "from") {
  return side === "from"
    ? cleanText(edge?.fromNoteId || edge?.from_note_id || edge?.sourceNoteId || edge?.source_note_id)
    : cleanText(edge?.toNoteId || edge?.to_note_id || edge?.targetNoteId || edge?.target_note_id);
}

function relationType(edge = {}) {
  return cleanText(edge?.relationType || edge?.relation_type || edge?.type || "associated_with").toLowerCase();
}

function relationCountsForCluster(noteIds = [], relations = []) {
  const noteSet = new Set(noteIds);
  return (Array.isArray(relations) ? relations : []).filter((edge) => {
    const from = relationEndpoint(edge, "from");
    const to = relationEndpoint(edge, "to");
    return from && to && noteSet.has(from) && noteSet.has(to);
  }).length;
}

function usableRelation(edge = {}, noteSet = new Set()) {
  const from = relationEndpoint(edge, "from");
  const to = relationEndpoint(edge, "to");
  if (!from || !to || from === to || !noteSet.has(from) || !noteSet.has(to)) return false;
  const status = cleanText(edge?.status || "confirmed").toLowerCase();
  if (status && BLOCKED_STATUSES.has(status)) return false;
  return !WEAK_RELATION_TYPES.has(relationType(edge));
}

function tagsForNote(note = {}, parseTags = () => []) {
  const explicit = Array.isArray(note?.tags) ? note.tags : [];
  const tags = explicit.length ? explicit : parseTags(String(note?.body || ""));
  return uniqueStrings(tags).slice(0, 8);
}

function titleWords(note = {}) {
  const text = cleanText(`${note?.title || ""} ${note?.thesis || ""}`);
  return uniqueStrings(text.split(/[^\u4e00-\u9fa5A-Za-z0-9_-]+/u))
    .filter((word) => word.length >= 2 && word.length <= 18)
    .slice(0, 12);
}

function clusterKey(noteIds = []) {
  return uniqueStrings(noteIds).sort().join("|");
}

function overlapRatio(left = [], right = []) {
  const a = new Set(uniqueStrings(left));
  const b = new Set(uniqueStrings(right));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  a.forEach((id) => {
    if (b.has(id)) overlap += 1;
  });
  return overlap / Math.min(a.size, b.size);
}

function existingThemeNoteIds(indexCard = {}) {
  return uniqueStrings(
    indexCard?.item_note_ids ||
    indexCard?.noteIds ||
    (Array.isArray(indexCard?.items) ? indexCard.items.map((item) => item?.note_id || item?.noteId) : [])
  );
}

function componentClusters(notes = [], relations = []) {
  const noteIds = notes.map(noteIdOf).filter(Boolean);
  const noteSet = new Set(noteIds);
  const adjacency = new Map(noteIds.map((id) => [id, new Set()]));
  (Array.isArray(relations) ? relations : []).forEach((edge) => {
    if (!usableRelation(edge, noteSet)) return;
    const from = relationEndpoint(edge, "from");
    const to = relationEndpoint(edge, "to");
    adjacency.get(from)?.add(to);
    adjacency.get(to)?.add(from);
  });
  const seen = new Set();
  const clusters = [];
  noteIds.forEach((startId) => {
    if (seen.has(startId)) return;
    const queue = [startId];
    seen.add(startId);
    const ids = [];
    while (queue.length) {
      const id = queue.shift();
      ids.push(id);
      adjacency.get(id)?.forEach((nextId) => {
        if (!seen.has(nextId)) {
          seen.add(nextId);
          queue.push(nextId);
        }
      });
    }
    if (ids.length >= THEME_INDEX_MIN_NOTE_COUNT) {
      clusters.push({
        noteIds: ids,
        source: "relations",
        reason: `这些笔记之间已经有 ${relationCountsForCluster(ids, relations)} 条本地关系，适合先作为可写主题建议检查。`
      });
    }
  });
  return clusters;
}

function bucketClusters(notes = [], getKeys = () => [], source = "signals", label = "共同信号") {
  const buckets = new Map();
  notes.forEach((note) => {
    const id = noteIdOf(note);
    if (!id) return;
    getKeys(note).forEach((key) => {
      const cleanKey = cleanText(key);
      if (!cleanKey) return;
      if (!buckets.has(cleanKey)) buckets.set(cleanKey, []);
      buckets.get(cleanKey).push(id);
    });
  });
  return [...buckets.entries()]
    .filter(([, ids]) => uniqueStrings(ids).length >= THEME_INDEX_MIN_NOTE_COUNT)
    .map(([key, ids]) => ({
      noteIds: uniqueStrings(ids),
      source,
      titleSeed: key,
      reason: `这些笔记共享“${key}”这个${label}，可以先作为可写主题建议核对。`
    }));
}

function aiSupplementForCluster(noteIds = [], aiTopicCandidates = []) {
  let best = null;
  let bestScore = 0;
  (Array.isArray(aiTopicCandidates) ? aiTopicCandidates : []).forEach((topic) => {
    const topicNoteIds = uniqueStrings(topic?.noteIds || topic?.note_ids || []);
    const score = overlapRatio(noteIds, topicNoteIds);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  });
  return bestScore >= 0.6 ? best : null;
}

function normalizeCluster(cluster = {}, context = {}) {
  const {
    noteById = () => null,
    relations = [],
    aiTopicCandidates = []
  } = context;
  const noteIds = uniqueStrings(cluster.noteIds);
  const aiTopic = aiSupplementForCluster(noteIds, aiTopicCandidates);
  const relationCount = relationCountsForCluster(noteIds, relations);
  const localTitle = cleanText(cluster.titleSeed)
    ? `${cleanText(cluster.titleSeed)}的可写主题建议`
    : "";
  const suggestion = buildThemeIndexSuggestionFromRelationCluster({
    noteIds,
    title: cleanText(aiTopic?.title) || localTitle,
    relationCount,
    noteById
  });
  const centralQuestion = cleanText(aiTopic?.centralQuestion || aiTopic?.central_question) || suggestion.centralQuestion;
  const membershipReason = cleanText(aiTopic?.rationale || aiTopic?.summary) || cluster.reason || suggestion.thesis;
  const key = clusterKey(noteIds);
  return {
    id: `suggested-theme:${key}`,
    key,
    kind: "suggestion",
    status: "suggested",
    source: cluster.source || "local_rules",
    sourceLabel: aiTopic ? "本地规则 + AI 命名建议" : "本地规则建议",
    aiSupplemented: Boolean(aiTopic),
    canSave: suggestion.canCreate,
    noteIds,
    title: suggestion.title,
    centralQuestion,
    summary: suggestion.summary,
    thesis: suggestion.thesis,
    threeLineSummary: [
      `主题问题：${centralQuestion}`,
      suggestion.threeLineSummary?.[1] || `关键永久笔记：${noteIds.join("、")}`,
      suggestion.threeLineSummary?.[2] || suggestion.nextStep
    ],
    membershipReason,
    relationCount,
    items: suggestion.items.map((item) => ({
      ...item,
      rationale: item.rationale || membershipReason
    }))
  };
}

function rankSuggestion(item = {}) {
  const countScore = Math.min(8, item.noteIds.length) * 10;
  const relationScore = Math.min(8, Number(item.relationCount || 0)) * 8;
  const aiScore = item.aiSupplemented ? 12 : 0;
  const sourceScore = item.source === "relations" ? 16 : item.source === "tags" ? 8 : 3;
  return countScore + relationScore + aiScore + sourceScore;
}

export function discoverWritableThemeSuggestions({
  notes = [],
  relations = [],
  existingThemeIndexes = [],
  ignoredSuggestionKeys = [],
  aiTopicCandidates = [],
  parseTags = () => [],
  noteById = () => null,
  limit = 6
} = {}) {
  const cleanNotes = (Array.isArray(notes) ? notes : [])
    .filter((note) => noteIdOf(note))
    .slice(0, 200);
  const ignored = new Set(uniqueStrings(ignoredSuggestionKeys));
  const existingThemes = (Array.isArray(existingThemeIndexes) ? existingThemeIndexes : []).map(existingThemeNoteIds).filter((ids) => ids.length);
  const rawClusters = [
    ...componentClusters(cleanNotes, relations),
    ...bucketClusters(cleanNotes, (note) => tagsForNote(note, parseTags), "tags", "标签"),
    ...bucketClusters(cleanNotes, titleWords, "title_terms", "题名/判断信号")
  ];
  const byKey = new Map();
  rawClusters.forEach((cluster) => {
    const noteIds = uniqueStrings(cluster.noteIds);
    if (noteIds.length < THEME_INDEX_MIN_NOTE_COUNT || noteIds.length > MAX_SUGGESTION_NOTE_COUNT) return;
    if (ignored.has(clusterKey(noteIds))) return;
    if (existingThemes.some((ids) => overlapRatio(noteIds, ids) >= 0.9)) return;
    const normalized = normalizeCluster(cluster, {
      noteById,
      relations,
      aiTopicCandidates
    });
    const existing = byKey.get(normalized.key);
    if (!existing || rankSuggestion(normalized) > rankSuggestion(existing)) byKey.set(normalized.key, normalized);
  });
  return [...byKey.values()]
    .sort((a, b) => rankSuggestion(b) - rankSuggestion(a) || String(a.title).localeCompare(String(b.title), "zh-CN"))
    .slice(0, Math.max(1, Number(limit || 6)));
}

export function themeDiscoverySuggestionToCreatePayload(suggestion = {}, draft = {}, { directoryId = "" } = {}) {
  const title = cleanText(draft.title) || cleanText(suggestion.title);
  const centralQuestion = cleanText(draft.centralQuestion) || cleanText(suggestion.centralQuestion);
  const membershipReason = cleanText(draft.membershipReason) || cleanText(suggestion.membershipReason);
  const itemDrafts = Array.isArray(draft.items) ? draft.items : [];
  const itemDraftById = new Map(itemDrafts.map((item) => [cleanText(item.noteId), item]));
  const noteIds = uniqueStrings(suggestion.noteIds);
  return {
    directoryId: cleanText(directoryId),
    indexType: "topic",
    orderingStrategy: "discovered_suggestion",
    title,
    summary: cleanText(draft.summary) || `建议主题：${title}。中心问题：${centralQuestion}。为什么属于同一主题：${membershipReason}`,
    thesis: cleanText(draft.thesis) || membershipReason,
    threeLineSummary: [
      `主题问题：${centralQuestion}`,
      `关键永久笔记：${noteIds.join("、")}`,
      cleanText(draft.nextStep) || suggestion.threeLineSummary?.[2] || "下一步可以先确认这组笔记是否足以形成文章提纲。"
    ],
    centralQuestion,
    noteIds,
    items: noteIds.map((noteId, index) => {
      const original = (Array.isArray(suggestion.items) ? suggestion.items : []).find((item) => item.noteId === noteId) || {};
      const edited = itemDraftById.get(noteId) || {};
      return {
        noteId,
        shortLabel: cleanText(edited.shortLabel) || cleanText(original.shortLabel) || noteId,
        rationale: cleanText(edited.rationale) || cleanText(original.rationale) || membershipReason,
        order: index + 1
      };
    })
  };
}
