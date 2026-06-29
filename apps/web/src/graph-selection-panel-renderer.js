import {
  renderGraphSelectionPanelViaDispatcher
} from "./graph-selection-dispatcher.js";
import {
  createGraphEdgeSelectionRuntimeDeps,
  createGraphNodeSelectionRuntimeDeps,
  createGraphSelectionDispatcherRuntime
} from "./graph-selection-host-deps.js";
import {
  renderGraphNodeSelectionPanel as renderGraphNodeSelectionPanelView
} from "./graph-node-selection-panel.js";
import {
  renderGraphEdgeSelectionPanel as renderGraphEdgeSelectionPanelView
} from "./graph-edge-selection-panel.js";

export function createGraphSelectionPanelRenderer(hostProvider = () => ({})) {
  const hostForRender = () => (typeof hostProvider === "function" ? hostProvider() : hostProvider) || {};

  const renderGraphNodeSelectionPanel = (args = {}) => {
    const host = hostForRender();
    return renderGraphNodeSelectionPanelView(args, createGraphNodeSelectionRuntimeDeps(host));
  };

  const renderGraphEdgeSelectionPanel = (args = {}) => {
    const host = hostForRender();
    return renderGraphEdgeSelectionPanelView(args, createGraphEdgeSelectionRuntimeDeps(host));
  };

  const renderGraphSelectionPanel = (context = {}) => {
    const host = hostForRender();
    const { renderers, deps } = createGraphSelectionDispatcherRuntime({
      renderGraphClusterSelectionPanel: host.renderGraphClusterSelectionPanel,
      renderGraphThemeSelectionPanel: host.renderGraphThemeSelectionPanel,
      renderGraphIsolatedSelectionPanel: host.renderGraphIsolatedSelectionPanel,
      renderGraphIsolatedCompletePanel: host.renderGraphIsolatedCompletePanel,
      renderGraphRelationFormSelectionPanel: host.renderGraphRelationFormSelectionPanel,
      renderGraphBridgeSelectionPanel: host.renderGraphBridgeSelectionPanel,
      renderGraphNodeSelectionPanel,
      renderGraphEdgeSelectionPanel,
      normalizeGraphSelectionForVisibleItems: host.normalizeGraphSelectionForVisibleItems
    });
    return renderGraphSelectionPanelViaDispatcher(context, renderers, deps);
  };

  return {
    renderGraphSelectionPanel,
    renderGraphNodeSelectionPanel,
    renderGraphEdgeSelectionPanel
  };
}
