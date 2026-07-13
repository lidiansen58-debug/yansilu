const EMPTY_CHECKLIST = Object.freeze({
  items: [],
  counts: {
    isolatedNote: 0,
    broadTag: 0,
    missingRationale: 0,
    writableTopic: 0
  }
});

const BROAD_TAGS = new Set([
  "idea",
  "ideas",
  "note",
  "notes",
  "reading",
  "research",
  "topic",
  "thought",
  "thoughts",
  "writing",
  "写作",
  "学习",
  "想法",
  "思考",
  "文章",
  "方法",
  "概念",
  "研究",
  "知识",
  "笔记",
  "读书",
  "资料",
  "阅读",
  "问题",
  "项目"
]);

function cleanText(value = "") {
  return String(value || "").trim();
}

function noteTitle(note = null, fallback = "未命名笔记") {
  return cleanText(note?.title) || cleanText(note?.name) || fallback;
}

function isPermanentNote(note = null, deps = {}) {
  const { typeFromFolder = () => "" } = deps;
  const type = cleanText(note?.noteType || note?.note_type || (note?.folderId ? typeFromFolder(note.folderId) : "")).toLowerCase();
  return type === "permanent" || type === "original";
}

function activeRelation(relation = null) {
  const status = cleanText(relation?.status || "confirmed").toLowerCase();
  if (["dismissed", "archived", "rejected", "ignored"].includes(status)) return false;
  const type = cleanText(relation?.relationType || relation?.relation_type || relation?.type).toLowerCase();
  return !["markdown_link", "wikilink", "same_topic_weak"].includes(type);
}

function relationEndpoint(relation = null, side = "source") {
  return side === "source"
    ? cleanText(relation?.sourceNoteId || relation?.source_note_id || relation?.fromNoteId || relation?.from_note_id)
    : cleanText(relation?.targetNoteId || relation?.target_note_id || relation?.toNoteId || relation?.to_note_id);
}

function relationRationale(relation = null) {
  const rationale = cleanText(relation?.rationale || relation?.reason || relation?.why || relation?.description || relation?.aiRationale || relation?.ai_rationale);
  if (/^待补一句关系理由/.test(rationale)) return "";
  return rationale;
}

function explicitRelationCountForNote(noteId = "", relations = []) {
  const cleanId = cleanText(noteId);
  if (!cleanId) return 0;
  return (Array.isArray(relations) ? relations : []).filter((relation) => {
    if (!activeRelation(relation)) return false;
    return relationEndpoint(relation, "source") === cleanId || relationEndpoint(relation, "target") === cleanId;
  }).length;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function noteExplicitRelationCount(note = null) {
  const outgoingLinks = Array.isArray(note?.outgoingLinks) ? note.outgoingLinks : Array.isArray(note?.outgoing_links) ? note.outgoing_links : null;
  const backlinks = Array.isArray(note?.backlinks) ? note.backlinks : Array.isArray(note?.incomingLinks) ? note.incomingLinks : Array.isArray(note?.incoming_links) ? note.incoming_links : null;
  if (outgoingLinks || backlinks) return [...(outgoingLinks || []), ...(backlinks || [])].filter((link) => activeRelation(link)).length;
  const candidates = [
    note?.explicitRelationCount,
    note?.explicit_relation_count,
    note?.semanticRelationCount,
    note?.semantic_relation_count,
    note?.networkRelationCount,
    note?.network_relation_count,
    note?.relationCount,
    note?.relation_count
  ];
  for (const value of candidates) {
    const number = finiteNumber(value);
    if (number !== null) return Math.max(0, number);
  }
  return null;
}

function noteTags(note = null) {
  const explicit = Array.isArray(note?.tags) ? note.tags : Array.isArray(note?.tagNames) ? note.tagNames : [];
  const body = cleanText(note?.body || note?.content || note?.markdown);
  const inline = [...body.matchAll(/(^|\s)#([\p{L}\p{N}_/-]{1,40})/gu)].map((match) => match[2]);
  return [...explicit, ...inline]
    .map((tag) => cleanText(tag).replace(/^#/, ""))
    .filter(Boolean);
}

function themeNoteIds(theme = null) {
  const ids = Array.isArray(theme?.item_note_ids)
    ? theme.item_note_ids
    : Array.isArray(theme?.noteIds)
      ? theme.noteIds
      : Array.isArray(theme?.items)
        ? theme.items.map((item) => item?.note_id || item?.noteId)
        : [];
  return ids.map((item) => cleanText(item)).filter(Boolean);
}

function themeNoteCount(theme = null) {
  const explicit = finiteNumber(theme?.noteCount || theme?.note_count);
  return explicit !== null ? explicit : themeNoteIds(theme).length;
}

function themeUpdatedAt(theme = null) {
  const raw = theme?.updated_at || theme?.updatedAt || theme?.created_at || theme?.createdAt || "";
  const time = raw ? Date.parse(raw) : 0;
  return Number.isFinite(time) ? time : 0;
}

function itemWithAiSuggestion(item = null, aiSuggestions = []) {
  if (!item) return null;
  const match = (Array.isArray(aiSuggestions) ? aiSuggestions : []).find((suggestion) => {
    const type = cleanText(suggestion?.type || suggestion?.kind);
    if (type && type !== item.type) return false;
    const noteId = cleanText(suggestion?.noteId || suggestion?.note_id);
    const themeId = cleanText(suggestion?.themeId || suggestion?.theme_id);
    if (item.noteId && noteId && noteId !== item.noteId) return false;
    if (item.themeId && themeId && themeId !== item.themeId) return false;
    return cleanText(suggestion?.summary || suggestion?.advice || suggestion?.message);
  });
  if (!match) return item;
  return {
    ...item,
    aiSuggestion: cleanText(match.summary || match.advice || match.message)
  };
}

function firstIsolatedNoteItem(permanentNotes = [], relations = [], relationsReady = false, deps = {}) {
  const { relationNetworkStatusForNote = () => "" } = deps;
  const note = permanentNotes.find((candidate) => {
    const status = cleanText(relationNetworkStatusForNote(candidate)).toLowerCase();
    if (status === "isolated") return true;
    if (status === "connected") return false;
    const relationCount = noteExplicitRelationCount(candidate);
    if (relationCount !== null) return relationCount === 0;
    if (relationsReady) return explicitRelationCountForNote(candidate?.id, relations) === 0;
    return false;
  });
  if (!note) return null;
  return {
    id: `isolated-note:${cleanText(note.id)}`,
    type: "isolatedNote",
    title: "孤立笔记",
    objectTitle: noteTitle(note),
    summary: "补一条关系，让这条永久笔记进入卡片盒网络。",
    meta: "本地规则：没有关联",
    action: "review-connect-isolated",
    actionLabel: "补一条关系",
    noteId: cleanText(note.id),
    source: "local-rule"
  };
}

function firstBroadTagItem(permanentNotes = []) {
  const tagUses = new Map();
  for (const note of permanentNotes) {
    for (const tag of new Set(noteTags(note))) {
      const key = tag.toLowerCase();
      const current = tagUses.get(key) || { tag, notes: [] };
      current.notes.push(note);
      tagUses.set(key, current);
    }
  }
  const noteCount = permanentNotes.length || 1;
  const broad = [...tagUses.values()]
    .filter((entry) => {
      const lower = entry.tag.toLowerCase();
      const useRatio = entry.notes.length / noteCount;
      return BROAD_TAGS.has(lower) || entry.notes.length >= 5 || (entry.notes.length >= 3 && useRatio >= 0.45);
    })
    .sort((a, b) => b.notes.length - a.notes.length || a.tag.localeCompare(b.tag))[0];
  if (!broad) return null;
  const note = broad.notes[0] || null;
  return {
    id: `broad-tag:${broad.tag}`,
    type: "broadTag",
    title: "标签太宽",
    objectTitle: `#${broad.tag}`,
    summary: "改成更具体标签，避免一组笔记只被大词粗略归类。",
    meta: `本地规则：覆盖 ${broad.notes.length} 条笔记`,
    action: "review-refine-tag",
    actionLabel: "改成更具体标签",
    noteId: cleanText(note?.id),
    tag: broad.tag,
    source: "local-rule"
  };
}

function firstMissingRationaleItem(relations = [], noteMap = new Map()) {
  const relation = (Array.isArray(relations) ? relations : []).find((candidate) => activeRelation(candidate) && !relationRationale(candidate));
  if (!relation) return null;
  const sourceId = relationEndpoint(relation, "source");
  const targetId = relationEndpoint(relation, "target");
  const sourceTitle = noteTitle(noteMap.get(sourceId), sourceId || "来源笔记");
  const targetTitle = noteTitle(noteMap.get(targetId), targetId || "目标笔记");
  return {
    id: `missing-rationale:${sourceId}:${targetId}`,
    type: "missingRationale",
    title: "关系缺理由",
    objectTitle: `${sourceTitle} -> ${targetTitle}`,
    summary: "补一句理由，让这条关系可复查、可写作。",
    meta: "本地规则：关系没有 rationale",
    action: "review-complete-rationale",
    actionLabel: "补一句理由",
    noteId: sourceId,
    targetNoteId: targetId,
    source: "local-rule"
  };
}

function firstWritableTopicItem(themeIndexes = []) {
  const theme = (Array.isArray(themeIndexes) ? themeIndexes : [])
    .filter((candidate) => cleanText(candidate?.id || candidate?.title) && themeNoteCount(candidate) >= 3)
    .sort((a, b) => {
      const countDiff = themeNoteCount(b) - themeNoteCount(a);
      if (countDiff) return countDiff;
      return themeUpdatedAt(b) - themeUpdatedAt(a);
    })[0];
  if (!theme) return null;
  const themeId = cleanText(theme.id);
  return {
    id: `writable-topic:${themeId || noteTitle(theme, "topic")}`,
    type: "writableTopic",
    title: "主题可写作",
    objectTitle: noteTitle(theme, "可写主题"),
    summary: "生成提纲，把已聚合的主题推进到写作中心。",
    meta: `本地规则：已有 ${themeNoteCount(theme)} 条相关笔记`,
    action: "review-generate-outline",
    actionLabel: "生成提纲",
    themeId,
    noteIds: themeNoteIds(theme),
    source: "local-rule"
  };
}

export function buildReviewChecklist({
  notes = [],
  relations = [],
  themeIndexes = [],
  relationsReady = false,
  aiSuggestions = []
} = {}, deps = {}) {
  const permanentNotes = (Array.isArray(notes) ? notes : []).filter((note) => isPermanentNote(note, deps));
  const noteMap = new Map(permanentNotes.map((note) => [cleanText(note.id), note]));
  const candidates = [
    firstIsolatedNoteItem(permanentNotes, relations, relationsReady, deps),
    firstBroadTagItem(permanentNotes),
    firstMissingRationaleItem(relations, noteMap),
    firstWritableTopicItem(themeIndexes)
  ];
  const items = candidates.map((item) => itemWithAiSuggestion(item, aiSuggestions)).filter(Boolean);
  if (!items.length) return { ...EMPTY_CHECKLIST, items: [] };
  return {
    items,
    counts: {
      isolatedNote: items.filter((item) => item.type === "isolatedNote").length,
      broadTag: items.filter((item) => item.type === "broadTag").length,
      missingRationale: items.filter((item) => item.type === "missingRationale").length,
      writableTopic: items.filter((item) => item.type === "writableTopic").length
    }
  };
}
