import { createNoteRelation, fetchNoteRelations, updateNoteRelation } from "./prototype-api.js";
import { wikilinkTokenForNote } from "./editor-link-picker.js";
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
    const result = editorRelationLinkCandidates({
      query,
      candidates: host.scopedLinkCandidates(),
      preferredId,
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
    host.els.linkSearchInput.placeholder = "搜索笔记标题";
    host.els.linkSearchInput.value = initialQuery;
    host.currentPinnedLinkId = "";
    host.manualLinkReturnSelection = inlineMode ? null : host.normalizedSelectionRange(host.editorSelection());
    host.manualLinkReturnScrollState = inlineMode ? null : host.captureEditorScrollState();
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
      host.positionFloatingPicker(host.els.linkPicker, Math.min(420, Math.max(320, Math.floor(window.innerWidth * 0.34))), {
        anchorRect: options.anchorRect || null,
        anchorElement: options.anchorElement || null
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
    host.positionFloatingPicker(host.els.linkPicker, Math.min(420, Math.max(320, Math.floor(window.innerWidth * 0.34))));
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
      host.onStatus("请先写一句关联理由，再建立正式关系。", "warn");
      this.focusReasonInput();
      this.updateConfirmButton();
      return;
    }
    const manualSelection = !inlineInsert
      ? host.normalizedSelectionRange(host.manualLinkReturnSelection) || host.normalizedSelectionRange(host.editorSelection())
      : null;
    const manualScrollState = !inlineInsert ? host.manualLinkReturnScrollState : null;
    const currentBody = host.getEditorValue();
    const persistedSourceBody = () => {
      const sourceTab = host.state.tabs.find((tab) => tab.id === sourceTabId) || null;
      const sourceNoteAfterSave = host.state.notes.find((note) => note.id === sourceNoteId) || null;
      return String(sourceTab?.savedBody || sourceNoteAfterSave?.body || "");
    };
    const editorBodyAlreadyLinked = !inlineInsert && host.hasResolvedLinkToNote(target.id, currentBody, scopedLinkNotes);
    const savedBodyAlreadyLinked = !inlineInsert && host.hasResolvedLinkToNote(target.id, persistedSourceBody(), scopedLinkNotes);
    const bodyAlreadyLinked = editorBodyAlreadyLinked;
    const token = wikilinkTokenForNote(target);
    const restoreSelection =
      manualSelection && Number.isFinite(manualSelection.from)
        ? bodyAlreadyLinked
          ? { from: manualSelection.to, to: manualSelection.to }
          : { from: manualSelection.from + token.length, to: manualSelection.from + token.length }
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
        } catch (error) {
          relationCreateError = error;
          host.onStatus(`关联已插入，但正式关系创建失败：${String(error?.message || error)}`, "warn");
        }
      };
      const verifySavedLink = () => {
        const savedBody = persistedSourceBody();
        return host.hasResolvedLinkToNote(target.id, savedBody, scopedLinkNotes);
      };
      const saveInsertedBody = async (trigger) => {
        const saved = await host.saveActiveNote({ trigger, skipOriginalityCheck: true });
        if (saved === false || (saved && typeof saved === "object" && saved.ok === false) || !verifySavedLink()) {
          host.onStatus("关联正文未能同步，已保留在编辑器中，暂未建立正式关系。", "warn");
          host.renderRelated("正文链接还没有成功保存，请同步后再建立正式关系。");
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
      } else if (bodyAlreadyLinked) {
        // Keep the existing wikilink in place and only ensure the semantic relation is tracked.
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
      host.handleEditorInput();
      this.close();
      host.focusEditor();
      if (!inlineInsert) {
        if (!savedBodyAlreadyLinked && !(await saveInsertedBody("link-insert"))) return;
        await ensureFormalRelation();
        if (restoreSelection) host.setEditorSelectionRange(restoreSelection.from, restoreSelection.to);
        host.scheduleEditorScrollRestore(manualScrollState);
        if (relationCreateError) {
          host.renderRelated("正文链接已插入，但正式关系创建失败。");
          return;
        }
        const reusedRelation = relationCreateResult?.created === false;
        const feedback = this.insertFeedback(target, this.insertOutcome(bodyAlreadyLinked, reusedRelation));
        host.onStatus(feedback.status, "ok");
        host.renderRelated(feedback.related);
      } else {
        if (!(await saveInsertedBody("inline-link-insert"))) return;
        await ensureFormalRelation();
        if (relationCreateError) {
          host.renderRelated("正文链接已插入，但正式关系创建失败。");
          return;
        }
        const reusedRelation = relationCreateResult?.created === false;
        host.onStatus(reusedRelation ? `已插入关联笔记，现有语义关系已复用：${target.title}` : `已插入关联笔记并建立正式关系：${target.title}`, "ok");
        host.renderRelated(reusedRelation ? "正文链接已插入，现有语义关系已复用。" : "正文链接与正式关系已建立。");
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
