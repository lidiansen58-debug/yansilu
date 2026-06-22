import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  graphBlockedAiRelationPairKeysForNote as moduleGraphBlockedAiRelationPairKeysForNote,
  graphCandidateBlocksFormalRelation as moduleGraphCandidateBlocksFormalRelation,
  graphMergeRelationCandidatesForDisplay as moduleGraphMergeRelationCandidatesForDisplay,
  graphPendingAiCandidateCount as moduleGraphPendingAiCandidateCount,
  graphRelationRationaleIsActionable as moduleGraphRelationRationaleIsActionable,
  graphRelationStatusCountsAsNetworkEdge as moduleGraphRelationStatusCountsAsNetworkEdge
} from "../../apps/web/src/graph-ai-candidates.js";
import {
  graphManualRelationTargetsForNote as moduleGraphManualRelationTargetsForNote
} from "../../apps/web/src/graph-local-relations.js";
import {
  graphIsolatedJoinNetworkFormModel
} from "../../apps/web/src/graph-isolated-relation-form.js";
import {
  relationNetworkStatusForNotePolicy
} from "../../apps/web/src/note-persistence-policy.js";
import {
  renderGraphClusterGlowView
} from "../../apps/web/src/graph-visual-map-view.js";
import {
  renderGraphMapEmptyStateView,
  renderGraphMapSvgDefsView,
  renderGraphVisualMapShellView,
  renderGraphZoomStepperView
} from "../../apps/web/src/graph-visual-map-shell.js";
import {
  renderGraphSelectionByKind
} from "../../apps/web/src/graph-selection-dispatcher.js";
import {
  graphFocusContextCollapsedState,
  graphFocusContextCollapsedStatus,
  graphFocusHelpOpenState,
  graphFocusHelpStatus,
  renderGraphFocusContextPanel
} from "../../apps/web/src/graph-focus-context-panel.js";
import {
  graphVisualNodeViewState,
  renderGraphVisualNodeView
} from "../../apps/web/src/graph-visual-node-view.js";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function readPrototypeApp() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

function readGraphIsolatedRelationWorkspace() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-isolated-relation-workspace.js"), "utf8");
}

function readGraphIsolatedRelationController() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-isolated-relation-controller.js"), "utf8");
}

function readGraphIsolatedWorkflowShell() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-isolated-workflow-shell.js"), "utf8");
}

function readGraphRelationStateQuery() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-relation-state-query.js"), "utf8");
}

function readGraphRelationSaveController() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-relation-save-controller.js"), "utf8");
}

function readGraphRelationWorkflowController() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-relation-workflow-controller.js"), "utf8");
}

function readGraphWorkbenchPanel() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-workbench-panel.js"), "utf8");
}

function readGraphPanelStateBuilder() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-panel-state-builder.js"), "utf8");
}

function readGraphVisualMapRuntimeState() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-visual-map-runtime-state.js"), "utf8");
}

function readGraphSelectionPanel() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-selection-panel.js"), "utf8");
}

function readGraphNodeSelectionPanel() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-node-selection-panel.js"), "utf8");
}

function readGraphEdgeSelectionPanel() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-edge-selection-panel.js"), "utf8");
}

function readRelationSaveTransaction() {
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/relation-save-transaction.js"), "utf8");
}

const mojibakeCopyPattern = new RegExp("\\u93b5\\u5b0d|\\u93b5\\u5b35|\\u93b5\\u5b2a\\u4f10|\\u934f\\u5d07\\u90f4|\\u951b");

function readPrototypeHtml() {
  return [
    fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype.html"), "utf8"),
    fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype.css"), "utf8")
  ].join("\n");
}

function readDomainCatalogStore() {
  return fs.readFileSync(path.join(repoRoot, "packages/domain/src/note-catalog-store.mjs"), "utf8");
}

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `expected ${name}() to exist`);
  const paramsStart = source.indexOf("(", start);
  assert.ok(paramsStart > start, `expected ${name}() to have parameters`);
  let parenDepth = 0;
  let paramsEnd = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") parenDepth += 1;
    if (char === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        paramsEnd = index;
        break;
      }
    }
  }
  assert.ok(paramsEnd > paramsStart, `expected ${name}() parameter list to close`);
  const bodyStart = source.indexOf("{", paramsEnd);
  assert.ok(bodyStart > start, `expected ${name}() to have a body`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`expected to find the end of ${name}()`);
}

function graphFocusPanelTestDeps() {
  const relationVisualKeys = {
    supports: "support",
    counters: "conflict",
    boundary: "boundary",
    bridges: "bridge",
    sequence: "flow"
  };
  return {
    renderGraphIcon: (name) => `<i>${name}</i>`,
    graphNodeTitle: (nodeMap, id, fallback = "") => nodeMap.get(id)?.title || fallback || id,
    graphFocusContextModeMeta: (value = "argument") =>
      value === "writing"
        ? { key: "writing", label: "看写作用途", note: "按写作用途排序关系。" }
        : { key: "argument", label: "看观点关系", note: "按观点关系排序关系。" },
    graphRelationStatusCountsAsNetworkEdge: (status) => status !== "rejected",
    graphRelationVisual: (relationType) => ({ key: relationVisualKeys[String(relationType || "").trim()] || "neutral" }),
    graphRelationTypeLabel: (relationType) => String(relationType || "相关关系"),
    graphFocusedEdgeDirection: () => "指向",
    graphRelationSourceLabel: () => "手动保存",
    graphFocusCardActionMeta: () => ({ label: "补强理由" })
  };
}

test("graph workbench entries live beside reading lenses and legend", () => {
  const source = readPrototypeApp();
  const workbenchSource = readGraphWorkbenchPanel();

  assert.ok(source.includes('function renderGraphReadingLensControls(activeLens = "insight", legendOpen = false, trailingMarkup = "") {'));
  assert.ok(source.includes('<div class="graph-reading-lens-side">'));
  assert.ok(source.includes('id="graphLegendToggle"'));
  assert.ok(source.includes('function renderGraphWorkbenchEntryPills({ clueSummary = null, questionSummary = null } = {}) {'));
  assert.ok(source.includes("renderGraphWorkbenchEntryPillsView({ clueSummary, questionSummary }"));
  assert.ok(workbenchSource.includes('label: "关系待办"'));
  assert.ok(workbenchSource.includes('label: "思考问题"'));
  assert.ok(workbenchSource.includes('data-graph-workbench-entry="${escapeHtml(meta.key)}"'));
  assert.ok(workbenchSource.includes('const label = total > 0 ? meta.label : meta.emptyLabel;'));
  assert.ok(source.includes('const readingLensTrailingMarkup = `${workbenchEntryMarkup}${researchNavigatorEntryMarkup}`;'));
  assert.ok(source.includes('renderGraphReadingLensControls(readingLens.key, legendOpen, readingLensTrailingMarkup)'));
});

test("live graph connectivity overrides stale persisted relation status once a scope is loaded", () => {
  const connectedIds = new Set(["pn_connected"]);

  assert.equal(
    relationNetworkStatusForNotePolicy({
      note: { id: "pn_connected", relationNetworkStatus: "unknown" },
      noteType: "permanent",
      connectedIds,
      connectivityReady: true,
      storedStatus: "isolated"
    }),
    "connected"
  );
  assert.equal(
    relationNetworkStatusForNotePolicy({
      note: { id: "pn_isolated", relationNetworkStatus: "connected" },
      noteType: "permanent",
      connectedIds,
      connectivityReady: true,
      storedStatus: "connected"
    }),
    "isolated"
  );
});

test("graph refresh repaints the explorer tree after connectivity state changes", () => {
  const source = readPrototypeApp();

  assert.match(source, /async function refreshDirectoryGraph\(\) \{/);
  assert.match(source, /graphState\.loading = false;\s*renderAll\(\);/);
});

test("graph focus relation panel can be collapsed and restored explicitly", () => {
  const runtimeStateSource = readGraphVisualMapRuntimeState();
  const html = readPrototypeHtml();
  const panel = renderGraphFocusContextPanel({
    focusedNoteId: "a",
    nodeMap: new Map([
      ["a", { title: "当前笔记" }],
      ["b", { title: "支持笔记" }]
    ]),
    edges: [
      { id: "r1", fromNoteId: "a", toNoteId: "b", relationType: "supports", status: "accepted", rationale: "支持理由", createdBy: "manual" }
    ],
    focusContextMode: "argument",
    focusContextHelpOpen: false
  }, graphFocusPanelTestDeps());

  assert.match(runtimeStateSource, /const focusContextAvailable = filterActive && normalizedFocusedNoteId;/);
  assert.equal(graphFocusContextCollapsedState(false, "close"), true);
  assert.equal(graphFocusContextCollapsedState(true, "open"), false);
  assert.equal(graphFocusContextCollapsedState(false, "toggle"), true);
  assert.equal(graphFocusContextCollapsedStatus(true), "已收起右侧关系");
  assert.equal(graphFocusContextCollapsedStatus(false), "已显示右侧关系");
  assert.match(panel, /id="graphFocusContextPanel" class="graph-focus-context"/);
  assert.match(panel, /class="graph-overlay-close graph-focus-panel-close" type="button" data-graph-focus-context-toggle="close"/);
  assert.match(panel, /data-open-note="b"/);
  assert.match(panel, /支持理由/);

  assert.match(html, /\.graph-focus-panel-head \{[\s\S]*justify-content: space-between;/);
  assert.match(html, /\.graph-focus-panel-toggle \{[\s\S]*min-height: 30px;[\s\S]*cursor: pointer;/);
  assert.match(html, /\.graph-focus-panel-close \{[\s\S]*position: static;[\s\S]*width: 30px;/);
});

test("graph focus relation panel uses plain wording and explains relation categories", () => {
  const html = readPrototypeHtml();
  const panel = renderGraphFocusContextPanel({
    focusedNoteId: "a",
    nodeMap: new Map([["a", { title: "当前笔记" }]]),
    edges: [],
    focusContextMode: "writing",
    focusContextHelpOpen: true
  }, graphFocusPanelTestDeps());

  assert.equal(graphFocusHelpOpenState(false), true);
  assert.equal(graphFocusHelpOpenState(true), false);
  assert.equal(graphFocusHelpStatus(true), "已展开关系说明");
  assert.equal(graphFocusHelpStatus(false), "已收起关系说明");
  assert.match(panel, /看观点关系/);
  assert.match(panel, /看写作用途/);
  assert.match(panel, /<div class="graph-focus-kicker">当前笔记关系<\/div>/);
  assert.match(panel, /只看当前笔记已经保存的正式关系，不包含还没确认的 AI 候选。/);
  assert.match(panel, /支持关系说明/);
  assert.match(panel, /data-graph-focus-help-toggle/);
  assert.match(panel, /当前这条笔记周围还没有正式关系/);

  assert.match(html, /\.graph-focus-help-toggle \{[\s\S]*min-height: 30px;[\s\S]*cursor: pointer;/);
  assert.match(html, /\.graph-focus-help\.is-collapsed \{[\s\S]*display: none;/);
});
test("graph workbench panel replaces map-covering clue and question floaters", () => {
  const source = readPrototypeApp();
  const workbenchSource = readGraphWorkbenchPanel();
  const html = readPrototypeHtml();

  assert.ok(source.includes('function renderGraphWorkbenchPanel({ clueSummary = {}, questionSummary = {}, clueSectionsMarkup = "", thinkingItems = [], isolatedQueueMarkup = "" } = {}) {'));
  assert.ok(source.includes("renderGraphWorkbenchPanelView({ clueSummary, questionSummary, clueSectionsMarkup, thinkingItems, isolatedQueueMarkup }"));
  assert.ok(workbenchSource.includes('const open = graphState.workbenchPanelOpen === true;'));
  assert.ok(workbenchSource.includes('data-graph-workbench-tab="${escapeHtml(meta.key)}"'));
  assert.ok(workbenchSource.includes('data-graph-workbench-close'));
  assert.match(source, /const sidePanelParts = \[[\s\S]*!filterActive \? workbenchPanelMarkup : ""/);
  assert.doesNotMatch(source, /thinkingPanelMarkup: thinkingPanel/);
  assert.doesNotMatch(source, /utilityDrawerMarkup: utilityDrawer/);

  assert.match(html, /\.graph-workbench-panel \{[\s\S]*position: relative;[\s\S]*z-index: 8;/);
  assert.match(html, /\.graph-side-stack \{[\s\S]*display: grid;[\s\S]*align-content: start;/);
  assert.match(html, /\.graph-workbench-entry \{[\s\S]*min-height: 30px;[\s\S]*padding: 0 10px;/);
  assert.match(html, /\.graph-workbench-entry-group \{[\s\S]*flex-wrap: nowrap;/);
  assert.match(html, /\.graph-side-stack \{[\s\S]*height: var\(--graph-map-height\);[\s\S]*overflow: auto;/);
  assert.match(html, /\.graph-map-stage \{[\s\S]*background: transparent;[\s\S]*overflow: visible;/);
  assert.match(html, /\.graph-map-stage::before \{[\s\S]*content: none;/);
  assert.match(html, /\.graph-map-empty-canvas \{[\s\S]*background:[\s\S]*linear-gradient\(180deg, #030812 0%, #060d18 42%, #091423 100%\);/);
});

test("graph research navigator explains the map before users drill into details", () => {
  const source = readPrototypeApp();
  const workbenchSource = readGraphWorkbenchPanel();
  const html = readPrototypeHtml();

  assert.ok(source.includes('function renderGraphResearchNavigatorPanel({ nodes = [], edges = [], topicCandidates = [], bridgeGaps = [], clusterMeta = [], clueSummary = null, questionSummary = null } = {}) {'));
  assert.match(source, /<aside class="graph-research-navigator" aria-label="[^"]+">/);
  assert.ok(source.includes('const headline = clusters.length'));
  assert.ok(source.includes('const nextAction = clusters.length'));
  assert.ok(source.includes('const pendingNote = pendingTotal'));
  assert.ok(source.includes('data-graph-select-cluster="${escapeHtml(cluster.clusterKey)}"'));
  assert.ok(source.includes('data-graph-select-node="${escapeHtml(node.id)}"'));
  assert.ok(source.includes('data-graph-research-close'));
  assert.ok(source.includes('function renderGraphResearchNavigatorEntry(open = false) {'));
  assert.ok(source.includes('renderGraphResearchNavigatorEntryView(open)'));
  assert.ok(workbenchSource.includes('const label = "概览";'));
  assert.ok(workbenchSource.includes('data-graph-research-${action}'));
  assert.match(html, /\.graph-research-navigator \{[\s\S]*display: grid;/);
});

test("graph structure view falls back to galaxy clusters instead of an empty map", () => {
  const source = readPrototypeApp();
  const panelStateBuilderSource = readGraphPanelStateBuilder();
  const html = readPrototypeHtml();

  assert.match(source, /function graphHasMeaningfulStructureEdges\(edges = \[\]\) \{/);
  assert.match(source, /function graphStructureFallbackEdges\(edges = \[\], filters = \{\}\) \{/);
  assert.match(panelStateBuilderSource, /const structureFallback = effectiveRelationType === "index" && !showingFocusedNote && !filteredEdges\.length && graphHasMeaningfulStructureEdges\(focused\.edges\);/);
  assert.match(panelStateBuilderSource, /filteredEdges = graphStructureFallbackEdges\(focused\.edges, activeFilters\);/);
  assert.match(source, /当前没有主题归属关系，已按笔记之间的关系自动分组。/);
  assert.match(source, /主题分布（自动分组）/);
  assert.match(html, /\.graph-structure-fallback-note \{[\s\S]*background: rgba\(239, 250, 255, 0\.9\);/);
});

test("graph empty map card can be closed back to argument relations", () => {
  const source = readPrototypeApp();
  const emptyMarkup = renderGraphMapEmptyStateView(
    { title: "No notes", message: "Try another mode" },
    { labels: { closeEmpty: "关闭提示并返回观点关系" } }
  );

  assert.match(emptyMarkup, /data-graph-empty-close/);
  assert.match(emptyMarkup, /aria-label="关闭提示并返回观点关系"/);
  assert.match(source, /const graphEmptyClose = event\.target\.closest\("\[data-graph-empty-close\]"\);/);
  assert.match(source, /setGraphRelationTypeFilter\("meaningful"\);[\s\S]*setStatus\("已返回观点关系图", "ok"\);/);
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
  const panelStateBuilderSource = readGraphPanelStateBuilder();
  const workbenchSource = readGraphWorkbenchPanel();
  const html = readPrototypeHtml();
  const domain = readDomainCatalogStore();

  assert.ok(source.includes('function graphLocalizedActionText(value = "", fallback = "") {'));
  assert.ok(source.includes("detail: graphLocalizedActionText(gap?.suggestedAction || gap?.rationale"));
  assert.ok(source.includes("function graphBridgeGapInNodeScope(gap = {}, nodeIds = new Set()) {"));
  assert.ok(source.includes("function graphReviewQueueInNodeScope(reviewQueue = null, nodeIds = new Set()) {"));
  assert.ok(panelStateBuilderSource.includes("const scopedActionNodeIds = graphNodeIdsInScope(scopedAllNodes);"));
  assert.ok(panelStateBuilderSource.includes("const scopedReviewQueue = graphReviewQueueInNodeScope(graphState.reviewQueue, scopedActionNodeIds);"));
  assert.ok(panelStateBuilderSource.includes('return group === "conflict" || group === "boundary";'));
  assert.ok(panelStateBuilderSource.includes("const conflictingRelations = graphMergeRelationsByKey(insightConflictingRelations, scopedTensionRelations);"));
  assert.ok(source.includes("fetchRelationReviewQueue({ directoryId, includeDescendants: true, limit: 8 })"));
  assert.ok(source.includes('function renderGraphWorkbenchPriorityQueue(items = [], activeKey = "questions") {'));
  assert.ok(source.includes("renderGraphWorkbenchPriorityQueueView(items, activeKey"));
  assert.match(workbenchSource, /先处理这 3 条/);
  assert.match(workbenchSource, /先看这 3 个问题/);
  assert.match(workbenchSource, /<details class="graph-workbench-all"/);
  assert.match(html, /\.graph-priority-queue \{[\s\S]*display: grid;[\s\S]*radial-gradient/);
  assert.match(html, /\.graph-workbench-all \{[\s\S]*display: grid;[\s\S]*border: 1px solid #dbe7ef;/);
  assert.match(domain, /suggestedAction:/);
  assert.doesNotMatch(domain, /Add an intermediate note or an explicit relation/);
});

test("graph map side panel does not stretch a second dark canvas below the map", () => {
  const html = readPrototypeHtml();
  const shellMarkup = renderGraphVisualMapShellView({
    hasNodes: true,
    sidePanelMarkup: "<aside>side</aside>",
    selectionOverlayMarkup: "<section>overlay</section>",
    zoomKey: "fit",
    layoutWidth: 960,
    layoutHeight: 520
  });

  assert.match(shellMarkup, /class="graph-map-stage has-side-panel has-selection-overlay"/);
  assert.match(shellMarkup, /class="graph-map-body has-side-panel"/);
  assert.match(shellMarkup, /<aside>side<\/aside>/);
  assert.match(shellMarkup, /class="graph-selection-overlay"/);
  assert.match(html, /\.graph-map-stage\.has-side-panel \{[\s\S]*min-height: 0;[\s\S]*background: transparent;[\s\S]*overflow: visible;/);
  assert.match(html, /\.graph-map-stage\.has-side-panel::before,[\s\S]*\.graph-map-stage\.has-side-panel::after \{[\s\S]*display: none;/);
  assert.match(html, /\.graph-map-body\.has-side-panel \{[\s\S]*align-items: start;[\s\S]*min-height: 0;/);
  assert.match(html, /\.graph-map-stage\.has-side-panel \.graph-map-canvas \{[\s\S]*overflow: hidden;[\s\S]*linear-gradient\(180deg, #030812 0%, #060d18 42%, #091423 100%\);/);
});

test("graph clusters are selectable research objects with their own summary panel", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();
  const clusterGlow = renderGraphClusterGlowView([
    { clusterKey: "cluster-alpha", title: "Alpha", tone: "teal", cx: 1, cy: 2, rx: 3, ry: 4 }
  ]);

  assert.match(source, /function graphClusterResearchMeta\(cluster = \{\}, \{ nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.match(source, /function renderGraphClusterSelectionPanel\(\{ selection = null, clusterMeta = \[\], nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.equal(renderGraphSelectionByKind(
    { selection: { kind: "cluster", clusterKey: "cluster-alpha" }, clusterMeta: [{ clusterKey: "cluster-alpha" }] },
    { renderClusterPanel: ({ selection }) => `cluster:${selection.clusterKey}` }
  ), "cluster:cluster-alpha");
  assert.match(clusterGlow, /data-graph-select-cluster="cluster-alpha"/);
  assert.match(clusterGlow, /role="button"/);
  assert.match(clusterGlow, /aria-label="View cluster summary: Alpha"/);
  assert.match(source, /openGraphSelection\(\{ kind: "cluster", clusterKey \}\);/);
  assert.match(source, /kicker: "主题群摘要"/);
  assert.match(source, /roleLabel: meta\.label/);
  assert.match(source, /补一条主题关系/);

  assert.match(html, /\.graph-map-cluster-glows \{[\s\S]*pointer-events: auto;/);
  assert.match(html, /\.graph-map-cluster-glow \{[\s\S]*cursor: pointer;[\s\S]*pointer-events: visiblePainted;/);
});

test("graph research details cover nodes and relation gravity lines with next actions", () => {
  const source = readPrototypeApp();
  const panelStateBuilderSource = readGraphPanelStateBuilder();
  const selectionPanelSource = readGraphSelectionPanel();
  const nodeSelectionPanelSource = readGraphNodeSelectionPanel();
  const edgeSelectionPanelSource = readGraphEdgeSelectionPanel();
  const html = readPrototypeHtml();

  assert.match(panelStateBuilderSource, /String\(graphState\.selection\?\.kind \|\| ""\)\.trim\(\)\.toLowerCase\(\) !== "cluster"/);
  assert.match(selectionPanelSource, /class="graph-overlay-close graph-selection-close"/);
  assert.doesNotMatch(selectionPanelSource, /data-graph-selection-close[^>]*>收起<\/button>/);
  assert.match(nodeSelectionPanelSource, /kicker: "当前笔记"/);
  assert.match(nodeSelectionPanelSource, /renderGraphNodeInsightPanel\(insight\)/);
  assert.match(nodeSelectionPanelSource, /已保存关系和更多操作/);
  assert.match(nodeSelectionPanelSource, /直接选择相关笔记/);
  assert.match(edgeSelectionPanelSource, /kicker: "已保存关系"/);
  assert.match(edgeSelectionPanelSource, /roleLabel: review\.label/);
  assert.match(edgeSelectionPanelSource, /renderGraphPromptDetails\("复核提示（可选）", prompts\)/);
  assert.match(edgeSelectionPanelSource, /data-graph-relation-adjustment/);

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

test("graph thinking tasks ignore stale AI isolated and relation candidates after the network is already connected", () => {
  const source = readPrototypeApp();
  const panelStateBuilderSource = readGraphPanelStateBuilder();

  assert.match(source, /function buildGraphThinkingItems\(\{ nodes = \[\], edges = \[\], bridgeGaps = \[\], reviewQueue = null, conflictItems = \[\], conflictingRelations = \[\], aiAnalysis = null, isolatedNotes = \[\], nodeLookupMap = null \} = \{\}\) \{/);
  assert.match(source, /const scopedNodeMap = new Map/);
  assert.match(source, /const nodeMap = nodeLookupMap instanceof Map \? nodeLookupMap : scopedNodeMap;/);
  assert.match(source, /const scopedNodeIds = graphNodeIdsInScope\(nodes\);/);
  assert.match(source, /const currentIsolatedIds = new Set\(/);
  assert.match(source, /\.filter\(\(note\) => currentIsolatedIds\.has\(graphNoteIdFromIsolatedItem\(note\)\)\)/);
  assert.match(source, /const existingRelationPairKeys = graphExistingRelationPairKeys\(edges\);/);
  assert.match(source, /\.filter\(\(candidate\) => graphCandidateTouchesNodeScope\(candidate, scopedNodeIds\)\)/);
  assert.match(source, /const pairKey = graphRelationPairKey\(sourceNoteId, targetNoteId\);/);
  assert.match(source, /return pairKey && !existingRelationPairKeys\.has\(pairKey\);/);
  assert.match(panelStateBuilderSource, /const scopedNetworkEdges = allGraphEdges\.filter\(\(edge\) => graphRelationTouchesNodeScope\(edge, scopedActionNodeIds\)\);/);
  assert.match(panelStateBuilderSource, /graphComputedIsolatedNotes\(scopedAllNodes, scopedNetworkEdges, aiIsolatedNotes\)/);
  assert.match(panelStateBuilderSource, /edges: scopedNetworkEdges,\s*bridgeGaps/);
  assert.match(panelStateBuilderSource, /aiAnalysis: graphState\.aiAnalysis,\s*isolatedNotes,\s*nodeLookupMap: graphRelationTargetNodeMap/);
  assert.match(panelStateBuilderSource, /const graphRelationTargetNodeMap = graphPotentialRelationNodeMap\(\);/);
  assert.doesNotMatch(source, /const graphScopedNodeMap = new Map/);
  assert.match(source, /selectionEdges: panelState\.scopedNetworkEdges,/);
  assert.match(source, /selectionNodeMap: panelState\.graphRelationTargetNodeMap,/);
  assert.match(source, /renderGraphAiAnalysisCard\(\{ open: panelState\.sectionOpen\["ai-analysis"\] === true, nodes: panelState\.scopedAllNodes, edges: panelState\.scopedNetworkEdges \}\)/);
  assert.match(source, /function buildGraphQuestionSpotSummaryFromItems\(items = \[\], \{ artifactCount = 0 \} = \{\}\) \{/);
  assert.match(panelStateBuilderSource, /const questionSpotSummary = !showingFocusedNote\s*\? buildGraphQuestionSpotSummaryFromItems\(thinkingItems,/);
});

test("isolated graph notes can request AI-assisted relation candidates and save them inside the graph workspace", () => {
  const source = readPrototypeApp();
  const nodeSelectionPanelSource = readGraphNodeSelectionPanel();
  const joinWorkspaceSource = readGraphIsolatedRelationWorkspace();
  const relationControllerSource = readGraphIsolatedRelationController();
  const isolatedWorkflowShellSource = readGraphIsolatedWorkflowShell();
  const relationStateQuerySource = readGraphRelationStateQuery();
  const saveControllerSource = readGraphRelationSaveController();
  const workflowControllerSource = readGraphRelationWorkflowController();
  const relationSaveTransactionSource = readRelationSaveTransaction();
  const html = readPrototypeHtml();
  assert.match(source, /from "\.\/graph-isolated-workflow-shell\.js";/);
  assert.match(source, /from "\.\/graph-relation-state-query\.js";/);
  assert.match(source, /from "\.\/graph-relation-workflow-controller\.js";/);
  assert.match(source, /createGraphIsolatedWorkflowShellRenderer\(\{/);
  assert.match(source, /createGraphRelationWorkflowController\(\{/);
  assert.match(source, /renderJoinNetworkFlow: renderGraphIsolatedJoinNetworkFlow/);
  assert.match(source, /graphDirectNetworkEdgeCount as computeGraphDirectNetworkEdgeCount/);
  assert.match(source, /graphRelationSaveResultForNote\(noteId, graphState\.isolatedRelationSaveResultByNoteId\)/);
  assert.match(relationStateQuerySource, /export function graphDirectNetworkEdgesForNote/);
  assert.match(relationStateQuerySource, /export function graphConnectedNoteIdsForNote/);
  assert.match(relationStateQuerySource, /export function graphIsolatedNodeIdsForGraph/);
  assert.match(isolatedWorkflowShellSource, /graphDirectNetworkEdgeCount/);
  assert.doesNotMatch(isolatedWorkflowShellSource, /function directNetworkEdgeCount/);

  assert.match(source, /function graphAiRelationCandidatesForNote\(noteId = "", \{ nodeMap = new Map\(\), edges = \[\], limit = 5 \} = \{\}\) \{/);
  assert.match(source, /function graphRelationCandidateKey\(fromNoteId = "", toNoteId = "", relationType = ""\) \{/);
  assert.match(source, /function graphRelationPairKey\(leftNoteId = "", rightNoteId = ""\) \{/);
  assert.match(source, /function graphExistingRelationPairKeys\(edges = \[\]\) \{/);
  assert.match(source, /function graphPotentialRelationNodeMap\(\) \{/);
  assert.match(source, /function graphPotentialRelationEvidenceText\(candidate = \{\}\) \{/);
  assert.match(source, /function graphPotentialRelationRationaleDraft\(\{/);
  assert.match(source, /function graphDecoratePotentialRelationCandidate\(candidate = \{\}, \{ nodeMap = new Map\(\) \} = \{\}\) \{/);
  assert.match(source, /function graphReviewSummaryFromAnalysis\(analysis = \{\}, previousSummary = \{\}\) \{/);
  assert.match(source, /const artifactCount = topicCandidateCount \+ Math\.max\(0, relationCandidateCount - bridgeCandidateCount\) \+ bridgeCandidateCount \+ isolatedNoteCount;/);
  assert.match(source, /const GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES = new Set\(\["bridges", "same_topic", "associated_with"\]\);/);
  assert.match(source, /function graphCandidateBlocksFormalRelation\(candidate = \{\}\) \{/);
  assert.match(source, /function graphCandidateCanSaveRelation\(candidate = \{\}\) \{/);
  assert.match(source, /function graphRelationRationaleIsActionable\(value = ""\) \{/);
  assert.match(source, /function graphPotentialRelationActionEndpoints\(cleanNoteId = "", sourceNoteId = "", targetNoteId = "", relationType = ""\) \{/);
  assert.match(source, /const relationType = graphPreferredPotentialRelationType\(candidate\);/);
  assert.match(source, /if \(!graphCandidateCanSaveRelation\(candidate\)\) return null;/);
  assert.match(source, /const sourceNoteId = fromNoteId;/);
  assert.match(source, /const targetNoteId = toNoteId;/);
  assert.match(source, /id: String\(candidate\.id \|\| candidate\.candidateId \|\| candidate\.candidate_id \|\| ""\)\.trim\(\),/);
  assert.match(source, /sourceContentHash: String\(candidate\.sourceContentHash \|\| candidate\.source_content_hash \|\| ""\)\.trim\(\),/);
  assert.match(source, /const counterpartNoteId = fromNoteId === cleanNoteId \? toNoteId : fromNoteId;/);
  assert.match(source, /const \{ actionSourceNoteId, actionTargetNoteId \} = graphPotentialRelationActionEndpoints\(\s*cleanNoteId,\s*sourceNoteId,\s*targetNoteId,\s*relationType\s*\);/);
  assert.match(source, /const pairKey = graphRelationPairKey\(sourceNoteId, targetNoteId\);/);
  assert.match(source, /if \(!pairKey \|\| seenPairKeys\.has\(pairKey\) \|\| existingRelationPairKeys\.has\(pairKey\)\) return null;/);
  assert.match(source, /actionSourceNoteId,/);
  assert.match(source, /actionTargetNoteId,/);
  assert.match(source, /async function refineGraphPotentialRelationsForNote\(noteId = "", candidates = \[\], \{ directoryId = "" \} = \{\}\) \{/);
  assert.match(source, /let generatedThisRun = 0;/);
  assert.match(source, /let waitingConfirmationThisRun = 0;/);
  assert.match(source, /let failedThisRun = 0;/);
  assert.match(source, /let removedThisRun = 0;/);
  assert.match(source, /const refineResult = await refineGraphPotentialRelationCandidate\(cleanNoteId, candidate, \{ directoryId \}\);/);
  assert.match(source, /if \(refineResult\?\.aiReasonGenerated\) generatedThisRun \+= 1;/);
  assert.match(source, /if \(refineResult\?\.removed\) \{/);
  assert.match(source, /removedThisRun \+= 1;/);
  assert.match(source, /continue;/);
  assert.match(source, /if \(refineResult\?\.needsConfirmation\) \{/);
  assert.match(source, /waitingConfirmationThisRun \+= 1;/);
  assert.match(source, /if \(refineResult\?\.needsConfirmation\) \{[\s\S]*break;/);
  assert.match(source, /if \(refineResult\?\.ok === false\) failedThisRun \+= 1;/);
  assert.match(source, /已补充 \$\{generatedThisRun\} 条潜在关联的 AI 复核理由，另有 \$\{waitingConfirmationThisRun\} 条等待你确认当前 AI 设置后再生成理由/);
  assert.match(source, /已补充 \$\{generatedThisRun\} 条潜在关联的 AI 复核理由，另有 \$\{failedThisRun\} 条暂未生成理由，可稍后重试/);
  assert.match(source, /`\$\{failedThisRun\} 条潜在关联暂未生成 AI 理由，可稍后重试`/);
  assert.match(source, /async function refineGraphPotentialRelationCandidate\(noteId = "", candidate = \{\}, \{ directoryId = "", confirmationApproved = false \} = \{\}\) \{/);
  assert.match(source, /const refined = await refinePotentialRelationCandidate\(\{/);
  assert.match(source, /const merged = Boolean\(refined && mergePotentialRelationCandidateIntoGraphAnalysis\(refined\)\);/);
  assert.match(source, /function removePotentialRelationCandidateFromGraphAnalysis\(candidateToRemove = \{\}\) \{/);
  assert.match(source, /const nextSummary = graphReviewSummaryFromAnalysis\(nextAnalysis, graphState\.aiAnalysis\?\.reviewItems\?\.summary\);/);
  assert.match(source, /summary: nextSummary/);
  assert.match(source, /const aiReason = String\(refined\?\.aiRationale \|\| ""\)\.trim\(\);/);
  assert.match(source, /const aiError = String\(refined\?\.aiError \|\| ""\)\.trim\(\);/);
  assert.match(source, /const needsConfirmation =/);
  assert.match(source, /if \(needsConfirmation\) \{/);
  assert.match(source, /confirmationApproved: true, confirmBudget: true/);
  assert.match(source, /return graphDecoratePotentialRelationCandidate\(\{[\s\S]*sourceContentHash: String\(candidate\.sourceContentHash \|\| candidate\.source_content_hash \|\| ""\)\.trim\(\),[\s\S]*relationType[\s\S]*\}, \{ nodeMap \}\);/);
  assert.match(source, /return graphDecoratePotentialRelationCandidate\(\{[\s\S]*\.\.\.refinedCandidate,[\s\S]*targetNoteId: refinedCandidate\.targetNoteId \|\| refinedCandidate\.toNoteId \|\| candidate\.targetNoteId[\s\S]*\}, \{ nodeMap \}\);/);
  assert.match(source, /if \(code === "POTENTIAL_RELATION_CANDIDATE_NOT_FOUND"\) \{/);
  assert.match(source, /const removed = removePotentialRelationCandidateFromGraphAnalysis\(candidate\);/);
  assert.match(source, /这条潜在关联已不在当前图谱范围内，已从候选列表移除/);
  assert.match(source, /else setStatus\(`生成关系说明失败：\$\{String\(error\?\.\message \|\| error\)\}`\, "warn"\);/);
  assert.match(source, /mergePotentialRelationCandidateIntoGraphAnalysis\(refined\)/);
  assert.match(source, /function graphPotentialRelationNeedsConfirmation\(candidate = \{\}\) \{/);
  assert.match(source, /data-graph-ai-refine-confirm/);
  assert.match(source, /data-graph-ai-refine-retry/);
  assert.match(source, /已重新生成这条潜在关联的 AI 复核理由/);
  assert.match(source, /async function triggerGraphPotentialRelationRefine\(/);
  assert.match(source, /async function confirmGraphPotentialRelationRefine\(button = null\) \{/);
  assert.match(source, /async function retryGraphPotentialRelationRefine\(button = null\) \{/);
  assert.match(source, /正在重新生成关系说明/);
  assert.match(source, /progressStatus: "正在按当前 AI 设置生成关系说明\.\.\."/);
  assert.doesNotMatch(source, /setStatus\("已确认使用当前 AI 设置，正在生成关系说明", "ok"\);/);
  assert.match(source, /function renderGraphIsolatedJoinNetworkFlow\(\s*noteId = "",\s*\{/);
  assert.match(source, /renderGraphIsolatedJoinNetworkFlowHtml\(noteId, \{/);
  assert.match(source, /aiCandidatesForNote: graphAiRelationCandidatesForNote/);
  assert.match(source, /manualTargetsForNote: graphManualRelationTargetsForNote/);
  assert.match(source, /relationDraft: graphState\.isolatedRelationDraftByNoteId\?\.\[String\(noteId \|\| ""\)\.trim\(\)\] \|\| \{\}/);
  assert.match(joinWorkspaceSource, /aria-label="建立笔记关系"/);
  assert.match(source, /建立一条能说清理由的关系/);
  assert.match(joinWorkspaceSource, /data-graph-ai-candidate-select/);
  assert.match(joinWorkspaceSource, /const targetId = String\(candidate\.counterpartNoteId \|\| ""\)\.trim\(\);/);
  assert.match(joinWorkspaceSource, /if \(!targetId \|\| targetId === cleanNoteId\) return "";/);
  assert.match(joinWorkspaceSource, /reversibleRelationTypes\.has\(rawRelationType\)/);
  assert.match(joinWorkspaceSource, /\? rawRelationType\s*: "associated_with";/);
  assert.match(joinWorkspaceSource, /data-graph-manual-target-search/);
  assert.match(joinWorkspaceSource, /data-graph-isolated-relation-type/);
  assert.match(joinWorkspaceSource, /data-graph-default-relation-type/);
  assert.match(joinWorkspaceSource, /data-graph-isolated-rationale/);
  assert.match(joinWorkspaceSource, /data-graph-isolated-relation-save/);
  assert.match(joinWorkspaceSource, /保存关系/);
  assert.doesNotMatch(joinWorkspaceSource, mojibakeCopyPattern);
  assert.match(source, /saveHint = "保存后，这条笔记会退出“未关联”。"/);
  assert.match(joinWorkspaceSource, /保存后，这条笔记会退出“未关联”/);
  assert.match(source, /function renderGraphIsolatedWorkflowTabs\(\{ noteId = "", isolatedQueueMarkup = "", decisionCards = \[\], prompts = \[\], nodeMap = new Map\(\), edges = \[\], visibleEdgeCount = 0 \} = \{\}\) \{/);
  assert.match(source, /return graphIsolatedWorkflowShell\.renderWorkflowTabs\(\{ noteId, isolatedQueueMarkup, decisionCards, prompts, nodeMap, edges, visibleEdgeCount \}\);/);
  assert.match(isolatedWorkflowShellSource, /renderJoinNetworkFlow\(cleanNoteId, \{ nodeMap, edges, visibleEdgeCount \}\)/);
  assert.match(source, /function renderGraphRelationFormSelectionPanel\(\{ selection = null, nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.match(workflowControllerSource, /kind: "relationForm"/);
  assert.match(source, /preferredTargetNoteId: targetNoteId/);
  assert.match(source, /saveHint: "保存后仍留在当前图谱。"/);
  assert.match(source, /data-graph-open-relation-form/);
  assert.match(source, /return graphIsolatedWorkflowShell\.renderSelectionPanel\(\{ selection, isolatedNotes, nodeMap, edges \}\);/);
  assert.match(isolatedWorkflowShellSource, /renderWorkflowTabs\(\{ noteId, isolatedQueueMarkup, nodeMap, edges, visibleEdgeCount \}\)/);
  assert.match(isolatedWorkflowShellSource, /task: null,/);
  assert.doesNotMatch(source, /"开始处理"/);
  assert.match(source, /const isolatedSelectionOverlayMarkup =\s*activeSelection\?\.kind === "isolated" \|\| activeSelection\?\.kind === "isolatedComplete" \|\| selectionNodeNeedsRelationWorkflow\s*\? selectionContextMarkup\s*: "";/);
  assert.match(source, /const sideSelectionContextMarkup = isolatedSelectionOverlayMarkup \? "" : selectionContextMarkup;/);
  assert.match(
    renderGraphVisualMapShellView({ selectionOverlayMarkup: "<section>overlay</section>" }),
    /<div class="graph-selection-overlay" role="dialog" aria-modal="false"/
  );
  assert.match(joinWorkspaceSource, /data-graph-ai-connect-note="\$\{escapeHtml\(cleanNoteId\)\}"/);
  assert.match(source, /function syncGraphIsolatedAiCandidateForm\(select = null\) \{/);
  assert.match(source, /return graphIsolatedRelationController\.syncAiCandidateForm\(select\);/);
  assert.match(source, /function markGraphIsolatedRationaleUserEdited\(input = null\) \{/);
  assert.match(source, /return graphIsolatedRelationController\.markRationaleUserEdited\(input\);/);
  assert.match(source, /function updateGraphIsolatedInlinePreview\(form = null, source = null\) \{/);
  assert.match(source, /return graphIsolatedRelationController\.updateInlinePreview\(form, source\);/);
  assert.match(relationControllerSource, /updateInlinePreview\(form, nextDraft\.option\)/);
  assert.match(relationControllerSource, /updateInlinePreview\(form, button\)/);
  assert.match(relationControllerSource, /const clearButton = panel\.querySelector\("\[data-graph-clear-candidate-preview\]"\);/);
  assert.match(relationControllerSource, /if \(clearButton\) clearButton\.hidden = !title;/);
  assert.match(relationControllerSource, /delete graphState\.isolatedCandidatePreviewByNoteId\[noteId\];/);
  assert.match(source, /function filterGraphManualRelationTargets\(input = null\) \{/);
  assert.match(source, /return graphIsolatedRelationController\.filterManualRelationTargets\(input\);/);
  assert.match(source, /function pickGraphManualRelationTarget\(button = null\) \{/);
  assert.match(source, /return graphIsolatedRelationController\.pickManualRelationTarget\(button\);/);
  assert.doesNotMatch(source, /if \(relationSelect\) relationSelect\.value = "associated_with";/);
  assert.match(relationControllerSource, /input\.removeAttribute\("data-selected-title"\)/);
  assert.match(relationControllerSource, /rationaleInput\.setAttribute\("data-graph-rationale-source", "manual"\)/);
  assert.match(relationControllerSource, /button\.classList\.remove\("is-selected"\)/);
  assert.match(relationControllerSource, /input\.setAttribute\("data-selected-title", title\)/);
  assert.match(source, /async function saveGraphIsolatedRelationForm\(button = null\) \{/);
  assert.match(source, /return graphIsolatedRelationController\.saveRelationForm\(button\);/);
  assert.match(source, /const rationaleInput = event\.target\.closest\("\[data-graph-isolated-rationale\]"\);/);
  assert.match(source, /markGraphIsolatedRationaleUserEdited\(rationaleInput\);/);
  assert.match(source, /async function saveGraphConfirmedRelation\(\{/);
  assert.match(source, /graphUpsertMarkdownSection\(nextBody, "关联整理备注"/);
  assert.match(source, /function graphNoteHasSavedIsolationDisposition\(note = \{\}\) \{/);
  assert.match(source, /noteHasSavedIsolationDisposition: graphNoteHasSavedIsolationDisposition/);
  assert.match(source, /\.filter\(\(note\) => !graphNoteHasSavedIsolationDisposition\(graphFullNoteById\(graphNoteIdFromIsolatedItem\(note\), nodeMap\) \|\| note\)\)/);
  assert.doesNotMatch(isolatedWorkflowShellSource, /data-graph-isolated-action="\$\{escapeHtml\(card\.key\)\}" data-open-note=/);
  assert.doesNotMatch(isolatedWorkflowShellSource, /data-graph-isolated-action="\$\{escapeHtml\(card\.key\)\}"/);
  assert.doesNotMatch(isolatedWorkflowShellSource, /data-graph-followup-action="relations">手动建立关系<\/button>/);
  assert.doesNotMatch(isolatedWorkflowShellSource, /暂不处理/);
  assert.doesNotMatch(isolatedWorkflowShellSource, /其它待处理/);
  const isolatedDecisionStart = source.indexOf('function openGraphIsolatedDecisionAction(noteId = "", action = "") {');
  const isolatedDecisionEnd = source.indexOf('function graphAiAnalysisPayload(', isolatedDecisionStart);
  assert.ok(isolatedDecisionStart >= 0 && isolatedDecisionEnd > isolatedDecisionStart, "expected isolated decision action");
  const isolatedDecisionSource = source.slice(isolatedDecisionStart, isolatedDecisionEnd);
  assert.doesNotMatch(isolatedDecisionSource, /openGraphFollowupNote\(cleanNoteId/);
  assert.doesNotMatch(isolatedDecisionSource, /activateModule\("explorer"\)/);
  assert.doesNotMatch(isolatedDecisionSource, /openNoteById\(cleanNoteId/);
  assert.match(source, /createNoteRelation,/);
  assert.match(source, /function openGraphRelationFormInSelection\(button = null\) \{/);
  assert.match(source, /return graphRelationWorkflowController\.openRelationFormFromAction\(button\);/);
  assert.match(source, /graphNormalizeRelationWorkflowSelection\(selection, \{/);
  assert.match(workflowControllerSource, /export function graphRelationWorkflowFormSelectionFromAction/);
  assert.match(workflowControllerSource, /kind: "relationForm"/);
  assert.match(workflowControllerSource, /const returnTo = previousSelectionKind === "isolated" \|\| previousSelectionKind === "isolatedcomplete" \? "isolated" : "";/);
  assert.match(workflowControllerSource, /rationale,\s*returnTo,\s*entryRoute\s*\}/);
  assert.match(workflowControllerSource, /returnTo: cleanKind\(selection\?\.returnTo\)/);
  assert.match(source, /from "\.\/graph-relation-save-controller\.js";/);
  assert.match(source, /createGraphRelationSaveController\(\{/);
  assert.match(source, /saveConfirmedRelation: saveGraphConfirmedRelation/);
  assert.match(source, /openRelationFormInSelection: openGraphRelationFormInSelection/);
  assert.match(saveControllerSource, /from "\.\/graph-relation-save-flow\.js";/);
  assert.match(saveControllerSource, /from "\.\/relation-save-transaction\.js";/);
  assert.match(saveControllerSource, /graphRelationSaveSelection\(\{ previousSelection, button, noteId: cleanNoteId \}\)/);
  assert.match(source, /data-graph-ai-candidate-apply/);
  assert.match(source, /const currentNoteId = String\(noteId \|\| ""\)\.trim\(\);/);
  assert.match(source, /const aiTargetNoteId = String\(candidate\.counterpartNoteId \|\| candidate\.actionTargetNoteId \|\| candidate\.targetNoteId \|\| ""\)\.trim\(\);/);
  assert.match(source, /data-open-note="\$\{escapeHtml\(currentNoteId \|\| candidate\.sourceNoteId\)\}"/);
  assert.match(source, /data-graph-target-note="\$\{escapeHtml\(aiTargetNoteId\)\}"/);
  assert.doesNotMatch(source, /data-open-note="\$\{escapeHtml\(candidate\.actionSourceNoteId \|\| candidate\.sourceNoteId\)\}"/);
  assert.match(source, /data-graph-relation-type="\$\{escapeHtml\(candidate\.relationType\)\}"/);
  assert.match(source, /data-graph-rationale-draft="\$\{escapeHtml\(candidate\.rationaleDraft\)\}"/);
  assert.match(source, /data-graph-insight-question-draft="\$\{escapeHtml\(candidate\.insightQuestionDraft\)\}"/);
  assert.match(source, /async function runGraphAiConnectForNote\(noteId = ""\) \{/);
  assert.match(source, /relationLimit: 24,/);
  assert.match(source, /focusNoteId: cleanNoteId,/);
  assert.match(source, /currentNoteId: cleanNoteId,/);
  assert.match(source, /if \(candidates\.length\) void refineGraphPotentialRelationsForNote\(cleanNoteId, candidates, \{ directoryId \}\);/);
  assert.match(source, /graphRelationWorkflowController\.startAiConnectForNote\(cleanNoteId\);/);
  assert.match(source, /graphRelationWorkflowController\.applyAiConnectRoute\(\{/);
  assert.match(workflowControllerSource, /const visibleEdgeCount = graphDirectNetworkEdgeCount\(cleanNoteId, edges,/);
  assert.match(workflowControllerSource, /const graphSelectionKind = previousSelectionKind === "isolated" \|\| \(!previousSelectionKind && visibleEdgeCount === 0\) \? "isolated" : "node";/);
  assert.match(source, /workflowRoute: \{ focus: "graph", source: "graph-ai-connect", graphSelectionKind \}/);
  assert.match(source, /async function saveGraphAiCandidateRelation\(button = null\) \{/);
  assert.match(source, /async function saveGraphCandidateRelation\(button = null\) \{/);
  assert.match(source, /return graphRelationSaveController\.saveAiCandidateRelation\(button\);/);
  assert.match(source, /return graphRelationSaveController\.saveCandidateRelation\(button\);/);
  assert.match(saveControllerSource, /if \(!confirmableRelationTypes\.has\(relationType\) \|\| relationType === "no_relation"\) \{/);
  assert.match(source, /async function saveGraphConfirmedRelation\(\{/);
  assert.match(source, /return graphRelationSaveController\.saveConfirmedRelation\(\{ noteId, targetNoteId, relationType, rationale, insightQuestion, button \}\);/);
  assert.match(saveControllerSource, /if \(!rationaleIsActionable\(cleanRationale\)\) \{/);
  assert.match(saveControllerSource, /const rationale = rationaleIsActionable\(rationaleDraft\) \? rationaleDraft : "";/);
  assert.match(saveControllerSource, /openRelationFormInSelection\(button\);/);
  assert.match(saveControllerSource, /const transaction = await saveRelationTransaction\(\{/);
  assert.match(saveControllerSource, /graphState\.isolatedRelationSaveResultByNoteId\[cleanNoteId\] = transaction\.result;/);
  assert.match(saveControllerSource, /transaction\.relation\?\.created === false/);
  assert.doesNotMatch(saveControllerSource, /await createNoteRelation\(cleanNoteId, \{/);
  assert.match(saveControllerSource, /if \(cleanNoteId === cleanTargetNoteId\) \{/);
  assert.match(saveControllerSource, /await refreshDirectoryGraph\(\);/);
  assert.match(saveControllerSource, /normalizeRelationSaveTransactionInput\(\{ noteId, targetNoteId, relationType, rationale, insightQuestion \}\)/);
  assert.match(source, /rationaleDraft,/);
  assert.match(source, /insightQuestionDraft,/);
  assert.match(nodeSelectionPanelSource, /renderGraphAiConnectCandidates\(normalized\.nodeId, \{[\s\S]*hideEmpty: directEdges\.length > 0[\s\S]*\}\)/);
  assert.match(source, /runAiConnectForNote: runGraphAiConnectForNote/);
  assert.match(source, /const graphAiConnectButton = event\.target\.closest\("\[data-graph-ai-connect-note\]"\);/);
  assert.match(source, /const graphAiCandidateButton = event\.target\.closest\("\[data-graph-ai-candidate-apply\]"\);/);
  assert.match(source, /const graphAiRefineConfirmButton = event\.target\.closest\("\[data-graph-ai-refine-confirm\]"\);/);
  assert.match(source, /await confirmGraphPotentialRelationRefine\(graphAiRefineConfirmButton\);/);
  assert.match(source, /const graphAiRefineRetryButton = event\.target\.closest\("\[data-graph-ai-refine-retry\]"\);/);
  assert.match(source, /await retryGraphPotentialRelationRefine\(graphAiRefineRetryButton\);/);
  assert.match(relationSaveTransactionSource, /status = "confirmed"/);
  assert.match(saveControllerSource, /graphState\.selection = nextSelection;/);
  assert.match(source, /function renderGraphIsolatedCompletePanel\(\{ selection = null, isolatedNotes = \[\], nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  const isolatedCompleteSource = extractFunctionSource(source, "renderGraphIsolatedCompletePanel");
  assert.doesNotMatch(isolatedCompleteSource, /data-graph-select-node/);
  assert.doesNotMatch(isolatedCompleteSource, /renderGraphAiConnectCandidates/);
  assert.doesNotMatch(isolatedCompleteSource, /继续确认这条笔记的其它可选目标/);
  assert.match(isolatedCompleteSource, /return graphIsolatedWorkflowShell\.renderCompletePanel\(\{/);
  assert.match(isolatedCompleteSource, /saveResult: graphRelationSaveResultForNote\(noteId, graphState\.isolatedRelationSaveResultByNoteId\)/);
  assert.match(isolatedWorkflowShellSource, /const queueItems = isolatedQueueItems\(\{ isolatedNotes, nodeMap, edges, currentNoteId: noteId, limit: 8 \}\);/);
  assert.match(isolatedWorkflowShellSource, /const nextItem = nextIsolatedQueueItem\(queueItems, noteId\);/);
  assert.doesNotMatch(isolatedWorkflowShellSource, /Array\.isArray\(isolatedNotes\) \? isolatedNotes : \[\]/);
  assert.match(saveControllerSource, /关系已保存，当前笔记已接入关系网/);
  assert.doesNotMatch(source, /继续给这条补关系/);

  assert.match(html, /\.graph-isolated-join \{[\s\S]*display: grid;[\s\S]*border: 1px solid #dbe7ef;[\s\S]*border-left: 4px solid #0f6f48;/);
  assert.match(html, /\.graph-isolated-relation-form \{[\s\S]*display: grid;/);
  assert.match(html, /\.graph-isolated-mode-switch \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(html, /\.graph-isolated-form-grid \{[\s\S]*grid-template-columns: minmax\(180px, 240px\) minmax\(0, 1fr\);/);
  assert.match(html, /\.graph-selection-overlay \{[\s\S]*position: fixed;[\s\S]*z-index: 120;[\s\S]*pointer-events: auto;[\s\S]*overflow: hidden;/);
  assert.match(html, /\.graph-map-stage\.has-selection-overlay \.graph-map-viewport \{[\s\S]*pointer-events: none;/);
  assert.match(html, /\.graph-selection-overlay \.graph-selection-panel\.is-isolated \{[\s\S]*width: min\(1120px, 100%\);[\s\S]*height: min\(720px, calc\(100dvh - 140px\)\);/);
  assert.match(html, /\.graph-selection-overlay \.graph-selection-panel\.is-isolated \.graph-selection-body \{[\s\S]*overflow: auto;/);
  assert.match(html, /\.graph-isolated-workflow \{[\s\S]*display: grid;[\s\S]*border: 1px solid #d8e7ef;/);
  assert.match(html, /\.graph-isolated-workflow-tab\.is-active \{[\s\S]*background: #ffffff;[\s\S]*color: #0f6f48;/);
  assert.match(html, /\.graph-ai-connect \{[\s\S]*display: grid;[\s\S]*border: 1px solid #d8e7ef;/);
  assert.match(html, /\.graph-ai-connect-card \{[\s\S]*border-radius: 14px;/);
  assert.match(html, /\.graph-ai-connect-actions \{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(112px, 1fr\)\);/);
});

test("graph selection upgrades isolated notes to connected nodes after a saved relation and keeps summary counts scoped instead of filter-limited", () => {
  const source = readPrototypeApp();
  const panelStateBuilderSource = readGraphPanelStateBuilder();
  const workflowControllerSource = readGraphRelationWorkflowController();

  assert.match(source, /graphNormalizeRelationWorkflowSelection\(selection, \{/);
  assert.match(workflowControllerSource, /const isolated = resolveIsolatedSelection\(selection, isolatedNotes, \[\]\);/);
  assert.match(workflowControllerSource, /return hasNode\(nodes, noteId\) \? \{ kind: "node", nodeId: noteId \} : null;/);
  assert.match(panelStateBuilderSource, /const baseSummary = `\$\{scopedAllNodes\.length\} 条永久笔记，\$\{scoped\.edges\.length\} 条关系`;/);
});

test("graph node clicks without confirmed relations open the large relation workflow", () => {
  const source = readPrototypeApp();
  const runtimeStateSource = readGraphVisualMapRuntimeState();
  const nodeSelectionPanelSource = readGraphNodeSelectionPanel();

  assert.match(source, /function graphRelationStatusCountsAsConfirmedEdge\(value = ""\) \{/);
  assert.match(source, /function graphDirectConfirmedRelationCount\(noteId = "", edges = \[\]\) \{/);
  assert.match(source, /function graphNodeNeedsRelationWorkflow\(noteId = "", edges = \[\], nodeMap = new Map\(\)\) \{/);
  assert.match(source, /function graphNodeNeedsRelationWorkflowFromCurrentGraph\(noteId = ""\) \{/);
  assert.match(runtimeStateSource, /const selectionNodeNeedsRelationWorkflow =\s*activeSelection\?\.kind === "node" && graphNodeNeedsRelationWorkflow\(activeSelection\.nodeId, contextualSelectionEdges, contextualNodeMap\);/);
  assert.match(source, /activeSelection\?\.kind === "isolated" \|\| activeSelection\?\.kind === "isolatedComplete" \|\| selectionNodeNeedsRelationWorkflow/);
  assert.match(nodeSelectionPanelSource, /if \(graphNodeNeedsRelationWorkflow\(normalized\.nodeId, edges, nodeMap\)\) \{[\s\S]*return renderGraphIsolatedSelectionPanel\(\{/);
  assert.match(source, /function openGraphNodeSelectionFromElement\(element = null\) \{/);
  assert.match(source, /isolatedKey \|\| graphNodeNeedsRelationWorkflowFromCurrentGraph\(nodeId\)/);
  assert.match(source, /openGraphSelection\(\{[\s\S]*kind: "isolated"[\s\S]*noteId: nodeId[\s\S]*\}\);/);
});

test("graph AI candidates prefill relation forms with a usable rationale draft instead of a review prompt", () => {
  const source = readPrototypeApp();

  assert.match(source, /function graphPotentialRelationRationaleDraft\(\{/);
  assert.match(source, /const rationaleSeed = aiRationale \|\| evidenceText;/);
  assert.match(source, /const cleanRationaleSeed = String\(rationaleSeed \|\| ""\)\.replace\(\/\[。\！？!\?；;：:\\s\]\+\$\/gu, ""\)\.trim\(\);/);
  assert.match(source, /return cleanRationaleSeed\s*\? `我确认“\$\{actionSourceTitle\}”和“\$\{actionTargetTitle\}”可以建立\$\{relationLabel\}，因为\$\{cleanRationaleSeed\}。`/);
  assert.match(source, /rationaleDraft: graphPotentialRelationRationaleDraft\(\{/);
  assert.match(source, /insightQuestionDraft: reviewQuestion \|\| `这条\$\{relationLabel\}会如何改变你对“\$\{actionTargetTitle\}”的理解、支撑或边界判断？`/);
});

test("graph network-edge status handling keeps suggested links in-network but still lets dismissed history re-enter candidates", () => {
  const source = readPrototypeApp();
  const panelStateBuilderSource = readGraphPanelStateBuilder();

  assert.equal(moduleGraphRelationStatusCountsAsNetworkEdge("suggested"), true);
  assert.equal(moduleGraphRelationStatusCountsAsNetworkEdge("draft"), true);
  assert.equal(moduleGraphRelationStatusCountsAsNetworkEdge("confirmed"), true);
  assert.equal(moduleGraphRelationStatusCountsAsNetworkEdge("dismissed"), false);
  assert.match(source, /return computeGraphRelationStatusCountsAsNetworkEdge\(value\);/);
  assert.match(source, /graphLocalRelationCandidatesForNote\(noteId = "", \{ nodeMap = new Map\(\), edges = \[\], limit = 5 \} = \{\}\) \{/);
  assert.match(source, /relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge/);
  assert.match(panelStateBuilderSource, /const connectedNoteIds = new Set\(\s*allGraphEdges\s*\.filter\(\(edge\) => graphRelationStatusCountsAsNetworkEdge\(edge\?\.status\)\)\s*\.flatMap/);
  assert.match(source, /state\.graphConnectedNoteIds = panelState\.connectedNoteIds \|\| new Set\(\);/);
});

test("graph AI summary treats bridge candidates as a subset instead of double counting them", () => {
  const source = readPrototypeApp();
  const panelStateBuilderSource = readGraphPanelStateBuilder();

  assert.match(source, /function graphPendingAiCandidateCount\(candidates = \[\], \{ existingRelationPairKeys = new Set\(\), excludePairs = new Set\(\), bridgeOnly = false, excludeBridge = false \} = \{\}\) \{/);
  assert.match(source, /return computeGraphPendingAiCandidateCount\(candidates, \{ existingRelationPairKeys, excludePairs, bridgeOnly, excludeBridge \}\);/);
  const bridgeSubset = moduleGraphPendingAiCandidateCount(
    [
      { sourceNoteId: "a", targetNoteId: "b", relationType: "bridges", componentBridge: true },
      { sourceNoteId: "a", targetNoteId: "b", relationType: "bridges", componentBridge: true },
      { sourceNoteId: "a", targetNoteId: "c", relationType: "same_topic" }
    ],
    { bridgeOnly: true }
  );
  const relationSubset = moduleGraphPendingAiCandidateCount(
    [
      { sourceNoteId: "a", targetNoteId: "b", relationType: "bridges", componentBridge: true },
      { sourceNoteId: "a", targetNoteId: "c", relationType: "same_topic" }
    ],
    { excludePairs: bridgeSubset.pairKeys, excludeBridge: true }
  );
  assert.equal(bridgeSubset.count, 1);
  assert.equal(relationSubset.count, 1);
  assert.match(source, /function graphLiveAiAnalysisCounts\(aiAnalysis = graphState\.aiAnalysis, \{ nodes = null, edges = null \} = \{\}\) \{/);
  assert.match(source, /const scopedNodeIds = new Set\(graphNodes\.map/);
  assert.match(source, /return scopedNodeIds\.has\(sourceNoteId\) \|\| scopedNodeIds\.has\(targetNoteId\);/);
  assert.match(source, /const bridgeCandidates = \[/);
  assert.match(source, /analysis\.bridgeCandidates\.map\(\(candidate\) => \(\{ \.\.\.candidate, componentBridge: true \}\)\)/);
  assert.match(source, /analysis\.relationCandidates\.filter\(\(candidate\) => candidate\?\.componentBridge === true\)/);
  assert.match(source, /const relationCandidates = \(Array\.isArray\(analysis\?\.relationCandidates\) \? analysis\.relationCandidates : \[\]\)/);
  assert.match(source, /\.filter\(\(candidate\) => candidate\?\.componentBridge !== true\)/);
  assert.match(source, /const bridgeResult = graphPendingAiCandidateCount\(bridgeCandidates, \{ existingRelationPairKeys, bridgeOnly: true \}\);/);
  assert.match(source, /const relationResult = graphPendingAiCandidateCount\(relationCandidates, \{/);
  assert.match(source, /excludePairs: bridgeResult\.pairKeys/);
  assert.match(source, /excludeBridge: true/);
  assert.match(source, /const scopedIsolatedNotes = \(Array\.isArray\(analysis\?\.isolatedNotes\) \? analysis\.isolatedNotes : \[\]\)\.filter/);
  assert.match(source, /const computedIsolatedNotes = graphComputedIsolatedNotes\(graphNodes, graphEdges, scopedIsolatedNotes\);/);
  assert.match(source, /function graphAiAnalysisSummaryState\(options = \{\}\) \{/);
  assert.match(source, /const liveCounts = graphLiveAiAnalysisCounts\(graphState\.aiAnalysis, options\);/);
  assert.match(source, /const topicCount = Number\(liveCounts\.topicCount \|\| 0\);/);
  assert.doesNotMatch(source, /const topicCount = Number\(liveCounts\.topicCount \|\| summary\.topicCandidateCount/);
  assert.match(source, /const relationCount = Number\(liveCounts\.relationCount \|\| 0\);/);
  assert.match(source, /const bridgeCount = Number\(liveCounts\.bridgeCount \|\| 0\);/);
  assert.match(source, /const isolatedCount = Number\(liveCounts\.isolatedCount \|\| 0\);/);
  assert.match(source, /const pendingCount = topicCount \+ relationCount \+ bridgeCount \+ isolatedCount;/);
  assert.match(source, /totalCandidates: pendingCount \|\| topicCount \+ relationCount \+ bridgeCount \+ isolatedCount/);

  assert.match(source, /function buildGraphQuestionSpotSummary\(\{ reviewQueueTotal = 0, bridgeGaps = \[\], conflictCount = 0, aiAnalysis = null, nodes = null, edges = null \} = \{\}\) \{/);
  assert.match(source, /const liveCounts = graphLiveAiAnalysisCounts\(aiAnalysis, \{ nodes, edges \}\);/);
  assert.match(source, /const bridgeCandidateCount = Number\(liveCounts\.bridgeCount \|\| 0\);/);
  assert.match(source, /const reviewCandidateCount = Number\(liveCounts\.relationCount \|\| 0\);/);
  assert.match(source, /\{ key: "review", label: "关系待复核", count: Math\.max\(Number\(reviewQueueTotal \|\| 0\), reviewCandidateCount\) \}/);
  assert.match(source, /renderGraphAiAnalysisCard\(\{ open: panelState\.sectionOpen\["ai-analysis"\] === true, nodes: panelState\.scopedAllNodes, edges: panelState\.scopedNetworkEdges \}\)/);
  assert.match(panelStateBuilderSource, /graphClueSummaryState\(\{[\s\S]*nodes: scopedAllNodes,[\s\S]*edges: scopedNetworkEdges/);
});

test("graph AI live counts stay scoped and classify component bridges correctly", () => {
  const source = readPrototypeApp();
  const { graphAiAnalysisSummaryState } = new Function(`
    const graphState = {
      aiAnalysis: {
        analysis: {
          topicCandidates: [
            { noteIds: ["scope-a", "scope-b"] },
            { noteIds: ["outside-a", "outside-b"] }
          ],
          relationCandidates: [
            { fromNoteId: "scope-a", toNoteId: "scope-b", relationType: "bridges", componentBridge: true },
            { fromNoteId: "outside-a", toNoteId: "outside-b", relationType: "same_topic" },
            { fromNoteId: "scope-a", toNoteId: "outside-a", relationType: "same_topic" }
          ],
          bridgeCandidates: [
            { noteIds: ["scope-a"], targetNoteIds: ["outside-b"], relationType: "bridges" }
          ],
          isolatedNotes: [
            { noteId: "scope-a" },
            { noteId: "outside-a" }
          ]
        },
        reviewItems: {
          summary: {
            topicCandidateCount: 9,
            relationCandidateCount: 9,
            bridgeCandidateCount: 9,
            isolatedNoteCount: 9,
            artifactCount: 36
          }
        }
      },
      item: {
        nodes: [
          { id: "scope-a" },
          { id: "scope-b" },
          { id: "outside-a" },
          { id: "outside-b" }
        ],
        edges: []
      }
    };
    function graphAiAnalysisPayload(result = graphState.aiAnalysis) {
      if (result?.analysis && typeof result.analysis === "object") return result.analysis;
      return result && typeof result === "object" ? result : {};
    }
    function graphRelationStatusCountsAsNetworkEdge() { return true; }
    function graphRelationPairKey(leftNoteId = "", rightNoteId = "") {
      const normalized = [String(leftNoteId || "").trim(), String(rightNoteId || "").trim()].filter(Boolean).sort();
      return normalized.length === 2 ? normalized[0] + "::" + normalized[1] : "";
    }
    function graphExistingRelationPairKeys(edges = []) {
      return new Set((Array.isArray(edges) ? edges : []).map((edge) => graphRelationPairKey(edge?.fromNoteId, edge?.toNoteId)).filter(Boolean));
    }
    function graphCandidateCanSaveRelation(candidate = {}) {
      return String(candidate.relationType || "associated_with").trim() !== "no_relation";
    }
    function graphCandidateEndpointIds(candidate = {}) {
      const sourceNoteId = String(candidate.fromNoteId || candidate.sourceNoteId || (Array.isArray(candidate.noteIds) ? candidate.noteIds[0] : "") || "").trim();
      const targetNoteId = String(candidate.toNoteId || candidate.targetNoteId || (Array.isArray(candidate.targetNoteIds) ? candidate.targetNoteIds[0] : "") || (Array.isArray(candidate.noteIds) ? candidate.noteIds[1] : "") || "").trim();
      return { sourceNoteId, targetNoteId };
    }
    function graphCandidateCountKey(candidate = {}) {
      const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
      return graphRelationPairKey(sourceNoteId, targetNoteId);
    }
    function graphNoteIdFromIsolatedItem(item = {}) {
      return String(item?.noteId || item?.id || "").trim();
    }
    function graphComputedIsolatedNotes(nodes = [], edges = [], aiIsolatedNotes = []) {
      const nodeIds = new Set((Array.isArray(nodes) ? nodes : []).map((node) => String(node?.id || "").trim()).filter(Boolean));
      return (Array.isArray(aiIsolatedNotes) ? aiIsolatedNotes : []).filter((note) => nodeIds.has(graphNoteIdFromIsolatedItem(note)));
    }
    function graphIsolatedQueueItems({ isolatedNotes = [] } = {}) {
      return Array.isArray(isolatedNotes) ? isolatedNotes : [];
    }
    function graphPendingAiCandidateCount(candidates = [], { existingRelationPairKeys = new Set(), excludePairs = new Set(), bridgeOnly = false, excludeBridge = false } = {}) {
      const seenPairs = new Set();
      let count = 0;
      (Array.isArray(candidates) ? candidates : []).forEach((candidate) => {
        if (!candidate || !graphCandidateCanSaveRelation(candidate)) return;
        if (bridgeOnly && candidate.componentBridge !== true) return;
        if (excludeBridge && candidate.componentBridge === true) return;
        const pairKey = graphCandidateCountKey(candidate);
        if (!pairKey || existingRelationPairKeys.has(pairKey) || excludePairs.has(pairKey) || seenPairs.has(pairKey)) return;
        seenPairs.add(pairKey);
        count += 1;
      });
      return { count, pairKeys: seenPairs };
    }
    ${extractFunctionSource(source, "graphLiveAiAnalysisCounts")}
    ${extractFunctionSource(source, "graphAiAnalysisSummaryState")}
    return { graphAiAnalysisSummaryState };
  `)();

  const counts = graphAiAnalysisSummaryState({
    nodes: [{ id: "scope-a" }, { id: "scope-b" }],
    edges: []
  });

  assert.equal(counts.topicCount, 1);
  assert.equal(counts.bridgeCount, 2);
  assert.equal(counts.relationCount, 1);
  assert.equal(counts.isolatedCount, 1);
  assert.equal(counts.totalCandidates, 5);
});

test("graph thinking relation tasks only expose savable candidates with normalized endpoints", () => {
  const source = readPrototypeApp();

  assert.match(source, /function graphCandidateEndpointIds\(candidate = \{\}\) \{/);
  assert.match(source, /return computeGraphCandidateEndpointIds\(candidate\);/);
  assert.match(source, /\(Array\.isArray\(analysis\?\.relationCandidates\) \? analysis\.relationCandidates : \[\]\)[\s\S]*\.filter\(\(candidate\) => graphCandidateCanSaveRelation\(candidate\)\)[\s\S]*const \{ sourceNoteId, targetNoteId \} = graphCandidateEndpointIds\(candidate\);/);
  assert.match(source, /const relationType = graphPreferredPotentialRelationType\(candidate\);/);
  assert.match(source, /actionAttrs: `data-open-note="\$\{escapeHtml\(sourceNoteId\)\}"`/);
  assert.match(source, /highlightNodeIds: \[sourceNoteId, targetNoteId\]/);
});

test("graph thinking relation tasks use scoped nodes for filtering but lookup map for outside titles", () => {
  const source = readPrototypeApp();
  const { buildGraphThinkingItems } = new Function(`
    function escapeHtml(value = "") { return String(value ?? ""); }
    function graphNodeIdsInScope(nodes = []) {
      return new Set((Array.isArray(nodes) ? nodes : []).map((node) => String(node?.id || "").trim()).filter(Boolean));
    }
    function graphCandidateTouchesNodeScope(candidate = {}, nodeIds = new Set()) {
      if (!nodeIds?.size) return true;
      const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
      return Boolean((sourceNoteId && nodeIds.has(sourceNoteId)) || (targetNoteId && nodeIds.has(targetNoteId)));
    }
    function graphRelationPairKey(leftNoteId = "", rightNoteId = "") {
      const normalized = [String(leftNoteId || "").trim(), String(rightNoteId || "").trim()].filter(Boolean).sort();
      return normalized.length === 2 ? normalized[0] + "::" + normalized[1] : "";
    }
    function graphExistingRelationPairKeys() { return new Set(); }
    function graphCandidateCanSaveRelation(candidate = {}) { return String(candidate.relationType || "associated_with").trim() !== "no_relation"; }
    function graphPreferredPotentialRelationType(candidate = {}) { return String(candidate.relationType || "associated_with").trim() || "associated_with"; }
    function graphRelationTypeLabel(type = "") { return type || "相关"; }
    function graphNoteIdFromIsolatedItem(item = {}) { return String(item?.noteId || item?.id || "").trim(); }
    function graphFullNoteById(noteId = "", nodeMap = new Map()) { return nodeMap.get(noteId) || null; }
    function graphNoteHasSavedIsolationDisposition() { return false; }
    function graphIsolatedSelectionKey(note = {}, index = 0) { return String(note?.noteId || index); }
    function graphSelectEdgeActionAttrs() { return ""; }
    function graphThinkingCleanIds(values = []) { return Array.isArray(values) ? values : [values]; }
    function graphThinkingEvidenceText() { return ""; }
    function graphRankThemeCandidates() { return []; }
    ${extractFunctionSource(source, "graphThinkingNoteTitle")}
    function graphCandidateEndpointIds(candidate = {}) {
      return {
        sourceNoteId: String(candidate.fromNoteId || candidate.sourceNoteId || "").trim(),
        targetNoteId: String(candidate.toNoteId || candidate.targetNoteId || "").trim()
      };
    }
    ${extractFunctionSource(source, "buildGraphThinkingItems")}
    return { buildGraphThinkingItems };
  `)();

  const items = buildGraphThinkingItems({
    nodes: [{ id: "scope-a", title: "当前范围笔记" }],
    edges: [],
    aiAnalysis: {
      analysis: {
        relationCandidates: [
          { fromNoteId: "scope-a", toNoteId: "outside-a", relationType: "same_topic", rationale: "跨目录但与当前笔记相关" },
          { fromNoteId: "outside-b", toNoteId: "outside-c", relationType: "same_topic", rationale: "完全不在当前范围" }
        ],
        isolatedNotes: []
      }
    },
    nodeLookupMap: new Map([
      ["scope-a", { id: "scope-a", title: "当前范围笔记" }],
      ["outside-a", { id: "outside-a", title: "目录外目标" }],
      ["outside-b", { id: "outside-b", title: "外部 B" }],
      ["outside-c", { id: "outside-c", title: "外部 C" }]
    ])
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].title, "当前范围笔记 -> 目录外目标");
});

test("directory graph keeps all nodes visible and marks true zero-degree notes as isolated", () => {
  const source = readPrototypeApp();
  const panelStateBuilderSource = readGraphPanelStateBuilder();
  const runtimeStateSource = readGraphVisualMapRuntimeState();
  const html = readPrototypeHtml();

  assert.match(source, /function graphComputedIsolatedNotes\(nodes = \[\], edges = \[\], aiIsolatedNotes = \[\]\) \{/);
  assert.match(source, /graphComputedIsolatedNotesForGraph\(nodes, edges, aiIsolatedNotes, \{/);
  assert.match(source, /function graphMarkIsolatedNodes\(nodes = \[\], isolatedNotes = \[\]\) \{/);
  assert.match(source, /graphMarkIsolatedNodesForGraph\(nodes, isolatedNotes, \{/);
  assert.match(panelStateBuilderSource, /let visibleNodes = !showingFocusedNote\s*\?\s*scopedAllNodes/);
  assert.match(panelStateBuilderSource, /visibleNodes = !showingFocusedNote \? graphMarkIsolatedNodes\(visibleNodes, isolatedNotes\) : visibleNodes;/);
  assert.match(runtimeStateSource, /const contextualSelectionEdges = Array\.isArray\(selectionEdges\) \? selectionEdges : Array\.isArray\(relationFilterEdges\) \? relationFilterEdges : edges;/);
  assert.match(runtimeStateSource, /const contextualNodeMap = selectionNodeMap instanceof Map \? selectionNodeMap : layout\.nodeMap;/);
  assert.match(html, /\.graph-map-node\.is-graph-isolated \.graph-map-node-core \{[\s\S]*stroke: #f59e0b;/);
  assert.match(html, /\.graph-local-connect \{[\s\S]*border-color: #fed7aa;/);
});

test("graph isolated notes are organized into a continuous handling queue", () => {
  const source = readPrototypeApp();
  const panelStateBuilderSource = readGraphPanelStateBuilder();
  const isolatedWorkflowShellSource = readGraphIsolatedWorkflowShell();
  const html = readPrototypeHtml();

  assert.match(source, /function graphIsolatedQueueItems\(\{ isolatedNotes = \[\], nodeMap = new Map\(\), edges = \[\], currentNoteId = "", limit = 8 \} = \{\}\) \{/);
  assert.match(source, /return graphIsolatedQueueItemsForGraph\(\{/);
  assert.match(source, /aiRelationCandidatesForNote: graphAiRelationCandidatesForNote/);
  assert.match(source, /localRelationCandidatesForNote: graphLocalRelationCandidatesForNote/);
  assert.match(source, /selectionKey: graphIsolatedSelectionKey/);
  assert.match(source, /function graphNextIsolatedQueueItem\(queueItems = \[\], currentNoteId = ""\) \{/);
  assert.match(source, /return computeGraphNextIsolatedQueueItem\(queueItems, currentNoteId\);/);
  assert.match(source, /function renderGraphIsolatedQueue\(\{ isolatedNotes = \[\], nodeMap = new Map\(\), edges = \[\], currentNoteId = "", compact = false, limit = 8, queueItems: providedQueueItems = null \} = \{\}\) \{/);
  assert.match(source, /function renderGraphIsolatedQueueStrip\(\{ isolatedNotes = \[\], nodeMap = new Map\(\), edges = \[\], currentNoteId = "", queueItems: providedQueueItems = null \} = \{\}\) \{/);
  assert.match(source, /return graphIsolatedWorkflowShell\.renderQueue\(\{ isolatedNotes, nodeMap, edges, currentNoteId, compact, limit, queueItems: providedQueueItems \}\);/);
  assert.match(source, /return graphIsolatedWorkflowShell\.renderQueueStrip\(\{ isolatedNotes, nodeMap, edges, currentNoteId, queueItems: providedQueueItems \}\);/);
  assert.match(isolatedWorkflowShellSource, /const total = queueItems\.length;/);
  assert.doesNotMatch(isolatedWorkflowShellSource, /const total = Array\.isArray\(isolatedNotes\) \? isolatedNotes\.length : queueItems\.length;/);
  assert.match(isolatedWorkflowShellSource, /data-graph-select-isolated="\$\{escapeHtml\(nextItem\.isolatedKey\)\}"/);
  assert.match(isolatedWorkflowShellSource, /class="graph-isolated-queue-strip"/);
  assert.match(isolatedWorkflowShellSource, /data-graph-open-workbench-entry="organize"/);
  assert.match(source, /const workbenchOpenEntry = event\.target\.closest\("\[data-graph-open-workbench-entry\]"\);/);
  assert.match(isolatedWorkflowShellSource, /const isolatedQueueMarkup = renderQueue\(\{ isolatedNotes, nodeMap, edges, currentNoteId: noteId, compact: true, limit: 6 \}\);/);
  assert.match(panelStateBuilderSource, /const graphRelationTargetNodeMap = graphPotentialRelationNodeMap\(\);/);
  assert.match(panelStateBuilderSource, /nodeMap: graphRelationTargetNodeMap/);
  assert.match(panelStateBuilderSource, /const isolatedQueueItems = !showingFocusedNote[\s\S]*graphIsolatedQueueItems\(\{/);
  assert.match(source, /renderGraphIsolatedQueue\(\{[\s\S]*queueItems: panelState\.isolatedQueueItems/);
  assert.match(source, /const isolatedQueueStripMarkup = !panelState\.showingFocusedNote[\s\S]*renderGraphIsolatedQueueStrip\(\{/);
  assert.match(source, /renderGraphIsolatedQueueStrip\(\{[\s\S]*queueItems: panelState\.isolatedQueueItems/);
  assert.match(source, /renderGraphVisualMap\(\{[\s\S]*isolatedQueueStripMarkup/);
  assert.match(source, /renderGraphWorkbenchPanel\(\{[\s\S]*isolatedQueueMarkup/);
  assert.match(source, /function renderGraphWorkbenchPanel\(\{ clueSummary = \{\}, questionSummary = \{\}, clueSectionsMarkup = "", thinkingItems = \[\], isolatedQueueMarkup = "" \} = \{\}\) \{/);
  assert.doesNotMatch(source, /data-graph-continue-current-relations/);
  assert.doesNotMatch(source, /继续在当前浮层里确认这条笔记的其它可选关系/);

  assert.match(html, /\.graph-isolated-queue-strip \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto auto;/);
  assert.match(html, /\.graph-isolated-queue \{[\s\S]*display: grid;[\s\S]*border: 1px solid #dbe7ef;/);
  assert.match(html, /\.graph-isolated-queue-item \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(76px, auto\);[\s\S]*min-height: 58px;/);
  assert.match(html, /\.graph-isolated-queue-item\.is-current \{[\s\S]*box-shadow: inset 4px 0 0 rgba\(217, 119, 6, 0\.65\);/);
  assert.match(html, /\.graph-isolated-queue-main:hover,[\s\S]*\.graph-isolated-queue-main:focus-visible \{/);
});

test("graph isolated workspace offers non-AI relation candidates from tags and titles", () => {
  const source = readPrototypeApp();
  const joinWorkspaceSource = readGraphIsolatedRelationWorkspace();
  const relationControllerSource = readGraphIsolatedRelationController();
  const isolatedWorkflowShellSource = readGraphIsolatedWorkflowShell();
  const isolatedSelectionStart = source.indexOf('function renderGraphIsolatedSelectionPanel({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) {');
  const isolatedSelectionEnd = source.indexOf('function renderGraphBridgeSelectionPanel(', isolatedSelectionStart);
  assert.ok(isolatedSelectionStart >= 0 && isolatedSelectionEnd > isolatedSelectionStart, "expected renderGraphIsolatedSelectionPanel() to exist");

  assert.match(source, /function graphLocalRelationCandidatesForNote\(noteId = "", \{ nodeMap = new Map\(\), edges = \[\], limit = 5 \} = \{\}\) \{/);
  assert.match(source, /return computeGraphLocalRelationCandidatesForNote\(/);
  assert.match(source, /relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge/);
  assert.match(source, /function graphManualRelationTargetsForNote\(noteId = "", \{ nodeMap = new Map\(\), edges = \[\], limit = 80 \} = \{\}\) \{/);
  assert.match(joinWorkspaceSource, /manualTargetsForNote\(cleanNoteId, \{ nodeMap, edges, limit: 500 \}\)/);
  assert.match(joinWorkspaceSource, /data-graph-manual-target-search/);
  assert.match(joinWorkspaceSource, /data-graph-pick-manual-target/);
  assert.match(joinWorkspaceSource, /data-graph-manual-target-id/);
  assert.match(joinWorkspaceSource, /renderPreviewPanel\(cleanNoteId, \{ nodeMap, preferredTargetNoteId: previewTargetNoteId \}\)/);
  assert.match(source, /data-graph-relation-candidate-apply/);
  assert.match(source, /const graphRelationCandidateButton = event\.target\.closest\("\[data-graph-relation-candidate-apply\]"\);/);
  assert.match(source, /await saveGraphCandidateRelation\(graphRelationCandidateButton\);/);
  assert.doesNotMatch(joinWorkspaceSource, /renderGraphRelationCandidateCards\(localCandidates/);
  assert.match(joinWorkspaceSource, /data-graph-isolated-tab="ai"/);
  assert.match(joinWorkspaceSource, /data-graph-isolated-tab="manual"/);
  assert.match(joinWorkspaceSource, /data-graph-isolated-note="\$\{escapeHtml\(cleanNoteId\)\}"/);
  assert.match(joinWorkspaceSource, /role="tab" aria-selected="\$\{activeMode === "ai"\}"/);
  assert.match(source, /relationDraft: graphState\.isolatedRelationDraftByNoteId\?\.\[String\(noteId \|\| ""\)\.trim\(\)\] \|\| \{\}/);
  assert.match(joinWorkspaceSource, /graphIsolatedJoinNetworkFormModel\(/);
  assert.match(joinWorkspaceSource, /data-graph-target-panel="ai"/);
  assert.match(joinWorkspaceSource, /data-graph-target-panel="manual"/);
  assert.match(source, /function activateGraphIsolatedWorkflowTab\(tabButton = null, \{ focus = false \} = \{\}\) \{/);
  assert.match(source, /return graphIsolatedRelationController\.activateWorkflowTab\(tabButton, \{ focus \}\);/);
  assert.match(source, /setWorkflowActiveTab: setGraphIsolatedWorkflowActiveTab/);
  assert.match(relationControllerSource, /setWorkflowActiveTab\(noteId, tabKey\)/);
  assert.match(source, /function moveGraphIsolatedWorkflowTab\(currentButton = null, direction = 1\) \{/);
  assert.match(source, /return graphIsolatedRelationController\.moveWorkflowTab\(currentButton, direction\);/);
  assert.match(source, /isolatedWorkflowTabsByNoteId: \{\},/);
  assert.match(isolatedWorkflowShellSource, /data-graph-select-isolated="\$\{escapeHtml\(nextItem\.isolatedKey\)\}" data-graph-isolated-note="\$\{escapeHtml\(nextItem\.noteId\)\}"/);
  assert.match(source, /actionAttrs: `data-graph-select-isolated="\$\{escapeHtml\(isolatedKey\)\}" data-graph-isolated-note="\$\{escapeHtml\(noteId\)\}"`/);
  assert.match(source, /const isolatedWorkflowTab = event\.target\.closest\("\[data-graph-isolated-tab\]"\);/);
  assert.match(source, /if \(event\.key === "ArrowRight" \|\| event\.key === "ArrowDown"\) \{/);
  assert.match(source, /const graphManualTargetButton = event\.target\.closest\("\[data-graph-pick-manual-target\]"\);/);
  assert.match(source, /await saveGraphIsolatedRelationForm\(graphIsolatedRelationSaveButton\);/);
  assert.match(isolatedWorkflowShellSource, /title: "已保存的关系"/);
  assert.doesNotMatch(isolatedWorkflowShellSource, /孤立笔记接入网络/);
});

test("graph manual relation targets search all known permanent notes but excludes non-permanent and connected notes", () => {
  const targets = moduleGraphManualRelationTargetsForNote(
    "source",
    {
      nodeMap: new Map([
        ["source", { id: "source", title: "Source", noteType: "permanent" }],
        ["outside", { id: "outside", title: "Outside Hub", noteType: "permanent" }],
        ["original", { id: "original", title: "Original Note", noteType: "original" }],
        ["literature", { id: "literature", title: "Literature Note", noteType: "literature" }],
        ["connected", { id: "connected", title: "Already Connected", noteType: "permanent" }]
      ]),
      edges: [{ fromNoteId: "source", toNoteId: "connected", status: "confirmed" }]
    },
    {
      relationStatusCountsAsNetworkEdge: (value = "") => {
        const status = String(value || "confirmed").trim().toLowerCase();
        return status === "suggested" || status === "draft" || status === "confirmed";
      }
    }
  );

  assert.deepEqual(targets.map((item) => item.id).sort(), ["original", "outside"]);
});

test("graph AI relation candidates hide rejected and no-relation candidates before isolated dropdowns", () => {
  const source = readPrototypeApp();
  const { graphAiRelationCandidatesForNote, graphBlockedAiRelationPairKeysForNote } = new Function(`
    const graphState = {
      aiAnalysis: {
        relationCandidates: [
          { sourceNoteId: "current", targetNoteId: "keep", relationType: "same_topic", aiDecision: "accept", aiRelationType: "same_topic", aiRationale: "Clear reason." },
          { sourceNoteId: "current", targetNoteId: "reject", relationType: "same_topic", aiDecision: "reject", aiRelationType: "same_topic", aiRationale: "Do not connect." },
          { sourceNoteId: "current", targetNoteId: "none", relationType: "associated_with", aiDecision: "uncertain", aiRelationType: "no_relation", aiRationale: "No relation." }
        ],
        bridgeCandidates: []
      }
    };
    const GRAPH_CONFIRMABLE_RELATION_TYPES = new Set(["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with"]);
    const GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES = new Set(["bridges", "same_topic", "associated_with"]);
    function graphAiAnalysisPayload() { return graphState.aiAnalysis; }
    function graphExistingRelationPairKeys() { return new Set(); }
    function graphCandidateEndpointIds(candidate = {}) {
      return {
        sourceNoteId: String(candidate.sourceNoteId || candidate.fromNoteId || "").trim(),
        targetNoteId: String(candidate.targetNoteId || candidate.toNoteId || "").trim()
      };
    }
    function graphRelationPairKey(leftNoteId = "", rightNoteId = "") {
      const normalized = [String(leftNoteId || "").trim(), String(rightNoteId || "").trim()].filter(Boolean).sort();
      return normalized.length === 2 ? normalized.join("::") : "";
    }
    function graphNodeTitle(nodeMap, noteId, fallback = "") { return nodeMap.get(noteId)?.title || fallback; }
    function graphRelationTypeLabel(type = "") { return type || "相关"; }
    function graphPotentialRelationNeedsConfirmation() { return false; }
    function graphPreferredPotentialRelationType(candidate = {}) {
      const aiRelationType = String(candidate.aiRelationType || candidate.ai_relation_type || "").trim().toLowerCase();
      if (aiRelationType && GRAPH_CONFIRMABLE_RELATION_TYPES.has(aiRelationType) && aiRelationType !== "no_relation") return aiRelationType;
      const fallback = String(candidate.relationType || candidate.relation_type || (candidate.componentBridge ? "bridges" : "associated_with")).trim().toLowerCase();
      return GRAPH_CONFIRMABLE_RELATION_TYPES.has(fallback) ? fallback : "associated_with";
    }
    const graphCandidateBlocksFormalRelation = ${moduleGraphCandidateBlocksFormalRelation.toString()};
    function graphCandidateCanSaveRelation(candidate = {}) {
      return !graphCandidateBlocksFormalRelation(candidate) && GRAPH_CONFIRMABLE_RELATION_TYPES.has(graphPreferredPotentialRelationType(candidate));
    }
    ${extractFunctionSource(source, "graphPotentialRelationActionEndpoints")}
    ${extractFunctionSource(source, "graphPotentialRelationEvidenceText")}
    ${extractFunctionSource(source, "graphPotentialRelationRationaleDraft")}
    ${extractFunctionSource(source, "graphDecoratePotentialRelationCandidate")}
    ${extractFunctionSource(source, "graphAiRelationCandidatesForNote")}
    function graphCandidateUndirectedPairKey(candidate = {}) {
      return graphRelationPairKey(
        candidate.sourceNoteId || candidate.fromNoteId || candidate.actionSourceNoteId,
        candidate.targetNoteId || candidate.toNoteId || candidate.counterpartNoteId || candidate.actionTargetNoteId
      );
    }
    function graphBlockedAiRelationPairKeysForNote(noteId = "") {
      const analysis = graphAiAnalysisPayload();
      const cleanNoteId = String(noteId || "").trim();
      if (!cleanNoteId) return new Set();
      return new Set(
        [...(Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates : []), ...(Array.isArray(analysis?.bridgeCandidates) ? analysis.bridgeCandidates : [])]
          .filter((candidate = {}) => {
            const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
            return sourceNoteId && targetNoteId && (sourceNoteId === cleanNoteId || targetNoteId === cleanNoteId) && !graphCandidateCanSaveRelation(candidate);
          })
          .map(graphCandidateUndirectedPairKey)
          .filter(Boolean)
      );
    }
    return { graphAiRelationCandidatesForNote, graphBlockedAiRelationPairKeysForNote };
  `)();

  const candidates = graphAiRelationCandidatesForNote("current", {
    nodeMap: new Map([
      ["current", { id: "current", title: "Current" }],
      ["keep", { id: "keep", title: "Keep" }],
      ["reject", { id: "reject", title: "Reject" }],
      ["none", { id: "none", title: "None" }]
    ]),
    edges: [],
    limit: 5
  });

  assert.deepEqual(candidates.map((candidate) => candidate.targetNoteId), ["keep"]);
  assert.deepEqual([...graphBlockedAiRelationPairKeysForNote("current")].sort(), ["current::none", "current::reject"]);
});

test("graph relation save rejects placeholder rationales", () => {
  const { graphRelationRationaleIsActionable } = new Function(`
    const graphRelationRationaleIsActionable = ${moduleGraphRelationRationaleIsActionable.toString()};
    return { graphRelationRationaleIsActionable };
  `)();

  assert.equal(graphRelationRationaleIsActionable("我确认“甲”和“乙”应该关联，因为：________。"), false);
  assert.equal(graphRelationRationaleIsActionable("我确认“甲”和“乙”可以建立相关关系，因为它们之间存在需要一起复核的论证或主题联系。"), false);
  assert.equal(graphRelationRationaleIsActionable("因为："), false);
  assert.equal(graphRelationRationaleIsActionable("TODO: 补充关系说明"), false);
  assert.equal(graphRelationRationaleIsActionable("甲能作为乙的边界条件，因为它说明了适用范围。"), true);
});

test("graph relation candidates explain reason, possible relation, and review question", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();
  const connectStart = source.indexOf('function renderGraphAiConnectCandidates(noteId = "", { nodeMap = new Map(), edges = [], hideEmpty = false } = {}) {');
  const connectEnd = source.indexOf('function graphWorkspaceRenderDeps()', connectStart);
  assert.ok(connectStart >= 0 && connectEnd > connectStart, "expected renderGraphAiConnectCandidates() to exist");
  const connectSource = source.slice(connectStart, connectEnd);

  assert.match(source, /function renderGraphCandidateReviewRows\(candidate = \{\}, \{ aiCandidate = true \} = \{\}\) \{/);
  assert.match(source, /function graphCandidateEvidenceText\(candidate = \{\}\) \{/);
  assert.match(source, /function graphCandidateUndirectedPairKey\(candidate = \{\}\) \{/);
  assert.match(source, /function graphBlockedAiRelationPairKeysForNote\(noteId = ""\) \{/);
  assert.match(source, /function graphMergeRelationCandidatesForDisplay\(aiCandidates = \[\], localCandidates = \[\], \{ limit = 6, blockedPairKeys = new Set\(\) \} = \{\}\) \{/);
  assert.match(source, /return computeGraphCandidateUndirectedPairKey\(candidate\);/);
  assert.match(source, /return computeGraphBlockedAiRelationPairKeysForNote\(noteId, graphAiAnalysisPayload\(\)\);/);
  assert.match(source, /return computeGraphMergeRelationCandidatesForDisplay\(aiCandidates, localCandidates, \{ limit, blockedPairKeys \}\);/);
  assert.match(connectSource, /const blockedPairKeys = graphBlockedAiRelationPairKeysForNote\(noteId\);/);
  assert.match(connectSource, /const candidates = graphMergeRelationCandidatesForDisplay\(aiCandidates, localCandidates, \{ limit: 6, blockedPairKeys \}\);/);
  assert.match(connectSource, /保存关系/);
  assert.match(connectSource, /预览目标/);
  assert.match(connectSource, /data-graph-preview-candidate=/);
  assert.doesNotMatch(connectSource, /data-graph-select-node=/);
  assert.doesNotMatch(connectSource, /用这条建立关系/);
  assert.match(source, /<span>推荐原因<\/span>/);
  assert.match(source, /<span>可能关系<\/span>/);
  assert.match(source, /<span>复核问题<\/span>/);
  assert.match(source, /graphCandidateRelationReviewQuestion\(candidate\)/);
  assert.match(source, /renderGraphCandidateReviewRows\(candidate, \{ aiCandidate: !isLocal \}\)/);
  assert.match(source, /renderGraphCandidateReviewRows\(candidate, \{ aiCandidate: false \}\)/);
  assert.match(html, /\.graph-candidate-review \{[\s\S]*display: grid;[\s\S]*gap: 6px;/);
  assert.match(html, /\.graph-candidate-details \{[\s\S]*border: 1px solid #e0ebf1;/);
});

test("graph AI candidate card saves reversed candidates from the current note", () => {
  const source = readPrototypeApp();
  const { renderGraphAiConnectCandidates } = new Function(`
    const graphState = { aiAnalysisLoading: false };
    function escapeHtml(value = "") {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
    function graphAiRelationCandidatesForNote() {
      return [{
        sourceNoteId: "other",
        targetNoteId: "current",
        actionSourceNoteId: "other",
        actionTargetNoteId: "current",
        counterpartNoteId: "other",
        counterpartTitle: "Other Note",
        targetTitle: "Current Note",
        relationType: "associated_with",
        relationLabel: "相关",
        confidence: 0.72,
        rationaleDraft: "Current can connect to Other because their claims need to be reviewed together.",
        insightQuestionDraft: "How do these two notes relate?"
      }];
    }
    function graphLocalRelationCandidatesForNote() { return []; }
    function graphBlockedAiRelationPairKeysForNote() { return new Set(); }
    function graphMergeRelationCandidatesForDisplay(aiCandidates) {
      return aiCandidates.map((candidate) => ({ ...candidate, candidateSource: "ai" }));
    }
    function graphAiAnalysisPayload() { return { relationCandidates: [{}] }; }
    function graphPotentialRelationNeedsConfirmation() { return false; }
    function graphAiConfidenceLabel() { return "72%"; }
    function graphCandidateEvidenceText(candidate = {}) { return candidate.rationaleDraft || ""; }
    function renderGraphCandidateReviewRows() { return ""; }
    ${extractFunctionSource(source, "renderGraphAiConnectCandidates")}
    return { renderGraphAiConnectCandidates };
  `)();

  const html = renderGraphAiConnectCandidates("current", {
    nodeMap: new Map([
      ["current", { id: "current", title: "Current Note" }],
      ["other", { id: "other", title: "Other Note" }]
    ]),
    edges: []
  });

  assert.match(html, /data-graph-ai-candidate-apply data-open-note="current" data-graph-target-note="other"/);
  assert.doesNotMatch(html, /data-graph-ai-candidate-apply data-open-note="other" data-graph-target-note="current"/);
});

test("graph relation candidate merge deduplicates reversed AI and local pairs", () => {
  const merged = moduleGraphMergeRelationCandidatesForDisplay(
    [{ sourceNoteId: "note-a", targetNoteId: "note-b", targetTitle: "B from AI" }],
    [
      { sourceNoteId: "note-b", targetNoteId: "note-a", targetTitle: "A from local" },
      { sourceNoteId: "note-a", targetNoteId: "note-c", targetTitle: "C from local" }
    ],
    { limit: 6 }
  );

  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map((candidate) => candidate.candidateSource), ["ai", "local"]);
  assert.deepEqual(merged.map((candidate) => candidate.targetNoteId), ["note-b", "note-c"]);

  const rejectedPair = moduleGraphMergeRelationCandidatesForDisplay(
    [{ sourceNoteId: "note-a", targetNoteId: "note-b", aiDecision: "reject", aiRelationType: "no_relation" }],
    [{ sourceNoteId: "note-b", targetNoteId: "note-a", relationType: "same_topic", targetTitle: "A from local" }],
    { limit: 6 }
  );
  assert.deepEqual(rejectedPair, []);

  const blockedByAiAnalysis = moduleGraphMergeRelationCandidatesForDisplay(
    [],
    [{ sourceNoteId: "note-b", targetNoteId: "note-a", relationType: "same_topic", targetTitle: "A from local" }],
    { limit: 6, blockedPairKeys: new Set(["note-a::note-b"]) }
  );
  assert.deepEqual(blockedByAiAnalysis, []);
});

test("isolated note panel gives a continuous next step after confirming a relation", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();
  const nextStepSource = extractFunctionSource(source, "renderGraphIsolatedNextStepActions");
  const nextStepModuleSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/graph-isolated-next-step.js"), "utf8");
  const isolatedWorkflowShellSource = readGraphIsolatedWorkflowShell();

  assert.match(source, /function renderGraphIsolatedNextStepActions\(noteId = "", \{ isolatedNotes = \[\], nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.match(nextStepSource, /return renderGraphIsolatedNextStepActionsHtml\(noteId, \{ isolatedNotes, nodeMap, edges \}, \{/);
  assert.match(nextStepSource, /themeCandidateNoteIdsForNode: graphThemeCandidateNoteIdsForNode/);
  assert.match(nextStepModuleSource, /if \(!directEdges\.length\) return "";/);
  assert.match(nextStepModuleSource, /data-graph-select-isolated/);
  assert.match(nextStepModuleSource, /data-graph-create-theme-index/);
  assert.doesNotMatch(nextStepSource, /data-graph-select-node/);
  assert.match(nextStepModuleSource, /const canCreateTheme = directEdges\.length > 0 && themeNoteIds\.length >= 3;/);
  assert.match(nextStepModuleSource, /const themeNoteIds = themeCandidateNoteIdsForNode\(cleanNoteId, directEdges, \[\]\);/);
  assert.doesNotMatch(nextStepSource, /graphAiRelationCandidatesForNote/);
  assert.match(isolatedWorkflowShellSource, /renderNextStepActions\(noteId, \{ isolatedNotes, nodeMap, edges \}\)/);
  assert.match(html, /\.graph-isolated-next-step \{[\s\S]*border: 1px solid #cfe4d9;/);
});

test("graph node selection summarizes position, relation quality, and next action", () => {
  const source = readPrototypeApp();
  const selectionPanelSource = readGraphSelectionPanel();
  const nodeSelectionPanelSource = readGraphNodeSelectionPanel();
  const html = readPrototypeHtml();

  assert.match(source, /function graphNodeInsightMeta\(node = \{\}, directEdges = \[\], \{ nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.match(source, /function renderGraphNodeInsightPanel\(insight = \{\}\) \{/);
  assert.match(source, /function renderGraphSelectionTask\(task = null\) \{/);
  assert.match(selectionPanelSource, /aria-label="[^"]+"/);
  assert.match(nodeSelectionPanelSource, /已接入图谱：检查关系是否能支撑你的判断/);
  assert.match(source, /当前状态/);
  assert.match(source, /建议下一步/);
  assert.match(source, /为什么这样判断/);
  assert.match(nodeSelectionPanelSource, /const insight = graphNodeInsightMeta\(node, directEdges, \{ nodeMap, edges \}\);/);
  assert.match(nodeSelectionPanelSource, /renderGraphNodeInsightPanel\(insight\)/);
  assert.match(nodeSelectionPanelSource, /renderGraphNodeInsightPanel\(insight\)[\s\S]*\$\{relationDetails\}[\s\S]*\$\{candidatePanel\}/);
  assert.match(html, /\.graph-node-insight \{[\s\S]*display: grid;[\s\S]*border: 1px solid #d8e7ef;/);
  assert.match(html, /\.graph-selection-task \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*border-left: 4px solid #38a3c9;/);
  assert.match(html, /\.graph-selection-details summary \{[\s\S]*min-height: 44px;[\s\S]*cursor: pointer;/);
});

test("graph relation workspace combines AI candidates, manual relation management, and theme index creation", () => {
  const source = readPrototypeApp();
  const nodeSelectionPanelSource = readGraphNodeSelectionPanel();
  const joinWorkspaceSource = readGraphIsolatedRelationWorkspace();
  const systemMessageSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-system-messages.js"), "utf8");
  const systemMessageWorkflowSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-system-message-workflow.js"), "utf8");
  const workspaceSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-graph-workspace.js"), "utf8");
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphRelationWorkspaceForNote\(noteId = "", \{ nodeMap = new Map\(\), edges = \[\], title = "关联整理" \} = \{\}\) \{/);
  assert.match(workspaceSource, /graphThemeCandidateNoteIdsForNode\(cleanNoteId, directEdges, \[\]\)/);
  assert.match(joinWorkspaceSource, /aiCandidatesForNote\(cleanNoteId, \{ nodeMap, edges, limit: 3 \}\)/);
  assert.match(nodeSelectionPanelSource, /graphThemeCandidateNoteIdsForNode\(normalized\.nodeId, directEdges, \[\]\)/);
  assert.match(workspaceSource, /data-graph-theme-note-ids="\$\{escapeHtml\(themeNoteIds\.join\(","\)\)\}"/);
  assert.match(workspaceSource, /data-graph-select-edge="\$\{escapeHtml\(edgeKey\)\}"/);
  assert.match(workspaceSource, /data-graph-create-theme-index/);
  assert.match(source, /function renderGraphThemeIndexWorkspace\(noteIds = \[\], \{ title = "主题候选", relationCount = 0, tone = "" \} = \{\}\) \{/);
  assert.match(source, /async function createGraphThemeIndexFromNoteIds\(noteIds = \[\], \{ title = "", source = "graph-theme-index" \} = \{\}\) \{/);
  assert.match(source, /createIndexCard\(\{/);
  assert.match(source, /centralQuestion: "这组笔记共同回答什么问题？"/);
  assert.match(source, /const writingEligibleIds = eligibleIds\.filter\(\(id\) => isWritingEligibleNote\(writingKnownNoteById\(id\)\)\);/);
  assert.match(source, /if \(writingEligibleIds\.length >= 2\) \{[\s\S]*continueWritingEntry\(writingEligibleIds,/);
  assert.match(source, /workflowRoute: \{[\s\S]*focus: "writing"[\s\S]*indexCardId: card\.id[\s\S]*basketNoteIds: eligibleIds\.join\(","\)/);
  assert.match(source, /const graphThemeIndexButton = event\.target\.closest\("\[data-graph-create-theme-index\]"\);/);
  assert.match(source, /createThemeIndexFromNoteIds: createGraphThemeIndexFromNoteIds/);
  assert.match(systemMessageWorkflowSource, /focus === "writing"/);
  assert.match(systemMessageWorkflowSource, /await selectWritingThemeIndex\(indexCardId\)/);
  assert.match(systemMessageSource, /basketNoteIds: String\(item\.workflowRoute\.basketNoteIds/);

  assert.match(html, /\.graph-selection-actions \{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(112px, 1fr\)\);/);
  assert.match(html, /\.graph-relation-workspace \{[\s\S]*display: grid;[\s\S]*gap: 10px;/);
  assert.match(html, /\.graph-theme-index-workspace \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;/);
});

test("graph keyboard activation handles workflow actions before generic note opening", () => {
  const source = readPrototypeApp();
  const start = source.indexOf('$("graphCanvas")?.addEventListener("keydown", async (event) => {');
  const end = source.indexOf('$("graphCanvas")?.addEventListener("change"', start);
  assert.ok(start >= 0 && end > start, "expected graph keyboard handler");
  const handler = source.slice(start, end);

  assert.match(handler, /const graphAiCandidateButton = event\.target\.closest\("\[data-graph-ai-candidate-apply\]"\);/);
  assert.match(handler, /await saveGraphAiCandidateRelation\(graphAiCandidateButton\);/);
  assert.match(handler, /const graphAiRefineConfirmButton = event\.target\.closest\("\[data-graph-ai-refine-confirm\]"\);/);
  assert.match(handler, /await confirmGraphPotentialRelationRefine\(graphAiRefineConfirmButton\);/);
  assert.match(handler, /const graphAiRefineRetryButton = event\.target\.closest\("\[data-graph-ai-refine-retry\]"\);/);
  assert.match(handler, /await retryGraphPotentialRelationRefine\(graphAiRefineRetryButton\);/);
  assert.match(handler, /const graphThemeIndexButton = event\.target\.closest\("\[data-graph-create-theme-index\]"\);/);
  assert.match(handler, /await createGraphThemeIndexFromButton\(graphThemeIndexButton\);/);
  assert.match(handler, /const graphRelationFormButton = event\.target\.closest\("\[data-graph-open-relation-form\]"\);/);
  assert.match(handler, /openGraphRelationFormInSelection\(graphRelationFormButton\);/);
  assert.match(handler, /const isolatedAction = event\.target\.closest\("\[data-graph-isolated-action\]"\);/);
  assert.match(handler, /const relationAdjustment = event\.target\.closest\("\[data-graph-relation-adjustment\]"\);/);
  assert.match(handler, /focusGraphRelationAdjustmentInPlace\(relationAdjustment\);/);
  assert.doesNotMatch(handler, /openGraphFollowupNote\(noteId, action/);
  assert.ok(
    handler.indexOf("[data-graph-ai-candidate-apply]") < handler.indexOf('const row = event.target.closest("[data-open-note]")'),
    "AI candidate keyboard action should run before generic note opening"
  );
  assert.ok(
    handler.indexOf("[data-graph-ai-refine-confirm]") < handler.indexOf('const row = event.target.closest("[data-open-note]")'),
    "AI refine confirmation keyboard action should run before generic note opening"
  );
  assert.ok(
    handler.indexOf("[data-graph-ai-refine-retry]") < handler.indexOf('const row = event.target.closest("[data-open-note]")'),
    "AI refine retry keyboard action should run before generic note opening"
  );
  assert.ok(
    handler.indexOf("[data-graph-relation-adjustment]") < handler.indexOf('const row = event.target.closest("[data-open-note]")'),
    "relation adjustment keyboard action should run before generic note opening"
  );
});

test("graph click workflow actions consume events before generic note opening", () => {
  const source = readPrototypeApp();
  const start = source.indexOf('$("graphCanvas")?.addEventListener("click", async (event) => {');
  const end = source.indexOf('$("graphCanvas")?.addEventListener("keydown"', start);
  assert.ok(start >= 0 && end > start, "expected graph click handler");
  const handler = source.slice(start, end);

  assert.match(handler, /const consumeGraphClick = \(\) => \{/);
  assert.match(handler, /event\.preventDefault\(\);/);
  assert.match(handler, /event\.stopImmediatePropagation\(\);/);
  assert.match(handler, /const graphAiCandidateButton = event\.target\.closest\("\[data-graph-ai-candidate-apply\]"\);[\s\S]*consumeGraphClick\(\);[\s\S]*await saveGraphAiCandidateRelation\(graphAiCandidateButton\);/);
  assert.match(handler, /const graphRelationCandidateButton = event\.target\.closest\("\[data-graph-relation-candidate-apply\]"\);[\s\S]*consumeGraphClick\(\);[\s\S]*await saveGraphCandidateRelation\(graphRelationCandidateButton\);/);
  assert.match(handler, /const graphRelationFormButton = event\.target\.closest\("\[data-graph-open-relation-form\]"\);[\s\S]*consumeGraphClick\(\);[\s\S]*openGraphRelationFormInSelection\(graphRelationFormButton\);/);
  assert.match(handler, /const relationAdjustment = event\.target\.closest\("\[data-graph-relation-adjustment\]"\);[\s\S]*consumeGraphClick\(\);[\s\S]*focusGraphRelationAdjustmentInPlace\(relationAdjustment\);/);
  const relationAdjustmentStart = handler.indexOf('const relationAdjustment = event.target.closest("[data-graph-relation-adjustment]");');
  const graphFollowupStart = handler.indexOf('const graphFollowup = event.target.closest("[data-graph-followup-action]");', relationAdjustmentStart);
  assert.ok(relationAdjustmentStart >= 0 && graphFollowupStart > relationAdjustmentStart, "expected relation adjustment branch before followup compatibility branch");
  const relationAdjustmentBranch = handler.slice(relationAdjustmentStart, graphFollowupStart);
  assert.doesNotMatch(relationAdjustmentBranch, /openGraphFollowupNote/);
  assert.ok(
    handler.indexOf("[data-graph-ai-candidate-apply]") < handler.indexOf('const row = event.target.closest("[data-open-note]")'),
    "AI candidate click action should run before generic note opening"
  );
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
  const zoomMarkup = renderGraphZoomStepperView({
    zoomKey: "read",
    zoomIndex: 1,
    zoomOptions: {
      fit: { label: "Fit", note: "Fit note", icon: "fit" },
      read: { label: "Read", note: "Read note", icon: "read" }
    }
  }, {
    renderGraphIcon: (name) => `<i>${name}</i>`,
    labels: {
      zoomOut: "缩小图谱",
      zoomIn: "放大图谱",
      zoomLevels: "图谱缩放层级"
    }
  });

  assert.match(zoomMarkup, /data-graph-zoom-step="-1" aria-label="缩小图谱"/);
  assert.match(zoomMarkup, /data-graph-zoom-step="1" aria-label="放大图谱"/);
  assert.match(zoomMarkup, /data-graph-zoom-option="read"/);
  assert.match(source, /if \(key === "hand"\) \{/);
  assert.match(source, /renderGraphVisualMapShellView/);
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
  const sidebarSource = extractFunctionSource(source, "renderSidebarTitle");

  assert.match(sidebarSource, /\$\("sidebarTitle"\)\.textContent = "图谱笔记范围";/);
  assert.match(sidebarSource, /这里不是永久笔记页；点目录或笔记是在切换图谱观察范围。/);
  assert.match(sidebarSource, /待关联笔记会使用和永久笔记盒一致的提示样式；点进来可以关联一条笔记。/);
  assert.doesNotMatch(sidebarSource, /永久笔记浏览/);
});

test("graph load failure renders a quiet empty state instead of a red error panel", () => {
  const source = readPrototypeApp();
  const panelStateBuilderSource = readGraphPanelStateBuilder();
  const html = readPrototypeHtml();
  const errorState = source.match(/function renderGraphErrorState\(message = ""\) \{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(errorState, /class="graph-empty graph-error-card"/);
  assert.doesNotMatch(errorState, /graph-empty bad/);
  assert.doesNotMatch(errorState, /\$\{escapeHtml\(text\)\}/);
  assert.match(errorState, /图谱暂时没有读出来/);
  assert.match(errorState, /刷新图谱/);
  assert.doesNotMatch(errorState, /Failed to fetch/);
  assert.match(panelStateBuilderSource, /summaryText: "图谱暂时无法读取，笔记树仍可正常使用。"/);
  assert.match(source, /summary\.textContent = panelState\.summaryText \|\| "";/);
  assert.doesNotMatch(source, /summary\.textContent = `图谱加载失败/);
  assert.match(html, /\.graph-error-card strong \{[\s\S]*color: #17324d;/);
  assert.match(html, /\.graph-error-card span \{[\s\S]*color: #587086;/);
});

test("starfield graph keeps relation lines hairline and arrows quiet", () => {
  const html = readPrototypeHtml();
  const defsMarkup = renderGraphMapSvgDefsView({ markerColors: { support: "#6abfbd" } });

  assert.match(defsMarkup, /markerWidth="4\.2" markerHeight="4\.2"/);
  assert.match(defsMarkup, /stroke-opacity="0\.48" stroke-width="0\.52"/);
  assert.match(html, /\.graph-map-svg \{[\s\S]*border-radius: 28px;[\s\S]*linear-gradient\(135deg, #040912 0%, #07111e 48%, #0b1828 100%\);/);
  assert.match(html, /\.graph-map-edge \{[\s\S]*stroke-width: 0\.3;[\s\S]*opacity: 0\.1;/);
  assert.match(html, /\.graph-map-edge-underlay \{[\s\S]*stroke-width: 0\.82;[\s\S]*opacity: 0\.065;/);
  assert.match(html, /\.graph-map-edge-label \{[\s\S]*display: none;/);
  assert.match(html, /\.graph-map-svg\[data-graph-zoom="fit"\] \.graph-map-edge \{[\s\S]*marker-end: none;/);
});

test("starfield graph uses point-like low-rank nodes in dense fit view", () => {
  const html = readPrototypeHtml();
  const node = {
    id: "low-rank",
    title: "Low rank",
    noteType: "permanent",
    starTier: "minor",
    x: 10,
    y: 12,
    radius: 1.4
  };
  const viewState = graphVisualNodeViewState(
    node,
    8,
    { denseGalaxyMode: true, zoomKey: "fit" },
    { graphNodeShowsAsPoint: () => true, graphNodeStarRank: () => 1 }
  );
  const nodeMarkup = renderGraphVisualNodeView(
    node,
    8,
    { denseGalaxyMode: true, zoomKey: "fit" },
    { graphNodeShowsAsPoint: () => true, graphNodeStarRank: () => 1 }
  );

  assert.equal(viewState.pointLike, true);
  assert.equal(viewState.showLabel, false);
  assert.doesNotMatch(nodeMarkup, /graph-map-node-glint/);
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
