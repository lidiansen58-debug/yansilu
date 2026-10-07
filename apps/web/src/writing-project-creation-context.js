import { uniqueStrings } from "./prototype-collection-utils.js";

export function captureWritingProjectCreationContext(deps = {}) {
  const { state = {}, writingState = {}, getVaultPath = () => "", parseWritingBasketIds = () => [] } = deps;
  const vaultPath = getVaultPath(), scope = state.noteMoveVaultScope;
  const snapshot = () => JSON.stringify([
    writingState.projectOpenRevision, writingState.project?.id || "", writingState.selectedThemeIndexId || "",
    uniqueStrings(parseWritingBasketIds()).sort()
  ]);
  let context = snapshot();
  const isVaultCurrent = () => getVaultPath() === vaultPath && state.noteMoveVaultScope === scope
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain && !state.unresolvedNoteMove;
  const cancelled = () => Object.assign(new Error("当前笔记库或写作内容已切换，请在当前内容重新操作。"), { code: "WRITING_CONTEXT_CHANGED" });
  return {
    vaultPath,
    isCurrent: () => isVaultCurrent() && context === snapshot(),
    assertCurrent() { if (!this.isCurrent()) throw cancelled(); },
    acceptLocalChanges() { if (!isVaultCurrent()) throw cancelled(); context = snapshot(); },
    bindPayload(payload) { return vaultPath ? { ...payload, expectedVaultPath: vaultPath } : payload; }
  };
}
