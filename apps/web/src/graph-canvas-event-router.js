const noop = () => {};
const asyncNoop = async () => {};

export function bindGraphCanvasEvents(graphCanvas = null, deps = {}) {
  const {
    graphState = {},
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
    moveGraphIsolatedWorkflowTab = noop,
    activateGraphIsolatedWorkflowTab = noop,
    captureGraphIsolatedRelationDraftFromForm = noop,
    runGraphAiConnectForNote = asyncNoop,
    openGraphRelationFormInSelection = noop,
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
    centerGraphViewportIfZoomed = noop,
    requestAnimationFrame = (callback) => callback?.()
  } = deps || {};

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
      graphState.selection = null;
      renderGraphPanel();
      setStatus("已收起图谱思考详情", "ok");
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
      openGraphNodeSelectionFromElement(graphNode);
      return;
    }
    const graphEdge = event.target.closest(".graph-map-edge-group[data-edge-from]");
    if (graphEdge) {
      event.preventDefault();
      openGraphSelection({
        kind: "edge",
        edgeKey: String(graphEdge.getAttribute("data-edge-key") || "").trim(),
        relationId: String(graphEdge.getAttribute("data-edge-id") || "").trim(),
        fromNoteId: String(graphEdge.getAttribute("data-edge-from") || "").trim(),
        toNoteId: String(graphEdge.getAttribute("data-edge-to") || "").trim(),
        relationType: String(graphEdge.getAttribute("data-edge-relation-type") || "").trim().toLowerCase()
      });
      setStatus(`已选中关系复核：${String(graphEdge.getAttribute("data-edge-relation") || "关系").trim() || "关系"}`, "ok");
      return;
    }
    const row = event.target.closest("[data-open-note]");
    if (!row) return;
    event.preventDefault();
    openNoteById(row.dataset.openNote);
    setStatus("已从图谱打开笔记", "ok");
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
