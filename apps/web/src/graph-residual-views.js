import { createGraphIsolatedWorkspaceRuntime } from "./graph-isolated-workspace-runtime.js";
import { createGraphRelationWorkspaceRuntime } from "./graph-relation-workspace-runtime.js";
import { createGraphSelectionResidualView } from "./graph-selection-residual-view.js";
import { createGraphThinkingPanelResidualView } from "./graph-thinking-panel-residual-view.js";

export function createGraphResidualViews(deps = {}) {
  const {
    $, addSystemMessage, analyzeDirectoryGraph, descendantDirectoryIds,
    GRAPH_CONFLICT_RELATION_TYPES, GRAPH_INDEX_RELATION_TYPES, GRAPH_LINK_CLUE_RELATION_TYPES, GRAPH_MEANINGFUL_RELATION_TYPES,
    GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID, GRAPH_RELATION_GROUP_META, GRAPH_RELATION_MARKER_COLORS, GRAPH_VISUAL_ZOOM_OPTIONS,
    applyGraphEdgeHoverDomState, applyGraphNodeHoverDomState, applyGraphThinkingHoverDomState,
    graphBuildFocusedRelationTypeStatsForRuntime, graphBuildVisualLayoutForRuntime, graphDenseGalaxyMode,
    graphEdgePathForRuntime, graphEdgeShouldRenderForRuntime, graphEdgeVisibleAtFitForRuntime,
    graphFocusContextModeMeta, graphFocusDepthMeta, graphFocusedItemsForRuntime, graphHash, graphLoadedScopeCoversDirectoryForRuntime,
    graphReadingModeMeta, graphScopedItemsForRuntime, graphScopeDirectoryIdForRuntime,
    graphNodeAttentionReasons, graphNodeClass, graphNodeRadiusByTier, graphNodeShowsAsPoint, graphNodeStarTier,
    graphNotePreviewTextForLocalRelation, graphNoteTagsForLocalRelation, graphShortTitle, graphThemeBoundaryMetaForRuntime,
    graphViewModeForRelationType, graphZoomOption, normalizeGraphFocusDepth,
    computeGraphAiRelationCandidatesForNote,
    computeGraphBlockedAiRelationPairKeysForNote,
    computeGraphCandidateBlocksFormalRelation,
    computeGraphCandidateCanSaveRelation,
    computeGraphCandidateCountKey,
    computeGraphCandidateEndpointIds,
    computeGraphCandidateUndirectedPairKey,
    computeGraphDecoratePotentialRelationCandidate,
    computeGraphMergeRelationCandidatesForDisplay,
    computeGraphLocalRelationCandidatesForNote,
    computeGraphPotentialRelationActionEndpoints,
    computeGraphPotentialRelationEvidenceText,
    computeGraphPotentialRelationRationaleDraft,
    computeGraphPreferredPotentialRelationType,
    computeGraphReadingLensMeta,
    computeGraphRelationCandidateKey,
    computeGraphDirectNetworkEdgeCount,
    computeGraphExistingRelationKeys,
    computeGraphExistingRelationPairKeys,
    computeGraphFocusCardActionMeta,
    computeGraphRelationPairKey,
    computeGraphRelationRationaleIsActionable,
    computeGraphRelationStatusCountsAsNetworkEdge,
    computeGraphRelationStatusKey,
    computeGraphTitleCharacterOverlap,
    createGraphAiConnectRuntimeController,
    createGraphIsolatedWorkflowShellRenderer,
    createGraphReadingLensStateController,
    createGraphRelationSaveController,
    createGraphRelationWorkflowController,
    createGraphVisualMapController,
    createGraphVisualMapPrototypeDepsProvider,
    escapeHtml,
    ensureGraphLocalAiReadyForAnalysis,
    isDirectoryUnderOriginalRoot,
    graphBridgeSelectionKey,
    graphEdgeSelectionKey,
    graphFilterOptionsForRuntime,
    graphFullNoteByIdFromSources,
    graphIsolatedPreviewTargetForNote,
    graphIsolatedSelectionKey,
    graphNodeStarRank,
    graphNormalizeRelationWorkflowSelection,
    graphRelationGroupMeta,
    graphRelationSourceLabel,
    graphRelationStatusLabel,
    graphRelationSaveResultForNote,
    graphRelationTypeLabel,
    graphRelationVisual,
    graphState,
    graphStructureFallbackEdgesForRuntime,
    graphThemeNoteIds,
    graphThemeSelectionKey,
    normalizeGraphRelationTypeFilter,
    noteTypeLabel,
    renderGraphIconView,
    renderGraphReadingLensControlsView,
    renderGraphRelationTypeFilterForRuntime,
    renderGraphResearchNavigatorEntryView,
    renderGraphSelectionMetricsView,
    renderGraphSelectionShellView,
    renderGraphStarfieldView,
    renderGraphNebulaFieldView,
    renderGraphClusterGlowView,
    renderGraphFocusContextPanelView,
    renderGraphThemeBoundaryForRuntime,
    renderGraphViewModeSwitcherForRuntime,
    renderGraphWorkbenchEntryPillsView,
    renderGraphPanel,
    resetGraphHoverDomState,
    refinePotentialRelationCandidate,
    parseTags,
    setStatus,
    shouldShowGraphDensityHint,
    state,
    suggestedThemeIndexTitle,
    titleFromBody,
    uniqueStrings,
    writeStoredText,
    setGraphFocusContextModeForRuntime,
    setGraphFocusDepthForRuntime
  } = deps;

function graphResidualRuntimeDeps(overrides = {}) {
  return {
    ...deps,
    escapeHtml, GRAPH_CONFIRMABLE_RELATION_TYPES, GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES,
    graphState, state, noteTypeLabel, renderGraphIcon, graphNodeTitle,
    graphEdgeSelectionKey, graphRelationGroupMeta, graphRelationSourceLabel, graphRelationStatusLabel,
    graphRelationTypeLabel, graphRelationVisual, graphThemeSelectionKey, graphIsolatedSelectionKey,
    graphBridgeSelectionKey, suggestedThemeIndexTitle, titleFromBody, uniqueStrings, writeStoredText,
    ...overrides
  };
}

function renderGraphIcon(...args) { return renderGraphIconView(...args); }

function setGraphFocusDepth(value = "", options = {}) {
  return setGraphFocusDepthForRuntime(graphState, value, {
    ...options,
    writeStoredText
  });
}

function setGraphFocusContextMode(value = "", options = {}) {
  return setGraphFocusContextModeForRuntime(graphState, value, {
    ...options,
    writeStoredText
  });
}

function renderGraphOrientation({ nodes = [], edges = [], supportingCount = 0, conflictCount = 0, bridgeGapCount = 0 } = {}) {
  return `
    <section class="graph-orientation" aria-label="图谱读法">
      <div class="graph-orientation-main">
        <strong>这张图谱帮你判断：这组永久笔记能不能形成一个清楚观点</strong>
        <span>每个点是一条永久笔记，每条线是一条正式关系。先看哪些笔记在支撑，哪里有反方、边界或缺少连接。下面这组数字按当前目录的全部关系统计，不受上方筛选影响。</span>
      </div>
      <div class="graph-read-steps">
        <span>1 找中心观点</span>
        <span>2 看证据链</span>
        <span>3 查反方和边界</span>
        <span>4 补缺少的连接</span>
      </div>
      <div class="graph-relation-legend" aria-label="关系类型说明">
        <span><strong>支持</strong> 形成证据链</span>
        <span><strong>反方</strong> 保留不同看法</span>
        <span><strong>限定</strong> 收束边界条件</span>
        <span><strong>连接</strong> 补上过渡思路</span>
      </div>
      <div class="graph-orientation-metrics">
        <span>笔记 ${Number(nodes.length || 0)} 条</span>
        <span>总关系 ${Number(edges.length || 0)}</span>
        <span>${Number(supportingCount || 0)} 条支持</span>
        <span>${Number(conflictCount || 0)} 条冲突</span>
        <span>${Number(bridgeGapCount || 0)} 个缺口</span>
      </div>
    </section>
  `;
}

function graphNodeTitle(nodeMap, id, fallback = "未命名笔记") {
  const key = String(id || "").trim();
  const node = key ? nodeMap.get(key) : null;
  const knownNote = key ? state.notes.find((note) => String(note?.id || "").trim() === key) : null;
  return String(node?.title || node?.label || node?.name || knownNote?.title || key || fallback).trim() || fallback;
}

function graphEdgeTitle(edge = {}, nodeMap = new Map()) {
  const sourceTitle = edge.fromTitle || graphNodeTitle(nodeMap, edge.fromNoteId, "源笔记");
  const targetTitle = edge.toTitle || graphNodeTitle(nodeMap, edge.toNoteId, "目标笔记");
  return `${sourceTitle} → ${targetTitle}`;
}

function buildGraphInsightCoach({ nodes = [], edges = [], conflictItems = [], bridgeGaps = [], untypedRelations = [] } = {}) {
  const nodeMap = new Map();
  nodes.forEach((node) => {
    const id = String(node?.id || "").trim();
    if (id) nodeMap.set(id, node);
  });

  const degreeMap = new Map(nodes.map((node) => [String(node?.id || ""), 0]));
  edges.forEach((edge) => {
    const fromId = String(edge?.fromNoteId || "").trim();
    const toId = String(edge?.toNoteId || "").trim();
    if (fromId) degreeMap.set(fromId, (degreeMap.get(fromId) || 0) + 1);
    if (toId) degreeMap.set(toId, (degreeMap.get(toId) || 0) + 1);
  });

  const central = [...nodeMap.values()]
    .map((node) => ({ node, degree: degreeMap.get(String(node.id || "")) || 0 }))
    .sort((a, b) => b.degree - a.degree || String(a.node.title || "").localeCompare(String(b.node.title || ""), "zh-Hans-CN"))[0];
  const centralId = central?.node?.id || "";
  const centralTitle = graphNodeTitle(nodeMap, centralId, "当前主题");
  const isCentralEdge = (edge) => edge?.fromNoteId === centralId || edge?.toNoteId === centralId;
  const edgeType = (edge) => String(edge?.relationType || "associated_with").trim().toLowerCase();
  const supports = edges.filter((edge) => ["supports", "complements", "extends", "example_of"].includes(edgeType(edge)));
  const tensions = edges.filter((edge) => GRAPH_CONFLICT_RELATION_TYPES.has(edgeType(edge)));
  const bridges = edges.filter((edge) => ["bridges", "unexpected_connection", "reframes"].includes(edgeType(edge)));
  const flows = edges.filter((edge) => ["precedes", "follows", "appears_in_draft"].includes(edgeType(edge)));
  const nearestSupport = supports.find(isCentralEdge) || supports[0] || null;
  const nearestTension = tensions.find(isCentralEdge) || tensions[0] || null;
  const nearestBridge = bridges.find(isCentralEdge) || bridges[0] || flows.find(isCentralEdge) || flows[0] || null;
  const pathEdges = [nearestSupport, nearestTension, nearestBridge].filter(Boolean);
  const uniquePathEdges = pathEdges.filter((edge, index) => pathEdges.findIndex((item) => item.fromNoteId === edge.fromNoteId && item.toNoteId === edge.toNoteId) === index);

  const headline = !nodes.length
    ? "还没有足够笔记形成图谱判断。"
    : !edges.length
      ? "这组笔记还没有连成可读结构。"
      : `这组笔记正在围绕「${centralTitle}」形成论证。`;
  const thesis = !nodes.length
    ? "先写几条永久笔记，再用关系把观点连接起来。"
    : !edges.length
      ? bridgeGaps.length
        ? `当前至少还有 ${bridgeGaps.length} 个缺少连接的地方。先把待关联笔记或断开的主题群连回主结构，再谈图谱阅读和写作路径。`
        : "当前还没有明确关系，先把两条笔记之间的支持、限定、反驳或桥接写出来。"
    : tensions.length || conflictItems.length
      ? `它不只是收集相近观点，还保留了 ${tensions.length + conflictItems.length} 个反方或边界信号，适合继续追问“这个判断在什么条件下不成立”。`
      : bridges.length || bridgeGaps.length
        ? `它已经有中心和支撑，但还需要补上 ${bridges.length + bridgeGaps.length} 个过渡连接，让读者能顺着思路走下去。`
        : supports.length
          ? "它已经开始形成证据链，可以把中心观点、支撑笔记和例外条件整理成写作提纲。"
          : "它目前更像主题集合，还需要把相邻笔记写成明确的支持、限定或反驳关系。";

  const prompts = !edges.length
    ? [
        nodes.length > 1 ? "这几条笔记之间最缺的那一步过渡判断是什么？" : "再补一条相关永久笔记，图谱才会开始形成结构。",
        bridgeGaps.length ? `先从 ${bridgeGaps[0]?.noteTitles?.[0] || "当前待关联笔记"} 开始，给它补一条能回到主结构的桥接关系。` : "先挑两条笔记，写出明确的支持、限定或反驳关系。",
        "桥接写清后，再回来看哪些关系说明还偏薄。"
      ]
    : [
        central?.degree ? `为什么「${centralTitle}」会成为连接最多的笔记？它是主题，还是只是材料中转站？` : "哪一条笔记最像这组材料的中心判断？",
        nearestTension ? `「${graphEdgeTitle(nearestTension, nodeMap)}」这条张力能不能变成文章里的反方段落？` : "有没有一条笔记能反驳或限定当前中心观点？",
        untypedRelations.length ? `${untypedRelations.length} 条关系还缺说明，先补一句“为什么相关”，洞见会更容易浮出来。` : "关系说明已经较清楚，可以开始挑一条阅读路径进入写作中心。"
      ];

  return {
    headline,
    thesis,
    central,
    pathEdges: uniquePathEdges,
    prompts,
    nodeMap
  };
}

function renderGraphInsightCoach(context = {}) {
  const insight = buildGraphInsightCoach(context);
  const pathMarkup = insight.pathEdges.length
    ? insight.pathEdges
        .map((edge, index) => {
          const relation = graphRelationTypeLabel(edge.relationType);
          return `
            <button class="graph-insight-path-item" type="button" ${graphSelectEdgeActionAttrs(edge)}>
              <span>${index + 1}</span>
              <strong>${escapeHtml(graphEdgeTitle(edge, insight.nodeMap))}</strong>
              <small>${escapeHtml(relation)}${edge.rationale ? ` · ${escapeHtml(edge.rationale)}` : ""}</small>
            </button>
          `;
        })
        .join("")
    : `<div class="graph-insight-empty">还没有可顺读路径。先补几条支持、反驳、限定或桥接关系。</div>`;
  return `
    <section class="graph-insight-coach" aria-label="图谱洞见建议">
      <div class="graph-insight-main">
        <span>图谱洞见</span>
        <strong>${escapeHtml(insight.headline)}</strong>
        <small>${escapeHtml(insight.thesis)}</small>
      </div>
      <div class="graph-insight-prompts" aria-label="可追问的问题">
        ${insight.prompts.map((prompt) => `<span>${escapeHtml(prompt)}</span>`).join("")}
      </div>
      <div class="graph-insight-path" aria-label="推荐阅读路径">
        <div class="graph-insight-path-head">
          <strong>推荐顺读路径</strong>
          <small>从中心、支撑、张力或桥接关系里挑一条线读下去</small>
        </div>
        ${pathMarkup}
      </div>
    </section>
  `;
}

function renderGraphBridgeGapSection(bridgeGaps = [], options = {}) {
  const items = Array.isArray(bridgeGaps) ? bridgeGaps.filter((item) => Array.isArray(item?.noteIds) && item.noteIds.length) : [];
  if (!items.length) return "";
  const open = options.open === true;
  return `
      <details class="graph-section graph-collapsible-section graph-bridge-gap-section" data-graph-section="bridge-gaps"${open ? " open" : ""}>
        <summary class="graph-collapsible-summary">
          <div>
            <div class="graph-section-title">潜在关联</div>
            <div class="graph-section-note">这里收的是还没连成清楚关系、但很值得补上的连接。点开后可以直接回到笔记补关联。</div>
          </div>
          <span class="graph-collapsible-badge">${items.length} 条</span>
        </summary>
        <div class="graph-collapsible-body">
          <div class="graph-list">
            ${items
              .map((gap) => {
                const sourceNoteId = String(gap?.noteIds?.[0] || "").trim();
                const sourceTitle = String(gap?.noteTitles?.[0] || sourceNoteId || "当前笔记").trim() || "当前笔记";
                const targetNoteId = String(gap?.targetNoteIds?.[0] || "").trim();
                const targetTitle = String(gap?.targetNoteTitles?.[0] || targetNoteId || "").trim();
                const gapType = String(gap?.gapType || "bridge_gap").trim().toLowerCase();
                const counterpartSummary = targetTitle
                  ? `建议先把它和「${targetTitle}」补上一条说得清理由的关联。`
                  : "它现在还挂在主结构外面，先补一条能把它带回来的关联。";
                const rationale = graphLocalizedActionText(gap?.suggestedAction || gap?.rationale, counterpartSummary);
                const metaLabel = gapType === "disconnected_cluster" ? "断开的主题群" : "待关联笔记";
                const highlightNodeIds = [sourceNoteId, targetNoteId].filter(Boolean).join(",");
                return `
                  <div class="graph-focus-card graph-bridge-gap-card" data-graph-bridge-gap-id="${escapeHtml(String(gap?.id || sourceNoteId || "").trim())}" data-graph-thinking-highlight="true" data-graph-thinking-node-ids="${escapeHtml(highlightNodeIds)}" data-graph-thinking-title="${escapeHtml(sourceTitle)}" data-graph-thinking-kicker="潜在关联" data-graph-thinking-detail="${escapeHtml(rationale || counterpartSummary)}">
                    <button class="graph-focus-card-main" type="button" data-open-note="${escapeHtml(sourceNoteId)}">
                      <strong>${escapeHtml(sourceTitle)}</strong>
                      <span>${escapeHtml(metaLabel)} · 潜在关联</span>
                      <small>${escapeHtml(rationale || counterpartSummary)}</small>
                    </button>
                    <button class="graph-focus-card-action" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(sourceNoteId)}"${targetNoteId ? ` data-graph-target-note="${escapeHtml(targetNoteId)}"` : ""} data-graph-relation-type="bridges">去补关联</button>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </details>
  `;
}

function graphWeakRelationClues(edges = [], limit = 6) {
  return (Array.isArray(edges) ? edges : [])
    .filter((edge) => GRAPH_LINK_CLUE_RELATION_TYPES.has(String(edge?.relationType || "associated_with").trim().toLowerCase()))
    .slice(0, limit);
}

function renderGraphWeakRelationClueSection(edges = [], options = {}) {
  const items = graphWeakRelationClues(edges, 6);
  if (!items.length) return "";
  const open = options.open === true;
  return `
      <details class="graph-section graph-collapsible-section graph-weak-relation-section" data-graph-section="weak-relations"${open ? " open" : ""}>
        <summary class="graph-collapsible-summary">
          <div>
            <div class="graph-section-title">待判断关联</div>
            <div class="graph-section-note">这些线已经连上，但语义还偏弱。先判断它该强化为论证关系，还是降级为普通线索。</div>
          </div>
          <span class="graph-collapsible-badge">${items.length} 条</span>
        </summary>
        <div class="graph-collapsible-body">
          <div class="graph-list">
            ${items
              .map((edge) => {
                const sourceNoteId = String(edge?.fromNoteId || "").trim();
                const targetNoteId = String(edge?.toNoteId || "").trim();
                const sourceTitle = String(edge?.fromTitle || sourceNoteId || "源笔记").trim() || "源笔记";
                const targetTitle = String(edge?.toTitle || targetNoteId || "目标笔记").trim() || "目标笔记";
                const relationLabel = graphRelationTypeLabel(edge?.relationType);
                const rationale = String(edge?.rationale || "").trim();
                const edgeKey = graphEdgeSelectionKey(edge);
                return `
                  <div class="graph-focus-card graph-weak-relation-card" data-graph-thinking-highlight="true" data-graph-thinking-node-ids="${escapeHtml([sourceNoteId, targetNoteId].filter(Boolean).join(","))}" data-graph-thinking-edge-key="${escapeHtml(edgeKey)}" data-graph-thinking-edge-id="${escapeHtml(String(edge?.id || "").trim())}" data-graph-thinking-edge-from="${escapeHtml(sourceNoteId)}" data-graph-thinking-edge-to="${escapeHtml(targetNoteId)}" data-graph-thinking-edge-type="${escapeHtml(String(edge?.relationType || "").trim().toLowerCase())}" data-graph-thinking-title="${escapeHtml(sourceTitle)} → ${escapeHtml(targetTitle)}" data-graph-thinking-kicker="待判断关联" data-graph-thinking-detail="${escapeHtml(rationale || relationLabel)}">
                    <button class="graph-focus-card-main" type="button" ${graphSelectEdgeActionAttrs(edge)}>
                      <strong>${escapeHtml(sourceTitle)} → ${escapeHtml(targetTitle)}</strong>
                      <span>${escapeHtml(relationLabel)} · 需要判断</span>
                      <small>${escapeHtml(rationale || "这条关系还没有形成清楚论证，需要判断是否值得保留或改类型。")}</small>
                    </button>
                    <button class="graph-focus-card-action" type="button" ${graphSelectEdgeActionAttrs(edge)}>复核</button>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </details>
  `;
}

function graphRelationFilterOptionsDepsForRuntime() {
  return {
    escapeHtml,
    normalizeGraphRelationTypeFilter,
    graphRelationGroupMeta,
    GRAPH_RELATION_GROUP_META,
    GRAPH_MEANINGFUL_RELATION_TYPES,
    GRAPH_INDEX_RELATION_TYPES,
    GRAPH_LINK_CLUE_RELATION_TYPES
  };
}

function graphFilterOptions(edges, field, selected, allLabel, labelFn, statsOverride = null) {
  return graphFilterOptionsForRuntime(edges, field, selected, allLabel, labelFn, statsOverride, graphRelationFilterOptionsDepsForRuntime());
}

const renderGraphViewModeSwitcher = (relationType = "meaningful") =>
  renderGraphViewModeSwitcherForRuntime(relationType, { escapeHtml });

const renderGraphRelationTypeFilter = (edges = [], selected = "meaningful", compact = false, statsOverride = null) =>
  renderGraphRelationTypeFilterForRuntime(edges, selected, compact, statsOverride, {
    escapeHtml,
    graphFilterOptions,
    graphRelationTypeLabel
  });

const graphStructureFallbackEdges = (edges = [], filters = {}) =>
  graphStructureFallbackEdgesForRuntime(edges, filters, { graphEdgeMatchesFilters });

function graphLocalizedActionText(value = "", fallback = "") {
  const text = String(value || "").trim();
  const defaultText = String(fallback || "").trim();
  if (!text) return defaultText;
  if (/Add an intermediate note or an explicit relation/i.test(text)) {
    return "补一条中间判断，或关联一条能说清理由的笔记，把它接回现有论证。";
  }
  if (/Add a bridge note or an explicit relation/i.test(text)) {
    return "补一条桥接笔记，或关联一条能把这个主题群接回主结构的笔记。";
  }
  if (/isolated from the rest/i.test(text)) {
    return "这条笔记暂时游离在当前图谱之外，需要判断是保留独立，还是关联到另一条笔记。";
  }
  if (/disconnected from the main note cluster/i.test(text)) {
    return "这个主题群暂时没有接回主结构，需要判断是否关联一条桥接笔记。";
  }
  if (/[A-Za-z]/.test(text) && !/[\u4e00-\u9fff]/.test(text)) {
    return defaultText || "这里需要补一句中文判断，再决定是否建立关系。";
  }
  return text;
}

function graphReadingLensMeta(value = "insight") {
  return computeGraphReadingLensMeta(value);
}

function renderGraphReadingLensControls(activeLens = "insight", legendOpen = false, trailingMarkup = "") {
  return renderGraphReadingLensControlsView(activeLens, legendOpen, trailingMarkup, { escapeHtml });
}
const GRAPH_WORKBENCH_TAB_META = {
  clues: {
    key: "clues",
    label: "关系待办",
    emptyLabel: "暂无关系待办",
    panelTitle: "关系待办",
    statusLabel: "关系待办",
    note: "优先处理待关联笔记、缺少连接和关系说明太薄的地方。"
  },
  questions: {
    key: "questions",
    label: "思考问题",
    emptyLabel: "暂无思考问题",
    panelTitle: "思考问题",
    statusLabel: "思考问题",
    note: "把值得继续追问的主题、冲突和边界放在这里。"
  }
};

function graphWorkbenchTabMeta(value = "clues") {
  const key = String(value || "clues").trim().toLowerCase();
  return GRAPH_WORKBENCH_TAB_META[key] || GRAPH_WORKBENCH_TAB_META.clues;
}

function graphClueSummaryState({ bridgeGapCount = 0, weakRelationCount = 0, reviewQueue = null, nodes = null, edges = null } = {}) {
  const reviewCount = Number(reviewQueue?.total || 0);
  const aiState = graphAiAnalysisSummaryState({ nodes, edges });
  const categories = [
    { key: "bridge", label: "缺少连接", count: Number(bridgeGapCount || 0) },
    { key: "weak", label: "关系待确认", count: Number(weakRelationCount || 0) },
    { key: "review", label: "理由待补", count: reviewCount },
    { key: "ai", label: "AI 建议", count: Number(aiState.totalCandidates || 0) }
  ].filter((item) => Number(item.count || 0) > 0);
  const total = categories.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const detail = categories.length
    ? categories
        .slice(0, 3)
        .map((item) => `${item.count} ${item.label}`)
        .join(" · ")
    : "当前范围暂时没有明显需要优先处理的关系。";
  return {
    total,
    label: total ? `${total} 项关系待处理` : "暂无待处理关系",
    detail: categories.length ? `建议先处理：${detail}` : detail,
    categories
  };
}

function renderGraphWorkbenchEntryPills({ clueSummary = null, questionSummary = null } = {}) {
  return renderGraphWorkbenchEntryPillsView({ clueSummary, questionSummary }, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}

function renderGraphResearchNavigatorEntry(open = false) {
  return renderGraphResearchNavigatorEntryView(open);
}

const graphReadingLensStateController = createGraphReadingLensStateController({
  graphReadingLensMeta,
  graphEdgeSelectionKey,
  graphRelationVisual,
  graphNodeStarRank
});
const graphEdgeMatchesReadingLens = graphReadingLensStateController.graphEdgeMatchesReadingLens;
const graphBuildReadingLensState = graphReadingLensStateController.graphBuildReadingLensState;

function graphLoadErrorMessage(error) {
  const code = String(error?.code || "").trim().toLowerCase();
  if (code === "request_timeout") {
    return "图谱读取超时，请重试；如果反复出现，检查本地 API 是否卡住。";
  }
  return String(error?.message || error || "图谱读取失败");
}

function renderGraphErrorState(message = "") {
  return `
    <div class="graph-empty graph-error-card">
      <strong>图谱暂时没有读出来</strong>
      <span>当前笔记树仍然可以浏览和编辑。等本地服务恢复后，可以再刷新图谱。</span>
      <div class="graph-empty-actions">
        <button class="mini-btn primary" type="button" data-graph-retry="refresh">刷新图谱</button>
      </div>
    </div>
  `;
}

function renderGraphInlineNotice({ tone = "info", title = "", message = "", retry = false } = {}) {
  const toneClass = tone === "warn" ? "is-warn" : "is-info";
  const safeTitle = String(title || "").trim() || "图谱状态";
  const safeMessage = String(message || "").trim();
  return `
    <div class="graph-inline-notice ${toneClass}">
      <div class="graph-inline-copy">
        <strong>${escapeHtml(safeTitle)}</strong>
        ${safeMessage ? `<span>${escapeHtml(safeMessage)}</span>` : ""}
      </div>
      ${
        retry
          ? `<div class="graph-empty-actions"><button class="mini-btn primary" type="button" data-graph-retry="refresh">刷新图谱</button></div>`
          : ""
      }
    </div>
  `;
}

function graphEdgeMatchesFilters(edge, filters = {}) {
  const type = String(edge?.relationType || "associated_with").trim().toLowerCase();
  const status = String(edge?.status || "confirmed").trim().toLowerCase();
  const filterType = String(filters.relationType || "all").trim().toLowerCase();
  const filterStatus = String(filters.status || "all").trim().toLowerCase();
  const typeMatches =
    filterType === "all"
      ? true
      : filterType === "meaningful"
        ? GRAPH_MEANINGFUL_RELATION_TYPES.has(type)
        : filterType === "index"
          ? GRAPH_INDEX_RELATION_TYPES.has(type)
        : filterType === "noisy"
          ? GRAPH_LINK_CLUE_RELATION_TYPES.has(type)
          : type === filterType;
  return typeMatches && (filterStatus === "all" || status === filterStatus);
}

function graphThemeTitleLooksGeneric(title = "") {
  const text = String(title || "").trim().toLowerCase();
  if (!text) return true;
  return [
    /^ai$/,
    /^notes?$/,
    /^permanent[-_\s]?notes?$/,
    /^knowledge[-_\s]?management$/,
    /^thinking$/,
    /^research$/,
    /^写作$/,
    /^思考$/,
    /^研究$/,
    /^笔记$/,
    /^永久笔记$/,
    /^知识管理$/,
    /^关联笔记$/,
    /^图谱$/
  ].some((pattern) => pattern.test(text));
}

function graphThemeBreadthMeta(topic = {}, { totalNodeCount = 0 } = {}) {
  const noteIds = graphThemeNoteIds(topic);
  const total = Math.max(0, Number(totalNodeCount || 0));
  const coverage = total ? noteIds.length / total : 0;
  const genericTitle = graphThemeTitleLooksGeneric(topic?.title);
  const wideByCount = noteIds.length >= Math.max(24, total * 0.45);
  const wideByCoverage = total >= 8 && coverage > 0.62;
  const genericWide = genericTitle && noteIds.length >= Math.max(8, total * 0.28);
  const broad = wideByCount || wideByCoverage || genericWide;
  return {
    noteIds,
    totalNodeCount: total,
    coverage,
    genericTitle,
    broad,
    reason: broad
      ? genericTitle
        ? "generic_title"
        : wideByCoverage
          ? "high_coverage"
          : "large_cluster"
      : ""
  };
}

function resolveGraphThemeSelection(selection = null, topicCandidates = []) {
  const topicKey = String(selection?.topicKey || selection?.themeKey || "").trim();
  const title = String(selection?.title || "").trim();
  const noteIds = Array.isArray(selection?.noteIds) ? selection.noteIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
  const topics = Array.isArray(topicCandidates) ? topicCandidates : [];
  const matchIndex = topics.findIndex((topic, index) => {
    if (topicKey && graphThemeSelectionKey(topic, index) === topicKey) return true;
    if (title && String(topic?.title || "").trim() === title) return true;
    const candidateNoteIds = graphThemeNoteIds(topic);
    return noteIds.length && candidateNoteIds.length && noteIds.every((id) => candidateNoteIds.includes(id));
  });
  if (matchIndex < 0) return null;
  const topic = topics[matchIndex] || {};
  const resolvedNoteIds = graphThemeNoteIds(topic);
  return {
    topic,
    topicIndex: matchIndex,
    topicKey: graphThemeSelectionKey(topic, matchIndex),
    title: String(topic?.title || "待验证主题").trim() || "待验证主题",
    noteIds: resolvedNoteIds
  };
}

function resolveGraphIsolatedSelection(selection = null, isolatedNotes = [], nodes = []) {
  const isolatedKey = String(selection?.isolatedKey || selection?.noteKey || "").trim();
  const noteId = String(selection?.noteId || selection?.id || "").trim();
  const title = String(selection?.title || "").trim();
  const items = Array.isArray(isolatedNotes) ? isolatedNotes : [];
  const matchIndex = items.findIndex((note, index) => {
    if (isolatedKey && graphIsolatedSelectionKey(note, index) === isolatedKey) return true;
    const candidateId = String(note?.noteId || note?.id || "").trim();
    if (noteId && candidateId === noteId) return true;
    return title && String(note?.title || "").trim() === title;
  });
  if (matchIndex >= 0) {
    const note = items[matchIndex] || {};
    const resolvedNoteId = String(note?.noteId || note?.id || noteId || "").trim();
    return {
      item: note,
      isolatedIndex: matchIndex,
      isolatedKey: graphIsolatedSelectionKey(note, matchIndex),
      noteId: resolvedNoteId,
      title: String(note?.title || resolvedNoteId || "待关联笔记").trim() || "待关联笔记"
    };
  }
  if (noteId && nodes.some((node) => String(node?.id || "").trim() === noteId)) {
    const node = nodes.find((item) => String(item?.id || "").trim() === noteId) || {};
    return {
      item: node,
      isolatedIndex: -1,
      isolatedKey: noteId,
      noteId,
      title: String(node?.title || noteId || "待关联笔记").trim() || "待关联笔记"
    };
  }
  return null;
}

function resolveGraphBridgeSelection(selection = null, bridgeGaps = [], nodes = []) {
  const bridgeKey = String(selection?.bridgeKey || "").trim();
  const noteId = String(selection?.noteId || selection?.sourceNoteId || "").trim();
  const targetNoteId = String(selection?.targetNoteId || "").trim();
  const items = Array.isArray(bridgeGaps) ? bridgeGaps : [];
  const matchIndex = items.findIndex((gap, index) => {
    if (bridgeKey && graphBridgeSelectionKey(gap, index) === bridgeKey) return true;
    const sourceId = String(gap?.noteIds?.[0] || "").trim();
    const candidateTargetId = String(gap?.targetNoteIds?.[0] || "").trim();
    if (noteId && sourceId === noteId && (!targetNoteId || candidateTargetId === targetNoteId)) return true;
    return false;
  });
  if (matchIndex < 0) return null;
  const gap = items[matchIndex] || {};
  const sourceId = String(gap?.noteIds?.[0] || noteId || "").trim();
  if (!sourceId) return null;
  const candidateTargetId = String(gap?.targetNoteIds?.[0] || targetNoteId || "").trim();
  const nodeMap = new Map((Array.isArray(nodes) ? nodes : []).map((node) => [String(node?.id || "").trim(), node]).filter(([id]) => id));
  return {
    item: gap,
    bridgeIndex: matchIndex,
    bridgeKey: graphBridgeSelectionKey(gap, matchIndex),
    noteId: sourceId,
    targetNoteId: candidateTargetId,
    title: String(gap?.noteTitles?.[0] || nodeMap.get(sourceId)?.title || sourceId || "缺少连接").trim() || "缺少连接",
    targetTitle: String(gap?.targetNoteTitles?.[0] || nodeMap.get(candidateTargetId)?.title || candidateTargetId || "").trim(),
    gapType: String(gap?.gapType || "bridge_gap").trim().toLowerCase()
  };
}

function graphBuildIsolatedVisualNodes({ isolatedNotes = [], allNodes = [], currentNodes = [], limit = 12 } = {}) {
  const scopedNodeMap = new Map(
    (Array.isArray(allNodes) ? allNodes : [])
      .map((node) => [String(node?.id || "").trim(), node])
      .filter(([id]) => id)
  );
  const usedIds = new Set((Array.isArray(currentNodes) ? currentNodes : []).map((node) => String(node?.id || "").trim()).filter(Boolean));
  const visualNodes = [];
  (Array.isArray(isolatedNotes) ? isolatedNotes : []).forEach((item, index) => {
    if (visualNodes.length >= limit) return;
    const noteId = String(item?.noteId || item?.id || "").trim();
    if (!noteId || usedIds.has(noteId)) return;
    const scopedNode = scopedNodeMap.get(noteId);
    if (!scopedNode) return;
    const title = String(item?.title || scopedNode?.title || noteId).trim() || noteId;
    const decision = graphIsolatedDecisionMeta(item, scopedNode);
    visualNodes.push({
      ...scopedNode,
      id: noteId,
      title,
      noteType: String(scopedNode?.noteType || scopedNode?.note_type || item?.noteType || item?.note_type || "original").trim() || "original",
      graphVisualState: "isolated",
      isGraphIsolatedCandidate: true,
      isolatedKey: graphIsolatedSelectionKey(item, index),
      isolatedIndex: index,
      isolatedDecisionTone: decision.tone
    });
    usedIds.add(noteId);
  });
  return visualNodes;
}

function normalizeGraphSelectionForVisibleItems(selection = null, { nodes = [], edges = [], topicCandidates = [], isolatedNotes = [], bridgeGaps = [], clusterMeta = [] } = {}) {
  const kind = String(selection?.kind || "").trim().toLowerCase();
  if (kind === "theme") {
    const theme = resolveGraphThemeSelection(selection, topicCandidates);
    return theme
      ? {
          kind: "theme",
          topicKey: theme.topicKey,
          topicIndex: theme.topicIndex,
          title: theme.title,
          noteIds: theme.noteIds
        }
      : null;
  }
  const relationWorkflowSelection = graphNormalizeRelationWorkflowSelection(selection, {
    nodes,
    isolatedNotes,
    resolveIsolatedSelection: resolveGraphIsolatedSelection
  });
  if (relationWorkflowSelection !== undefined) return relationWorkflowSelection;
  if (kind === "bridge") {
    const bridge = resolveGraphBridgeSelection(selection, bridgeGaps, nodes);
    return bridge
      ? {
          kind: "bridge",
          bridgeKey: bridge.bridgeKey,
          bridgeIndex: bridge.bridgeIndex,
          noteId: bridge.noteId,
          targetNoteId: bridge.targetNoteId,
          title: bridge.title,
          targetTitle: bridge.targetTitle,
          gapType: bridge.gapType
        }
      : null;
  }
  if (kind === "node") {
    const nodeId = String(selection?.nodeId || "").trim();
    return nodeId && nodes.some((node) => String(node?.id || "").trim() === nodeId) ? { kind: "node", nodeId } : null;
  }
  if (kind === "edge") {
    const edgeKey = String(selection?.edgeKey || "").trim();
    const fromNoteId = String(selection?.fromNoteId || "").trim();
    const toNoteId = String(selection?.toNoteId || "").trim();
    const relationType = String(selection?.relationType || "").trim().toLowerCase();
    const edge = edges.find((item) => {
      if (edgeKey && graphEdgeSelectionKey(item) === edgeKey) return true;
      const samePair = String(item?.fromNoteId || "").trim() === fromNoteId && String(item?.toNoteId || "").trim() === toNoteId;
      if (!samePair) return false;
      return !relationType || String(item?.relationType || "").trim().toLowerCase() === relationType;
    });
    return edge
      ? {
          kind: "edge",
          edgeKey: graphEdgeSelectionKey(edge),
          fromNoteId: String(edge?.fromNoteId || "").trim(),
          toNoteId: String(edge?.toNoteId || "").trim(),
          relationType: String(edge?.relationType || "").trim().toLowerCase(),
          relationId: String(edge?.id || "").trim()
        }
      : null;
  }
  if (kind === "cluster") {
    const clusterKey = String(selection?.clusterKey || "").trim();
    const cluster = (Array.isArray(clusterMeta) ? clusterMeta : []).find((item) => String(item?.clusterKey || "").trim() === clusterKey);
  return cluster
      ? {
          kind: "cluster",
          clusterKey,
          clusterIndex: Number(cluster.clusterIndex || 0),
          title: String(cluster.title || `主题群 ${Number(cluster.clusterIndex || 0) + 1}`).trim(),
          anchorId: String(cluster.anchorId || "").trim(),
          memberIds: uniqueStrings(cluster.memberIds || [])
        }
      : null;
  }
  return null;
}

function graphRelationGroupCounts(edges = []) {
  return edges.reduce(
    (acc, edge) => {
      const groupKey = graphRelationVisual(edge?.relationType).key || "neutral";
      acc[groupKey] = (acc[groupKey] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, support: 0, conflict: 0, boundary: 0, bridge: 0, flow: 0, neutral: 0, index: 0 }
  );
}

function graphNodeRoleMeta(node = {}, directEdges = []) {
  const counts = graphRelationGroupCounts(directEdges);
  const degree = Number(node?.degree || directEdges.length || 0);
  if (!degree) {
    return {
      label: "待关联笔记",
      tone: "isolated",
      detail: "它暂时还没有进入任何主题群。先判断：这是值得保留的独立观察，还是缺少一条能说清理由的关系。",
      prompt: "它应该暂时独立，还是能连接到一个正在形成的主题？"
    };
  }
  if (counts.conflict || counts.boundary) {
    return {
      label: "反方或边界角色",
      tone: "conflict",
      detail: "它已经承担反方、限定或边界工作。适合继续检查条件是否写清楚，避免观点滑得太宽。",
      prompt: "这条笔记是在限制一个观点，还是在提出真正的反例？"
    };
  }
  if (counts.bridge >= Math.max(1, counts.support) && counts.bridge) {
    return {
      label: "连接两个主题",
      tone: "bridge",
      detail: "它像两组想法之间的过渡。这里最有价值的动作不是多连线，而是把过渡理由写成一句清楚判断。",
      prompt: "它连接的两端，真正共享的是概念、问题，还是方法？"
    };
  }
  if (counts.flow) {
    return {
      label: "可进入写作",
      tone: "flow",
      detail: "它已经接近文章里的前提、后续或草稿路径。适合判断是否能进入段落顺序。",
      prompt: "它在文章里更像前提、转折，还是结论的一部分？"
    };
  }
  if (counts.support >= 2 || degree >= 4) {
    return {
      label: degree >= 4 ? "主题核心" : "关键支撑",
      tone: "support",
      detail: "它被多条关系支撑或连接。下一步要分辨：这是稳定主题，还是只是材料中转站。",
      prompt: "这些连接是否都在回答同一个问题？如果是，主题卡标题应该怎么写？"
    };
  }
  return {
    label: "普通关联笔记",
    tone: "neutral",
    detail: "它已经进入网络，但角色还不明显。适合补一句它与相邻笔记之间为什么相关。",
    prompt: "这条笔记贡献的是定义、例子、证据、反方，还是一个新问题？"
  };
}

function graphNodeInsightMeta(node = {}, directEdges = [], { nodeMap = new Map(), edges = [] } = {}) {
  const noteId = String(node?.id || "").trim();
  const role = graphNodeRoleMeta(node, directEdges);
  const counts = graphRelationGroupCounts(directEdges);
  const degree = Number(node?.degree || directEdges.length || 0);
  const missingReasonCount = directEdges.filter((edge) => {
    const rationale = String(edge?.rationale || "").trim();
    return !rationale || rationale === "markdown_wikilink";
  }).length;
  const weakTopicCount = directEdges.filter((edge) => {
    const type = String(edge?.relationType || "").trim().toLowerCase();
    return type === "same_topic" || type === "associated_with" || type === "free_link";
  }).length;
  const aiCandidates = graphAiRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 3 });
  const localCandidates = graphLocalRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 3 });
  const themeNoteIds = graphThemeCandidateNoteIdsForNode(noteId, directEdges, []);
  let quality = "关系清楚";
  let qualityDetail = "它已经有正式关系，可以从这里继续阅读周边笔记，看看是否能形成主题。";
  if (!degree) {
    quality = "还没有进入关系网";
    qualityDetail = aiCandidates.length || localCandidates.length ? "已经找到可能相关的笔记，先确认一条真正成立的关系。" : "先找一条能说清理由的关系。";
  } else if (missingReasonCount) {
    quality = "关系理由待补";
    qualityDetail = `${missingReasonCount} 条关系还缺少清楚理由。`;
  } else if (weakTopicCount >= Math.max(2, directEdges.length)) {
    quality = "关系还偏粗";
    qualityDetail = "当前更像同主题聚合，需要判断哪些能升级为支持、限定或反方关系。";
  } else if (counts.total >= 3 && !counts.conflict && !counts.boundary) {
    quality = "边界偏少";
    qualityDetail = "支持关系已有基础，但反方、限定或边界还不明显。";
  } else if (counts.conflict || counts.boundary) {
    quality = "已有边界";
    qualityDetail = "这条笔记已经有张力或限定关系，适合检查条件是否清楚。";
  }
  const nextStep = !degree
    ? "先保存一条关系"
    : missingReasonCount
      ? "先补最重要关系的理由"
      : themeNoteIds.length >= 3
        ? "整理成主题草稿"
        : counts.conflict || counts.boundary
          ? "把边界写进观点提纯"
          : "继续补一条高质量关系";
  return {
    role,
    position: role.label,
    positionDetail: role.detail,
    quality,
    qualityDetail,
    nextStep,
    candidateCount: aiCandidates.length + localCandidates.length,
    themeNoteCount: themeNoteIds.length
  };
}

function renderGraphNodeInsightPanel(insight = {}) {
  if (!insight?.position) return "";
  const targetText = `${Number(insight.candidateCount || 0)} 个可选目标 · ${Number(insight.themeNoteCount || 0)} 条可整理笔记`;
  return `
    <section class="graph-node-insight" aria-label="笔记关系摘要">
      <div class="graph-node-insight-summary">
        <span>当前状态</span>
        <strong>${escapeHtml(insight.quality)}</strong>
        <p>${escapeHtml(insight.qualityDetail)}</p>
      </div>
      <div class="graph-node-next-action">
        <span>建议下一步</span>
        <strong>${escapeHtml(insight.nextStep)}</strong>
        <p>${escapeHtml(targetText)}</p>
      </div>
      <details class="graph-node-insight-details">
        <summary>为什么这样判断</summary>
        <div>
          <span>在图谱中的作用</span>
          <strong>${escapeHtml(insight.position)}</strong>
          <p>${escapeHtml(insight.positionDetail)}</p>
        </div>
      </details>
    </section>
  `;
}

function graphEdgeReviewMeta(edge = {}) {
  const rationale = String(edge?.rationale || "").trim();
  const relationType = String(edge?.relationType || "associated_with").trim().toLowerCase();
  const visual = graphRelationVisual(relationType);
  if (!rationale || rationale === "markdown_wikilink") {
    return {
      label: "缺关系说明",
      tone: "review",
      detail: "这条线现在更像链接线索，还没有回答“为什么相关”。先补一句关系说明，再决定是否保留。",
      prompt: "如果只能留一句话解释这条关系，它应该是什么？"
    };
  }
  if (visual.key === "conflict") {
    return {
      label: "检查张力条件",
      tone: "conflict",
      detail: "这条关系保留了反方或对比。重点检查冲突成立的条件，别让它变成泛泛的不同意见。",
      prompt: "它反对的是结论、前提，还是适用范围？"
    };
  }
  if (visual.key === "boundary") {
    return {
      label: "检查边界",
      tone: "boundary",
      detail: "这条关系在收窄概念或补充限定。适合检查限定条件是否具体、可复用。",
      prompt: "这个限定能否变成未来判断同类材料的规则？"
    };
  }
  if (visual.key === "bridge") {
    return {
      label: "检查桥接质量",
      tone: "bridge",
      detail: "这条关系承担跨主题连接。重点看桥接理由是否足够清楚，而不是只因为两个标题相似。",
      prompt: "它桥接的是问题、概念，还是研究方法？"
    };
  }
  if (visual.key === "support") {
    return {
      label: "检查支撑强度",
      tone: "support",
      detail: "这条关系在支撑或推进观点。适合检查它提供的是证据、例子、定义，还是进一步推论。",
      prompt: "它是在证明观点，还是只是补充背景？"
    };
  }
  return {
    label: "复核关系类型",
    tone: "neutral",
    detail: "这条关系已经有说明，但语义角色还可以再判断一次，避免把索引关系当成论证关系。",
    prompt: "这条线如果删掉，会损失论证，还是只损失导航？"
  };
}

function graphEdgeRationaleLooksComplex(rationale = "") {
  const text = String(rationale || "").trim();
  if (text.length >= 96) return true;
  return /同时|但是|然而|另一方面|以及|并且|反过来|不过|既.*又/.test(text);
}

function graphEdgeAdjustmentPlan(edge = {}) {
  const rationale = String(edge?.rationale || "").trim();
  const relationType = String(edge?.relationType || "associated_with").trim().toLowerCase();
  const visual = graphRelationVisual(relationType);
  const source = String(edge?.createdBy || "").trim().toLowerCase();
  const status = String(edge?.status || "confirmed").trim().toLowerCase();
  const isWeakLink = GRAPH_LINK_CLUE_RELATION_TYPES.has(relationType) || relationType === "associated_with" || relationType === "free_link";
  const missingRationale = !rationale || rationale === "markdown_wikilink";
  const likelyGenerated = source === "ai" || source === "ai_suggestion" || status === "suggested" || status === "draft";
  const complex = graphEdgeRationaleLooksComplex(rationale);
  const directional = ["supports", "example_of", "counterexample_to", "precedes", "follows", "extends", "contradicts", "qualifies"].includes(relationType);
  let recommendation = "strengthen";
  let label = "先补理由";
  let detail = "这条关系现在还不够可判断。先把“为什么相连”写清楚，再决定是否改类型、反向或删除。";
  if (complex) {
    recommendation = "split";
    label = "考虑拆成两条";
    detail = "当前理由里可能混合了多个判断。与其用一条线承载太多意思，不如拆成两条更具体的关系。";
  } else if (isWeakLink && !missingRationale) {
    recommendation = "change-type";
    label = "考虑改类型";
    detail = "它已经有说明，但类型仍像普通链接。适合判断是否应改成支持、限定、反驳、桥接或前后关系。";
  } else if (directional && !missingRationale) {
    recommendation = "reverse";
    label = "核对方向";
    detail = "这类关系有方向性。请检查源笔记是否真的指向目标笔记，而不是目标笔记在支撑或限定源笔记。";
  } else if (missingRationale && (likelyGenerated || isWeakLink)) {
    recommendation = "remove";
    label = "可能降级或删除";
    detail = "如果补不出清楚理由，这条线可能只是标题相似或临时线索。可以降级为链接线索，或在编辑里删除。";
  } else if (visual.key === "conflict" || visual.key === "boundary") {
    recommendation = "change-type";
    label = "核对张力类型";
    detail = "它可能是反驳、对比、反例或限定。重点不是删掉张力，而是把张力类型和成立条件分清。";
  }
  const cards = [
    {
      key: "strengthen",
      title: "补理由",
      text: "先写清这条线为什么成立，尤其是它为论证贡献了什么。",
      actionLabel: "去补理由"
    },
    {
      key: "change-type",
      title: "改类型",
      text: "把普通链接改成支持、限定、反驳、桥接、前提或后续。",
      actionLabel: "去改类型"
    },
    {
      key: "reverse",
      title: "反向",
      text: "检查论证方向是否反了：谁支撑谁，谁限定谁。",
      actionLabel: "去核对方向"
    },
    {
      key: "split",
      title: "拆成两条",
      text: "当一条理由里有两个判断时，拆开会更清楚。",
      actionLabel: "去拆分"
    },
    {
      key: "remove",
      title: "删除/降级",
      text: "如果没有解释力，就删除，或降级为普通链接线索。",
      actionLabel: "去整理"
    }
  ].map((card) => ({ ...card, active: card.key === recommendation }));
  return { recommendation, label, detail, cards };
}

function renderGraphSelectionMetrics(items = []) {
  return renderGraphSelectionMetricsView(items, {
    escapeHtml,
    renderGraphIcon,
    graphSafeActionAttrs
  });
}

function graphSafeActionAttrs(attrs = "") {
  const text = String(attrs || "").trim();
  if (!text) return "";
  return /^(?:data-[a-z0-9-]+="[^"<>&]*"\s*)+$/i.test(text) ? text : "";
}

function renderGraphSelectionTask(task = null) {
  return renderGraphSelectionTaskView(task, {
    escapeHtml,
    renderGraphIcon,
    graphSafeActionAttrs
  });
}

function renderGraphPromptDetails(title = "思考提示（可选）", prompts = []) {
  return renderGraphPromptDetailsView(title, prompts, {
    escapeHtml,
    renderGraphIcon,
    graphSafeActionAttrs
  });
}

function renderGraphSelectionShell({ className = "", ariaLabel = "", kicker = "", title = "", meta = "", closeLabel = "收起详情", roleLabel = "", roleDetail = "", task = null, body = "", actions = "" } = {}) {
  return renderGraphSelectionShellView({ className, ariaLabel, kicker, title, meta, closeLabel, roleLabel, roleDetail, task, body, actions }, {
    escapeHtml,
    renderGraphIcon,
    graphSafeActionAttrs
  });
}

function graphThemeMaturityMeta(topic = {}, { nodeMap = new Map(), edges = [] } = {}) {
  const noteIds = graphThemeNoteIds(topic);
  const noteSet = new Set(noteIds);
  const memberEdges = (Array.isArray(edges) ? edges : []).filter(
    (edge) =>
      graphRelationStatusCountsAsNetworkEdge(edge?.status) &&
      noteSet.has(String(edge?.fromNoteId || "").trim()) &&
      noteSet.has(String(edge?.toNoteId || "").trim())
  );
  const externalEdges = (Array.isArray(edges) ? edges : []).filter((edge) => {
    if (!graphRelationStatusCountsAsNetworkEdge(edge?.status)) return false;
    const fromInside = noteSet.has(String(edge?.fromNoteId || "").trim());
    const toInside = noteSet.has(String(edge?.toNoteId || "").trim());
    return (fromInside || toInside) && fromInside !== toInside;
  });
  const counts = graphRelationGroupCounts(memberEdges);
  const title = String(topic?.title || "").trim();
  const rationale = String(topic?.rationale || topic?.summary || "").trim();
  const breadth = graphThemeBreadthMeta(topic, { totalNodeCount: nodeMap?.size || 0 });
  let score = 0;
  if (noteIds.length >= 5) score += 24;
  else if (noteIds.length >= 3) score += 18;
  else if (noteIds.length >= 2) score += 10;
  if (memberEdges.length >= Math.max(1, noteIds.length - 1)) score += 24;
  else if (memberEdges.length >= 2) score += 16;
  else if (memberEdges.length >= 1) score += 8;
  if (counts.support >= 2) score += 14;
  else if (counts.support) score += 8;
  if (counts.conflict || counts.boundary) score += 16;
  if (counts.bridge || externalEdges.length) score += 10;
  if (rationale.length >= 34) score += 10;
  if (title.length >= 4 && !["待验证主题", "主题候选"].includes(title)) score += 8;
  if (breadth.genericTitle) score -= 14;
  score = Math.max(0, Math.min(100, score));
  const missing = [];
  if (breadth.broad) missing.push("候选覆盖太宽，先收窄到一个可争论的问题。");
  if (breadth.genericTitle) missing.push("标题像标签而不是判断，先改写成研究问题或观点句。");
  if (noteIds.length < 3) missing.push("成员笔记偏少，先别急着建主题卡。");
  if (!memberEdges.length) missing.push("成员之间还缺明确关系，像聚类多过论证。");
  if (!counts.conflict && !counts.boundary) missing.push("还没有反方或边界，主题容易过宽。");
  if (!counts.support) missing.push("支撑关系不足，主题标题可能只是标签。");
  if (breadth.broad) {
    const looseScore = Math.max(18, Math.min(44, score));
    return {
      score: looseScore,
      tone: "loose",
      label: "松散标签，先收窄",
      detail: "这个候选覆盖面太大，更像导航标签或材料入口。现在不宜直接形成主题卡，应先缩成一个更具体、可争论的问题。",
      next: "从中挑 3-8 条真正回答同一问题的笔记，写出一句临时主题判断，再决定是否拆分或建主题卡。",
      missing,
      noteIds,
      memberEdges,
      externalEdges,
      counts,
      breadth
    };
  }
  if (score >= 74) {
    return {
      score,
      tone: "mature",
      label: "可以形成主题卡",
      detail: "这组笔记已有足够成员和内部关系，可以尝试把它写成一个明确问题或判断，再继续补边界。",
      next: "先写一句主题判断，再检查哪条笔记提供支撑、哪条笔记提供反方或限定。",
      missing,
      noteIds,
      memberEdges,
      externalEdges,
      counts,
      breadth
    };
  }
  if (score >= 48) {
    return {
      score,
      tone: "testing",
      label: "值得继续验证",
      detail: "这组笔记有成题迹象，但还需要补关系说明、反方或边界，避免过早把相似材料揉成一个主题。",
      next: "挑两条最关键的成员笔记，补清它们为什么属于同一个问题。",
      missing,
      noteIds,
      memberEdges,
      externalEdges,
      counts,
      breadth
    };
  }
  return {
    score,
    tone: "early",
    label: "暂不急着成题",
    detail: "这更像一个线索聚集，还没稳到可以形成主题。先找共同问题，或把它拆成更小的关系判断。",
    next: "先不要建主题卡，优先补一条成员之间的真实关系，或者拆成两个更具体的问题。",
    missing,
    noteIds,
    memberEdges,
    externalEdges,
    counts,
    breadth
  };
}

function graphThemeCandidateQualityMeta(topic = {}, { nodeMap = new Map(), edges = [], index = 0 } = {}) {
  const maturity = graphThemeMaturityMeta(topic, { nodeMap, edges });
  const noteIds = maturity.noteIds || [];
  const relationDensity = noteIds.length ? maturity.memberEdges.length / noteIds.length : 0;
  let sortScore = maturity.score;
  if (maturity.tone === "mature") sortScore += 18;
  else if (maturity.tone === "testing") sortScore += 10;
  else if (maturity.tone === "early") sortScore -= 6;
  else if (maturity.tone === "loose") sortScore -= 26;
  if (noteIds.length >= 3 && noteIds.length <= 18) sortScore += 8;
  if (relationDensity >= 0.8) sortScore += 6;
  if ((maturity.counts.conflict || 0) + (maturity.counts.boundary || 0)) sortScore += 5;
  sortScore -= Number(index || 0) * 0.1;
  const listLabel =
    maturity.tone === "mature"
      ? "成熟主题候选"
      : maturity.tone === "testing"
        ? "待验证聚集"
        : maturity.tone === "loose"
          ? "松散标签"
          : "早期线索聚集";
  const listPriority =
    maturity.tone === "loose"
      ? 70 + Math.min(6, maturity.score / 10)
      : maturity.tone === "early"
        ? 80 + Math.min(6, maturity.score / 10)
        : 88 + Math.min(11, maturity.score / 8);
  const listQuestion =
    maturity.tone === "loose"
      ? "它能否收窄成一个具体研究问题，还是应该只作为导航标签保留？"
      : "这组笔记能否写成一句可争论的判断，而不只是共享同一个标签？";
  return {
    ...maturity,
    sortScore,
    listLabel,
    listPriority,
    listQuestion
  };
}

function graphRankThemeCandidates(topicCandidates = [], { nodeMap = new Map(), edges = [] } = {}) {
  return (Array.isArray(topicCandidates) ? topicCandidates : [])
    .map((topic, index) => ({
      topic,
      originalIndex: index,
      quality: graphThemeCandidateQualityMeta(topic, { nodeMap, edges, index })
    }))
    .sort((a, b) => Number(b.quality?.sortScore || 0) - Number(a.quality?.sortScore || 0) || Number(a.originalIndex || 0) - Number(b.originalIndex || 0));
}

function renderGraphThemeSelectionPanel({ selection = null, topicCandidates = [], nodeMap = new Map(), edges = [] } = {}) {
  const theme = resolveGraphThemeSelection(selection, topicCandidates);
  if (!theme) return "";
  const topic = theme.topic || {};
  const maturity = graphThemeMaturityMeta(topic, { nodeMap, edges });
  const rationale = String(topic?.rationale || topic?.summary || "").trim();
  const firstNoteId = maturity.noteIds[0] || "";
  const memberNotes = maturity.noteIds
    .map((id) => nodeMap.get(id) || { id, title: id, noteType: "note" })
    .slice(0, 6);
  const prompts = [
    "这个主题能否写成一句可争论的判断，而不只是一个名词标签？",
    maturity.counts.conflict || maturity.counts.boundary ? "已有边界或反方：它是否应该成为主题卡里的限制条件？" : "它缺哪一种反方、限定或反例，才能避免主题过宽？",
    maturity.memberEdges.length ? "哪些关系是主题成立的关键，哪些只是导航线索？" : "哪两条成员笔记之间最应该先补一条明确关系？"
  ];
  return renderGraphSelectionShell({
    className: `is-theme is-${maturity.tone}`,
    ariaLabel: "主题群详情",
    kicker: "主题群评估",
    title: theme.title,
    meta: `${maturity.noteIds.length || 0} 条笔记 · ${maturity.memberEdges.length || 0} 条组内关系`,
    closeLabel: "收起主题群详情",
    roleLabel: maturity.label,
    roleDetail: maturity.detail,
    body: `
      <div class="graph-theme-maturity is-${escapeHtml(maturity.tone)}" aria-label="主题成熟度评分">
        <div class="graph-theme-maturity-head">
          <small>成熟度</small>
          <strong>${escapeHtml(String(maturity.score))}%</strong>
        </div>
        <div class="graph-theme-meter"><i style="width: ${escapeHtml(String(maturity.score))}%"></i></div>
        <p>${escapeHtml(maturity.next)}</p>
      </div>
      <div class="graph-selection-metrics" aria-label="主题群关系结构">
        ${renderGraphSelectionMetrics([
          { label: "成员", value: `${maturity.noteIds.length} 条` },
          { label: "组内关系", value: `${maturity.memberEdges.length} 条` },
          { label: "支撑", value: `${maturity.counts.support || 0} 条` },
          { label: "反方/边界", value: `${(maturity.counts.boundary || 0) + (maturity.counts.conflict || 0)} 条` }
        ])}
      </div>
      ${renderGraphThemeIndexWorkspace(maturity.noteIds, { title: theme.title, relationCount: maturity.memberEdges.length, tone: maturity.tone })}
      <section class="graph-selection-reason">
        <small>候选理由</small>
        <p>${escapeHtml(rationale || "这组笔记被识别为可能围绕同一问题，但还需要人工判断共同问题是什么。")}</p>
      </section>
      ${
        maturity.missing.length
          ? `<section class="graph-selection-reason is-warning">
              <small>先补这些缺口</small>
              ${maturity.missing.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
            </section>`
          : ""
      }
      <section class="graph-theme-notes" aria-label="主题候选成员笔记">
        <strong>成员笔记</strong>
        ${memberNotes
          .map(
            (note) => `
              <button class="graph-theme-note" type="button" data-open-note="${escapeHtml(note.id)}">
                <span>${escapeHtml(note.title || note.id)}</span>
                <small>${escapeHtml(noteTypeLabel(note.noteType))}</small>
              </button>
            `
          )
          .join("")}
      </section>
      ${renderGraphPromptDetails("判断提示（可选）", prompts)}`,
    actions: `
      <button class="graph-selection-action is-primary" type="button" data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(maturity.noteIds.join(","))}" data-graph-theme-title="${escapeHtml(theme.title)}"${maturity.noteIds.length >= 3 ? "" : " disabled"}>整理成主题草稿</button>
      <button class="graph-selection-action is-secondary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(firstNoteId)}"${firstNoteId ? "" : " disabled"}>补一条主题关系</button>
      <button class="graph-selection-action is-quiet" type="button" data-open-note="${escapeHtml(firstNoteId)}"${firstNoteId ? "" : " disabled"}>打开代表笔记</button>`
  });
}

function graphRelationCandidateKey(fromNoteId = "", toNoteId = "", relationType = "") {
  return computeGraphRelationCandidateKey(fromNoteId, toNoteId, relationType);
}

function graphRelationPairKey(leftNoteId = "", rightNoteId = "") {
  return computeGraphRelationPairKey(leftNoteId, rightNoteId);
}

function graphCandidateEndpointIds(candidate = {}) {
  return computeGraphCandidateEndpointIds(candidate);
}

function graphCandidateCountKey(candidate = {}) {
  return computeGraphCandidateCountKey(candidate);
}

function graphRelationStatusKey(value = "") {
  return computeGraphRelationStatusKey(value);
}

function graphRelationStatusCountsAsNetworkEdge(value = "") {
  return computeGraphRelationStatusCountsAsNetworkEdge(value);
}

function graphRelationStatusCountsAsConfirmedEdge(value = "") {
  return String(value || "confirmed").trim().toLowerCase() === "confirmed";
}

function graphDirectConfirmedRelationCount(noteId = "", edges = []) {
  return computeGraphDirectNetworkEdgeCount(noteId, edges, {
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsConfirmedEdge
  });
}

function graphNodeNeedsRelationWorkflow(noteId = "", edges = [], nodeMap = new Map()) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return false;
  if (nodeMap instanceof Map && nodeMap.size && !nodeMap.has(cleanNoteId)) return false;
  return graphDirectConfirmedRelationCount(cleanNoteId, edges) === 0;
}

function graphNodeNeedsRelationWorkflowFromCurrentGraph(noteId = "") {
  const edges = Array.isArray(graphState.item?.edges) ? graphState.item.edges : [];
  return graphNodeNeedsRelationWorkflow(noteId, edges);
}

function graphExistingRelationKeys(edges = []) {
  return computeGraphExistingRelationKeys(edges);
}

function graphExistingRelationPairKeys(edges = []) {
  return computeGraphExistingRelationPairKeys(edges);
}

const GRAPH_CONFIRMABLE_RELATION_TYPES = new Set(["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with"]);
const GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES = new Set(["bridges", "same_topic", "associated_with"]);

function graphPreferredPotentialRelationType(candidate = {}) {
  return computeGraphPreferredPotentialRelationType(candidate, GRAPH_CONFIRMABLE_RELATION_TYPES);
}

function graphCandidateBlocksFormalRelation(candidate = {}) {
  return computeGraphCandidateBlocksFormalRelation(candidate);
}

function graphCandidateCanSaveRelation(candidate = {}) {
  return computeGraphCandidateCanSaveRelation(candidate, GRAPH_CONFIRMABLE_RELATION_TYPES);
}

function graphRelationRationaleIsActionable(value = "") {
  return computeGraphRelationRationaleIsActionable(value);
}

function graphPotentialRelationNodeMap() {
  const items = [
    ...(Array.isArray(graphState.item?.nodes) ? graphState.item.nodes : []),
    ...(Array.isArray(state.notes) ? state.notes : [])
  ];
  return new Map(items.map((item) => [String(item?.id || "").trim(), item]).filter(([id]) => id));
}

function graphPotentialRelationActionEndpoints(cleanNoteId = "", sourceNoteId = "", targetNoteId = "", relationType = "") {
  return computeGraphPotentialRelationActionEndpoints(cleanNoteId, sourceNoteId, targetNoteId, relationType, GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES);
}

function graphPotentialRelationEvidenceText(candidate = {}) {
  return computeGraphPotentialRelationEvidenceText(candidate);
}

function graphPotentialRelationRationaleDraft({
  relationLabel = "",
  actionSourceTitle = "",
  actionTargetTitle = "",
  aiRationale = "",
  evidenceText = ""
} = {}) {
  return computeGraphPotentialRelationRationaleDraft({
    relationLabel,
    actionSourceTitle,
    actionTargetTitle,
    aiRationale,
    evidenceText
  });
}

function graphDecoratePotentialRelationCandidate(candidate = {}, { nodeMap = new Map() } = {}) {
  return computeGraphDecoratePotentialRelationCandidate(candidate, { nodeMap }, {
    graphNodeTitle,
    graphRelationTypeLabel,
    graphPreferredRelationType: graphPreferredPotentialRelationType,
    evidenceTextForCandidate: graphPotentialRelationEvidenceText,
    rationaleDraftForCandidate: graphPotentialRelationRationaleDraft
  });
}

function graphCandidateRelationReviewQuestion(candidate = {}) {
  const explicitQuestion = String(candidate.reviewQuestion || candidate.review_question || "").trim();
  if (explicitQuestion) return explicitQuestion;
  const relationType = String(candidate.aiRelationType || candidate.relationType || candidate.coarseType || "").trim().toLowerCase();
  if (relationType === "supports") return "它是在提供证据、例子，还是在推进对方的结论？";
  if (relationType === "contradicts") return "它反对的是结论、前提，还是适用范围？";
  if (relationType === "qualifies") return "它限定了对方在什么条件下成立？";
  if (relationType === "bridges") return "它连接的是共同问题、概念过渡，还是方法相似？";
  if (relationType === "same_topic") return "它们只是同主题，还是已经有明确的支持、限定或反方关系？";
  return "这条关系能说清支持、限定、反方或连接动作吗？";
}

function graphCandidateRelationVerdict(candidate = {}) {
  const decision = String(candidate.aiDecision || candidate.ai_decision || "").trim().toLowerCase();
  const relationType = String(candidate.aiRelationType || candidate.relationType || candidate.coarseType || "associated_with").trim().toLowerCase();
  const relationLabel = graphRelationTypeLabel(relationType === "no_relation" ? "associated_with" : relationType);
  const confidenceLabel = graphAiConfidenceLabel(candidate.aiConfidence || candidate.confidence);
  if (decision === "reject" || relationType === "no_relation") return "暂不建议直接保存为正式关系";
  if (decision === "uncertain") return `可以先按“${relationLabel}”检查`;
  if (decision === "accept") return `可以保存为“${relationLabel}”`;
  return `建议关系：${relationLabel} · ${confidenceLabel}`;
}

function graphCandidateLocalReason(candidate = {}) {
  const reasons = Array.isArray(candidate.coarseReasons || candidate.coarse_reasons)
    ? candidate.coarseReasons || candidate.coarse_reasons
    : [];
  if (reasons.length) return reasons.join("；");
  return String(candidate.evidenceText || candidate.rationale || "").trim() || "标题、标签或核心判断出现相近之处。";
}

function renderGraphCandidateReviewRows(candidate = {}, { aiCandidate = true } = {}) {
  const localReason = graphCandidateLocalReason(candidate);
  const aiReason = String(candidate.aiRationale || candidate.ai_rationale || "").trim();
  const aiError = String(candidate.aiError || candidate.ai_error || "").trim();
  const needsConfirmation = candidate.aiNeedsConfirmation === true || graphPotentialRelationNeedsConfirmation(candidate);
  const reasonText = !aiCandidate
    ? `推荐原因：${localReason}`
    : aiReason
      ? `AI 理由：${aiReason}`
      : needsConfirmation
        ? `推荐原因：${localReason}。需要你确认后再生成更详细理由。`
        : aiError
          ? `推荐原因：${localReason}。AI 理由生成失败，可以先人工判断。`
          : `推荐原因：${localReason}。AI 理由生成中或尚未生成。`;
  return `
    <div class="graph-candidate-review" aria-label="推荐依据">
      <div><span>为什么推荐</span><p>${escapeHtml(reasonText)}</p></div>
      <div><span>建议关系</span><p>${escapeHtml(graphCandidateRelationVerdict(candidate))}</p></div>
      <div><span>保存前想一想</span><p>${escapeHtml(graphCandidateRelationReviewQuestion(candidate))}</p></div>
    </div>
  `;
}

function graphPotentialRelationMatchKey(candidate = {}) {
  const id = String(candidate.id || candidate.candidateId || candidate.candidate_id || "").trim();
  if (id) return `id:${id}`;
  const { sourceNoteId: fromNoteId, targetNoteId: toNoteId } = graphCandidateEndpointIds(candidate);
  if (!fromNoteId || !toNoteId) return "";
  return `pair:${graphRelationCandidateKey(fromNoteId, toNoteId, "")}`;
}

function graphPotentialRelationNeedsConfirmation(candidate = {}) {
  const code = String(candidate.aiErrorCode || candidate.ai_error_code || "").trim();
  return code === "AI_ROUTE_CONFIRMATION_REQUIRED" || code === "AI_BUDGET_CONFIRMATION_REQUIRED";
}

function graphFindPotentialRelationCandidate({ candidateId = "", sourceNoteId = "", targetNoteId = "" } = {}) {
  const cleanCandidateId = String(candidateId || "").trim();
  const cleanSourceNoteId = String(sourceNoteId || "").trim();
  const cleanTargetNoteId = String(targetNoteId || "").trim();
  const analysis = graphAiAnalysisPayload();
  const candidates = [
    ...(Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates : []),
    ...(Array.isArray(analysis?.bridgeCandidates) ? analysis.bridgeCandidates : [])
  ];
  return candidates.find((candidate) => {
    const id = String(candidate?.id || candidate?.candidateId || candidate?.candidate_id || "").trim();
    if (cleanCandidateId && id === cleanCandidateId) return true;
    const { sourceNoteId: fromNoteId, targetNoteId: toNoteId } = graphCandidateEndpointIds(candidate);
    return cleanSourceNoteId && cleanTargetNoteId && fromNoteId === cleanSourceNoteId && toNoteId === cleanTargetNoteId;
  }) || null;
}

function graphAiRelationCandidatesForNote(noteId = "", { nodeMap = new Map(), edges = [], limit = 5 } = {}) {
  return computeGraphAiRelationCandidatesForNote(noteId, {
    analysis: graphAiAnalysisPayload(),
    nodeMap,
    edges,
    limit
  }, {
    graphExistingRelationPairKeys,
    graphCandidateCanSaveRelation,
    graphPreferredRelationType: graphPreferredPotentialRelationType,
    decorateCandidate: graphDecoratePotentialRelationCandidate,
    actionEndpoints: graphPotentialRelationActionEndpoints,
    graphNodeTitle,
    graphRelationTypeLabel,
    graphPotentialRelationNeedsConfirmation
  });
}

function graphReviewSummaryFromAnalysis(analysis = {}, previousSummary = {}) {
  const topicCandidateCount = Array.isArray(analysis?.topicCandidates) ? analysis.topicCandidates.length : 0;
  const relationCandidateCount = Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates.length : 0;
  const bridgeCandidateCount = Array.isArray(analysis?.bridgeCandidates) ? analysis.bridgeCandidates.length : 0;
  const isolatedNoteCount = Array.isArray(analysis?.isolatedNotes) ? analysis.isolatedNotes.length : 0;
  const artifactCount = topicCandidateCount + Math.max(0, relationCandidateCount - bridgeCandidateCount) + bridgeCandidateCount + isolatedNoteCount;
  return {
    ...(previousSummary && typeof previousSummary === "object" ? previousSummary : {}),
    artifactCount,
    topicCandidateCount,
    relationCandidateCount,
    bridgeCandidateCount,
    isolatedNoteCount
  };
}

function mergePotentialRelationCandidateIntoGraphAnalysis(refinedCandidate = {}) {
  const matchKey = graphPotentialRelationMatchKey(refinedCandidate);
  if (!matchKey || !graphState.aiAnalysis) return false;
  const analysis = graphAiAnalysisPayload();
  if (!analysis) return false;
  const nodeMap = graphPotentialRelationNodeMap();
  let changed = false;
  const mergeList = (items = []) =>
    (Array.isArray(items) ? items : []).map((candidate) => {
      if (graphPotentialRelationMatchKey(candidate) !== matchKey) return candidate;
      changed = true;
      return graphDecoratePotentialRelationCandidate({
        ...candidate,
        ...refinedCandidate,
        fromNoteId: refinedCandidate.fromNoteId || refinedCandidate.sourceNoteId || candidate.fromNoteId,
        toNoteId: refinedCandidate.toNoteId || refinedCandidate.targetNoteId || candidate.toNoteId,
        sourceNoteId: refinedCandidate.sourceNoteId || refinedCandidate.fromNoteId || candidate.sourceNoteId,
        targetNoteId: refinedCandidate.targetNoteId || refinedCandidate.toNoteId || candidate.targetNoteId
      }, { nodeMap });
    });
  const nextAnalysis = {
    ...analysis,
    relationCandidates: mergeList(analysis.relationCandidates),
    bridgeCandidates: mergeList(analysis.bridgeCandidates)
  };
  const nextSummary = graphReviewSummaryFromAnalysis(nextAnalysis, graphState.aiAnalysis?.reviewItems?.summary);
  graphState.aiAnalysis = graphState.aiAnalysis?.analysis
    ? {
        ...graphState.aiAnalysis,
        analysis: nextAnalysis,
        reviewItems: {
          ...(graphState.aiAnalysis.reviewItems || {}),
          summary: nextSummary
        }
      }
    : nextAnalysis;
  return changed;
}

function removePotentialRelationCandidateFromGraphAnalysis(candidateToRemove = {}) {
  const matchKey = graphPotentialRelationMatchKey(candidateToRemove);
  if (!matchKey || !graphState.aiAnalysis) return false;
  const analysis = graphAiAnalysisPayload();
  if (!analysis) return false;
  const filterList = (items = []) => (Array.isArray(items) ? items : []).filter((candidate) => graphPotentialRelationMatchKey(candidate) !== matchKey);
  const nextRelationCandidates = filterList(analysis.relationCandidates);
  const nextBridgeCandidates = filterList(analysis.bridgeCandidates);
  const changed =
    nextRelationCandidates.length !== (Array.isArray(analysis.relationCandidates) ? analysis.relationCandidates.length : 0) ||
    nextBridgeCandidates.length !== (Array.isArray(analysis.bridgeCandidates) ? analysis.bridgeCandidates.length : 0);
  if (!changed) return false;
  const nextAnalysis = {
    ...analysis,
    relationCandidates: nextRelationCandidates,
    bridgeCandidates: nextBridgeCandidates
  };
  const nextSummary = graphReviewSummaryFromAnalysis(nextAnalysis, graphState.aiAnalysis?.reviewItems?.summary);
  graphState.aiAnalysis = graphState.aiAnalysis?.analysis
    ? {
        ...graphState.aiAnalysis,
        analysis: nextAnalysis,
        reviewItems: {
          ...(graphState.aiAnalysis.reviewItems || {}),
          summary: nextSummary
        }
      }
    : nextAnalysis;
  return true;
}

const graphAiConnectRuntimeController = createGraphAiConnectRuntimeController(() => ({
  addSystemMessage,
  analyzeDirectoryGraph,
  ensureGraphLocalAiReadyForAnalysis,
  graphAiRelationCandidatesForNote,
  graphNodeTitle,
  graphPotentialRelationNeedsConfirmation,
  graphRelationStatusCountsAsNetworkEdge,
  graphRelationWorkflowController,
  graphScopeDirectoryId,
  graphState,
  setGraphIsolatedWorkflowActiveTab,
  mergePotentialRelationCandidateIntoGraphAnalysis,
  refinePotentialRelationCandidate,
  removePotentialRelationCandidateFromGraphAnalysis,
  renderGraphPanel,
  setStatus,
  state
}));

async function refineGraphPotentialRelationsForNote(noteId = "", candidates = [], options = {}) {
  return graphAiConnectRuntimeController.refineGraphPotentialRelationsForNote(noteId, candidates, options);
}

async function refineGraphPotentialRelationCandidate(noteId = "", candidate = {}, options = {}) {
  return graphAiConnectRuntimeController.refineGraphPotentialRelationCandidate(noteId, candidate, options);
}

function graphNoteTags(note = {}) { return graphNoteTagsForLocalRelation(note, { parseTags }); }

function graphTitleCharacterOverlap(left = "", right = "") { return computeGraphTitleCharacterOverlap(left, right); }

function graphLocalRelationCandidatesForNote(noteId = "", { nodeMap = new Map(), edges = [], limit = 5 } = {}) {
  return computeGraphLocalRelationCandidatesForNote(
    noteId,
    { nodeMap, edges, limit },
    {
      relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge,
      noteTags: graphNoteTags,
      relationTypeLabel: graphRelationTypeLabel
    }
  );
}

function graphCandidateSourceLabel(candidate = {}, fallback = "本地推荐") {
  if (candidate.aiDecision || candidate.modelName || candidate.aiRationale) return "AI 推荐";
  return fallback;
}

function graphCandidateUndirectedPairKey(candidate = {}) {
  return computeGraphCandidateUndirectedPairKey(candidate);
}

function graphBlockedAiRelationPairKeysForNote(noteId = "") {
  return computeGraphBlockedAiRelationPairKeysForNote(noteId, graphAiAnalysisPayload());
}

function graphCandidateEvidenceText(candidate = {}) {
  const evidenceText = String(candidate.evidenceText || candidate.aiRationale || candidate.rationale || "").trim();
  if (evidenceText) return evidenceText;
  const reasons = Array.isArray(candidate.coarseReasons || candidate.coarse_reasons)
    ? candidate.coarseReasons || candidate.coarse_reasons
    : [];
  return reasons.filter(Boolean).slice(0, 2).join("；") || "这条笔记和目标笔记有相近之处，保存前请确认理由是否说得清。";
}

function graphMergeRelationCandidatesForDisplay(aiCandidates = [], localCandidates = [], { limit = 6, blockedPairKeys = new Set() } = {}) {
  return computeGraphMergeRelationCandidatesForDisplay(aiCandidates, localCandidates, { limit, blockedPairKeys });
}

function graphNotePreviewText(note = {}) {
  return graphNotePreviewTextForLocalRelation(note);
}

function graphFullNoteById(noteId = "", nodeMap = new Map()) {
  return graphFullNoteByIdFromSources(noteId, { nodeMap, notes: state.notes });
}

function graphIsolatedPreviewTarget(noteId = "", nodeMap = new Map(), preferredTargetNoteId = "") {
  return graphIsolatedPreviewTargetForNote(
    noteId,
    {
      nodeMap,
      preferredTargetNoteId,
      previewTargetByNoteId: graphState.isolatedCandidatePreviewByNoteId,
      notes: state.notes
    },
    {
      fullNoteById: graphFullNoteByIdFromSources,
      nodeTitle: graphNodeTitle,
      noteTypeLabel,
      notePreviewText: graphNotePreviewText,
      noteTags: graphNoteTags
    }
  );
}

function renderGraphIsolatedPreviewPanel(noteId = "", { nodeMap = new Map(), preferredTargetNoteId = "" } = {}) {
  const preview = graphIsolatedPreviewTarget(noteId, nodeMap, preferredTargetNoteId);
  if (!preview) {
    return `
      <aside class="graph-isolated-preview" aria-label="目标笔记预览" data-graph-isolated-preview>
        <div>
          <small data-graph-preview-kicker>目标笔记预览</small>
          <button class="graph-selection-action is-quiet" type="button" data-graph-clear-candidate-preview="${escapeHtml(noteId)}" data-graph-preview-clear-inline hidden>收起</button>
        </div>
        <strong data-graph-preview-title>先选择一条目标笔记</strong>
        <span data-graph-preview-type hidden></span>
        <p data-graph-preview-text>选择 AI 推荐目标或手动搜索结果后，这里会显示目标笔记摘要。保存关系和继续处理都留在当前浮层内。</p>
        <div class="graph-isolated-preview-tags" data-graph-preview-tags hidden></div>
      </aside>
    `;
  }
  return `
    <aside class="graph-isolated-preview is-active" aria-label="目标笔记预览" data-graph-isolated-preview>
      <div>
        <small data-graph-preview-kicker>正在预览</small>
        <button class="graph-selection-action is-quiet" type="button" data-graph-clear-candidate-preview="${escapeHtml(noteId)}">收起</button>
      </div>
      <strong data-graph-preview-title>${escapeHtml(preview.title)}</strong>
      <span data-graph-preview-type>${escapeHtml(preview.type)}</span>
      <p data-graph-preview-text>${escapeHtml(preview.text)}</p>
      <div class="graph-isolated-preview-tags" data-graph-preview-tags${preview.tags.length ? "" : " hidden"}>${preview.tags.map((tag) => `<em>${escapeHtml(`#${tag}`)}</em>`).join("")}</div>
    </aside>
  `;
}

function renderGraphRelationCandidateCards(candidates = [], { title = "可能相关笔记", note = "先选一条真正相关的笔记，能说清理由再保存为关系。", sourceLabel = "本地推荐" } = {}) {
  const items = Array.isArray(candidates) ? candidates.filter((candidate) => candidate && graphCandidateCanSaveRelation(candidate)) : [];
  if (!items.length) return "";
  return `
    <section class="graph-ai-connect graph-local-connect" aria-label="${escapeHtml(title)}">
      <div class="graph-ai-connect-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${items.length} 个可选目标</span>
      </div>
      <p>${escapeHtml(note)}</p>
      <div class="graph-ai-connect-list">
        ${items
          .map(
            (candidate) => `
              <article class="graph-ai-connect-card">
                <div class="graph-ai-connect-card-head">
                  <span>${escapeHtml(graphCandidateSourceLabel(candidate, sourceLabel))}</span>
                  <strong>${escapeHtml(candidate.counterpartTitle || candidate.targetTitle)}</strong>
                  <small>${escapeHtml(candidate.relationLabel)} · ${escapeHtml(graphAiConfidenceLabel(candidate.confidence))}</small>
                </div>
                <p>${escapeHtml(graphCandidateEvidenceText(candidate))}</p>
                <details class="graph-candidate-details">
                  <summary>查看依据</summary>
                  ${renderGraphCandidateReviewRows(candidate, { aiCandidate: false })}
                </details>
                <div class="graph-ai-connect-actions">
                  <button class="graph-selection-action is-primary" type="button" data-graph-relation-candidate-apply data-open-note="${escapeHtml(candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(candidate.targetNoteId)}" data-graph-relation-type="${escapeHtml(candidate.relationType)}" data-graph-rationale-draft="${escapeHtml(candidate.rationaleDraft)}" data-graph-insight-question-draft="${escapeHtml(candidate.insightQuestionDraft)}">选择这条笔记</button>
                  <button class="graph-selection-action is-quiet" type="button" data-graph-preview-candidate="${escapeHtml(candidate.counterpartNoteId || candidate.targetNoteId)}" data-graph-preview-source="${escapeHtml(candidate.sourceNoteId)}">预览目标</button>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderGraphAiConnectCandidates(noteId = "", { nodeMap = new Map(), edges = [], hideEmpty = false } = {}) {
  const aiCandidates = graphAiRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 5 });
  const localCandidates = graphLocalRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 5 });
  const blockedPairKeys = graphBlockedAiRelationPairKeysForNote(noteId);
  const candidates = graphMergeRelationCandidatesForDisplay(aiCandidates, localCandidates, { limit: 6, blockedPairKeys });
  const hasAnalysis = Boolean(graphAiAnalysisPayload()?.analysisMode || graphAiAnalysisPayload()?.relationCandidates || graphAiAnalysisPayload()?.bridgeCandidates);
  const loading = graphState.aiAnalysisLoading === true;
  if (!candidates.length) {
    if (hideEmpty && !loading) return "";
    return `
      <section class="graph-ai-connect ${hasAnalysis ? "is-empty" : ""}" aria-label="可能相关笔记">
        <div class="graph-ai-connect-head">
          <strong>可能相关笔记</strong>
          <span>${loading ? "查找中" : hasAnalysis ? "暂时没有" : "还没查找"}</span>
        </div>
        <p>${loading ? "正在从当前图谱范围内查找可以连接的笔记。" : hasAnalysis ? "暂时没有清楚的相关笔记。可以手动搜索，或先把这条笔记的中心判断写清楚。" : "点击“查找可能关联”后，系统会列出可能相关的笔记；只有你保存后才会写入正式关系。"}</p>
      </section>
    `;
  }
  return `
    <section class="graph-ai-connect" aria-label="可能相关笔记">
      <div class="graph-ai-connect-head">
        <strong>可能相关笔记</strong>
        <span>${candidates.length} 个可选目标</span>
      </div>
      <p>从这里挑一条真正相关的笔记。能说清“为什么相连”再保存。</p>
      <div class="graph-ai-connect-list">
        ${candidates
          .map(
            (candidate) => {
              const needsConfirmation = candidate.aiNeedsConfirmation === true || graphPotentialRelationNeedsConfirmation(candidate);
              const isLocal = candidate.candidateSource === "local";
              const currentNoteId = String(noteId || "").trim();
              const aiTargetNoteId = String(candidate.counterpartNoteId || candidate.actionTargetNoteId || candidate.targetNoteId || "").trim();
              const applyAttrs = isLocal
                ? `data-graph-relation-candidate-apply data-open-note="${escapeHtml(candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(candidate.targetNoteId)}"`
                : `data-graph-ai-candidate-apply data-open-note="${escapeHtml(currentNoteId || candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(aiTargetNoteId)}"`;
              return `
                <article class="graph-ai-connect-card">
                  <div class="graph-ai-connect-card-head">
                    <span>${escapeHtml(isLocal ? "本地推荐" : "AI 推荐")}</span>
                    <strong>${escapeHtml(candidate.counterpartTitle || candidate.targetTitle)}</strong>
                    <small>${escapeHtml(candidate.relationLabel)} · ${escapeHtml(graphAiConfidenceLabel(candidate.confidence))}${candidate.componentBridge ? " · 可连接两组笔记" : ""}</small>
                  </div>
                  <p>${escapeHtml(graphCandidateEvidenceText(candidate))}</p>
                  <details class="graph-candidate-details">
                    <summary>查看依据</summary>
                    ${renderGraphCandidateReviewRows(candidate, { aiCandidate: !isLocal })}
                  </details>
                  <div class="graph-ai-connect-actions">
                    <button class="graph-selection-action is-primary" type="button" ${applyAttrs} data-graph-relation-type="${escapeHtml(candidate.relationType)}" data-graph-rationale-draft="${escapeHtml(candidate.rationaleDraft)}" data-graph-insight-question-draft="${escapeHtml(candidate.insightQuestionDraft)}">选择这条笔记</button>
                    ${
                      !isLocal && needsConfirmation
                        ? `<button class="graph-selection-action is-ai" type="button" data-graph-ai-refine-confirm data-graph-candidate-id="${escapeHtml(candidate.id)}" data-graph-source-note="${escapeHtml(candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(candidate.targetNoteId)}">生成理由</button>`
                        : !isLocal && candidate.aiError
                        ? `<button class="graph-selection-action is-ai" type="button" data-graph-ai-refine-retry data-graph-candidate-id="${escapeHtml(candidate.id)}" data-graph-source-note="${escapeHtml(candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(candidate.targetNoteId)}">重新生成理由</button>`
                        : ""
                    }
                    <button class="graph-selection-action is-quiet" type="button" data-graph-preview-candidate="${escapeHtml(candidate.counterpartNoteId || candidate.targetNoteId)}" data-graph-preview-source="${escapeHtml(noteId)}">预览目标</button>
                  </div>
                </article>
              `;
            }
          )
          .join("")}
      </div>
    </section>
  `;
}






const graphRelationWorkspaceRuntime = createGraphRelationWorkspaceRuntime(graphResidualRuntimeDeps({
  graphRelationGroupCounts,
  graphNodeTitle,
  renderGraphSelectionMetrics
}));
const {
  graphWorkspaceRenderDeps,
  graphThemeCandidateNoteIdsForNode,
  renderGraphRelationWorkspaceForNote,
  renderGraphThemeIndexWorkspace,
  graphRelationFormTypeOptions,
  graphCandidatePercent,
  graphManualRelationTargetsForNote
} = graphRelationWorkspaceRuntime;
const graphIsolatedWorkspaceRuntime = createGraphIsolatedWorkspaceRuntime(graphResidualRuntimeDeps({
  graphAiRelationCandidatesForNote,
  graphCandidatePercent,
  graphFullNoteById,
  graphManualRelationTargetsForNote,
  graphRelationFormTypeOptions,
  graphRelationRationaleIsActionable,
  graphThemeCandidateNoteIdsForNode,
  resolveGraphIsolatedSelection,
  renderGraphIsolatedPreviewPanel
}));
const {
  graphIsolatedDecisionMeta,
  openGraphIsolatedDecisionAction,
  loadGraphEditableNote,
  saveGraphIsolatedDecision,
  graphRelationSaveController,
  graphRelationWorkflowController,
  graphAiAnalysisPayload,
  graphAiConfidenceLabel,
  graphNoteIdFromIsolatedItem,
  graphComputedIsolatedNotes,
  graphMarkIsolatedNodes,
  graphIsolatedQueueItems,
  graphNextIsolatedQueueItem,
  renderGraphIsolatedQueue,
  renderGraphIsolatedQueueStrip,
  clearGraphIsolatedRelationDraft,
  graphIsolatedRelationDraftForNote,
  captureGraphIsolatedRelationDraftFromForm,
  renderGraphIsolatedJoinNetworkFlow,
  renderGraphIsolatedNextStepActions,
  graphIsolatedWorkflowTabKey,
  graphIsolatedDecisionMode,
  graphIsolatedDecisionTitle,
  graphExtractMarkdownSection,
  graphUpsertMarkdownSection,
  graphIsolatedDecisionDefaultText,
  graphNoteHasSavedIsolationDisposition,
  renderGraphIsolatedDecisionForm,
  graphIsolatedWorkflowActiveTab,
  setGraphIsolatedWorkflowActiveTab,
  graphIsolatedWorkflowShell,
  renderGraphIsolatedWorkflowTabs,
  activateGraphIsolatedWorkflowTab,
  moveGraphIsolatedWorkflowTab,
  previewGraphCandidateInOverlay,
  clearGraphCandidatePreviewInOverlay,
  graphIsolatedFormError,
  markGraphIsolatedRationaleUserEdited,
  updateGraphIsolatedInlinePreview,
  syncGraphIsolatedAiCandidateForm,
  filterGraphManualRelationTargets,
  pickGraphManualRelationTarget,
  saveGraphIsolatedRelationForm,
  saveGraphConfirmedRelation,
  openGraphRelationFormInSelection,
  focusGraphRelationAdjustmentInPlace
} = graphIsolatedWorkspaceRuntime;
const graphSelectionResidualView = createGraphSelectionResidualView(graphResidualRuntimeDeps({
  graphFullNoteById,
  graphIsolatedWorkflowShell,
  graphRelationFormTypeOptions,
  graphSelectionPanelRenderer: undefined,
  graphThemeCandidateNoteIdsForNode,
  renderGraphSelectionShell,
  renderGraphAiConnectCandidates,
  renderGraphIsolatedJoinNetworkFlow,
  renderGraphRelationWorkspaceForNote
}));
const {
  renderGraphIsolatedSelectionPanel,
  renderGraphIsolatedCompletePanel,
  renderGraphRelationFormSelectionPanel,
  renderGraphBridgeSelectionPanel,
  graphUniqueClusterMeta,
  graphClusterResearchMeta,
  renderGraphClusterSelectionPanel,
  graphResearchNavigatorState,
  renderGraphResearchNavigatorPanel,
  graphSelectionPanelRenderer,
  renderGraphSelectionPanel
} = graphSelectionResidualView;
function graphEdgeVisibleAtFit(edge = {}, nodeMap = new Map(), options = {}) {
  return graphEdgeVisibleAtFitForRuntime(edge, nodeMap, options, { graphRelationVisual });
}

function graphEdgeShouldRender(options = {}) {
  return graphEdgeShouldRenderForRuntime(options, { graphViewModeForRelationType });
}

function renderGraphStarfield(layoutWidth = 0, layoutHeight = 0, seed = "") {
  return renderGraphStarfieldView(layoutWidth, layoutHeight, seed, { hash: graphHash });
}

function renderGraphNebulaField(layoutWidth = 0, layoutHeight = 0, seed = "") {
  return renderGraphNebulaFieldView(layoutWidth, layoutHeight, seed, { hash: graphHash, escapeHtml });
}

function renderGraphClusterGlow(clusterMeta = []) {
  return renderGraphClusterGlowView(clusterMeta, {
    escapeHtml,
    formatSummaryLabel: (title) => `查看主题群摘要：${title || "未命名主题群"}`
  });
}

function graphBuildVisualLayout(nodes = [], edges = [], options = {}) {
  return graphBuildVisualLayoutForRuntime(nodes, edges, options, {
    graphHash,
    graphNodeStarTier,
    graphNodeRadiusByTier
  });
}
function graphEdgePath(edge, nodeMap) {
  return graphEdgePathForRuntime(edge, nodeMap, { graphRelationVisual });
}

function graphThemeBoundaryMeta(options = {}) {
  return graphThemeBoundaryMetaForRuntime(options, { graphThinkingCleanIds });
}

function renderGraphThemeBoundary(boundary = null) {
  return renderGraphThemeBoundaryForRuntime(boundary, { escapeHtml });
}

function graphScopeDirectoryId() {
  return graphScopeDirectoryIdForRuntime(state, {
    graphOriginalScopeDirectoryId: GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID,
    isDirectoryUnderOriginalRoot
  });
}

function graphLoadedScopeCoversDirectory(scopeDirectoryId = "") {
  return graphLoadedScopeCoversDirectoryForRuntime(graphState, scopeDirectoryId, { descendantDirectoryIds });
}

function expandGraphBrowserTree() {
  if (typeof explorer === "undefined" || !explorer) return;
  explorer.expandFolderPath(GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID);
  const topLevelFolders = state.folders.filter(
    (folder) => !folder.hidden && String(folder.parentId || "").trim() === GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID
  );
  topLevelFolders.forEach((folder) => explorer.expandedFolders.add(folder.id));
  const scopedFolderId = graphScopeDirectoryId();
  if (scopedFolderId) explorer.expandFolderPath(scopedFolderId);
}

function graphScopedItems(graph) {
  return graphScopedItemsForRuntime(graph, {
    scopeDirectoryId: graphScopeDirectoryId(),
    focusedNoteId: state.selectedFileId,
    notes: state.notes
  }, {
    descendantDirectoryIds,
    typeFromFolder: (folderId) => typeFromFolder(state, folderId)
  });
}

function graphFocusedItems(nodes = [], edges = [], allNodes = nodes, traversalEdges = edges) {
  return graphFocusedItemsForRuntime(nodes, edges, allNodes, traversalEdges, {
    focusedNoteId: state.selectedFileId,
    focusDepth: graphState.focusDepth
  }, {
    normalizeGraphFocusDepth
  });
}

function graphBuildFocusedRelationTypeStats(nodes = [], edges = [], allNodes = nodes, filters = {}) {
  return graphBuildFocusedRelationTypeStatsForRuntime(nodes, edges, allNodes, filters, {
    focusedNoteId: state.selectedFileId,
    focusDepth: graphState.focusDepth
  }, {
    normalizeGraphRelationTypeFilter,
    graphEdgeMatchesFilters,
    graphFocusedItems: (inputNodes, inputEdges, inputAllNodes, inputTraversalEdges, context) =>
      graphFocusedItemsForRuntime(inputNodes, inputEdges, inputAllNodes, inputTraversalEdges, context, { normalizeGraphFocusDepth }),
    normalizeGraphFocusDepth
  });
}

const graphVisualMapController = createGraphVisualMapController({
  depsProvider: createGraphVisualMapPrototypeDepsProvider(() => ({
    GRAPH_RELATION_GROUP_META,
    GRAPH_RELATION_MARKER_COLORS,
    GRAPH_VISUAL_ZOOM_OPTIONS,
    escapeHtml,
    graphBuildReadingLensState,
    graphBuildVisualLayout,
    graphClusterGlow: renderGraphClusterGlow,
    graphDenseGalaxyMode,
    graphEdgePath,
    graphEdgeSelectionKey,
    graphEdgeShouldRender,
    graphEdgeVisibleAtFit,
    graphFocusContextPanel: renderGraphFocusContextPanel,
    graphFocusDepthMeta,
    graphIcon: renderGraphIcon,
    graphNebulaField: renderGraphNebulaField,
    graphNodeAttentionReasons,
    graphNodeClass,
    graphNodeNeedsRelationWorkflow,
    graphNodeShowsAsPoint,
    graphNodeStarRank,
    graphReadingLensControls: renderGraphReadingLensControls,
    graphReadingLensMeta,
    graphReadingModeMeta,
    graphRelationGroupMeta,
    graphRelationSourceLabel,
    graphRelationTypeFilter: renderGraphRelationTypeFilter,
    graphRelationTypeLabel,
    graphRelationVisual,
    graphResearchNavigatorEntry: renderGraphResearchNavigatorEntry,
    graphResearchNavigatorPanel: renderGraphResearchNavigatorPanel,
    graphSelectionPanel: renderGraphSelectionPanel,
    graphShortTitle,
    graphStarfield: renderGraphStarfield,
    graphState,
    graphViewModeForRelationType,
    graphViewModeSwitcher: renderGraphViewModeSwitcher,
    graphZoomOption,
    normalizeGraphSelectionForVisibleItems,
    noteTypeLabel,
    shouldShowGraphDensityHint,
    graphThemeBoundary: renderGraphThemeBoundary,
    graphThemeBoundaryMeta
  }))
});
const {
  renderGraphVisualMap
} = graphVisualMapController;

function graphFocusedEdgeDirection(edge, focusedNoteId = "") {
  const focusedId = String(focusedNoteId || "").trim();
  if (!focusedId) return "相关";
  return String(edge?.fromNoteId || "").trim() === focusedId ? "当前指向" : "指向当前";
}

function graphFocusedCounterpartTitle(edge, focusedNoteId = "", nodeMap = new Map()) {
  const focusedId = String(focusedNoteId || "").trim();
  const counterpartId =
    String(edge?.fromNoteId || "").trim() === focusedId ? String(edge?.toNoteId || "").trim() : String(edge?.fromNoteId || "").trim();
  return {
    counterpartId,
    counterpartTitle: graphNodeTitle(nodeMap, counterpartId, counterpartId || "相关笔记")
  };
}

function graphFocusCardActionMeta(edge = {}, contextMode = "argument") {
  return computeGraphFocusCardActionMeta(edge, contextMode);
}

function renderGraphFocusContextPanel({ focusedNoteId = "", nodeMap = new Map(), edges = [] } = {}) {
  return renderGraphFocusContextPanelView({
    focusedNoteId,
    nodeMap,
    edges,
    focusContextMode: graphState.focusContextMode,
    focusContextHelpOpen: graphState.focusContextHelpOpen === true
  }, {
    escapeHtml,
    renderGraphIcon,
    graphNodeTitle,
    graphFocusContextModeMeta,
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationVisual,
    graphFocusedCounterpartTitle,
    graphRelationTypeLabel,
    graphFocusedEdgeDirection,
    graphRelationSourceLabel,
    graphFocusCardActionMeta,
    relationGroupMeta: GRAPH_RELATION_GROUP_META
  });
}
function resetGraphHoverState() {
  return resetGraphHoverDomState({ document, getHoverCard: () => $("graphHoverCard") });
}

function openGraphSelection(selection = null) {
  if (!selection || !String(selection?.kind || "").trim()) return;
  graphState.selection = selection;
  graphState.thinkingPanelOpen = false;
  resetGraphHoverState();
  renderGraphPanel();
}

function openGraphNodeSelectionFromElement(element = null) {
  const nodeId = String(element?.getAttribute?.("data-graph-select-node") || element?.getAttribute?.("data-node-id") || "").trim();
  if (!nodeId) return false;
  const title = String(element?.getAttribute?.("data-node-title") || nodeId).trim() || nodeId;
  const isolatedKey = String(element?.getAttribute?.("data-graph-isolated-key") || "").trim();
  if (isolatedKey || graphNodeNeedsRelationWorkflowFromCurrentGraph(nodeId)) {
    openGraphSelection({
      kind: "isolated",
      ...(isolatedKey ? { isolatedKey } : {}),
      noteId: nodeId
    });
    setStatus(`已打开待关联笔记整理：${title}`, "ok");
    return true;
  }
  openGraphSelection({ kind: "node", nodeId });
  setStatus(`已选中笔记角色：${title}`, "ok");
  return true;
}

function applyGraphThinkingHoverState(thinkingElement) {
  return applyGraphThinkingHoverDomState(thinkingElement, {
    document,
    getHoverCard: () => $("graphHoverCard"),
    resetHoverState: resetGraphHoverState,
    escapeHtml
  });
}

function applyGraphNodeHoverState(nodeElement) {
  return applyGraphNodeHoverDomState(nodeElement, { document, getHoverCard: () => $("graphHoverCard"), escapeHtml });
}

function applyGraphEdgeHoverState(edgeElement) {
  return applyGraphEdgeHoverDomState(edgeElement, { document, getHoverCard: () => $("graphHoverCard"), escapeHtml });
}

const graphThinkingPanelResidualView = createGraphThinkingPanelResidualView(graphResidualRuntimeDeps({
  graphComputedIsolatedNotes,
  graphExistingRelationPairKeys,
  graphIsolatedQueueItems,
  graphNoteHasSavedIsolationDisposition,
  graphNoteIdFromIsolatedItem
}));
const {
  renderRelationReviewQueueSection,
  renderGraphMetricCard,
  graphPendingAiCandidateCount,
  graphLiveAiAnalysisCounts,
  graphAiAnalysisSummaryState,
  currentGraphVisibleNodeIds,
  currentGraphWritingCandidateNoteIds,
  renderGraphMapPreview,
  renderGraphAiAnalysisCard,
  buildGraphQuestionSpotSummary,
  buildGraphQuestionSpotSummaryFromItems,
  renderGraphQuestionSpotChip,
  graphThinkingFilterMeta,
  graphCompactActionLabel,
  graphThinkingNoteTitle,
  graphThinkingCleanIds,
  graphThinkingHighlightAttrs,
  graphSelectEdgeActionAttrs,
  buildGraphThinkingItems,
  graphNodeIdsInScope,
  graphRelationInNodeScope,
  graphRelationTouchesNodeScope,
  graphCandidateTouchesNodeScope,
  graphBridgeGapInNodeScope,
  graphConflictItemInNodeScope,
  graphReviewQueueInNodeScope,
  graphMergeRelationsByKey,
  renderGraphThinkingItems,
  renderGraphWorkbenchPriorityQueue,
  renderGraphThinkingReviewNote,
  renderGraphThinkingPanelContent,
  renderGraphThinkingPanel,
  renderGraphWorkbenchPanel,
  renderGraphUtilityDrawer,
  graphSummaryModeNote
} = graphThinkingPanelResidualView;
  return {
    renderGraphIcon,
    setGraphFocusDepth,
    setGraphFocusContextMode,
    renderGraphOrientation,
    graphNodeTitle,
    graphEdgeTitle,
    buildGraphInsightCoach,
    renderGraphInsightCoach,
    renderGraphBridgeGapSection,
    graphWeakRelationClues,
    renderGraphWeakRelationClueSection,
    graphRelationFilterOptionsDepsForRuntime,
    graphFilterOptions,
    graphLocalizedActionText,
    graphReadingLensMeta,
    renderGraphReadingLensControls,
    graphWorkbenchTabMeta,
    graphClueSummaryState,
    renderGraphWorkbenchEntryPills,
    renderGraphResearchNavigatorEntry,
    graphLoadErrorMessage,
    renderGraphErrorState,
    renderGraphInlineNotice,
    graphEdgeMatchesFilters,
    graphThemeTitleLooksGeneric,
    graphThemeBreadthMeta,
    resolveGraphThemeSelection,
    resolveGraphIsolatedSelection,
    resolveGraphBridgeSelection,
    graphBuildIsolatedVisualNodes,
    normalizeGraphSelectionForVisibleItems,
    graphRelationGroupCounts,
    graphNodeRoleMeta,
    graphNodeInsightMeta,
    renderGraphNodeInsightPanel,
    graphEdgeReviewMeta,
    graphEdgeRationaleLooksComplex,
    graphEdgeAdjustmentPlan,
    renderGraphSelectionMetrics,
    graphSafeActionAttrs,
    renderGraphSelectionTask,
    renderGraphPromptDetails,
    renderGraphSelectionShell,
    graphThemeMaturityMeta,
    graphThemeCandidateQualityMeta,
    graphRankThemeCandidates,
    renderGraphThemeSelectionPanel,
    graphIsolatedDecisionMeta,
    openGraphIsolatedDecisionAction,
    loadGraphEditableNote,
    saveGraphIsolatedDecision,
    graphRelationSaveController,
    graphRelationWorkflowController,
    graphAiAnalysisPayload,
    graphAiConfidenceLabel,
    graphNoteIdFromIsolatedItem,
    graphComputedIsolatedNotes,
    graphMarkIsolatedNodes,
    graphIsolatedQueueItems,
    graphNextIsolatedQueueItem,
    renderGraphIsolatedQueue,
    renderGraphIsolatedQueueStrip,
    graphRelationCandidateKey,
    graphRelationPairKey,
    graphCandidateEndpointIds,
    graphCandidateCountKey,
    graphRelationStatusKey,
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationStatusCountsAsConfirmedEdge,
    graphDirectConfirmedRelationCount,
    graphNodeNeedsRelationWorkflow,
    graphNodeNeedsRelationWorkflowFromCurrentGraph,
    graphExistingRelationKeys,
    graphExistingRelationPairKeys,
    graphPreferredPotentialRelationType,
    graphCandidateBlocksFormalRelation,
    graphCandidateCanSaveRelation,
    graphRelationRationaleIsActionable,
    graphPotentialRelationNodeMap,
    graphPotentialRelationActionEndpoints,
    graphPotentialRelationEvidenceText,
    graphPotentialRelationRationaleDraft,
    graphDecoratePotentialRelationCandidate,
    graphCandidateRelationReviewQuestion,
    graphCandidateRelationVerdict,
    graphCandidateLocalReason,
    renderGraphCandidateReviewRows,
    graphPotentialRelationMatchKey,
    graphPotentialRelationNeedsConfirmation,
    graphFindPotentialRelationCandidate,
    graphAiRelationCandidatesForNote,
    graphReviewSummaryFromAnalysis,
    mergePotentialRelationCandidateIntoGraphAnalysis,
    removePotentialRelationCandidateFromGraphAnalysis,
    graphAiConnectRuntimeController,
    refineGraphPotentialRelationsForNote,
    refineGraphPotentialRelationCandidate,
    graphNoteTags,
    graphTitleCharacterOverlap,
    graphLocalRelationCandidatesForNote,
    graphCandidateSourceLabel,
    graphCandidateUndirectedPairKey,
    graphBlockedAiRelationPairKeysForNote,
    graphCandidateEvidenceText,
    graphMergeRelationCandidatesForDisplay,
    graphNotePreviewText,
    graphFullNoteById,
    graphIsolatedPreviewTarget,
    renderGraphIsolatedPreviewPanel,
    renderGraphRelationCandidateCards,
    renderGraphAiConnectCandidates,
    graphWorkspaceRenderDeps,
    graphThemeCandidateNoteIdsForNode,
    renderGraphRelationWorkspaceForNote,
    renderGraphThemeIndexWorkspace,
    graphRelationFormTypeOptions,
    graphCandidatePercent,
    graphManualRelationTargetsForNote,
    clearGraphIsolatedRelationDraft,
    graphIsolatedRelationDraftForNote,
    captureGraphIsolatedRelationDraftFromForm,
    renderGraphIsolatedJoinNetworkFlow,
    renderGraphIsolatedNextStepActions,
    graphIsolatedWorkflowTabKey,
    graphIsolatedDecisionMode,
    graphIsolatedDecisionTitle,
    graphExtractMarkdownSection,
    graphUpsertMarkdownSection,
    graphIsolatedDecisionDefaultText,
    graphNoteHasSavedIsolationDisposition,
    renderGraphIsolatedDecisionForm,
    graphIsolatedWorkflowActiveTab,
    setGraphIsolatedWorkflowActiveTab,
    renderGraphIsolatedWorkflowTabs,
    activateGraphIsolatedWorkflowTab,
    moveGraphIsolatedWorkflowTab,
    previewGraphCandidateInOverlay,
    clearGraphCandidatePreviewInOverlay,
    graphIsolatedFormError,
    markGraphIsolatedRationaleUserEdited,
    updateGraphIsolatedInlinePreview,
    syncGraphIsolatedAiCandidateForm,
    filterGraphManualRelationTargets,
    pickGraphManualRelationTarget,
    saveGraphIsolatedRelationForm,
    saveGraphConfirmedRelation,
    openGraphRelationFormInSelection,
    focusGraphRelationAdjustmentInPlace,
    renderGraphIsolatedSelectionPanel,
    renderGraphIsolatedCompletePanel,
    renderGraphRelationFormSelectionPanel,
    renderGraphBridgeSelectionPanel,
    graphUniqueClusterMeta,
    graphClusterResearchMeta,
    renderGraphClusterSelectionPanel,
    graphResearchNavigatorState,
    renderGraphResearchNavigatorPanel,
    graphEdgeVisibleAtFit,
    graphEdgeShouldRender,
    renderGraphStarfield,
    renderGraphNebulaField,
    renderGraphClusterGlow,
    graphBuildVisualLayout,
    graphEdgePath,
    graphThemeBoundaryMeta,
    renderGraphThemeBoundary,
    graphScopeDirectoryId,
    graphLoadedScopeCoversDirectory,
    expandGraphBrowserTree,
    graphScopedItems,
    graphFocusedItems,
    graphBuildFocusedRelationTypeStats,
    graphFocusedEdgeDirection,
    graphFocusedCounterpartTitle,
    graphFocusCardActionMeta,
    renderGraphFocusContextPanel,
    resetGraphHoverState,
    openGraphSelection,
    openGraphNodeSelectionFromElement,
    applyGraphThinkingHoverState,
    applyGraphNodeHoverState,
    applyGraphEdgeHoverState,
    renderRelationReviewQueueSection,
    renderGraphMetricCard,
    graphPendingAiCandidateCount,
    graphLiveAiAnalysisCounts,
    graphAiAnalysisSummaryState,
    currentGraphVisibleNodeIds,
    currentGraphWritingCandidateNoteIds,
    renderGraphMapPreview,
    renderGraphAiAnalysisCard,
    renderGraphVisualMap,
    buildGraphQuestionSpotSummary,
    buildGraphQuestionSpotSummaryFromItems,
    renderGraphQuestionSpotChip,
    graphThinkingFilterMeta,
    graphCompactActionLabel,
    graphThinkingNoteTitle,
    graphThinkingCleanIds,
    graphThinkingHighlightAttrs,
    graphSelectEdgeActionAttrs,
    buildGraphThinkingItems,
    graphNodeIdsInScope,
    graphRelationInNodeScope,
    graphRelationTouchesNodeScope,
    graphCandidateTouchesNodeScope,
    graphBridgeGapInNodeScope,
    graphConflictItemInNodeScope,
    graphReviewQueueInNodeScope,
    graphMergeRelationsByKey,
    renderGraphThinkingItems,
    renderGraphWorkbenchPriorityQueue,
    renderGraphThinkingReviewNote,
    renderGraphThinkingPanelContent,
    renderGraphThinkingPanel,
    renderGraphWorkbenchPanel,
    renderGraphUtilityDrawer,
    graphSummaryModeNote
  };
}
