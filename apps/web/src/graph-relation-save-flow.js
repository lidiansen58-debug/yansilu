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

const ORDINARY_RELATION_TYPES = new Set(["associated_with", "related", "free_link", "same_topic", "duplicates", "restates"]);

export function graphRelationSaveIsOrdinaryRelation(relationType = "") {
  return ORDINARY_RELATION_TYPES.has(String(relationType || "").trim().toLowerCase());
}

export function graphRelationSavedNextStepStatus({ created = true, hasNextIsolated = false, relationType = "" } = {}) {
  const ordinaryRelation = graphRelationSaveIsOrdinaryRelation(relationType);
  const relationState = ordinaryRelation
    ? created
      ? "关联已保存。"
      : "这条关联已经存在，已复用。"
    : created
      ? "关系已保存到图谱的关联。"
      : "这条关联已经存在，已复用。";
  const nextStep = hasNextIsolated
    ? "下一步可以继续处理下一条未关联笔记，也可以查看刚保存的关系。"
    : ordinaryRelation
      ? "下一步可以继续处理，或切到全部关系查看这条连接。"
      : "下一步可以继续处理、转到关联视图检查理由，或查看这组关系能不能形成主题。";
  return `${relationState}${nextStep}`;
}
