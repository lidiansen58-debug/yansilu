export function writingScopeDirectoryIdsForRuntime(state = {}, deps = {}) {
  const descendantDirectoryIds = deps.descendantDirectoryIds || ((id) => [id].filter(Boolean));
  const anchorId = state.selectedFolderId || state.browserRootId || "dir_original_default";
  return descendantDirectoryIds(anchorId);
}

export function writingCandidateNotesForRuntime(state = {}, deps = {}) {
  const writingScopeDirectoryIds = deps.writingScopeDirectoryIds || (() => writingScopeDirectoryIdsForRuntime(state, deps));
  const isWritingEligibleNote = deps.isWritingEligibleNote || (() => false);
  const scopedDirectoryIds = new Set(writingScopeDirectoryIds());
  return (Array.isArray(state.notes) ? state.notes : [])
    .filter((note) => scopedDirectoryIds.has(note.folderId) && isWritingEligibleNote(note))
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || 0) || 0;
      const bTime = Date.parse(b.updatedAt || 0) || 0;
      if (bTime !== aTime) return bTime - aTime;
      return String(a.title || a.id).localeCompare(String(b.title || b.id), "zh-CN");
    });
}
