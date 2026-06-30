import { graphAiConnectAnalysisOptions, graphAiConnectArtifactCount, graphAiConnectCandidateTitles, graphAiConnectPreviewTargetId } from "./graph-ai-connect-model.js";

export function createGraphAiConnectRuntimeController(depsProvider = () => ({})) {
  const runtimeDeps = () => depsProvider() || {};
  const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitForGraphLoad(graphState = {}, { timeoutMs = 15000, intervalMs = 50 } = {}) {
    if (!graphState.loading) return true;
    const deadline = Date.now() + timeoutMs;
    while (graphState.loading && Date.now() < deadline) await wait(intervalMs);
    return !graphState.loading;
  }

  async function refineGraphPotentialRelationsForNote(noteId = "", candidates = [], { directoryId = "" } = {}) {
    const { setStatus = () => {} } = runtimeDeps();
    const cleanNoteId = String(noteId || "").trim();
    const items = (Array.isArray(candidates) ? candidates : []).filter(Boolean).slice(0, 3);
    if (!cleanNoteId || !items.length) return;
    let generatedThisRun = 0;
    let waitingConfirmationThisRun = 0;
    let failedThisRun = 0;
    let removedThisRun = 0;
    for (const candidate of items) {
      const refineResult = await refineGraphPotentialRelationCandidate(cleanNoteId, candidate, { directoryId });
      if (refineResult?.aiReasonGenerated) generatedThisRun += 1;
      if (refineResult?.removed) {
        removedThisRun += 1;
        continue;
      }
      if (refineResult?.needsConfirmation) {
        waitingConfirmationThisRun += 1;
        break;
      }
      if (refineResult?.ok === false) failedThisRun += 1;
    }
    if (waitingConfirmationThisRun && generatedThisRun) {
      setStatus(`已补充 ${generatedThisRun} 条潜在关联的 AI 复核理由，另有 ${waitingConfirmationThisRun} 条等待你确认当前 AI 设置后再生成理由`, "warn");
      return;
    }
    if (waitingConfirmationThisRun) {
      setStatus(`${waitingConfirmationThisRun} 条潜在关联等待你确认当前 AI 设置后再生成理由`, "warn");
      return;
    }
    if (removedThisRun && generatedThisRun) {
      setStatus(`已补充 ${generatedThisRun} 条潜在关联的 AI 复核理由，另有 ${removedThisRun} 条因图谱已变化从候选列表移除`, "warn");
      return;
    }
    if (removedThisRun && failedThisRun) {
      setStatus(`${failedThisRun} 条潜在关联暂未生成 AI 理由，另有 ${removedThisRun} 条因图谱已变化从候选列表移除`, "warn");
      return;
    }
    if (removedThisRun) {
      return;
    }
    if (failedThisRun && generatedThisRun) {
      setStatus(`已补充 ${generatedThisRun} 条潜在关联的 AI 复核理由，另有 ${failedThisRun} 条暂未生成理由，可稍后重试`, "warn");
      return;
    }
    if (failedThisRun) {
      setStatus(`${failedThisRun} 条潜在关联暂未生成 AI 理由，可稍后重试`, "warn");
      return;
    }
    if (generatedThisRun) {
      setStatus(`已补充 ${generatedThisRun} 条潜在关联的 AI 复核理由`, "ok");
    }
  }

  async function refineGraphPotentialRelationCandidate(noteId = "", candidate = {}, { directoryId = "", confirmationApproved = false } = {}) {
    const {
      graphPotentialRelationNeedsConfirmation = () => false,
      mergePotentialRelationCandidateIntoGraphAnalysis = () => false,
      refinePotentialRelationCandidate = async () => null,
      removePotentialRelationCandidateFromGraphAnalysis = () => false,
      renderGraphPanel = () => {},
      setStatus = () => {}
    } = runtimeDeps();
    const cleanNoteId = String(noteId || candidate?.sourceNoteId || candidate?.fromNoteId || "").trim();
    if (!cleanNoteId || !candidate) return { ok: false, needsConfirmation: false };
    try {
      const refined = await refinePotentialRelationCandidate({
        directoryId,
        includeDescendants: true,
        focusNoteId: cleanNoteId,
        currentNoteId: cleanNoteId,
        candidate,
        timeoutMs: 60000,
        ...(confirmationApproved ? { confirmationApproved: true, confirmBudget: true } : {})
      });
      const merged = Boolean(refined && mergePotentialRelationCandidateIntoGraphAnalysis(refined));
      if (merged) renderGraphPanel();
      const aiReason = String(refined?.aiRationale || "").trim();
      const aiError = String(refined?.aiError || "").trim();
      const needsConfirmation =
        refined?.aiNeedsConfirmation === true ||
        graphPotentialRelationNeedsConfirmation(refined) ||
        refined?.aiErrorCode === "AI_ROUTE_CONFIRMATION_REQUIRED" ||
        refined?.aiErrorCode === "AI_BUDGET_CONFIRMATION_REQUIRED";
      if (needsConfirmation) {
        setStatus("当前 AI 设置需要确认后才能生成这条关系说明", "warn");
        return { ok: false, needsConfirmation: true, merged };
      }
      if (confirmationApproved && aiReason) {
        setStatus(
          merged ? "已确认使用当前 AI 设置，并补充这条潜在关联的复核理由" : "AI 理由已生成，但当前图谱范围已变化，请重新打开这条笔记查看",
          merged ? "ok" : "warn"
        );
        return { ok: true, needsConfirmation: false, merged, aiReasonGenerated: true };
      }
      if (aiError) {
        setStatus(`生成关系说明失败：${aiError}`, "warn");
        return { ok: false, needsConfirmation: false, merged };
      }
      if (confirmationApproved) {
        setStatus("未生成可用的关系说明，请稍后重试", "warn");
        return { ok: false, needsConfirmation: false, merged };
      }
      return { ok: true, needsConfirmation: false, merged, aiReasonGenerated: Boolean(aiReason) };
    } catch (error) {
      const code = String(error?.code || "").trim();
      if (code === "POTENTIAL_RELATION_CANDIDATE_NOT_FOUND") {
        const removed = removePotentialRelationCandidateFromGraphAnalysis(candidate);
        if (removed) renderGraphPanel();
        setStatus("这条潜在关联已不在当前图谱范围内，已从候选列表移除", "warn");
        return { ok: false, needsConfirmation: false, merged: false, removed };
      }
      const needsConfirmation = code === "AI_ROUTE_CONFIRMATION_REQUIRED" || code === "AI_BUDGET_CONFIRMATION_REQUIRED";
      mergePotentialRelationCandidateIntoGraphAnalysis({
        ...candidate,
        aiError: needsConfirmation ? "当前 AI 设置需要确认后才能生成理由。" : String(error?.message || error),
        aiErrorCode: code,
        aiNeedsConfirmation: needsConfirmation
      });
      renderGraphPanel();
      if (needsConfirmation) setStatus("当前 AI 设置需要确认后才能生成这条关系说明", "warn");
      else setStatus(`生成关系说明失败：${String(error?.message || error)}`, "warn");
      return { ok: false, needsConfirmation, merged: true };
    }
  }

  async function runGraphAiConnectForNote(noteId = "") {
    const {
      addSystemMessage = () => {},
      analyzeDirectoryGraph = async () => null,
      ensureGraphLocalAiReadyForAnalysis = async () => true,
      graphAiRelationCandidatesForNote = () => [],
      graphNodeTitle = (_map, _id, fallback = "") => fallback,
      graphRelationStatusCountsAsNetworkEdge = undefined,
      graphRelationWorkflowController = null,
      graphScopeDirectoryId = () => "",
      graphState = {},
      renderGraphPanel = () => {},
      setGraphIsolatedWorkflowActiveTab = () => "",
      setStatus = () => {},
      state = {}
    } = runtimeDeps();
    const cleanNoteId = String(noteId || "").trim();
    if (!cleanNoteId || graphState.aiAnalysisLoading) return false;
    await waitForGraphLoad(graphState);
    const directoryId = graphScopeDirectoryId();
    const previousSelection = graphState.selection;
    graphState.aiAnalysisLoading = true;
    graphState.aiAnalysisError = "";
    graphRelationWorkflowController.startAiConnectForNote(cleanNoteId);
    try {
      const localAiReady = await ensureGraphLocalAiReadyForAnalysis();
      if (!localAiReady) return false;
      const result = await analyzeDirectoryGraph(directoryId, graphAiConnectAnalysisOptions(cleanNoteId));
      graphState.aiAnalysis = result;
      const nodes = Array.isArray(graphState.item?.nodes) ? graphState.item.nodes : [];
      const currentEdges = Array.isArray(graphState.item?.edges) ? graphState.item.edges : [];
      const route = graphRelationWorkflowController.applyAiConnectRoute({
        noteId: cleanNoteId,
        previousSelection,
        edges: currentEdges,
        relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge
      });
      const graphSelectionKind = route?.graphSelectionKind || "isolated";
      const nodeMap = new Map(nodes.map((node) => [String(node?.id || "").trim(), node]).filter(([id]) => id));
      const candidates = graphAiRelationCandidatesForNote(cleanNoteId, { nodeMap, edges: currentEdges, limit: 5 });
      const firstTargetId = graphAiConnectPreviewTargetId(candidates);
      if (firstTargetId) {
        graphState.isolatedCandidatePreviewByNoteId = graphState.isolatedCandidatePreviewByNoteId || {};
        graphState.isolatedCandidatePreviewByNoteId[cleanNoteId] = firstTargetId;
        setGraphIsolatedWorkflowActiveTab(cleanNoteId, "ai");
        const firstCandidate = candidates[0] || {};
        graphState.selection = {
          kind: "relationForm", noteId: cleanNoteId, targetNoteId: firstTargetId,
          relationType: String(firstCandidate.relationType || firstCandidate.type || "associated_with").trim() || "associated_with",
          rationale: String(firstCandidate.rationale || firstCandidate.aiRationale || "").trim(),
          returnTo: graphSelectionKind === "isolated" ? "isolated" : ""
        };
      }
      const noteTitle = graphNodeTitle(nodeMap, cleanNoteId, state.notes.find((note) => note.id === cleanNoteId)?.title || cleanNoteId);
      const candidateTitles = graphAiConnectCandidateTitles(candidates);
      const count = graphAiConnectArtifactCount(result);
      if (count > 0) {
        const messageId = `graph-ai-connect:${directoryId || "root"}:${cleanNoteId}:${Date.now()}`;
        addSystemMessage({
          id: messageId,
          type: "ai",
          title: `${noteTitle} 发现了潜在关联`,
          body: candidates.length
            ? `“${noteTitle}”找到 ${candidates.length} 个可选目标${candidateTitles.length ? `：${candidateTitles.join("、")}` : ""}。打开后只保存能说清理由的关系。`
            : `“${noteTitle}”接入扫描完成，但暂时没有足够清楚的候选连接。`,
          action: "open-graph",
          actionLabel: "查看候选并确认关系",
          noteId: cleanNoteId,
          sourceNoteId: cleanNoteId,
          artifactCount: candidates.length,
          workflowRoute: { focus: "graph", source: "graph-ai-connect", graphSelectionKind }
        });
        graphState.aiReviewSystemMessageId = messageId;
      }
      graphState.thinkingPanelVisible = true;
      setStatus(candidates.length ? `已找到 ${candidates.length} 条潜在关联，请确认后再写入图谱` : "当前笔记接入扫描完成，暂无清楚候选连接", candidates.length ? "ok" : "warn");
      if (candidates.length && !firstTargetId) void refineGraphPotentialRelationsForNote(cleanNoteId, candidates, { directoryId });
      return true;
    } catch (error) {
      graphState.aiAnalysisError = String(error?.message || error);
      setStatus(`AI 找连接失败：${graphState.aiAnalysisError}`, "warn");
      return false;
    } finally {
      graphState.aiAnalysisLoading = false;
      renderGraphPanel();
    }
  }

  return { refineGraphPotentialRelationCandidate, refineGraphPotentialRelationsForNote, runGraphAiConnectForNote };
}
