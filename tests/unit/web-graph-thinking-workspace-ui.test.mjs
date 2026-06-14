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

function readDomainCatalogStore() {
  return fs.readFileSync(path.join(repoRoot, "packages/domain/src/note-catalog-store.mjs"), "utf8");
}

test("graph workbench entries live beside reading lenses and legend", () => {
  const source = readPrototypeApp();

  assert.match(source, /function renderGraphReadingLensControls\(activeLens = "insight", legendOpen = false, trailingMarkup = ""\) \{/);
  assert.match(source, /<div class="graph-reading-lens-side">[\s\S]*\$\{trailingMarkup \|\| ""\}[\s\S]*id="graphLegendToggle"/);
  assert.match(source, /function renderGraphWorkbenchEntryPills\(\{ clueSummary = null, questionSummary = null \} = \{\}\) \{/);
  assert.match(source, /label: "线索"/);
  assert.match(source, /label: "追问"/);
  assert.match(source, /data-graph-workbench-entry="\$\{escapeHtml\(meta\.key\)\}"/);
  assert.match(source, /const label = total > 0 \? meta\.label : meta\.emptyLabel;/);
  assert.match(source, /const readingLensTrailingMarkup = `\$\{workbenchEntryMarkup\}\$\{researchNavigatorEntryMarkup\}`;/);
  assert.match(source, /renderGraphReadingLensControls\(readingLens\.key, legendOpen, readingLensTrailingMarkup\)/);
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
  assert.match(html, /\.graph-workbench-entry \{[\s\S]*min-height: 26px;[\s\S]*padding: 0 8px;/);
  assert.match(html, /\.graph-workbench-entry-group \{[\s\S]*flex-wrap: nowrap;/);
  assert.match(html, /\.graph-side-stack \{[\s\S]*height: var\(--graph-map-height\);[\s\S]*overflow: auto;/);
  assert.match(html, /\.graph-map-stage \{[\s\S]*background: transparent;[\s\S]*overflow: visible;/);
  assert.match(html, /\.graph-map-stage::before \{[\s\S]*content: none;/);
  assert.match(html, /\.graph-map-empty-canvas \{[\s\S]*background:[\s\S]*linear-gradient\(180deg, #030812 0%, #060d18 42%, #091423 100%\);/);
});

test("graph research navigator explains the map before users drill into details", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphResearchNavigatorPanel\(\{ nodes = \[\], edges = \[\], topicCandidates = \[\], bridgeGaps = \[\], clusterMeta = \[\], clueSummary = null, questionSummary = null \} = \{\}\) \{/);
  assert.match(source, /<aside class="graph-research-navigator" aria-label="[^"]+">/);
  assert.match(source, /const headline = clusters\.length/);
  assert.match(source, /const nextAction = clusters\.length/);
  assert.match(source, /const pendingNote = pendingTotal/);
  assert.match(source, /\{ label: "主题星系", value: `\$\{nav\.clusters\.length\} 个`, hint: "主题团块" \}/);
  assert.match(source, /\{ label: "待处理线索", value: `\$\{nav\.pendingTotal\} 项`, hint: "待补关系或追问" \}/);
  assert.match(source, /data-graph-select-cluster="\$\{escapeHtml\(cluster\.clusterKey\)\}"/);
  assert.match(source, /data-graph-select-node="\$\{escapeHtml\(node\.id\)\}"/);
  assert.match(source, /data-graph-research-close/);
  assert.match(source, /function renderGraphResearchNavigatorEntry\(open = false\) \{/);
  assert.match(source, /const label = "概览";/);
  assert.match(source, /data-graph-research-open/);
  assert.match(source, /data-graph-research-\$\{action\}/);
  assert.match(source, /const researchNavigatorAutoHidden = denseGalaxyMode && graphState\.researchNavigatorTouched !== true;/);
  assert.match(source, /const researchNavigatorHidden = graphState\.researchNavigatorHidden === true \|\| researchNavigatorAutoHidden;/);
  assert.match(source, /const researchNavigatorOpen = !filterActive && researchNavigatorHidden !== true && !selectionContextMarkup && !workbenchPanelMarkup;/);
  assert.match(source, /!filterActive && !selectionContextMarkup[\s\S]*renderGraphResearchNavigatorEntry\(researchNavigatorOpen\)/);
  assert.match(source, /graphState\.researchNavigatorHidden = true;[\s\S]*setStatus\("已收起概览", "ok"\);/);
  assert.match(source, /graphState\.researchNavigatorHidden = false;[\s\S]*graphState\.researchNavigatorTouched = true;[\s\S]*setStatus\("已显示概览", "ok"\);/);
  assert.match(source, /selectionContextMarkup \|\| focusContextMarkup \|\| researchNavigatorMarkup/);

  assert.match(html, /\.graph-research-next \{[\s\S]*border-radius: 15px;/);
  assert.match(html, /\.graph-selection-metrics em \{[\s\S]*font-size: 10px;/);
  assert.match(html, /\.graph-research-navigator \{[\s\S]*position: relative;[\s\S]*display: grid;[\s\S]*padding: 14px;/);
  assert.match(html, /\.graph-research-close \{[\s\S]*position: absolute;[\s\S]*right: 12px;/);
  assert.match(html, /\.graph-research-entry \{[\s\S]*color: #0f6f48;/);
  assert.match(html, /\.graph-research-verdict \{[\s\S]*radial-gradient/);
  assert.match(html, /\.graph-research-card:hover,[\s\S]*\.graph-research-card:focus-visible \{[\s\S]*transform: translateY\(-1px\);/);
});

test("graph structure view falls back to galaxy clusters instead of an empty map", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function graphHasMeaningfulStructureEdges\(edges = \[\]\) \{/);
  assert.match(source, /function graphStructureFallbackEdges\(edges = \[\], filters = \{\}\) \{/);
  assert.match(source, /const structureFallback = effectiveRelationType === "index" && !showingFocusedNote && !filteredEdges\.length && graphHasMeaningfulStructureEdges\(focused\.edges\);/);
  assert.match(source, /filteredEdges = graphStructureFallbackEdges\(focused\.edges, activeFilters\);/);
  assert.match(source, /当前没有主题归属关系，已用星系聚类显示结构星图。/);
  assert.match(source, /结构星图（星系聚类）/);
  assert.match(html, /\.graph-structure-fallback-note \{[\s\S]*background: rgba\(239, 250, 255, 0\.9\);/);
});

test("graph research navigator uses cluster maturity for global verdicts", () => {
  const source = readPrototypeApp();

  assert.match(source, /const matureClusterCount = clusterSummaries\.filter\(\(item\) => item\.meta\?\.tone === "mature"\)\.length;/);
  assert.match(source, /const testingClusterCount = clusterSummaries\.filter\(\(item\) => item\.meta\?\.tone === "testing"\)\.length;/);
  assert.match(source, /const promisingClusterCount = matureClusterCount \+ testingClusterCount;/);
  assert.match(source, /const headline = clusters\.length/);
  assert.match(source, /const nextAction = clusters\.length/);
  assert.match(source, /const pendingNote = pendingTotal/);
  assert.match(source, /其中 \$\{promisingClusterCount\} 个可以继续提炼成研究问题或文章判断。/);
  assert.doesNotMatch(source, /matureThemeCount/);
});

test("graph workbench prioritizes Chinese clue and question actions", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();
  const domain = readDomainCatalogStore();

  assert.match(source, /function graphLocalizedActionText\(value = "", fallback = ""\) \{/);
  assert.match(source, /补一条中间判断，或建立一条能说清理由的关系，把它接回现有论证。/);
  assert.match(source, /detail: graphLocalizedActionText\(gap\?\.suggestedAction \|\| gap\?\.rationale/);
  assert.match(source, /function graphBridgeGapInNodeScope\(gap = \{\}, nodeIds = new Set\(\)\) \{/);
  assert.match(source, /function graphReviewQueueInNodeScope\(reviewQueue = null, nodeIds = new Set\(\)\) \{/);
  assert.match(source, /const scopedActionNodeIds = graphNodeIdsInScope\(scopedAllNodes\);/);
  assert.match(source, /const bridgeGaps = \(Array\.isArray\(graphInsights\.bridgeGaps\) \? graphInsights\.bridgeGaps : \[\]\)\.filter\(\(gap\) => graphBridgeGapInNodeScope\(gap, scopedActionNodeIds\)\);/);
  assert.match(source, /const scopedReviewQueue = graphReviewQueueInNodeScope\(graphState\.reviewQueue, scopedActionNodeIds\);/);
  assert.match(source, /const scopedTensionRelations = \(Array\.isArray\(scoped\.edges\) \? scoped\.edges : \[\]\)\.filter/);
  assert.match(source, /return group === "conflict" \|\| group === "boundary";/);
  assert.match(source, /const conflictingRelations = graphMergeRelationsByKey\(insightConflictingRelations, scopedTensionRelations\);/);
  assert.match(source, /fetchRelationReviewQueue\(\{ directoryId, includeDescendants: true, limit: 8 \}\)/);
  assert.match(source, /function renderGraphWorkbenchPriorityQueue\(items = \[\], activeKey = "questions"\) \{/);
  assert.match(source, /最该先处理的 3 条线索/);
  assert.match(source, /最该先追问的 3 处/);
  assert.match(html, /\.graph-priority-queue \{[\s\S]*display: grid;[\s\S]*radial-gradient/);
  assert.match(domain, /suggestedAction: "补一条中间判断，或建立一条能说清理由的关系，把它接回现有论证。"/);
  assert.doesNotMatch(domain, /Add an intermediate note or an explicit relation/);
});

test("graph map side panel does not stretch a second dark canvas below the map", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /<div class="graph-map-stage\$\{sidePanelMarkup \? " has-side-panel" : ""\}">/);
  assert.match(html, /\.graph-map-stage\.has-side-panel \{[\s\S]*min-height: 0;[\s\S]*background: transparent;[\s\S]*overflow: visible;/);
  assert.match(html, /\.graph-map-stage\.has-side-panel::before,[\s\S]*\.graph-map-stage\.has-side-panel::after \{[\s\S]*display: none;/);
  assert.match(html, /\.graph-map-body\.has-side-panel \{[\s\S]*align-items: start;[\s\S]*min-height: 0;/);
  assert.match(html, /\.graph-map-stage\.has-side-panel \.graph-map-canvas \{[\s\S]*overflow: hidden;[\s\S]*linear-gradient\(180deg, #030812 0%, #060d18 42%, #091423 100%\);/);
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
  const html = readPrototypeHtml();

  assert.match(source, /if \(String\(graphState\.selection\?\.kind \|\| ""\)\.trim\(\)\.toLowerCase\(\) !== "cluster"\) \{/);
  assert.match(source, /class="graph-overlay-close graph-selection-close"/);
  assert.doesNotMatch(source, /data-graph-selection-close[^>]*>收起<\/button>/);
  assert.match(source, /kicker: "笔记角色"/);
  assert.match(source, /roleLabel: role\.label/);
  assert.match(source, /补一条关系/);
  assert.match(source, /kicker: "关系复核"/);
  assert.match(source, /roleLabel: review\.label/);
  assert.match(source, /<strong>复核问题<\/strong>/);
  assert.match(source, /data-graph-relation-adjustment/);

  assert.match(html, /\.graph-selection-close \{[\s\S]*position: absolute;[\s\S]*right: 10px;/);
  assert.match(html, /\.graph-map-floater \{[\s\S]*position: sticky;[\s\S]*height: 36px;[\s\S]*margin: 12px 0 -48px 12px;[\s\S]*overflow: visible;/);
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
  assert.match(match[1], /addSystemMessage\(\{/);
  assert.match(match[1], /graphState\.aiReviewSystemMessageId = messageId;/);
  assert.doesNotMatch(match[1], /openAiInboxModule/, "graph scan should not auto-navigate away from the graph");
});

test("graph AI review action opens system messages instead of the AI review module directly", () => {
  const source = readPrototypeApp();
  const start = source.indexOf('  const graphAiInboxButton = event.target.closest("[data-open-ai-inbox-from-graph]");');
  const end = source.indexOf('  const retryButton = event.target.closest("[data-graph-retry]");', start);
  assert.ok(start >= 0 && end > start, "expected graph AI review action handler");
  const handler = source.slice(start, end);

  assert.match(handler, /const graphMessageId = String\(graphState\.aiReviewSystemMessageId \|\| ""\)\.trim\(\)/);
  assert.match(handler, /selectedSystemMessageId = selectedGraphMessage/);
  assert.match(handler, /openSystemMessages\(\)/);
  assert.doesNotMatch(handler, /openSystemMessages\(\{ latestOnly: true \}\)/);
  assert.doesNotMatch(handler, /activateModule\("aiInbox"\)/);
  assert.doesNotMatch(handler, /openAiInboxModule\(\)/);
});

test("graph demo startup resets presentation state for a stable first screen", () => {
  const source = readPrototypeApp();
  const match = source.match(/function resetGraphDemoPresentationState\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, "expected resetGraphDemoPresentationState() to exist");

  assert.match(match[1], /setGraphRelationTypeFilter\("meaningful", \{ persist: false \}\);/);
  assert.match(match[1], /graphState\.readingLens = "insight";/);
  assert.match(match[1], /graphState\.focusDepth = "1";/);
  assert.match(match[1], /graphState\.zoom = "fit";/);
  assert.match(match[1], /graphState\.researchNavigatorHidden = false;/);
  assert.match(match[1], /graphState\.researchNavigatorTouched = false;/);
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
  const html = readPrototypeHtml();

  assert.match(source, /data-graph-zoom-step="-1" aria-label="缩小图谱"/);
  assert.match(source, /data-graph-zoom-step="1" aria-label="放大图谱"/);
  assert.match(source, /data-graph-zoom-option="\$\{escapeHtml\(key\)\}"/);
  assert.match(source, /if \(key === "hand"\) \{/);
  assert.match(source, /class="graph-floater-toggle graph-pan-hint"[\s\S]*aria-label="拖动画布"[\s\S]*renderGraphIcon\("hand"\)/);
  assert.doesNotMatch(source, /graph-pan-hint[\s\S]{0,180}<span>拖动<\/span>/);
  assert.match(html, /\.graph-pan-hint \{[\s\S]*width: 36px;[\s\S]*cursor: grab;/);
  assert.match(source, /const nextZoom = graphZoomStep\(graphState\.zoom, Number\(zoomStepButton\.getAttribute\("data-graph-zoom-step"\) \|\| 0\)\);/);
});

test("graph rail entry does not fall through to note explorer during async refresh", () => {
  const source = readPrototypeApp();

  assert.match(source, /document\.querySelectorAll\("\.rail-btn\[data-module\]"\)\.forEach\(\(btn\) => \{/);
  assert.match(source, /btn\.addEventListener\("click", async \(event\) => \{/);
  assert.match(source, /event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);/);
  assert.match(source, /const targetModule = btn\.dataset\.module;/);
  assert.match(source, /if \(targetModule === "graph"\) graphModuleActivationGuardUntil = Date\.now\(\) \+ 1800;/);
  assert.match(source, /if \(targetModule === "graph" && state\.module === "graph"\) \{[\s\S]*await refreshDirectoryGraph\(\);[\s\S]*if \(state\.module === "graph"\) setStatus\("已打开永久笔记关系图谱", "ok"\);/);
  assert.match(source, /if \(state\.module !== "graph" && Date\.now\(\) < graphModuleActivationGuardUntil\) \{[\s\S]*activateModule\("graph"\);[\s\S]*\}/);
  assert.match(source, /document\.querySelectorAll\("\[data-action\^='quick-'\]"\)\.forEach\(\(btn\) => \{[\s\S]*btn\.addEventListener\("click", async \(event\) => \{[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);/);
  assert.match(source, /if \(action === "quick-original" && Date\.now\(\) < graphModuleActivationGuardUntil\) \{[\s\S]*setStatus\("已停留在关系图谱", "ok"\);[\s\S]*return;/);
});

test("note box and graph tree sync all notes under the selected root", () => {
  const source = readPrototypeApp();

  assert.match(source, /async function syncNotesForDirectoryTree\(rootDirectoryId\) \{/);
  assert.match(source, /const directoryIds = descendantDirectoryIds\(rootId\)\.filter\(\(id\) => folderById\(state, id\)\);[\s\S]*for \(const directoryId of directoryIds\) \{[\s\S]*await syncNotesForDirectory\(directoryId\);/);
  assert.match(source, /await refreshVaultSettings\(\);[\s\S]*await syncDirectoriesFromApi\(\);[\s\S]*await syncNotesForDirectoryTree\(state\.browserRootId\);/);
  assert.match(source, /state\.module = "explorer";[\s\S]*state\.selectedFileId = null;[\s\S]*await syncNotesForDirectoryTree\(state\.browserRootId\);[\s\S]*syncRailSelectionState\(\);/);
  assert.match(source, /async function refreshDirectoryGraph\(\) \{[\s\S]*renderGraphPanel\(\);[\s\S]*try \{[\s\S]*await syncNotesForDirectoryTree\(networkDirectoryId\);[\s\S]*const \[graph, conflicts, reviewQueue\] = await Promise\.all/);
});

test("graph module sidebar is labeled as graph scope instead of permanent-note browser", () => {
  const source = readPrototypeApp();
  const graphSidebarBranch = source.match(/if \(state\.module === "graph"\) \{([\s\S]*?)\n\s*return;\n\s*\}/)?.[1] || "";

  assert.match(graphSidebarBranch, /\$\("sidebarTitle"\)\.textContent = "图谱笔记范围";/);
  assert.match(graphSidebarBranch, /这里不是永久笔记页；点目录或笔记是在切换图谱观察范围。/);
  assert.match(graphSidebarBranch, /孤立笔记会在这里集中提醒，可逐条关联笔记，加入关系网络。/);
  assert.doesNotMatch(graphSidebarBranch, /永久笔记浏览/);
});

test("graph load failure renders a quiet empty state instead of a red error panel", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();
  const errorState = source.match(/function renderGraphErrorState\(message = ""\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const hardErrorBranch = source.match(/if \(graphState\.error && !canReuseScopedGraph\) \{([\s\S]*?)\n\s*const graph = canReuseScopedGraph/)?.[1] || "";

  assert.match(errorState, /class="graph-empty graph-error-card"/);
  assert.doesNotMatch(errorState, /graph-empty bad/);
  assert.doesNotMatch(errorState, /\$\{escapeHtml\(text\)\}/);
  assert.match(errorState, /图谱暂时没有读出来/);
  assert.match(errorState, /刷新图谱/);
  assert.doesNotMatch(errorState, /Failed to fetch/);
  assert.match(hardErrorBranch, /summary\.textContent = "图谱暂时无法读取，笔记树仍可正常使用。";/);
  assert.doesNotMatch(hardErrorBranch, /summary\.textContent = `图谱加载失败/);
  assert.match(html, /\.graph-error-card strong \{[\s\S]*color: #17324d;/);
  assert.match(html, /\.graph-error-card span \{[\s\S]*color: #587086;/);
});

test("starfield graph keeps relation lines hairline and arrows quiet", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /markerWidth="4\.2" markerHeight="4\.2"/);
  assert.match(source, /stroke-opacity="0\.48" stroke-width="0\.52"/);
  assert.match(html, /\.graph-map-svg \{[\s\S]*border-radius: 28px;[\s\S]*linear-gradient\(135deg, #040912 0%, #07111e 48%, #0b1828 100%\);/);
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
