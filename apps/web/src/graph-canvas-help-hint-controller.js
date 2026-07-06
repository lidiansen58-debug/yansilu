export const GRAPH_CANVAS_HELP_HINT_KEY = "yansilu:graph:canvas-help-dismissed";
export const GRAPH_CANVAS_HELP_HINT_TIMEOUT_MS = 8000;

function graphCanvasHelpHintDeps(deps = {}) {
  return {
    graphState: deps.graphState || {},
    window: deps.window || globalThis.window,
    now: deps.now || (() => Date.now()),
    isGraphModule: deps.isGraphModule || (() => false),
    renderGraphPanel: deps.renderGraphPanel || (() => {}),
    timeoutMs: Number(deps.timeoutMs || GRAPH_CANVAS_HELP_HINT_TIMEOUT_MS)
  };
}

function storedHintDismissed(windowRef = globalThis.window) {
  try {
    return windowRef?.localStorage?.getItem?.(GRAPH_CANVAS_HELP_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function storeHintDismissed(windowRef = globalThis.window) {
  try {
    windowRef?.localStorage?.setItem?.(GRAPH_CANVAS_HELP_HINT_KEY, "1");
  } catch {}
}

export function clearGraphCanvasHelpHintTimerForRuntime(deps = {}) {
  const { graphState, window } = graphCanvasHelpHintDeps(deps);
  if (!graphState.canvasHelpHintTimer) return false;
  window?.clearTimeout?.(graphState.canvasHelpHintTimer);
  graphState.canvasHelpHintTimer = 0;
  return true;
}

export function scheduleGraphCanvasHelpHintDismissForRuntime(deps = {}) {
  const runtime = graphCanvasHelpHintDeps(deps);
  const { graphState, window, now, isGraphModule, renderGraphPanel } = runtime;
  clearGraphCanvasHelpHintTimerForRuntime(runtime);
  const remaining = Number(graphState.canvasHelpHintVisibleUntil || 0) - now();
  if (remaining <= 0) {
    graphState.canvasHelpHintVisibleUntil = 0;
    return false;
  }
  graphState.canvasHelpHintTimer = window?.setTimeout?.(() => {
    graphState.canvasHelpHintTimer = 0;
    graphState.canvasHelpHintVisibleUntil = 0;
    graphState.canvasHelpHintDismissed = true;
    storeHintDismissed(window);
    if (isGraphModule()) renderGraphPanel();
  }, remaining) || 0;
  return Boolean(graphState.canvasHelpHintTimer);
}

export function shouldShowGraphCanvasHelpHintForRuntime({ hasNodes = false } = {}, deps = {}) {
  const runtime = graphCanvasHelpHintDeps(deps);
  const { graphState, window, now, timeoutMs } = runtime;
  if (!hasNodes || graphState.canvasHelpHintDismissed === true || storedHintDismissed(window)) {
    graphState.canvasHelpHintDismissed = graphState.canvasHelpHintDismissed === true || storedHintDismissed(window);
    graphState.canvasHelpHintVisibleUntil = 0;
    clearGraphCanvasHelpHintTimerForRuntime(runtime);
    return false;
  }
  const currentTime = now();
  if (!graphState.canvasHelpHintVisibleUntil) {
    graphState.canvasHelpHintVisibleUntil = currentTime + timeoutMs;
    scheduleGraphCanvasHelpHintDismissForRuntime(runtime);
    return true;
  }
  if (Number(graphState.canvasHelpHintVisibleUntil || 0) > currentTime) {
    scheduleGraphCanvasHelpHintDismissForRuntime(runtime);
    return true;
  }
  graphState.canvasHelpHintDismissed = true;
  storeHintDismissed(window);
  clearGraphCanvasHelpHintTimerForRuntime(runtime);
  return false;
}

export function dismissGraphCanvasHelpHintForRuntime(deps = {}) {
  const runtime = graphCanvasHelpHintDeps(deps);
  const { graphState, window, isGraphModule, renderGraphPanel } = runtime;
  if (graphState.canvasHelpHintDismissed === true && !graphState.canvasHelpHintVisibleUntil) return false;
  graphState.canvasHelpHintDismissed = true;
  graphState.canvasHelpHintVisibleUntil = 0;
  storeHintDismissed(window);
  clearGraphCanvasHelpHintTimerForRuntime(runtime);
  if (isGraphModule()) renderGraphPanel();
  return true;
}
