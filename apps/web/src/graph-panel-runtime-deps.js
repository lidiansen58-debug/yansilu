import { buildGraphPanelRendererDeps } from "./graph-panel-renderer-deps.js";
import { buildGraphPanelStateBuilderDeps } from "./graph-panel-state-builder-deps.js";

export function buildGraphPanelRuntimeDeps(deps = {}) {
  const {
    syncGraphDisclosureState,
    syncAllNoteRelationNetworkStatuses,
    buildGraphPanelState,
    renderGraphPanelForRuntime
  } = deps;

  return {
    syncGraphDisclosureState,
    syncAllNoteRelationNetworkStatuses,
    buildGraphPanelState,
    renderGraphPanelForRuntime,
    stateBuilderDeps: buildGraphPanelStateBuilderDeps(deps),
    rendererDeps: buildGraphPanelRendererDeps(deps)
  };
}
