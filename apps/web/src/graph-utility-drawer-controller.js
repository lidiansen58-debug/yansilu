export function createGraphUtilityDrawerDragState() {
  return {
    active: false,
    moved: false,
    pointerId: null,
    handle: null,
    wrapper: null,
    stage: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    suppressClickUntil: 0
  };
}

function applyDrawerPositionStyle(wrapper, position) {
  wrapper.style.left = `${position.x}px`;
  wrapper.style.top = `${position.y}px`;
  wrapper.style.right = "auto";
  wrapper.style.justifyContent = "flex-start";
}

export function clampGraphUtilityDrawerPositionForRuntime(position, stage, wrapper) {
  const nextX = Number(position?.x);
  const nextY = Number(position?.y);
  if (!Number.isFinite(nextX) || !Number.isFinite(nextY) || !stage || !wrapper) return null;
  const padding = 10;
  const maxX = Math.max(padding, stage.clientWidth - wrapper.offsetWidth - padding);
  const maxY = Math.max(padding, stage.clientHeight - wrapper.offsetHeight - padding);
  return {
    x: Math.max(padding, Math.min(maxX, Math.round(nextX))),
    y: Math.max(padding, Math.min(maxY, Math.round(nextY)))
  };
}

export function applyGraphUtilityDrawerPositionForRuntime(root = null, deps = {}) {
  const { graphState = {} } = deps;
  const wrapper = root?.querySelector?.(".graph-utility-drawer-wrap");
  const stage = root?.querySelector?.(".graph-map-stage");
  const position = graphState.utilityDrawerPosition;
  if (!wrapper || !stage || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
  const clamped = clampGraphUtilityDrawerPositionForRuntime(position, stage, wrapper);
  if (!clamped) return null;
  graphState.utilityDrawerPosition = clamped;
  applyDrawerPositionStyle(wrapper, clamped);
  return clamped;
}

export function beginGraphUtilityDrawerDragForRuntime(handle = null, event = {}, deps = {}) {
  const {
    dragState = createGraphUtilityDrawerDragState(),
    graphState = {}
  } = deps;
  const wrapper = handle?.closest?.(".graph-utility-drawer-wrap");
  const stage = wrapper?.closest?.(".graph-map-stage");
  if (!wrapper || !stage) return false;
  const originX = Number.isFinite(graphState.utilityDrawerPosition?.x) ? graphState.utilityDrawerPosition.x : wrapper.offsetLeft;
  const originY = Number.isFinite(graphState.utilityDrawerPosition?.y) ? graphState.utilityDrawerPosition.y : wrapper.offsetTop;
  dragState.active = true;
  dragState.moved = false;
  dragState.pointerId = event.pointerId;
  dragState.handle = handle;
  dragState.wrapper = wrapper;
  dragState.stage = stage;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.originX = originX;
  dragState.originY = originY;
  wrapper.classList?.add?.("is-dragging");
  try {
    handle?.setPointerCapture?.(event.pointerId);
  } catch {}
  event.preventDefault?.();
  event.stopPropagation?.();
  return true;
}

export function updateGraphUtilityDrawerDragForRuntime(event = {}, deps = {}) {
  const {
    dragState = createGraphUtilityDrawerDragState(),
    graphState = {}
  } = deps;
  if (!dragState.active || event.pointerId !== dragState.pointerId) return null;
  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;
  if (!dragState.moved && Math.abs(deltaX) + Math.abs(deltaY) > 4) {
    dragState.moved = true;
  }
  const wrapper = dragState.wrapper;
  const stage = dragState.stage;
  if (!wrapper || !stage) return null;
  const nextPosition = clampGraphUtilityDrawerPositionForRuntime(
    {
      x: dragState.originX + deltaX,
      y: dragState.originY + deltaY
    },
    stage,
    wrapper
  );
  if (!nextPosition) return null;
  graphState.utilityDrawerPosition = nextPosition;
  applyDrawerPositionStyle(wrapper, nextPosition);
  wrapper.querySelector?.("[data-graph-utility-reset-position]")?.removeAttribute?.("disabled");
  event.preventDefault?.();
  return nextPosition;
}

export function endGraphUtilityDrawerDragForRuntime(event = {}, deps = {}) {
  const {
    dragState = createGraphUtilityDrawerDragState(),
    now = () => Date.now()
  } = deps;
  if (!dragState.active || event.pointerId !== dragState.pointerId) return false;
  const handle = dragState.handle;
  const wrapper = dragState.wrapper;
  if (handle?.hasPointerCapture?.(event.pointerId)) {
    try {
      handle.releasePointerCapture(event.pointerId);
    } catch {}
  }
  wrapper?.classList?.remove?.("is-dragging");
  if (dragState.moved) {
    dragState.suppressClickUntil = now() + 250;
  }
  dragState.active = false;
  dragState.moved = false;
  dragState.pointerId = null;
  dragState.handle = null;
  dragState.wrapper = null;
  dragState.stage = null;
  return true;
}

export function createGraphUtilityDrawerController(deps = {}) {
  const dragState = deps.dragState || createGraphUtilityDrawerDragState();
  const rootProvider = deps.rootProvider || (() => null);
  const controllerDeps = {
    graphState: deps.graphState,
    dragState
  };
  return {
    graphUtilityDrawerDragState: dragState,
    applyGraphUtilityDrawerPosition: (root = rootProvider()) => applyGraphUtilityDrawerPositionForRuntime(root, controllerDeps),
    beginGraphUtilityDrawerDrag: (handle, event) => beginGraphUtilityDrawerDragForRuntime(handle, event, controllerDeps),
    updateGraphUtilityDrawerDrag: (event) => updateGraphUtilityDrawerDragForRuntime(event, controllerDeps),
    endGraphUtilityDrawerDrag: (event) => endGraphUtilityDrawerDragForRuntime(event, {
      dragState,
      now: deps.now
    })
  };
}
