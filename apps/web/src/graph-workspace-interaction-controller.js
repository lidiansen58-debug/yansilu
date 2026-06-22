function defaultTabMeta(value = "") {
  const key = String(value || "clues").trim().toLowerCase();
  return { key: key || "clues", label: key || "clues" };
}

export function applyGraphWorkbenchEntryInteraction(graphState = {}, tabValue = "", deps = {}) {
  const graphWorkbenchTabMeta = deps.graphWorkbenchTabMeta || defaultTabMeta;
  const tab = graphWorkbenchTabMeta(tabValue).key;
  const currentTab = graphWorkbenchTabMeta(graphState.workbenchPanelTab).key;
  const sameTab = graphState.workbenchPanelOpen === true && currentTab === tab;
  graphState.workbenchPanelTab = tab;
  graphState.workbenchPanelOpen = !sameTab;
  return {
    tab,
    open: graphState.workbenchPanelOpen,
    meta: graphWorkbenchTabMeta(tab)
  };
}

export function applyGraphWorkbenchTabInteraction(graphState = {}, tabValue = "", deps = {}) {
  const graphWorkbenchTabMeta = deps.graphWorkbenchTabMeta || defaultTabMeta;
  const tab = graphWorkbenchTabMeta(tabValue).key;
  graphState.workbenchPanelOpen = true;
  graphState.workbenchPanelTab = tab;
  return {
    tab,
    open: true,
    meta: graphWorkbenchTabMeta(tab)
  };
}

export function applyGraphWorkbenchCloseInteraction(graphState = {}) {
  graphState.workbenchPanelOpen = false;
  return {
    open: false
  };
}

export function applyGraphEmptyCloseInteraction(graphState = {}, deps = {}) {
  const setRelationTypeFilter = deps.setRelationTypeFilter || (() => {});
  setRelationTypeFilter("meaningful");
  graphState.selection = null;
  return {
    relationType: "meaningful",
    selection: null
  };
}
