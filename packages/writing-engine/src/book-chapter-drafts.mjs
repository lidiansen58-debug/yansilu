import { getNoteById } from "../../domain/src/index.mjs";

export function bookChapters(structure = {}) {
  return (structure.parts || []).flatMap((part) => part.chapters || []);
}

export function hasBookChapterDrafts(structure = {}) {
  return bookChapters(structure).some((chapter) => chapter.draft_note_id);
}

export function preserveBookChapterDrafts(input = {}, existing = {}) {
  const drafts = new Map(bookChapters(existing).map((chapter) => [chapter.id, chapter.draft_note_id]));
  if (!input || typeof input !== "object" || !Array.isArray(input.parts)) return input;
  return {
    ...input,
    parts: input.parts.map((part) => ({
      ...part,
      chapters: (part.chapters || []).map((chapter) => {
        const draftId = drafts.get(chapter.id);
        if (!draftId || Object.hasOwn(chapter, "draft_note_id") || Object.hasOwn(chapter, "draftNoteId")) return chapter;
        return { ...chapter, draft_note_id: draftId };
      })
    }))
  };
}

export async function validateBookChapterDrafts(vaultPath, structure = {}) {
  if (!hasBookChapterDrafts(structure)) return;
  const chapterIds = new Set();
  const draftIds = new Set();
  for (const chapter of bookChapters(structure)) {
    if (chapterIds.has(chapter.id)) throw new Error(`duplicate book chapter id: ${chapter.id}`);
    chapterIds.add(chapter.id);
    const draftId = chapter.draft_note_id;
    if (!draftId) continue;
    if (draftIds.has(draftId)) throw new Error(`book chapters must use separate draft notes: ${draftId}`);
    draftIds.add(draftId);
    const note = await getNoteById(vaultPath, draftId);
    if (note.noteType !== "permanent") throw new Error(`book chapter draft must be a permanent note: ${draftId}`);
  }
}
