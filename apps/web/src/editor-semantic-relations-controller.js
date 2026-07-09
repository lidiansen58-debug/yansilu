import {
  createNoteRelation,
  deleteNoteRelation,
  searchNotes,
  updateNoteRelation
} from "./prototype-api.js";
import { normalizeText } from "./editor-link-picker.js";
import { rootBoxIdFromFolder } from "./prototype-store.js";
import {
  parseInlineRelationAnnotations,
  relationFollowupSuggestionForDraft,
  relationTypeLabel,
  renderRelationQualityMeter
} from "./editor-relation-helpers.js";
import { saveRelationTransaction } from "./relation-save-transaction.js";
import {
  RELATION_ENTRY_SOURCES,
  normalizeRelationEntryRoute
} from "./relation-entry-route.js";
import { EditorSemanticRelationsView } from "./editor-semantic-relations-view.js";
import {
  currentEditorSemanticRelationPanelState,
  editorSemanticRelationFormValues,
  nextRelationTargetHighlight,
  normalizeEditorSemanticRelationPanelState,
  relationTargetStatusText,
  validateCreateSemanticRelationForm,
  validateEditSemanticRelationForm
} from "./editor-semantic-relations-model.js";

export class EditorSemanticRelationsController {
  constructor(host) {
    this.host = host;
    this.view = new EditorSemanticRelationsView(host);
  }

  setPanelState(mode = "list", options = {}) {
    const host = this.host;
    const cleanMode = ["list", "create", "edit"].includes(String(mode || "").trim()) ? String(mode || "").trim() : "list";
    const preferredTemplateVariant =
      cleanMode === "list"
        ? ""
        : host.readTemplateVariantPreference("relation", options.draftVariants || [], options.selectedTemplateVariant || "");
    const rememberedTemplateVariant = cleanMode === "list" ? { key: "", label: "" } : host.templateVariantPreferenceMeta("relation", options.draftVariants || []);
    host.relationPanelState = normalizeEditorSemanticRelationPanelState(cleanMode, options, {
      activeNoteId: host.activeNote()?.id || "",
      preferredTemplateVariant,
      rememberedTemplateVariant
    });
  }

  resetPanelState(noteId = this.host.activeNote()?.id || "") {
    this.setPanelState("list", { noteId });
  }

  currentPanelState(noteId = this.host.activeNote()?.id || "") {
    return currentEditorSemanticRelationPanelState(this.host.relationPanelState, noteId);
  }

  relationEndpoint(link, direction) {
    return this.view.relationEndpoint(link, direction);
  }

  renderRelationFollowupSuggestion(noteId = "") {
    return this.view.renderRelationFollowupSuggestion(noteId);
  }

  renderSemanticRelationItem(link, direction) {
    return this.view.renderSemanticRelationItem(link, direction);
  }

  renderSemanticRelationsLoadingSection(noteId) {
    return this.view.renderSemanticRelationsLoadingSection(noteId);
  }

  renderInlineDraftRelationSection(note, tab) {
    return this.view.renderInlineDraftRelationSection(note, tab);
  }

  relationCreateDefaultType(note = this.host.activeNote()) {
    return this.view.relationCreateDefaultType(note);
  }

  sortRelationTargetCandidates(candidates = [], note = this.host.activeNote()) {
    return this.view.sortRelationTargetCandidates(candidates, note);
  }

  renderRelationTargetOptions(candidates = [], selectedId = "") {
    return this.view.renderRelationTargetOptions(candidates, selectedId);
  }

  renderRelationTargetChoices(candidates = [], selectedId = "", query = "", activeId = "") {
    return this.view.renderRelationTargetChoices(candidates, selectedId, query, activeId);
  }

  renderCreateRelationFormSection(noteId, prefill = {}) {
    return this.view.renderCreateRelationFormSection(noteId, prefill);
  }

  renderRelationTypeOptions(selectedType = "") {
    return this.view.renderRelationTypeOptions(selectedType);
  }

  renderRelationStatusOptions(selectedStatus = "confirmed") {
    return this.view.renderRelationStatusOptions(selectedStatus);
  }

  renderEditRelationFormSection(noteId, link, context = {}) {
    return this.view.renderEditRelationFormSection(noteId, link, context);
  }

  renderSemanticRelationsSection(relations, noteId) {
    return this.view.renderSemanticRelationsSection(relations, noteId);
  }

  renderSemanticRelationsErrorSection(noteId, error) {
    return this.view.renderSemanticRelationsErrorSection(noteId, error);
  }

  renderCurrentRelationSection(noteId, options = {}) {
    return this.view.renderCurrentRelationSection(noteId, options);
  }

  currentExplicitRelationCount() {
    return this.view.currentExplicitRelationCount();
  }

  findRelation(relationId) {
    const id = String(relationId || "").trim();
    if (!id) return null;
    const outgoing = Array.isArray(this.host.currentSemanticRelations?.outgoingLinks) ? this.host.currentSemanticRelations.outgoingLinks : [];
    const backlinks = Array.isArray(this.host.currentSemanticRelations?.backlinks) ? this.host.currentSemanticRelations.backlinks : [];
    return [...outgoing, ...backlinks].find((link) => link?.id === id) || null;
  }

  openCreateForm(options = {}) {
    const host = this.host;
    const note = host.activeNote();
    if (!note?.id) return;
    const entryRoute = normalizeRelationEntryRoute(options.entryRoute || options, {
      source: RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR,
      noteId: note.id,
      returnTo: "right-sidebar"
    });
    host.openPermanentRelationWorkspace({
      source: entryRoute.source,
      mode: entryRoute.mode || "manual",
      targetNoteId: options?.targetNoteId || options?.entryRoute?.targetNoteId || entryRoute.targetNoteId,
      relationType: options?.relationType || options?.entryRoute?.relationType || entryRoute.relationType,
      rationaleDraft: options?.rationaleDraft || options?.entryRoute?.rationaleDraft || entryRoute.rationaleDraft,
      insightQuestionDraft: options?.insightQuestionDraft || options?.entryRoute?.insightQuestionDraft || entryRoute.insightQuestionDraft,
      notice: entryRoute.entryHint
    });
  }

  openInlineCreateForm(options = {}) {
    const host = this.host;
    const note = host.activeNote();
    if (!note?.id) return;
    this.setPanelState("create", {
      noteId: note.id,
      targetNoteId: options.targetNoteId,
      relationType: options.relationType,
      entryHint: options.entryHint,
      rationaleDraft: options.rationaleDraft,
      insightQuestionDraft: options.insightQuestionDraft,
      draftVariants: options.draftVariants,
      selectedTemplateVariant: options.selectedTemplateVariant,
      entryRoute: options.entryRoute
    });
    const section = host.els.result?.querySelector?.("[data-note-relations-section]");
    if (!section) return;
    section.outerHTML = this.renderCurrentRelationSection(note.id, {
      relations: host.currentSemanticRelations,
      relationState: host.semanticRelationsState
    });
    host.jumpToInspectorSection("[data-create-relation-form]", {
      focus: true,
      focusSelector: "[data-create-relation-form] [data-relation-target-search]"
    });
    void this.refreshTargetSearch("");
  }

  openEditForm(relationId, options = {}) {
    const host = this.host;
    const note = host.activeNote();
    if (!note?.id) return;
    const link = this.findRelation(relationId);
    if (!link) {
      host.onStatus("这条关系还没有加载完成", "warn");
      return;
    }
    const section = host.els.result?.querySelector?.("[data-note-relations-section]");
    if (!section) return;
    this.setPanelState("edit", {
      noteId: note.id,
      relationId,
      entryHint: options?.entryHint,
      rationaleDraft: options?.rationaleDraft,
      insightQuestionDraft: options?.insightQuestionDraft,
      draftVariants: options?.draftVariants,
      selectedTemplateVariant: options?.selectedTemplateVariant
    });
    section.outerHTML = this.renderCurrentRelationSection(note.id, {
      relations: host.currentSemanticRelations,
      relationState: host.semanticRelationsState
    });
  }

  relationTargetSearchRootId(note = this.host.activeNote()) {
    return rootBoxIdFromFolder(this.host.state, note?.folderId);
  }

  async refreshTargetSearch(query = "") {
    const host = this.host;
    const note = host.activeNote();
    if (!note?.id) return;
    const form = host.els.result?.querySelector?.("[data-create-relation-form]");
    if (!form || form.dataset.noteId !== note.id) return;

    const serial = ++host.relationTargetSearchSerial;
    const searchInput = form.querySelector("[data-relation-target-search]");
    const hiddenTargetId = form.querySelector("[data-relation-target-id]");
    const list = form.querySelector("[data-relation-target-list]");
    const status = form.querySelector("[data-relation-target-status]");
    const submit = form.querySelector('button[type="submit"]');
    const selectedBefore = String(hiddenTargetId?.value || "").trim();
    const highlightBefore = String(form.dataset.relationTargetHighlightId || "").trim();
    if (status) status.textContent = "正在搜索 SQLite 笔记目录...";

    try {
      const result = await searchNotes({
        query,
        rootDirectoryId: this.relationTargetSearchRootId(note),
        excludeNoteId: note.id,
        limit: 30
      });
      if (serial !== host.relationTargetSearchSerial || host.activeNote()?.id !== note.id) return;
      const items = Array.isArray(result?.items) ? result.items : [];
      host.upsertApiNotes(items);
      if (!form.isConnected) return;
      const selectedNote = selectedBefore ? host.state.notes.find((item) => item?.id === selectedBefore) || null : null;
      const cleanQuery = String(query || "").trim();
      const nextHighlightId = nextRelationTargetHighlight({
        items,
        selectedBefore,
        highlightBefore,
        query: cleanQuery
      });
      form.dataset.relationTargetHighlightId = nextHighlightId;
      if (list) list.innerHTML = this.renderRelationTargetChoices(items, selectedBefore, query, nextHighlightId);
      if (submit) submit.disabled = !selectedBefore;
      if (status) {
        status.textContent = relationTargetStatusText({
          selectedNote,
          itemCount: items.length,
          query: cleanQuery,
          hasScopedCandidates: host.scopedLinkCandidates().length > 0
        });
      }
      if (searchInput && selectedNote && !String(searchInput.value || "").trim()) {
        searchInput.value = selectedNote.title || selectedNote.id || "";
      }
    } catch (error) {
      if (serial !== host.relationTargetSearchSerial || host.activeNote()?.id !== note.id) return;
      if (status) status.textContent = `目标搜索失败：${String(error?.message || error)}`;
      if (submit && !String(hiddenTargetId?.value || "").trim()) submit.disabled = true;
    }
  }

  queueTargetSearch(input) {
    const host = this.host;
    const form = input?.closest?.("[data-create-relation-form]");
    const hiddenTargetId = form?.querySelector?.("[data-relation-target-id]");
    const selectedNote = hiddenTargetId?.value
      ? host.state.notes.find((item) => item?.id === String(hiddenTargetId.value || "").trim()) || null
      : null;
    if (hiddenTargetId && selectedNote && normalizeText(input?.value || "") !== normalizeText(selectedNote?.title || selectedNote?.id || "")) {
      hiddenTargetId.value = "";
      delete hiddenTargetId.dataset.targetTitle;
      const submit = form?.querySelector?.('button[type="submit"]');
      if (submit) submit.disabled = true;
    }
    if (form) form.dataset.relationTargetHighlightId = "";
    window.clearTimeout(host.relationTargetSearchTimer);
    host.relationTargetSearchTimer = window.setTimeout(() => {
      void this.refreshTargetSearch(input?.value || "");
    }, 180);
  }

  openTargetList(form) {
    const list = form?.querySelector?.("[data-relation-target-list]");
    if (list) list.hidden = false;
  }

  closeTargetList(form) {
    const list = form?.querySelector?.("[data-relation-target-list]");
    if (list) list.hidden = true;
  }

  visibleTargetChoices(form) {
    return Array.from(form?.querySelectorAll?.("[data-relation-target-choice]") || []).filter(Boolean);
  }

  moveTargetChoice(form, step = 1) {
    const buttons = this.visibleTargetChoices(form);
    if (!buttons.length) return;
    this.openTargetList(form);
    const hiddenTargetId = form?.querySelector?.("[data-relation-target-id]");
    const currentId = String(form?.dataset?.relationTargetHighlightId || hiddenTargetId?.value || "").trim();
    let index = buttons.findIndex((button) => String(button.dataset.noteId || "").trim() === currentId);
    if (index < 0) index = step > 0 ? -1 : 0;
    const next = buttons[(index + step + buttons.length) % buttons.length];
    if (!next) return;
    form.dataset.relationTargetHighlightId = String(next.dataset.noteId || "").trim();
    buttons.forEach((button) => {
      const active = button === next;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    next.scrollIntoView?.({ block: "nearest" });
  }

  applyTargetChoice(form, noteId = "", noteTitle = "", options = {}) {
    const host = this.host;
    const cleanNoteId = String(noteId || "").trim();
    if (!form || !cleanNoteId) return;
    const hiddenTargetId = form.querySelector("[data-relation-target-id]");
    const searchInput = form.querySelector("[data-relation-target-search]");
    const status = form.querySelector("[data-relation-target-status]");
    const submit = form.querySelector('button[type="submit"]');
    if (hiddenTargetId) {
      hiddenTargetId.value = cleanNoteId;
      hiddenTargetId.dataset.targetTitle = String(noteTitle || "").trim();
    }
    form.dataset.relationTargetHighlightId = cleanNoteId;
    if (searchInput) searchInput.value = String(noteTitle || "").trim();
    if (submit) submit.disabled = false;
    if (status) status.textContent = `已选：${noteTitle || cleanNoteId}`;
    if (options.keepOpen) this.openTargetList(form);
    else this.closeTargetList(form);
    void host.refreshRelationTargetSearch(String(noteTitle || "").trim());
    if (options.focusReason !== false) {
      const rationale = form.querySelector('textarea[name="rationale"]');
      rationale?.focus?.();
    }
  }

  refreshQualityMeter(form) {
    const meter = form?.querySelector?.("[data-relation-quality]");
    if (!meter) return;
    const rationale = form.querySelector('textarea[name="rationale"]')?.value || "";
    const insightQuestion = form.querySelector('textarea[name="insightQuestion"]')?.value || "";
    meter.outerHTML = renderRelationQualityMeter(rationale, insightQuestion);
  }

  async handleCreateForm(form) {
    const host = this.host;
    const note = host.activeNote();
    const formNoteId = String(form?.dataset?.noteId || "").trim();
    if (!note?.id || formNoteId !== note.id) return;

    const values = editorSemanticRelationFormValues(new FormData(form));
    const errorEl = form.querySelector("[data-relation-form-error]");
    const submit = form.querySelector('button[type="submit"]');
    const validation = validateCreateSemanticRelationForm(values);
    if (!validation.ok) {
      if (errorEl) errorEl.textContent = validation.error;
      return;
    }

    if (submit) submit.disabled = true;
    if (errorEl) errorEl.textContent = "";
    try {
      const target = host.state.notes.find((item) => item.id === values.toNoteId);
      const transaction = await saveRelationTransaction({
        noteId: note.id,
        targetNoteId: values.toNoteId,
        relationType: values.relationType,
        rationale: values.rationale,
        insightQuestion: values.insightQuestion,
        confidence: 1,
        status: "confirmed"
      }, {
        createNoteRelation,
        targetTitle: target?.title || values.toNoteId,
        relationLabel: relationTypeLabel(values.relationType)
      });
      if (!transaction.ok) {
        if (errorEl) errorEl.textContent = transaction.error;
        return;
      }
      const relation = transaction.relation;
      host.syncRelationNetworkConnected(note.id, values.toNoteId);
      if (!host.isActiveNoteId(formNoteId)) return;
      host.onStatus(
        relation?.created === false
          ? `关系已存在，已复用：${note.title || note.id} -> ${target?.title || values.toNoteId}`
          : `关系已建立：${note.title || note.id} -> ${target?.title || values.toNoteId}`,
        "ok"
      );
      host.setRelationFollowupSuggestion(
        relationFollowupSuggestionForDraft({
          noteId: note.id,
          relationId: relation?.id || relation?.relationId || "",
          relationType: values.relationType,
          rationale: values.rationale,
          insightQuestion: values.insightQuestion,
          targetTitle: target?.title || values.toNoteId
        })
      );
      this.resetPanelState(formNoteId);
      host.renderRelated(relation?.created === false ? "关系已存在，已复用。" : "关系已建立。");
    } catch (error) {
      if (!host.isActiveNoteId(formNoteId)) return;
      const message = String(error?.message || error);
      if (errorEl) errorEl.textContent = message;
      host.onStatus(`关系创建失败：${message}`, "warn");
    } finally {
      if (submit && host.isActiveNoteId(formNoteId)) submit.disabled = false;
    }
  }

  async promoteInlineDraft(indexValue = "") {
    const host = this.host;
    const note = host.activeNote();
    const tab = host.activeTab();
    const noteId = String(note?.id || "").trim();
    if (!noteId || !tab) return;
    const drafts = parseInlineRelationAnnotations(host.getEditorValue() || tab.body || "");
    const index = Number(indexValue);
    const draft = Number.isInteger(index) ? drafts[index] : null;
    if (!draft) {
      host.onStatus("没有找到这条临时关联", "warn");
      return;
    }
    const scoped = host.scopedLinkCandidates();
    const resolved = host.resolveLinkToken(draft.token, scoped);
    if (resolved?.ambiguous) {
      host.onStatus(`关联目标不唯一：${draft.token}，请先选择具体笔记。`, "warn");
      return;
    }
    const target = resolved?.note;
    if (!target?.id) {
      host.onStatus(`没有找到关联目标：${draft.token}`, "warn");
      return;
    }
    try {
      const transaction = await saveRelationTransaction({
        noteId: note.id,
        targetNoteId: target.id,
        relationType: draft.relationType,
        rationale: draft.rationale,
        insightQuestion: "",
        confidence: 1,
        status: "confirmed"
      }, {
        createNoteRelation,
        targetTitle: target.title || target.id,
        relationLabel: relationTypeLabel(draft.relationType)
      });
      if (!transaction.ok) throw new Error(transaction.error || "关系暂时不能保存");
      const relation = transaction.relation;
      host.syncRelationNetworkConnected(note.id, target.id);
      if (!host.isActiveNoteId(noteId)) return;
      const currentBody = host.getEditorValue() || tab.body || "";
      const cleanedBody = currentBody.replace(draft.raw, `[[${draft.token}]]`);
      host.setEditorValue(cleanedBody);
      host.handleEditorInput();
      await host.saveActiveNote({ autoSave: true, trigger: "promote-inline-relation", skipOriginalityCheck: true });
      if (!host.isActiveNoteId(noteId)) return;
      host.onStatus(`已升级为正式关系：${note.title || note.id} -> ${target.title || target.id}`, "ok");
      host.setRelationFollowupSuggestion(
        relationFollowupSuggestionForDraft({
          noteId: note.id,
          relationId: relation?.id || relation?.relationId || "",
          relationType: draft.relationType,
          rationale: draft.rationale,
          insightQuestion: "",
          targetTitle: target.title || target.id
        })
      );
      this.resetPanelState(noteId);
      host.renderRelated("已升级为正式语义关系。");
    } catch (error) {
      if (!host.isActiveNoteId(noteId)) return;
      host.onStatus(`正式关系创建失败：${String(error?.message || error)}`, "warn");
    }
  }

  async handleEditForm(form) {
    const host = this.host;
    const note = host.activeNote();
    const formNoteId = String(form?.dataset?.noteId || "").trim();
    const relationId = String(form?.dataset?.relationId || "").trim();
    if (!note?.id || formNoteId !== note.id || !relationId) return;
    const existingLink = this.findRelation(relationId);
    const peerNoteId = String(existingLink?.fromNoteId === note.id ? existingLink?.toNoteId || "" : existingLink?.fromNoteId || "").trim();
    const values = editorSemanticRelationFormValues(new FormData(form));
    const errorEl = form.querySelector("[data-relation-form-error]");
    const submit = form.querySelector('button[type="submit"]');
    const validation = validateEditSemanticRelationForm(values);
    if (!validation.ok) {
      if (errorEl) errorEl.textContent = validation.error;
      return;
    }

    if (submit) submit.disabled = true;
    if (errorEl) errorEl.textContent = "";
    try {
      await updateNoteRelation(relationId, {
        relationType: values.relationType,
        status: values.status,
        rationale: values.rationale,
        insightQuestion: values.insightQuestion
      });
      await host.refreshRelationNetworkStatuses(note.id, peerNoteId);
      if (!host.isActiveNoteId(formNoteId)) return;
      host.onStatus("关系已更新", "ok");
      this.resetPanelState(formNoteId);
      host.renderRelated("关系已更新。");
    } catch (error) {
      if (!host.isActiveNoteId(formNoteId)) return;
      const message = String(error?.message || error);
      if (errorEl) errorEl.textContent = message;
      host.onStatus(`关系更新失败：${message}`, "warn");
    } finally {
      if (submit && host.isActiveNoteId(formNoteId)) submit.disabled = false;
    }
  }

  async deleteRelation(relationId) {
    const host = this.host;
    const id = String(relationId || "").trim();
    if (!id) return;
    const link = this.findRelation(id);
    const activeNoteId = String(host.activeNote()?.id || "").trim();
    const peerNoteId = String(link?.fromNoteId === activeNoteId ? link?.toNoteId || "" : link?.fromNoteId || "").trim();
    const endpoint = link ? this.relationEndpoint(link, link.fromNoteId === host.activeNote()?.id ? "outgoing" : "incoming") : null;
    const label = endpoint?.title || "这条关系";
    if (!window.confirm(`删除与“${label}”的这条关系？`)) return;
    try {
      await deleteNoteRelation(id);
      await host.refreshRelationNetworkStatuses(activeNoteId, peerNoteId);
      if (!host.isActiveNoteId(activeNoteId)) return;
      host.onStatus("关系已删除", "ok");
      this.resetPanelState(activeNoteId);
      host.closePermanentRelationWorkspace?.();
      host.renderRelated("关系已删除。");
    } catch (error) {
      if (!host.isActiveNoteId(activeNoteId)) return;
      host.onStatus(`关系删除失败：${String(error?.message || error)}`, "warn");
    }
  }
}
