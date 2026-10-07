export function captureAssetInsertionContext(host, value) {
  const tab = host.activeTab();
  const note = host.activeNote();
  const noteId = note?.id || "";
  const markdownPath = note?.markdownPath || "";
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
        && (host.activeNote()?.markdownPath || "") === markdownPath
        && (host.vaultScope?.() || "") === vaultPath
        && state.noteMoveVaultScope === vaultScope
        && !state.noteMoveVaultSwitching
        && !state.noteMoveVaultUncertain
        && state.unresolvedNoteMove?.noteId !== noteId
        && host.getEditorValue() === value;
    }
  };
}
