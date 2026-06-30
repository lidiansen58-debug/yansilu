export function installGraphNodeClickFallbackEvents(documentRef = null, {
  graphState = null,
  renderGraphPanel = () => {},
  openGraphSelection = null,
  openGraphNodeSelectionFromElement = () => false
} = {}) {
  const documentNode = documentRef && typeof documentRef.addEventListener === "function" ? documentRef : null;
  if (!documentNode) return false;
  const handledUntilByNode = new WeakMap();
  const graphNodeFromEvent = (event) => event.target?.closest?.(".graph-map-node[data-node-id]") || null;
  const handleGraphNodeClick = (event) => {
    if (event.__yansiluGraphNodeHandled) return;
    const graphNode = graphNodeFromEvent(event);
    if (!graphNode) return;
    const now = Date.now();
    if (Number(handledUntilByNode.get(graphNode) || 0) > now) {
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
      return;
    }
    handledUntilByNode.set(graphNode, now + 350);
    event.__yansiluGraphNodeHandled = true;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    const nodeId = String(graphNode.getAttribute?.("data-node-id") || "").trim();
    const isolatedKey = String(graphNode.getAttribute?.("data-graph-isolated-key") || "").trim();
    const degree = Number(graphNode.getAttribute?.("data-node-degree") || 0);
    if (nodeId && (isolatedKey || degree === 0) && typeof openGraphSelection === "function") {
      const selection = { kind: "relationForm", ...(isolatedKey ? { isolatedKey } : {}), noteId: nodeId, returnTo: "isolated" };
      setTimeout(() => {
        if (graphState && typeof graphState === "object") {
          graphState.selection = selection;
          graphState.thinkingPanelOpen = false;
          renderGraphPanel();
          return;
        }
        openGraphSelection(selection);
      }, 0);
      return;
    }
    setTimeout(() => openGraphNodeSelectionFromElement(graphNode), 0);
  };
  documentNode.addEventListener("click", handleGraphNodeClick, { capture: true });
  return true;
}
