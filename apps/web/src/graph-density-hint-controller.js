export const GRAPH_DENSITY_HINT_TIMEOUT_MS = 10000;

function graphDensityHintDeps(deps = {}) {
  return {
    graphState: deps.graphState || {},
    window: deps.window || globalThis.window,
    now: deps.now || (() => Date.now()),
    isGraphModule: deps.isGraphModule || (() => false),
    renderGraphPanel: deps.renderGraphPanel || (() => {}),
    timeoutMs: Number(deps.timeoutMs || GRAPH_DENSITY_HINT_TIMEOUT_MS)
  };
}

export function clearGraphDensityHintTimerForRuntime(deps = {}) {
  const { graphState, window } = graphDensityHintDeps(deps);
  if (!graphState.densityHintTimer) return false;
  window?.clearTimeout?.(graphState.densityHintTimer);
  graphState.densityHintTimer = 0;
  return true;
}

export function scheduleGraphDensityHintDismissForRuntime(deps = {}) {
  const runtime = graphDensityHintDeps(deps);
  const { graphState, window, now, isGraphModule, renderGraphPanel } = runtime;
  clearGraphDensityHintTimerForRuntime(runtime);
  const remaining = Number(graphState.densityHintVisibleUntil || 0) - now();
  if (remaining <= 0) {
    graphState.densityHintVisibleUntil = 0;
    return false;
  }
  graphState.densityHintTimer = window?.setTimeout?.(() => {
    graphState.densityHintTimer = 0;
    graphState.densityHintVisibleUntil = 0;
    if (isGraphModule()) renderGraphPanel();
  }, remaining) || 0;
  return Boolean(graphState.densityHintTimer);
}

export function shouldShowGraphDensityHintForRuntime({ dense = false, filterActive = false } = {}, deps = {}) {
  const runtime = graphDensityHintDeps(deps);
  const { graphState, now, timeoutMs } = runtime;
  const hintKey =
    dense && !filterActive
      ? `${String(graphState.lastLoadedDirectoryId || "").trim()}::${String(graphState.lastLoadedAt || "").trim()}::dense`
      : "";
  if (!hintKey) {
    graphState.densityHintKey = "";
    graphState.densityHintVisibleUntil = 0;
    clearGraphDensityHintTimerForRuntime(runtime);
    return false;
  }
  const currentTime = now();
  if (graphState.densityHintKey !== hintKey) {
    graphState.densityHintKey = hintKey;
    graphState.densityHintVisibleUntil = currentTime + timeoutMs;
    scheduleGraphDensityHintDismissForRuntime(runtime);
    return true;
  }
  if (Number(graphState.densityHintVisibleUntil || 0) > currentTime) {
    scheduleGraphDensityHintDismissForRuntime(runtime);
    return true;
  }
  clearGraphDensityHintTimerForRuntime(runtime);
  return false;
}
