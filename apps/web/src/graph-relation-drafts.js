export function normalizeGraphRelationSourceMode(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return key === "manual" ? "manual" : "ai";
}

export function graphIsolatedRelationDraftForState(graphState = {}, noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  const draft = cleanNoteId ? graphState?.isolatedRelationDraftByNoteId?.[cleanNoteId] : null;
  return draft && typeof draft === "object" ? draft : {};
}

export function clearGraphIsolatedRelationDraftForState(graphState = {}, noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId || !graphState?.isolatedRelationDraftByNoteId) return false;
  delete graphState.isolatedRelationDraftByNoteId[cleanNoteId];
  return true;
}

export function isolatedRelationDraftFromForm(form = null, { previousDraft = {}, normalizeMode = normalizeGraphRelationSourceMode } = {}) {
  if (!form) return null;
  const noteId = String(form.getAttribute?.("data-source-note") || "").trim();
  if (!noteId) return null;
  const mode = normalizeMode(form.querySelector?.("[data-graph-relation-source-mode]")?.value || "ai");
  const aiSelect = form.querySelector?.("[data-graph-ai-candidate-select]");
  const manualTarget = form.querySelector?.("[data-graph-manual-target-id]");
  const manualSearch = form.querySelector?.("[data-graph-manual-target-search]");
  const rationaleInput = form.querySelector?.("[data-graph-isolated-rationale]");
  const relationSelect = form.querySelector?.("[data-graph-isolated-relation-type]");
  const questionInput = form.querySelector?.("[data-graph-isolated-insight-question]");
  const aiTargetNoteId = String(aiSelect?.value || "").trim();
  const manualTargetNoteId = String(manualTarget?.value || "").trim();
  const relationType = String(relationSelect?.value || "associated_with").trim().toLowerCase() || "associated_with";
  const rationale = String(rationaleInput?.value || "").trim();
  const rationaleSource = String(rationaleInput?.getAttribute?.("data-graph-rationale-source") || "").trim().toLowerCase();
  const insightQuestion = String(questionInput?.value || "").trim();
  const targetNoteId = mode === "manual" ? manualTargetNoteId : aiTargetNoteId;
  return {
    noteId,
    draft: {
      mode,
      targetNoteId,
      aiTargetNoteId: mode === "ai" ? aiTargetNoteId : String(previousDraft.aiTargetNoteId || "").trim(),
      manualTargetNoteId: mode === "manual" ? manualTargetNoteId : String(previousDraft.manualTargetNoteId || "").trim(),
      manualSearchText: String(manualSearch?.value || "").trim(),
      relationType,
      rationale,
      rationaleSource,
      insightQuestion,
      aiRelationType: mode === "ai" ? relationType : String(previousDraft.aiRelationType || "").trim().toLowerCase(),
      aiRationale: mode === "ai" ? rationale : String(previousDraft.aiRationale || "").trim(),
      aiRationaleSource: mode === "ai" ? rationaleSource : String(previousDraft.aiRationaleSource || "").trim().toLowerCase(),
      aiInsightQuestion: mode === "ai" ? insightQuestion : String(previousDraft.aiInsightQuestion || "").trim(),
      manualRelationType: mode === "manual" ? relationType : String(previousDraft.manualRelationType || "").trim().toLowerCase(),
      manualRationale: mode === "manual" ? rationale : String(previousDraft.manualRationale || "").trim(),
      manualRationaleSource: mode === "manual" ? rationaleSource : String(previousDraft.manualRationaleSource || "").trim().toLowerCase(),
      manualInsightQuestion: mode === "manual" ? insightQuestion : String(previousDraft.manualInsightQuestion || "").trim()
    }
  };
}

export function captureGraphIsolatedRelationDraftForState(graphState = {}, form = null, options = {}) {
  const noteId = String(form?.getAttribute?.("data-source-note") || "").trim();
  const previousDraft = graphIsolatedRelationDraftForState(graphState, noteId);
  const result = isolatedRelationDraftFromForm(form, { ...options, previousDraft });
  if (!result?.noteId) return false;
  graphState.isolatedRelationDraftByNoteId = graphState.isolatedRelationDraftByNoteId || {};
  graphState.isolatedRelationDraftByNoteId[result.noteId] = result.draft;
  return true;
}

export function aiCandidateDraftFromSelect(select = null, previousDraft = {}) {
  const option = select?.selectedOptions?.[0] || null;
  const aiTargetNoteId = String(select?.value || "").trim();
  const draftMatchesTarget = aiTargetNoteId && String(previousDraft.aiTargetNoteId || "").trim() === aiTargetNoteId;
  const relationType = String(option?.getAttribute?.("data-graph-relation-type") || "associated_with").trim().toLowerCase();
  const rationale = String(option?.getAttribute?.("data-graph-rationale-draft") || "").trim();
  const question = String(option?.getAttribute?.("data-graph-insight-question-draft") || "").trim();
  return {
    option,
    relationType: draftMatchesTarget && previousDraft.aiRelationType
      ? String(previousDraft.aiRelationType || "").trim().toLowerCase()
      : relationType,
    rationale: draftMatchesTarget ? String(previousDraft.aiRationale || "").trim() : rationale,
    rationaleSource: draftMatchesTarget
      ? String(previousDraft.aiRationaleSource || "").trim().toLowerCase()
      : (rationale ? "ai" : ""),
    insightQuestion: draftMatchesTarget ? String(previousDraft.aiInsightQuestion || "").trim() : question
  };
}
