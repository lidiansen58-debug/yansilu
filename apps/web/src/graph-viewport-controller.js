export function createGraphViewportDragState() {
  return {
    active: false,
    moved: false,
    pointerId: null,
    viewport: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
    suppressClickUntil: 0
  };
}

const GRAPH_VIEWPORT_DRAG_IGNORE_SELECTOR =
  ".graph-map-floater, .graph-hover-card, .graph-focus-context, .graph-selection-panel, .graph-thinking-panel, .graph-workbench-panel, .graph-research-navigator, .graph-map-node, .graph-map-edge-group, .graph-map-cluster-glow";

export function centerGraphViewportIfZoomedForRuntime(deps = {}) {
  const {
    documentRef = typeof document !== "undefined" ? document : null,
    graphState = {},
    graphZoomOption = () => ({ key: "fit" })
  } = deps;
  const viewport = documentRef?.querySelector?.(".graph-map-viewport");
  if (!viewport || graphZoomOption(graphState.zoom).key === "fit") return;
  viewport.scrollLeft = Math.max(0, Math.round((viewport.scrollWidth - viewport.clientWidth) / 2));
  viewport.scrollTop = Math.max(0, Math.round((viewport.scrollHeight - viewport.clientHeight) / 2));
}

export function beginGraphViewportDragForRuntime(viewport = null, event = {}, deps = {}) {
  const { dragState = createGraphViewportDragState() } = deps;
  if (!viewport || event.button !== 0) return false;
  if (event.target?.closest?.(GRAPH_VIEWPORT_DRAG_IGNORE_SELECTOR)) return false;
  dragState.active = true;
  dragState.moved = false;
  dragState.pointerId = event.pointerId;
  dragState.viewport = viewport;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.startScrollLeft = viewport.scrollLeft;
  dragState.startScrollTop = viewport.scrollTop;
  viewport.classList?.add?.("is-dragging");
  try {
    viewport.setPointerCapture?.(event.pointerId);
  } catch {}
  return true;
}

export function updateGraphViewportDragForRuntime(event = {}, deps = {}) {
  const { dragState = createGraphViewportDragState() } = deps;
  if (!dragState.active || !dragState.viewport || event.pointerId !== dragState.pointerId) return;
  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;
  if (!dragState.moved && Math.abs(deltaX) + Math.abs(deltaY) > 5) {
    dragState.moved = true;
  }
  if (!dragState.moved) return;
  dragState.viewport.scrollLeft = dragState.startScrollLeft - deltaX;
  dragState.viewport.scrollTop = dragState.startScrollTop - deltaY;
}

export function endGraphViewportDragForRuntime(event = {}, deps = {}) {
  const {
    dragState = createGraphViewportDragState(),
    now = () => Date.now()
  } = deps;
  if (!dragState.active || event.pointerId !== dragState.pointerId) return;
  const viewport = dragState.viewport;
  if (viewport) {
    viewport.classList?.remove?.("is-dragging");
    try {
      viewport.releasePointerCapture?.(event.pointerId);
    } catch {}
  }
  dragState.active = false;
  dragState.pointerId = null;
  dragState.viewport = null;
  if (dragState.moved) {
    dragState.suppressClickUntil = now() + 250;
  }
  dragState.moved = false;
}

export function createGraphViewportController(deps = {}) {
  const dragState = deps.dragState || createGraphViewportDragState();
  return {
    graphViewportDragState: dragState,
    centerGraphViewportIfZoomed: () => centerGraphViewportIfZoomedForRuntime(deps),
    beginGraphViewportDrag: (viewport, event) => beginGraphViewportDragForRuntime(viewport, event, { dragState }),
    updateGraphViewportDrag: (event) => updateGraphViewportDragForRuntime(event, { dragState }),
    endGraphViewportDrag: (event) => endGraphViewportDragForRuntime(event, {
      dragState,
      now: deps.now
    })
  };
}
