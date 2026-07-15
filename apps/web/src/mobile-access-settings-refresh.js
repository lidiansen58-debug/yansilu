export function shouldAutoRefreshMobileAccess({
  active = false,
  item = null,
  loading = false,
  refreshTimer = 0,
  autoRefreshQueued = false
} = {}) {
  return Boolean(
    active &&
    !item &&
    !loading &&
    !refreshTimer &&
    !autoRefreshQueued
  );
}

export function prepareMobileAccessAutoRefreshState(mobileAccess = {}) {
  if (!mobileAccess || typeof mobileAccess !== "object") return false;
  const changed = Boolean(mobileAccess.error) || mobileAccess.loading !== true;
  if (mobileAccess.error) mobileAccess.error = "";
  mobileAccess.loading = true;
  return changed;
}

export function shouldPromoteMobileAccessRefreshRender({
  active = false,
  hadItemBeforeRefresh = false,
  item = null
} = {}) {
  return Boolean(active && !hadItemBeforeRefresh && item);
}
