import { explicitPermanentNoteRelations } from "./permanent-note-sidebar-model.js";
import { buildReviewChecklist } from "./review-checklist-model.js";

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

function materialNoteType(note = null, deps = {}) {
  const { typeFromFolder = () => "" } = deps;
  return cleanText(note?.noteType || note?.note_type || (note?.folderId ? typeFromFolder(note.folderId) : "")).toLowerCase();
}

function isPendingMaterialNote(note = null, deps = {}) {
  const type = materialNoteType(note, deps);
  if (type !== "fleeting" && type !== "literature") return false;
  const status = cleanText(note?.status || note?.processingStatus || note?.processing_status || note?.conversionStatus || note?.conversion_status).toLowerCase();
  if (!status) return true;
  return ["needs_processing", "pending", "needs_review", "draft", "paraphrased"].includes(status);
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

function themeNoteIds(theme = null) {
  const ids = Array.isArray(theme?.item_note_ids)
    ? theme.item_note_ids
    : Array.isArray(theme?.noteIds)
      ? theme.noteIds
      : Array.isArray(theme?.items)
        ? theme.items.map((item) => item?.note_id || item?.noteId).filter(Boolean)
        : [];
  return ids.map((item) => cleanText(item)).filter(Boolean);
}

function themeNoteCount(theme = null) {
  return themeNoteIds(theme).length;
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

function importOverviewPermanentCount(overview = null) {
  const count = Number(overview?.permanentCount || 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function firstImportRecommendedNote(overview = null) {
  if (importOverviewPermanentCount(overview) <= 0) return null;
  const recommended = Array.isArray(overview?.recommendedFirst) ? overview.recommendedFirst : [];
  return recommended.find((item) => cleanText(item?.noteId || item?.id)) || null;
}

function firstImportTheme(overview = null) {
  if (importOverviewPermanentCount(overview) <= 0) return null;
  const themes = Array.isArray(overview?.themeCandidates) ? overview.themeCandidates : [];
  return themes.find((item) => cleanText(item?.title) && themeNoteIds(item).length) || null;
}

function shouldUseImportRecommended(importRecommended = null, permanentNotes = [], isolatedNotes = [], relations = [], relationsReady = false, deps = {}) {
  const noteId = cleanText(importRecommended?.noteId || importRecommended?.id);
  if (!noteId) return false;
  const liveNote = permanentNotes.find((note) => cleanText(note?.id) === noteId) || null;
  if (!liveNote) return true;
  if (isolatedNotes.some((note) => cleanText(note?.id) === noteId)) return true;
  if (relationStatus(liveNote, deps) === "connected") return false;
  const noteRelationCount = noteExplicitRelationCount(liveNote);
  if (noteRelationCount !== null) return noteRelationCount === 0;
  if (relationsReady) return explicitRelationCountForNote(noteId, relations) === 0;
  return true;
}

function isLocalBlankPlaceholderNote(note = {}) {
  if (!note?.isLocalOnly) return false;
  if (cleanText(note.markdownPath || note.markdown_path)) return false;
  const title = cleanText(note.title || note.name).toLowerCase();
  if (title === "未命名笔记" || title === "untitled note" || title === "untitled") return true;
  const status = cleanText(note.status).toLowerCase();
  if (status && status !== "draft") return false;
  if (cleanText(note.thesis)) return false;
  if (Array.isArray(note.threeLineSummary) && note.threeLineSummary.some((line) => cleanText(line))) return false;
  const body = String(note.body || "").replace(/\r\n/g, "\n").trim();
  if (!body) return true;
  return !body.replace(/^#{1,6}\s+.*(?:\n|$)/u, "").trim();
}

export function buildTodayOrganizingState({
  notes = [],
  relations = [],
  themeIndexes = [],
  relationsReady = false,
  organizingOverview = null,
  reviewSuggestions = []
} = {}, deps = {}) {
  const allNotes = (Array.isArray(notes) ? notes : []).filter((note) => !isLocalBlankPlaceholderNote(note));
  const permanentNotes = allNotes.filter((note) => isPermanentNote(note, deps));
  const pendingMaterialNotes = allNotes
    .filter((note) => isPendingMaterialNote(note, deps))
    .sort((a, b) => {
      const priority = (note) => materialNoteType(note, deps) === "fleeting" ? 0 : 1;
      return priority(a) - priority(b);
    });
  const firstPendingMaterial = pendingMaterialNotes[0] || null;
  const importRecommended = firstImportRecommendedNote(organizingOverview);
  const importTheme = firstImportTheme(organizingOverview);
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
  const useImportRecommended = shouldUseImportRecommended(importRecommended, permanentNotes, isolatedNotes, relations, relationsReady, deps);
  const loadedTheme = firstLoadedTheme(themeIndexes);
  const selectedTheme = loadedTheme || importTheme;
  const writingReadyNotes = permanentNotes.filter((note) => {
    const thesis = cleanText(note?.thesis);
    const summary = Array.isArray(note?.threeLineSummary) ? note.threeLineSummary.filter((item) => cleanText(item)) : [];
    const status = cleanText(note?.distillationStatus || note?.distillation_status || note?.authorshipStatus || note?.authorship_status).toLowerCase();
    return thesis && summary.length >= 3 && (!status || ["confirmed", "complete", "approved"].includes(status));
  });
  const hasImportOverview = importOverviewPermanentCount(organizingOverview) > 0;

  return {
    isEmptyLibrary:
      permanentNotes.length === 0 &&
      pendingMaterialNotes.length === 0 &&
      !loadedTheme &&
      !importTheme &&
      !hasImportOverview,
    permanentCount: Math.max(permanentNotes.length, importOverviewPermanentCount(organizingOverview)),
    pendingMaterialCount: pendingMaterialNotes.length,
    firstPendingMaterial: firstPendingMaterial
      ? {
          id: cleanText(firstPendingMaterial.id),
          title: noteTitle(firstPendingMaterial),
          noteType: materialNoteType(firstPendingMaterial, deps),
          status: cleanText(firstPendingMaterial.status || firstPendingMaterial.processingStatus || firstPendingMaterial.conversionStatus)
        }
      : null,
    pendingMaterialItems: pendingMaterialNotes.slice(0, 3).map((note) => ({
      id: cleanText(note.id),
      title: noteTitle(note),
      noteType: materialNoteType(note, deps)
    })),
    isolatedCount: useImportRecommended ? Math.max(1, Number(organizingOverview?.isolatedCount || isolatedNotes.length || 1)) : isolatedNotes.length,
    firstIsolated: useImportRecommended
      ? {
          id: cleanText(importRecommended.noteId || importRecommended.id),
          title: noteTitle(importRecommended),
          relationCount: 0,
          source: "import"
        }
      : firstIsolated
      ? {
          id: cleanText(firstIsolated.id),
          title: noteTitle(firstIsolated),
          relationCount: explicitRelationCountForNote(firstIsolated.id, relations)
        }
      : null,
    themeCount: Math.max((Array.isArray(themeIndexes) ? themeIndexes : []).length, importTheme ? 1 : 0),
    firstTheme: selectedTheme
      ? {
          id: cleanText(selectedTheme.id),
          title: noteTitle(selectedTheme, "可写主题"),
          noteCount: themeNoteCount(selectedTheme),
          noteIds: themeNoteIds(selectedTheme),
          source: selectedTheme === importTheme ? "import" : "theme-index"
        }
      : null,
    writingReadyCount: writingReadyNotes.length,
    firstWritingReady: writingReadyNotes[0]
      ? {
          id: cleanText(writingReadyNotes[0].id),
          title: noteTitle(writingReadyNotes[0])
        }
      : null,
    reviewChecklist: buildReviewChecklist({ notes: allNotes, relations, themeIndexes, relationsReady, aiSuggestions: reviewSuggestions }, deps)
  };
}
