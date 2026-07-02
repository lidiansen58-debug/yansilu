import { explicitPermanentNoteRelations } from "./permanent-note-sidebar-model.js";

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

function relationStatus(note = null, deps = {}) {
  const { relationNetworkStatusForNote = () => "" } = deps;
  return cleanText(relationNetworkStatusForNote(note)).toLowerCase();
}

function explicitRelationCountForNote(noteId = "", relations = []) {
  const cleanId = cleanText(noteId);
  if (!cleanId) return 0;
  return (Array.isArray(relations) ? relations : []).filter((relation) => {
    const status = cleanText(relation?.status || "confirmed").toLowerCase();
    const type = cleanText(relation?.relationType || relation?.relation_type || relation?.type).toLowerCase();
    if (status && ["dismissed", "archived", "rejected", "ignored"].includes(status)) return false;
    if (["markdown_link", "wikilink", "same_topic_weak"].includes(type)) return false;
    return cleanText(relation?.sourceNoteId || relation?.source_note_id || relation?.fromNoteId || relation?.from_note_id) === cleanId ||
      cleanText(relation?.targetNoteId || relation?.target_note_id || relation?.toNoteId || relation?.to_note_id) === cleanId;
  }).length;
}

function isWeakRelationType(link = null) {
  const type = cleanText(link?.relationType || link?.relation_type || link?.type).toLowerCase();
  return ["markdown_link", "wikilink", "same_topic_weak"].includes(type);
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function noteExplicitRelationCount(note = null) {
  const outgoingLinks = Array.isArray(note?.outgoingLinks) ? note.outgoingLinks : Array.isArray(note?.outgoing_links) ? note.outgoing_links : null;
  const backlinks = Array.isArray(note?.backlinks) ? note.backlinks : Array.isArray(note?.incomingLinks) ? note.incomingLinks : Array.isArray(note?.incoming_links) ? note.incoming_links : null;
  if (outgoingLinks || backlinks) return explicitPermanentNoteRelations({ outgoingLinks, backlinks }).all.filter((link) => !isWeakRelationType(link)).length;
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

function themeNoteCount(theme = null) {
  const ids = Array.isArray(theme?.item_note_ids)
    ? theme.item_note_ids
    : Array.isArray(theme?.noteIds)
      ? theme.noteIds
      : Array.isArray(theme?.items)
        ? theme.items.map((item) => item?.note_id || item?.noteId).filter(Boolean)
        : [];
  return ids.length;
}

function themeUpdatedAt(theme = null) {
  const raw = theme?.updated_at || theme?.updatedAt || theme?.created_at || theme?.createdAt || "";
  const time = raw ? Date.parse(raw) : 0;
  return Number.isFinite(time) ? time : 0;
}

function firstLoadedTheme(themeIndexes = []) {
  const list = (Array.isArray(themeIndexes) ? themeIndexes : []).filter((item) => cleanText(item?.id));
  if (!list.length) return null;
  return [...list].sort((a, b) => {
    const bNoteCount = themeNoteCount(b);
    const aNoteCount = themeNoteCount(a);
    if (bNoteCount !== aNoteCount) return bNoteCount - aNoteCount;
    const bTitleScore = cleanText(b?.title) ? 1 : 0;
    const aTitleScore = cleanText(a?.title) ? 1 : 0;
    if (bTitleScore !== aTitleScore) return bTitleScore - aTitleScore;
    return themeUpdatedAt(b) - themeUpdatedAt(a);
  })[0];
}

export function buildTodayOrganizingState({
  notes = [],
  relations = [],
  themeIndexes = [],
  relationsReady = false
} = {}, deps = {}) {
  const permanentNotes = (Array.isArray(notes) ? notes : []).filter((note) => isPermanentNote(note, deps));
  const isolatedNotes = permanentNotes.filter((note) => {
    const status = relationStatus(note, deps);
    if (status === "isolated") return true;
    if (status === "connected") return false;
    const noteRelationCount = noteExplicitRelationCount(note);
    if (noteRelationCount !== null) return noteRelationCount === 0;
    if (relationsReady) return explicitRelationCountForNote(note?.id, relations) === 0;
    return false;
  });
  const firstIsolated = isolatedNotes[0] || null;
  const loadedTheme = firstLoadedTheme(themeIndexes);
  const writingReadyNotes = permanentNotes.filter((note) => {
    const thesis = cleanText(note?.thesis);
    const summary = Array.isArray(note?.threeLineSummary) ? note.threeLineSummary.filter((item) => cleanText(item)) : [];
    const status = cleanText(note?.distillationStatus || note?.distillation_status || note?.authorshipStatus || note?.authorship_status).toLowerCase();
    return thesis && summary.length >= 3 && (!status || ["confirmed", "complete", "approved"].includes(status));
  });

  return {
    permanentCount: permanentNotes.length,
    isolatedCount: isolatedNotes.length,
    firstIsolated: firstIsolated
      ? {
          id: cleanText(firstIsolated.id),
          title: noteTitle(firstIsolated),
          relationCount: explicitRelationCountForNote(firstIsolated.id, relations)
        }
      : null,
    themeCount: (Array.isArray(themeIndexes) ? themeIndexes : []).length,
    firstTheme: loadedTheme
      ? {
          id: cleanText(loadedTheme.id),
          title: noteTitle(loadedTheme, "可写主题"),
          noteCount: themeNoteCount(loadedTheme)
        }
      : null,
    writingReadyCount: writingReadyNotes.length,
    firstWritingReady: writingReadyNotes[0]
      ? {
          id: cleanText(writingReadyNotes[0].id),
          title: noteTitle(writingReadyNotes[0])
        }
      : null
  };
}
