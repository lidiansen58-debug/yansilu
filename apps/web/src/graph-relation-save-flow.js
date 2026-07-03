export function normalizeGraphConfirmedRelationInput({
  noteId = "",
  targetNoteId = "",
  relationType = "associated_with",
  rationale = "",
  insightQuestion = ""
} = {}) {
  return {
    noteId: String(noteId || "").trim(),
    targetNoteId: String(targetNoteId || "").trim(),
    relationType: String(relationType || "associated_with").trim().toLowerCase() || "associated_with",
    rationale: String(rationale || "").trim(),
    insightQuestion: String(insightQuestion || "").trim()
  };
}

export function graphRelationSaveSelection({ previousSelection = null, button = null, noteId = "" } = {}) {
  const previousSelectionKind = String(previousSelection?.kind || "").trim().toLowerCase();
  const savingFromIsolatedFlow =
    previousSelectionKind === "isolated" ||
    previousSelectionKind === "isolatedcomplete" ||
    (previousSelectionKind === "relationform" && String(previousSelection?.returnTo || "").trim().toLowerCase() === "isolated") ||
    Boolean(button?.closest?.("[data-graph-isolated-flow]")) ||
    Boolean(button?.closest?.(".graph-selection-panel.is-isolated"));
  return savingFromIsolatedFlow ? { kind: "isolatedComplete", noteId } : { kind: "node", nodeId: noteId };
}

export function graphRelationSaveResult({
  targetNoteId = "",
  targetTitle = "",
  relationType = "",
  relationLabel = "",
  relation = null,
  savedAt = new Date().toISOString()
} = {}) {
  return {
    targetNoteId: String(targetNoteId || "").trim(),
    targetTitle: String(targetTitle || "").trim(),
    relationType: String(relationType || "").trim().toLowerCase(),
    relationLabel: String(relationLabel || "").trim(),
    created: relation?.created !== false,
    savedAt
  };
}

export function graphRelationSavedNextStepStatus({ created = true, hasNextIsolated = false } = {}) {
  const relationState = created ? "关系已保存" : "这条关系已经存在";
  const nextStep = hasNextIsolated
    ? "下一步继续处理下一条未关联笔记；每补清一条关系，后面形成主题会更稳。"
    : "下一步看这组关系能不能形成主题；理由清楚的关系更容易进入写作中心。";
  return `${relationState}，当前笔记已退出未关联状态。${nextStep}`;
}
