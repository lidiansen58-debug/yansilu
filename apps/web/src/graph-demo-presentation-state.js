export function resetGraphDemoPresentationStateForRuntime(graphState = {}, deps = {}) {
  const setRelationTypeFilter = deps.setRelationTypeFilter || (() => {});
  setRelationTypeFilter("meaningful", { persist: false });
  graphState.readingLens = "insight";
  graphState.focusDepth = "1";
  graphState.selection = null;
  graphState.legendOpen = false;
  graphState.researchNavigatorHidden = false;
  graphState.researchNavigatorTouched = false;
  graphState.zoom = "fit";
  graphState.expanded = false;
  graphState.workbenchPanelOpen = false;
  graphState.workbenchPanelTab = "clues";
  graphState.thinkingPanelOpen = false;
  graphState.thinkingPanelVisible = true;
  graphState.thinkingFilter = "all";
  graphState.utilityDrawerOpen = false;
  graphState.utilityDrawerVisible = true;
  graphState.utilityDrawerPosition = null;
  graphState.sectionOpen = {
    "bridge-gaps": false,
    "weak-relations": false,
    "review-queue": false,
    "ai-analysis": false
  };
  return graphState;
}

export function yijingRichDemoPostImportPlan(options = {}) {
  const { startup = false } = options;
  return {
    resetGraphPresentationState: Boolean(startup),
    refreshDirectoryGraph: true,
    activateModule: startup ? "graph" : "",
    renderAll: !startup
  };
}
