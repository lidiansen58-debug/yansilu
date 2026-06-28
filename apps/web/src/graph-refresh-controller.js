export async function refreshDirectoryGraphForRuntime(deps = {}) {
  const {
    graphState = {},
    graphScopeDirectoryId = () => "",
    graphOriginalScopeDirectoryId = "",
    graphLoadedScopeCoversDirectory = () => false,
    syncNotesForDirectoryTree = async () => {},
    fetchDirectoryGraph = async () => null,
    fetchGraphConflicts = async () => null,
    fetchRelationReviewQueue = async () => ({ items: [], total: 0 }),
    upsertGraphNodeSummaries = () => {},
    graphLoadErrorMessage = (error) => String(error?.message || error || ""),
    renderGraphPanel = () => {},
    renderAll = () => {},
    nowIso = () => new Date().toISOString()
  } = deps;

  const directoryId = graphScopeDirectoryId();
  const networkDirectoryId = graphOriginalScopeDirectoryId;
  const requestSerial = (graphState.requestSerial || 0) + 1;
  const canReuseScopedGraph = graphLoadedScopeCoversDirectory(directoryId);
  let succeeded = false;
  graphState.requestSerial = requestSerial;
  graphState.loading = true;
  graphState.error = "";
  renderGraphPanel();

  try {
    await syncNotesForDirectoryTree(networkDirectoryId);
    const [graph, conflicts, reviewQueue] = await Promise.all([
      fetchDirectoryGraph(networkDirectoryId, { includeDescendants: true, timeoutMs: 15000 }),
      fetchGraphConflicts({ directoryId, includeDescendants: true }).catch(() => null),
      fetchRelationReviewQueue({ directoryId, includeDescendants: true, limit: 8 }).catch((error) => ({
        error: String(error?.message || error),
        items: [],
        total: 0
      }))
    ]);
    if (requestSerial !== graphState.requestSerial) return false;
    graphState.item = graph;
    graphState.lastLoadedDirectoryId = graph ? networkDirectoryId : "";
    graphState.lastLoadedAt = graph ? nowIso() : "";
    graphState.conflicts = conflicts;
    graphState.reviewQueue = reviewQueue;
    graphState.lastErrorAt = "";
    upsertGraphNodeSummaries(Array.isArray(graph?.nodes) ? graph.nodes : []);
    succeeded = true;
  } catch (error) {
    if (requestSerial !== graphState.requestSerial) return false;
    graphState.error = graphLoadErrorMessage(error);
    graphState.lastErrorAt = nowIso();
    if (!canReuseScopedGraph) {
      graphState.item = null;
      graphState.lastLoadedDirectoryId = "";
      graphState.lastLoadedAt = "";
      graphState.conflicts = null;
      graphState.reviewQueue = null;
    }
  } finally {
    if (requestSerial !== graphState.requestSerial) return false;
    graphState.loading = false;
    renderAll();
  }
  return succeeded;
}
