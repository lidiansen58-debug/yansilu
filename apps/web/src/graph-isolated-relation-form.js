export function graphIsolatedJoinNetworkFormModel(
  noteId = "",
  {
    nodeMap = new Map(),
    preferredTargetNoteId = "",
    preferredRelationType = "",
    preferredRationale = "",
    relationDraft = {},
    aiCandidates = [],
    manualTargets = [],
    loading = false,
    hasAnalysis = false
  } = {},
  {
    workflowTabKey = (value) => String(value || "").trim().toLowerCase() || "ai",
    activeTabForNote = () => "ai",
    reversibleRelationTypes = new Set(),
    nodeTitle = (_nodeMap, id, fallback = "") => fallback || id
  } = {}
) {
  const cleanNoteId = String(noteId || "").trim();
  const cleanPreferredTargetNoteId = String(preferredTargetNoteId || "").trim();
  const cleanPreferredRelationType = String(preferredRelationType || "").trim().toLowerCase();
  const cleanPreferredRationale = String(preferredRationale || "").trim();
  const safeDraft = relationDraft && typeof relationDraft === "object" ? relationDraft : {};
  const draftMode = safeDraft.mode || safeDraft.sourceMode ? workflowTabKey(safeDraft.mode || safeDraft.sourceMode) : "";
  const draftTargetNoteId = String(safeDraft.targetNoteId || "").trim();
  const draftAiTargetNoteId = String(safeDraft.aiTargetNoteId || (draftMode === "ai" ? draftTargetNoteId : "")).trim();
  const draftManualTargetNoteId = String(safeDraft.manualTargetNoteId || (draftMode === "manual" ? draftTargetNoteId : "")).trim();
  const draftOwnsValue = (key = "") => Object.prototype.hasOwnProperty.call(safeDraft, key);
  const sourceTitle = nodeTitle(nodeMap, cleanNoteId, "当前笔记");
  const activeMode = cleanPreferredTargetNoteId ? "manual" : draftMode || workflowTabKey(activeTabForNote(cleanNoteId));
  const activeRelationTypeKey = activeMode === "manual" ? "manualRelationType" : "aiRelationType";
  const activeRationaleKey = activeMode === "manual" ? "manualRationale" : "aiRationale";
  const activeRationaleSourceKey = activeMode === "manual" ? "manualRationaleSource" : "aiRationaleSource";
  const activeInsightQuestionKey = activeMode === "manual" ? "manualInsightQuestion" : "aiInsightQuestion";
  const legacyActiveMode = draftMode === activeMode;
  const hasActiveRelationTypeDraft =
    draftOwnsValue(activeRelationTypeKey) ||
    (legacyActiveMode && draftOwnsValue("relationType"));
  const hasActiveRationaleDraft =
    draftOwnsValue(activeRationaleKey) ||
    (legacyActiveMode && draftOwnsValue("rationale"));
  const hasActiveRationaleSourceDraft =
    draftOwnsValue(activeRationaleSourceKey) ||
    (legacyActiveMode && draftOwnsValue("rationaleSource"));
  const hasActiveInsightQuestionDraft =
    draftOwnsValue(activeInsightQuestionKey) ||
    (legacyActiveMode && draftOwnsValue("insightQuestion"));
  const draftRelationType = String(
    hasActiveRelationTypeDraft && draftOwnsValue(activeRelationTypeKey)
      ? safeDraft[activeRelationTypeKey]
      : legacyActiveMode && draftOwnsValue("relationType")
        ? safeDraft.relationType
        : ""
  ).trim().toLowerCase();
  const draftRationale = String(
    hasActiveRationaleDraft && draftOwnsValue(activeRationaleKey)
      ? safeDraft[activeRationaleKey]
      : legacyActiveMode && draftOwnsValue("rationale")
        ? safeDraft.rationale
        : ""
  ).trim();
  const draftRationaleSource = String(
    hasActiveRationaleSourceDraft && draftOwnsValue(activeRationaleSourceKey)
      ? safeDraft[activeRationaleSourceKey]
      : legacyActiveMode && draftOwnsValue("rationaleSource")
        ? safeDraft.rationaleSource
        : ""
  ).trim().toLowerCase();
  const draftInsightQuestion = String(
    hasActiveInsightQuestionDraft && draftOwnsValue(activeInsightQuestionKey)
      ? safeDraft[activeInsightQuestionKey]
      : legacyActiveMode && draftOwnsValue("insightQuestion")
        ? safeDraft.insightQuestion
        : ""
  ).trim();
  const effectiveRelationType = cleanPreferredRelationType || draftRelationType;
  const effectiveRationale = cleanPreferredRationale || (hasActiveRationaleDraft ? draftRationale : "");
  const safeAiCandidates = Array.isArray(aiCandidates) ? aiCandidates : [];
  const safeManualTargets = Array.isArray(manualTargets) ? manualTargets : [];
  const activeAiCandidate = activeMode === "ai"
    ? safeAiCandidates.find((candidate) => String(candidate?.counterpartNoteId || candidate?.targetNoteId || "").trim() === draftAiTargetNoteId) || safeAiCandidates[0] || null
    : null;
  const activeRawRelationType = String(activeAiCandidate?.relationType || "associated_with").trim().toLowerCase() || "associated_with";
  const activeActionSourceNoteId = String(activeAiCandidate?.actionSourceNoteId || activeAiCandidate?.sourceNoteId || "").trim();
  const selectedManualTargetNoteId = cleanPreferredTargetNoteId || draftManualTargetNoteId || (activeMode === "manual" ? draftTargetNoteId : "");
  const selectedManualTarget = selectedManualTargetNoteId
    ? safeManualTargets.find((target) => String(target?.id || "").trim() === selectedManualTargetNoteId) || null
    : null;
  const selectedManualTitle = String(selectedManualTarget?.title || (selectedManualTargetNoteId ? nodeTitle(nodeMap, selectedManualTargetNoteId, selectedManualTargetNoteId) : "")).trim();
  const manualSearchText = selectedManualTitle || String(safeDraft.manualSearchText || "").trim();
  const manualDefaultRationale = "";
  const aiRelationType =
    !activeAiCandidate ||
    !activeActionSourceNoteId ||
    activeActionSourceNoteId === cleanNoteId ||
    reversibleRelationTypes.has(activeRawRelationType)
      ? activeRawRelationType
      : "associated_with";
  const defaultRelationType = effectiveRelationType || (activeMode === "manual" ? "associated_with" : aiRelationType);
  const defaultRationale = hasActiveRationaleDraft || cleanPreferredRationale
    ? effectiveRationale
    : activeMode === "manual"
      ? manualDefaultRationale
      : activeAiCandidate && aiRelationType === activeRawRelationType
        ? String(activeAiCandidate?.rationaleDraft || "").trim()
        : "";
  const defaultRationaleSource = hasActiveRationaleDraft || cleanPreferredRationale
    ? draftRationaleSource || (defaultRationale ? "user" : "")
    : activeMode === "manual" && defaultRationale
      ? "manual"
      : activeMode === "ai" && defaultRationale
        ? "ai"
        : "";
  const activeAiTargetNoteId = String(activeAiCandidate?.counterpartNoteId || activeAiCandidate?.targetNoteId || "").trim();
  const previewTargetNoteId = activeMode === "manual" ? selectedManualTargetNoteId : activeAiTargetNoteId;

  return {
    cleanNoteId,
    cleanPreferredTargetNoteId,
    cleanPreferredRelationType,
    cleanPreferredRationale,
    relationDraft: safeDraft,
    sourceTitle,
    activeMode,
    hasAnalysis: Boolean(hasAnalysis),
    loading: Boolean(loading),
    activeAiCandidate,
    activeAiTargetNoteId,
    activeRawRelationType,
    activeActionSourceNoteId,
    selectedManualTargetNoteId,
    selectedManualTarget,
    selectedManualTitle,
    manualSearchText,
    defaultRelationType,
    defaultRationale,
    defaultRationaleSource,
    previewTargetNoteId,
    hasActiveInsightQuestionDraft,
    draftInsightQuestion
  };
}
