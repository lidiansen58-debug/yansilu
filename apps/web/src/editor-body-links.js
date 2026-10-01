import { sourceNoteReference } from "./note-persistence-policy.js";
import { wikilinkLabelFromRaw } from "./editor-link-picker.js";
import { markdownCharacterIsEscaped, selectionTouchesMarkdownCode } from "./markdown-code-context.js";

export function bodyLinkTextForRemoval(existing = {}) {
  const raw = String(existing.raw || "");
  const separator = raw.indexOf("|");
  const label = separator >= 0 ? raw.slice(separator + 1).trim() : existing.noteTitle || wikilinkLabelFromRaw(raw);
  return String(label || existing.noteTitle || "未命名笔记")
    .replace(/[\\`*_\[\]<>#~|+=-]/g, "\\$&")
    .replace(/^(\d{1,9})([.)])(?=\s)/, "$1\\$2");
}

export function bodyLinkTokenForNote(note = {}, existing = null, selectedLabel = "") {
  // Confirming the current target must not discard a path, anchor or custom label.
  if (existing?.noteId && existing.noteId === note.id) return `[[${existing.raw}]]`;
  const separator = String(existing?.raw || "").indexOf("|");
  const alias = separator >= 0 ? existing.raw.slice(separator + 1).trim() : "";
  if (alias && alias !== String(existing?.noteTitle || "").trim()) {
    return sourceNoteReference(alias, note.id);
  }
  const token = sourceNoteReference(!existing && selectedLabel ? selectedLabel : note.title, note.id);
  return !existing && selectedLabel
    ? selectedLabel.match(/^\s*/)[0] + token + selectedLabel.match(/\s*$/)[0]
    : token;
}

export function bodyLinkLabelAtSelection(body = "", selection = null) {
  if (!selection || !Number.isFinite(selection.from) || !Number.isFinite(selection.to)) return "";
  const from = Math.min(selection.from, selection.to), to = Math.max(selection.from, selection.to);
  if (from < 0 || to > String(body).length || from === to) return "";
  const selected = String(body).slice(from, to);
  // Only plain, single-line prose is suitable as a display label.
  return !selected.trim() || /[\r\n\[\]|`*]/.test(selected) ? "" : selected;
}

// Reuse the insertion action to replace the whole link under the cursor.
export function bodyLinkRangeAtSelection(body = "", selection = null) {
  if (!selection || !Number.isFinite(selection.from) || !Number.isFinite(selection.to)) return null;
  if (selectionTouchesMarkdownCode(body, selection)) return null;
  const from = Math.min(selection.from, selection.to), to = Math.max(selection.from, selection.to);
  for (const match of String(body).matchAll(/\[\[([^\[\]\n]+)\]\]/g)) {
    const start = match.index, end = start + match[0].length;
    if (markdownCharacterIsEscaped(String(body), start)) continue;
    if (from >= start && to <= end && (from < end || from !== to)) {
      return { from: start, to: end, raw: match[1] };
    }
  }
  return null;
}
