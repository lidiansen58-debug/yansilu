const noop = () => {};
const asyncNoop = async () => {};

export function bindGraphCanvasEvents(graphCanvas = null, deps = {}) {
  const {
    documentRef = globalThis.document,
    appState = {},
    graphState = {},
    graphViewportDragState = {},
    graphUtilityDrawerDragState = {},
    resetGraphHoverState = noop,
    applyGraphThinkingHoverState = noop,
    applyGraphNodeHoverState = noop,
    applyGraphEdgeHoverState = noop,
    beginGraphUtilityDrawerDrag = noop,
    beginGraphViewportDrag = noop,
    updateGraphUtilityDrawerDrag = noop,
    updateGraphViewportDrag = noop,
    endGraphUtilityDrawerDrag = noop,
    endGraphViewportDrag = noop,
    renderGraphPanel = noop,
    setStatus = noop,
    dismissSafeOverlaysForEscape = null,
    moveGraphIsolatedWorkflowTab = noop,
    activateGraphIsolatedWorkflowTab = noop,
    pickGraphManualRelationTarget = noop,
    saveGraphIsolatedRelationForm = asyncNoop,
    graphWorkbenchTabMeta = (value = "") => ({ key: String(value || "").trim(), label: String(value || "").trim(), statusLabel: String(value || "").trim() }),
    applyGraphWorkbenchEntryInteraction = () => ({ open: false, meta: { label: "" } }),
    applyGraphWorkbenchTabInteraction = () => ({ open: true, meta: { label: "" } }),
    applyGraphWorkbenchCloseInteraction = noop,
    applyGraphEmptyCloseInteraction = noop,
    applyGraphUtilityDrawerCloseInteraction = noop,
    applyGraphUtilityDrawerOpenState = noop,
    applyGraphSectionOpenState = noop,
    runGraphAiAnalysis = noop,
    refreshDirectoryGraph = async () => false,
    captureGraphIsolatedRelationDraftFromForm = noop,
    runGraphAiConnectForNote = asyncNoop,
    openGraphRelationFormInSelection = noop,
    graphRelationWorkflowController = { openIsolatedFromAction: noop },
    saveGraphAiCandidateRelation = asyncNoop,
    confirmGraphPotentialRelationRefine = asyncNoop,
    retryGraphPotentialRelationRefine = asyncNoop,
    saveGraphCandidateRelation = asyncNoop,
    previewGraphCandidateInOverlay = noop,
    clearGraphCandidatePreviewInOverlay = noop,
    saveGraphIsolatedDecision = asyncNoop,
    createGraphThemeIndexFromButton = asyncNoop,
    openGraphIsolatedDecisionAction = noop,
    focusGraphRelationAdjustmentInPlace = noop,
    openGraphFollowupNote = noop,
    openGraphSelection = noop,
    openGraphNodeSelectionFromElement = noop,
    openNoteById = noop,
    syncGraphIsolatedAiCandidateForm = noop,
    graphIsolatedFormError = noop,
    applyGraphRelationTypeFilterInteraction = () => ({ label: "" }),
    setGraphRelationTypeFilter = noop,
    graphRelationTypeLabel = noop,
    markGraphIsolatedRationaleUserEdited = noop,
    filterGraphManualRelationTargets = noop,
    applyGraphViewModeInteraction = () => ({ changed: false, meta: { label: "" } }),
    graphReadingModeMeta = noop,
    applyGraphWheelZoomInteraction = () => ({ changed: false }),
    graphZoomOption = noop,
    graphZoomStep = noop,
    applyGraphThinkingToggleInteraction = () => ({ open: false }),
    applyGraphThinkingHideInteraction = noop,
    applyGraphUtilityVisibilityInteraction = () => ({ visible: false }),
    applyGraphThinkingVisibilityInteraction = () => ({ visible: false }),
    applyGraphThinkingFilterInteraction = () => ({ meta: { label: "" } }),
    graphThinkingFilterMeta = noop,
    applyGraphZoomOptionInteraction = () => ({ meta: { label: "" } }),
    applyGraphZoomStepInteraction = () => ({ changed: false, meta: { label: "" } }),
    applyGraphReadingLensInteraction = () => ({ meta: { label: "" } }),
    graphReadingLensMeta = noop,
    applyGraphFocusDepthInteraction = () => ({ meta: { label: "" } }),
    setGraphFocusDepth = noop,
    graphFocusDepthMeta = noop,
    graphFocusContextCollapsedState = (_current, action) => action !== "open",
    graphFocusContextCollapsedStatus = () => "",
    applyGraphFocusContextModeInteraction = () => ({ meta: { label: "" } }),
    setGraphFocusContextMode = noop,
    graphFocusContextModeMeta = noop,
    centerGraphViewportIfZoomed = noop,
    dismissGraphCanvasHelpHint = noop,
    requestAnimationFrame = (callback) => callback?.()
  } = deps || {};

  function openGraphNoteFromElement(row = null, { stayInGraph = false } = {}) {
    const noteId = String(row?.dataset?.openNote || "").trim();
    if (!noteId) return false;
    openNoteById(noteId);
    if (stayInGraph && appState.module === "graph") {
      renderGraphPanel();
      setStatus("已切换为这条永久笔记的关系视图", "ok");
      return true;
    }
    setStatus("已从图谱打开笔记", "ok");
    return true;
  }

  graphCanvas?.addEventListener("click", async (event) => {
    const consumeGraphClick = () => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const graphHitTarget = event.target.closest(".graph-map-node[data-node-id], .graph-map-edge-group[data-edge-from], [data-graph-select-node]");
    if (graphViewportDragState.suppressClickUntil > Date.now() && event.target.closest(".graph-map-viewport") && !graphHitTarget) {
      consumeGraphClick();
      return;
    }
    const relationSaveAction = event.target.closest("[data-graph-ai-candidate-apply], [data-graph-relation-candidate-apply]");
    const selectionPanelOpenNote = relationSaveAction ? null : event.target.closest(".graph-selection-panel [data-open-note]");
    if (selectionPanelOpenNote) {
      consumeGraphClick();
      openGraphNoteFromElement(selectionPanelOpenNote, { stayInGraph: true });
      return;
    }
    const isolatedWorkflowTab = event.target.closest("[data-graph-isolated-tab]");
    if (isolatedWorkflowTab) {
      consumeGraphClick();
      activateGraphIsolatedWorkflowTab(isolatedWorkflowTab);
      return;
    }
    const graphManualTargetButton = event.target.closest("[data-graph-pick-manual-target]");
    if (graphManualTargetButton) {
      consumeGraphClick();
      pickGraphManualRelationTarget(graphManualTargetButton);
      return;
    }
    const graphIsolatedRelationSaveButton = event.target.closest("[data-graph-isolated-relation-save]");
    if (graphIsolatedRelationSaveButton) {
      consumeGraphClick();
      await saveGraphIsolatedRelationForm(graphIsolatedRelationSaveButton);
      return;
    }
    const graphRelationFormButton = event.target.closest("[data-graph-open-relation-form]");
    if (graphRelationFormButton) {
      consumeGraphClick();
      openGraphRelationFormInSelection(graphRelationFormButton);
      return;
    }
    const researchClose = event.target.closest("[data-graph-research-close]");
    if (researchClose) {
      graphState.researchNavigatorHidden = true;
      graphState.researchNavigatorTouched = true;
      renderGraphPanel();
      setStatus("已收起概览", "ok");
      return;
    }
    const researchOpen = event.target.closest("[data-graph-research-open]");
    if (researchOpen) {
      graphState.researchNavigatorHidden = false;
      graphState.researchNavigatorTouched = true;
      graphState.workbenchPanelOpen = false;
      graphState.selection = null;
      renderGraphPanel();
      setStatus("已显示概览", "ok");
      return;
    }
    const workbenchOpenEntry = event.target.closest("[data-graph-open-workbench-entry]");
    if (workbenchOpenEntry) {
      const tab = graphWorkbenchTabMeta(workbenchOpenEntry.getAttribute("data-graph-open-workbench-entry")).key;
      graphState.workbenchPanelTab = tab;
      graphState.workbenchPanelOpen = true;
      renderGraphPanel();
      setStatus(`已打开${graphWorkbenchTabMeta(tab).statusLabel || graphWorkbenchTabMeta(tab).label}`, "ok");
      return;
    }
    const workbenchEntry = event.target.closest("[data-graph-workbench-entry]");
    if (workbenchEntry) {
      const result = applyGraphWorkbenchEntryInteraction(graphState, workbenchEntry.getAttribute("data-graph-workbench-entry"), {
        graphWorkbenchTabMeta
      });
      renderGraphPanel();
      setStatus(result.open ? `已打开${result.meta.statusLabel || result.meta.label}` : "已收起图谱侧栏", "ok");
      return;
    }
    const workbenchTab = event.target.closest("[data-graph-workbench-tab]");
    if (workbenchTab) {
      const result = applyGraphWorkbenchTabInteraction(graphState, workbenchTab.getAttribute("data-graph-workbench-tab"), {
        graphWorkbenchTabMeta
      });
      renderGraphPanel();
      setStatus(`已切换到${result.meta.statusLabel || result.meta.label}`, "ok");
      return;
    }
    const workbenchClose = event.target.closest("[data-graph-workbench-close]");
    if (workbenchClose) {
      applyGraphWorkbenchCloseInteraction(graphState);
      renderGraphPanel();
      setStatus("已收起图谱侧栏", "ok");
      return;
    }
    const graphEmptyClose = event.target.closest("[data-graph-empty-close]");
    if (graphEmptyClose) {
      applyGraphEmptyCloseInteraction(graphState, {
        setRelationTypeFilter: setGraphRelationTypeFilter
      });
      renderGraphPanel();
      setStatus("已返回观点关系图", "ok");
      return;
    }
    if (graphUtilityDrawerDragState.suppressClickUntil > Date.now() && event.target.closest(".graph-utility-drawer")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const utilityDrawerClose = event.target.closest("[data-graph-utility-close]");
    if (utilityDrawerClose) {
      event.preventDefault();
      event.stopPropagation();
      applyGraphUtilityDrawerCloseInteraction(graphState);
      renderGraphPanel();
      setStatus("已隐藏稍后处理", "ok");
      return;
    }
    if (event.target.closest("[data-graph-utility-drag-handle]")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const utilityDrawerSummary = event.target.closest(".graph-utility-drawer-summary");
    if (utilityDrawerSummary) {
      const utilityDrawer = utilityDrawerSummary.closest("[data-graph-utility-drawer]");
      if (utilityDrawer) {
        requestAnimationFrame(() => {
          applyGraphUtilityDrawerOpenState(graphState, utilityDrawer.hasAttribute("open"));
        });
      }
    }
    const collapsibleSummary = event.target.closest(".graph-collapsible-summary");
    if (collapsibleSummary) {
      const section = collapsibleSummary.closest("[data-graph-section]");
      if (section) {
        const sectionKey = String(section.getAttribute("data-graph-section") || "").trim();
        requestAnimationFrame(() => {
          applyGraphSectionOpenState(graphState, sectionKey, section.hasAttribute("open"));
        });
      }
    }
    const graphAiButton = event.target.closest("[data-run-graph-ai-analysis]");
    if (graphAiButton) {
      consumeGraphClick();
      graphState.workbenchPanelOpen = true;
      graphState.workbenchPanelTab = "questions";
      renderGraphPanel();
      void runGraphAiAnalysis();
      return;
    }
    const graphThinkingReviewButton = event.target.closest("[data-graph-focus-thinking-review]");
    if (graphThinkingReviewButton) {
      graphState.workbenchPanelOpen = true;
      graphState.workbenchPanelTab = "questions";
      graphState.thinkingPanelVisible = true;
      graphState.thinkingPanelOpen = true;
      graphState.thinkingFilter = "all";
      renderGraphPanel();
      setStatus("已回到图谱待判断内容；只确认能说清理由的关系或主题。", "ok");
      return;
    }
    const retryButton = event.target.closest("[data-graph-retry]");
    if (retryButton) {
      setStatus("正在重新读取关系图谱...", "ok");
      const refreshed = await refreshDirectoryGraph();
      setStatus(
        refreshed ? "永久笔记关系图谱已重新读取" : `图谱刷新失败：${graphState.error || "请重试"}`,
        refreshed ? "ok" : "warn"
      );
      return;
    }
    const expandButton = event.target.closest("[data-graph-toggle-expanded]");
    if (expandButton) {
      graphState.expanded = expandButton.getAttribute("data-graph-toggle-expanded") === "on";
      if (graphState.expanded && graphState.zoom === "fit") graphState.zoom = "read";
      renderGraphPanel();
      requestAnimationFrame(centerGraphViewportIfZoomed);
      setStatus(graphState.expanded ? "已切换到图谱放大查看" : "已退出图谱放大查看", "ok");
      return;
    }
    const selectionClose = event.target.closest("[data-graph-selection-close]");
    if (selectionClose) {
      if (typeof dismissSafeOverlaysForEscape === "function") {
        dismissSafeOverlaysForEscape(event);
      } else {
        graphState.selection = null;
        renderGraphPanel();
        setStatus("已收起图谱思考详情", "ok");
      }
      return;
    }
    const clusterSelection = event.target.closest("[data-graph-select-cluster]");
    if (clusterSelection) {
      const clusterKey = String(clusterSelection.getAttribute("data-graph-select-cluster") || "").trim();
      if (clusterKey) {
        openGraphSelection({ kind: "cluster", clusterKey });
        setStatus("已打开主题群摘要", "ok");
      }
      return;
    }
    const nodeSelection = event.target.closest("[data-graph-select-node]");
    if (nodeSelection) {
      openGraphNodeSelectionFromElement(nodeSelection);
      return;
    }
    const themeSelection = event.target.closest("[data-graph-select-theme]");
    if (themeSelection) {
      const topicKey = String(themeSelection.getAttribute("data-graph-select-theme") || "").trim();
      if (topicKey) {
        openGraphSelection({ kind: "theme", topicKey });
        setStatus("已打开主题群评估", "ok");
      }
      return;
    }
    const isolatedSelection = event.target.closest("[data-graph-select-isolated]");
    if (isolatedSelection) {
      graphRelationWorkflowController.openIsolatedFromAction(isolatedSelection);
      return;
    }
    const bridgeSelection = event.target.closest("[data-graph-select-bridge]");
    if (bridgeSelection) {
      const bridgeKey = String(bridgeSelection.getAttribute("data-graph-select-bridge") || "").trim();
      const noteId = String(bridgeSelection.getAttribute("data-graph-bridge-note") || "").trim();
      const targetNoteId = String(bridgeSelection.getAttribute("data-graph-target-note") || "").trim();
      if (bridgeKey || noteId) {
        openGraphSelection({ kind: "bridge", bridgeKey, noteId, targetNoteId });
        setStatus("已打开缺少连接判断", "ok");
      }
      return;
    }
    const edgeSelection = event.target.closest("[data-graph-select-edge]");
    if (edgeSelection) {
      const edgeKey = String(edgeSelection.getAttribute("data-graph-select-edge") || "").trim();
      const fromNoteId = String(edgeSelection.getAttribute("data-graph-select-edge-from") || "").trim();
      const toNoteId = String(edgeSelection.getAttribute("data-graph-select-edge-to") || "").trim();
      if (edgeKey || (fromNoteId && toNoteId)) {
        openGraphSelection({
          kind: "edge",
          edgeKey,
          relationId: String(edgeSelection.getAttribute("data-graph-select-edge-id") || "").trim(),
          fromNoteId,
          toNoteId,
          relationType: String(edgeSelection.getAttribute("data-graph-select-edge-type") || "").trim().toLowerCase()
        });
        setStatus("已打开关系确认详情", "ok");
      }
      return;
    }
    const graphAiConnectButton = event.target.closest("[data-graph-ai-connect-note]");
    if (graphAiConnectButton) {
      consumeGraphClick();
      captureGraphIsolatedRelationDraftFromForm(graphAiConnectButton.closest?.("[data-graph-isolated-relation-form]"));
      await runGraphAiConnectForNote(graphAiConnectButton.getAttribute("data-graph-ai-connect-note"));
      return;
    }
    const graphAiCandidateButton = event.target.closest("[data-graph-ai-candidate-apply]");
    if (graphAiCandidateButton) {
      consumeGraphClick();
      await saveGraphAiCandidateRelation(graphAiCandidateButton);
      return;
    }
    const graphAiRefineConfirmButton = event.target.closest("[data-graph-ai-refine-confirm]");
    if (graphAiRefineConfirmButton) {
      consumeGraphClick();
      await confirmGraphPotentialRelationRefine(graphAiRefineConfirmButton);
      return;
    }
    const graphAiRefineRetryButton = event.target.closest("[data-graph-ai-refine-retry]");
    if (graphAiRefineRetryButton) {
      consumeGraphClick();
      await retryGraphPotentialRelationRefine(graphAiRefineRetryButton);
      return;
    }
    const graphRelationCandidateButton = event.target.closest("[data-graph-relation-candidate-apply]");
    if (graphRelationCandidateButton) {
      consumeGraphClick();
      await saveGraphCandidateRelation(graphRelationCandidateButton);
      return;
    }
    const graphPreviewCandidateButton = event.target.closest("[data-graph-preview-candidate]");
    if (graphPreviewCandidateButton) {
      consumeGraphClick();
      previewGraphCandidateInOverlay(graphPreviewCandidateButton);
      return;
    }
    const graphClearCandidatePreviewButton = event.target.closest("[data-graph-clear-candidate-preview]");
    if (graphClearCandidatePreviewButton) {
      consumeGraphClick();
      clearGraphCandidatePreviewInOverlay(graphClearCandidatePreviewButton);
      return;
    }
    const graphIsolatedDecisionSaveButton = event.target.closest("[data-graph-isolated-decision-save]");
    if (graphIsolatedDecisionSaveButton) {
      consumeGraphClick();
      await saveGraphIsolatedDecision(graphIsolatedDecisionSaveButton);
      return;
    }
    const graphThemeIndexButton = event.target.closest("[data-graph-create-theme-index]");
    if (graphThemeIndexButton) {
      consumeGraphClick();
      await createGraphThemeIndexFromButton(graphThemeIndexButton);
      return;
    }
    const isolatedAction = event.target.closest("[data-graph-isolated-action]");
    if (isolatedAction) {
      consumeGraphClick();
      const noteId = String(isolatedAction.getAttribute("data-graph-isolated-note") || "").trim();
      const action = String(isolatedAction.getAttribute("data-graph-isolated-action") || "").trim().toLowerCase();
      openGraphIsolatedDecisionAction(noteId, action);
      return;
    }
    const relationAdjustment = event.target.closest("[data-graph-relation-adjustment]");
    if (relationAdjustment) {
      consumeGraphClick();
      focusGraphRelationAdjustmentInPlace(relationAdjustment);
      return;
    }
    const graphFollowup = event.target.closest("[data-graph-followup-action]");
    if (graphFollowup) {
      consumeGraphClick();
      openGraphFollowupNote(graphFollowup.getAttribute("data-open-note"), graphFollowup.getAttribute("data-graph-followup-action"), {
        relationId: graphFollowup.getAttribute("data-graph-relation-id"),
        targetNoteId: graphFollowup.getAttribute("data-graph-target-note"),
        relationType: graphFollowup.getAttribute("data-graph-relation-type"),
        basketNoteIds: graphFollowup.getAttribute("data-graph-basket-note-ids")
      });
      return;
    }
    const thinkingToggle = event.target.closest("[data-graph-thinking-toggle]");
    if (thinkingToggle) {
      const result = applyGraphThinkingToggleInteraction(graphState);
      renderGraphPanel();
      setStatus(result.open ? "已打开待判断内容" : "已收起待判断内容", "ok");
      return;
    }
    const thinkingHide = event.target.closest("[data-graph-thinking-hide]");
    if (thinkingHide) {
      event.preventDefault();
      event.stopPropagation();
      applyGraphThinkingHideInteraction(graphState);
      renderGraphPanel();
      setStatus("已隐藏待判断内容", "ok");
      return;
    }
    const thinkingClose = event.target.closest("[data-graph-thinking-close]");
    if (thinkingClose) {
      applyGraphThinkingHideInteraction(graphState);
      renderGraphPanel();
      setStatus("已隐藏待判断内容", "ok");
      return;
    }
    const utilityVisibilityToggle = event.target.closest("[data-graph-toggle-utility-visibility]");
    if (utilityVisibilityToggle) {
      const result = applyGraphUtilityVisibilityInteraction(graphState, utilityVisibilityToggle.getAttribute("data-graph-toggle-utility-visibility"));
      renderGraphPanel();
      setStatus(result.visible ? "已显示稍后处理" : "已隐藏稍后处理", "ok");
      return;
    }
    const thinkingVisibilityToggle = event.target.closest("[data-graph-toggle-thinking-visibility]");
    if (thinkingVisibilityToggle) {
      const result = applyGraphThinkingVisibilityInteraction(graphState, thinkingVisibilityToggle.getAttribute("data-graph-toggle-thinking-visibility"));
      renderGraphPanel();
      setStatus(result.visible ? "已显示待判断内容" : "已隐藏待判断内容", "ok");
      return;
    }
    const thinkingFilter = event.target.closest("[data-graph-thinking-filter]");
    if (thinkingFilter) {
      const result = applyGraphThinkingFilterInteraction(graphState, thinkingFilter.getAttribute("data-graph-thinking-filter"), {
        graphThinkingFilterMeta
      });
      renderGraphPanel();
      setStatus("待判断内容已切换为：" + result.meta.label, "ok");
      return;
    }
    const zoomButton = event.target.closest("[data-graph-zoom-option]");
    if (zoomButton) {
      dismissGraphCanvasHelpHint();
      const result = applyGraphZoomOptionInteraction(graphState, zoomButton.getAttribute("data-graph-zoom-option"), {
        graphZoomOption
      });
      renderGraphPanel();
      requestAnimationFrame(centerGraphViewportIfZoomed);
      setStatus("图谱视图已切换为" + result.meta.label, "ok");
      return;
    }
    const zoomStepButton = event.target.closest("[data-graph-zoom-step]");
    if (zoomStepButton) {
      dismissGraphCanvasHelpHint();
      const result = applyGraphZoomStepInteraction(graphState, Number(zoomStepButton.getAttribute("data-graph-zoom-step") || 0), {
        graphZoomOption,
        graphZoomStep
      });
      if (result.changed) {
        renderGraphPanel();
        requestAnimationFrame(centerGraphViewportIfZoomed);
        setStatus("图谱视图已切换为" + result.meta.label, "ok");
      }
      return;
    }
    const readingLensButton = event.target.closest("[data-graph-reading-lens]");
    if (readingLensButton) {
      const result = applyGraphReadingLensInteraction(graphState, readingLensButton.getAttribute("data-graph-reading-lens"), {
        graphReadingLensMeta
      });
      if (result.lens === "insight") {
        applyGraphWorkbenchTabInteraction(graphState, "clues", {
          graphWorkbenchTabMeta
        });
      }
      renderGraphPanel();
      setStatus(
        result.lens === "insight"
          ? "已打开图谱下一步建议"
          : "图谱优先查看已切换为：" + result.meta.label,
        "ok"
      );
      return;
    }
    const focusDepthButton = event.target.closest("[data-graph-focus-depth]");
    if (focusDepthButton) {
      const result = applyGraphFocusDepthInteraction(graphState, focusDepthButton.getAttribute("data-graph-focus-depth"), {
        setGraphFocusDepth,
        graphFocusDepthMeta
      });
      graphState.focusContextCollapsed = true;
      renderGraphPanel();
      setStatus("图谱范围已切换到 " + result.meta.label, "ok");
      return;
    }
    const focusContextToggle = event.target.closest("[data-graph-focus-context-toggle]");
    if (focusContextToggle) {
      const action = String(focusContextToggle.getAttribute("data-graph-focus-context-toggle") || "").trim().toLowerCase();
      graphState.focusContextCollapsed = graphFocusContextCollapsedState(graphState.focusContextCollapsed, action);
      renderGraphPanel();
      setStatus(graphFocusContextCollapsedStatus(graphState.focusContextCollapsed), "ok");
      return;
    }
    const contextModeButton = event.target.closest("[data-graph-context-mode]");
    if (contextModeButton) {
      const result = applyGraphFocusContextModeInteraction(graphState, contextModeButton.getAttribute("data-graph-context-mode"), {
        setGraphFocusContextMode,
        graphFocusContextModeMeta
      });
      renderGraphPanel();
      setStatus("选中笔记面板已切换到：" + result.meta.label, "ok");
      return;
    }
    const graphNode = event.target.closest(".graph-map-node[data-node-id]");
    if (graphNode) {
      event.__yansiluGraphNodeHandled = true;
      dismissGraphCanvasHelpHint();
      openGraphNodeSelectionFromElement(graphNode);
      return;
    }
    const graphEdge = event.target.closest(".graph-map-edge-group[data-edge-from]");
    if (graphEdge) {
      dismissGraphCanvasHelpHint();
      const fromNoteId = String(graphEdge.getAttribute("data-edge-from") || "").trim();
      const toNoteId = String(graphEdge.getAttribute("data-edge-to") || "").trim();
      openGraphSelection({
        kind: "edge",
        edgeKey: String(graphEdge.getAttribute("data-edge-key") || "").trim(),
        relationId: String(graphEdge.getAttribute("data-edge-id") || "").trim(),
        fromNoteId,
        toNoteId,
        relationType: String(graphEdge.getAttribute("data-edge-relation-type") || "").trim().toLowerCase()
      });
      setStatus(`已选中关系确认：${String(graphEdge.getAttribute("data-edge-relation") || "关系").trim() || "关系"}`, "ok");
      return;
    }
    const row = event.target.closest("[data-open-note]");
    if (!row) return;
    openGraphNoteFromElement(row, { stayInGraph: true });
  });

  documentRef?.addEventListener?.("click", (event) => {
    const workbenchEntry = event.target?.closest?.("[data-graph-workbench-entry]");
    if (workbenchEntry) {
      event.preventDefault();
      event.stopPropagation();
      const result = applyGraphWorkbenchEntryInteraction(graphState, workbenchEntry.getAttribute("data-graph-workbench-entry"), {
        graphWorkbenchTabMeta
      });
      renderGraphPanel();
      setStatus(result.open ? `已打开${result.meta.statusLabel || result.meta.label}` : "已收起图谱侧栏", "ok");
      return;
    }
    const workbenchTab = event.target?.closest?.("[data-graph-workbench-tab]");
    if (workbenchTab) {
      event.preventDefault();
      event.stopPropagation();
      const result = applyGraphWorkbenchTabInteraction(graphState, workbenchTab.getAttribute("data-graph-workbench-tab"), {
        graphWorkbenchTabMeta
      });
      renderGraphPanel();
      setStatus(`已切换到${result.meta.statusLabel || result.meta.label}`, "ok");
      return;
    }
    const workbenchClose = event.target?.closest?.("[data-graph-workbench-close]");
    if (workbenchClose) {
      event.preventDefault();
      event.stopPropagation();
      applyGraphWorkbenchCloseInteraction(graphState);
      renderGraphPanel();
      setStatus("已收起图谱侧栏", "ok");
      return;
    }
    const graphAiButton = event.target?.closest?.("[data-run-graph-ai-analysis]");
    if (graphAiButton) {
      event.preventDefault();
      event.stopPropagation();
      graphState.workbenchPanelOpen = true;
      graphState.workbenchPanelTab = "questions";
      renderGraphPanel();
      void runGraphAiAnalysis();
      return;
    }
    const row = event.target?.closest?.("[data-open-note]");
    if (!row || graphCanvas?.contains?.(row)) return;
    if (!row.closest?.(".graph-selection-panel, .graph-focus-context-panel, [data-graph-workbench-panel]")) return;
    event.preventDefault();
    event.stopPropagation();
    openGraphNoteFromElement(row, { stayInGraph: true });
  }, true);

  function handleGraphHoverIntent(event) {
    const thinking = event.target.closest("[data-graph-thinking-highlight]");
    if (thinking) {
      applyGraphThinkingHoverState(thinking);
      return;
    }
    const node = event.target.closest(".graph-map-node[data-node-id]");
    if (node) {
      applyGraphNodeHoverState(node);
      return;
    }
    const edge = event.target.closest(".graph-map-edge-group[data-edge-from]");
    if (edge) {
      applyGraphEdgeHoverState(edge);
      return;
    }
    if (event.target.closest(".graph-thinking-panel, .graph-map-panel")) resetGraphHoverState();
  }

  function handleGraphHoverExit(event) {
    const nextTarget = event.relatedTarget;
    const currentPanel = event.currentTarget;
    if (nextTarget && currentPanel?.contains?.(nextTarget)) return;
    resetGraphHoverState();
  }

  graphCanvas?.addEventListener("mouseover", handleGraphHoverIntent);
  graphCanvas?.addEventListener("pointerover", handleGraphHoverIntent);
  graphCanvas?.addEventListener("mouseout", handleGraphHoverExit);
  graphCanvas?.addEventListener("pointerout", handleGraphHoverExit);

  graphCanvas?.addEventListener("focusin", (event) => {
    const thinking = event.target.closest("[data-graph-thinking-highlight]");
    if (thinking) {
      applyGraphThinkingHoverState(thinking);
      return;
    }
    const node = event.target.closest(".graph-map-node[data-node-id]");
    if (node) {
      applyGraphNodeHoverState(node);
      return;
    }
    const edge = event.target.closest(".graph-map-edge-group[data-edge-from]");
    if (edge) {
      applyGraphEdgeHoverState(edge);
      return;
    }
    if (event.target.closest(".graph-thinking-panel, .graph-map-panel")) resetGraphHoverState();
  });

  graphCanvas?.addEventListener("focusout", (event) => {
    const nextTarget = event.relatedTarget;
    const currentPanel = event.currentTarget;
    if (nextTarget && currentPanel?.contains?.(nextTarget)) return;
    resetGraphHoverState();
  });

  graphCanvas?.addEventListener("pointerdown", (event) => {
    const utilityDrawerHandle = event.target.closest("[data-graph-utility-drag-handle]");
    if (utilityDrawerHandle) {
      beginGraphUtilityDrawerDrag(utilityDrawerHandle, event);
      return;
    }
    const viewport = event.target.closest(".graph-map-viewport");
    if (!viewport) return;
    beginGraphViewportDrag(viewport, event);
  });

  graphCanvas?.addEventListener("pointermove", (event) => {
    updateGraphUtilityDrawerDrag(event);
    updateGraphViewportDrag(event);
  });

  graphCanvas?.addEventListener("pointerup", (event) => {
    endGraphUtilityDrawerDrag(event);
    endGraphViewportDrag(event);
    if (event.target.closest(".graph-map-viewport")) dismissGraphCanvasHelpHint();
  });

  graphCanvas?.addEventListener("pointercancel", (event) => {
    endGraphUtilityDrawerDrag(event);
    endGraphViewportDrag(event);
  });

  graphCanvas?.addEventListener("lostpointercapture", (event) => {
    endGraphUtilityDrawerDrag(event);
    endGraphViewportDrag(event);
  });

  graphCanvas?.addEventListener("keydown", async (event) => {
    if (event.key === "Escape" && graphState.selection) {
      if (typeof dismissSafeOverlaysForEscape === "function") {
        dismissSafeOverlaysForEscape(event);
      } else {
        graphState.selection = null;
        renderGraphPanel();
        setStatus("已收起图谱思考详情", "ok");
      }
      return;
    }
    if (event.key === "Escape" && graphState.expanded) {
      graphState.expanded = false;
      renderGraphPanel();
      setStatus("已退出图谱放大查看", "ok");
      return;
    }
    const isolatedWorkflowTab = event.target.closest("[data-graph-isolated-tab]");
    if (isolatedWorkflowTab) {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        moveGraphIsolatedWorkflowTab(isolatedWorkflowTab, 1);
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        moveGraphIsolatedWorkflowTab(isolatedWorkflowTab, -1);
        return;
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const tabs = [...isolatedWorkflowTab.closest(".graph-isolated-workflow")?.querySelectorAll("[data-graph-isolated-tab]") || []];
        const nextTab = event.key === "Home" ? tabs[0] : tabs[tabs.length - 1];
        activateGraphIsolatedWorkflowTab(nextTab, { focus: true });
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateGraphIsolatedWorkflowTab(isolatedWorkflowTab);
        return;
      }
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    const graphAiConnectButton = event.target.closest("[data-graph-ai-connect-note]");
    if (graphAiConnectButton) {
      event.preventDefault();
      captureGraphIsolatedRelationDraftFromForm(graphAiConnectButton.closest?.("[data-graph-isolated-relation-form]"));
      await runGraphAiConnectForNote(graphAiConnectButton.getAttribute("data-graph-ai-connect-note"));
      return;
    }
    const graphRelationFormButton = event.target.closest("[data-graph-open-relation-form]");
    if (graphRelationFormButton) {
      event.preventDefault();
      openGraphRelationFormInSelection(graphRelationFormButton);
      return;
    }
    const graphAiCandidateButton = event.target.closest("[data-graph-ai-candidate-apply]");
    if (graphAiCandidateButton) {
      event.preventDefault();
      await saveGraphAiCandidateRelation(graphAiCandidateButton);
      return;
    }
    const graphAiRefineConfirmButton = event.target.closest("[data-graph-ai-refine-confirm]");
    if (graphAiRefineConfirmButton) {
      event.preventDefault();
      await confirmGraphPotentialRelationRefine(graphAiRefineConfirmButton);
      return;
    }
    const graphAiRefineRetryButton = event.target.closest("[data-graph-ai-refine-retry]");
    if (graphAiRefineRetryButton) {
      event.preventDefault();
      await retryGraphPotentialRelationRefine(graphAiRefineRetryButton);
      return;
    }
    const graphRelationCandidateButton = event.target.closest("[data-graph-relation-candidate-apply]");
    if (graphRelationCandidateButton) {
      event.preventDefault();
      await saveGraphCandidateRelation(graphRelationCandidateButton);
      return;
    }
    const graphPreviewCandidateButton = event.target.closest("[data-graph-preview-candidate]");
    if (graphPreviewCandidateButton) {
      event.preventDefault();
      previewGraphCandidateInOverlay(graphPreviewCandidateButton);
      return;
    }
    const graphClearCandidatePreviewButton = event.target.closest("[data-graph-clear-candidate-preview]");
    if (graphClearCandidatePreviewButton) {
      event.preventDefault();
      clearGraphCandidatePreviewInOverlay(graphClearCandidatePreviewButton);
      return;
    }
    const graphIsolatedDecisionSaveButton = event.target.closest("[data-graph-isolated-decision-save]");
    if (graphIsolatedDecisionSaveButton) {
      event.preventDefault();
      await saveGraphIsolatedDecision(graphIsolatedDecisionSaveButton);
      return;
    }
    const graphThemeIndexButton = event.target.closest("[data-graph-create-theme-index]");
    if (graphThemeIndexButton) {
      event.preventDefault();
      await createGraphThemeIndexFromButton(graphThemeIndexButton);
      return;
    }
    const isolatedAction = event.target.closest("[data-graph-isolated-action]");
    if (isolatedAction) {
      event.preventDefault();
      const noteId = String(isolatedAction.getAttribute("data-graph-isolated-note") || "").trim();
      const action = String(isolatedAction.getAttribute("data-graph-isolated-action") || "").trim().toLowerCase();
      openGraphIsolatedDecisionAction(noteId, action);
      return;
    }
    const relationAdjustment = event.target.closest("[data-graph-relation-adjustment]");
    if (relationAdjustment) {
      event.preventDefault();
      focusGraphRelationAdjustmentInPlace(relationAdjustment);
      return;
    }
    const graphFollowup = event.target.closest("[data-graph-followup-action]");
    if (graphFollowup) {
      event.preventDefault();
      openGraphFollowupNote(graphFollowup.getAttribute("data-open-note"), graphFollowup.getAttribute("data-graph-followup-action"), {
        relationId: graphFollowup.getAttribute("data-graph-relation-id"),
        targetNoteId: graphFollowup.getAttribute("data-graph-target-note"),
        relationType: graphFollowup.getAttribute("data-graph-relation-type"),
        basketNoteIds: graphFollowup.getAttribute("data-graph-basket-note-ids")
      });
      return;
    }
    const clusterSelection = event.target.closest("[data-graph-select-cluster]");
    if (clusterSelection) {
      event.preventDefault();
      const clusterKey = String(clusterSelection.getAttribute("data-graph-select-cluster") || "").trim();
      if (clusterKey) {
        openGraphSelection({ kind: "cluster", clusterKey });
        setStatus("已打开主题群摘要", "ok");
      }
      return;
    }
    const nodeSelection = event.target.closest("[data-graph-select-node]");
    if (nodeSelection) {
      event.preventDefault();
      openGraphNodeSelectionFromElement(nodeSelection);
      return;
    }
    const graphNode = event.target.closest(".graph-map-node[data-node-id]");
    if (graphNode) {
      event.preventDefault();
      dismissGraphCanvasHelpHint();
      openGraphNodeSelectionFromElement(graphNode);
      return;
    }
    const graphEdge = event.target.closest(".graph-map-edge-group[data-edge-from]");
    if (graphEdge) {
      event.preventDefault();
      dismissGraphCanvasHelpHint();
      openGraphSelection({
        kind: "edge",
        edgeKey: String(graphEdge.getAttribute("data-edge-key") || "").trim(),
        relationId: String(graphEdge.getAttribute("data-edge-id") || "").trim(),
        fromNoteId: String(graphEdge.getAttribute("data-edge-from") || "").trim(),
        toNoteId: String(graphEdge.getAttribute("data-edge-to") || "").trim(),
        relationType: String(graphEdge.getAttribute("data-edge-relation-type") || "").trim().toLowerCase()
      });
      setStatus(`已选中关系确认：${String(graphEdge.getAttribute("data-edge-relation") || "关系").trim() || "关系"}`, "ok");
      return;
    }
    const row = event.target.closest("[data-open-note]");
    if (!row) return;
    event.preventDefault();
    openGraphNoteFromElement(row);
  });

  graphCanvas?.addEventListener("change", (event) => {
    const aiSelect = event.target.closest("[data-graph-ai-candidate-select]");
    if (aiSelect) {
      syncGraphIsolatedAiCandidateForm(aiSelect);
      return;
    }
    const isolatedRelationType = event.target.closest("[data-graph-isolated-relation-type]");
    if (isolatedRelationType) {
      captureGraphIsolatedRelationDraftFromForm(isolatedRelationType.closest?.("[data-graph-isolated-relation-form]"));
      graphIsolatedFormError(isolatedRelationType.closest?.("[data-graph-isolated-relation-form]"), "");
      return;
    }
    const control = event.target.closest("[data-graph-filter]");
    if (!control) return;
    const key = control.dataset.graphFilter;
    if (key !== "relationType") return;
    const result = applyGraphRelationTypeFilterInteraction(graphState, control.value, {
      setGraphRelationTypeFilter,
      graphRelationTypeLabel
    });
    renderGraphPanel();
    setStatus(`图谱关系筛选已更新：${result.label}`, "ok");
  });

  graphCanvas?.addEventListener("input", (event) => {
    const rationaleInput = event.target.closest("[data-graph-isolated-rationale]");
    if (rationaleInput) {
      markGraphIsolatedRationaleUserEdited(rationaleInput);
      captureGraphIsolatedRelationDraftFromForm(rationaleInput.closest?.("[data-graph-isolated-relation-form]"));
      return;
    }
    const manualSearch = event.target.closest("[data-graph-manual-target-search]");
    if (manualSearch) {
      filterGraphManualRelationTargets(manualSearch);
    }
  });

  graphCanvas?.addEventListener("click", (event) => {
    const legendToggle = event.target.closest("#graphLegendToggle");
    if (legendToggle) {
      graphState.legendOpen = graphState.legendOpen !== true;
      renderGraphPanel();
      setStatus(graphState.legendOpen ? "已显示关系图例" : "已隐藏关系图例", "ok");
      return;
    }
    const toggle = event.target.closest("[data-graph-view-mode]");
    if (!toggle) return;
    const result = applyGraphViewModeInteraction(graphState, toggle.dataset.graphViewMode, {
      setGraphRelationTypeFilter,
      graphReadingModeMeta
    });
    if (!result.changed) return;
    renderGraphPanel();
    setStatus(`图谱查看方式已切换为：${result.meta.label}`, "ok");
  });

  graphCanvas?.addEventListener(
    "wheel",
    (event) => {
      const viewport = event.target.closest(".graph-map-viewport");
      if (!viewport) return;
      event.preventDefault();
      dismissGraphCanvasHelpHint();
      const result = applyGraphWheelZoomInteraction(graphState, event.deltaY, {
        graphZoomOption,
        graphZoomStep
      });
      if (!result.changed) return;
      renderGraphPanel();
      requestAnimationFrame(centerGraphViewportIfZoomed);
    },
    { passive: false }
  );
}
