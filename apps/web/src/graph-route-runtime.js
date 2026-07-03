import { buildThemeIndexCreatePayload, THEME_INDEX_MIN_NOTE_COUNT } from "./theme-index-entry-model.js";

export function createGraphRouteRuntime(deps = {}) {
  const {
    addSystemMessage,
    analyzeDirectoryGraph,
    createIndexCard,
    graphAiConnectRuntimeController,
    graphDataList,
    graphFindPotentialRelationCandidate,
    graphRelationSaveController,
    graphScopeDirectoryId,
    graphState,
    isDirectoryUnderOriginalRoot,
    isWritingEligibleNote,
    localAiPreviewOptionsForAction,
    localOllamaSetupActive,
    normalizeWritingProjectTitleSeed,
    ollamaBootstrapStatusText,
    openWritingModule = async () => {},
    previewOllamaLocalAiBootstrapFromUi,
    refineGraphPotentialRelationCandidate,
    renderGraphPanel,
    setStatus,
    setWritingSourceIndexIds,
    suggestedThemeIndexTitle,
    uniqueStrings,
    ensureNotesLoaded,
    writingKnownNoteById,
    writingNoteById,
    writingThemeIndexScopeDirectoryId,
    upsertWritingThemeIndex,
    continueWritingEntry
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
      if (count > 0) {
        graphState.aiReviewSystemMessageId = "";
      } else {
        graphState.aiReviewSystemMessageId = "";
      }
      graphState.thinkingPanelVisible = true;
      graphState.thinkingPanelOpen = true;
      graphState.thinkingFilter = "all";
      graphState.workbenchPanelOpen = true;
      graphState.workbenchPanelTab = "questions";
      setStatus(
        count ? `目录批处理已生成 ${count} 条待确认推荐，已在追问中展开` : "目录批处理完成，已打开追问",
        count ? "ok" : ""
      );
    } catch (error) {
      graphState.aiAnalysisError = String(error?.message || error);
      setStatus(`AI 图谱初判失败：${graphState.aiAnalysisError}`, "warn");
    } finally {
      graphState.aiAnalysisLoading = false;
      renderGraphPanel();
    }
  }

  async function ensureGraphLocalAiReadyForAnalysis() {
    if (!localOllamaSetupActive()) return true;
    const bootstrapResult = await previewOllamaLocalAiBootstrapFromUi(localAiPreviewOptionsForAction("graph_analysis"));
    if (bootstrapResult?.ready === true) {
      renderGraphPanel();
      return true;
    }
    graphState.aiAnalysisError = `${ollamaBootstrapStatusText(bootstrapResult)}。请先到 AI 设置完成安装、启动或模型下载。`;
    setStatus(graphState.aiAnalysisError, "warn");
    return false;
  }

  async function runGraphAiConnectForNote(noteId = "") {
    return graphAiConnectRuntimeController.runGraphAiConnectForNote(noteId);
  }

  async function saveGraphCandidateRelation(button = null) {
    return graphRelationSaveController.saveCandidateRelation(button);
  }

  async function saveGraphAiCandidateRelation(button = null) {
    return graphRelationSaveController.saveAiCandidateRelation(button);
  }

  async function triggerGraphPotentialRelationRefine(
    button = null,
    { confirmationApproved = false, missingStatus = "没有找到这条待确认关联，请重新运行当前笔记的接入扫描", progressStatus = "正在生成关系说明..." } = {}
  ) {
    const candidate = graphFindPotentialRelationCandidate({
      candidateId: button?.getAttribute?.("data-graph-candidate-id"),
      sourceNoteId: button?.getAttribute?.("data-graph-source-note"),
      targetNoteId: button?.getAttribute?.("data-graph-target-note")
    });
    if (!candidate) {
      setStatus(missingStatus, "warn");
      return false;
    }
    const sourceNoteId = String(candidate.sourceNoteId || candidate.fromNoteId || button?.getAttribute?.("data-graph-source-note") || "").trim();
    setStatus(progressStatus, "warn");
    const result = await refineGraphPotentialRelationCandidate(sourceNoteId, candidate, {
      directoryId: graphScopeDirectoryId(),
      confirmationApproved
    });
    if (!confirmationApproved && result?.aiReasonGenerated) {
      setStatus(
        result?.merged ? "已重新生成这条可能关联的 AI 理由" : "AI 理由已生成，但当前图谱范围已变化，请重新打开这条笔记查看",
        result?.merged ? "ok" : "warn"
      );
    }
    return result;
  }

  async function confirmGraphPotentialRelationRefine(button = null) {
    return triggerGraphPotentialRelationRefine(button, {
      confirmationApproved: true,
      progressStatus: "正在按当前 AI 设置生成关系说明..."
    });
  }

  async function retryGraphPotentialRelationRefine(button = null) {
    return triggerGraphPotentialRelationRefine(button, {
      confirmationApproved: false,
      missingStatus: "没有找到这条待重试关联，请重新运行当前笔记的接入扫描",
      progressStatus: "正在重新生成关系说明..."
    });
  }

  function isGraphThemeIndexEligibleNote(note = null) {
    if (!note) return false;
    const noteType = String(note.noteType || note.note_type || "").trim().toLowerCase();
    return noteType === "permanent" || isDirectoryUnderOriginalRoot(note.folderId);
  }

  async function createGraphThemeIndexFromNoteIds(noteIds = [], { title = "", source = "graph-theme-index" } = {}) {
    const requestedIds = uniqueStrings(noteIds);
    if (requestedIds.length < THEME_INDEX_MIN_NOTE_COUNT) {
      setStatus(`至少需要 ${THEME_INDEX_MIN_NOTE_COUNT} 条相关永久笔记，才适合整理成主题索引笔记`, "warn");
      return null;
    }
    await ensureNotesLoaded(requestedIds, { force: true });
    const eligibleIds = requestedIds.filter((id) => isGraphThemeIndexEligibleNote(writingKnownNoteById(id)));
    if (eligibleIds.length < THEME_INDEX_MIN_NOTE_COUNT) {
      setStatus(`这组笔记里可用于主题索引笔记的永久笔记不足 ${THEME_INDEX_MIN_NOTE_COUNT} 条`, "warn");
      return null;
    }
    const writingEligibleIds = eligibleIds.filter((id) => isWritingEligibleNote(writingKnownNoteById(id)));
    const cleanTitle = String(title || suggestedThemeIndexTitle(eligibleIds)).trim() || suggestedThemeIndexTitle(eligibleIds);
    const card = await createIndexCard(buildThemeIndexCreatePayload({
      directoryId: writingThemeIndexScopeDirectoryId(),
      noteIds: eligibleIds,
      title: cleanTitle,
      relationCount: Number(graphState.item?.edges?.length || 0),
      noteById: (id) => writingNoteById(id) || writingKnownNoteById(id)
    }));
    if (!card?.id) throw new Error("主题笔记创建失败");
    upsertWritingThemeIndex(card);
    if (writingEligibleIds.length >= 2) {
      setWritingSourceIndexIds([card.id]);
      continueWritingEntry(writingEligibleIds, {
        title: normalizeWritingProjectTitleSeed(cleanTitle),
        source,
        sourceIndexIds: [card.id]
      });
      await openWritingModule({
        statusMessage: `已从主题索引打开写作中心：${cleanTitle}`,
        preserveFocusedCandidateScope: true,
        entryReason: "从图谱主题索引继续写作",
        entrySourceLabel: "主题索引笔记"
      });
    }
    const canEnterWriting = writingEligibleIds.length >= 2;
    addSystemMessage({
      id: `graph-theme-index:${card.id}:${Date.now()}`,
      type: "system",
      title: "已创建主题索引笔记",
      body: canEnterWriting
        ? `“${cleanTitle}”已收纳 ${eligibleIds.length} 条关键永久笔记，并写入主题问题、每条为什么重要和下一步可以写什么。`
        : `“${cleanTitle}”已包含 ${eligibleIds.length} 条关键永久笔记。先补作者确认或状态，再进入写作会更稳。`,
      action: "open-writing",
      actionLabel: "继续整理主题",
      noteId: eligibleIds[0],
      sourceNoteId: eligibleIds[0],
      workflowRoute: {
        focus: "writing",
        source,
        indexCardId: card.id,
        basketNoteIds: eligibleIds.join(",")
      }
    });
    setStatus(`已创建主题索引笔记：${cleanTitle}`, "ok", { priority: 3, holdMs: 4200 });
    renderGraphPanel();
    return card;
  }

  async function createGraphThemeIndexFromButton(button = null) {
    const noteIds = graphDataList(button, "data-graph-theme-note-ids");
    const title = String(button?.getAttribute?.("data-graph-theme-title") || "").trim();
    if (!noteIds.length) {
      setStatus("当前范围还没有可整理成主题索引笔记的笔记", "warn");
      return null;
    }
    const previousDisabled = Boolean(button?.disabled);
    if (button) button.disabled = true;
    try {
      return await createGraphThemeIndexFromNoteIds(noteIds, { title, source: "graph-theme-index" });
    } catch (error) {
      setStatus(`创建主题索引笔记失败：${String(error?.message || error)}`, "bad");
      return null;
    } finally {
      if (button) button.disabled = previousDisabled;
    }
  }

  return {
    runGraphAiAnalysis,
    ensureGraphLocalAiReadyForAnalysis,
    runGraphAiConnectForNote,
    saveGraphCandidateRelation,
    saveGraphAiCandidateRelation,
    triggerGraphPotentialRelationRefine,
    confirmGraphPotentialRelationRefine,
    retryGraphPotentialRelationRefine,
    isGraphThemeIndexEligibleNote,
    createGraphThemeIndexFromNoteIds,
    createGraphThemeIndexFromButton
  };
}
