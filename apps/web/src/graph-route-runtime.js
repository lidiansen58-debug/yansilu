import { THEME_INDEX_MIN_NOTE_COUNT } from "./theme-index-entry-model.js";
import { buildGraphThemeConfirmedPayload } from "./graph-theme-confirmed-payload.js";
import { createGraphAnalysisRuntimeController } from "./graph-analysis-runtime-controller.js";

export function createGraphRouteRuntime(deps = {}) {
  const {
    addSystemMessage,
    createIndexCard,
    graphDataList,
    graphFindPotentialRelationCandidate,
    graphRelationSaveController,
    graphScopeDirectoryId,
    graphState,
    requestGraphThemeConfirmation = async () => null,
    graphThemeContextKey = () => [],
    isDirectoryUnderOriginalRoot,
    isWritingEligibleNote,
    openWritingModule = async () => {},
    refineGraphPotentialRelationCandidate,
    renderGraphPanel,
    setStatus,
    suggestedThemeIndexTitle,
    uniqueStrings,
    ensureNotesLoaded,
    writingKnownNoteById,
    writingNoteById,
    writingThemeIndexScopeDirectoryId,
    upsertWritingThemeIndex,
    useThemeIndexAsWritingEntry
  } = deps;

  const analysis = createGraphAnalysisRuntimeController(deps);

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

  let themeCreationInFlight = null;
  let themeConfirmationRecovery = null;
  const sameThemeContext = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
  async function createGraphThemeIndexFromNoteIds(noteIds = [], { title = "", source = "graph-theme-index" } = {}) {
    if (themeCreationInFlight) return themeCreationInFlight;
    themeCreationInFlight = performThemeCreation(noteIds, { title, source });
    try { return await themeCreationInFlight; }
    finally { themeCreationInFlight = null; }
  }

  async function performThemeCreation(noteIds, { title, source }) {
    const context = graphThemeContextKey();
    const stillCurrent = () => sameThemeContext(context, graphThemeContextKey());
    const requestedIds = uniqueStrings(noteIds);
    const materialKey = JSON.stringify([...requestedIds].sort());
    if (themeConfirmationRecovery && (!sameThemeContext(themeConfirmationRecovery.context, context) || themeConfirmationRecovery.materialKey !== materialKey)) {
      themeConfirmationRecovery = null;
    }
    if (requestedIds.length < THEME_INDEX_MIN_NOTE_COUNT) {
      setStatus(`至少需要 ${THEME_INDEX_MIN_NOTE_COUNT} 条相关永久笔记，才适合整理成可写主题`, "warn");
      return null;
    }
    await ensureNotesLoaded(requestedIds, { force: true });
    if (!stillCurrent()) return null;
    const eligibleIds = requestedIds.filter((id) => isGraphThemeIndexEligibleNote(writingKnownNoteById(id)));
    if (eligibleIds.length < THEME_INDEX_MIN_NOTE_COUNT) {
      setStatus(`这组笔记里可用于可写主题的永久笔记不足 ${THEME_INDEX_MIN_NOTE_COUNT} 条`, "warn");
      return null;
    }
    const suggestedTitle = String(title || suggestedThemeIndexTitle(eligibleIds)).trim();
    const confirmation = await requestGraphThemeConfirmation({
      notes: eligibleIds.map(id => writingNoteById(id) || writingKnownNoteById(id)), title: suggestedTitle,
      draft: themeConfirmationRecovery?.draft || null,
      saveError: themeConfirmationRecovery?.error || ""
    });
    if (!confirmation || !stillCurrent()) {
      themeConfirmationRecovery = null;
      return null;
    }
    const selectedIds = uniqueStrings(confirmation.noteIds || []).filter(id => eligibleIds.includes(id) && isGraphThemeIndexEligibleNote(writingKnownNoteById(id)));
    if (selectedIds.length < THEME_INDEX_MIN_NOTE_COUNT || !String(confirmation.centralQuestion || "").trim()) {
      setStatus("请确认主题问题，并保留至少 3 条相关永久笔记。", "warn");
      return null;
    }
    const writingEligibleIds = selectedIds.filter((id) => isWritingEligibleNote(writingKnownNoteById(id)));
    const canEnterWriting = writingEligibleIds.length === selectedIds.length;
    const cleanTitle = String(confirmation.title || confirmation.centralQuestion).trim();
    let card;
    try {
      card = await createIndexCard(buildGraphThemeConfirmedPayload({
        directoryId: writingThemeIndexScopeDirectoryId(),
        confirmation: { ...confirmation, title: cleanTitle, noteIds: selectedIds },
        edges: graphState.item?.edges || [],
        noteById: (id) => writingNoteById(id) || writingKnownNoteById(id)
      }));
      if (!card?.id) throw new Error("主题笔记创建失败");
    } catch (error) {
      themeConfirmationRecovery = stillCurrent() ? {
        context, materialKey,
        draft: { ...confirmation, noteIds: [...confirmation.noteIds], roles: { ...confirmation.roles } },
        error: `保存失败：${String(error?.message || error)}。请重试。`
      } : null;
      throw error;
    }
    themeConfirmationRecovery = null;
    if (!stillCurrent()) return card;
    upsertWritingThemeIndex(card);
    if (canEnterWriting) {
      try {
        await useThemeIndexAsWritingEntry(card.id, {
          replaceBasket: true,
          resetContext: true,
          source,
          assertCurrent: () => {
            if (!stillCurrent()) throw new Error("笔记库或图谱范围已切换，请从主题库继续。主题已保存。");
          }
        });
        if (!stillCurrent()) return card;
        await openWritingModule({
          statusMessage: `已从可写主题打开写作：${cleanTitle}`,
          preserveFocusedCandidateScope: true,
          entryReason: "从图谱可写主题继续写作",
          entrySourceLabel: "可写主题"
        });
      } catch (error) {
        if (stillCurrent()) setStatus(`主题“${cleanTitle}”已保存，但打开写作失败：${String(error?.message || error)}。请从主题库继续。`, "bad");
        return card;
      }
    }
    addSystemMessage({
      id: `graph-theme-index:${card.id}:${Date.now()}`,
      type: "system",
      title: "已保存可写主题",
      body: canEnterWriting
        ? `“${cleanTitle}”已收纳 ${selectedIds.length} 条笔记，并保留你确认的问题和已有关系。`
        : `“${cleanTitle}”已包含 ${selectedIds.length} 条笔记。还有 ${selectedIds.length - writingEligibleIds.length} 条材料需完成作者或原创确认，再继续写作。`,
      action: "open-writing",
      actionLabel: "继续整理主题",
      noteId: selectedIds[0],
      sourceNoteId: selectedIds[0],
      workflowRoute: {
        focus: "writing",
        source,
        indexCardId: card.id,
        basketNoteIds: selectedIds.join(",")
      }
    });
    setStatus(canEnterWriting
      ? `已保存可写主题：${cleanTitle}`
      : `主题“${cleanTitle}”已保存。还有 ${selectedIds.length - writingEligibleIds.length} 条材料需完成作者或原创确认，再继续写作。`,
    canEnterWriting ? "ok" : "warn", { priority: 3, holdMs: 4200 });
    renderGraphPanel();
    return card;
  }

  async function createGraphThemeIndexFromButton(button = null) {
    const noteIds = graphDataList(button, "data-graph-theme-note-ids");
    const title = String(button?.getAttribute?.("data-graph-theme-title") || "").trim();
    if (!noteIds.length) {
      setStatus("当前范围还没有可整理成可写主题的笔记", "warn");
      return null;
    }
    const previousDisabled = Boolean(button?.disabled);
    const context = graphThemeContextKey();
    if (button) button.disabled = true;
    try {
      return await createGraphThemeIndexFromNoteIds(noteIds, { title, source: "graph-theme-index" });
    } catch (error) {
      if (sameThemeContext(context, graphThemeContextKey())) setStatus(`保存可写主题失败：${String(error?.message || error)}。再次打开可继续填写并重试。`, "bad");
      return null;
    } finally {
      if (button) button.disabled = previousDisabled;
    }
  }

  return {
    ...analysis,
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
