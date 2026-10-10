const navigationRevisions = new WeakMap();

export function beginAppNavigation(state) {
  const revision = (navigationRevisions.get(state) || 0) + 1;
  navigationRevisions.set(state, revision);
  const vaultScope = state.noteMoveVaultScope;
  return () => navigationRevisions.get(state) === revision
    && state.noteMoveVaultScope === vaultScope
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain;
}

export async function prepareAppNavigation(state, dismiss, context = {}) {
  const isCurrentNavigation = beginAppNavigation(state);
  const result = await dismiss({ ...context, isCurrentNavigation });
  return result?.ok !== false && isCurrentNavigation() ? isCurrentNavigation : null;
}
