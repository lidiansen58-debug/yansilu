export function installGraphNodeClickFallbackEvents(documentRef = null, {
  graphState = null,
  renderGraphPanel = () => {},
  openGraphSelection = null,
  openRelationComposerFromGraphAction = null,
  setStatus = () => {},
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
    if (nodeId && (isolatedKey || degree === 0)) {
      setTimeout(() => {
        if (typeof openRelationComposerFromGraphAction === "function" && openRelationComposerFromGraphAction({
          noteId: nodeId,
          source: "graph",
          candidateSource: "graph-isolated-node",
          isolatedKey,
          returnTo: "graph"
        })) {
          return;
        }
        setStatus("Relation composer did not open. Please try again.", "warn");
        openGraphNodeSelectionFromElement(graphNode);
      }, 0);
      return;
    }
    setTimeout(() => openGraphNodeSelectionFromElement(graphNode), 0);
  };
  documentNode.addEventListener("click", handleGraphNodeClick, { capture: true });
  return true;
}

export function installGraphWorkbenchClickFallbackEvents(documentRef = null, {
  graphState = null,
  graphWorkbenchTabMeta = (value = "") => ({ key: String(value || "").trim(), label: String(value || "").trim(), statusLabel: String(value || "").trim() }),
  applyGraphWorkbenchEntryInteraction = () => ({ open: false, meta: { label: "" } }),
  applyGraphWorkbenchTabInteraction = () => ({ open: true, meta: { label: "" } }),
  applyGraphWorkbenchCloseInteraction = () => {},
  renderGraphPanel = () => {},
  runGraphAiAnalysis = () => {},
  setStatus = () => {}
} = {}) {
  const documentNode = documentRef && typeof documentRef.addEventListener === "function" ? documentRef : null;
  if (!documentNode || !graphState) return false;
  const consume = (event) => {
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
  };
  documentNode.addEventListener("click", (event) => {
    const target = event.target;
    const workbenchEntry = target?.closest?.("[data-graph-workbench-entry]");
    if (workbenchEntry) {
      consume(event);
      const result = applyGraphWorkbenchEntryInteraction(graphState, workbenchEntry.getAttribute("data-graph-workbench-entry"), {
        graphWorkbenchTabMeta
      });
      renderGraphPanel();
      setStatus(result.open ? `已打开${result.meta.statusLabel || result.meta.label}` : "已收起图谱侧栏", "ok");
      return;
    }
    const workbenchTab = target?.closest?.("[data-graph-workbench-tab]");
    if (workbenchTab) {
      consume(event);
      const result = applyGraphWorkbenchTabInteraction(graphState, workbenchTab.getAttribute("data-graph-workbench-tab"), {
        graphWorkbenchTabMeta
      });
      renderGraphPanel();
      setStatus(`已切换到${result.meta.statusLabel || result.meta.label}`, "ok");
      return;
    }
    const workbenchGuideToggle = target?.closest?.("[data-graph-workbench-guide-toggle]");
    if (workbenchGuideToggle) {
      consume(event);
      graphState.workbenchGuideOpen = graphState.workbenchGuideOpen !== true;
      renderGraphPanel();
      setStatus(graphState.workbenchGuideOpen ? "已展开说明" : "已收起说明", "ok");
      return;
    }
    const workbenchClose = target?.closest?.("[data-graph-workbench-close]");
    if (workbenchClose) {
      consume(event);
      applyGraphWorkbenchCloseInteraction(graphState);
      renderGraphPanel();
      setStatus("已收起图谱侧栏", "ok");
      return;
    }
    const graphAiButton = target?.closest?.("[data-run-graph-ai-analysis]");
    if (graphAiButton) {
      consume(event);
      const mode = String(graphAiButton.getAttribute("data-run-graph-ai-analysis") || "").trim();
      graphState.workbenchPanelOpen = true;
      graphState.workbenchPanelTab = mode === "theme" ? "questions" : mode === "gap" ? "clues" : graphState.workbenchPanelTab === "questions" ? "questions" : "clues";
      renderGraphPanel();
      void runGraphAiAnalysis();
    }
  }, { capture: true });
  return true;
}
