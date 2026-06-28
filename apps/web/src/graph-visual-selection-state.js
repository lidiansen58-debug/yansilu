import {
  graphIsolatedSelectionKeyForItem
} from "./graph-isolated-queue.js";

export function graphThemeNoteIds(topic = {}) {
  return (Array.isArray(topic?.noteIds) ? topic.noteIds : [])
    .map((id) => String(id || "").trim())
    .filter(Boolean);
}

export function graphThemeSelectionKey(topic = {}, index = 0) {
  const raw = String(topic?.id || topic?.title || index).trim();
  return raw || `topic-${index}`;
}

export function graphIsolatedSelectionKey(note = {}, index = 0) {
  return graphIsolatedSelectionKeyForItem(note, index);
}

export function graphBridgeSelectionKey(gap = {}, index = 0) {
  const explicitId = String(gap?.id || "").trim();
  if (explicitId) return `id:${explicitId}`;
  const sourceId = String(gap?.noteIds?.[0] || gap?.sourceNoteId || "").trim();
  const targetId = String(gap?.targetNoteIds?.[0] || gap?.targetNoteId || "").trim();
  const title = String(gap?.title || gap?.noteTitles?.[0] || "").trim();
  return ["bridge", sourceId || title || "source", targetId || "no-target", String(index)].join("::");
}

export function graphNodeClass(noteType = "") {
  const type = String(noteType || "").trim().toLowerCase();
  if (type === "literature") return "is-literature";
  if (type === "fleeting") return "is-fleeting";
  if (type === "original" || type === "permanent") return "is-original";
  return "is-note";
}
