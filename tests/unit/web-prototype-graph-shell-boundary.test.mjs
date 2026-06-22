import test from "node:test";
import assert from "node:assert/strict";
import { readGraphFocusContextPanelSource, readPrototypeAppSource } from "./copy-source-helpers.mjs";

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

  assert.match(source, /renderGraphVisualNodeViews/);
  assert.match(source, /renderGraphVisualEdgeViews/);
  assert.doesNotMatch(source, /<g class="graph-map-node graph-node/);
  assert.doesNotMatch(source, /<g class="graph-map-edge-group graph-edge/);
});

test("prototype graph shell delegates visual map chrome to the shell view", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /renderGraphVisualMapShellView/);
  assert.match(source, /renderGraphZoomStepperView/);
  assert.match(source, /renderGraphMapSvgDefsView/);
  assert.doesNotMatch(source, /<div class="graph-map-canvas">/);
  assert.doesNotMatch(source, /<svg class="graph-map-svg"/);
  assert.doesNotMatch(source, /<radialGradient id="graph-node-core-fill"/);
  assert.doesNotMatch(source, /<div class="graph-map-empty-canvas">/);
});

test("prototype graph shell delegates selection kind dispatch to a graph module", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /from "\.\/graph-selection-dispatcher\.js"/);
  assert.match(source, /renderGraphSelectionPanelViaDispatcher/);
  assert.match(source, /renderNodePanel: renderGraphNodeSelectionPanel/);
  assert.match(source, /renderEdgePanel: renderGraphEdgeSelectionPanel/);
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

test("prototype graph shell delegates panel state building to a graph module", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /from "\.\/graph-panel-state-builder\.js"/);
  assert.match(source, /buildGraphPanelState\(/);
  assert.match(source, /summary\.textContent = panelState\.summaryText \|\| "";/);
  assert.match(source, /renderGraphVisualMap\(\{/);
  assert.doesNotMatch(source, /const scopedNetworkEdges = allGraphEdges\.filter/);
  assert.doesNotMatch(source, /graphComputedIsolatedNotes\(scopedAllNodes, scopedNetworkEdges/);
  assert.doesNotMatch(source, /const structureFallback = effectiveRelationType === "index"/);
});

test("prototype graph shell delegates visual map runtime state to a graph module", async () => {
  const source = await readPrototypeAppSource();
  const visualMapSource = extractFunctionSource(source, "renderGraphVisualMap");

  assert.match(source, /from "\.\/graph-visual-map-runtime-state\.js"/);
  assert.match(source, /from "\.\/graph-visual-map-shell-props\.js"/);
  assert.match(source, /from "\.\/graph-visual-map-chrome\.js"/);
  assert.match(visualMapSource, /buildGraphVisualMapRuntimeState\(/);
  assert.match(visualMapSource, /buildGraphVisualMapChrome\(/);
  assert.match(visualMapSource, /buildGraphVisualMapShellProps\(/);
  assert.match(visualMapSource, /renderGraphVisualMapShellView\(graphShellProps, shellDeps\)/);
  assert.doesNotMatch(visualMapSource, /const adjacencyMap = new Map\(\);[\s\S]*edges\.forEach\(\(edge\) => \{/);
  assert.doesNotMatch(visualMapSource, /const visibleEdges = edges\s*\.map\(\(edge\) => \{/);
  assert.doesNotMatch(visualMapSource, /const selectedNodeNeighborhood = new Set/);
  assert.doesNotMatch(visualMapSource, /sidePanelParts\.length \? `<div class="graph-side-stack">/);
  assert.doesNotMatch(visualMapSource, /const emptyTitle = /);
  assert.doesNotMatch(visualMapSource, /const headContentMarkup = filterActive/);
});
