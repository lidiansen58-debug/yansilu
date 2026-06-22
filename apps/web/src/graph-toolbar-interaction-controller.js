export function applyGraphZoomOptionInteraction(graphState = {}, zoomValue = "", deps = {}) {
  const graphZoomOption = deps.graphZoomOption || ((value) => ({ key: String(value || "fit").trim() || "fit", label: String(value || "fit").trim() || "fit" }));
  const nextZoom = graphZoomOption(zoomValue);
  graphState.zoom = nextZoom.key;
  return { zoom: nextZoom.key, meta: nextZoom, changed: true };
}

export function applyGraphZoomStepInteraction(graphState = {}, direction = 0, deps = {}) {
  const graphZoomOption = deps.graphZoomOption || ((value) => ({ key: String(value || "fit").trim() || "fit", label: String(value || "fit").trim() || "fit" }));
  const graphZoomStep = deps.graphZoomStep || ((value) => graphZoomOption(value));
  const currentZoom = graphZoomOption(graphState.zoom);
  const nextZoom = graphZoomStep(graphState.zoom, Number(direction || 0));
  if (nextZoom.key === currentZoom.key) {
    return { zoom: currentZoom.key, meta: currentZoom, changed: false };
  }
  graphState.zoom = nextZoom.key;
  return { zoom: nextZoom.key, meta: nextZoom, changed: true };
}

export function applyGraphReadingLensInteraction(graphState = {}, lensValue = "", deps = {}) {
  const graphReadingLensMeta = deps.graphReadingLensMeta || ((value) => ({ key: String(value || "insight").trim() || "insight", label: String(value || "insight").trim() || "insight" }));
  const meta = graphReadingLensMeta(lensValue);
  graphState.readingLens = meta.key;
  return { lens: meta.key, meta };
}

export function applyGraphFocusDepthInteraction(graphState = {}, depthValue = "", deps = {}) {
  const setGraphFocusDepth = deps.setGraphFocusDepth || ((value) => {
    graphState.focusDepth = String(value || "1").trim() || "1";
  });
  const graphFocusDepthMeta = deps.graphFocusDepthMeta || ((value) => ({ key: String(value || "1").trim() || "1", label: String(value || "1").trim() || "1" }));
  setGraphFocusDepth(depthValue);
  const meta = graphFocusDepthMeta(graphState.focusDepth);
  return { depth: graphState.focusDepth, meta };
}

export function applyGraphFocusContextModeInteraction(graphState = {}, modeValue = "", deps = {}) {
  const setGraphFocusContextMode = deps.setGraphFocusContextMode || ((value) => {
    graphState.focusContextMode = String(value || "argument").trim() || "argument";
  });
  const graphFocusContextModeMeta = deps.graphFocusContextModeMeta || ((value) => ({ key: String(value || "argument").trim() || "argument", label: String(value || "argument").trim() || "argument" }));
  setGraphFocusContextMode(modeValue);
  const meta = graphFocusContextModeMeta(graphState.focusContextMode);
  return { mode: graphState.focusContextMode, meta };
}
