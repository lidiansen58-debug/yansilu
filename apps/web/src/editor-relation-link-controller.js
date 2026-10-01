import { bodyLinkTokenForNote } from "./editor-body-links.js";
import { looksLikeStableNoteId, wikilinkTargetFromRaw } from "./editor-link-picker.js";
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

export class EditorRelationLinkController {
  constructor(host) {
    this.host = host;
    this.searchRevision = 0;
    this.editingLink = null;
    this.insertionPending = false;
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
    button.textContent = !host.isSubmittingLinkInsert && this.editingLink ? "保存链接" : state.label;
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
    this.editingLink = options.editingLink || null;
    const heading = host.els.linkPicker.querySelector(".link-picker-head strong");
    if (heading) heading.textContent = this.editingLink ? "修改笔记链接" : "插入笔记链接";
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
    host.els.linkSearchInput.placeholder = "搜索笔记标题";
    host.els.linkSearchInput.type = "search";
    host.els.linkSearchInput.name = `yansilu-link-target-${Date.now()}`;
    host.els.linkSearchInput.setAttribute("autocomplete", "off");
    host.els.linkSearchInput.setAttribute("autocorrect", "off");
    host.els.linkSearchInput.setAttribute("autocapitalize", "off");
    host.els.linkSearchInput.setAttribute("spellcheck", "false");
    host.els.linkSearchInput.value = initialQuery;
    host.currentPinnedLinkId = String(options.preferredId || "").trim();
    const returnSelection =
      host.normalizedSelectionRange(options.returnSelection) ||
      host.normalizedSelectionRange(host.manualLinkReturnSelection) ||
      host.normalizedSelectionRange(host.editorSelection());
    host.manualLinkReturnSelection = inlineMode ? null : returnSelection;
    host.manualLinkReturnScrollState = inlineMode
      ? null
      : options.returnScrollState || host.manualLinkReturnScrollState || host.captureEditorScrollState();
    host.currentLinkContext = options.inlineContext || null;
    host.lastInlinePickerAnchor = host.currentLinkContext?.end || 0;
    this.renderCandidates(initialQuery, options.preferredId || "");
    void this.searchCandidates(initialQuery);
    if (this.editingLink && !this.editingLink.noteId) void this.resolveEditingTarget();
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
    this.searchRevision += 1;
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
    this.editingLink = null;
    host.isSubmittingLinkInsert = this.insertionPending;
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

  async searchCandidates(query = "") {
    const host = this.host;
    const revision = ++this.searchRevision;
    const noteId = host.activeNote()?.id;
    const vaultScope = host.state.noteMoveVaultScope;
    const cleanQuery = String(query).trim();
    if (!cleanQuery || !host.searchNotesForResolution) return;
    try {
      const result = await host.searchNotesForResolution({ query: cleanQuery, excludeNoteId: noteId, limit: 50 });
      if (revision !== this.searchRevision || host.activeNote()?.id !== noteId || host.state.noteMoveVaultScope !== vaultScope) return;
      host.upsertApiNotes?.(result.items || []);
      this.renderCandidates(cleanQuery, host.currentPinnedLinkId || host.currentLinkCandidates?.[host.currentLinkIndex]?.id || "");
      if (host.currentLinkContext) this.positionInline();
    } catch (error) {
      if (revision === this.searchRevision) host.onStatus(`笔记搜索失败：${String(error?.message || error)}`, "warn");
    }
  }

  async resolveEditingTarget() {
    const host = this.host, editing = this.editingLink;
    const revision = this.searchRevision, noteId = host.activeNote()?.id, vaultScope = host.state.noteMoveVaultScope;
    try {
      const resolved = looksLikeStableNoteId(editing.raw)
        ? { note: await host.fetchNoteForResolution(wikilinkTargetFromRaw(editing.raw)) }
        : await host.resolvePreviewLinkToken(editing.raw);
      // Never guess which of several same-title notes an old reference meant.
      const target = resolved?.note;
      if (!target || resolved.ambiguous || this.editingLink !== editing || revision !== this.searchRevision || host.activeNote()?.id !== noteId || host.state.noteMoveVaultScope !== vaultScope) return;
      host.upsertApiNotes([target]);
      editing.noteId = target.id;
      editing.noteTitle = target.title || "";
      host.currentPinnedLinkId = target.id;
      host.els.linkSearchInput.value = target.title || "";
      this.renderCandidates(target.title || "", target.id);
    } catch {
      // A missing target can still be repaired by choosing another note.
    }
  }

  async insertSelected(noteId) {
    const host = this.host;
    if (!noteId || this.insertionPending || host.isSubmittingLinkInsert) return;
    const sourceNoteId = host.activeNote()?.id;
    const vaultScope = host.state.noteMoveVaultScope;
    const target = host.state.notes.find(note => note.id === noteId);
    if (!sourceNoteId || !target || target.id === sourceNoteId) return;
    const inline = host.currentLinkContext;
    const range = inline ? { from: inline.start, to: inline.end }
      : host.normalizedSelectionRange(host.manualLinkReturnSelection) || host.normalizedSelectionRange(host.editorSelection());
    const scroll = host.manualLinkReturnScrollState;
    const editing = this.editingLink;
    const token = bodyLinkTokenForNote(target, editing);
    const cursor = range ? range.from + token.length : null;
    this.insertionPending = true;
    this.setSubmitting(true);
    try {
      if (range) {
        if (host.isWysiwygMode()) host.replaceMarkdownWhileInWysiwyg(range.from, range.to, token, { selectionStart: cursor, selectionEnd: cursor });
        else host.replaceEditorRange(range.from, range.to, token, { selectionStart: cursor, selectionEnd: cursor });
      } else host.insertAtCursor(token);
      const insertedBody = host.getEditorValue();
      host.handleEditorInput();
      this.close();
      this.setSubmitting(true);
      host.focusEditor();
      const isCurrent = () => host.activeNote()?.id === sourceNoteId && host.state.noteMoveVaultScope === vaultScope;
      const saved = await host.saveActiveNote({ trigger: inline ? "inline-link-insert" : "link-insert", skipOriginalityCheck: true, suppressSaveAiSuggestion: true });
      if (!isCurrent()) return;
      if (saved === false || saved?.ok === false || !String(host.activeTab()?.savedBody || "").includes(token)) {
        host.onStatus("链接已保留在编辑器中，但暂时没有同步成功。", "warn");
        return;
      }
      if (host.getEditorValue() === insertedBody) {
        if (cursor !== null) host.setEditorSelectionRange(cursor, cursor);
        if (!inline) host.scheduleEditorScrollRestore(scroll);
      }
      host.onStatus(`${editing ? "已修改" : "已插入"}笔记链接：${target.title || "未命名笔记"}`, "ok");
    } catch (error) {
      if (host.activeNote()?.id === sourceNoteId && host.state.noteMoveVaultScope === vaultScope) host.onStatus(`链接未同步，修改仍保留：${String(error?.message || error)}`, "warn");
    } finally {
      this.insertionPending = false;
      this.setSubmitting(false);
    }
  }

  moveCandidate(step) {
    const host = this.host;
    if (!host.currentLinkCandidates.length) return;
    host.currentLinkIndex = nextEditorRelationLinkIndex(host.currentLinkIndex, host.currentLinkCandidates.length, step);
    const preferredId = host.currentLinkCandidates[host.currentLinkIndex]?.id || "";
    host.currentPinnedLinkId = "";
    this.renderCandidates(host.els.linkSearchInput.value, preferredId);
    if (host.currentLinkContext) this.positionInline();
  }

  async confirmSelectedCandidate() {
    const host = this.host;
    const chosen = host.currentLinkCandidates[host.currentLinkIndex] || host.currentLinkCandidates[0];
    if (!chosen) return;
    if (host.currentPinnedLinkId === chosen.id) return this.insertSelected(chosen.id);
    host.currentPinnedLinkId = chosen.id;
    this.renderCandidates(host.els.linkSearchInput.value, chosen.id);
    host.els.linkSearchInput.value = host.linkCandidateDisplayTitle(chosen);
    host.els.linkSearchList.innerHTML = "";
    this.updateConfirmButton();
  }
}
