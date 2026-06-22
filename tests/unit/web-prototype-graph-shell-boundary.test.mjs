import test from "node:test";
import assert from "node:assert/strict";
import {
  readGraphFocusContextPanelSource,
  readGraphPanelRuntimeDepsSource,
  readGraphPanelShellSource,
  readGraphVisualMapControllerSource,
  readGraphVisualMapViewRendererSource,
  readPrototypeAppSource
} from "./copy-source-helpers.mjs";

function extractFunctionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  assert.ok(start >= 0, `expected ${functionName} to exist`);
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, nextFunction > start ? nextFunction : undefined);
}

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
  const source = await readPrototypeAppSource();
  const visualMapControllerSource = await readGraphVisualMapControllerSource();
  const visualMapViewRendererSource = await readGraphVisualMapViewRendererSource();

  assert.match(source, /renderGraphVisualMapForRuntime/);
  assert.match(visualMapControllerSource, /from "\.\/graph-visual-map-view-renderer\.js"/);
  assert.match(visualMapViewRendererSource, /renderGraphVisualNodeViews/);
  assert.match(visualMapViewRendererSource, /renderGraphVisualEdgeViews/);
  assert.doesNotMatch(source, /<g class="graph-map-node graph-node/);
  assert.doesNotMatch(source, /<g class="graph-map-edge-group graph-edge/);
  assert.doesNotMatch(visualMapControllerSource, /renderGraphVisualNodeViews\(layout\.nodes/);
  assert.doesNotMatch(visualMapControllerSource, /renderGraphVisualEdgeViews\(visibleEdges/);
});

test("prototype graph shell delegates visual map chrome to the shell view", async () => {
  const source = await readPrototypeAppSource();
  const visualMapControllerSource = await readGraphVisualMapControllerSource();

  assert.match(source, /renderGraphVisualMapForRuntime/);
  assert.match(visualMapControllerSource, /renderGraphVisualMapShellView/);
  assert.match(visualMapControllerSource, /renderGraphZoomStepperView/);
  assert.match(visualMapControllerSource, /renderGraphMapSvgDefsView/);
  assert.doesNotMatch(source, /<div class="graph-map-canvas">/);
  assert.doesNotMatch(source, /<svg class="graph-map-svg"/);
  assert.doesNotMatch(source, /<radialGradient id="graph-node-core-fill"/);
  assert.doesNotMatch(source, /<div class="graph-map-empty-canvas">/);
});

test("prototype graph shell delegates selection kind dispatch to a graph module", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /from "\.\/graph-selection-dispatcher\.js"/);
  assert.match(source, /from "\.\/graph-selection-runtime-deps\.js"/);
  assert.match(source, /renderGraphSelectionPanelViaDispatcher/);
  assert.match(source, /buildGraphSelectionDispatcherDeps\(\{/);
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
  const panelShellSource = await readGraphPanelShellSource();
  const panelRuntimeDepsSource = await readGraphPanelRuntimeDepsSource();

  assert.match(source, /from "\.\/graph-panel-state-builder\.js"/);
  assert.match(source, /from "\.\/graph-panel-shell\.js"/);
  assert.match(source, /from "\.\/graph-panel-runtime-deps\.js"/);
  assert.match(source, /from "\.\/graph-panel-renderer\.js"/);
  assert.match(panelShellSource, /buildGraphPanelState\(/);
  assert.match(panelShellSource, /renderGraphPanelForRuntime\(\{ summary, canvas, backButton, panelState \}/);
  assert.match(source, /renderGraphPanelShell\(\{/);
  assert.match(source, /graphPanelRuntimeDeps\(\)/);
  assert.match(panelRuntimeDepsSource, /stateBuilderDeps: \{/);
  assert.match(panelRuntimeDepsSource, /rendererDeps: \{/);
  assert.doesNotMatch(source, /stateBuilderDeps: \{/);
  assert.doesNotMatch(source, /rendererDeps: \{/);
  assert.doesNotMatch(source, /summary\.textContent = panelState\.summaryText \|\| "";/);
  assert.doesNotMatch(source, /state\.graphConnectivityReady = panelState\.connectivityReady === true;/);
  assert.doesNotMatch(source, /const noticeMarkup = \(panelState\.notices \|\| \[\]\)/);
  assert.doesNotMatch(source, /const scopedNetworkEdges = allGraphEdges\.filter/);
  assert.doesNotMatch(source, /graphComputedIsolatedNotes\(scopedAllNodes, scopedNetworkEdges/);
  assert.doesNotMatch(source, /const structureFallback = effectiveRelationType === "index"/);
});

test("prototype graph shell delegates visual map runtime state to a graph module", async () => {
  const source = await readPrototypeAppSource();
  const visualMapSource = extractFunctionSource(source, "renderGraphVisualMap");
  const layoutSource = extractFunctionSource(source, "graphBuildVisualLayout");

  assert.match(source, /from "\.\/graph-visual-map-controller\.js"/);
  assert.match(source, /from "\.\/graph-visual-map-runtime-deps\.js"/);
  assert.match(source, /from "\.\/graph-visual-layout\.js"/);
  assert.match(source, /function graphVisualMapRuntimeDeps\(\)/);
  assert.match(visualMapSource, /renderGraphVisualMapForRuntime\(options, graphVisualMapRuntimeDeps\(\)\)/);
  assert.doesNotMatch(visualMapSource, /zoomOptions: GRAPH_VISUAL_ZOOM_OPTIONS/);
  assert.doesNotMatch(visualMapSource, /buildGraphVisualMapRuntimeDeps\(\{/);
  assert.doesNotMatch(visualMapSource, /buildGraphVisualMapRuntimeState\(/);
  assert.doesNotMatch(visualMapSource, /buildGraphVisualMapChrome\(/);
  assert.doesNotMatch(visualMapSource, /buildGraphVisualMapShellProps\(/);
  assert.doesNotMatch(visualMapSource, /renderGraphVisualMapShellView\(graphShellProps, shellDeps\)/);
  assert.match(layoutSource, /graphBuildVisualLayoutForRuntime\(nodes, edges, options/);
  assert.match(layoutSource, /graphNodeRadiusByTier/);
  assert.doesNotMatch(visualMapSource, /const adjacencyMap = new Map\(\);[\s\S]*edges\.forEach\(\(edge\) => \{/);
  assert.doesNotMatch(visualMapSource, /const visibleEdges = edges\s*\.map\(\(edge\) => \{/);
  assert.doesNotMatch(visualMapSource, /const selectedNodeNeighborhood = new Set/);
  assert.doesNotMatch(visualMapSource, /sidePanelParts\.length \? `<div class="graph-side-stack">/);
  assert.doesNotMatch(visualMapSource, /const emptyTitle = /);
  assert.doesNotMatch(visualMapSource, /const headContentMarkup = filterActive/);
  assert.doesNotMatch(layoutSource, /clusterAssignments = new Map/);
  assert.doesNotMatch(layoutSource, /clusterMembers\.forEach/);
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
