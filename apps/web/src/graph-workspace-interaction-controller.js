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

export function applyGraphThinkingToggleInteraction(graphState = {}) {
  const open = graphState.thinkingPanelOpen !== true;
  graphState.thinkingPanelVisible = true;
  if (open) graphState.selection = null;
  graphState.thinkingPanelOpen = open;
  return { open, visible: true };
}

export function applyGraphThinkingHideInteraction(graphState = {}) {
  graphState.thinkingPanelVisible = false;
  graphState.thinkingPanelOpen = false;
  return { open: false, visible: false };
}

export function applyGraphThinkingVisibilityInteraction(graphState = {}, visibilityValue = "") {
  const visible = String(visibilityValue || "").trim() !== "hide";
  graphState.thinkingPanelVisible = visible;
  if (!visible) graphState.thinkingPanelOpen = false;
  return { open: graphState.thinkingPanelOpen === true, visible };
}

export function applyGraphThinkingFilterInteraction(graphState = {}, filterValue = "", deps = {}) {
  const graphThinkingFilterMeta = deps.graphThinkingFilterMeta || defaultTabMeta;
  const meta = graphThinkingFilterMeta(filterValue);
  graphState.thinkingFilter = meta.key;
  return { filter: meta.key, meta };
}

export function applyGraphUtilityDrawerCloseInteraction(graphState = {}) {
  graphState.utilityDrawerVisible = false;
  graphState.utilityDrawerOpen = false;
  return { open: false, visible: false };
}

export function applyGraphUtilityVisibilityInteraction(graphState = {}, visibilityValue = "") {
  const visible = String(visibilityValue || "").trim() !== "hide";
  graphState.utilityDrawerVisible = visible;
  if (visible) graphState.utilityDrawerOpen = false;
  return { open: graphState.utilityDrawerOpen === true, visible };
}

export function applyGraphUtilityDrawerOpenState(graphState = {}, open = false) {
  graphState.utilityDrawerOpen = open === true;
  return { open: graphState.utilityDrawerOpen };
}

export function applyGraphSectionOpenState(graphState = {}, sectionKey = "", open = false) {
  const key = String(sectionKey || "").trim();
  if (!graphState.sectionOpen || typeof graphState.sectionOpen !== "object") graphState.sectionOpen = {};
  if (key) graphState.sectionOpen[key] = open === true;
  return { sectionKey: key, open: key ? graphState.sectionOpen[key] : false };
}
