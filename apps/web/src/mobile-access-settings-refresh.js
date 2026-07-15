export function shouldAutoRefreshMobileAccess({
  active = false,
  item = null,
  loading = false,
  refreshTimer = 0,
  autoRefreshQueued = false,
  error = "",
  attemptedAfterError = false
} = {}) {
  return Boolean(
    active &&
    !item &&
    !loading &&
    !refreshTimer &&
    !autoRefreshQueued &&
    (!error || !attemptedAfterError)
  );
}

export function prepareMobileAccessAutoRefreshState(mobileAccess = {}) {
  if (!mobileAccess?.error) return false;
  mobileAccess.error = "";
  mobileAccess.loading = true;
  return true;
}

export function shouldPromoteMobileAccessRefreshRender({
  active = false,
  hadItemBeforeRefresh = false,
  item = null
} = {}) {
  return Boolean(active && !hadItemBeforeRefresh && item);
}
