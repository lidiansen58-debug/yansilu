export function createGraphAnalysisRuntimeController(deps = {}) {
  const {
    analyzeDirectoryGraph,
    graphAiConnectRuntimeController,
    graphScopeDirectoryId,
    graphState,
    ensureLocalAiReadyForFeature = async () => ({ ready: true }),
    localOllamaSetupActive,
    ollamaBootstrapStatusText,
    renderGraphPanel,
    setStatus
  } = deps;

  async function runGraphAiAnalysis() {
    if (graphState.aiAnalysisLoading) return;
    const directoryId = graphScopeDirectoryId();
    graphState.aiAnalysisLoading = true;
    graphState.aiAnalysisError = "";
    renderGraphPanel();
    try {
      const localAiReady = await ensureGraphLocalAiReadyForAnalysis();
      if (!localAiReady) return;
      const result = await analyzeDirectoryGraph(directoryId, {
        includeDescendants: true,
        minScore: 0.05,
        persistArtifacts: true
      });
      graphState.aiAnalysis = result;
      const count = Number(result?.reviewItems?.summary?.artifactCount || 0);
      graphState.aiReviewSystemMessageId = "";
      graphState.thinkingPanelVisible = true;
      graphState.thinkingPanelOpen = true;
      graphState.thinkingFilter = "all";
      graphState.workbenchPanelOpen = true;
      if (graphState.workbenchPanelTab !== "clues") graphState.workbenchPanelTab = "questions";
      setStatus(count ? `已找到 ${count} 条建议，请逐条确认` : "当前没有新的建议", count ? "ok" : "");
    } catch (error) {
      graphState.aiAnalysisError = String(error?.message || error);
      setStatus(`找缺口失败：${graphState.aiAnalysisError}`, "warn");
    } finally {
      graphState.aiAnalysisLoading = false;
      renderGraphPanel();
    }
  }

  async function ensureGraphLocalAiReadyForAnalysis() {
    const readiness = await ensureLocalAiReadyForFeature({ feature: "graph_analysis", openSettings: false });
    if (readiness?.ready === true) {
      renderGraphPanel();
      return true;
    }
    if (readiness?.skipped === true && !localOllamaSetupActive()) return true;
    const bootstrapResult = readiness?.result || null;
    graphState.aiAnalysisError = String(readiness?.message || `${ollamaBootstrapStatusText(bootstrapResult)}。AI 不可用不影响继续手工整理关系。`).trim();
    if (!readiness?.message) setStatus(graphState.aiAnalysisError, "warn");
    return false;
  }

  async function runGraphAiConnectForNote(noteId = "") {
    const readiness = await ensureLocalAiReadyForFeature({ feature: "graph_connect", openSettings: false });
    if (readiness?.ready === false) return false;
    return graphAiConnectRuntimeController.runGraphAiConnectForNote(noteId);
  }

  return { runGraphAiAnalysis, ensureGraphLocalAiReadyForAnalysis, runGraphAiConnectForNote };
}
