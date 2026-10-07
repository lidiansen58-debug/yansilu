export function portableNoteMetadata(cleaned = {}, original = {}) {
  const result = { ...cleaned };
  let authorship = original.authorship;
  if (typeof authorship === "string") {
    try { authorship = JSON.parse(authorship); } catch { authorship = null; }
  }
  if (authorship?.ai_assisted === true || original.ai_assisted === true) result.ai_assisted = true;
  const id = String(original.id || "").trim();
  const aliases = Array.isArray(original.yansilu_link_aliases) ? original.yansilu_link_aliases
    : typeof original.yansilu_link_aliases === "string" ? [original.yansilu_link_aliases.trim()] : [];
  if (id) result.yansilu_link_aliases = [...new Set([...aliases, id].filter(Boolean))];
  if (String(original.note_type || original.yansilu_note_type || "").toLowerCase() === "permanent") {
    result.yansilu_note_type = "permanent";
  }
  // The Markdown parser returns JSON objects as text; do not encode them a second time.
  for (const key of ["pending_viewpoint_revision", "pendingViewpointRevision"]) {
    if (typeof result[key] !== "string") continue;
    try {
      const revision = JSON.parse(result[key]);
      if (revision && typeof revision === "object" && !Array.isArray(revision)) result[key] = revision;
    } catch {}
  }
  return result;
}
