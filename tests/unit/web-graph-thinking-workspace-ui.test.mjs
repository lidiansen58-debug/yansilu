import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function readPrototypeApp() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

function readPrototypeHtml() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype.html"), "utf8");
}

test("graph workbench entries live beside reading lenses and legend", () => {
  const source = readPrototypeApp();

  assert.match(source, /function renderGraphReadingLensControls\(activeLens = "insight", legendOpen = false, trailingMarkup = ""\) \{/);
  assert.match(source, /<div class="graph-reading-lens-side">[\s\S]*\$\{trailingMarkup \|\| ""\}[\s\S]*id="graphLegendToggle"/);
  assert.match(source, /function renderGraphWorkbenchEntryPills\(\{ clueSummary = null, questionSummary = null \} = \{\}\) \{/);
  assert.match(source, /data-graph-workbench-entry="\$\{escapeHtml\(meta\.key\)\}"/);
  assert.match(source, /const label = total > 0 \? meta\.label : meta\.emptyLabel;/);
  assert.match(source, /renderGraphReadingLensControls\(readingLens\.key, legendOpen, workbenchEntryMarkup\)/);
});

test("graph workbench panel replaces map-covering clue and question floaters", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphWorkbenchPanel\(\{ clueSummary = \{\}, questionSummary = \{\}, clueSectionsMarkup = "", thinkingItems = \[\] \} = \{\}\) \{/);
  assert.match(source, /const open = graphState\.workbenchPanelOpen === true;/);
  assert.match(source, /data-graph-workbench-tab="\$\{escapeHtml\(meta\.key\)\}"/);
  assert.match(source, /data-graph-workbench-close/);
  assert.match(source, /const sidePanelParts = \[[\s\S]*!filterActive \? workbenchPanelMarkup : ""/);
  assert.doesNotMatch(source, /thinkingPanelMarkup: thinkingPanel/);
  assert.doesNotMatch(source, /utilityDrawerMarkup: utilityDrawer/);

  assert.match(html, /\.graph-workbench-panel \{[\s\S]*position: relative;[\s\S]*z-index: 8;/);
  assert.match(html, /\.graph-side-stack \{[\s\S]*display: grid;[\s\S]*align-content: start;/);
});

test("graph research navigator explains the map before users drill into details", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphResearchNavigatorPanel\(\{ nodes = \[\], edges = \[\], topicCandidates = \[\], bridgeGaps = \[\], clusterMeta = \[\], clueSummary = null, questionSummary = null \} = \{\}\) \{/);
  assert.match(source, /graphResearchNavigatorState\(\{ nodes, edges, topicCandidates, bridgeGaps, clusterMeta, clueSummary, questionSummary \}\)/);
  assert.match(source, /<aside class="graph-research-navigator" aria-label="研究导航">/);
  assert.match(source, /这批笔记形成 \$\{clusters\.length\} 个主要星系/);
  assert.match(source, /data-graph-select-cluster="\$\{escapeHtml\(cluster\.clusterKey\)\}"/);
  assert.match(source, /data-graph-select-node="\$\{escapeHtml\(node\.id\)\}"/);
  assert.match(source, /selectionContextMarkup \|\| focusContextMarkup \|\| researchNavigatorMarkup/);

  assert.match(html, /\.graph-research-navigator \{[\s\S]*display: grid;[\s\S]*padding: 14px;/);
  assert.match(html, /\.graph-research-verdict \{[\s\S]*radial-gradient/);
  assert.match(html, /\.graph-research-card:hover,[\s\S]*\.graph-research-card:focus-visible \{[\s\S]*transform: translateY\(-1px\);/);
});

test("graph clusters are selectable research objects with their own summary panel", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function graphClusterResearchMeta\(cluster = \{\}, \{ nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.match(source, /function renderGraphClusterSelectionPanel\(\{ selection = null, clusterMeta = \[\], nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.match(source, /kind: "cluster"/);
  assert.match(source, /data-graph-select-cluster="\$\{escapeHtml\(clusterKey\)\}"/);
  assert.match(source, /openGraphSelection\(\{ kind: "cluster", clusterKey \}\);/);
  assert.match(source, /kicker: "星系摘要"/);
  assert.match(source, /roleLabel: meta\.label/);
  assert.match(source, /补星系关系/);

  assert.match(html, /\.graph-map-cluster-glows \{[\s\S]*pointer-events: auto;/);
  assert.match(html, /\.graph-map-cluster-glow \{[\s\S]*cursor: pointer;[\s\S]*pointer-events: visiblePainted;/);
});

test("graph research details cover nodes and relation gravity lines with next actions", () => {
  const source = readPrototypeApp();

  assert.match(source, /if \(String\(graphState\.selection\?\.kind \|\| ""\)\.trim\(\)\.toLowerCase\(\) !== "cluster"\) \{/);
  assert.match(source, /kicker: "笔记角色"/);
  assert.match(source, /roleLabel: role\.label/);
  assert.match(source, /补一条关系/);
  assert.match(source, /kicker: "关系复核"/);
  assert.match(source, /roleLabel: review\.label/);
  assert.match(source, /<strong>复核问题<\/strong>/);
  assert.match(source, /data-graph-relation-adjustment/);
});

test("graph AI analysis opens the question workbench instead of navigating away", () => {
  const source = readPrototypeApp();
  const match = source.match(/async function runGraphAiAnalysis\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, "expected runGraphAiAnalysis() to exist");

  assert.match(match[1], /graphState\.thinkingPanelVisible = true;/);
  assert.match(match[1], /graphState\.thinkingPanelOpen = true;/);
  assert.match(match[1], /graphState\.thinkingFilter = "all";/);
  assert.match(match[1], /graphState\.workbenchPanelOpen = true;/);
  assert.match(match[1], /graphState\.workbenchPanelTab = "questions";/);
  assert.doesNotMatch(match[1], /openAiInboxModule/, "graph scan should not auto-navigate away from the graph");
});

test("graph demo startup resets presentation state for a stable first screen", () => {
  const source = readPrototypeApp();
  const match = source.match(/function resetGraphDemoPresentationState\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, "expected resetGraphDemoPresentationState() to exist");

  assert.match(match[1], /setGraphRelationTypeFilter\("meaningful", \{ persist: false \}\);/);
  assert.match(match[1], /graphState\.readingLens = "insight";/);
  assert.match(match[1], /graphState\.focusDepth = "1";/);
  assert.match(match[1], /graphState\.zoom = "fit";/);
  assert.match(match[1], /graphState\.workbenchPanelOpen = false;/);
  assert.match(match[1], /graphState\.thinkingPanelVisible = true;/);
  assert.match(match[1], /graphState\.utilityDrawerVisible = true;/);
  assert.match(match[1], /"weak-relations": false/);
});

test("graph density hint is temporary and does not stay on the map", () => {
  const source = readPrototypeApp();
  assert.match(source, /const GRAPH_DENSITY_HINT_TIMEOUT_MS = 10000;/);
  assert.match(source, /function scheduleGraphDensityHintDismiss\(\) \{/);
  assert.match(source, /window\.setTimeout\(\(\) => \{[\s\S]*graphState\.densityHintVisibleUntil = 0;[\s\S]*if \(state\.module === "graph"\) renderGraphPanel\(\);[\s\S]*\}, remaining\)/);
  assert.match(source, /function shouldShowGraphDensityHint\(\{ dense = false, filterActive = false \} = \{\}\) \{/);
});

test("graph zoom controls include both stepper directions and preset levels", () => {
  const source = readPrototypeApp();

  assert.match(source, /data-graph-zoom-step="-1" aria-label="缩小图谱"/);
  assert.match(source, /data-graph-zoom-step="1" aria-label="放大图谱"/);
  assert.match(source, /data-graph-zoom-option="\$\{escapeHtml\(key\)\}"/);
  assert.match(source, /const nextZoom = graphZoomStep\(graphState\.zoom, Number\(zoomStepButton\.getAttribute\("data-graph-zoom-step"\) \|\| 0\)\);/);
});

test("starfield graph keeps relation lines hairline and arrows quiet", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /markerWidth="4\.2" markerHeight="4\.2"/);
  assert.match(source, /stroke-opacity="0\.48" stroke-width="0\.52"/);
  assert.match(html, /\.graph-map-edge \{[\s\S]*stroke-width: 0\.3;[\s\S]*opacity: 0\.1;/);
  assert.match(html, /\.graph-map-edge-underlay \{[\s\S]*stroke-width: 0\.82;[\s\S]*opacity: 0\.065;/);
  assert.match(html, /\.graph-map-edge-label \{[\s\S]*display: none;/);
  assert.match(html, /\.graph-map-svg\[data-graph-zoom="fit"\] \.graph-map-edge \{[\s\S]*marker-end: none;/);
});

test("starfield graph uses point-like low-rank nodes in dense fit view", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /const pointLike =[\s\S]*graphNodeShowsAsPoint\(node\)[\s\S]*denseGalaxyMode[\s\S]*zoom\.key === "fit"[\s\S]*starRank <= 2/);
  assert.match(source, /\$\{pointLike \? "" : `<circle class="graph-map-node-glint"/);
  assert.match(html, /\.graph-map-node\.is-star-dust \.graph-map-node-core \{[\s\S]*opacity: 0\.44;/);
  assert.match(html, /\.graph-map-node\.is-star-major \.graph-map-node-core \{[\s\S]*stroke-width: 0\.84;/);
  assert.match(html, /\.graph-map-node\.is-star-core \.graph-map-node-core,[\s\S]*\.graph-map-node\.is-star-focus \.graph-map-node-core \{[\s\S]*stroke-width: 1\.1;/);
});

test("starfield graph reduces continuous motion when users prefer reduced motion", () => {
  const html = readPrototypeHtml();

  assert.match(html, /@media \(prefers-reduced-motion: reduce\) \{/);
  assert.match(html, /\.graph-map-star,/);
  assert.match(html, /\.graph-map-nebula,/);
  assert.match(html, /\.graph-map-cluster-glow,/);
  assert.match(html, /\.graph-map-node-core,/);
  assert.match(html, /\.graph-map-edge-group\.is-focused-path \.graph-map-edge,/);
});

test("graph thinking cards still highlight anchored graph elements", () => {
  const source = readPrototypeApp();

  assert.match(source, /function graphThinkingHighlightAttrs\(item = \{\}\) \{/);
  assert.match(source, /data-graph-thinking-node-ids/);
  assert.match(source, /data-graph-thinking-edge-key/);
  assert.match(source, /function applyGraphThinkingHoverState\(thinkingElement\) \{/);
  assert.match(source, /panel\.classList\.add\("is-hovering-thinking"\);/);
  assert.match(source, /element\.classList\.toggle\("is-hovered", hovered\);/);
});
