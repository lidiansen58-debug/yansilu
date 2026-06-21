import {
  graphRelationSaveResult,
  graphRelationSaveSelection,
  normalizeGraphConfirmedRelationInput
} from "./graph-relation-save-flow.js";

function graphNodeMapForState(graphState = {}) {
  const nodes = Array.isArray(graphState.item?.nodes) ? graphState.item.nodes : [];
  return new Map(nodes.map((node) => [String(node?.id || "").trim(), node]).filter(([id]) => id));
}

function noteFallbackTitle(notes = [], noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  return notes.find((note) => note?.id === cleanNoteId)?.title || cleanNoteId;
}

export function createGraphRelationSaveController({
  graphState = {},
  getNotes = () => [],
  confirmableRelationTypes = new Set(),
  rationaleIsActionable = (value = "") => Boolean(String(value || "").trim()),
  createNoteRelation = async () => null,
  refreshDirectoryGraph = async () => {},
  renderGraphPanel = () => {},
  setStatus = () => {},
  graphNodeTitle = (_nodeMap, id = "", fallback = "") => fallback || id,
  relationTypeLabel = (type = "") => String(type || "").trim(),
  clearIsolatedRelationDraft = () => false,
  openRelationFormInSelection = () => false
} = {}) {
  const titleForNote = (nodeMap = new Map(), noteId = "") => graphNodeTitle(
    nodeMap,
    noteId,
    noteFallbackTitle(getNotes(), noteId)
  );

  const saveConfirmedRelation = async ({
    noteId = "",
    targetNoteId = "",
    relationType = "associated_with",
    rationale = "",
    insightQuestion = "",
    button = null
  } = {}) => {
    const {
      noteId: cleanNoteId,
      targetNoteId: cleanTargetNoteId,
      relationType: cleanRelationType,
      rationale: cleanRationale,
      insightQuestion: cleanInsightQuestion
    } = normalizeGraphConfirmedRelationInput({ noteId, targetNoteId, relationType, rationale, insightQuestion });
    if (!cleanNoteId || !cleanTargetNoteId) return false;
    if (cleanNoteId === cleanTargetNoteId) {
      setStatus("不能把笔记关联到它自己，请重新选择目标笔记", "warn");
      return false;
    }
    if (!confirmableRelationTypes.has(cleanRelationType) || cleanRelationType === "no_relation") {
      setStatus("请选择一种可以保存为正式关系的类型", "warn");
      return false;
    }
    if (!rationaleIsActionable(cleanRationale)) {
      setStatus("请先把关联理由写完整，再保存关系", "warn");
      return false;
    }
    const nodeMap = graphNodeMapForState(graphState);
    const targetTitle = titleForNote(nodeMap, cleanTargetNoteId);
    const relationLabel = relationTypeLabel(cleanRelationType);
    const previousSelection = graphState.selection && typeof graphState.selection === "object" ? { ...graphState.selection } : null;
    const nextSelection = graphRelationSaveSelection({ previousSelection, button, noteId: cleanNoteId });
    const previousText = button?.textContent || "";
    if (button) {
      button.disabled = true;
      button.textContent = "正在保存";
    }
    try {
      const relation = await createNoteRelation(cleanNoteId, {
        toNoteId: cleanTargetNoteId,
        relationType: cleanRelationType,
        rationale: cleanRationale,
        insightQuestion: cleanInsightQuestion,
        createdBy: "user",
        status: "confirmed"
      });
      graphState.isolatedRelationSaveResultByNoteId = graphState.isolatedRelationSaveResultByNoteId || {};
      graphState.isolatedRelationSaveResultByNoteId[cleanNoteId] = graphRelationSaveResult({
        targetNoteId: cleanTargetNoteId,
        targetTitle,
        relationType: cleanRelationType,
        relationLabel,
        relation
      });
      clearIsolatedRelationDraft(cleanNoteId);
      graphState.selection = nextSelection;
      await refreshDirectoryGraph();
      graphState.selection = nextSelection;
      renderGraphPanel();
      setStatus(relation?.created === false ? "这条关系已经存在，已保留在当前处理结果" : "关系已保存，当前笔记已接入关系网", "ok");
      return true;
    } catch (error) {
      setStatus(`保存关系失败：${String(error?.message || error)}`, "bad");
      if (button) {
        button.disabled = false;
        button.textContent = previousText || "保存关系";
      }
      return false;
    }
  };

  const saveCandidateRelation = async (button = null) => {
    const noteId = String(button?.getAttribute?.("data-open-note") || "").trim();
    const targetNoteId = String(button?.getAttribute?.("data-graph-target-note") || "").trim();
    const relationType = String(button?.getAttribute?.("data-graph-relation-type") || "associated_with").trim().toLowerCase() || "associated_with";
    const rationaleDraft = String(button?.getAttribute?.("data-graph-rationale-draft") || "").trim();
    const insightQuestionDraft = String(button?.getAttribute?.("data-graph-insight-question-draft") || "").trim();
    if (!noteId || !targetNoteId) return false;
    if (!confirmableRelationTypes.has(relationType) || relationType === "no_relation") {
      setStatus("这条可选关系不能保存为正式关系，请重新选择一条能说明理由的关联", "warn");
      return false;
    }
    const nodeMap = graphNodeMapForState(graphState);
    const sourceTitle = titleForNote(nodeMap, noteId);
    const targetTitle = titleForNote(nodeMap, targetNoteId);
    const relationLabel = relationTypeLabel(relationType);
    const rationale = rationaleIsActionable(rationaleDraft) ? rationaleDraft : "";
    if (!rationale) {
      openRelationFormInSelection(button);
      setStatus(`请先补一句“${sourceTitle}”和“${targetTitle}”为什么能建立${relationLabel}`, "warn");
      return false;
    }
    return saveConfirmedRelation({ noteId, targetNoteId, relationType, rationale, insightQuestion: insightQuestionDraft, button });
  };

  const saveAiCandidateRelation = async (button = null) => saveCandidateRelation(button);

  return {
    saveConfirmedRelation,
    saveCandidateRelation,
    saveAiCandidateRelation
  };
}
