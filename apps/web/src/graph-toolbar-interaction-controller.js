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
  const setGraphRelationTypeFilter = deps.setGraphRelationTypeFilter || (() => "");
  const meta = graphReadingLensMeta(lensValue);
  graphState.readingLens = meta.key;
  graphState.researchNavigatorHidden = true;
  graphState.researchNavigatorTouched = true;
  const relationType = setGraphRelationTypeFilter("meaningful");
  return { lens: meta.key, meta, relationType };
}

export function applyGraphTaskViewInteraction(graphState = {}, viewValue = "", deps = {}) {
  const key = String(viewValue || "structure").trim().toLowerCase();
  const setGraphRelationTypeFilter = deps.setGraphRelationTypeFilter || (() => "");
  const graphReadingLensMeta = deps.graphReadingLensMeta || ((value) => ({ key: String(value || "insight").trim() || "insight", label: String(value || "insight").trim() || "insight" }));
  const metaByKey = {
    structure: {
      key: "structure",
      label: "看结构",
      relationType: "meaningful",
      lens: "insight",
      workbenchPanelOpen: false,
      workbenchPanelTab: "clues",
      researchNavigatorHidden: true,
      thinkingFilter: ""
    },
    relations: {
      key: "relations",
      label: "找缺口",
      relationType: "meaningful",
      lens: "bridge",
      workbenchPanelOpen: false,
      workbenchPanelTab: "clues",
      researchNavigatorHidden: true,
      thinkingFilter: "organize"
    },
    themes: {
      key: "themes",
      label: "找主题",
      relationType: "index",
      lens: "insight",
      workbenchPanelOpen: false,
      workbenchPanelTab: "questions",
      researchNavigatorHidden: true,
      thinkingFilter: "theme"
    }
  };
  const meta = metaByKey[key];
  if (!meta) return { view: key, changed: false, meta: metaByKey.structure, lens: graphReadingLensMeta(graphState.readingLens || "insight") };
  const relationType = setGraphRelationTypeFilter(meta.relationType);
  graphState.readingLens = meta.lens;
  graphState.workbenchPanelOpen = meta.workbenchPanelOpen;
  graphState.workbenchPanelTab = meta.workbenchPanelTab;
  graphState.researchNavigatorHidden = meta.researchNavigatorHidden;
  graphState.researchNavigatorTouched = true;
  graphState.thinkingFilter = meta.thinkingFilter;
  const lens = graphReadingLensMeta(meta.lens);
  return { view: meta.key, changed: true, meta, lens, relationType };
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

export function applyGraphRelationTypeFilterInteraction(graphState = {}, relationTypeValue = "", deps = {}) {
  const setGraphRelationTypeFilter = deps.setGraphRelationTypeFilter || ((value) => {
    if (!graphState.filters || typeof graphState.filters !== "object") graphState.filters = {};
    graphState.filters.relationType = String(value || "all").trim() || "all";
    return graphState.filters.relationType;
  });
  const graphRelationTypeLabel = deps.graphRelationTypeLabel || ((value) => String(value || "").trim() || "all");
  const relationType = setGraphRelationTypeFilter(String(relationTypeValue || "all").trim() || "all");
  return {
    relationType,
    label: relationType === "all" ? "全部关系" : graphRelationTypeLabel(relationType)
  };
}

export function applyGraphViewModeInteraction(graphState = {}, modeValue = "", deps = {}) {
  const mode = String(modeValue || "").trim().toLowerCase();
  const setGraphRelationTypeFilter = deps.setGraphRelationTypeFilter || (() => "");
  const graphReadingModeMeta = deps.graphReadingModeMeta || ((value) => ({ key: String(value || "argument").trim() || "argument", label: String(value || "argument").trim() || "argument" }));
  if (mode === "argument") {
    setGraphRelationTypeFilter("meaningful");
  } else if (mode === "structure") {
    setGraphRelationTypeFilter("index");
  } else {
    return { mode, changed: false, meta: graphReadingModeMeta("argument") };
  }
  graphState.readingLens = "insight";
  graphState.researchNavigatorHidden = true;
  graphState.researchNavigatorTouched = true;
  return { mode, changed: true, meta: graphReadingModeMeta(mode) };
}

export function applyGraphWheelZoomInteraction(graphState = {}, deltaY = 0, deps = {}) {
  return applyGraphZoomStepInteraction(graphState, Number(deltaY || 0) > 0 ? -1 : 1, deps);
}
