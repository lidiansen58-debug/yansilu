export function createGraphIsolatedWorkspaceRuntime(deps = {}) {
  const {
    GRAPH_CONFIRMABLE_RELATION_TYPES,
    GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES,
    computeGraphCandidatePercent,
    computeGraphDirectNetworkEdgeCount,
    computeGraphManualRelationTargetsForNote,
    computeGraphThemeCandidateNoteIdsForNode,
    buildGraphWorkspaceRenderDeps,
    renderGraphRelationWorkspaceMarkup,
    renderGraphThemeIndexWorkspaceMarkup,
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationGroupCounts,
    graphNodeTitle,
    suggestedThemeIndexTitle,
    graphEdgeSelectionKey,
    graphRelationTypeLabel,
    renderGraphSelectionMetrics,
    escapeHtml,
    noteTypeLabel,
    graphState,
    state,
    graphAiRelationCandidatesForNote,
    graphFullNoteById,
    graphNotePreviewText,
    graphNoteTags,
    graphRelationRationaleIsActionable,
    graphRelationSaveResultForNote,
    graphPotentialRelationNeedsConfirmation,
    graphCandidateEvidenceText,
    renderGraphCandidateReviewRows,
    graphBlockedAiRelationPairKeysForNote,
    graphMergeRelationCandidatesForDisplay,
    graphLocalRelationCandidatesForNote,
    renderGraphAiConnectCandidates,
    graphThemeCandidateNoteIdsForNode,
    graphRelationFormTypeOptions,
    graphCandidatePercent,
    graphManualRelationTargetsForNote,
    renderGraphIsolatedPreviewPanel,
    renderGraphIsolatedJoinNetworkFlowHtml,
    renderGraphIsolatedNextStepActionsHtml,
    clearGraphIsolatedRelationDraftForState,
    createGraphRelationSaveController,
    createGraphRelationWorkflowController,
    createGraphIsolatedRelationController,
    createGraphIsolatedWorkflowShellRenderer,
    createGraphIsolatedDecisionController,
    createNoteRelation,
    refreshDirectoryGraph,
    renderGraphPanel,
    setStatus,
    openGraphSelection,
    openNote,
    saveNote,
    graphComputedIsolatedNotesForGraph,
    graphIsolatedQueueItemsForGraph,
    graphMarkIsolatedNodesForGraph,
    computeGraphNextIsolatedQueueItem,
    computeGraphNoteIdFromIsolatedItem,
    renderGraphIsolatedQueueHtml,
    renderGraphIsolatedQueueStripHtml,
    writeStoredText,
    document,
    $,
    renderGraphClusterSelectionPanelView,
    computeGraphUniqueClusterMeta,
    computeGraphClusterResearchMeta,
    computeGraphResearchNavigatorState,
    renderGraphResearchNavigatorPanelView,
    createGraphSelectionPanelRenderer,
    renderGraphThemeSelectionPanel,
    normalizeGraphSelectionForVisibleItems,
    graphNodeNeedsRelationWorkflow,
    graphNodeRoleMeta,
    graphNodeInsightMeta,
    renderGraphNodeInsightPanel,
    renderGraphRelationWorkspaceForNote,
    renderGraphPromptDetails,
    renderGraphSelectionShell,
    graphRelationGroupMeta,
    graphEdgeReviewMeta,
    graphEdgeAdjustmentPlan,
    graphFocusCardActionMeta,
    graphRelationSourceLabel,
    graphRelationStatusLabel,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    renderRelationReviewQueueSectionView,
    computeGraphPendingAiCandidateCount,
    createGraphThinkingModelRuntimeDepsProvider,
    graphAiAnalysisSummaryStateForGraph,
    graphLiveAiAnalysisCountsForGraph,
    buildGraphQuestionSpotSummaryForGraph,
    computeGraphQuestionSpotSummaryFromItems,
    buildGraphThinkingItemsForGraph,
    computeGraphThinkingNoteTitle,
    computeGraphThinkingCleanIds,
    graphThinkingHighlightAttrsForItem,
    renderGraphMapPreviewView,
    renderGraphThinkingItemsView,
    renderGraphWorkbenchPriorityQueueView,
    renderGraphThinkingReviewNoteView,
    renderGraphThinkingPanelContentView,
    renderGraphThinkingPanelView,
    renderGraphWorkbenchPanelView,
    renderGraphUtilityDrawerView,
    graphRelationQualityLabel,
    graphRelationReviewReasonLabel,
    graphBridgeSelectionKey,
    graphCandidateCanSaveRelation,
    graphCandidateEndpointIds,
    graphCandidateTouchesNodeScope,
    graphExistingRelationPairKeys,
    graphIsolatedSelectionKey,
    graphLocalizedActionText,
    graphNodeIdsInScope,
    graphPendingAiCandidateCount,
    graphPreferredPotentialRelationType,
    graphRankThemeCandidates,
    graphRelationPairKey,
    graphSelectEdgeActionAttrs,
    graphThemeSelectionKey,
    graphRelationInNodeScope,
    graphRelationTouchesNodeScope,
    graphBridgeGapInNodeScope,
    graphConflictItemInNodeScope,
    graphReviewQueueInNodeScope,
    graphEdgeMatchesFilters,
    writingKnownNoteById,
    isWritingEligibleNote,
    graphWritingCandidateNoteIds,
    GRAPH_CONFLICT_RELATION_TYPES,
  } = deps;

function graphIsolatedDecisionMeta(isolated = {}, note = {}) {
  const thesis = String(isolated?.thesis || note?.thesis || "").trim();
  const body = String(note?.body || note?.content || "").trim();
  const suggestedAction = String(isolated?.suggestedAction || isolated?.suggested_action || "").trim().toLowerCase();
  const hasClearThesis = thesis.length >= 18;
  const hasEnoughMaterial = body.length >= 320 || thesis.length >= 42;
  if (hasClearThesis && hasEnoughMaterial && suggestedAction !== "review_missing_relations") {
    return {
      label: "可先保留独立",
      tone: "keep",
      detail: "它可能是一条尚未进入主题的独立观察。现在不必强行连线，先保留它的清晰判断，再等新材料靠近。",
      next: "给它补一句“暂时独立的理由”，避免日后误判成遗漏关系。"
    };
  }
  if (hasClearThesis) {
    return {
      label: "优先寻找桥接",
      tone: "bridge",
      detail: "它已经有可读判断，但没有进入关系结构。最值得做的是找一条真实桥接，而不是随便连到相似标题。",
      next: "先问：它能支撑哪个观点、限制哪个主题，或给哪个问题提供反例？"
    };
  }
  if (body.length < 160 && thesis.length < 12) {
    return {
      label: "暂存观察",
      tone: "hold",
      detail: "它现在更像材料或灵感片段，还未形成永久笔记应有的判断。先暂存，不急着连进图谱。",
      next: "补一句自己的判断：这条笔记到底想说明什么？"
    };
  }
  return {
    label: "先重写判断",
    tone: "rewrite",
    detail: "它有一些内容，但图谱还读不出稳定角色。比起连线，先把中心判断写清楚更有价值。",
    next: "把它改写成一句可被支持、反驳或限定的判断。"
  };
}

function openGraphIsolatedDecisionAction(noteId = "", action = "") {
  const cleanNoteId = String(noteId || "").trim();
  const cleanAction = String(action || "").trim().toLowerCase();
  if (!cleanNoteId) return false;
  if (cleanAction === "bridge") {
    setGraphIsolatedWorkflowActiveTab(cleanNoteId, "candidates");
    renderGraphPanel();
    setStatus("已切到候选关联；先找一条能说明理由的关系，保存后再处理下一条", "ok");
    return true;
  }
  setGraphIsolatedWorkflowActiveTab(cleanNoteId, "hold");
  renderGraphPanel();
  const messages = {
    keep: "当前浮层已切到保留独立：暂不强行连线，可以继续处理下一条",
    hold: "当前浮层已切到暂存观察：等这条笔记形成更清楚判断后再关联",
    rewrite: "当前浮层已切到重写判断：先把中心判断写清楚，再回来找关系"
  };
  setStatus(messages[cleanAction] || "已在浮窗内记录处理方向", cleanAction === "hold" ? "warn" : "ok", {
    priority: 2,
    holdMs: 3600
  });
  return true;
}

async function loadGraphEditableNote(noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return null;
  let note = state.notes.find((item) => String(item?.id || "").trim() === cleanNoteId) || null;
  if (note && (note.bodyLoaded || isLocalOnlyNote(note))) return note;
  try {
    const full = await fetchNote(cleanNoteId);
    if (!full) return note;
    const mapped = mapNoteItem(full);
    note = note || mapped;
    Object.assign(note, mapped, { bodyLoaded: typeof full.body === "string" });
    if (!state.notes.some((item) => item.id === cleanNoteId)) state.notes.unshift(note);
  } catch (error) {
    setStatus(`读取笔记失败：${String(error?.message || error)}`, "bad");
  }
  return note;
}

const graphIsolatedDecisionController = createGraphIsolatedDecisionController(() => ({
  document,
  ensureEditableNoteBody,
  graphIsolatedDecisionMode,
  graphIsolatedDecisionTitle,
  graphUpsertMarkdownSection,
  isLocalOnlyNote,
  loadGraphEditableNote,
  mapNoteItem,
  noteTabFor,
  parseLinks,
  parseTags,
  renderGraphPanel,
  setGraphIsolatedWorkflowActiveTab,
  setStatus,
  updateNote
}));

async function saveGraphIsolatedDecision(button = null) {
  return graphIsolatedDecisionController.saveGraphIsolatedDecision(button);
}

function graphAiAnalysisPayload(result = graphState.aiAnalysis) {
  if (result?.analysis && typeof result.analysis === "object") return result.analysis;
  return result && typeof result === "object" ? result : {};
}

function graphAiConfidenceLabel(value = null) {
  const score = Number(value);
  if (!Number.isFinite(score) || score <= 0) return "待判断";
  return `${Math.round(Math.max(0, Math.min(score, 1)) * 100)}%`;
}

function graphNoteIdFromIsolatedItem(item = {}) {
  return computeGraphNoteIdFromIsolatedItem(item);
}

function graphComputedIsolatedNotes(nodes = [], edges = [], aiIsolatedNotes = []) {
  return graphComputedIsolatedNotesForGraph(nodes, edges, aiIsolatedNotes, {
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge
  });
}

function graphMarkIsolatedNodes(nodes = [], isolatedNotes = []) {
  return graphMarkIsolatedNodesForGraph(nodes, isolatedNotes, {
    selectionKey: graphIsolatedSelectionKey,
    decisionMeta: graphIsolatedDecisionMeta
  });
}

function graphIsolatedQueueItems({ isolatedNotes = [], nodeMap = new Map(), edges = [], currentNoteId = "", limit = 8 } = {}) {
  return graphIsolatedQueueItemsForGraph({
    isolatedNotes,
    nodeMap,
    edges,
    currentNoteId,
    limit,
    fullNoteById: graphFullNoteById,
    noteHasSavedIsolationDisposition: graphNoteHasSavedIsolationDisposition,
    decisionMeta: graphIsolatedDecisionMeta,
    aiRelationCandidatesForNote: graphAiRelationCandidatesForNote,
    localRelationCandidatesForNote: graphLocalRelationCandidatesForNote,
    selectionKey: graphIsolatedSelectionKey
  });
}

function graphNextIsolatedQueueItem(queueItems = [], currentNoteId = "") {
  return computeGraphNextIsolatedQueueItem(queueItems, currentNoteId);
}

function renderGraphIsolatedQueue({ isolatedNotes = [], nodeMap = new Map(), edges = [], currentNoteId = "", compact = false, limit = 8, queueItems: providedQueueItems = null } = {}) {
  return graphIsolatedWorkflowShell.renderQueue({ isolatedNotes, nodeMap, edges, currentNoteId, compact, limit, queueItems: providedQueueItems });
}

function renderGraphIsolatedQueueStrip({ isolatedNotes = [], nodeMap = new Map(), edges = [], currentNoteId = "", queueItems: providedQueueItems = null } = {}) {
  return graphIsolatedWorkflowShell.renderQueueStrip({ isolatedNotes, nodeMap, edges, currentNoteId, queueItems: providedQueueItems });
}


function clearGraphIsolatedRelationDraft(noteId = "") {
  clearGraphIsolatedRelationDraftForState(graphState, noteId);
}

const graphRelationSaveController = createGraphRelationSaveController({
  graphState,
  getNotes: () => state.notes,
  confirmableRelationTypes: GRAPH_CONFIRMABLE_RELATION_TYPES,
  rationaleIsActionable: graphRelationRationaleIsActionable,
  createNoteRelation,
  refreshDirectoryGraph,
  renderGraphPanel,
  setStatus,
  graphNodeTitle,
  relationTypeLabel: graphRelationTypeLabel,
  clearIsolatedRelationDraft: clearGraphIsolatedRelationDraft,
  openRelationFormInSelection: openGraphRelationFormInSelection
});

const graphRelationWorkflowController = createGraphRelationWorkflowController({
  graphState,
  setWorkflowActiveTab: setGraphIsolatedWorkflowActiveTab,
  openGraphSelection,
  renderGraphPanel,
  setStatus
});

const graphIsolatedRelationController = createGraphIsolatedRelationController({
  graphState,
  normalizeMode: graphIsolatedWorkflowTabKey,
  setWorkflowActiveTab: setGraphIsolatedWorkflowActiveTab,
  confirmableRelationTypes: GRAPH_CONFIRMABLE_RELATION_TYPES,
  rationaleIsActionable: graphRelationRationaleIsActionable,
  saveConfirmedRelation: saveGraphConfirmedRelation,
  escapeHtml
});

function graphIsolatedRelationDraftForNote(noteId = "") {
  return graphIsolatedRelationController.relationDraftForNote(noteId);
}

function captureGraphIsolatedRelationDraftFromForm(form = null) {
  return graphIsolatedRelationController.captureDraftFromForm(form);
}

function renderGraphIsolatedJoinNetworkFlow(
  noteId = "",
  {
    nodeMap = new Map(),
    edges = [],
    visibleEdgeCount = 0,
    preferredTargetNoteId = "",
    preferredRelationType = "",
    preferredRationale = "",
    heading = "建立一条能说清理由的关系",
    helper = "先选目标笔记，再选关系类型并写下理由。保存后才会进入图谱。",
    saveHint = "保存后，这条笔记会退出“未关联”。"
  } = {}
) {
  return renderGraphIsolatedJoinNetworkFlowHtml(noteId, {
    nodeMap,
    edges,
    visibleEdgeCount,
    preferredTargetNoteId,
    preferredRelationType,
    preferredRationale,
    heading,
    helper,
    saveHint,
    relationDraft: graphState.isolatedRelationDraftByNoteId?.[String(noteId || "").trim()] || {},
    loading: graphState.aiAnalysisLoading === true
  }, {
    aiCandidatesForNote: graphAiRelationCandidatesForNote,
    manualTargetsForNote: graphManualRelationTargetsForNote,
    aiAnalysisPayload: graphAiAnalysisPayload,
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge,
    workflowTabKey: graphIsolatedWorkflowTabKey,
    activeTabForNote: graphIsolatedWorkflowActiveTab,
    reversibleRelationTypes: GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES,
    nodeTitle: graphNodeTitle,
    escapeHtml,
    candidatePercent: graphCandidatePercent,
    graphFullNoteById,
    noteTypeLabel,
    graphNotePreviewText,
    graphNoteTags,
    relationFormTypeOptions: graphRelationFormTypeOptions,
    renderPreviewPanel: renderGraphIsolatedPreviewPanel
  });
}

function renderGraphIsolatedNextStepActions(noteId = "", { isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) {
  return renderGraphIsolatedNextStepActionsHtml(noteId, { isolatedNotes, nodeMap, edges }, {
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge,
    isolatedQueueItems: graphIsolatedQueueItems,
    nextIsolatedQueueItem: graphNextIsolatedQueueItem,
    themeCandidateNoteIdsForNode: graphThemeCandidateNoteIdsForNode,
    suggestThemeIndexTitle: suggestedThemeIndexTitle,
    escapeHtml
  });
}

function graphIsolatedWorkflowTabKey(value = "") {
  const key = String(value || "").trim().toLowerCase();
  if (key === "candidates" || key === "bridge") return "ai";
  return ["ai", "manual"].includes(key) ? key : "ai";
}

function graphIsolatedDecisionMode(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return ["keep", "hold", "rewrite"].includes(key) ? key : "keep";
}

function graphIsolatedDecisionTitle(mode = "") {
  const key = graphIsolatedDecisionMode(mode);
  if (key === "hold") return "暂存观察";
  if (key === "rewrite") return "重写中心判断";
  return "保留独立";
}

function graphExtractMarkdownSection(body = "", heading = "") {
  const cleanHeading = String(heading || "").trim();
  if (!cleanHeading) return "";
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
  const headingPattern = new RegExp(`^##\\s+${cleanHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (startIndex < 0) return "";
  const sectionLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) break;
    sectionLines.push(lines[index]);
  }
  return sectionLines.join("\n").trim();
}

function graphUpsertMarkdownSection(body = "", heading = "", content = "") {
  const cleanHeading = String(heading || "").trim();
  const cleanContent = String(content || "").replace(/\r\n/g, "\n").trim();
  const normalizedBody = String(body || "").replace(/\r\n/g, "\n").trimEnd();
  if (!cleanHeading || !cleanContent) return normalizedBody;
  const lines = normalizedBody.split("\n");
  const headingPattern = new RegExp(`^##\\s+${cleanHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));
  const replacement = [`## ${cleanHeading}`, "", cleanContent];
  if (startIndex < 0) {
    return `${normalizedBody ? `${normalizedBody}\n\n` : ""}${replacement.join("\n")}`.trimEnd();
  }
  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) {
      endIndex = index;
      break;
    }
  }
  lines.splice(startIndex, endIndex - startIndex, ...replacement);
  return lines.join("\n").trimEnd();
}

function graphIsolatedDecisionDefaultText(note = {}, decisionTone = "") {
  const body = String(note?.body || note?.markdown || "").replace(/\r\n/g, "\n");
  const mode = graphIsolatedDecisionMode(decisionTone);
  if (mode === "rewrite") {
    return graphExtractMarkdownSection(body, "一句话论点") || String(note?.thesis || note?.summary || note?.title || "").trim();
  }
  const saved = graphExtractMarkdownSection(body, "关联整理备注");
  if (saved) return saved;
  if (mode === "hold") return "暂时只作为材料观察；等它形成清楚判断后，再补一条有理由的关系。";
  return "这条笔记暂时保持独立；目前还没有找到能说明理由的关系，不强行连入关系网。";
}

function graphNoteHasSavedIsolationDisposition(note = {}) {
  const body = String(note?.body || note?.markdown || "").replace(/\r\n/g, "\n");
  const disposition = graphExtractMarkdownSection(body, "关联整理备注");
  if (!disposition) return false;
  return /^(保留独立|暂存观察|重写中心判断)[：:]|^已重写中心判断/.test(disposition.trim());
}

function renderGraphIsolatedDecisionForm(noteId = "", { note = {}, decision = {}, decisionCards = [], prompts = [] } = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return "";
  const defaultMode = graphIsolatedDecisionMode(decision?.tone);
  const defaultText = graphIsolatedDecisionDefaultText(note, defaultMode);
  const options = decisionCards
    .filter((card) => ["keep", "hold", "rewrite"].includes(String(card?.key || "").trim()))
    .map((card) => {
      const key = graphIsolatedDecisionMode(card.key);
      return `
        <label class="graph-isolated-decision-option">
          <input type="radio" name="graph-isolated-decision-${escapeHtml(cleanNoteId)}" value="${escapeHtml(key)}"${key === defaultMode ? " checked" : ""}>
          <span>
            <strong>${escapeHtml(card.title)}</strong>
            <small>${escapeHtml(card.text)}</small>
          </span>
        </label>
      `;
    })
    .join("");
  return `
    <section class="graph-isolated-decision-form" aria-label="暂不关联处理">
      <div class="graph-isolated-decision-form-head">
        <div>
          <small>暂不接入时要留下原因</small>
          <strong>避免之后反复看到同一条待关联笔记</strong>
        </div>
        <span>保存到当前笔记</span>
      </div>
      <div class="graph-isolated-decision-options">
        ${options}
      </div>
      <label class="graph-isolated-decision-note">
        <span>说明</span>
        <textarea data-graph-isolated-decision-text="${escapeHtml(cleanNoteId)}" rows="5">${escapeHtml(defaultText)}</textarea>
      </label>
      <div class="graph-isolated-decision-actions">
        <button class="graph-selection-action is-primary" type="button" data-graph-isolated-decision-save="${escapeHtml(cleanNoteId)}">保存说明</button>
        <button class="graph-selection-action is-secondary" type="button" data-graph-isolated-tab="candidates" data-graph-isolated-note="${escapeHtml(cleanNoteId)}">返回找相关笔记</button>
      </div>
      ${renderGraphPromptDetails("判断提示（可选）", prompts)}
    </section>
  `;
}

function graphIsolatedWorkflowActiveTab(noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  return graphIsolatedWorkflowTabKey(cleanNoteId ? graphState.isolatedWorkflowTabsByNoteId?.[cleanNoteId] : "");
}

function setGraphIsolatedWorkflowActiveTab(noteId = "", tabKey = "") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return "candidates";
  const cleanTabKey = graphIsolatedWorkflowTabKey(tabKey);
  graphState.isolatedWorkflowTabsByNoteId = graphState.isolatedWorkflowTabsByNoteId || {};
  graphState.isolatedWorkflowTabsByNoteId[cleanNoteId] = cleanTabKey;
  return cleanTabKey;
}

const graphIsolatedWorkflowShell = createGraphIsolatedWorkflowShellRenderer({
  escapeHtml,
  isolatedQueueItems: graphIsolatedQueueItems,
  nextIsolatedQueueItem: graphNextIsolatedQueueItem,
  resolveIsolatedSelection: resolveGraphIsolatedSelection,
  allNotes: () => state.notes,
  fullNoteById: graphFullNoteById,
  nodeTitle: graphNodeTitle,
  noteTypeLabel,
  decisionMeta: graphIsolatedDecisionMeta,
  relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge,
  renderSelectionShell: renderGraphSelectionShell,
  renderRelationWorkspaceForNote: renderGraphRelationWorkspaceForNote,
  renderJoinNetworkFlow: renderGraphIsolatedJoinNetworkFlow,
  renderNextStepActions: renderGraphIsolatedNextStepActions
});

function renderGraphIsolatedWorkflowTabs({ noteId = "", isolatedQueueMarkup = "", decisionCards = [], prompts = [], nodeMap = new Map(), edges = [], visibleEdgeCount = 0 } = {}) {
  return graphIsolatedWorkflowShell.renderWorkflowTabs({ noteId, isolatedQueueMarkup, decisionCards, prompts, nodeMap, edges, visibleEdgeCount });
}

function activateGraphIsolatedWorkflowTab(tabButton = null, { focus = false } = {}) {
  return graphIsolatedRelationController.activateWorkflowTab(tabButton, { focus });
}

function moveGraphIsolatedWorkflowTab(currentButton = null, direction = 1) {
  return graphIsolatedRelationController.moveWorkflowTab(currentButton, direction);
}

function previewGraphCandidateInOverlay(button = null) {
  const targetNoteId = String(button?.getAttribute?.("data-graph-preview-candidate") || "").trim();
  const sourceNoteId = String(
    button?.getAttribute?.("data-graph-preview-source") ||
      graphState.selection?.noteId ||
      graphState.selection?.nodeId ||
      ""
  ).trim();
  if (!sourceNoteId || !targetNoteId) return false;
  graphState.isolatedCandidatePreviewByNoteId = graphState.isolatedCandidatePreviewByNoteId || {};
  graphState.isolatedCandidatePreviewByNoteId[sourceNoteId] = targetNoteId;
  renderGraphPanel();
  setStatus("已在浮窗中预览候选笔记", "ok");
  return true;
}

function clearGraphCandidatePreviewInOverlay(button = null) {
  const sourceNoteId = String(
    button?.getAttribute?.("data-graph-clear-candidate-preview") ||
      graphState.selection?.noteId ||
      graphState.selection?.nodeId ||
      ""
  ).trim();
  if (!sourceNoteId || !graphState.isolatedCandidatePreviewByNoteId) return false;
  delete graphState.isolatedCandidatePreviewByNoteId[sourceNoteId];
  renderGraphPanel();
  setStatus("已收起候选预览", "ok");
  return true;
}

function graphIsolatedFormError(form = null, message = "") {
  return graphIsolatedRelationController.formError(form, message);
}

function markGraphIsolatedRationaleUserEdited(input = null) {
  return graphIsolatedRelationController.markRationaleUserEdited(input);
}

function updateGraphIsolatedInlinePreview(form = null, source = null) {
  return graphIsolatedRelationController.updateInlinePreview(form, source);
}

function syncGraphIsolatedAiCandidateForm(select = null) {
  return graphIsolatedRelationController.syncAiCandidateForm(select);
}

function filterGraphManualRelationTargets(input = null) {
  return graphIsolatedRelationController.filterManualRelationTargets(input);
}

function pickGraphManualRelationTarget(button = null) {
  return graphIsolatedRelationController.pickManualRelationTarget(button);
}

async function saveGraphIsolatedRelationForm(button = null) {
  return graphIsolatedRelationController.saveRelationForm(button);
}

async function saveGraphConfirmedRelation({ noteId = "", targetNoteId = "", relationType = "associated_with", rationale = "", insightQuestion = "", button = null } = {}) {
  return graphRelationSaveController.saveConfirmedRelation({ noteId, targetNoteId, relationType, rationale, insightQuestion, button });
}

function openGraphRelationFormInSelection(button = null) {
  return graphRelationWorkflowController.openRelationFormFromAction(button);
}

function focusGraphRelationAdjustmentInPlace(button = null) {
  const relationId = String(button?.getAttribute?.("data-graph-relation-id") || "").trim();
  const adjustment = String(button?.getAttribute?.("data-graph-relation-adjustment") || "").trim().toLowerCase();
  if (!relationId || !adjustment) return false;
  graphState.relationAdjustmentFocusById = graphState.relationAdjustmentFocusById || {};
  graphState.relationAdjustmentFocusById[relationId] = adjustment;
  renderGraphPanel();
  const labels = {
    strengthen: "先补清这条关系为什么成立",
    "change-type": "先判断这条关系类型是否准确",
    reverse: "先判断关系方向是否应该反过来",
    split: "先判断是否应该拆成两条关系",
    remove: "先判断是否删除或降级为线索"
  };
  setStatus(labels[adjustment] || "已在当前浮层标记这条关系的处理方向", "ok");
  return true;
}



  return {
    graphIsolatedDecisionMeta,
    openGraphIsolatedDecisionAction,
    loadGraphEditableNote,
    saveGraphIsolatedDecision,
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
  };
}
