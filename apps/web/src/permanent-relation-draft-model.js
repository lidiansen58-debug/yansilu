import {
  defaultPermanentRelationWorkspaceState,
  normalizePermanentRelationWorkspaceState,
  permanentRelationWorkspaceCanSave,
  permanentRelationWorkspaceErrorText,
  permanentRelationWorkspaceSelectedTarget,
  resetPermanentRelationWorkspaceResult
} from "./permanent-relation-workspace-model.js";

function cleanText(value = "") {
  return String(value || "").trim();
}

function cleanKind(value = "") {
  return cleanText(value).toLowerCase();
}

function normalizeCursorRange(range = null) {
  if (!range || typeof range !== "object") return null;
  const from = Number(range.from);
  const to = Number(range.to);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  const start = Math.max(0, Math.min(from, to));
  const end = Math.max(start, Math.max(from, to));
  return { from: start, to: end };
}

export function defaultRelationDraft(sourceNoteId = "") {
  return {
    ...defaultPermanentRelationWorkspaceState(sourceNoteId),
    sourceNoteId: cleanText(sourceNoteId),
    sourceKind: "manual",
    candidateSource: "",
    relationComposerSessionId: "",
    insertLinkOnSave: false,
    cursorRange: null
  };
}

export function normalizeRelationDraft(draft = {}, sourceNoteId = "") {
  const normalized = normalizePermanentRelationWorkspaceState(draft, sourceNoteId || draft.sourceNoteId || draft.noteId);
  return {
    ...normalized,
    sourceNoteId: cleanText(sourceNoteId || draft.sourceNoteId || normalized.noteId),
    sourceKind: cleanKind(draft.sourceKind || draft.source_kind || "manual") || "manual",
    candidateSource: cleanText(draft.candidateSource || draft.candidate_source),
    relationComposerSessionId: cleanText(draft.relationComposerSessionId || draft.relation_composer_session_id),
    insertLinkOnSave: draft.insertLinkOnSave === true || draft.insert_link_on_save === true,
    cursorRange: normalizeCursorRange(draft.cursorRange || draft.cursor_range)
  };
}

export function relationDraftFromRoute(route = {}, defaults = {}) {
  const sourceNoteId = cleanText(route.noteId || route.sourceNoteId || defaults.noteId || defaults.sourceNoteId);
  return normalizeRelationDraft({
    ...defaultRelationDraft(sourceNoteId),
    open: true,
    mode: route.mode || defaults.mode || "manual",
    selectedTargetNoteId: route.targetNoteId || defaults.targetNoteId || "",
    relationType: route.relationType || defaults.relationType || "associated_with",
    rationale: route.rationaleDraft || route.rationale || defaults.rationaleDraft || defaults.rationale || "",
    insightQuestion: route.insightQuestionDraft || route.insightQuestion || defaults.insightQuestionDraft || defaults.insightQuestion || "",
    sourceKind: route.sourceKind || route.source || defaults.sourceKind || defaults.source || "manual",
    candidateSource: route.candidateSource || defaults.candidateSource || "",
    relationComposerSessionId: route.relationComposerSessionId || defaults.relationComposerSessionId || "",
    insertLinkOnSave: route.insertLinkOnSave === true || defaults.insertLinkOnSave === true,
    cursorRange: route.cursorRange || defaults.cursorRange || null,
    notice: route.notice || defaults.notice || "",
    entryRoute: route
  }, sourceNoteId);
}

export function resetRelationDraftResult(draft = {}) {
  return normalizeRelationDraft(resetPermanentRelationWorkspaceResult(draft), draft.sourceNoteId || draft.noteId || "");
}

export {
  permanentRelationWorkspaceCanSave as relationDraftCanSave,
  permanentRelationWorkspaceErrorText as relationDraftErrorText,
  permanentRelationWorkspaceSelectedTarget as relationDraftSelectedTarget
};
