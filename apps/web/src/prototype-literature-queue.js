export const REQUIRED_LITERATURE_QUEUE_CITATION_FIELDS = ["sourceTitle", "authors", "year", "locator", "identifier"];

export function hasRequiredLiteratureCitation(citation = {}, { normalizeFieldText = String } = {}) {
  return REQUIRED_LITERATURE_QUEUE_CITATION_FIELDS.every((key) => Boolean(normalizeFieldText(citation?.[key])));
}

export function literatureQueueLaneForNote(
  note,
  {
    literatureTemplateSectionLabelCandidates = () => [],
    normalizeFieldText = String,
    parseLiteratureWorkspace = () => ({})
  } = {}
) {
  const fields = parseLiteratureWorkspace(note?.body || "", { sectionLabelCandidates: literatureTemplateSectionLabelCandidates() });
  const hasParaphrase = Boolean(normalizeFieldText(fields.paraphrase));
  const hasOriginalText = Boolean(normalizeFieldText(fields.originalText));
  const hasJudgmentSeed = Boolean(normalizeFieldText(fields.supportsJudgment));
  const hasQuestion = Boolean(normalizeFieldText(fields.question));
  const hasSource = hasOriginalText && hasRequiredLiteratureCitation(fields.citation, { normalizeFieldText });
  if (!hasSource) return "refine";
  if (!hasParaphrase) return "pending";
  if (!hasJudgmentSeed && !hasQuestion) return "refine";
  return "ready";
}

export function rankedLiteratureQueueNotes(notes = [], deps = {}) {
  const priority = { pending: 0, refine: 1, ready: 2 };
  return (Array.isArray(notes) ? notes : [])
    .map((note) => ({ note, lane: literatureQueueLaneForNote(note, deps) }))
    .sort((a, b) => {
      const laneDiff = (priority[a.lane] ?? 99) - (priority[b.lane] ?? 99);
      if (laneDiff) return laneDiff;
      const aTime = Date.parse(a.note?.updatedAt || 0) || 0;
      const bTime = Date.parse(b.note?.updatedAt || 0) || 0;
      if (bTime !== aTime) return bTime - aTime;
      return String(a.note?.title || a.note?.id || "").localeCompare(String(b.note?.title || b.note?.id || ""), "zh-CN");
    });
}

export function preferredLiteratureQueueNoteId(
  noteIds = [],
  { targetLane = "" } = {},
  { rankedLiteratureQueueNotes, writingNoteById } = {}
) {
  const notes = noteIds.map((id) => writingNoteById(id)).filter(Boolean);
  const ranked = rankedLiteratureQueueNotes(notes);
  const match = targetLane ? ranked.find((item) => item.lane === targetLane) : ranked[0];
  return match?.note?.id || String(noteIds[0] || "").trim();
}
