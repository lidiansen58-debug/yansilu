import { resetPermanentRelationWorkspaceResult } from "./permanent-relation-workspace-model.js";
import {
  RELATION_ENTRY_SOURCES,
  relationEntryRouteFromElement
} from "./relation-entry-route.js";

function eventTarget(event) {
  return event?.target?.closest ? event.target : null;
}

function cleanId(value = "") {
  return String(value || "").trim();
}

function relationPeerNoteId(link = {}, activeNoteId = "") {
  const noteId = cleanId(activeNoteId);
  const fromNoteId = cleanId(link?.fromNoteId || link?.from_note_id || link?.sourceNoteId || link?.source_note_id);
  const toNoteId = cleanId(link?.toNoteId || link?.to_note_id || link?.targetNoteId || link?.target_note_id);
  if (fromNoteId === noteId) return toNoteId;
  if (toNoteId === noteId) return fromNoteId;
  return toNoteId || fromNoteId;
}

function openExistingRelationWorkspace(host, relationId = "") {
  const cleanRelationId = cleanId(relationId);
  const relation = cleanRelationId ? host.findSemanticRelation?.(cleanRelationId) : null;
  const activeNoteId = cleanId(host.activeNote?.()?.id);
  const targetNoteId = relationPeerNoteId(relation, activeNoteId);
  if (!relation || !targetNoteId || !host.openPermanentRelationWorkspace) return false;
  closeEditorRelatedPopovers(typeof document !== "undefined" ? document : host.els?.editorWrap || null);
  return host.openPermanentRelationWorkspace({
    source: RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR,
    mode: "manual",
    targetNoteId,
    relationType: relation.relationType || relation.relation_type || "associated_with",
    rationaleDraft: relation.rationale || "",
    insightQuestionDraft: relation.insightQuestion || relation.insight_question || ""
  }) === true;
}

export function closeEditorRelatedPopovers(scope = typeof document !== "undefined" ? document : null) {
  scope?.querySelectorAll?.("[data-editor-related-popover]")?.forEach((popover) => {
    popover.hidden = true;
  });
  scope?.querySelectorAll?.("[data-editor-related-floating-popover]")?.forEach((popover) => {
    popover.remove();
  });
}

export function routeEditorRelationClick(host, event) {
  const target = eventTarget(event);
  if (!target) return false;

  const relationTemplateMergeAction = target.closest("[data-relation-template-merge-action]");
  if (relationTemplateMergeAction) {
    host.commitRelationTemplateVariant(
      relationTemplateMergeAction.closest("[data-relation-template-merge-choice]"),
      relationTemplateMergeAction.getAttribute("data-relation-template-merge-action") || "replace"
    );
    return true;
  }

  const templateVariantButton = target.closest("[data-relation-template-variant]");
  if (templateVariantButton) {
    host.applyRelationTemplateVariant(templateVariantButton);
    return true;
  }

  const permanentRelationMode = target.closest("[data-permanent-relation-mode]");
  if (permanentRelationMode && !permanentRelationMode.hasAttribute("data-permanent-relation-action")) {
    const mode = String(permanentRelationMode.getAttribute("data-permanent-relation-mode") || "").trim();
    host.patchPermanentRelationWorkspaceState(resetPermanentRelationWorkspaceResult({
      ...host.permanentRelationWorkspaceState,
      mode,
      selectedTargetNoteId: mode === "manual" ? "" : host.permanentRelationWorkspaceState.selectedTargetNoteId
    }));
    return true;
  }

  const permanentRelationAiTarget = target.closest("[data-permanent-relation-ai-target]");
  if (permanentRelationAiTarget) {
    host.choosePermanentRelationAiCandidate(permanentRelationAiTarget.getAttribute("data-permanent-relation-ai-target"));
    return true;
  }

  const permanentRelationManualTarget = target.closest("[data-permanent-relation-manual-target]");
  if (permanentRelationManualTarget) {
    host.choosePermanentRelationManualTarget(permanentRelationManualTarget.getAttribute("data-permanent-relation-manual-target"));
    return true;
  }

  const editorRelatedPopoverClose = target.closest("[data-editor-related-popover-close]");
  if (editorRelatedPopoverClose) {
    const popover = editorRelatedPopoverClose.closest("[data-editor-related-popover]");
    if (popover?.hasAttribute("data-editor-related-floating-popover")) popover.remove();
    else if (popover) popover.hidden = true;
    return true;
  }

  const editorRelatedExistingOverview = target.closest("[data-editor-related-existing-overview]");
  if (editorRelatedExistingOverview) {
    const actions = editorRelatedExistingOverview.closest("[data-editor-body-relation-actions]");
    const template = actions?.querySelector?.("[data-editor-related-popover]");
    if (!template) return true;
    const existingFloating = document.querySelector("[data-editor-related-floating-popover][data-editor-body-relation-popover]");
    const shouldOpen = !existingFloating;
    closeEditorRelatedPopovers(document);
    if (shouldOpen) {
      const floating = template.cloneNode(true);
      floating.hidden = false;
      floating.setAttribute("data-editor-related-floating-popover", "");
      floating.setAttribute("data-editor-body-relation-popover", "");
      (host.els?.editorWrap || document.body).appendChild(floating);
    }
    return true;
  }

  const editorRelatedExisting = target.closest("[data-editor-related-existing]");
  if (editorRelatedExisting) {
    const noteId = String(editorRelatedExisting.getAttribute("data-editor-related-existing") || "").trim();
    const panel = editorRelatedExisting.closest("[data-editor-related-notes-panel]");
    const template = panel?.querySelector?.(`[data-editor-related-popover-for="${CSS.escape(noteId)}"]`);
    if (!template) return true;
    const existingFloating = document.querySelector(`[data-editor-related-floating-popover][data-editor-related-popover-for="${CSS.escape(noteId)}"]`);
    const shouldOpen = !existingFloating;
    closeEditorRelatedPopovers(document);
    if (shouldOpen) {
      const floating = template.cloneNode(true);
      floating.hidden = false;
      floating.setAttribute("data-editor-related-floating-popover", "");
      (host.els?.result || document.body).appendChild(floating);
    }
    return true;
  }

  const permanentRelationAction = target.closest("[data-permanent-relation-action]");
  if (permanentRelationAction) {
    const action = String(permanentRelationAction.getAttribute("data-permanent-relation-action") || "").trim();
    if (action === "open") {
      host.openPermanentRelationWorkspace(relationEntryRouteFromElement(permanentRelationAction, {
        source: RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR,
        noteId: host.activeNote()?.id || ""
      }));
      return true;
    }
    if (action === "close" || action === "complete") {
      host.closePermanentRelationWorkspace();
      return true;
    }
    if (action === "continue") {
      host.continuePermanentRelationWorkspace();
      return true;
    }
    if (action === "run-ai") {
      host.patchPermanentRelationWorkspaceState({ saveState: "analysis-loading", error: "", notice: "" });
      void host.runPermanentNoteAnalysis();
      return true;
    }
    if (action === "preview-target") {
      const noteId = permanentRelationAction.getAttribute("data-note-id") || "";
      if (noteId) void host.showNotePreviewInInspector(noteId, { eyebrow: "目标笔记" });
      return true;
    }
  }

  const relationTargetChoice = target.closest("[data-relation-target-choice]");
  if (relationTargetChoice) {
    const form = relationTargetChoice.closest("[data-create-relation-form]");
    host.applyRelationTargetChoice(
      form,
      relationTargetChoice.dataset.noteId || "",
      relationTargetChoice.dataset.noteTitle || ""
    );
    return true;
  }

  const relationAction = target.closest("[data-relation-action]");
  if (!relationAction) return false;

  const action = relationAction.dataset.relationAction;
  if (action === "open-create") {
    host.openCreateRelationForm({
      source: RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR,
      mode: "manual"
    });
    return true;
  }
  if (action === "open-followup-reason") {
    const relationId = relationAction.dataset.relationId || host.relationFollowupSuggestion?.relationId || "";
    host.openEditRelationForm(relationId, {
      entryHint: "这条关系已经建立。现在补一句更具体的理由，后面写作时会更容易复用。"
    });
    window.setTimeout(() => {
      host.jumpToInspectorSection("[data-edit-relation-form]", {
        focus: true,
        focusSelector: '[data-edit-relation-form] textarea[name="rationale"]'
      });
    }, 40);
    host.clearRelationFollowupSuggestion();
    return true;
  }
  if (action === "dismiss-followup") {
    host.clearRelationFollowupSuggestion();
    host.renderRelated();
    return true;
  }
  if (action === "cancel-create") {
    host.resetRelationPanelState();
    host.renderRelated();
    return true;
  }
  if (action === "open-edit") {
    if (openExistingRelationWorkspace(host, relationAction.dataset.relationId)) return true;
    host.openEditRelationForm(relationAction.dataset.relationId);
    return true;
  }
  if (action === "cancel-edit") {
    host.resetRelationPanelState();
    host.renderRelated();
    return true;
  }
  if (action === "delete") {
    void host.deleteSemanticRelation(relationAction.dataset.relationId);
    return true;
  }
  if (action === "promote-inline") {
    void host.promoteInlineDraftRelation(relationAction.dataset.inlineRelationIndex);
    return true;
  }
  return false;
}

export function routeEditorRelationInput(host, event) {
  const target = eventTarget(event);
  if (!target) return false;

  const targetSearch = target.closest("[data-relation-target-search]");
  if (targetSearch) {
    host.queueRelationTargetSearch(targetSearch);
    return true;
  }

  const permanentRelationSearch = target.closest("[data-permanent-relation-target-search]");
  if (permanentRelationSearch) {
    host.queuePermanentRelationManualSearch(permanentRelationSearch);
    return true;
  }

  const permanentRelationAiSelect = target.closest("[data-permanent-relation-ai-select]");
  if (permanentRelationAiSelect) {
    host.choosePermanentRelationAiCandidate(permanentRelationAiSelect.value || "");
    return true;
  }

  const permanentRelationField = target.closest("[data-permanent-relation-field]");
  if (permanentRelationField) {
    host.updatePermanentRelationWorkspaceField(
      permanentRelationField.getAttribute("data-permanent-relation-field"),
      permanentRelationField.value || ""
    );
    return true;
  }

  const relationTextInput = target.closest('textarea[name="rationale"], textarea[name="insightQuestion"]');
  if (relationTextInput) {
    const form = relationTextInput.closest("[data-create-relation-form], [data-edit-relation-form]");
    if (form) {
      host.refreshRelationQualityMeter(form);
      return true;
    }
  }
  return false;
}

export function routeEditorRelationFocusIn(host, event) {
  const target = eventTarget(event);
  const targetSearch = target?.closest?.("[data-relation-target-search]");
  if (!targetSearch) return false;
  const form = targetSearch.closest("[data-create-relation-form]");
  if (!form) return false;
  host.openRelationTargetList(form);
  return true;
}

export function routeEditorRelationKeydown(host, event) {
  const target = eventTarget(event);
  const targetSearch = target?.closest?.("[data-relation-target-search]");
  if (!targetSearch) return false;
  const form = targetSearch.closest("[data-create-relation-form]");
  if (!form) return false;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    host.moveRelationTargetChoice(form, 1);
    return true;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    host.moveRelationTargetChoice(form, -1);
    return true;
  }
  if (event.key === "Enter") {
    const buttons = host.visibleRelationTargetChoices(form);
    if (!buttons.length) return false;
    event.preventDefault();
    const hiddenTargetId = form.querySelector("[data-relation-target-id]");
    const current =
      buttons.find((button) => String(button.dataset.noteId || "").trim() === String(hiddenTargetId?.value || "").trim()) ||
      buttons[0];
    if (current) {
      host.applyRelationTargetChoice(form, current.dataset.noteId || "", current.dataset.noteTitle || "");
    }
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    const hiddenTargetId = form.querySelector("[data-relation-target-id]");
    const selectedTitle = String(hiddenTargetId?.dataset?.targetTitle || "").trim();
    if (selectedTitle) targetSearch.value = selectedTitle;
    host.closeRelationTargetList(form);
    return true;
  }
  return false;
}

export function routeEditorRelationSubmit(host, event) {
  const target = eventTarget(event);
  if (!target) return false;

  const permanentRelationForm = target.closest("[data-permanent-relation-form]");
  if (permanentRelationForm) {
    event.preventDefault();
    void host.handlePermanentRelationWorkspaceSubmit(permanentRelationForm);
    return true;
  }

  const form = target.closest("[data-create-relation-form], [data-edit-relation-form]");
  if (!form) return false;
  event.preventDefault();
  if (form.matches("[data-create-relation-form]")) void host.handleCreateRelationForm(form);
  if (form.matches("[data-edit-relation-form]")) void host.handleEditRelationForm(form);
  return true;
}
