function directoryForMarkdownPath(value = "") {
  const path = String(value ?? "").replace(/\\/g, "/");
  if (!path) return null;
  return path.slice(0, path.lastIndexOf("/") + 1);
}

export function captureAssetInsertionContext(host, value) {
  const tab = host.activeTab();
  const note = host.activeNote();
  const noteId = note?.id || "";
  // A title save can rename the file; asset links depend on its directory.
  const directory = directoryForMarkdownPath(note?.markdownPath);
  const folderId = note?.folderId || "";
  const vaultPath = host.vaultScope?.() || "";
  const vaultScope = host.state?.noteMoveVaultScope;
  return {
    noteId,
    vaultPath,
    isCurrent() {
      const state = host.state || {};
      return Boolean(noteId && tab)
        && host.activeTab() === tab
        && host.activeNote()?.id === noteId
        && directoryForMarkdownPath(host.activeNote()?.markdownPath) === directory
        && (host.activeNote()?.folderId || "") === folderId
        && (host.vaultScope?.() || "") === vaultPath
        && state.noteMoveVaultScope === vaultScope
        && !state.noteMoveVaultSwitching
        && !state.noteMoveVaultUncertain
        && state.unresolvedNoteMove?.noteId !== noteId
        && host.getEditorValue() === value;
    }
  };
}
