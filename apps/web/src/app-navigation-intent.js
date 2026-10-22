const navigationRevisions = new WeakMap();

export function captureAppNavigation(state) {
  const revision = navigationRevisions.get(state);
  const vaultScope = state.noteMoveVaultScope;
  return () => navigationRevisions.get(state) === revision
    && state.noteMoveVaultScope === vaultScope
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
}

export function beginAppNavigation(state) {
  navigationRevisions.set(state, (navigationRevisions.get(state) || 0) + 1);
  return captureAppNavigation(state);
}

export async function prepareAppNavigation(state, dismiss, context = {}) {
  const isCurrentNavigation = beginAppNavigation(state);
  const result = await dismiss({ ...context, isCurrentNavigation });
  return result?.ok !== false && isCurrentNavigation() ? isCurrentNavigation : null;
}
