const entryOwners = new WeakMap();

export function beginWritingEntryContext({ state = {}, writingState, getVaultPath, parseWritingBasketIds, renderWritingPanel }) {
  const owner = {};
  entryOwners.set(writingState, owner);
  const scope = state.noteMoveVaultScope;
  let vaultPath = getVaultPath();
  const projectKey = () => JSON.stringify([writingState.project?.id || "", writingState.projectOpenRevision]);
  const project = projectKey();
  const snapshot = () => JSON.stringify([projectKey(), parseWritingBasketIds()]);
  const context = snapshot();
  const ownsMetadata = () => entryOwners.get(writingState) === owner && state.noteMoveVaultScope === scope && projectKey() === project;
  const inWriting = () => !Object.hasOwn(state, "module") || state.module === "writing";
  const vaultCurrent = () => (!vaultPath || getVaultPath() === vaultPath)
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain && !state.unresolvedNoteMove;
  const isCurrent = () => ownsMetadata() && snapshot() === context && inWriting() && vaultCurrent();
  return {
    isCurrent,
    async waitForStartup(ownsThemeRequest = () => true) {
      if (!isCurrent()) return false;
      writingState.loadingProjects = true;
      if (ownsThemeRequest()) writingState.loadingThemeIndexes = true;
      renderWritingPanel();
      try {
        const connected = await state.retryStartupConnection?.();
        if (connected !== true || state.appStartupPending || state.appStartupError || !isCurrent()) return false;
        // First startup resolves an unknown path; an actual vault switch changes scope.
        vaultPath = getVaultPath();
        return true;
      } catch {
        // Startup owns its connection error and retry feedback.
        return false;
      } finally {
        if (ownsMetadata()) {
          writingState.loadingProjects = false;
          if (ownsThemeRequest()) writingState.loadingThemeIndexes = false;
          if (inWriting() && vaultCurrent()) renderWritingPanel();
        }
      }
    }
  };
}
