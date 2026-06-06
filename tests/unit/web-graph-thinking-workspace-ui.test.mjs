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
  assert.match(match[1], /aria-label="\$\{empty \? "鎵撳紑鍙拷闂骞惰繍琛屽浘璋辨壂鎻? : "鎵撳紑鍙拷闂"\}"/);
  assert.doesNotMatch(match[1], /\sdisabled\b/, "empty state should not disable the thinking entry");
});

test("graph thinking panel is rendered inside the visual map instead of below it", () => {
  const source = readPrototypeApp();
  const signature = /function renderGraphVisualMap\(\{[\s\S]*nodes = \[\],[\s\S]*edges = \[\],[\s\S]*filterActive = false,[\s\S]*focusedNoteId = "",[\s\S]*relationType = "meaningful",[\s\S]*questionSpotSummary = null,[\s\S]*topicCandidates = \[\],[\s\S]*isolatedNotes = \[\],[\s\S]*bridgeGaps = \[\],[\s\S]*thinkingPanelMarkup = ""[\s\S]*\} = \{\}\)/;
  assert.match(source, signature);
  assert.match(source, /\$\{thinkingPanelMarkup && !filterActive \? thinkingPanelMarkup : ""\}\s*\n\s*\$\{questionSpotSummary && !filterActive \? renderGraphQuestionSpotChip\(questionSpotSummary\) : ""\}/);
  assert.match(source, /renderGraphVisualMap\(\{[\s\S]*nodes: visualNodes,[\s\S]*relationType: effectiveRelationType,[\s\S]*thinkingPanelMarkup: thinkingPanel[\s\S]*\}\)/);
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

  assert.match(source, /function renderGraphReadingLensControls\(activeLens = "insight", legendOpen = false\) \{[\s\S]*id="graphLegendToggle"[\s\S]*graph-legend-inline-btn/);
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

  assert.match(source, /const curveMagnitude = Math\.min\(38, Math\.max\(10, length \* 0\.085\)\);/);
  assert.match(source, /const driftSeed = \(\(graphHash\(`\$\{edge\.fromNoteId\}:\$\{edge\.toNoteId\}:\$\{edge\.relationType\}:drift`\) % 9\) - 4\) \/ 4;/);
  assert.match(source, /const control1X = startX \+ dx \* 0\.28 \+ controlOffsetX - unitX \* forwardDrift;/);
  assert.match(source, /const control2X = startX \+ dx \* 0\.72 \+ controlOffsetX \+ unitX \* forwardDrift;/);
  assert.match(source, /markerWidth="10" markerHeight="10" refX="8" refY="5"/);
  assert.match(source, /<path d="M 2 2\.4 L 8 5 L 2 7\.6" fill="none" stroke="\$\{escapeHtml\(color\)\}" stroke-width="1\.35"/);
  assert.match(html, /\.graph-map-edge \{[\s\S]*stroke-width: 1\.35;[\s\S]*opacity: 0\.52;[\s\S]*marker-end: var\(--graph-edge-marker, none\);/);
  assert.match(html, /\.graph-map-edge-underlay \{[\s\S]*stroke-width: 5\.2;[\s\S]*opacity: 0\.24;/);
  assert.match(html, /\.graph-map-edge-group:hover \.graph-map-edge,[\s\S]*stroke-width: 2\.3;/);
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
  assert.match(source, /aria-label="\$\{node\.isGraphIsolatedCandidate \? "鏁寸悊瀛ょ珛鑺傜偣" : "鏌ョ湅绗旇瑙掕壊"\}/);
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
  assert.match(html, /\.graph-thinking-panel \{[\s\S]*position: absolute;[\s\S]*bottom: 82px;[\s\S]*max-height: min\(420px, calc\(100% - 112px\)\);[\s\S]*overflow: auto;/);
  assert.match(html, /\.graph-question-chip\.is-empty \{[\s\S]*opacity: \.72;[\s\S]*box-shadow: 0 12px 24px rgba\(15, 23, 42, 0\.08\);/);
  assert.match(html, /\.graph-utility-drawer-wrap \{[\s\S]*pointer-events: none;/);
  assert.match(html, /\.graph-utility-drawer \{[\s\S]*pointer-events: auto;/);
  assert.match(html, /\.graph-selection-panel \{[\s\S]*position: relative;[\s\S]*z-index: 8;/);
  assert.match(html, /\.graph-map-node-hit \{[\s\S]*pointer-events: all;[\s\S]*vector-effect: non-scaling-stroke;/);
  assert.match(html, /\.graph-map-node-orbit\.is-isolated \{[\s\S]*stroke: rgba\(213, 156, 42, 0\.74\) !important;[\s\S]*animation: graphNodeOrbitPulse 3\.4s ease-in-out infinite;/);
  assert.match(html, /\.graph-map-node\.is-graph-isolated \.graph-map-node-core \{[\s\S]*stroke: #d59c2a;[\s\S]*stroke-dasharray: 3 4;/);
});

test("graph AI scan keeps the researcher in the graph thinking workspace", () => {
  const source = readPrototypeApp();
  const match = source.match(/async function runGraphAiAnalysis\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, "expected runGraphAiAnalysis() to exist");

  assert.match(match[1], /graphState\.thinkingPanelOpen = true;/);
  assert.match(match[1], /graphState\.thinkingFilter = "all";/);
  assert.match(match[1], /宸插湪鍙拷闂灞曞紑/);
  assert.doesNotMatch(match[1], /openAiInboxModule/, "graph scan should not auto-navigate away from the graph");
});

test("graph thinking cards include research questions instead of only actions", () => {
  const source = readPrototypeApp();
  assert.match(source, /const listQuestion =[\s\S]*"杩欑粍绗旇鑳藉惁鍐欐垚涓€鍙ュ彲浜夎鐨勫垽鏂紝鑰屼笉鍙槸鍏变韩鍚屼竴涓爣绛撅紵";/);
  assert.match(source, /question: quality\?\.listQuestion \|\| "杩欑粍绗旇鑳藉惁鍐欐垚涓€鍙ュ彲浜夎鐨勫垽鏂紝鑰屼笉鍙槸鍏变韩鍚屼竴涓爣绛撅紵"/);
  assert.match(source, /question: "瀹冨绔嬫槸鍥犱负鐪熺殑鐙壒锛岃繕鏄洜涓鸿繕娌℃湁鍐欏嚭鍏崇郴鐞嗙敱锛?/);
  assert.match(source, /question: "杩欐潯鍊欓€夊叧绯昏兘涓嶈兘璇存竻鈥滀负浠€涔堢浉杩炩€濓紝杩樻槸鍙槸鏍囬鐩镐技锛?/);
  assert.match(source, /<span class="graph-thinking-question"><small>鍙拷闂?\/small>\$\{escapeHtml\(item\.question\)\}<\/span>/);

  const html = readPrototypeHtml();
  assert.match(html, /\.graph-thinking-question \{[\s\S]*border: 1px solid rgba\(207, 228, 217, 0\.9\);[\s\S]*line-height: 1\.5;/);
  assert.match(html, /\.graph-thinking-question small \{[\s\S]*letter-spacing: \.08em;/);
});

test("question spots cover theme bridge relation-review and isolated thinking work", () => {
  const source = readPrototypeApp();

  const summaryMatch = source.match(/function buildGraphQuestionSpotSummary\([\s\S]*?\n\}/);
  assert.ok(summaryMatch, "expected buildGraphQuestionSpotSummary() to exist");
  assert.match(summaryMatch[0], /\{ key: "theme", label: "涓婚鍊欓€?, count: topicCount \}/);
  assert.match(summaryMatch[0], /\{ key: "bridge", label: "妗ユ帴鏈轰細", count: Math\.max\(Number\(bridgeGaps\?\.length \|\| 0\), bridgeCandidateCount\) \}/);
  assert.match(summaryMatch[0], /\{ key: "review", label: "鍏崇郴寰呭鏍?, count: Math\.max\(Number\(reviewQueueTotal \|\| 0\), relationCandidateCount\) \}/);
  assert.match(summaryMatch[0], /\{ key: "isolated", label: "瀛ょ珛寰呭垽鏂?, count: isolatedCount \}/);
  assert.match(summaryMatch[0], /label: total \? `\$\{total\} 涓彲杩介棶澶刞 : "鏆傛棤鍙拷闂"/);

  const thinkingMatch = source.match(/function buildGraphThinkingItems\([\s\S]*?\n\}/);
  assert.ok(thinkingMatch, "expected buildGraphThinkingItems() to exist");
  assert.match(thinkingMatch[0], /kicker: "涓婚鍊欓€?[\s\S]*actionLabel: "璇勪及涓婚"[\s\S]*data-graph-select-theme/);
  assert.match(thinkingMatch[0], /kicker: gapType === "disconnected_cluster" \? "鏂绨? : "妗ユ帴鏈轰細"[\s\S]*question: targetTitle \? `瀹冨拰/);
  assert.match(thinkingMatch[0], /kicker: "鍏崇郴寰呭鏍?[\s\S]*question: "濡傛灉鍒犳帀杩欐潯绾匡紝鎹熷け鐨勬槸璁鸿瘉缁撴瀯锛岃繕鏄彧鏄皯浜嗕竴涓鑸摼鎺ワ紵"[\s\S]*actionLabel: "澶嶆牳鍏崇郴"/);
  assert.match(thinkingMatch[0], /kicker: "瀛ょ珛寰呭垽鏂?[\s\S]*question: "瀹冨绔嬫槸鍥犱负鐪熺殑鐙壒锛岃繕鏄洜涓鸿繕娌℃湁鍐欏嚭鍏崇郴鐞嗙敱锛?[\s\S]*actionLabel: "鏁寸悊"/);
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
  assert.match(source, /kicker: "妗ユ帴鍒ゆ柇"/);
  assert.match(source, /<strong>妗ユ帴闂<\/strong>/);
  assert.match(source, /data-graph-followup-action="bridge"/);
  assert.match(source, /actionLabel: "鍒ゆ柇妗ユ帴"[\s\S]*data-graph-select-bridge/);
  assert.doesNotMatch(source, /kicker: gapType === "disconnected_cluster" \? "鏂绨? : "妗ユ帴鏈轰細"[\s\S]{0,900}data-graph-followup-action="bridge"/);

  const clickHandler = source.match(/\$\("graphCanvas"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(clickHandler, "expected graph canvas click handler to exist");
  assert.match(clickHandler[1], /const bridgeSelection = event\.target\.closest\("\[data-graph-select-bridge\]"\);/);
  assert.match(clickHandler[1], /openGraphSelection\(\{ kind: "bridge", bridgeKey, noteId, targetNoteId \}\);/);
  assert.match(source, /selectedBridgeNoteIds/);
  assert.match(source, /is-bridge-selected/);

  const html = readPrototypeHtml();
  assert.match(html, /\.graph-map-node-orbit\.is-bridge \{[\s\S]*stroke: rgba\(104, 66, 166, 0\.58\) !important;/);
  assert.match(html, /\.graph-map-panel\.is-selecting-bridge \.graph-map-node:not\(\.is-bridge-selected\) circle \{[\s\S]*opacity: \.28;/);
  assert.match(html, /\.graph-map-node\.is-bridge-selected circle \{[\s\S]*stroke: #6842a6;/);
});

test("graph scan artifacts stay available through a voluntary review entry", () => {
  const source = readPrototypeApp();
  assert.match(source, /const artifactCount = Number\([\s\S]*reviewSummary\.artifactCount[\s\S]*aiAnalysis\?\.reviewItems\?\.storedArtifactIds\?\.length[\s\S]*aiAnalysis\?\.reviewItems\?\.artifacts\?\.length/);
  assert.match(source, /function renderGraphThinkingReviewNote\(summary = \{\}\) \{/);
  assert.match(source, /if \(!artifactCount\) return "";/);
  assert.match(source, /data-open-ai-inbox-from-graph/);
  assert.match(source, /\$\{renderGraphThinkingReviewNote\(summary\)\}/);

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
  assert.match(html, /\.graph-map-panel\.is-hovering-thinking \.graph-hover-card \{[\s\S]*border-color: rgba\(15, 111, 72, 0\.22\);[\s\S]*box-shadow: 0 18px 36px rgba\(15, 111, 72, 0\.12\);/);
});

test("graph reading noise controls expose three lightweight lenses without filtering data", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /readingLens: "insight"/);
  assert.match(source, /const GRAPH_READING_LENS_META = \{[\s\S]*insight:[\s\S]*label: "娲炶"[\s\S]*bridge:[\s\S]*label: "妗ユ帴"[\s\S]*argument:[\s\S]*label: "璁鸿瘉"/);
  assert.match(source, /function renderGraphReadingLensControls\(activeLens = "insight"\) \{/);
  assert.match(source, /data-graph-reading-lens="\$\{escapeHtml\(item\.key\)\}"/);
  assert.match(source, /\$\{!filterActive \? renderGraphReadingLensControls\(readingLens\.key\) : ""\}/);
  assert.match(source, /const readingLensButton = event\.target\.closest\("\[data-graph-reading-lens\]"\);/);
  assert.match(source, /graphState\.readingLens = graphReadingLensMeta\(readingLensButton\.getAttribute\("data-graph-reading-lens"\)\)\.key;/);
  assert.match(source, /graphBuildReadingLensState\(\{[\s\S]*visibleEdges,[\s\S]*bridgeGaps,[\s\S]*lens: readingLens\.key/);
  assert.doesNotMatch(source, /edges\s*=\s*edges\.filter\([^)]*readingLens/, "reading lenses should not filter the underlying graph data");

  assert.match(html, /\.graph-reading-lens \{[\s\S]*display: flex;[\s\S]*flex-wrap: wrap;/);
  assert.match(html, /\.graph-reading-lens-btn\.is-active \{[\s\S]*background: linear-gradient/);
  assert.match(html, /\.graph-map-panel\.has-reading-lens:not\(\.is-selecting-node\):not\(\.is-hovering-node\):not\(\.is-hovering-edge\):not\(\.is-hovering-thinking\) \.graph-map-node\.is-lens-secondary circle \{[\s\S]*opacity: 0\.42;/);
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

  assert.match(html, /\.graph-map-panel\.is-selecting-node \.graph-map-node:not\(\.is-selected-neighborhood\) circle \{[\s\S]*opacity: \.22;/);
  assert.match(html, /\.graph-map-panel\.is-selecting-node \.graph-map-edge-group:not\(\.is-selected-neighborhood\) \.graph-map-edge \{[\s\S]*opacity: 0\.1;/);
  assert.match(html, /\.graph-map-node\.is-selected-neighborhood:not\(\.is-selected\) circle \{[\s\S]*stroke: #65b994;/);
});

test("bridge gap clues in the pending judgment drawer can highlight graph nodes", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /const highlightNodeIds = \[sourceNoteId, targetNoteId\]\.filter\(Boolean\)\.join\(","\);/);
  assert.match(source, /class="graph-focus-card graph-bridge-gap-card"[\s\S]*data-graph-thinking-highlight="true"[\s\S]*data-graph-thinking-node-ids="\$\{escapeHtml\(highlightNodeIds\)\}"/);
  assert.match(source, /data-graph-thinking-kicker="娼滃湪鍏宠仈"/);
  assert.match(source, /event\.target\.closest\("\[data-graph-thinking-highlight\]"\)/);
  assert.match(html, /\.graph-map-panel\.is-hovering-thinking \.graph-map-node\.is-dimmed circle \{[\s\S]*opacity: 0\.2;/);
  assert.match(html, /\.graph-map-panel\.is-hovering-thinking \.graph-map-edge-group\.is-hovered \.graph-map-edge \{[\s\S]*stroke-width: 3\.8;/);
});

test("weak relation clues provide a non-AI pending judgment highlight path", () => {
  const source = readPrototypeApp();

  assert.match(source, /function graphWeakRelationClues\(edges = \[\], limit = 6\) \{/);
  assert.match(source, /GRAPH_LINK_CLUE_RELATION_TYPES\.has\(String\(edge\?\.relationType \|\| "associated_with"\)/);
  assert.match(source, /function renderGraphWeakRelationClueSection\(edges = \[\], options = \{\}\) \{/);
  assert.match(source, /data-graph-section="weak-relations"/);
  assert.match(source, /class="graph-focus-card graph-weak-relation-card"[\s\S]*data-graph-thinking-highlight="true"[\s\S]*data-graph-thinking-edge-key="\$\{escapeHtml\(edgeKey\)\}"/);
  assert.match(source, /data-graph-thinking-kicker="寰呭垽鏂叧鑱?/);
  assert.match(source, /graphSelectEdgeActionAttrs\(edge\)/);
  assert.match(source, /寰呭垽鏂叧鑱?\$\{escapeHtml\(String\(weakRelationCount\)\)\}/);
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
  assert.match(source, /actionLabel: "澶嶆牳鍏崇郴",[\s\S]*actionAttrs: graphSelectEdgeActionAttrs\(edgeTarget\),[\s\S]*highlightEdge: edgeTarget/);
  assert.match(source, /actionLabel: "澶嶆牳杈圭晫",[\s\S]*actionAttrs: graphSelectEdgeActionAttrs\(edge\),[\s\S]*highlightEdge: edge/);
  assert.doesNotMatch(source, /kicker: "鍏崇郴寰呭鏍?[\s\S]{0,900}data-graph-followup-action="relations-edit"/);

  const clickHandler = source.match(/\$\("graphCanvas"\)\?\.addEventListener\("click", async \(event\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(clickHandler, "expected graph canvas click handler to exist");
  assert.match(clickHandler[1], /const edgeSelection = event\.target\.closest\("\[data-graph-select-edge\]"\);/);
  assert.match(clickHandler[1], /openGraphSelection\(\{[\s\S]*kind: "edge",[\s\S]*edgeKey,[\s\S]*relationId:[\s\S]*fromNoteId,[\s\S]*toNoteId,[\s\S]*relationType:/);
  assert.match(clickHandler[1], /setStatus\("宸叉墦寮€鍏崇郴澶嶆牳璇︽儏", "ok"\);/);
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
  assert.match(html, /\.graph-theme-boundary-aura \{[\s\S]*fill: rgba\(240, 253, 250, 0\.42\);[\s\S]*drop-shadow\(0 0 20px rgba\(20, 184, 166, 0\.16\)\);/);
  assert.match(html, /\.graph-theme-boundary-line \{[\s\S]*stroke-dasharray: 12 9;[\s\S]*animation: graphThemeBoundaryPulse 4\.8s ease-in-out infinite;/);
  assert.match(html, /\.graph-theme-boundary\.is-broad \.graph-theme-boundary-line \{[\s\S]*stroke: rgba\(213, 156, 42, 0\.55\);/);
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

