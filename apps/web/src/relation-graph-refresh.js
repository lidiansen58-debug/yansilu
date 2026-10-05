// The relation has already been persisted. A graph read failure must not turn
// that successful mutation into a failed save or encourage a duplicate retry.
export async function refreshGraphAfterRelationMutation(host, { returnTo = "", savedRelation = null, canRevealSavedRelation = () => true } = {}) {
  if (host.state?.module !== "graph" && returnTo !== "graph") return null;
  try {
    return await host.refreshDirectoryGraph?.(savedRelation ? { savedRelation, canRevealSavedRelation } : undefined) ?? false;
  } catch {
    return false;
  }
}
