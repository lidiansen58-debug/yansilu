export async function runWritingScaffoldGeneration(deps, action) {
  const { writingState = {}, renderWritingPanel = () => {} } = deps;
  if (writingState.scaffoldGenerationPending) return null;
  writingState.scaffoldGenerationPending = true;
  try {
    return await action();
  } finally {
    writingState.scaffoldGenerationPending = false;
    renderWritingPanel();
  }
}

export function captureWritingScaffoldContext({ writingState, state = {}, getVaultPath = () => "" }, projectId) {
  const vaultPath = getVaultPath(), vaultScope = state.noteMoveVaultScope;
  const revision = writingState.projectOpenRevision;
  return () => getVaultPath() === vaultPath && state.noteMoveVaultScope === vaultScope
    && writingState.projectOpenRevision === revision && writingState.project?.id === projectId;
}
