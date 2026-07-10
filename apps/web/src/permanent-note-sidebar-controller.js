import {
  defaultPermanentRelationWorkspaceState,
  normalizePermanentRelationWorkspaceState,
  resetPermanentRelationWorkspaceResult
} from "./permanent-relation-workspace-model.js";
import {
  relationEntryRouteForPermanentWorkspace,
  relationEntryRouteForPermanentWorkspaceContinuation
} from "./relation-entry-route.js";

export function permanentRelationWorkspaceFocusSelector({
  selectedTargetNoteId = ""
} = {}) {
  if (selectedTargetNoteId) return '[data-permanent-relation-field="rationale"]';
  return "[data-permanent-relation-target-search]";
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
    const selectedTargetNoteId = String(entryRoute.targetNoteId || "").trim();
    const relationType = String(entryRoute.relationType || host.relationCreateDefaultType(note) || "associated_with")
      .trim()
      .toLowerCase();
    const rationale = String(entryRoute.rationaleDraft || "").trim();
    const insightQuestion = String(entryRoute.insightQuestionDraft || "").trim();
    host.permanentRelationWorkspaceState = normalizePermanentRelationWorkspaceState({
      ...defaultPermanentRelationWorkspaceState(note.id),
      open: true,
      mode: "manual",
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
        selectedTargetNoteId
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
      rationale: host.permanentRelationWorkspaceState.rationale || "",
      dirty: true
    }));
  }

  continueRelationWorkspace() {
    const host = this.host;
    const note = host.activeNote();
    if (!note?.id) return;
    const relationType = host.relationCreateDefaultType(note) || "associated_with";
    host.permanentRelationWorkspaceState = normalizePermanentRelationWorkspaceState({
      ...defaultPermanentRelationWorkspaceState(note.id),
      open: true,
      mode: "manual",
      selectedTargetNoteId: "",
      relationType,
      rationale: "",
      insightQuestion: "",
      entryRoute: relationEntryRouteForPermanentWorkspaceContinuation(note.id, host.permanentRelationWorkspaceState.entryRoute, {
        mode: "manual",
        targetNoteId: "",
        relationType,
        rationaleDraft: "",
        insightQuestionDraft: ""
      }),
      notice: ""
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
    host.renderRelated();
    host.syncPermanentRelationWorkspaceOverlay();
    host.onStatus(successMessage, "ok");
  }
}
