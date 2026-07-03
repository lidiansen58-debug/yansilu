export function smartNotesDemoStartupNoteId({ result = {}, notes = [] } = {}) {
  const firstNoteId = String(result?.firstNoteId || "").trim();
  const guideById = firstNoteId
    ? (Array.isArray(notes) ? notes : []).find((note) => String(note?.id || "").trim() === firstNoteId)
    : null;
  if (guideById) return firstNoteId;
  const guideByTitle = (Array.isArray(notes) ? notes : []).find((note) =>
    /^00\s+从这里开始/.test(String(note?.title || "").trim())
  );
  return String(guideByTitle?.id || firstNoteId || "").trim();
}
