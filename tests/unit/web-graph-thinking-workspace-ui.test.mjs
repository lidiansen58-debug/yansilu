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
  assert.match(source, /label: "整理"/);
  assert.match(source, /label: "追问"/);
  assert.match(source, /data-graph-workbench-entry="\$\{escapeHtml\(meta\.key\)\}"/);
  assert.match(source, /const label = total > 0 \? meta\.label : meta\.emptyLabel;/);
  assert.match(source, /const readingLensTrailingMarkup = `\$\{workbenchEntryMarkup\}\$\{researchNavigatorEntryMarkup\}`;/);
  assert.match(source, /renderGraphReadingLensControls\(readingLens\.key, legendOpen, readingLensTrailingMarkup\)/);
});

test("live graph connectivity overrides stale persisted relation status once a scope is loaded", () => {
  const source = readPrototypeApp();

  assert.match(source, /function relationNetworkStatusForNote\(note = null, options = \{\}\) \{/);
  assert.match(source, /const permanentLike = noteType === "permanent" \|\| noteType === "original";/);
  assert.match(source, /if \(permanentLike && connectivityReady && connectedIds\) return connectedIds\.has\(note\?\.id\) \? "connected" : "isolated";/);
  assert.match(source, /const explicitStatus = String\(note\?\.relationNetworkStatus \|\| note\?\.relation_network_status \|\| ""\)\.trim\(\)\.toLowerCase\(\);/);
});

test("graph refresh repaints the explorer tree after connectivity state changes", () => {
  const source = readPrototypeApp();

  assert.match(source, /async function refreshDirectoryGraph\(\) \{/);
  assert.match(source, /graphState\.loading = false;\s*renderAll\(\);/);
});

test("graph focus reading panel can be collapsed and restored explicitly", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /focusContextCollapsed: false/);
  assert.match(source, /const focusContextAvailable = filterActive && normalizedFocusedNoteId;/);
  assert.match(source, /const focusContextMarkup = focusContextAvailable && !focusContextCollapsed/);
  assert.match(source, /data-graph-focus-context-toggle="\$\{focusContextCollapsed \? "open" : "close"\}"/);
  assert.match(source, /id="graphFocusContextPanel" class="graph-focus-context"/);
  assert.match(source, /class="graph-overlay-close graph-focus-panel-close" type="button" data-graph-focus-context-toggle="close"/);
  assert.match(source, /const focusContextToggle = event\.target\.closest\("\[data-graph-focus-context-toggle\]"\);/);
  assert.match(source, /graphState\.focusContextCollapsed =[\s\S]*action === "open" \? false : action === "close" \? true/);
  assert.match(source, /setStatus\(graphState\.focusContextCollapsed \? "已收起右侧阅读" : "已显示右侧阅读", "ok"\);/);

  assert.match(html, /\.graph-focus-panel-head \{[\s\S]*justify-content: space-between;/);
  assert.match(html, /\.graph-focus-panel-toggle \{[\s\S]*min-height: 30px;[\s\S]*cursor: pointer;/);
  assert.match(html, /\.graph-focus-panel-close \{[\s\S]*position: static;[\s\S]*width: 30px;/);
});

test("graph workbench panel replaces map-covering clue and question floaters", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphWorkbenchPanel\(\{ clueSummary = \{\}, questionSummary = \{\}, clueSectionsMarkup = "", thinkingItems = \[\], isolatedQueueMarkup = "" \} = \{\}\) \{/);
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
  assert.match(source, /\{ label: "待整理项", value: `\$\{nav\.pendingTotal\} 项`, hint: "待补关系或追问" \}/);
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
  assert.match(source, /补一条中间判断，或关联一条能说清理由的笔记，把它接回现有论证。/);
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
  assert.match(source, /建议先处理的 3 项/);
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
  assert.match(source, /关联一条笔记/);
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

test("isolated graph notes can request AI-assisted relation candidates and confirm them through the relation form", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

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
  assert.match(source, /function graphPotentialRelationActionEndpoints\(cleanNoteId = "", sourceNoteId = "", targetNoteId = "", relationType = ""\) \{/);
  assert.match(source, /const relationType = graphPreferredPotentialRelationType\(candidate\);/);
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
  assert.match(source, /else setStatus\(`生成关联理由失败：\$\{String\(error\?\.\message \|\| error\)\}`\, "warn"\);/);
  assert.match(source, /mergePotentialRelationCandidateIntoGraphAnalysis\(refined\)/);
  assert.match(source, /function graphPotentialRelationNeedsConfirmation\(candidate = \{\}\) \{/);
  assert.match(source, /data-graph-ai-refine-confirm/);
  assert.match(source, /data-graph-ai-refine-retry/);
  assert.match(source, /已重新生成这条潜在关联的 AI 复核理由/);
  assert.match(source, /async function triggerGraphPotentialRelationRefine\(/);
  assert.match(source, /async function confirmGraphPotentialRelationRefine\(button = null\) \{/);
  assert.match(source, /async function retryGraphPotentialRelationRefine\(button = null\) \{/);
  assert.match(source, /正在重新生成关联理由/);
  assert.match(source, /progressStatus: "正在按当前 AI 设置生成关联理由\.\.\."/);
  assert.doesNotMatch(source, /setStatus\("已确认使用当前 AI 设置，正在生成关联理由", "ok"\);/);
  assert.match(source, /function renderGraphIsolatedJoinNetworkFlow\(noteId = "", \{ nodeMap = new Map\(\), edges = \[\], visibleEdgeCount = 0 \} = \{\}\) \{/);
  assert.match(source, /aria-label="孤立笔记关联到图谱"/);
  assert.match(source, /renderGraphIsolatedJoinNetworkFlow\(noteId, \{ nodeMap, edges, visibleEdgeCount \}\)/);
  assert.match(source, /data-graph-ai-connect-note="\$\{escapeHtml\(noteId\)\}"/);
  assert.match(source, /data-graph-followup-action="relations">手工关联<\/button>/);
  assert.match(source, /data-graph-ai-candidate-apply/);
  assert.match(source, /data-open-note="\$\{escapeHtml\(candidate\.actionSourceNoteId \|\| candidate\.sourceNoteId\)\}"/);
  assert.match(source, /data-graph-target-note="\$\{escapeHtml\(candidate\.actionTargetNoteId \|\| candidate\.targetNoteId\)\}"/);
  assert.match(source, /data-graph-relation-type="\$\{escapeHtml\(candidate\.relationType\)\}"/);
  assert.match(source, /data-graph-rationale-draft="\$\{escapeHtml\(candidate\.rationaleDraft\)\}"/);
  assert.match(source, /data-graph-insight-question-draft="\$\{escapeHtml\(candidate\.insightQuestionDraft\)\}"/);
  assert.match(source, /async function runGraphAiConnectForNote\(noteId = ""\) \{/);
  assert.match(source, /relationLimit: 24,/);
  assert.match(source, /focusNoteId: cleanNoteId,/);
  assert.match(source, /currentNoteId: cleanNoteId,/);
  assert.match(source, /if \(candidates\.length\) void refineGraphPotentialRelationsForNote\(cleanNoteId, candidates, \{ directoryId \}\);/);
  assert.match(source, /const graphSelectionKind = previousSelectionKind === "isolated" \|\| \(!previousSelectionKind && !hasDirectEdge\) \? "isolated" : "node";/);
  assert.match(source, /workflowRoute: \{ focus: "graph", source: "graph-ai-connect", graphSelectionKind \}/);
  assert.match(source, /function openGraphAiCandidateRelation\(button = null\) \{/);
  assert.match(source, /rationaleDraft,/);
  assert.match(source, /insightQuestionDraft,/);
  assert.match(source, /renderGraphAiConnectCandidates\(normalized\.nodeId, \{ nodeMap, edges \}\)/);
  assert.match(source, /runAiConnectForNote: runGraphAiConnectForNote/);
  assert.match(source, /const graphAiConnectButton = event\.target\.closest\("\[data-graph-ai-connect-note\]"\);/);
  assert.match(source, /const graphAiCandidateButton = event\.target\.closest\("\[data-graph-ai-candidate-apply\]"\);/);
  assert.match(source, /const graphAiRefineConfirmButton = event\.target\.closest\("\[data-graph-ai-refine-confirm\]"\);/);
  assert.match(source, /await confirmGraphPotentialRelationRefine\(graphAiRefineConfirmButton\);/);
  assert.match(source, /const graphAiRefineRetryButton = event\.target\.closest\("\[data-graph-ai-refine-retry\]"\);/);
  assert.match(source, /await retryGraphPotentialRelationRefine\(graphAiRefineRetryButton\);/);
  assert.match(source, /providedRationaleDraft \|\| providedInsightQuestionDraft/);
  assert.match(source, /sourceLabel = button\?\.hasAttribute\?\.\("data-graph-ai-candidate-apply"\) \? "潜在关联" : "候选关系";/);

  assert.match(html, /\.graph-isolated-join \{[\s\S]*display: grid;[\s\S]*border: 1px solid #efc66f;/);
  assert.match(html, /\.graph-isolated-join-actions \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(html, /\.graph-isolated-join-step \{[\s\S]*min-height: 44px;/);
  assert.match(html, /\.graph-ai-connect \{[\s\S]*display: grid;[\s\S]*border: 1px solid #d8e7ef;/);
  assert.match(html, /\.graph-ai-connect-card \{[\s\S]*border-radius: 14px;/);
  assert.match(html, /\.graph-ai-connect-actions \{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(112px, 1fr\)\);/);
});

test("graph selection upgrades isolated notes to connected nodes after a saved relation and keeps summary counts scoped instead of filter-limited", () => {
  const source = readPrototypeApp();

  assert.match(source, /const isolated = resolveGraphIsolatedSelection\(selection, isolatedNotes, \[\]\);/);
  assert.match(source, /return noteId && nodes\.some\(\(node\) => String\(node\?\.id \|\| ""\)\.trim\(\) === noteId\) \? \{ kind: "node", nodeId: noteId \} : null;/);
  assert.match(source, /const baseSummary = `\$\{scopedAllNodes\.length\} 条永久笔记，\$\{scoped\.edges\.length\} 条关系`;/);
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

  assert.match(source, /return status === "suggested" \|\| status === "draft" \|\| status === "confirmed";/);
  assert.match(source, /graphLocalRelationCandidatesForNote\(noteId = "", \{ nodeMap = new Map\(\), edges = \[\], limit = 5 \} = \{\}\) \{/);
  assert.match(source, /const connectedIds = new Set\(\s*\n\s*\(Array\.isArray\(edges\) \? edges : \[\]\)\s*\n\s*\.filter\(\(edge\) => graphRelationStatusCountsAsNetworkEdge\(edge\?\.status\)\)/);
});

test("graph AI summary treats bridge candidates as a subset instead of double counting them", () => {
  const source = readPrototypeApp();

  assert.match(source, /function graphAiAnalysisSummaryState\(\) \{/);
  assert.match(source, /const bridgeCount = Number\(summary\.bridgeCandidateCount \|\| analysis\?\.bridgeCandidates\?\.length \|\| 0\);/);
  assert.match(source, /const relationCandidateCount = Number\(summary\.relationCandidateCount \|\| analysis\?\.relationCandidates\?\.length \|\| 0\);/);
  assert.match(source, /const relationCount = Math\.max\(0, relationCandidateCount - bridgeCount\);/);
  assert.match(source, /totalCandidates: pendingCount \|\| topicCount \+ relationCount \+ bridgeCount \+ isolatedCount/);

  assert.match(source, /function buildGraphQuestionSpotSummary\(\{ reviewQueueTotal = 0, bridgeGaps = \[\], conflictCount = 0, aiAnalysis = null \} = \{\}\) \{/);
  assert.match(source, /const reviewCandidateCount = Math\.max\(0, relationCandidateCount - bridgeCandidateCount\);/);
  assert.match(source, /\{ key: "review", label: "关系待复核", count: Math\.max\(Number\(reviewQueueTotal \|\| 0\), reviewCandidateCount\) \}/);
});

test("directory graph keeps all nodes visible and marks true zero-degree notes as isolated", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function graphComputedIsolatedNotes\(nodes = \[\], edges = \[\], aiIsolatedNotes = \[\]\) \{/);
  assert.match(source, /const linkedIds = new Set\(/);
  assert.match(source, /function graphMarkIsolatedNodes\(nodes = \[\], isolatedNotes = \[\]\) \{/);
  assert.match(source, /graphVisualState: "isolated"/);
  assert.match(source, /let visibleNodes = !showingFocusedNote\s*\?\s*scopedAllNodes/);
  assert.match(source, /visibleNodes = !showingFocusedNote \? graphMarkIsolatedNodes\(visibleNodes, isolatedNotes\) : visibleNodes;/);
  assert.match(source, /const selectionEdges = Array\.isArray\(relationFilterEdges\) \? relationFilterEdges : edges;/);
  assert.match(html, /\.graph-map-node\.is-graph-isolated \.graph-map-node-core \{[\s\S]*stroke: #f59e0b;/);
  assert.match(html, /\.graph-local-connect \{[\s\S]*border-color: #fed7aa;/);
});

test("graph isolated notes are organized into a continuous handling queue", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function graphIsolatedQueueItems\(\{ isolatedNotes = \[\], nodeMap = new Map\(\), edges = \[\], currentNoteId = "", limit = 8 \} = \{\}\) \{/);
  assert.match(source, /const limitCount = Math\.max\(1, Number\(limit\) \|\| 8\);/);
  assert.match(source, /const aiCandidates = graphAiRelationCandidatesForNote\(noteId, \{ nodeMap, edges, limit: 3 \}\);/);
  assert.match(source, /const localCandidates = graphLocalRelationCandidatesForNote\(noteId, \{ nodeMap, edges, limit: 3 \}\);/);
  assert.match(source, /const currentItem = items\.find\(\(item\) => item\.noteId === cleanCurrentNoteId\);/);
  assert.match(source, /return \[\.\.\.limitedItems\.slice\(0, Math\.max\(0, limitCount - 1\)\), currentItem\];/);
  assert.match(source, /function graphNextIsolatedQueueItem\(queueItems = \[\], currentNoteId = ""\) \{/);
  assert.match(source, /function renderGraphIsolatedQueue\(\{ isolatedNotes = \[\], nodeMap = new Map\(\), edges = \[\], currentNoteId = "", compact = false, limit = 8, queueItems: providedQueueItems = null \} = \{\}\) \{/);
  assert.match(source, /function renderGraphIsolatedQueueStrip\(\{ isolatedNotes = \[\], nodeMap = new Map\(\), edges = \[\], currentNoteId = "", queueItems: providedQueueItems = null \} = \{\}\) \{/);
  assert.match(source, /data-graph-select-isolated="\$\{escapeHtml\(nextItem\.isolatedKey\)\}"/);
  assert.match(source, /class="graph-isolated-queue-strip"/);
  assert.match(source, /data-graph-open-workbench-entry="organize"/);
  assert.match(source, /const workbenchOpenEntry = event\.target\.closest\("\[data-graph-open-workbench-entry\]"\);/);
  assert.match(source, /const isolatedQueueMarkup = renderGraphIsolatedQueue\(\{ isolatedNotes, nodeMap, edges, currentNoteId: noteId, compact: true, limit: 6 \}\);/);
  assert.match(source, /const graphScopedNodeMap = new Map\(scopedAllNodes\.map/);
  assert.match(source, /const isolatedQueueItems = !showingFocusedNote[\s\S]*graphIsolatedQueueItems\(\{/);
  assert.match(source, /renderGraphIsolatedQueue\(\{[\s\S]*queueItems: isolatedQueueItems/);
  assert.match(source, /const isolatedQueueStripMarkup = !showingFocusedNote[\s\S]*renderGraphIsolatedQueueStrip\(\{/);
  assert.match(source, /renderGraphIsolatedQueueStrip\(\{[\s\S]*queueItems: isolatedQueueItems/);
  assert.match(source, /renderGraphVisualMap\(\{[\s\S]*isolatedQueueStripMarkup/);
  assert.match(source, /renderGraphWorkbenchPanel\(\{[\s\S]*isolatedQueueMarkup/);
  assert.match(source, /function renderGraphWorkbenchPanel\(\{ clueSummary = \{\}, questionSummary = \{\}, clueSectionsMarkup = "", thinkingItems = \[\], isolatedQueueMarkup = "" \} = \{\}\) \{/);

  assert.match(html, /\.graph-isolated-queue-strip \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto auto;/);
  assert.match(html, /\.graph-isolated-queue \{[\s\S]*display: grid;[\s\S]*border: 1px solid #dbe7ef;/);
  assert.match(html, /\.graph-isolated-queue-item \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*min-height: 58px;/);
  assert.match(html, /\.graph-isolated-queue-item\.is-current \{[\s\S]*box-shadow: inset 4px 0 0 rgba\(217, 119, 6, 0\.65\);/);
  assert.match(html, /\.graph-isolated-queue-main:hover,[\s\S]*\.graph-isolated-queue-main:focus-visible \{/);
});

test("graph isolated workspace offers non-AI relation candidates from tags and titles", () => {
  const source = readPrototypeApp();
  const joinFlowStart = source.indexOf('function renderGraphIsolatedJoinNetworkFlow(noteId = "", { nodeMap = new Map(), edges = [], visibleEdgeCount = 0 } = {}) {');
  const joinFlowEnd = source.indexOf('function renderGraphIsolatedSelectionPanel(', joinFlowStart);
  assert.ok(joinFlowStart >= 0 && joinFlowEnd > joinFlowStart, "expected renderGraphIsolatedJoinNetworkFlow() to exist");
  const joinFlowSource = source.slice(joinFlowStart, joinFlowEnd);
  const isolatedSelectionStart = source.indexOf('function renderGraphIsolatedSelectionPanel({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) {');
  const isolatedSelectionEnd = source.indexOf('function renderGraphBridgeSelectionPanel(', isolatedSelectionStart);
  assert.ok(isolatedSelectionStart >= 0 && isolatedSelectionEnd > isolatedSelectionStart, "expected renderGraphIsolatedSelectionPanel() to exist");
  const isolatedSelectionSource = source.slice(isolatedSelectionStart, isolatedSelectionEnd);

  assert.match(source, /function graphLocalRelationCandidatesForNote\(noteId = "", \{ nodeMap = new Map\(\), edges = \[\], limit = 5 \} = \{\}\) \{/);
  assert.match(source, /const connectedIds = new Set\(/);
  assert.match(source, /graphTitleCharacterOverlap\(sourceTitle, targetTitle\)/);
  assert.match(source, /renderGraphRelationCandidateCards\(localCandidates/);
  assert.match(source, /data-graph-relation-candidate-apply/);
  assert.match(source, /const graphRelationCandidateButton = event\.target\.closest\("\[data-graph-relation-candidate-apply\]"\);/);
  assert.match(source, /openGraphCandidateRelation\(graphRelationCandidateButton\);/);
  assert.match(joinFlowSource, /const candidateHint = candidatePreview/);
  assert.doesNotMatch(joinFlowSource, /renderGraphRelationCandidateCards\(localCandidates/);
  assert.match(isolatedSelectionSource, /<strong>别急着连线<\/strong>/);
  assert.match(isolatedSelectionSource, /title: "现有关联与候选"/);
  assert.doesNotMatch(isolatedSelectionSource, /孤立笔记接入网络/);
});

test("graph relation candidates explain reason, possible relation, and review question", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphCandidateReviewRows\(candidate = \{\}, \{ aiCandidate = true \} = \{\}\) \{/);
  assert.match(source, /<span>推荐原因<\/span>/);
  assert.match(source, /<span>可能关系<\/span>/);
  assert.match(source, /<span>复核问题<\/span>/);
  assert.match(source, /graphCandidateRelationReviewQuestion\(candidate\)/);
  assert.match(source, /renderGraphCandidateReviewRows\(candidate\)/);
  assert.match(source, /renderGraphCandidateReviewRows\(candidate, \{ aiCandidate: false \}\)/);
  assert.match(html, /\.graph-candidate-review \{[\s\S]*display: grid;[\s\S]*gap: 6px;/);
});

test("isolated note panel gives a continuous next step after confirming a relation", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphIsolatedNextStepActions\(noteId = "", \{ isolatedNotes = \[\], nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.match(source, /<strong>确认关系后继续<\/strong>/);
  assert.match(source, /处理下一条/);
  assert.match(source, /看当前周边/);
  assert.match(source, /创建主题笔记/);
  assert.match(source, /const canCreateTheme = directEdges\.length > 0 && themeNoteIds\.length >= 2;/);
  assert.match(source, /renderGraphIsolatedNextStepActions\(noteId, \{ isolatedNotes, nodeMap, edges \}\)/);
  assert.match(html, /\.graph-isolated-next-step \{[\s\S]*border: 1px solid #cfe4d9;/);
});

test("graph node selection summarizes position, relation quality, and next action", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function graphNodeInsightMeta\(node = \{\}, directEdges = \[\], \{ nodeMap = new Map\(\), edges = \[\] \} = \{\}\) \{/);
  assert.match(source, /function renderGraphNodeInsightPanel\(insight = \{\}\) \{/);
  assert.match(source, /这条笔记的位置/);
  assert.match(source, /关系质量/);
  assert.match(source, /下一步/);
  assert.match(source, /const insight = graphNodeInsightMeta\(node, directEdges, \{ nodeMap, edges \}\);/);
  assert.match(source, /renderGraphNodeInsightPanel\(insight\)/);
  assert.match(html, /\.graph-node-insight \{[\s\S]*display: grid;[\s\S]*border: 1px solid #d8e7ef;/);
});

test("graph relation workspace combines AI candidates, manual relation management, and theme index creation", () => {
  const source = readPrototypeApp();
  const html = readPrototypeHtml();

  assert.match(source, /function renderGraphRelationWorkspaceForNote\(noteId = "", \{ nodeMap = new Map\(\), edges = \[\], title = "关联整理" \} = \{\}\) \{/);
  assert.match(source, /graphAiRelationCandidatesForNote\(cleanNoteId, \{ nodeMap, edges, limit: 5 \}\)/);
  assert.match(source, /graphAiRelationCandidatesForNote\(cleanNoteId, \{ nodeMap, edges, limit: 3 \}\)/);
  assert.match(source, /data-graph-select-edge="\$\{escapeHtml\(edgeKey\)\}"/);
  assert.match(source, /data-graph-create-theme-index/);
  assert.match(source, /function renderGraphThemeIndexWorkspace\(noteIds = \[\], \{ title = "主题候选", relationCount = 0, tone = "" \} = \{\}\) \{/);
  assert.match(source, /async function createGraphThemeIndexFromNoteIds\(noteIds = \[\], \{ title = "", source = "graph-theme-index" \} = \{\}\) \{/);
  assert.match(source, /createIndexCard\(\{/);
  assert.match(source, /centralQuestion: "这组笔记共同回答什么问题？"/);
  assert.match(source, /const writingEligibleIds = eligibleIds\.filter\(\(id\) => isWritingEligibleNote\(writingKnownNoteById\(id\)\)\);/);
  assert.match(source, /if \(writingEligibleIds\.length >= 2\) \{[\s\S]*continueWritingEntry\(writingEligibleIds,/);
  assert.match(source, /workflowRoute: \{[\s\S]*focus: "writing"[\s\S]*indexCardId: card\.id[\s\S]*basketNoteIds: eligibleIds\.join\(","\)/);
  assert.match(source, /const graphThemeIndexButton = event\.target\.closest\("\[data-graph-create-theme-index\]"\);/);
  assert.match(source, /createThemeIndexFromNoteIds: createGraphThemeIndexFromNoteIds/);
  assert.match(source, /focus === "writing"/);
  assert.match(source, /await selectWritingThemeIndex\(indexCardId\)/);
  assert.match(source, /basketNoteIds: String\(item\.workflowRoute\.basketNoteIds/);

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
  assert.match(handler, /openGraphAiCandidateRelation\(graphAiCandidateButton\);/);
  assert.match(handler, /const graphAiRefineConfirmButton = event\.target\.closest\("\[data-graph-ai-refine-confirm\]"\);/);
  assert.match(handler, /await confirmGraphPotentialRelationRefine\(graphAiRefineConfirmButton\);/);
  assert.match(handler, /const graphAiRefineRetryButton = event\.target\.closest\("\[data-graph-ai-refine-retry\]"\);/);
  assert.match(handler, /await retryGraphPotentialRelationRefine\(graphAiRefineRetryButton\);/);
  assert.match(handler, /const graphThemeIndexButton = event\.target\.closest\("\[data-graph-create-theme-index\]"\);/);
  assert.match(handler, /await createGraphThemeIndexFromButton\(graphThemeIndexButton\);/);
  assert.match(handler, /const isolatedAction = event\.target\.closest\("\[data-graph-isolated-action\]"\);/);
  assert.match(handler, /const relationAdjustment = event\.target\.closest\("\[data-graph-relation-adjustment\]"\);/);
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
  assert.match(graphSidebarBranch, /孤立笔记会在这里用警示色提醒，点进来就能关联一条笔记。/);
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
