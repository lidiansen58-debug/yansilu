import { sourceNoteReference } from "./note-persistence-policy.js";

export function bodyLinkTokenForNote(note = {}) {
  return sourceNoteReference(note.title, note.id);
}

// Reuse the insertion action to replace the whole link under the cursor.
export function bodyLinkRangeAtSelection(body = "", selection = null) {
  if (!selection || !Number.isFinite(selection.from) || !Number.isFinite(selection.to)) return null;
  const from = Math.min(selection.from, selection.to), to = Math.max(selection.from, selection.to);
  for (const match of String(body).matchAll(/\[\[([^\[\]\n]+)\]\]/g)) {
    const start = match.index, end = start + match[0].length;
    if (from >= start && to <= end && (from < end || from !== to)) {
      return { from: start, to: end, raw: match[1] };
    }
  }
  return null;
}
