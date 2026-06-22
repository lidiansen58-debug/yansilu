export const QUICK_WIKILINK_ASSOCIATION_MARKER = "__yansilu_quick_wikilink_association__";

function cleanText(value = "") {
  return String(value || "").trim();
}

function cleanType(value = "") {
  return cleanText(value).toLowerCase();
}

export function normalizeRelationSaveTransactionInput({
  noteId = "",
  targetNoteId = "",
  relationType = "associated_with",
  rationale = "",
  insightQuestion = "",
  createdBy = "user",
  confidence = null,
  status = "confirmed"
} = {}) {
  return {
    noteId: cleanText(noteId),
    targetNoteId: cleanText(targetNoteId),
    relationType: cleanType(relationType) || "associated_with",
    rationale: cleanText(rationale),
    insightQuestion: cleanText(insightQuestion),
    createdBy: cleanText(createdBy) || "user",
    confidence: confidence == null ? null : Number(confidence),
    status: cleanType(status) || "confirmed"
  };
}

export function validateRelationSaveTransactionInput(input = {}, {
  confirmableRelationTypes = null,
  rationaleIsActionable = (value = "") => Boolean(cleanText(value))
} = {}) {
  const normalized = normalizeRelationSaveTransactionInput(input);
  if (!normalized.noteId) return { ok: false, reason: "missing_note", input: normalized };
  if (!normalized.targetNoteId) return { ok: false, reason: "missing_target", input: normalized };
  if (normalized.noteId === normalized.targetNoteId) return { ok: false, reason: "self_relation", input: normalized };
  if (confirmableRelationTypes?.has && (!confirmableRelationTypes.has(normalized.relationType) || normalized.relationType === "no_relation")) {
    return { ok: false, reason: "unsupported_type", input: normalized };
  }
  if (!rationaleIsActionable(normalized.rationale)) return { ok: false, reason: "missing_rationale", input: normalized };
  return { ok: true, reason: "", input: normalized };
}

export function relationSaveTransactionErrorText(reason = "") {
  const key = cleanType(reason);
  if (key === "missing_note") return "请先打开一条笔记。";
  if (key === "missing_target") return "请选择要关联的笔记。";
  if (key === "self_relation") return "不能把笔记关联到它自己，请重新选择目标笔记";
  if (key === "unsupported_type") return "请选择一种可以保存为正式关系的类型";
  if (key === "missing_rationale") return "请先把为什么相关写完整，再保存关系";
  return "关系暂时不能保存。";
}

export function relationPayloadFromTransactionInput(input = {}) {
  const payload = {
    toNoteId: input.targetNoteId,
    relationType: input.relationType,
    rationale: input.rationale,
    insightQuestion: input.insightQuestion,
    status: input.status || "confirmed"
  };
  if (input.createdBy) payload.createdBy = input.createdBy;
  if (Number.isFinite(input.confidence)) payload.confidence = input.confidence;
  return payload;
}

export function isMarkdownWikilinkRelationForTransaction(link = {}) {
  return cleanText(link?.rationale) === "markdown_wikilink";
}

function relationIdOf(relation = {}) {
  return cleanText(relation?.id || relation?.relationId);
}

export function relationSaveTransactionResult({
  targetNoteId = "",
  targetTitle = "",
  relationType = "",
  relationLabel = "",
  relation = null,
  savedAt = new Date().toISOString()
} = {}) {
  return {
    targetNoteId: cleanText(targetNoteId),
    targetTitle: cleanText(targetTitle),
    relationType: cleanType(relationType),
    relationLabel: cleanText(relationLabel),
    created: relation?.created !== false,
    savedAt
  };
}

export async function saveRelationTransaction(input = {}, {
  confirmableRelationTypes = null,
  rationaleIsActionable = (value = "") => Boolean(cleanText(value)),
  createNoteRelation = async () => null,
  targetTitle = "",
  relationLabel = "",
  savedAt = new Date().toISOString()
} = {}) {
  const validation = validateRelationSaveTransactionInput(input, { confirmableRelationTypes, rationaleIsActionable });
  if (!validation.ok) return { ok: false, reason: validation.reason, input: validation.input, error: relationSaveTransactionErrorText(validation.reason) };
  const relation = await createNoteRelation(validation.input.noteId, relationPayloadFromTransactionInput(validation.input));
  return {
    ok: true,
    reason: "",
    input: validation.input,
    relation,
    result: relationSaveTransactionResult({
      targetNoteId: validation.input.targetNoteId,
      targetTitle,
      relationType: validation.input.relationType,
      relationLabel,
      relation,
      savedAt
    })
  };
}

export async function saveOrUpgradeWikilinkRelationTransaction(input = {}, {
  fetchNoteRelations = async () => null,
  createNoteRelation = async () => null,
  updateNoteRelation = async () => null,
  isMarkdownWikilinkRelation = isMarkdownWikilinkRelationForTransaction,
  confirmableRelationTypes = null,
  rationaleIsActionable = (value = "") => Boolean(cleanText(value)),
  targetTitle = "",
  relationLabel = "",
  savedAt = new Date().toISOString()
} = {}) {
  const normalized = normalizeRelationSaveTransactionInput({
    ...input,
    insightQuestion: input.insightQuestion || QUICK_WIKILINK_ASSOCIATION_MARKER,
    confidence: input.confidence ?? 1
  });
  const validation = validateRelationSaveTransactionInput(normalized, { confirmableRelationTypes, rationaleIsActionable });
  if (!validation.ok) return { ok: false, reason: validation.reason, input: validation.input, error: relationSaveTransactionErrorText(validation.reason) };
  const latestRelations = await fetchNoteRelations(validation.input.noteId).catch(() => null);
  const wikilinkRelation = (Array.isArray(latestRelations?.outgoingLinks) ? latestRelations.outgoingLinks : []).find(
    (link) => cleanText(link?.toNoteId) === validation.input.targetNoteId && isMarkdownWikilinkRelation(link)
  );
  const payload = relationPayloadFromTransactionInput(validation.input);
  const relation = relationIdOf(wikilinkRelation)
    ? await updateNoteRelation(relationIdOf(wikilinkRelation), payload)
    : await createNoteRelation(validation.input.noteId, payload);
  const relationWasWikilinkOnly =
    relation?.created === false &&
    relationIdOf(relation) &&
    isMarkdownWikilinkRelation(relation);
  const finalRelation = relationWasWikilinkOnly
    ? await updateNoteRelation(relationIdOf(relation), payload)
    : relation;
  return {
    ok: true,
    reason: "",
    upgradedWikilink: Boolean(relationIdOf(wikilinkRelation) || relationWasWikilinkOnly),
    input: validation.input,
    relation: finalRelation,
    result: relationSaveTransactionResult({
      targetNoteId: validation.input.targetNoteId,
      targetTitle,
      relationType: validation.input.relationType,
      relationLabel,
      relation: finalRelation,
      savedAt
    })
  };
}
