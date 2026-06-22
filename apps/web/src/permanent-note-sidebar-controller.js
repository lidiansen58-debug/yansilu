import {
  defaultPermanentRelationWorkspaceState,
  normalizePermanentRelationWorkspaceState,
  permanentRelationCandidateRationale,
  permanentRelationWorkspaceNextAiCandidate,
  resetPermanentRelationWorkspaceResult
} from "./permanent-relation-workspace-model.js";
import {
  relationEntryRouteForPermanentWorkspace,
  relationEntryRouteForPermanentWorkspaceContinuation
} from "./relation-entry-route.js";

export function permanentRelationWorkspaceFocusSelector({
  selectedTargetNoteId = "",
  mode = "ai"
} = {}) {
  if (selectedTargetNoteId) return '[data-permanent-relation-field="rationale"]';
  return mode === "manual"
    ? "[data-permanent-relation-target-search]"
    : "[data-permanent-relation-ai-select]";
}

export class PermanentNoteSidebarController {
  constructor(host) {
    this.host = host;
  }

  openRelationWorkspace(options = {}) {
    const host = this.host;
    const note = host.activeNote();
    if (!note?.id) return false;
    const entryRoute = relationEntryRouteForPermanentWorkspace(note.id, options);
    host.setInspectorVisible(true);
    host.activatePermanentWorkspaceTab("relations");
    const aiCandidates = host.permanentRelationWorkspaceAiCandidates(note.id);
    const requestedMode = String(entryRoute.mode || "").trim().toLowerCase();
    const mode = requestedMode === "manual" || (!aiCandidates.length && requestedMode !== "ai") ? "manual" : "ai";
    const firstCandidate = permanentRelationWorkspaceNextAiCandidate(aiCandidates, host.currentSemanticRelations, note.id) || aiCandidates[0] || null;
    const selectedTargetNoteId = String(entryRoute.targetNoteId || firstCandidate?.targetNoteId || "").trim();
    const relationType = String(options.relationType ? entryRoute.relationType : firstCandidate?.relationType || host.relationCreateDefaultType(note) || "associated_with")
      .trim()
      .toLowerCase();
    const rationale = String(entryRoute.rationaleDraft || permanentRelationCandidateRationale(firstCandidate) || "").trim();
    const insightQuestion = String(entryRoute.insightQuestionDraft || firstCandidate?.insightQuestionDraft || "").trim();
    host.permanentRelationWorkspaceState = normalizePermanentRelationWorkspaceState({
      ...defaultPermanentRelationWorkspaceState(note.id),
      open: true,
      mode,
      selectedTargetNoteId,
      relationType,
      rationale,
      insightQuestion,
      manualQuery: "",
      manualTargets: [],
      notice: options.notice || "",
      entryRoute
    }, note.id);
    host.syncPermanentRelationWorkspaceOverlay();
    window.setTimeout(() => {
      host.permanentRelationWorkspaceElement()?.querySelector?.(permanentRelationWorkspaceFocusSelector({
        selectedTargetNoteId,
        mode
      }))?.focus?.();
    }, 40);
    return true;
  }

  closeRelationWorkspace() {
    const host = this.host;
    host.permanentRelationWorkspaceState = defaultPermanentRelationWorkspaceState(host.activeNote()?.id || "");
    host.syncPermanentRelationWorkspaceOverlay();
  }

  patchWorkspaceState(patch = {}) {
    const host = this.host;
    const noteId = host.activeNote()?.id || host.permanentRelationWorkspaceState.noteId || "";
    host.permanentRelationWorkspaceState = normalizePermanentRelationWorkspaceState({
      ...host.permanentRelationWorkspaceState,
      ...patch
    }, noteId);
    host.syncPermanentRelationWorkspaceOverlay();
  }

  chooseAiCandidate(targetNoteId = "") {
    const host = this.host;
    const note = host.activeNote();
    if (!note?.id) return;
    const targetId = String(targetNoteId || "").trim();
    const candidate = host.permanentRelationWorkspaceAiCandidates(note.id).find((item) => item.targetNoteId === targetId) || null;
    if (!candidate) return;
    this.patchWorkspaceState(resetPermanentRelationWorkspaceResult({
      ...host.permanentRelationWorkspaceState,
      mode: "ai",
      selectedTargetNoteId: targetId,
      relationType: candidate.relationType || "associated_with",
      rationale: permanentRelationCandidateRationale(candidate),
      insightQuestion: candidate.insightQuestionDraft || ""
    }));
  }

  chooseManualTarget(targetNoteId = "") {
    const host = this.host;
    const note = host.activeNote();
    if (!note?.id) return;
    const targetId = String(targetNoteId || "").trim();
    const target = host.permanentRelationWorkspaceState.manualTargets.find((item) => item?.id === targetId) || null;
    host.upsertApiNotes(target ? [target] : []);
    this.patchWorkspaceState(resetPermanentRelationWorkspaceResult({
      ...host.permanentRelationWorkspaceState,
      mode: "manual",
      selectedTargetNoteId: targetId,
      relationType: host.permanentRelationWorkspaceState.relationType || "associated_with",
      rationale: host.permanentRelationWorkspaceState.rationale || ""
    }));
  }

  continueRelationWorkspace() {
    const host = this.host;
    const note = host.activeNote();
    if (!note?.id) return;
    const aiCandidates = host.permanentRelationWorkspaceAiCandidates(note.id);
    const nextCandidate = permanentRelationWorkspaceNextAiCandidate(
      aiCandidates,
      host.currentSemanticRelations,
      note.id,
      [host.permanentRelationWorkspaceState.result?.targetNoteId]
    );
    host.permanentRelationWorkspaceState = normalizePermanentRelationWorkspaceState({
      ...defaultPermanentRelationWorkspaceState(note.id),
      open: true,
      mode: nextCandidate ? "ai" : "manual",
      selectedTargetNoteId: nextCandidate?.targetNoteId || "",
      relationType: nextCandidate?.relationType || host.relationCreateDefaultType(note),
      rationale: permanentRelationCandidateRationale(nextCandidate),
      insightQuestion: nextCandidate?.insightQuestionDraft || "",
      entryRoute: relationEntryRouteForPermanentWorkspaceContinuation(note.id, host.permanentRelationWorkspaceState.entryRoute, {
        mode: nextCandidate ? "ai" : "manual",
        targetNoteId: nextCandidate?.targetNoteId || "",
        relationType: nextCandidate?.relationType || host.relationCreateDefaultType(note),
        rationaleDraft: permanentRelationCandidateRationale(nextCandidate),
        insightQuestionDraft: nextCandidate?.insightQuestionDraft || ""
      }),
      notice: nextCandidate ? "" : "没有新的 AI 推荐，可以手动搜索目标笔记。"
    }, note.id);
    host.syncPermanentRelationWorkspaceOverlay();
  }

  commitSavedRelationWorkspaceResult({
    noteId = "",
    state = {},
    result = {},
    successMessage = ""
  } = {}) {
    const host = this.host;
    host.permanentRelationWorkspaceState = normalizePermanentRelationWorkspaceState({
      ...state,
      open: true,
      saveState: "saved",
      error: "",
      notice: "",
      result
    }, noteId);
    host.renderRelated(successMessage);
    host.syncPermanentRelationWorkspaceOverlay();
    host.onStatus(successMessage, "ok");
  }
}
