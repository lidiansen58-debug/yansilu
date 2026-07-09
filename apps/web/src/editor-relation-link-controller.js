import { createNoteRelation, fetchNoteRelations, updateNoteRelation } from "./prototype-api.js";
import { normalizeKnownWikilinksToReadableTitles, wikilinkTokenForNote } from "./editor-link-picker.js";
import {
  inlineLinkRelationTypeOptionsMarkup,
  isMarkdownWikilinkRelation
} from "./editor-relation-helpers.js";
import {
  editorRelationLinkCandidatePreviewText,
  editorRelationLinkCandidates,
  editorRelationLinkConfirmState,
  editorRelationLinkEntrySource,
  editorRelationLinkInsertFeedback,
  editorRelationLinkInsertOutcome,
  nextEditorRelationLinkIndex,
  normalizeEditorRelationLinkInput,
  selectedEditorRelationLinkCandidate
} from "./editor-relation-link-model.js";
import {
  QUICK_WIKILINK_ASSOCIATION_MARKER,
  saveOrUpgradeWikilinkRelationTransaction
} from "./relation-save-transaction.js";
import { relationEntryRouteForInlineLink } from "./relation-entry-route.js";

export class EditorRelationLinkController {
  constructor(host) {
    this.host = host;
  }

  renderCandidates(query = "", preferredId = "") {
    const host = this.host;
    const cleanQuery = String(query || "").trim();
    const cleanPreferredId = String(preferredId || "").trim();
    if (!cleanQuery && !cleanPreferredId && !host.currentPinnedLinkId) {
      host.currentLinkCandidates = [];
      host.currentLinkIndex = 0;
      host.els.linkSearchList.innerHTML = "";
      this.updateConfirmButton();
      return;
    }
    const result = editorRelationLinkCandidates({
      query: cleanQuery,
      candidates: host.scopedLinkCandidates(),
      preferredId: cleanPreferredId,
      pinnedId: host.currentPinnedLinkId,
      displayTitle: (note) => host.linkCandidateDisplayTitle(note)
    });
    host.currentLinkCandidates = result.list;
    host.currentLinkIndex = result.selectedIndex;
    host.els.linkSearchList.innerHTML = result.html;
    this.scrollActiveCandidateIntoView();
    this.updateConfirmButton();
  }

  updateConfirmButton() {
    const host = this.host;
    const button = host.els.confirmLinkInsert;
    if (!button) return;
    const state = editorRelationLinkConfirmState({
      isSubmitting: host.isSubmittingLinkInsert,
      selectedNote: this.selectedCandidate(),
      reason: host.els.linkReasonInput?.value || ""
    });
    button.disabled = state.disabled;
    button.textContent = state.label;
  }

  selectedCandidate() {
    const host = this.host;
    return selectedEditorRelationLinkCandidate({
      pinnedId: host.currentPinnedLinkId,
      candidates: host.currentLinkCandidates,
      selectedIndex: host.currentLinkIndex,
      notes: host.state.notes
    });
  }

  currentRelationInput() {
    const host = this.host;
    return normalizeEditorRelationLinkInput({
      relationType: host.els.linkRelationTypeSelect?.value || "associated_with",
      reason: host.els.linkReasonInput?.value || ""
    });
  }

  focusReasonInput() {
    const input = this.host.els.linkReasonInput;
    if (!input) return;
    input.focus();
    const value = String(input.value || "");
    input.setSelectionRange?.(value.length, value.length);
  }

  candidatePreviewText(note) {
    return editorRelationLinkCandidatePreviewText(note);
  }

  setSubmitting(nextSubmitting) {
    this.host.isSubmittingLinkInsert = nextSubmitting === true;
    this.updateConfirmButton();
  }

  scrollActiveCandidateIntoView() {
    const active = this.host.els.linkSearchList.querySelector(".link-picker-item.active");
    if (!active) return;
    active.scrollIntoView({ block: "nearest" });
  }

  open(initialQuery = "", options = {}) {
    const host = this.host;
    host.closeTagPicker();
    host.hideOriginalityNotice();
    host.hideSaveAiSuggestion?.();
    const inlineMode = Boolean(options.inlineContext);
    const anchorAtCursor = Boolean(options.anchorAtCursor);
    const focusInput = Boolean(options.focusInput);
    host.els.linkPicker.classList.remove("floating");
    host.els.linkPicker.classList.toggle("inline-picker", inlineMode);
    host.els.linkPicker.style.left = "";
    host.els.linkPicker.style.top = "";
    host.els.linkPicker.style.width = "";
    host.els.linkPicker.style.maxHeight = "";
    host.els.linkPicker.classList.remove("hidden");
    const linkPickerMeta = host.els.linkRelationTypeSelect?.closest?.(".link-picker-meta");
    if (linkPickerMeta) linkPickerMeta.hidden = false;
    const linkPickerGuidance = linkPickerMeta?.nextElementSibling;
    if (linkPickerGuidance?.classList?.contains("semantic-relation-quality-guidance")) linkPickerGuidance.hidden = false;
    const linkSearchSpacer = host.els.linkSearchInput?.nextElementSibling;
    if (linkSearchSpacer && linkSearchSpacer !== host.els.linkSearchList) {
      host.els.linkSearchInput.parentNode?.insertBefore(host.els.linkSearchList, linkSearchSpacer);
      if (linkSearchSpacer.tagName === "DIV" && !String(linkSearchSpacer.textContent || "").trim()) linkSearchSpacer.hidden = true;
    }
    host.els.linkSearchInput.placeholder = "输入标题关键词，选择要关联的永久笔记";
    host.els.linkSearchInput.type = "search";
    host.els.linkSearchInput.name = `yansilu-link-target-${Date.now()}`;
    host.els.linkSearchInput.setAttribute("autocomplete", "off");
    host.els.linkSearchInput.setAttribute("autocorrect", "off");
    host.els.linkSearchInput.setAttribute("autocapitalize", "off");
    host.els.linkSearchInput.setAttribute("spellcheck", "false");
    host.els.linkSearchInput.value = initialQuery;
    host.currentPinnedLinkId = "";
    const returnSelection =
      host.normalizedSelectionRange(options.returnSelection) ||
      host.normalizedSelectionRange(host.manualLinkReturnSelection) ||
      host.normalizedSelectionRange(host.editorSelection());
    host.manualLinkReturnSelection = inlineMode ? null : returnSelection;
    host.manualLinkReturnScrollState = inlineMode
      ? null
      : options.returnScrollState || host.manualLinkReturnScrollState || host.captureEditorScrollState();
    if (host.els.linkRelationTypeSelect) {
      host.els.linkRelationTypeSelect.innerHTML = inlineLinkRelationTypeOptionsMarkup("associated_with");
      host.els.linkRelationTypeSelect.value = "associated_with";
    }
    if (host.els.linkReasonInput) host.els.linkReasonInput.value = "";
    host.currentLinkContext = options.inlineContext || null;
    host.lastInlinePickerAnchor = host.currentLinkContext?.end || 0;
    this.renderCandidates(initialQuery, options.preferredId || "");
    host.els.insertLink?.classList.add("active");
    if (inlineMode) {
      this.positionInline();
      if (focusInput) {
        host.els.linkSearchInput.focus();
        host.els.linkSearchInput.select();
      } else {
        host.focusEditor();
      }
      return;
    }
    if (anchorAtCursor) {
      host.positionFloatingPicker(host.els.linkPicker, Math.min(680, Math.max(560, Math.floor(window.innerWidth * 0.48))), {
        anchorRect: options.anchorRect || null,
        anchorElement: options.anchorElement || null,
        centerX: true,
        offsetX: -120
      });
    }
    host.els.linkSearchInput.focus();
    host.els.linkSearchInput.select();
  }

  close() {
    const host = this.host;
    host.els.linkPicker.classList.add("hidden");
    host.els.linkPicker.classList.remove("floating");
    host.els.linkPicker.classList.remove("inline-picker");
    host.els.linkPicker.style.left = "";
    host.els.linkPicker.style.top = "";
    host.els.linkPicker.style.width = "";
    host.els.linkPicker.style.maxHeight = "";
    host.currentLinkContext = null;
    host.lastInlinePickerAnchor = 0;
    host.currentPinnedLinkId = "";
    host.manualLinkReturnSelection = null;
    host.manualLinkReturnScrollState = null;
    host.isSubmittingLinkInsert = false;
    host.resetToolbarTransientButtons();
    if (host.els.linkReasonInput) host.els.linkReasonInput.value = "";
    this.updateConfirmButton();
  }

  positionInline() {
    const host = this.host;
    if (!host.currentLinkContext) return;
    host.positionFloatingPicker(host.els.linkPicker, Math.min(680, Math.max(560, Math.floor(window.innerWidth * 0.48))), {
      offsetX: -120
    });
  }

  insertOutcome(bodyAlreadyLinked, reusedRelation) {
    return editorRelationLinkInsertOutcome(bodyAlreadyLinked, reusedRelation);
  }

  insertFeedback(target, outcome) {
    return editorRelationLinkInsertFeedback(target, outcome);
  }

  async insertSelected(noteId) {
    const host = this.host;
    if (!noteId) return;
    if (host.isSubmittingLinkInsert) return;
    const sourceNote = host.activeNote();
    const sourceNoteId = String(sourceNote?.id || "").trim();
    const sourceTabId = String(host.activeTab()?.id || "").trim();
    if (!sourceNoteId) return;
    const target = host.state.notes.find((note) => note.id === noteId);
    if (!target) return;
    const scopedLinkNotes = host.scopedLinkCandidates();
    const inlineInsert = Boolean(host.currentLinkContext);
    const { relationType, reason } = this.currentRelationInput();
    if (!reason) {
      host.onStatus("请先写一句关联理由。", "warn");
      this.focusReasonInput();
      this.updateConfirmButton();
      return;
    }
    const manualSelection = !inlineInsert
      ? host.normalizedSelectionRange(host.manualLinkReturnSelection) || host.normalizedSelectionRange(host.editorSelection())
      : null;
    const manualScrollState = !inlineInsert ? host.manualLinkReturnScrollState : null;
    const persistedSourceBody = () => {
      const sourceTab = host.state.tabs.find((tab) => tab.id === sourceTabId) || null;
      const sourceNoteAfterSave = host.state.notes.find((note) => note.id === sourceNoteId) || null;
      return String(sourceTab?.savedBody || sourceNoteAfterSave?.body || "");
    };
    const token = wikilinkTokenForNote(target);
    const restoreSelection =
      manualSelection && Number.isFinite(manualSelection.from)
        ? { from: manualSelection.from + token.length, to: manualSelection.from + token.length }
        : null;
    this.setSubmitting(true);
    try {
      let relationCreateResult = null;
      let relationCreateError = null;
      const ensureFormalRelation = async () => {
        try {
          const entryRoute = relationEntryRouteForInlineLink(sourceNoteId, target.id, {
            source: editorRelationLinkEntrySource(inlineInsert),
            relationType,
            rationaleDraft: reason,
            insightQuestionDraft: QUICK_WIKILINK_ASSOCIATION_MARKER
          });
          const transaction = await saveOrUpgradeWikilinkRelationTransaction({
            noteId: sourceNoteId,
            targetNoteId: target.id,
            relationType: entryRoute.relationType,
            rationale: entryRoute.rationaleDraft,
            insightQuestion: entryRoute.insightQuestionDraft,
            confidence: 1
          }, {
            fetchNoteRelations,
            createNoteRelation,
            updateNoteRelation,
            isMarkdownWikilinkRelation
          });
          if (!transaction.ok) throw new Error(transaction.error || "关系暂时不能保存");
          relationCreateResult = transaction.relation;
          host.syncRelationNetworkConnected(sourceNoteId, target.id);
          const relations = await fetchNoteRelations(sourceNoteId).catch(() => null);
          if (relations && host.isActiveNoteId(sourceNoteId)) {
            host.currentSemanticRelations = relations;
            host.semanticRelationsState = "loaded";
            host.renderPreview();
          }
          await host.refreshRelationNetworkStatuses?.(sourceNoteId, target.id);
          host.renderAll?.();
        } catch (error) {
          relationCreateError = error;
          host.onStatus(`链接已插入，但关系保存失败：${String(error?.message || error)}`, "warn");
        }
      };
      const verifySavedLink = () => {
        const savedBody = persistedSourceBody();
        return host.hasResolvedLinkToNote(target.id, savedBody, scopedLinkNotes);
      };
      const saveInsertedBody = async (trigger) => {
        host.hideSaveAiSuggestion?.();
        const saved = await host.saveActiveNote({ trigger, skipOriginalityCheck: true, suppressSaveAiSuggestion: true });
        host.hideSaveAiSuggestion?.();
        if (saved === false || (saved && typeof saved === "object" && saved.ok === false) || !verifySavedLink()) {
          host.onStatus("链接已保留在编辑器中，但暂时没有同步成功。", "warn");
          return false;
        }
        return true;
      };
      if (inlineInsert) {
        const { start, end } = host.currentLinkContext;
        if (host.isWysiwygMode()) {
          host.replaceMarkdownWhileInWysiwyg(start, end, token);
        } else {
          host.replaceEditorRange(start, end, token);
        }
      } else if (manualSelection) {
        if (host.isWysiwygMode()) {
          host.replaceMarkdownWhileInWysiwyg(manualSelection.from, manualSelection.to, token, {
            selectionStart: restoreSelection?.from,
            selectionEnd: restoreSelection?.to
          });
        } else {
          host.replaceEditorRange(manualSelection.from, manualSelection.to, token, {
            selectionStart: restoreSelection?.from,
            selectionEnd: restoreSelection?.to
          });
        }
      } else {
        host.insertAtCursor(token);
      }
      const normalizedBody = normalizeKnownWikilinksToReadableTitles(host.getEditorValue(), scopedLinkNotes);
      if (normalizedBody !== host.getEditorValue()) {
        const nextSelection = restoreSelection || host.normalizedSelectionRange(host.editorSelection());
        if (host.isWysiwygMode()) {
          host.replaceMarkdownWhileInWysiwyg(0, host.getEditorValue().length, normalizedBody, {
            selectionStart: nextSelection?.from,
            selectionEnd: nextSelection?.to
          });
        } else {
          host.replaceEditorRange(0, host.getEditorValue().length, normalizedBody, {
            selectionStart: nextSelection?.from,
            selectionEnd: nextSelection?.to
          });
        }
      }
      host.handleEditorInput();
      this.close();
      host.focusEditor();
      if (!inlineInsert) {
        if (!(await saveInsertedBody("link-insert"))) return;
        await ensureFormalRelation();
        if (restoreSelection) host.setEditorSelectionRange(restoreSelection.from, restoreSelection.to);
        host.scheduleEditorScrollRestore(manualScrollState);
        if (relationCreateError) {
          return;
        }
        const reusedRelation = relationCreateResult?.created === false;
        const feedback = this.insertFeedback(target, this.insertOutcome(false, reusedRelation));
        host.onStatus(feedback.status, "ok");
      } else {
        if (!(await saveInsertedBody("inline-link-insert"))) return;
        await ensureFormalRelation();
        if (relationCreateError) {
          return;
        }
        const reusedRelation = relationCreateResult?.created === false;
        host.onStatus(reusedRelation ? `已插入关联笔记，已有关系已复用：${target.title}` : `已插入关联笔记并保存关系：${target.title}`, "ok");
      }
    } finally {
      this.setSubmitting(false);
    }
  }

  moveCandidate(step) {
    const host = this.host;
    if (!host.currentLinkCandidates.length) return;
    host.currentLinkIndex = nextEditorRelationLinkIndex(host.currentLinkIndex, host.currentLinkCandidates.length, step);
    const preferredId = host.currentLinkCandidates[host.currentLinkIndex]?.id || "";
    this.renderCandidates(host.els.linkSearchInput.value, preferredId);
    if (host.currentLinkContext) this.positionInline();
  }

  async confirmSelectedCandidate() {
    const host = this.host;
    const chosen = host.currentLinkCandidates[host.currentLinkIndex] || host.currentLinkCandidates[0];
    if (!chosen) return;
    host.currentPinnedLinkId = chosen.id;
    this.renderCandidates(host.els.linkSearchInput.value, chosen.id);
    host.els.linkSearchInput.value = host.linkCandidateDisplayTitle(chosen);
    host.els.linkSearchList.innerHTML = "";
    this.updateConfirmButton();
  }
}
