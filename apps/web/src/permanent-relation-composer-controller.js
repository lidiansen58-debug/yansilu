import { searchNotes, fetchNoteRelations, createNoteRelation, updateNoteRelation } from "./prototype-api.js";
import { relationFollowupSuggestionForDraft, relationTypeLabel } from "./editor-relation-helpers.js";
import { wikilinkTokenForNote } from "./editor-link-picker.js";
import { saveRelationTransaction } from "./relation-save-transaction.js";
import { refreshGraphAfterRelationMutation } from "./relation-graph-refresh.js";
import { captureWorkspaceFocus, restoreWorkspaceFocus } from "./note-workspace-focus.js";
import {
  normalizeRelationDraft,
  relationDraftCanSave,
  relationDraftErrorText,
  resetRelationDraftResult
} from "./permanent-relation-draft-model.js";

function cleanText(value = "") {
  return String(value || "").trim();
}

function stateSourceNote(host) {
  const stateNoteId = cleanText(host.permanentRelationWorkspaceState?.sourceNoteId || host.permanentRelationWorkspaceState?.noteId);
  return stateNoteId ? host.state?.notes?.find?.((note) => note?.id === stateNoteId) || null : host.activeNote?.() || null;
}

function stateSourceNoteId(host) {
  return cleanText(host.permanentRelationWorkspaceState?.sourceNoteId || host.permanentRelationWorkspaceState?.noteId);
}

function stateSessionId(host) {
  return cleanText(host.permanentRelationWorkspaceState?.relationComposerSessionId);
}

function noteTitle(host, noteId = "") {
  const cleanNoteId = cleanText(noteId);
  return host.state?.notes?.find?.((note) => note?.id === cleanNoteId)?.title || cleanNoteId;
}

export class PermanentRelationComposerController {
  constructor(host) {
    this.host = host;
  }

  sourceNote() {
    return stateSourceNote(this.host);
  }

  replaceOverlay(existing, html) {
    const focused = captureWorkspaceFocus(existing);
    existing.outerHTML = html;
    restoreWorkspaceFocus(this.host.permanentRelationWorkspaceElement(), focused);
  }

  currentRelations() {
    const host = this.host;
    const noteId = stateSourceNoteId(host);
    const snapshot = this.relationSnapshot;
    if (snapshot?.noteId === noteId && snapshot.sessionId === stateSessionId(host) && snapshot.vault === host.vaultScope?.()) return snapshot.relations;
    return host.isActiveNoteId?.(noteId) ? host.currentSemanticRelations || null : null;
  }

  async loadPairPreview() {
    const host = this.host;
    const state = host.permanentRelationWorkspaceState;
    if (!state?.open || !state.selectedTargetNoteId || !host.fetchNoteForResolution) return false;
    const sourceId = stateSourceNoteId(host), targetId = state.selectedTargetNoteId;
    const session = stateSessionId(host), vault = host.vaultScope?.();
    const missingIds = [sourceId, targetId].filter((id) => {
      const note = host.state?.notes?.find((note) => note.id === id);
      return !note || note.bodyLoaded === false || (!note.thesis && typeof note.body !== "string");
    });
    if (!missingIds.length || state.pairPreviewState === "loading") return false;
    const serial = this.pairPreviewSerial = (this.pairPreviewSerial || 0) + 1;
    const stillCurrent = () => host.permanentRelationWorkspaceState?.open &&
      this.pairPreviewSerial === serial &&
      stateSourceNoteId(host) === sourceId && stateSessionId(host) === session &&
      host.permanentRelationWorkspaceState.selectedTargetNoteId === targetId && host.vaultScope?.() === vault;
    host.permanentRelationWorkspaceState = { ...state, pairPreviewState: "loading", pairPreviewError: "" };
    host.syncPermanentRelationWorkspaceOverlay();
    try {
      const notes = await Promise.all(missingIds.map((id) => host.fetchNoteForResolution(id)));
      if (!stillCurrent()) return false;
      if (notes.some((note, index) => !note || note.id !== missingIds[index] || typeof note.body !== "string")) {
        throw new Error("未能读取完整笔记，请重试或重新选择。");
      }
      host.upsertApiNotes(notes);
      host.permanentRelationWorkspaceState = { ...host.permanentRelationWorkspaceState, pairPreviewState: "ready", pairPreviewError: "" };
      host.syncPermanentRelationWorkspaceOverlay();
      return true;
    } catch (error) {
      if (!stillCurrent()) return false;
      host.permanentRelationWorkspaceState = { ...host.permanentRelationWorkspaceState, pairPreviewState: "error", pairPreviewError: `读取笔记失败：${String(error?.message || error)}` };
      host.syncPermanentRelationWorkspaceOverlay();
      return false;
    }
  }

  patchState(patch = {}) {
    const host = this.host;
    const sourceNote = this.sourceNote();
    const sourceNoteId = sourceNote?.id || host.permanentRelationWorkspaceState?.noteId || "";
    host.permanentRelationWorkspaceState = normalizeRelationDraft({
      ...host.permanentRelationWorkspaceState,
      ...patch
    }, sourceNoteId);
    host.syncPermanentRelationWorkspaceOverlay();
    void this.loadPairPreview();
  }

  chooseManualTarget(targetNoteId = "") {
    const host = this.host;
    const sourceNote = this.sourceNote();
    if (!sourceNote?.id) return;
    const timerHost = host.windowRef || window;
    timerHost.clearTimeout?.(host.permanentRelationSearchTimer);
    host.permanentRelationSearchSerial += 1;
    const targetId = cleanText(targetNoteId);
    const target = host.permanentRelationWorkspaceState.manualTargets.find((item) => item?.id === targetId) || null;
    host.upsertApiNotes?.(target ? [target] : []);
    this.patchState(resetRelationDraftResult({
      ...host.permanentRelationWorkspaceState,
      mode: "manual",
      selectedTargetNoteId: targetId,
      editingRelationId: "",
      pairPreviewState: "", pairPreviewError: "",
      relationType: host.permanentRelationWorkspaceState.relationType || "associated_with",
      rationale: host.permanentRelationWorkspaceState.rationale || "",
      dirty: true
    }));
    host.permanentRelationWorkspaceElement?.()?.querySelector?.("[data-relation-pair-preview]")?.focus?.();
  }

  async refreshManualSearch(query = "") {
    const host = this.host;
    const sourceNote = this.sourceNote();
    if (!sourceNote?.id) return;
    const serial = ++host.permanentRelationSearchSerial;
    const requestSourceNoteId = sourceNote.id;
    const requestSessionId = stateSessionId(host);
    const requestVaultScope = host.vaultScope?.();
    const stillCurrentSearch = () =>
      serial === host.permanentRelationSearchSerial &&
      host.vaultScope?.() === requestVaultScope &&
      stateSourceNoteId(host) === requestSourceNoteId &&
      stateSessionId(host) === requestSessionId;
    const cleanQuery = cleanText(query);
    host.permanentRelationWorkspaceState = normalizeRelationDraft({
      ...host.permanentRelationWorkspaceState,
      mode: "manual",
      manualQuery: cleanQuery,
      searchState: cleanQuery ? "loading" : "idle",
      selectedTargetNoteId: cleanQuery ? "" : host.permanentRelationWorkspaceState.selectedTargetNoteId,
      editingRelationId: cleanQuery ? "" : host.permanentRelationWorkspaceState.editingRelationId,
      pairPreviewState: "", pairPreviewError: "",
      error: "",
      notice: "",
      dirty: cleanQuery ? true : host.permanentRelationWorkspaceState.dirty === true
    }, sourceNote.id);
    host.syncPermanentRelationManualResults();
    if (!cleanQuery) {
      host.permanentRelationWorkspaceState = normalizeRelationDraft({
        ...host.permanentRelationWorkspaceState,
        manualTargets: [],
        selectedTargetNoteId: "",
        searchState: "idle"
      }, sourceNote.id);
      host.syncPermanentRelationManualResults();
      return;
    }
    try {
      const result = await searchNotes({
        query: cleanQuery,
        rootDirectoryId: host.relationTargetSearchRootId(sourceNote),
        excludeNoteId: sourceNote.id,
        limit: 30
      });
      if (!stillCurrentSearch()) return;
      const items = Array.isArray(result?.items) ? result.items : [];
      host.upsertApiNotes?.(items);
      host.permanentRelationWorkspaceState = normalizeRelationDraft({
        ...host.permanentRelationWorkspaceState,
        manualTargets: items,
        searchState: "loaded",
        notice: items.length ? "" : "没有找到匹配的笔记。"
      }, sourceNote.id);
      host.syncPermanentRelationManualResults();
    } catch (error) {
      if (!stillCurrentSearch()) return;
      host.permanentRelationWorkspaceState = normalizeRelationDraft({
        ...host.permanentRelationWorkspaceState,
        searchState: "error",
        error: `搜索失败：${String(error?.message || error)}`
      }, sourceNote.id);
      host.syncPermanentRelationManualResults();
    }
  }

  queueManualSearch(input) {
    const host = this.host;
    const query = input?.value || "";
    if (query === host.permanentRelationWorkspaceState.manualQuery) return;
    const timerHost = host.windowRef || window;
    timerHost.clearTimeout?.(host.permanentRelationSearchTimer);
    // Editing the search text invalidates the previous choice immediately,
    // before the debounced request can run.
    host.permanentRelationWorkspaceState = normalizeRelationDraft({
      ...host.permanentRelationWorkspaceState,
      manualQuery: query, selectedTargetNoteId: "", editingRelationId: "",
      pairPreviewState: "", pairPreviewError: "",
      manualTargets: [], searchState: query.trim() ? "loading" : "idle"
    }, this.sourceNote()?.id || stateSourceNoteId(host));
    host.permanentRelationSearchSerial += 1;
    host.syncPermanentRelationManualResults?.();
    const submit = host.permanentRelationWorkspaceElement?.()?.querySelector?.('button[type="submit"]');
    if (submit) submit.disabled = true;
    const sourceId = stateSourceNoteId(host), sessionId = stateSessionId(host), vault = host.vaultScope?.();
    host.permanentRelationSearchTimer = timerHost.setTimeout(() => {
      if (stateSourceNoteId(host) !== sourceId || stateSessionId(host) !== sessionId || host.vaultScope?.() !== vault) return;
      void this.refreshManualSearch(query);
    }, 180);
  }

  updateField(field = "", value = "") {
    const key = cleanText(field);
    if (!["relationType", "rationale", "insightQuestion"].includes(key)) return;
    const host = this.host;
    host.permanentRelationWorkspaceState = normalizeRelationDraft(resetRelationDraftResult({
      ...host.permanentRelationWorkspaceState,
      [key]: cleanText(value),
      dirty: true
    }), this.sourceNote()?.id || host.permanentRelationWorkspaceState.noteId || "");
    if (key === "relationType") {
      const label = host.permanentRelationWorkspaceElement?.()?.querySelector?.("[data-relation-pair-type]");
      if (label) label.textContent = relationTypeLabel(value);
    }
  }

  async insertLinkIfRequested(state = {}) {
    const host = this.host;
    if (state.insertLinkOnSave !== true) return false;
    if (!host.isActiveNoteId?.(state.noteId)) return false;
    const target = host.state?.notes?.find?.((note) => note?.id === state.selectedTargetNoteId) || { id: state.selectedTargetNoteId, title: noteTitle(host, state.selectedTargetNoteId) };
    const token = wikilinkTokenForNote(target);
    const range = state.cursorRange && typeof state.cursorRange === "object" ? state.cursorRange : null;
    if (range && Number.isFinite(range.from) && Number.isFinite(range.to)) {
      const cursor = range.from + token.length;
      if (host.isWysiwygMode?.()) {
        host.replaceMarkdownWhileInWysiwyg(range.from, range.to, token, { selectionStart: cursor, selectionEnd: cursor });
      } else {
        host.replaceEditorRange(range.from, range.to, token, { selectionStart: cursor, selectionEnd: cursor });
      }
    } else {
      host.insertAtCursor?.(token);
    }
    host.handleEditorInput?.();
    const saved = await host.saveActiveNote?.({ trigger: "relation-composer-link-insert", skipOriginalityCheck: true, suppressSaveAiSuggestion: true });
    host.hideSaveAiSuggestion?.();
    return saved !== false && !(saved && typeof saved === "object" && saved.ok === false);
  }

  async submit(form = null) {
    const host = this.host;
    const sourceNote = this.sourceNote();
    if (!sourceNote?.id) return;
    if (host.permanentRelationWorkspaceState.saveState === "saving" || ["loading", "error"].includes(host.permanentRelationWorkspaceState.pairPreviewState)) return;
    const data = new FormData(form);
    const state = normalizeRelationDraft({
      ...host.permanentRelationWorkspaceState,
      relationType: data.get("relationType"),
      rationale: data.get("rationale"),
      insightQuestion: data.get("insightQuestion")
    }, sourceNote.id);
    const sourceIsActive = host.isActiveNoteId?.(sourceNote.id) === true;
    const submitVaultScope = host.vaultScope?.();
    const vaultStillCurrent = () => host.vaultScope?.() === submitVaultScope;
    const sourceStillActive = () => vaultStillCurrent() && host.isActiveNoteId?.(sourceNote.id) === true;
    const submitSessionId = cleanText(state.relationComposerSessionId || stateSessionId(host));
    const draftStillCurrent = () =>
      Boolean(submitSessionId) &&
      vaultStillCurrent() &&
      stateSourceNoteId(host) === sourceNote.id &&
      stateSessionId(host) === submitSessionId;
    const currentRelations = this.currentRelations();
    const validation = relationDraftCanSave({
      state,
      relations: currentRelations,
      allowExistingUpdate: true
    });
    // A graph-only composer has no editor relation snapshot yet. Verify the
    // saved identity against the fresh preflight read before accepting a save.
    if (!validation.ok && !(validation.reason === "missing_relation" && !currentRelations)) {
      this.patchState({ ...state, error: relationDraftErrorText(validation.reason), notice: "" });
      return;
    }
    this.patchState({ ...state, saveState: "saving", error: "", notice: "正在保存关联..." });
    try {
      // This read validates the mutation only. It must not displace a sidebar
      // refresh that still needs to finish when the draft is cancelled or fails.
      const latestRelations = await fetchNoteRelations(sourceNote.id);
      if (!draftStillCurrent()) return;
      const latestValidation = relationDraftCanSave({
        state,
        relations: latestRelations,
        allowExistingUpdate: true
      });
      if (!latestValidation.ok) {
        if (!draftStillCurrent()) return;
        this.patchState({ ...state, saveState: "idle", error: relationDraftErrorText(latestValidation.reason), notice: "" });
        return;
      }
      const target = host.state.notes.find((item) => item.id === state.selectedTargetNoteId) || null;
      const existingRelationId = latestValidation.existing?.id || latestValidation.existing?.relationId || "";
      const displayedRelationId = validation.existing?.id || validation.existing?.relationId || "";
      if (existingRelationId && !state.editingRelationId && displayedRelationId !== existingRelationId) {
        this.relationSnapshot = { noteId: sourceNote.id, sessionId: submitSessionId, vault: submitVaultScope, relations: latestRelations };
        this.patchState({ ...state, editingRelationId: existingRelationId, saveState: "idle",
          notice: "这两条笔记已有关联。确认方向、类型和理由后，再保存修改。" });
        return;
      }
      const relationPayload = {
        relationType: state.relationType,
        rationale: state.rationale,
        insightQuestion: state.insightQuestion,
        confidence: 1,
        status: state.editingRelationId ? latestValidation.existing.status || "confirmed" : "confirmed"
      };
      let relation = null;
      let transaction = null;
      if (existingRelationId) {
        relation = await updateNoteRelation(existingRelationId, relationPayload);
        if (!relation?.id && !relation?.relationId) throw new Error("本地服务未返回关系保存结果，请重试。");
      } else {
        transaction = await saveRelationTransaction({
          noteId: sourceNote.id,
          targetNoteId: state.selectedTargetNoteId,
          ...relationPayload,
          createdBy: ""
        }, {
          createNoteRelation,
          targetTitle: target?.title || state.selectedTargetNoteId,
          relationLabel: relationTypeLabel(state.relationType)
        });
        if (!transaction.ok) {
          if (!draftStillCurrent()) return;
          this.patchState({ ...state, saveState: "idle", error: transaction.error, notice: "" });
          return;
        }
        relation = transaction.relation;
      }
      // Closing the composer cancels its UI, not a mutation already committed
      // by the service. Reconcile that mutation without reopening the old draft.
      if (!vaultStillCurrent()) return;
      host.syncRelationNetworkConnected?.(sourceNote.id, state.selectedTargetNoteId);
      await host.refreshRelationNetworkStatuses?.(sourceNote.id, state.selectedTargetNoteId);
      if (!vaultStillCurrent()) return;
      await refreshGraphAfterRelationMutation(host, {
        returnTo: state.entryRoute?.returnTo,
        savedRelation: relation,
        canRevealSavedRelation: draftStillCurrent
      });
      if (!vaultStillCurrent()) return;
      // Refresh owns both the snapshot and its loaded/error UI, even when the
      // composer has closed. A read failure does not undo the committed save.
      if (sourceStillActive()) await host.refreshSemanticRelations?.(sourceNote.id, host.relationsRequestSerial);
      if (!draftStillCurrent()) return;
      if (sourceStillActive()) {
        host.renderPreview?.();
        host.setRelationFollowupSuggestion?.(relationFollowupSuggestionForDraft({
          noteId: sourceNote.id,
          relationId: relation?.id || relation?.relationId || "",
          relationType: state.relationType,
          rationale: state.rationale,
          insightQuestion: state.insightQuestion,
          targetTitle: target?.title || state.selectedTargetNoteId
        }));
      }
      const linkInserted = await this.insertLinkIfRequested(state);
      if (!draftStillCurrent()) return;
      host.renderAll?.();
      const successMessage = existingRelationId ? "关联已更新。" : relation?.created === false ? "关联已存在，已直接复用。" : "关联已保存。";
      host.permanentSidebarController().commitSavedRelationWorkspaceResult({
        noteId: sourceNote.id,
        state,
        successMessage: linkInserted ? `${successMessage} 关联已插入。` : successMessage,
        result: {
          ...(transaction?.result || {
            targetNoteId: state.selectedTargetNoteId,
            targetTitle: target?.title || state.selectedTargetNoteId,
            relationType: state.relationType,
            relationLabel: relationTypeLabel(state.relationType),
            created: relation?.created !== false
          }),
          updated: Boolean(existingRelationId),
          linkInserted
        }
      });
    } catch (error) {
      if (!draftStillCurrent()) return;
      this.patchState({
        saveState: "error",
        notice: "",
        error: `保存失败：${String(error?.message || error)}`
      });
      host.onStatus?.(`关联保存失败：${String(error?.message || error)}`, "warn");
    }
  }
}
