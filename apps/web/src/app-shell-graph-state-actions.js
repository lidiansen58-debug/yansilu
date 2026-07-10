export async function handleGraphAssociateNoteStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    graphState = {},
    explorer = null,
    graphOriginalScopeDirectoryId = "",
    openRelationComposerFromGraphAction = null,
    graphAssociateNoteRoute = () => ({ kind: "" }),
    graphNodeNeedsRelationWorkflowFromCurrentGraph = () => false,
    applyExplorerSelectionContext = () => {},
    refreshDirectoryGraph = async () => false,
    setStatus = () => {},
    handleStateChange = async () => false
  } = deps;

  const noteId = String(payload.noteId || "").trim();
  if (!noteId) return false;
  const importedPermanentNoteIds = Array.isArray(payload.importedPermanentNoteIds)
    ? payload.importedPermanentNoteIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (importedPermanentNoteIds.length) {
    graphState.importIsolatedScopeNoteIds = importedPermanentNoteIds;
  }
  const route = graphAssociateNoteRoute({
    noteId,
    source: payload.source,
    module: state.module,
    needsRelationWorkflow: graphNodeNeedsRelationWorkflowFromCurrentGraph(noteId)
  });
  applyExplorerSelectionContext({
    noteId,
    syncSearch: false,
    expandFolder: true
  });

  const openSharedGraphComposer = (action = {}) => {
    if (typeof openRelationComposerFromGraphAction !== "function") return false;
    return openRelationComposerFromGraphAction({
      noteId: action.noteId || noteId,
      relationType: action.relationType,
      source: "graph",
      candidateSource: action.candidateSource || "",
      returnTo: "graph"
    });
  };

  if (state.module === "graph") {
    explorer?.collapseDisconnectedGroup?.(state.selectedFolderId, { auto: true });
    explorer?.collapseDisconnectedGroup?.(graphOriginalScopeDirectoryId, { auto: true });
    if (payload.source === "today-organizing") {
      await refreshDirectoryGraph();
      if (!openSharedGraphComposer({ candidateSource: "today-organizing" })) {
        setStatus("Relation composer did not open. Please try again.", "warn");
        return false;
      }
      setStatus("已打开关联笔记面板。搜索目标笔记，写清楚为什么相关后保存。", "ok");
      return true;
    }
    if (payload.source === "import-result") {
      if (!openSharedGraphComposer({ candidateSource: "import-result" })) {
        setStatus("Relation composer did not open. Please try again.", "warn");
        return false;
      }
      setStatus("已打开关联笔记面板。搜索目标笔记，写清楚为什么相关后保存。", "ok");
      return true;
    }
    if (route.kind === "graph-open-relation-form") {
      if (openSharedGraphComposer({
        noteId: route.noteId,
        relationType: route.relationType,
        candidateSource: route.candidateSource
      })) {
        return true;
      }
      setStatus("Relation composer did not open. Please try again.", "warn");
      return false;
    }
    setStatus("Relation composer did not open. Please try again.", "warn");
    return false;
  }
  return handleStateChange(route.kind, { noteId: route.noteId, source: route.source });
}

export async function handleRunNoteAiAnalysisStateChange(payload = {}, deps = {}) {
  const {
    state = {},
    aiInboxState = {},
    analyzePermanentNote = async () => null,
    ensureLocalAiReadyForFeature = async () => ({ ready: true }),
    noteAnalysisSystemMessageForResult = () => null,
    addSystemMessage = () => {},
    normalizeAiInboxFilters = (filters) => filters,
    openSystemMessages = () => {},
    setStatus = () => {}
  } = deps;

  const noteId = String(payload.noteId || "").trim();
  if (!noteId) return false;
  try {
    const localAiReady = await ensureLocalAiReadyForFeature({
      feature: "note_analysis",
      openSettings: payload.openSettingsOnMissingAi !== false
    });
    if (localAiReady?.ready === false) return false;
    setStatus("正在运行本地永久笔记 AI 分析...", "warn");
    const result = await analyzePermanentNote(noteId, {
      relatedNoteIds: Array.isArray(payload.relatedNoteIds) ? payload.relatedNoteIds : [],
      persistArtifacts: payload.persistArtifacts !== false
    });
    const artifactCount = Number(result?.reviewItems?.storedArtifactIds?.length || result?.reviewItems?.artifacts?.length || 0);
    let systemMessage = null;
    if (artifactCount > 0) {
      const noteTitle = (state.notes || []).find((item) => item.id === noteId)?.title || noteId;
      systemMessage = noteAnalysisSystemMessageForResult({ noteId, noteTitle, result });
      if (systemMessage) addSystemMessage(systemMessage, { interrupt: true });
    }
    if (systemMessage && payload.openInbox !== false) {
      aiInboxState.filters = normalizeAiInboxFilters({
        ...aiInboxState.filters,
        view: "pending",
        sourceNoteId: noteId
      });
      aiInboxState.detail = null;
      aiInboxState.selectedArtifactId = "";
      openSystemMessages({ latestOnly: true });
    }
    setStatus(
      artifactCount
        ? payload.openInbox === false
          ? `已生成 ${artifactCount} 条待审 AI 建议，可在当前笔记里处理`
          : systemMessage
            ? `已生成 ${artifactCount} 条待审 AI 建议，已放入系统消息`
            : `已生成 ${artifactCount} 条待审 AI 建议，可在当前笔记里处理`
        : "本地 AI 分析完成，暂时没有新的待审核建议",
      artifactCount ? "ok" : "warn"
    );
    return result || true;
  } catch (error) {
    setStatus(`永久笔记 AI 分析失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}
