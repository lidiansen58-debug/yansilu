function mapJson(value, transform, serialized = true) {
  if (typeof value !== "string") return transform(value);
  try {
    const parsed = JSON.parse(value);
    const next = transform(parsed);
    if (next === parsed) return value;
    return serialized ? JSON.stringify(next) : next;
  } catch {
    return value;
  }
}

function mapRevision(value, resolve, serialized = true) {
  return mapJson(value, revision => {
    if (!revision || typeof revision !== "object" || Array.isArray(revision)) return revision;
    const next = { ...revision };
    for (const key of ["sourceNoteIds", "source_note_ids"]) {
      if (Array.isArray(revision[key])) next[key] = revision[key].map(resolve);
    }
    return next;
  }, serialized);
}

export function remapImportedViewpointReferences(candidates = {}) {
  const permanent = Array.isArray(candidates.permanent) ? candidates.permanent : [];
  const literature = Array.isArray(candidates.literature) ? candidates.literature : [];
  const sources = Array.isArray(candidates.sources) ? candidates.sources : [];
  const canonicalIds = new Set([...permanent, ...literature, ...sources].map(note => note.id));
  const permanentSources = new Set(permanent.flatMap(note => (note.citations || []).map(citation => citation.source_id)));
  // A permanent note's quotation copy is not a second identity for the same old ID.
  const targets = [...permanent, ...literature.filter(note => !permanentSources.has(note.source_id))];
  const idMap = new Map();
  for (const note of targets) {
    const original = note.original_frontmatter || {};
    const oldIds = [original.id, ...(Array.isArray(original.yansilu_link_aliases) ? original.yansilu_link_aliases : [])];
    for (const value of oldIds) {
      const oldId = String(value || "").trim();
      if (!oldId || !note.id) continue;
      if ((idMap.has(oldId) && idMap.get(oldId) !== note.id) || (canonicalIds.has(oldId) && oldId !== note.id)) {
        idMap.set(oldId, null);
      } else {
        idMap.set(oldId, note.id);
      }
    }
  }
  const warnings = [...(candidates.warnings || [])];
  const mapped = permanent.map(note => {
    const ambiguous = new Set();
    const resolve = value => {
      if (typeof value !== "string") return value;
      const oldId = value.trim();
      if (idMap.has(oldId) && idMap.get(oldId) === null) ambiguous.add(oldId);
      if (canonicalIds.has(oldId)) return value;
      return idMap.get(oldId) || value;
    };
    const next = { ...note };
    for (const key of ["viewpoint_history", "viewpointHistory"]) {
      if (note[key] !== undefined) next[key] = mapJson(note[key], history =>
        Array.isArray(history) ? history.map(revision => {
          const mappedRevision = mapRevision(revision, resolve);
          return mappedRevision && typeof mappedRevision === "object" && !Array.isArray(mappedRevision)
            ? JSON.stringify(mappedRevision) : mappedRevision;
        }) : history, false);
    }
    for (const key of ["pending_viewpoint_revision", "pendingViewpointRevision"]) {
      if (note[key] !== undefined) next[key] = mapRevision(note[key], resolve, false);
    }
    for (const referenceId of ambiguous) {
      if (!warnings.some(warning => warning.code === "IMPORT_VIEWPOINT_REFERENCE_AMBIGUOUS" && warning.noteId === note.id && warning.referenceId === referenceId)) {
        warnings.push({ code: "IMPORT_VIEWPOINT_REFERENCE_AMBIGUOUS", noteId: note.id, referenceId, count: 1,
          message: `观点变化中的依据“${referenceId}”对应多条导入笔记，已保留原引用，请核对。` });
      }
    }
    return next;
  });
  return { ...candidates, permanent: mapped, warnings };
}
