import test from "node:test";
import assert from "node:assert/strict";
import {
  readGraphFocusContextPanelSource,
  readGraphPanelRendererSource,
  readGraphPanelRuntimeDepsSource,
  readGraphPanelShellSource,
  readGraphVisualMapComposerSource,
  readGraphVisualMapContextSource,
  readGraphVisualMapControlsStateSource,
  readGraphVisualMapControllerSource,
  readGraphVisualMapRuntimeDepsSource,
  readGraphVisualMapRuntimeStateSource,
  readGraphVisualMapSelectionStateSource,
  readGraphVisualMapViewRendererSource,
  readPrototypeAppSource
} from "./copy-source-helpers.mjs";

test("prototype graph shell keeps review and relation entry wiring without legacy wikilink copy", async () => {
  const source = await readPrototypeAppSource();
  const focusContextPanelSource = await readGraphFocusContextPanelSource();

  assert.match(source, /function renderGraphPanel\(\)/);
  assert.match(source, /renderGraphSelectionPanelViaDispatcher/);
  assert.match(source, /function renderGraphRelationWorkspaceForNote/);
  assert.match(source, /renderGraphFocusContextPanelView/);
  assert.match(focusContextPanelSource, /data-graph-relation-adjustment="strengthen"/);
  assert.match(source, /renderGraphRelationWorkspaceMarkup/);
  assert.doesNotMatch(source, /data-graph-followup-action="relations-edit"/);
  assert.doesNotMatch(source, /Markdown wikilink/);
});

test("prototype graph shell delegates isolated relation save and workspace rendering to modules", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /createGraphIsolatedRelationController/);
  assert.match(source, /createGraphRelationSaveController/);
  assert.match(source, /createGraphRelationWorkflowController/);
  assert.match(source, /renderGraphRelationWorkspaceForNote as renderGraphRelationWorkspaceMarkup/);
  assert.match(source, /renderGraphThemeIndexWorkspace as renderGraphThemeIndexWorkspaceMarkup/);
});

test("prototype graph shell delegates visual node and edge svg rendering to view modules", async () => {
  const visualMapControllerSource = await readGraphVisualMapControllerSource();
  const visualMapComposerSource = await readGraphVisualMapComposerSource();
  const visualMapViewRendererSource = await readGraphVisualMapViewRendererSource();

  assert.match(visualMapControllerSource, /from "\.\/graph-visual-map-composer\.js"/);
  assert.doesNotMatch(visualMapControllerSource, /from "\.\/graph-visual-map-view-renderer\.js"/);
  assert.match(visualMapComposerSource, /from "\.\/graph-visual-map-view-renderer\.js"/);
  assert.match(visualMapComposerSource, /renderGraphVisualNodeMarkupForRuntime\(mapRuntimeState/);
  assert.match(visualMapComposerSource, /renderGraphVisualEdgeMarkupForRuntime\(mapRuntimeState/);
  assert.match(visualMapViewRendererSource, /renderGraphVisualNodeViews/);
  assert.match(visualMapViewRendererSource, /renderGraphVisualEdgeViews/);
  assert.doesNotMatch(visualMapControllerSource, /renderGraphVisualNodeViews\(layout\.nodes/);
  assert.doesNotMatch(visualMapControllerSource, /renderGraphVisualEdgeViews\(visibleEdges/);
});

test("prototype graph shell delegates visual map chrome to the shell view", async () => {
  const visualMapControllerSource = await readGraphVisualMapControllerSource();
  const visualMapComposerSource = await readGraphVisualMapComposerSource();

  assert.match(visualMapControllerSource, /renderGraphVisualMapShellView/);
  assert.match(visualMapControllerSource, /composeGraphVisualMapForRuntime/);
  assert.match(visualMapComposerSource, /renderGraphZoomStepperView/);
  assert.match(visualMapComposerSource, /renderGraphMapSvgDefsView/);
  assert.doesNotMatch(visualMapControllerSource, /<div class="graph-map-canvas">/);
  assert.doesNotMatch(visualMapControllerSource, /<svg class="graph-map-svg"/);
  assert.doesNotMatch(visualMapControllerSource, /<radialGradient id="graph-node-core-fill"/);
  assert.doesNotMatch(visualMapControllerSource, /<div class="graph-map-empty-canvas">/);
});

test("prototype graph shell delegates selection kind dispatch to a graph module", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /from "\.\/graph-selection-dispatcher\.js"/);
  assert.match(source, /from "\.\/graph-selection-host-deps\.js"/);
  assert.match(source, /renderGraphSelectionPanelViaDispatcher/);
  assert.match(source, /createGraphSelectionDispatcherRuntime\(\{/);
  assert.match(source, /\}, renderers, deps\);/);
  assert.doesNotMatch(source, /renderNodePanel: renderGraphNodeSelectionPanel/);
  assert.doesNotMatch(source, /renderEdgePanel: renderGraphEdgeSelectionPanel/);
  assert.doesNotMatch(source, /if \(normalized\.kind === "cluster"\)/);
  assert.doesNotMatch(source, /if \(normalized\.kind === "relationForm"\)/);
  assert.doesNotMatch(source, /if \(normalized\.kind === "bridge"\)/);
});

test("prototype graph shell delegates node and edge selection bodies to panel modules", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /from "\.\/graph-node-selection-panel\.js"/);
  assert.match(source, /from "\.\/graph-edge-selection-panel\.js"/);
  assert.match(source, /renderGraphNodeSelectionPanelView\(args/);
  assert.match(source, /renderGraphEdgeSelectionPanelView\(args/);
  assert.doesNotMatch(source, /data-graph-ai-connect-note="\$\{escapeHtml\(normalized\.nodeId\)\}"/);
  assert.doesNotMatch(source, /class="graph-relation-adjustment-card/);
});

test("prototype graph shell delegates cluster selection body to a panel module", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /from "\.\/graph-cluster-selection-panel\.js"/);
  assert.match(source, /renderGraphClusterSelectionPanelView\(\{ selection, clusterMeta, nodeMap, edges \}/);
  assert.doesNotMatch(source, /renderGraphThemeIndexWorkspace\(meta\.memberIds/);
  assert.doesNotMatch(source, /className: "is-cluster"/);
});

test("prototype graph shell delegates panel state building to a graph module", async () => {
  const source = await readPrototypeAppSource();
  const panelRendererSource = await readGraphPanelRendererSource();
  const panelShellSource = await readGraphPanelShellSource();
  const panelRuntimeDepsSource = await readGraphPanelRuntimeDepsSource();

  assert.match(source, /from "\.\/graph-panel-state-builder\.js"/);
  assert.match(source, /from "\.\/graph-panel-shell\.js"/);
  assert.match(source, /from "\.\/graph-panel-host-deps\.js"/);
  assert.match(source, /from "\.\/graph-panel-renderer\.js"/);
  assert.match(panelRendererSource, /from "\.\/graph-panel-visual-map-props\.js"/);
  assert.match(panelRendererSource, /buildGraphPanelVisualMapProps\(panelState/);
  assert.match(panelRendererSource, /renderGraphPanelFocusedToolbar\(panelState/);
  assert.match(panelShellSource, /buildGraphPanelState\(/);
  assert.match(panelShellSource, /renderGraphPanelForRuntime\(\{ summary, canvas, backButton, panelState \}/);
  assert.match(source, /renderGraphPanelShell\(\{/);
  assert.match(source, /graphPanelRuntimeDeps\(\)/);
  assert.match(panelRuntimeDepsSource, /from "\.\/graph-panel-state-builder-deps\.js"/);
  assert.match(panelRuntimeDepsSource, /from "\.\/graph-panel-renderer-deps\.js"/);
  assert.match(panelRuntimeDepsSource, /stateBuilderDeps: buildGraphPanelStateBuilderDeps\(deps\)/);
  assert.match(panelRuntimeDepsSource, /rendererDeps: buildGraphPanelRendererDeps\(deps\)/);
  assert.doesNotMatch(source, /stateBuilderDeps: \{/);
  assert.doesNotMatch(source, /rendererDeps: \{/);
  assert.doesNotMatch(panelRuntimeDepsSource, /stateBuilderDeps: \{\s*graphRelationStatusCountsAsNetworkEdge/);
  assert.doesNotMatch(panelRuntimeDepsSource, /rendererDeps: \{\s*escapeHtml/);
  assert.doesNotMatch(source, /summary\.textContent = panelState\.summaryText \|\| "";/);
  assert.doesNotMatch(source, /state\.graphConnectivityReady = panelState\.connectivityReady === true;/);
  assert.doesNotMatch(source, /const noticeMarkup = \(panelState\.notices \|\| \[\]\)/);
  assert.doesNotMatch(panelRendererSource, /relationFilterEdges: panelState\.focused\.edges/);
  assert.doesNotMatch(panelRendererSource, /class="graph-canvas-toolbar"/);
  assert.doesNotMatch(source, /const scopedNetworkEdges = allGraphEdges\.filter/);
  assert.doesNotMatch(source, /graphComputedIsolatedNotes\(scopedAllNodes, scopedNetworkEdges/);
  assert.doesNotMatch(source, /const structureFallback = effectiveRelationType === "index"/);
});

test("graph visual map runtime state, chrome, and view deps stay split across graph modules", async () => {
  const visualMapRuntimeDepsSource = await readGraphVisualMapRuntimeDepsSource();
  const visualMapControllerSource = await readGraphVisualMapControllerSource();
  const visualMapComposerSource = await readGraphVisualMapComposerSource();
  const visualMapContextSource = await readGraphVisualMapContextSource();
  const visualMapControlsStateSource = await readGraphVisualMapControlsStateSource();
  const visualMapRuntimeStateSource = await readGraphVisualMapRuntimeStateSource();
  const visualMapSelectionStateSource = await readGraphVisualMapSelectionStateSource();

  assert.match(visualMapRuntimeDepsSource, /from "\.\/graph-visual-map-runtime-state-deps\.js"/);
  assert.match(visualMapRuntimeDepsSource, /from "\.\/graph-visual-map-chrome-deps\.js"/);
  assert.match(visualMapRuntimeDepsSource, /from "\.\/graph-visual-map-view-deps\.js"/);
  assert.match(visualMapRuntimeDepsSource, /\.\.\.buildGraphVisualMapRuntimeStateDeps\(host\)/);
  assert.match(visualMapRuntimeDepsSource, /\.\.\.buildGraphVisualMapChromeDeps\(host\)/);
  assert.match(visualMapRuntimeDepsSource, /\.\.\.buildGraphVisualMapViewDeps\(host\)/);
  assert.doesNotMatch(visualMapRuntimeDepsSource, /renderGraphRelationTypeFilter: graphRelationTypeFilter/);
  assert.doesNotMatch(visualMapRuntimeDepsSource, /graphNodeClass,\s*graphNodeStarRank/);
  assert.match(visualMapControllerSource, /composeGraphVisualMapForRuntime\(options, deps\)/);
  assert.match(visualMapComposerSource, /buildGraphVisualMapRuntimeState\(/);
  assert.match(visualMapComposerSource, /buildGraphVisualMapContextMarkup\(/);
  assert.match(visualMapComposerSource, /buildGraphVisualMapChrome\(/);
  assert.match(visualMapComposerSource, /buildGraphVisualMapShellProps\(/);
  assert.match(visualMapControllerSource, /renderGraphVisualMapShellView\(graphShellProps, shellDeps\)/);
  assert.match(visualMapContextSource, /renderGraphResearchNavigatorPanel/);
  assert.match(visualMapContextSource, /graphThemeBoundaryMeta/);
  assert.match(visualMapControlsStateSource, /buildGraphVisualMapControlsState/);
  assert.match(visualMapControlsStateSource, /graphBuildReadingLensState/);
  assert.match(visualMapRuntimeStateSource, /from "\.\/graph-visual-map-layout-state\.js"/);
  assert.match(visualMapRuntimeStateSource, /buildGraphVisualMapLayoutState\(/);
  assert.match(visualMapSelectionStateSource, /buildGraphVisualMapSelectionState/);
  assert.match(visualMapSelectionStateSource, /graphNodeNeedsRelationWorkflow/);
  assert.doesNotMatch(visualMapControllerSource, /buildGraphVisualMapRuntimeDeps\(\{/);
});

test("prototype graph shell delegates canvas event routing to a graph module", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /from "\.\/graph-canvas-event-router\.js"/);
  assert.match(source, /bindGraphCanvasEvents\(\$\("graphCanvas"\), \{/);
  assert.doesNotMatch(source, /\$\("graphCanvas"\)\?\.addEventListener\("click"/);
  assert.doesNotMatch(source, /function handleGraphHoverIntent/);
  assert.doesNotMatch(source, /function handleGraphHoverExit/);
  assert.doesNotMatch(source, /addEventListener\("mouseover", handleGraphHoverIntent\)/);
  assert.doesNotMatch(source, /addEventListener\(\s*"wheel",\s*\(event\) =>/);
});
