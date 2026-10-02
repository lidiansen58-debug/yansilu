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

test("graph empty question chip stays actionable and opens the scan surface", () => {
  const source = readPrototypeApp();
  const match = source.match(/function renderGraphQuestionSpotChip\(summary = \{\}\) \{([\s\S]*?)\n\}/);
  assert.ok(match, "expected renderGraphQuestionSpotChip() to exist");

  assert.match(match[1], /const empty = !total;/);
  assert.match(match[1], /graph-question-chip\$\{open \? " is-open" : ""\}\$\{empty \? " is-empty" : ""\}/);
  assert.match(match[1], /aria-label="\$\{empty \? "\u6253\u5f00\u53ef\u8ffd\u95ee\u5904\u5e76\u8fd0\u884c\u56fe\u8c31\u626b\u63cf" : "\u6253\u5f00\u53ef\u8ffd\u95ee\u5904"\}"/);
  assert.doesNotMatch(match[1], /\sdisabled\b/, "empty state should not disable the thinking entry");
});

test("graph thinking panel is rendered inside the visual map instead of below it", () => {
  const source = readPrototypeApp();
  const signature = /function renderGraphVisualMap\(\{[\s\S]*nodes = \[\],[\s\S]*edges = \[\],[\s\S]*relationFilterEdges = \[\],[\s\S]*filterActive = false,[\s\S]*workbenchPanelMarkup = "",[\s\S]*workbenchEntryMarkup = ""[\s\S]*\} = \{\}\)/;
  assert.match(source, signature);
  assert.match(source, /const sidePanelParts = \[\s*\!filterActive \? workbenchPanelMarkup : "",[\s\S]*selectionContextMarkup \|\| focusContextMarkup/);
  assert.match(source, /const sidePanelMarkup = sidePanelParts\.length \? `<div class="graph-side-stack">/);
  assert.match(source, /renderGraphVisualMap\(\{[\s\S]*nodes: visualNodes,[\s\S]*relationType: effectiveRelationType,[\s\S]*workbenchPanelMarkup,[\s\S]*workbenchEntryMarkup,[\s\S]*\}\)/);
});

test("graph type tabs stay as a primary choice instead of hidden inside filters", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphViewModeSwitcher\(relationType = "meaningful"\) \{[\s\S]*graph-view-tabs[\s\S]*graph-view-tab/);
  assert.match(source, /<div class="graph-map-primary-row">[\s\S]*\$\{renderGraphViewModeSwitcher\(relationType\)\}[\s\S]*<div class="graph-map-primary-actions">/);
  assert.match(source, /<button class="graph-view-tab\$\{active \? " is-active" : ""\}" type="button" data-graph-view-mode="\$\{escapeHtml\(item\.key\)\}" aria-pressed="\$\{active\}" title="\$\{purpose\}">/);
  assert.match(html, /\.graph-view-tabs \{[\s\S]*display: inline-flex;[\s\S]*border-radius: 999px;/);
  assert.match(html, /\.graph-view-tab\.is-active \{[\s\S]*background: linear-gradient/);
  assert.doesNotMatch(source, /<small>\$\{purpose\}<\/small>/);
});

test("graph legend toggle lives near the graph toolbar instead of the page header", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphReadingLensControls\(activeLens = "insight", legendOpen = false, trailingMarkup = ""\) \{[\s\S]*graph-legend-inline-btn[\s\S]*id="graphLegendToggle"/);
  assert.match(html, /\.graph-map-footer-controls \{[\s\S]*justify-content: flex-end;/);
  assert.doesNotMatch(source, /<details class="graph-advanced-controls">/);
});

test("graph filter dropdown stays minimal inside the filter affordance", () => {
  const source = readPrototypeApp();

  assert.match(source, /<div class="graph-filters graph-filters-single\$\{compact \? " graph-filters-compact" : ""\}" data-graph-filters>\s*\n\s*<select id="graphRelationTypeFilter" data-graph-filter="relationType" aria-label="关系类型筛选">/);
  assert.doesNotMatch(source, /<span>鍏崇郴绫诲瀷<\/span>/);
  assert.doesNotMatch(source, /graph-filter-note/);
});

test("graph edges use softer asymmetric curves and slimmer arrow markers", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /const curveMagnitude = Math\.min\(42, Math\.max\(12, length \* 0\.09 \* curveBoost\)\);/);
  assert.match(source, /const driftSeed = \(\(graphHash\(`\$\{edge\.fromNoteId\}:\$\{edge\.toNoteId\}:\$\{edge\.relationType\}:drift`\) % 9\) - 4\) \/ 4;/);
  assert.match(source, /const control1X = startX \+ dx \* 0\.28 \+ controlOffsetX - unitX \* forwardDrift;/);
  assert.match(source, /const control2X = startX \+ dx \* 0\.72 \+ controlOffsetX \+ unitX \* forwardDrift;/);
  assert.match(source, /markerWidth="5\.2" markerHeight="5\.2" refX="4\.45" refY="2\.6"/);
  assert.match(source, /<path d="M 0\.9 1\.05 L 4\.45 2\.6 L 0\.9 4\.15" fill="none" stroke="\$\{escapeHtml\(color\)\}" stroke-opacity="0\.68" stroke-width="0\.76"/);
  assert.match(html, /\.graph-map-edge \{[\s\S]*stroke-width: 0\.38;[\s\S]*opacity: 0\.38;[\s\S]*marker-end: var\(--graph-edge-marker, none\);/);
  assert.match(html, /\.graph-map-edge-underlay \{[\s\S]*stroke-width: 1\.02;[\s\S]*opacity: 0\.09;/);
  assert.match(html, /\.graph-map-edge-group:hover \.graph-map-edge,[\s\S]*stroke-width: 0\.92;/);
});

test("graph isolated notes become visible selectable orbit nodes", () => {
  const source = readPrototypeApp();
  assert.match(source, /function graphBuildIsolatedVisualNodes\(\{ isolatedNotes = \[\], allNodes = \[\], currentNodes = \[\], limit = 12 \} = \{\}\)/);
  assert.match(source, /graphVisualState: "isolated"/);
  assert.match(source, /isGraphIsolatedCandidate: true/);
  assert.match(source, /isolatedKey: graphIsolatedSelectionKey\(item, index\)/);
  assert.match(source, /const showIsolatedVisualNodes = !showingFocusedNote && \(effectiveRelationType === "meaningful" \|\| effectiveRelationType === "all"\);/);
  assert.match(source, /const visualNodes = isolatedVisualNodes\.length \? \[\.\.\.visibleNodes, \.\.\.isolatedVisualNodes\] : visibleNodes;/);

  assert.match(source, /node\.isGraphIsolatedCandidate \? "is-graph-isolated" : ""/);
  assert.match(source, /data-graph-isolated-key="\$\{escapeHtml\(isolatedKey\)\}"/);
  assert.match(source, /<circle class="graph-map-node-hit"/);
  assert.match(source, /<circle class="graph-map-node-orbit \$\{escapeHtml\(haloTone\)\}"/);
  assert.match(source, /aria-label="\$\{node\.isGraphIsolatedCandidate \? "\u6574\u7406\u5b64\u7acb\u8282\u70b9" : "\u67e5\u770b\u7b14\u8bb0\u89d2\u8272"\}/);
});

test("clicking an isolated visual node opens isolated review before generic node role", () => {
  const source = readPrototypeApp();
  assert.ok(source.includes('const isolatedKey = String(graphNode.getAttribute("data-graph-isolated-key") || "").trim();'));
  assert.ok(source.includes('openGraphSelection({ kind: "isolated", isolatedKey, noteId: nodeId });'));

  const isolatedIndex = source.indexOf('openGraphSelection({ kind: "isolated", isolatedKey, noteId: nodeId });');
  const genericIndex = source.indexOf('openGraphSelection({ kind: "node", nodeId });', isolatedIndex);
  assert.notEqual(isolatedIndex, -1);
  assert.notEqual(genericIndex, -1);
  assert.ok(isolatedIndex < genericIndex, "isolated nodes should not fall through to the generic node panel");
});

test("isolated node review offers actionable organizing decisions", () => {
  const source = readPrototypeApp();
  assert.match(source, /function openGraphIsolatedDecisionAction\(noteId = "", action = ""\) \{/);
  assert.match(source, /if \(cleanAction === "bridge"\) \{[\s\S]*return openGraphFollowupNote\(cleanNoteId, "bridge", \{ relationType: "bridges" \}\);/);
  assert.match(source, /openNoteById\(cleanNoteId, \{ focusDistillation: cleanAction === "rewrite", preferTitleSelection: false \}\);/);
  assert.ok(source.includes('keep: "已打开孤立笔记：请补一句“为什么暂时保持独立”，避免之后误删或硬连线。"'));
  assert.ok(source.includes('actionLabel: "补独立理由"'));
  assert.ok(source.includes('actionLabel: "寻找关联"'));
  assert.ok(source.includes('actionLabel: "先暂存"'));
  assert.ok(source.includes('actionLabel: "重写判断"'));
  assert.match(source, /<button class="graph-isolated-decision\$\{card\.active \? " is-active" : ""\}" type="button" data-graph-isolated-action="\$\{escapeHtml\(card\.key\)\}" data-open-note="\$\{escapeHtml\(noteId\)\}" aria-pressed="\$\{card\.active\}">/);
  assert.match(source, /<small>\$\{escapeHtml\(card\.actionLabel\)\}<\/small>/);

  const clickHandler = source.match(/\$\("graphCanvas"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(clickHandler, "expected graph canvas click handler to exist");
  assert.match(clickHandler[1], /const isolatedAction = event\.target\.closest\("\[data-graph-isolated-action\]"\);/);
  assert.match(clickHandler[1], /openGraphIsolatedDecisionAction\(noteId, action\);/);

  const html = readPrototypeHtml();
  assert.match(html, /\.graph-isolated-decision \{[\s\S]*min-height: 58px;[\s\S]*cursor: pointer;[\s\S]*text-align: left;/);
  assert.match(html, /\.graph-isolated-decision:hover,[\s\S]*\.graph-isolated-decision:focus-visible \{[\s\S]*transform: translateY\(-1px\);/);
  assert.match(html, /\.graph-isolated-decision small \{[\s\S]*border-radius: 999px;[\s\S]*font-weight: 900;/);
});

test("graph thinking popover and isolated orbit styles stay content-first and touch-safe", () => {
  const html = readPrototypeHtml();
  assert.match(html, /\.graph-thinking-panel \{[\s\S]*position: absolute;[\s\S]*bottom: 72px;[\s\S]*max-height: min\(420px, calc\(100% - 112px\)\);[\s\S]*overflow: auto;/);
  assert.match(html, /\.graph-question-chip\.is-empty \{[\s\S]*opacity: \.62;[\s\S]*box-shadow: 0 10px 18px rgba\(3, 8, 18, 0\.12\);/);
  assert.match(html, /\.graph-utility-drawer-wrap \{[\s\S]*pointer-events: none;/);
  assert.match(html, /\.graph-utility-drawer \{[\s\S]*pointer-events: auto;/);
  assert.match(html, /\.graph-selection-panel \{[\s\S]*position: relative;[\s\S]*z-index: 8;/);
  assert.match(html, /\.graph-map-node-hit \{[\s\S]*pointer-events: all;[\s\S]*vector-effect: non-scaling-stroke;/);
  assert.match(html, /\.graph-map-node-orbit\.is-isolated \{[\s\S]*stroke: rgba\(213, 156, 42, 0\.48\) !important;[\s\S]*animation: graphNodeOrbitPulse 4\.8s ease-in-out infinite;/);
  assert.match(html, /\.graph-map-node\.is-graph-isolated \.graph-map-node-core \{[\s\S]*stroke: #d59c2a;[\s\S]*stroke-dasharray: 3 4;/);
});

test("graph AI scan keeps the researcher in the graph thinking workspace", () => {
  const source = readPrototypeApp();
  const match = source.match(/async function runGraphAiAnalysis\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, "expected runGraphAiAnalysis() to exist");

  assert.match(match[1], /graphState\.thinkingPanelOpen = true;/);
  assert.match(match[1], /graphState\.thinkingFilter = "all";/);
  assert.match(match[1], /\u5df2\u5728\u53ef\u8ffd\u95ee\u5904\u5c55\u5f00/);
  assert.doesNotMatch(match[1], /openAiInboxModule/, "graph scan should not auto-navigate away from the graph");
});

test("graph thinking cards include research questions instead of only actions", () => {
  const source = readPrototypeApp();
  assert.match(source, /const listQuestion =[\s\S]*"\u8fd9\u7ec4\u7b14\u8bb0\u80fd\u5426\u5199\u6210\u4e00\u53e5\u53ef\u4e89\u8bba\u7684\u5224\u65ad\uff0c\u800c\u4e0d\u53ea\u662f\u5171\u4eab\u540c\u4e00\u4e2a\u6807\u7b7e\uff1f";/);
  assert.match(source, /question: quality\?\.listQuestion \|\| "\u8fd9\u7ec4\u7b14\u8bb0\u80fd\u5426\u5199\u6210\u4e00\u53e5\u53ef\u4e89\u8bba\u7684\u5224\u65ad\uff0c\u800c\u4e0d\u53ea\u662f\u5171\u4eab\u540c\u4e00\u4e2a\u6807\u7b7e\uff1f"/);
  assert.match(source, /question: "\u5b83\u5b64\u7acb\u662f\u56e0\u4e3a\u771f\u7684\u72ec\u7279\uff0c\u8fd8\u662f\u56e0\u4e3a\u8fd8\u6ca1\u6709\u5199\u51fa\u5173\u7cfb\u7406\u7531\uff1f"/);
  assert.match(source, /question: "\u8fd9\u6761\u5019\u9009\u5173\u7cfb\u80fd\u4e0d\u80fd\u8bf4\u6e05\u201c\u4e3a\u4ec0\u4e48\u76f8\u8fde\u201d\uff0c\u8fd8\u662f\u53ea\u662f\u6807\u9898\u76f8\u4f3c\uff1f"/);
  assert.match(source, /<span class="graph-thinking-question"><small>\u53ef\u8ffd\u95ee<\/small>\$\{escapeHtml\(item\.question\)\}<\/span>/);

  const html = readPrototypeHtml();
  assert.match(html, /\.graph-thinking-question \{[\s\S]*border: 1px solid rgba\(207, 228, 217, 0\.9\);[\s\S]*line-height: 1\.5;/);
  assert.match(html, /\.graph-thinking-question small \{[\s\S]*letter-spacing: \.08em;/);
});

test("question spots cover theme bridge relation-review and isolated thinking work", () => {
  const source = readPrototypeApp();

  const summaryMatch = source.match(/function buildGraphQuestionSpotSummary\([\s\S]*?\n\}/);
  assert.ok(summaryMatch, "expected buildGraphQuestionSpotSummary() to exist");
  assert.match(summaryMatch[0], /\{ key: "theme", label: "\u4e3b\u9898\u5019\u9009", count: topicCount \}/);
  assert.match(summaryMatch[0], /\{ key: "bridge", label: "\u6865\u63a5\u673a\u4f1a", count: Math\.max\(Number\(bridgeGaps\?\.length \|\| 0\), bridgeCandidateCount\) \}/);
  assert.match(summaryMatch[0], /\{ key: "review", label: "\u5173\u7cfb\u5f85\u590d\u6838", count: Math\.max\(Number\(reviewQueueTotal \|\| 0\), relationCandidateCount\) \}/);
  assert.match(summaryMatch[0], /\{ key: "isolated", label: "\u5b64\u7acb\u5f85\u5224\u65ad", count: isolatedCount \}/);
  assert.match(summaryMatch[0], /label: total \? `\$\{total\} \u4e2a\u53ef\u8ffd\u95ee\u5904` : "\u6682\u65e0\u53ef\u8ffd\u95ee\u5904"/);

  const thinkingMatch = source.match(/function buildGraphThinkingItems\([\s\S]*?\n\}/);
  assert.ok(thinkingMatch, "expected buildGraphThinkingItems() to exist");
  assert.match(thinkingMatch[0], /kicker: "\u4e3b\u9898\u5019\u9009"[\s\S]*actionLabel: "\u8bc4\u4f30\u4e3b\u9898"[\s\S]*data-graph-select-theme/);
  assert.match(thinkingMatch[0], /kicker: gapType === "disconnected_cluster" \? "\u65ad\u88c2\u7c07" : "\u6865\u63a5\u673a\u4f1a"[\s\S]*question: targetTitle \? `[\s\S]*?`/);
  assert.match(thinkingMatch[0], /kicker: "\u5173\u7cfb\u5f85\u590d\u6838"[\s\S]*question: "\u5982\u679c\u5220\u6389\u8fd9\u6761\u7ebf\uff0c\u635f\u5931\u7684\u662f\u8bba\u8bc1\u7ed3\u6784\uff0c\u8fd8\u662f\u53ea\u662f\u5c11\u4e86\u4e00\u4e2a\u5bfc\u822a\u94fe\u63a5\uff1f"[\s\S]*actionLabel: "\u590d\u6838\u5173\u7cfb"/);
  assert.match(thinkingMatch[0], /kicker: "\u5b64\u7acb\u5f85\u5224\u65ad"[\s\S]*question: "\u5b83\u5b64\u7acb\u662f\u56e0\u4e3a\u771f\u7684\u72ec\u7279\uff0c\u8fd8\u662f\u56e0\u4e3a\u8fd8\u6ca1\u6709\u5199\u51fa\u5173\u7cfb\u7406\u7531\uff1f"[\s\S]*actionLabel: "\u6574\u7406"/);
});

test("bridge question spots open an in-graph bridge judgment before editing", () => {
  const source = readPrototypeApp();
  assert.match(source, /function graphBridgeSelectionKey\(gap = \{\}, index = 0\) \{/);
  assert.match(source, /const explicitId = String\(gap\?\.id \|\| ""\)\.trim\(\);/);
  assert.match(source, /const sourceId = String\(gap\?\.noteIds\?\.\[0\] \|\| gap\?\.sourceNoteId \|\| ""\)\.trim\(\);/);
  assert.match(source, /const targetId = String\(gap\?\.targetNoteIds\?\.\[0\] \|\| gap\?\.targetNoteId \|\| ""\)\.trim\(\);/);
  assert.match(source, /\["bridge", sourceId \|\| title \|\| "source", targetId \|\| "no-target", String\(index\)\]\.join\("::"\)/);
  assert.match(source, /id: `bridge-\$\{bridgeKey\}`/);
  assert.match(source, /function resolveGraphBridgeSelection\(selection = null, bridgeGaps = \[\], nodes = \[\]\) \{/);
  assert.match(source, /kind: "bridge",[\s\S]*bridgeKey: bridge\.bridgeKey,[\s\S]*noteId: bridge\.noteId,[\s\S]*targetNoteId: bridge\.targetNoteId/);
  assert.match(source, /function renderGraphBridgeSelectionPanel\(\{ selection = null, bridgeGaps = \[\], nodeMap = new Map\(\) \} = \{\}\) \{/);
  assert.match(source, /kicker: "\u6865\u63a5\u5224\u65ad"/);
  assert.match(source, /<strong>\u6865\u63a5\u95ee\u9898<\/strong>/);
  assert.match(source, /data-graph-followup-action="bridge"/);
  assert.match(source, /actionLabel: "\u5224\u65ad\u6865\u63a5"[\s\S]*data-graph-select-bridge/);
  assert.doesNotMatch(source, /kicker: gapType === "disconnected_cluster" \? "\u65ad\u88c2\u7c07" : "\u6865\u63a5\u673a\u4f1a"[\s\S]{0,900}data-graph-followup-action="bridge"/);

  const clickHandler = source.match(/\$\("graphCanvas"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(clickHandler, "expected graph canvas click handler to exist");
  assert.match(clickHandler[1], /const bridgeSelection = event\.target\.closest\("\[data-graph-select-bridge\]"\);/);
  assert.match(clickHandler[1], /openGraphSelection\(\{ kind: "bridge", bridgeKey, noteId, targetNoteId \}\);/);
  assert.match(source, /selectedBridgeNoteIds/);
  assert.match(source, /is-bridge-selected/);

  const html = readPrototypeHtml();
  assert.match(html, /\.graph-map-node-orbit\.is-bridge \{[\s\S]*stroke: rgba\(145, 114, 218, 0\.34\) !important;/);
  assert.match(html, /\.graph-map-panel\.is-selecting-bridge \.graph-map-node:not\(\.is-bridge-selected\) circle \{[\s\S]*opacity: \.18;/);
  assert.match(html, /\.graph-map-node\.is-bridge-selected circle \{[\s\S]*stroke: #6842a6;/);
});

test("graph scan artifacts stay available through a voluntary review entry", () => {
  const source = readPrototypeApp();
  assert.match(source, /const artifactCount = Number\([\s\S]*reviewSummary\.artifactCount[\s\S]*aiAnalysis\?\.reviewItems\?\.storedArtifactIds\?\.length[\s\S]*aiAnalysis\?\.reviewItems\?\.artifacts\?\.length/);
  assert.match(source, /function renderGraphThinkingReviewNote\(summary = \{\}\) \{/);
  assert.match(source, /if \(!artifactCount\) return "";/);
  assert.match(source, /data-open-ai-inbox-from-graph/);
  assert.match(source, /\$\{includeSummary \? renderGraphThinkingReviewNote\(summary\) : ""\}/);

  const clickHandler = source.match(/\$\("graphCanvas"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(clickHandler, "expected graph canvas click handler to exist");
  assert.match(clickHandler[1], /event\.target\.closest\("\[data-open-ai-inbox-from-graph\]"\)/);
  assert.match(clickHandler[1], /view: "pending"/);
  assert.match(clickHandler[1], /sourceNoteId: ""/);
  assert.match(clickHandler[1], /graphState\.thinkingPanelOpen = false;/);
  assert.match(clickHandler[1], /activateModule\("aiInbox"\);/);
  assert.match(clickHandler[1], /await openAiInboxModule\(\);/);

  const scanFunction = source.match(/async function runGraphAiAnalysis\(\) \{([\s\S]*?)\n\}/);
  assert.ok(scanFunction, "expected runGraphAiAnalysis() to exist");
  assert.doesNotMatch(scanFunction[1], /openAiInboxModule/, "scan should still not auto-open review inbox");

  const html = readPrototypeHtml();
  assert.match(html, /\.graph-thinking-review-note \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*radial-gradient/);
  assert.match(html, /\.graph-thinking-review-action \{[\s\S]*min-height: 38px;[\s\S]*white-space: nowrap;/);
  assert.match(html, /@media \(max-width: 980px\) \{[\s\S]*\.graph-thinking-review-note \{[\s\S]*grid-template-columns: 1fr;/);
});

test("graph thinking cards highlight anchored graph elements on hover and focus", () => {
  const source = readPrototypeApp();
  assert.match(source, /function graphThinkingHighlightAttrs\(item = \{\}\) \{/);
  assert.match(source, /data-graph-thinking-node-ids/);
  assert.match(source, /data-graph-thinking-edge-key/);
  assert.match(source, /highlightNodeIds: noteIds/);
  assert.match(source, /const edgeTarget = \{[\s\S]*id: item\.id,[\s\S]*fromNoteId: item\.fromNoteId \|\| source\.id \|\| "",[\s\S]*toNoteId: item\.toNoteId \|\| target\.id \|\| ""/);
  assert.match(source, /highlightEdge: edgeTarget/);
  assert.match(source, /<article class="graph-thinking-item is-\$\{escapeHtml\(item\.tone \|\| "neutral"\)\}"\$\{highlightAttrs \? ` \$\{highlightAttrs\}` : ""\}>/);

  assert.match(source, /function applyGraphThinkingHoverState\(thinkingElement\) \{/);
  assert.match(source, /function graphEdgeMatchesThinkingTarget\(edgeElement, target = \{\}\) \{/);
  assert.match(source, /panel\.classList\.add\("is-hovering-thinking"\);/);
  assert.match(source, /element\.classList\.toggle\("is-hovered", hovered\);/);
  assert.match(source, /event\.target\.closest\("\[data-graph-thinking-highlight\]"\)/);
  assert.match(source, /\$\("graphCanvas"\)\?\.addEventListener\("pointerover", handleGraphHoverIntent\);/);
  assert.match(source, /\$\("graphCanvas"\)\?\.addEventListener\("pointerout", handleGraphHoverExit\);/);
  assert.match(source, /focusin[\s\S]*applyGraphThinkingHoverState\(thinking\);/);
  assert.match(source, /panel\.classList\.remove\("is-hovering-node", "is-hovering-edge", "is-hovering-thinking"\);/);

  const html = readPrototypeHtml();
  assert.match(html, /\.graph-map-panel\.is-hovering-thinking \.graph-hover-card \{[\s\S]*border-color: rgba\(96, 226, 209, 0\.28\);[\s\S]*box-shadow: 0 18px 36px rgba\(7, 17, 28, 0\.3\);/);
});

test("graph reading noise controls expose three lightweight lenses without filtering data", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /readingLens: "insight"/);
  assert.match(source, /const GRAPH_READING_LENS_META = \{[\s\S]*insight:[\s\S]*label: "\u6d1e\u89c1"[\s\S]*bridge:[\s\S]*label: "\u6865\u63a5"[\s\S]*argument:[\s\S]*label: "\u8bba\u8bc1"/);
  assert.match(source, /function renderGraphReadingLensControls\(activeLens = "insight", legendOpen = false, trailingMarkup = ""\) \{/);
  assert.match(source, /data-graph-reading-lens="\$\{escapeHtml\(item\.key\)\}"/);
  assert.match(source, /renderGraphReadingLensControls\(readingLens\.key, legendOpen, workbenchEntryMarkup\)/);
  assert.match(source, /const readingLensButton = event\.target\.closest\("\[data-graph-reading-lens\]"\);/);
  assert.match(source, /graphState\.readingLens = graphReadingLensMeta\(readingLensButton\.getAttribute\("data-graph-reading-lens"\)\)\.key;/);
  assert.match(source, /graphBuildReadingLensState\(\{[\s\S]*visibleEdges,[\s\S]*bridgeGaps,[\s\S]*lens: readingLens\.key/);
  assert.doesNotMatch(source, /edges\s*=\s*edges\.filter\([^)]*readingLens/, "reading lenses should not filter the underlying graph data");

  assert.match(html, /\.graph-reading-lens \{[\s\S]*display: flex;[\s\S]*flex-wrap: wrap;/);
  assert.match(html, /\.graph-reading-lens-btn\.is-active \{[\s\S]*background: linear-gradient/);
  assert.match(html, /\.graph-map-panel\.has-reading-lens:not\(\.is-selecting-node\):not\(\.is-hovering-node\):not\(\.is-hovering-edge\):not\(\.is-hovering-thinking\) \.graph-map-node\.is-lens-secondary circle \{[\s\S]*opacity: 0\.3;/);
});

test("clicking a graph node keeps only its one-hop neighborhood visually prominent", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /const selectedNodeNeighborhood = new Set\(selectedNodeId \? \[selectedNodeId, \.\.\.\(adjacencyMap\.get\(selectedNodeId\) \|\| \[\]\)\] : \[\]\);/);
  assert.match(source, /const inSelectedNodeNeighborhood = selectedNodeNeighborhood\.has\(node\.id\);/);
  assert.match(source, /inSelectedNodeNeighborhood \? "is-selected-neighborhood" : ""/);
  assert.match(source, /const inSelectedNodeNeighborhood = Boolean\(selectedNodeId\) && \(fromId === selectedNodeId \|\| toId === selectedNodeId\);/);
  assert.match(source, /const related = fromId === nodeId \|\| toId === nodeId;/);
  assert.doesNotMatch(source, /const related = neighbors\.has\(fromId\) && neighbors\.has\(toId\)/);
  assert.match(source, /activeSelection\?\.kind === "node" \? " is-selecting-node" : ""/);

  assert.match(html, /\.graph-map-panel\.is-selecting-node \.graph-map-node:not\(\.is-selected-neighborhood\) circle \{[\s\S]*opacity: \.16;/);
  assert.match(html, /\.graph-map-panel\.is-selecting-node \.graph-map-edge-group:not\(\.is-selected-neighborhood\) \.graph-map-edge \{[\s\S]*opacity: 0\.06;/);
  assert.match(html, /\.graph-map-node\.is-selected-neighborhood:not\(\.is-selected\) circle \{[\s\S]*stroke: #65b994;/);
});

test("bridge gap clues in the pending judgment drawer can highlight graph nodes", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /const highlightNodeIds = \[sourceNoteId, targetNoteId\]\.filter\(Boolean\)\.join\(","\);/);
  assert.match(source, /class="graph-focus-card graph-bridge-gap-card"[\s\S]*data-graph-thinking-highlight="true"[\s\S]*data-graph-thinking-node-ids="\$\{escapeHtml\(highlightNodeIds\)\}"/);
  assert.match(source, /data-graph-thinking-kicker="\u6f5c\u5728\u5173\u8054"/);
  assert.match(source, /event\.target\.closest\("\[data-graph-thinking-highlight\]"\)/);
  assert.match(html, /\.graph-map-panel\.is-hovering-thinking \.graph-map-node\.is-dimmed circle \{[\s\S]*opacity: 0\.14;/);
  assert.match(html, /\.graph-map-panel\.is-hovering-thinking \.graph-map-edge-group\.is-hovered \.graph-map-edge \{[\s\S]*stroke-width: 0\.98;/);
});

test("weak relation clues provide a non-AI pending judgment highlight path", () => {
  const source = readPrototypeApp();

  assert.match(source, /function graphWeakRelationClues\(edges = \[\], limit = 6\) \{/);
  assert.match(source, /GRAPH_LINK_CLUE_RELATION_TYPES\.has\(String\(edge\?\.relationType \|\| "associated_with"\)/);
  assert.match(source, /function renderGraphWeakRelationClueSection\(edges = \[\], options = \{\}\) \{/);
  assert.match(source, /data-graph-section="weak-relations"/);
  assert.match(source, /class="graph-focus-card graph-weak-relation-card"[\s\S]*data-graph-thinking-highlight="true"[\s\S]*data-graph-thinking-edge-key="\$\{escapeHtml\(edgeKey\)\}"/);
  assert.match(source, /data-graph-thinking-kicker="\u5f85\u5224\u65ad\u5173\u8054"/);
  assert.match(source, /graphSelectEdgeActionAttrs\(edge\)/);
  assert.match(source, /\u5f85\u5224\u65ad\u5173\u8054 \$\{escapeHtml\(String\(weakRelationCount\)\)\}/);
  assert.match(source, /const weakRelationClueCount = !showingFocusedNote \? graphWeakRelationClues\(edges, 6\)\.length : 0;/);
  assert.match(source, /renderGraphWeakRelationClueSection\(edges, \{ open: graphState\.sectionOpen\["weak-relations"\] === true \}\)/);
  assert.doesNotMatch(source, /renderGraphWeakRelationClueSection\(scoped\.edges/);
});

test("graph thinking panel and selection detail stay mutually exclusive", () => {
  const source = readPrototypeApp();
  assert.match(source, /function openGraphSelection\(selection = null\) \{[\s\S]*graphState\.selection = selection;[\s\S]*graphState\.thinkingPanelOpen = false;[\s\S]*resetGraphHoverState\(\);[\s\S]*renderGraphPanel\(\);[\s\S]*\}/);
  assert.match(source, /const themeSelection = event\.target\.closest\("\[data-graph-select-theme\]"\);[\s\S]*openGraphSelection\(\{ kind: "theme", topicKey \}\);/);
  assert.match(source, /const isolatedSelection = event\.target\.closest\("\[data-graph-select-isolated\]"\);[\s\S]*openGraphSelection\(\{ kind: "isolated", isolatedKey \}\);/);
  assert.match(source, /const thinkingToggle = event\.target\.closest\("\[data-graph-thinking-toggle\]"\);[\s\S]*const nextOpen = graphState\.thinkingPanelOpen !== true;[\s\S]*if \(nextOpen\) graphState\.selection = null;[\s\S]*graphState\.thinkingPanelOpen = nextOpen;/);
  assert.match(source, /openGraphSelection\(\{ kind: "node", nodeId \}\);/);
  assert.match(source, /openGraphSelection\(\{[\s\S]*kind: "edge",[\s\S]*edgeKey:/);
});

test("reviewable relation thinking items open graph edge review before editing", () => {
  const source = readPrototypeApp();
  assert.match(source, /function graphSelectEdgeActionAttrs\(edge = \{\}\) \{[\s\S]*data-graph-select-edge=/);
  assert.match(source, /data-graph-select-edge-id/);
  assert.match(source, /data-graph-select-edge-from/);
  assert.match(source, /data-graph-select-edge-to/);
  assert.match(source, /data-graph-select-edge-type/);
  assert.match(source, /actionLabel: "\u590d\u6838\u5173\u7cfb",[\s\S]*actionAttrs: graphSelectEdgeActionAttrs\(edgeTarget\),[\s\S]*highlightEdge: edgeTarget/);
  assert.match(source, /actionLabel: "\u590d\u6838\u8fb9\u754c",[\s\S]*actionAttrs: graphSelectEdgeActionAttrs\(edge\),[\s\S]*highlightEdge: edge/);
  assert.doesNotMatch(source, /kicker: "\u5173\u7cfb\u5f85\u590d\u6838"[\s\S]{0,900}data-graph-followup-action="relations-edit"/);

  const clickHandler = source.match(/\$\("graphCanvas"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(clickHandler, "expected graph canvas click handler to exist");
  assert.match(clickHandler[1], /const edgeSelection = event\.target\.closest\("\[data-graph-select-edge\]"\);/);
  assert.match(clickHandler[1], /openGraphSelection\(\{[\s\S]*kind: "edge",[\s\S]*edgeKey,[\s\S]*relationId:[\s\S]*fromNoteId,[\s\S]*toNoteId,[\s\S]*relationType:/);
  assert.match(clickHandler[1], /setStatus\("\u5df2\u6253\u5f00\u5173\u7cfb\u590d\u6838\u8be6\u60c5", "ok"\);/);
});

test("selected theme candidates render a subtle boundary behind graph nodes", () => {
  const source = readPrototypeApp();
  assert.match(source, /function graphThemeBoundaryMeta\(\{ nodes = \[\], noteIds = \[\], title = "", layoutWidth = 0, layoutHeight = 0 \} = \{\}\) \{/);
  assert.match(source, /const broad = members\.length >= Math\.max\(24, nodes\.length \* 0\.45\) \|\| coverage > 0\.62;/);
  assert.match(source, /tone: broad \? "is-broad" : compact \? "is-compact" : "is-cluster"/);
  assert.match(source, /function renderGraphThemeBoundary\(boundary = null\) \{/);
  assert.match(source, /data-graph-theme-boundary="true"/);
  assert.match(source, /const themeBoundaryMarkup = renderGraphThemeBoundary\(/);
  assert.match(source, /\$\{themeBoundaryMarkup \? `<g class="graph-map-theme-boundaries">\$\{themeBoundaryMarkup\}<\/g>` : ""\}\s*\n\s*<g class="graph-map-edges">\$\{edgeMarkup\}<\/g>\s*\n\s*<g class="graph-map-nodes">\$\{nodeMarkup\}<\/g>/);

  const html = readPrototypeHtml();
  assert.match(html, /\.graph-theme-boundary-aura \{[\s\S]*fill: rgba\(124, 242, 230, 0\.12\);[\s\S]*drop-shadow\(0 0 16px rgba\(20, 184, 166, 0\.12\)\);/);
  assert.match(html, /\.graph-theme-boundary-line \{[\s\S]*stroke-dasharray: 6 10;[\s\S]*animation: graphThemeBoundaryPulse 6\.8s ease-in-out infinite;/);
  assert.match(html, /\.graph-theme-boundary\.is-broad \.graph-theme-boundary-line \{[\s\S]*stroke: rgba\(236, 193, 105, 0\.28\);/);
});

test("graph theme candidates distinguish broad tags from research-ready clusters", () => {
  const source = readPrototypeApp();
  assert.match(source, /function graphThemeTitleLooksGeneric\(title = ""\) \{/);
  assert.match(source, /function graphThemeBreadthMeta\(topic = \{\}, \{ totalNodeCount = 0 \} = \{\}\) \{/);
  assert.match(source, /const genericWide = genericTitle && noteIds\.length >= Math\.max\(8, total \* 0\.28\);/);
  assert.match(source, /if \(breadth\.broad\) \{[\s\S]*tone: "loose"[\s\S]*label:/);
  assert.match(source, /function graphThemeCandidateQualityMeta\(topic = \{\}, \{ nodeMap = new Map\(\), edges = \[\], index = 0 \} = \{\}\) \{/);
  assert.match(source, /else if \(maturity\.tone === "loose"\) sortScore -= 26;/);
  assert.match(source, /function graphRankThemeCandidates\(topicCandidates = \[\], \{ nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.match(source, /graphRankThemeCandidates\(analysis\?\.topicCandidates, \{ nodeMap, edges \}\)\.slice\(0, 4\)/);
  assert.match(source, /const topicKey = graphThemeSelectionKey\(topic, originalIndex\);/);
  assert.match(source, /quality\?\.listQuestion/);

  const html = readPrototypeHtml();
  assert.match(html, /\.graph-theme-maturity\.is-loose \.graph-theme-meter i \{[\s\S]*linear-gradient\(90deg, #f5c567 0%, #d59c2a 100%\);/);
  assert.match(html, /\.graph-selection-panel\.is-theme\.is-loose \.graph-selection-role span \{[\s\S]*background: #fffaf0;/);
});

