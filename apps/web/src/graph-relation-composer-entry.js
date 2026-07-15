import { relationEntryRouteFromGraphAction } from "./relation-entry-route.js";

export function createGraphRelationComposerEntry({ editor, graphState } = {}) {
  return (action) => {
    const route = relationEntryRouteFromGraphAction(action, { currentSelection: graphState?.selection });
    const opened = editor?.openPermanentRelationWorkspace?.({
      ...route,
      mode: "manual",
      returnTo: "graph"
    }) || false;
    if (opened && graphState && typeof graphState === "object") graphState.selection = null;
    return opened;
  };
}
