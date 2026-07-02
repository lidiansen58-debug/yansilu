import {
  graphRelationWorkspaceRouteForFollowup,
  graphWritingCandidateNoteIds,
  graphWritingFollowupEntryPlan,
  graphWritingEntryReason,
  graphWritingContinuationFailureMessage,
  graphWritingContinuationStatusMessage
} from "./graph-followup.js";
import {
  graphFollowupActionRoute
} from "./note-browser-action-router.js";
import {
  graphFollowupOpenedNoteStatus
} from "./graph-followup-status-messages.js";
import {
  graphFollowupDraftTemplates as buildGraphFollowupDraftTemplates
} from "./graph-followup-draft-templates.js";

export function createGraphFollowupController(depsProvider = () => ({})) {
  function openGraphFollowupNote(noteId = "", action = "", options = {}) {
    const {
      activateModule = () => {},
      continueWritingEntry = () => {},
      continueWritingProjectEntry = async () => {},
      currentGraphVisibleNodeIds = () => [],
      document = globalThis.document,
      editor = null,
      graphRelationTypeLabel = (value = "") => String(value || ""),
      graphWritingContinuationEntry = () => null,
      isWritingEligibleNote = () => false,
      openNoteById = () => {},
      openWritingModule = async () => {},
      parseWritingBasketIds = () => [],
      setStatus = () => {},
      state = {},
      suggestedWritingProjectTitle = () => "",
      window = globalThis.window,
      writingKnownNoteById = () => null,
      EventCtor = globalThis.Event
    } = depsProvider() || {};
    const cleanNoteId = String(noteId || "").trim();
    const cleanAction = String(action || "").trim().toLowerCase();
    const actionRoute = graphFollowupActionRoute(cleanAction);
    const cleanRelationId = String(options.relationId || "").trim();
    const cleanTargetNoteId = String(options.targetNoteId || "").trim();
    const cleanRelationType = String(options.relationType || "").trim().toLowerCase();
    const requestedGraphFocusNoteIds = String(options.basketNoteIds || "")
      .split(",")
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    if (actionRoute.kind === "writing") {
      const graphFocusNoteIds = requestedGraphFocusNoteIds.length ? requestedGraphFocusNoteIds : currentGraphVisibleNodeIds();
      const graphBasketNoteIds = graphWritingCandidateNoteIds(graphFocusNoteIds, {
        noteLookup: writingKnownNoteById,
        isEligible: isWritingEligibleNote
      });
      const plan = graphWritingFollowupEntryPlan({
        basketNoteIds: parseWritingBasketIds(),
        candidateNoteIds: graphBasketNoteIds,
        scopeNoteIds: graphFocusNoteIds
      });
      if (plan.prefillNoteIds.length) {
        continueWritingEntry(plan.prefillNoteIds, {
          title: suggestedWritingProjectTitle(plan.prefillNoteIds),
          source: "graph_followup_writing"
        });
      }
      const continuation = graphWritingContinuationEntry(graphBasketNoteIds, "当前图谱切片");
      void (async () => {
        try {
          if (continuation?.projectId) {
            await continueWritingProjectEntry(continuation.projectId, {
              openDraft: continuation.action === "open-draft",
              statusMessage: graphWritingContinuationStatusMessage(continuation)
            });
            return;
          }
          if (plan.mode === "no-candidates" && !plan.hasBasket) {
            setStatus(plan.statusMessage, "warn");
            return;
          }
          await openWritingModule({
            statusMessage: "",
            focusedCandidateNoteIds: graphFocusNoteIds,
            focusedCandidateScopeLabel: "当前图谱切片",
            entryReason: graphWritingEntryReason(plan),
            entrySourceLabel: "图谱"
          });
          setStatus(plan.statusMessage, "ok", { requireModule: "writing" });
        } catch (error) {
          if (continuation?.projectId) {
            setStatus(graphWritingContinuationFailureMessage(continuation, error), "bad");
            return;
          }
          setStatus(`从图谱进入写作中心失败：${String(error?.message || error)}`, "bad");
        }
      })();
      return true;
    }
    if (!cleanNoteId) return false;
    const sourceNote = state.notes.find((note) => note?.id === cleanNoteId) || null;
    const targetNote = cleanTargetNoteId ? state.notes.find((note) => note?.id === cleanTargetNoteId) || null : null;
    const sourceLabel = sourceNote?.title || cleanNoteId;
    const targetLabel = targetNote?.title || cleanTargetNoteId;
    const relationLabel = cleanRelationType ? graphRelationTypeLabel(cleanRelationType) : "关系";
    const followupStatusOptions = { priority: 2, holdMs: 3200, requireModule: "explorer" };
    const relationDrafts = buildGraphFollowupDraftTemplates({
      action: cleanAction,
      sourceLabel,
      targetLabel,
      relationLabel
    });
    const providedRationaleDraft = String(options.rationaleDraft || "").trim();
    const providedInsightQuestionDraft = String(options.insightQuestionDraft || "").trim();
    if (providedRationaleDraft || providedInsightQuestionDraft) {
      relationDrafts.rationaleDraft = providedRationaleDraft || relationDrafts.rationaleDraft;
      relationDrafts.insightQuestionDraft = providedInsightQuestionDraft || relationDrafts.insightQuestionDraft;
      relationDrafts.variants = [];
      relationDrafts.selectedVariant = "";
    }
    activateModule("explorer");
    openNoteById(cleanNoteId, { preferTitleSelection: false });
    state.inspectorVisible = true;
    editor?.setInspectorVisible?.(true);
    editor?.renderRelated?.("图谱下一步");
  
    const focusRelationCreate = (entryHint = "") => {
      editor?.openPermanentRelationWorkspace?.(graphRelationWorkspaceRouteForFollowup({
        targetNoteId: cleanTargetNoteId,
        relationType: cleanRelationType,
        notice: entryHint,
        relationDrafts
      }));
    };
  
    const focusExistingRelationEdit = (entryHint = "") => {
      editor?.setRelationPanelState?.("edit", {
        noteId: cleanNoteId,
        relationId: cleanRelationId,
        entryHint,
        rationaleDraft: relationDrafts.rationaleDraft,
        insightQuestionDraft: relationDrafts.insightQuestionDraft,
        draftVariants: relationDrafts.variants,
        selectedTemplateVariant: relationDrafts.selectedVariant
      });
      editor?.jumpToInspectorSection?.("[data-note-relations-section]");
      const tryOpen = () => {
        const relation = editor?.findSemanticRelation?.(cleanRelationId);
        if (!relation) return false;
        editor?.openEditRelationForm?.(cleanRelationId, {
          entryHint,
          rationaleDraft: relationDrafts.rationaleDraft,
          insightQuestionDraft: relationDrafts.insightQuestionDraft,
          draftVariants: relationDrafts.variants,
          selectedTemplateVariant: relationDrafts.selectedVariant
        });
        window.setTimeout(() => {
          editor?.jumpToInspectorSection?.("[data-edit-relation-form]", {
            focus: true,
            focusSelector: '[data-edit-relation-form] textarea[name="rationale"]'
          });
        }, 40);
        return true;
      };
      if (tryOpen()) return;
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if (tryOpen() || attempts >= 20) window.clearInterval(timer);
      }, 120);
    };
  
    const focusBoundaryField = () => {
      editor?.setDistillationPrefill?.(cleanNoteId, {
        boundaryDraft: relationDrafts.boundaryDraft,
        draftVariants: relationDrafts.variants,
        selectedTemplateVariant: relationDrafts.selectedVariant
      });
      editor?.renderRelated?.("图谱下一步");
      const selectorNoteId = cleanNoteId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const tryFocus = () => {
        const textarea = document.querySelector(
          `[data-note-distillation-section][data-note-id="${selectorNoteId}"] [data-note-distillation-form] textarea[name="boundaryOrCounterpoint"]`
        );
        if (!textarea) return false;
        if (!String(textarea.value || "").trim() && relationDrafts.boundaryDraft) {
          textarea.value = relationDrafts.boundaryDraft;
          textarea.dispatchEvent(new EventCtor("input", { bubbles: true }));
        }
        editor?.jumpToInspectorSection?.("[data-note-distillation-section]", {
          focus: true,
          focusSelector: '[data-note-distillation-form] textarea[name="boundaryOrCounterpoint"]'
        });
        return true;
      };
      if (tryFocus()) return;
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if (tryFocus() || attempts >= 20) window.clearInterval(timer);
      }, 120);
    };
  
    if (cleanAction === "relations-edit" && cleanRelationId) {
      focusExistingRelationEdit(`从图谱进入：继续写清“${sourceLabel}”这条${relationLabel}为什么成立。`);
      const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
      setStatus(status.message, status.tone, followupStatusOptions);
      return true;
    }
  
    if (cleanAction === "relations" || cleanAction === "bridge") {
      focusRelationCreate(
        cleanAction === "bridge"
          ? `从图谱进入：把“${sourceLabel}”和“${targetLabel || "目标笔记"}”关联为一条${relationLabel}。`
          : `从图谱进入：把“${sourceLabel}”和“${targetLabel || "目标笔记"}”建立为带理由的正式关联。`
      );
      const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
      setStatus(status.message, status.tone, followupStatusOptions);
      return true;
    }
    if (actionRoute.kind === "boundary-draft") {
      focusBoundaryField();
      const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
      setStatus(status.message, status.tone, followupStatusOptions);
      return true;
    }
    if (cleanAction === "boundary" || cleanAction === "tension") {
      focusBoundaryField();
      const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
      setStatus(status.message, status.tone, followupStatusOptions);
      return true;
    }
    const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
    setStatus(status.message, status.tone, followupStatusOptions);
    return true;
  }

  return { openGraphFollowupNote };
}
