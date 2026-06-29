export function readGraphIsolatedRelationFormValues(form = null, { normalizeMode = (value) => String(value || "").trim().toLowerCase() || "ai" } = {}) {
  if (!form) return null;
  const noteId = String(form.getAttribute?.("data-source-note") || "").trim();
  const mode = normalizeMode(form.querySelector?.("[data-graph-relation-source-mode]")?.value || "ai");
  const aiSelect = form.querySelector?.("[data-graph-ai-candidate-select]");
  const manualTarget = form.querySelector?.("[data-graph-manual-target-id]");
  const targetNoteId = mode === "manual"
    ? String(manualTarget?.value || "").trim()
    : String(aiSelect?.value || "").trim();
  return {
    noteId,
    mode,
    targetNoteId,
    relationType: String(form.querySelector?.("[data-graph-isolated-relation-type]")?.value || "associated_with").trim().toLowerCase(),
    rationale: String(form.querySelector?.("[data-graph-isolated-rationale]")?.value || "").trim(),
    insightQuestion: String(form.querySelector?.("[data-graph-isolated-insight-question]")?.value || "").trim()
  };
}

export function validateGraphIsolatedRelationFormValues(
  values = null,
  {
    confirmableRelationTypes = new Set(),
    rationaleIsActionable = (value) => Boolean(String(value || "").trim())
  } = {}
) {
  if (!values) return { ok: false, errorKey: "missing_form" };
  const relationType = String(values.relationType || "").trim().toLowerCase();
  if (!values.targetNoteId) {
    return {
      ok: false,
      errorKey: values.mode === "manual" ? "missing_manual_target" : "missing_ai_target"
    };
  }
  if (!confirmableRelationTypes.has(relationType) || relationType === "no_relation") {
    return { ok: false, errorKey: "invalid_relation_type" };
  }
  if (values.targetNoteId === values.noteId) {
    return { ok: false, errorKey: "self_relation" };
  }
  if (!values.rationale) {
    return { ok: false, errorKey: "missing_rationale" };
  }
  if (!rationaleIsActionable(values.rationale)) {
    return { ok: false, errorKey: "placeholder_rationale" };
  }
  return { ok: true, errorKey: "" };
}
