export function graphIsolatedDecisionCssEscape(value = "") {
  return String(value || "").replace(/["\\]/g, "\\$&");
}

export function graphIsolatedDecisionFormInput(button = null, deps = {}) {
  const {
    document = globalThis.document,
    cssEscape = globalThis.CSS?.escape || graphIsolatedDecisionCssEscape,
    graphIsolatedDecisionMode = (value = "") => String(value || "").trim().toLowerCase()
  } = deps;
  const noteId = String(button?.getAttribute?.("data-graph-isolated-decision-save") || "").trim();
  if (!noteId) {
    return { noteId: "", panel: null, escapedNoteId: "", mode: graphIsolatedDecisionMode(""), text: "" };
  }
  const panel = button?.closest?.(".graph-isolated-decision-form") || document;
  const escapedNoteId = cssEscape(noteId);
  const mode = graphIsolatedDecisionMode(
    panel?.querySelector?.(`input[name="graph-isolated-decision-${escapedNoteId}"]:checked`)?.value
  );
  const text = String(panel?.querySelector?.(`[data-graph-isolated-decision-text="${escapedNoteId}"]`)?.value || "").trim();
  return { noteId, panel, escapedNoteId, mode, text };
}
