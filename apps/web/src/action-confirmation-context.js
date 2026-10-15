const pendingConfirmations = new WeakSet();

export function captureActionConfirmationContext(getDeps, snapshot = () => undefined) {
  const initial = getDeps(), state = initial.state;
  const scope = state?.noteMoveVaultScope, module = state?.module, path = initial.getVaultPath?.();
  const before = snapshot(initial);
  return () => {
    const current = getDeps();
    return current.state === state && state?.noteMoveVaultScope === scope && state?.module === module
      && !state?.noteMoveVaultSwitching && !state?.noteMoveVaultUncertain && !state?.unresolvedNoteMove
      && current.getVaultPath?.() === path && snapshot(current) === before;
  };
}

export async function confirmCurrentAction(owner, {
  confirm, message, isCurrent = () => true, onDecline = () => {}, onError = () => {}
}) {
  if (pendingConfirmations.has(owner) || !isCurrent() || typeof confirm !== "function") return false;
  pendingConfirmations.add(owner);
  try {
    const decision = await confirm(message);
    if (!isCurrent()) return false;
    if (decision !== true) { onDecline(); return false; }
    return true;
  } catch (error) {
    if (isCurrent()) onError(error);
    return false;
  } finally {
    pendingConfirmations.delete(owner);
  }
}
