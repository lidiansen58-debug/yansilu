export function createImportResultRuntime(deps = {}) {
  const {
    $,
    activateModule,
    addWritingBasketIds,
    candidatePreviewFromPayload,
    candidatePreviewItemIds,
    candidateSelectionFromPayload,
    confirmSkipReasonMap,
    confirmSkippedCandidateIds,
    clearWritingSourceIndexIds,
    computeCandidateIdsForSelection,
    computeDefaultSelectedCandidateIds,
    computeLiteratureBatchSummaryForPayload,
    computeSummarizeLiteratureBatchFromNotes,
    createdNoteIdsByTypeFromImportPayload,
    createdNoteIdsByTypeFromImportRecord,
    directoryPathLabel,
    ensureNotesLoaded,
    escapeHtml,
    importConfirmButtonState,
    importPayloadRecordId,
    importState,
    handleStateChange = async () => false,
    noteById = () => null,
    openNoteById,
    rankedLiteratureQueueNotes,
    renderCandidatePreview,
    renderConfirmSkipBreakdown,
    renderImportResultMount,
    renderImportWritingActionsHtml,
    renderWritingResultDetailsHtml,
    renderWritingPanel,
    renderWritingScaffoldPreview,
    selectedCandidateIdsForImportAction,
    selectedCandidateIdsForImportState,
    selectionSummaryForImportState,
    setLiteratureQueueFocus,
    setStatus,
    summarizeCandidateSelection,
    syncImportSelectionState,
    suggestedWritingProjectTitle,
    beginWritingEntry,
    normalizeWritingProjectTitleSeed,
    updateExportTargetHint,
    writingNoteById,
    writingState
  } = deps;

  function candidateIdsForSelection(candidatePreview, candidateSelection = null) {
    return computeCandidateIdsForSelection(candidatePreview, candidateSelection, { candidatePreviewItemIds });
  }

  function defaultSelectedCandidateIds(candidatePreview, candidateSelection = null, originalityGuard = null) {
    return computeDefaultSelectedCandidateIds(candidatePreview, candidateSelection, originalityGuard, { selectedCandidateIdsForImportAction });
  }

  function syncImportSelection(importRecordId, candidatePreview, candidateSelection = null, { preserve = false, selectedIds = null } = {}) {
    syncImportSelectionState(importState, importRecordId, candidatePreview, candidateSelection, { preserve, selectedIds }, { candidatePreviewItemIds });
  }

  function selectedCandidateIdsFor(candidatePreview, candidateSelection, importRecordId, selection = null) {
    return selectedCandidateIdsForImportState(importState, candidatePreview, candidateSelection, importRecordId, selection, { candidatePreviewItemIds });
  }

  function selectionSummary(candidatePreview, importRecordId, selection = null, candidateSelection = null) {
    return selectionSummaryForImportState(importState, candidatePreview, importRecordId, selection, candidateSelection, {
      candidatePreviewItemIds,
      summarizeCandidateSelection
    });
  }

  function renderImportWritingActions(payload = {}) {
    return renderImportWritingActionsHtml(payload, { literatureBatchSummaryForPayload });
  }

  function summarizeLiteratureBatchFromNotes(notes = []) {
    return computeSummarizeLiteratureBatchFromNotes(notes, { rankedLiteratureQueueNotes });
  }

  function literatureBatchSummaryForPayload(payload = {}) {
    return computeLiteratureBatchSummaryForPayload(payload, importState.literatureBatchSummary);
  }

  function renderWritingResultDetails(data = {}) {
    return renderWritingResultDetailsHtml(data, { escapeHtml });
  }

  function renderResult(el, payload) {
    if (!el) return;
    if (typeof payload === "string") {
      el.textContent = payload;
      return;
    }
    const data = payload || {};
    const stage = String(data.stage || "");
    const candidatePreview = candidatePreviewFromPayload(data);
    const skippedCandidateIds = confirmSkippedCandidateIds(data, candidatePreview);
    const skipReasonMap = confirmSkipReasonMap(data, candidatePreview);
    const importRecordId = data.importRecordId || data.importRecord?.importRecordId || "";
    const interactivePreview = stage === "preview" || (stage === "record" && data.importRecord?.status === "preview");
    const selection = data.result?.selection || data.importRecord?.confirmResult?.selection || null;
    const previewSummary = selectionSummary(candidatePreview, importRecordId, selection, candidateSelectionFromPayload(data));
    const showExcludedSummary = stage === "confirm" && Boolean(selection?.selectedCandidates < selection?.totalCandidates);
    const raw = JSON.stringify(data, null, 2);
  
    el.innerHTML = renderImportResultMount({
      data,
      writingActionsHtml: renderImportWritingActions(data),
      skipBreakdownHtml: renderConfirmSkipBreakdown(data, candidatePreview, { focusReason: importState.resultFocusReason }),
      candidatePreviewHtml: renderCandidatePreview(candidatePreview, {
        interactive: interactivePreview,
        summary: previewSummary,
        showExcludedSummary,
        originalityGuard: data.originalityGuard || data.importRecord?.originalityGuard || null,
        focusReason: importState.resultFocusReason,
        focusCandidateIds: skippedCandidateIds[importState.resultFocusReason] || [],
        skipReasonMap
      }),
      writingDetailsHtml: renderWritingResultDetails(data),
      raw
    });
  }

  function showImportOperationResultModal(mode = "import", title = "操作结果") {
    const modal = $("importOperationResultModal");
    const titleEl = $("importOperationResultTitle");
    const importResult = $("importResult");
    const exportResult = $("exportResult");
    if (!modal) return;
    if (titleEl) titleEl.textContent = title;
    if (importResult) importResult.hidden = mode !== "import";
    if (exportResult) exportResult.hidden = mode !== "export";
    modal.classList.remove("hidden");
  }

  function hideImportOperationResultModal() {
    $("importOperationResultModal")?.classList.add("hidden");
  }

  function showImportResult(payload) {
    importState.resultFocusReason = "";
    importState.lastResultPayload = payload;
    importState.literatureBatchSummary = null;
    renderResult($("importResult"), payload);
    showImportOperationResultModal("import", "导入结果");
    void refreshImportLiteratureBatchSummary(payload);
    updateImportConfirmButton();
  }

  function showExportResult(payload) {
    const directoryId = String(payload?.directoryId || "").trim();
    if (directoryId && !payload.directoryLabel) payload.directoryLabel = directoryPathLabel(directoryId);
    renderResult($("exportResult"), payload);
    showImportOperationResultModal("export", "导出结果");
    updateExportTargetHint();
  }

  function showWritingResult(payload) {
    if (payload?.stage === "draft_scaffold" && typeof payload.markdown === "string") {
      writingState.scaffoldMarkdown = payload.markdown;
    }
    renderResult($("writingResult"), payload);
    renderWritingScaffoldPreview();
  }

  function syncWritingResultFromCurrentState() {
    const resultEl = $("writingResult");
    if (!resultEl) return;
    const currentText = String(resultEl.textContent || "").trim();
    const shouldHydrate = !currentText || currentText === "尚未确定可写主题。" || currentText === "请先确定可写主题";
    if (!shouldHydrate) return;
  
    if (writingState.scaffold) {
      showWritingResult({
        stage: "draft_scaffold",
        sections: Array.isArray(writingState.scaffold.sections) ? writingState.scaffold.sections : [],
        markdown: String(writingState.scaffoldMarkdown || "").trim()
      });
      return;
    }
  
    if (writingState.project) {
      const basketNotes = (writingState.project.basket_notes || [])
        .map((note) => ({
          id: note?.id || "",
          title: note?.title || note?.id || ""
        }))
        .filter((note) => note.id);
      showWritingResult({
        stage: "writing_project",
        basketNotes
      });
    }
  }

  async function refreshImportLiteratureBatchSummary(payload = {}) {
    const noteIds = createdNoteIdsByTypeFromImportPayload(payload, "literature");
    if (!noteIds.length) return;
    const key = `${importPayloadRecordId(payload)}|${noteIds.join(",")}`;
    await ensureNotesLoaded(noteIds);
    const notes = noteIds.map((id) => writingNoteById(id)).filter(Boolean);
    if (!notes.length) return;
    if (importState.lastResultPayload !== payload) return;
    importState.literatureBatchSummary = {
      key,
      ...summarizeLiteratureBatchFromNotes(notes)
    };
    rerenderImportResult();
  }

  async function enrichImportHistoryItemsWithLiteratureProgress(items = []) {
    const records = Array.isArray(items) ? items : [];
    const literatureIdGroups = records.map((record) => createdNoteIdsByTypeFromImportRecord(record, "literature"));
    const allLiteratureIds = [...new Set(literatureIdGroups.flat().filter(Boolean))];
    if (!allLiteratureIds.length) return records;
    await ensureNotesLoaded(allLiteratureIds);
    return records.map((record, index) => {
      const noteIds = literatureIdGroups[index] || [];
      if (!noteIds.length) return record;
      const notes = noteIds.map((id) => writingNoteById(id)).filter(Boolean);
      if (!notes.length) return record;
      return {
        ...record,
        literatureBatchProgress: summarizeLiteratureBatchFromNotes(notes)
      };
    });
  }

  async function openImportedLiteratureQueue() {
    const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "literature");
    if (!noteIds.length) {
      setStatus("当前导入结果里没有可继续处理的文献笔记", "warn");
      return false;
    }
    await ensureNotesLoaded(noteIds);
    const importRecordId = importPayloadRecordId(importState.lastResultPayload || {}) || importState.importRecordId || "";
    setLiteratureQueueFocus(noteIds, importRecordId ? `导入批次 ${importRecordId}` : "本次导入");
    activateModule("explorer");
    const opened = openNoteById(noteIds[0], { preferTitleSelection: false });
    if (!opened) return false;
    setStatus(`已打开 ${noteIds.length} 条导入文献中的第一条，并只显示本次导入的文献处理列表`, "ok");
    return true;
  }

  async function openFirstImportedPermanentNote(noteId = "") {
    const overview = importState.lastResultPayload?.result?.organizingOverview || importState.lastResultPayload?.importRecord?.confirmResult?.organizingOverview || null;
    const recommended = Array.isArray(overview?.recommendedFirst) ? overview.recommendedFirst : [];
    const selectedNoteId =
      String(noteId || "").trim() ||
      String(recommended.find((item) => item?.noteId || item?.id)?.noteId || recommended.find((item) => item?.noteId || item?.id)?.id || "").trim() ||
      "";
    if (!selectedNoteId) {
      setStatus("当前导入结果里没有需要优先处理的未关联永久笔记", "warn");
      return false;
    }
    await ensureNotesLoaded([selectedNoteId]);
    const importedPermanentNoteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "permanent");
    const selectedNote = noteById(selectedNoteId);
    const selectedFolderId = String(selectedNote?.folderId || selectedNote?.directoryId || "").trim();
    hideImportOperationResultModal();
    activateModule("graph");
    if (selectedFolderId) await handleStateChange("select-folder", { folderId: selectedFolderId, source: "import-result" });
    const openedRelationFlow = await handleStateChange("graph-associate-note", {
      noteId: selectedNoteId,
      source: "import-result",
      importedPermanentNoteIds
    });
    if (openedRelationFlow) {
      setStatus("已打开第一条未关联笔记。先选择一条相关旧笔记，写一句理由并保存关系。", "ok");
      return true;
    }
    activateModule("explorer");
    const opened = openNoteById(selectedNoteId, { preferTitleSelection: false });
    if (!opened) {
      setStatus("这条永久笔记暂时打不开，请从永久笔记盒中手动打开。", "warn");
      return false;
    }
    setStatus("已打开第一条未关联永久笔记。下一步：建立一条能说明理由的关系。", "ok");
    return true;
  }

  async function addImportedPermanentNotesToWritingBasket({ openWriting = false } = {}) {
    const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "permanent");
    if (!noteIds.length) {
      setStatus("当前导入结果里没有可作为相关笔记的永久笔记", "warn");
      return false;
    }
    await ensureNotesLoaded(noteIds);
    if (openWriting) {
      beginWritingEntry(noteIds, {
        title: suggestedWritingProjectTitle(noteIds),
        source: "import_permanent_notes"
      });
      activateModule("writing");
      await openWritingModule({ statusMessage: `已把 ${noteIds.length} 条导入永久笔记加入相关笔记，并打开写作中心` });
    } else {
      clearWritingSourceIndexIds();
      addWritingBasketIds(noteIds);
      if (!$("writingTitle")?.value.trim()) {
        const firstNote = noteIds.map((id) => writingNoteById(id)).find(Boolean);
        if (firstNote?.title) $("writingTitle").value = normalizeWritingProjectTitleSeed(firstNote.title);
      }
      renderWritingPanel();
      setStatus(`已把 ${noteIds.length} 条导入永久笔记加入相关笔记`, "ok");
    }
    return true;
  }

  function activeImportPreviewContext() {
    const directPreview = importState.lastPreview;
    const currentImportRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    if (directPreview?.importRecordId && directPreview.importRecordId === currentImportRecordId) return directPreview;
    const recordPreview = importState.lastResultPayload?.stage === "record" ? importState.lastResultPayload.importRecord : null;
    if (recordPreview?.status === "preview" && String(recordPreview.importRecordId || "") === currentImportRecordId) {
      return {
        importRecordId: recordPreview.importRecordId,
        candidatePreview: recordPreview.candidatePreview || null,
        candidateSelection: recordPreview.candidateSelection || null,
        originalityGuard: recordPreview.originalityGuard || null
      };
    }
    return directPreview || null;
  }

  function updateImportConfirmButton() {
    const button = $("btnImportConfirm");
    if (!button) return;
    const preview = activeImportPreviewContext();
    const importRecordId = String($("importRecordId")?.value || importState.importRecordId || "").trim();
    const hasMatchingPreview = Boolean(preview?.candidatePreview && preview.importRecordId === importRecordId);
    const summary = hasMatchingPreview
      ? selectionSummary(preview.candidatePreview, importRecordId, null, preview.candidateSelection || null)
      : { selectedCount: 0, totalCount: 0 };
    const state = importConfirmButtonState({
      hasMatchingPreview,
      selectedCount: summary.selectedCount,
      totalCount: summary.totalCount
    });
    button.disabled = state.disabled;
    button.textContent = state.label;
  }

  function rerenderImportResult() {
    if (!importState.lastResultPayload) return;
    renderResult($("importResult"), importState.lastResultPayload);
    updateImportConfirmButton();
  }

  function setImportResultFocus(reason) {
    importState.resultFocusReason = String(reason || "").trim();
    rerenderImportResult();
  }

  function applyCandidateSelection(action) {
    const preview = activeImportPreviewContext();
    if (!preview?.candidatePreview) return;
    const importRecordId = String(preview.importRecordId || "").trim();
    const next = selectedCandidateIdsForImportAction({
      action,
      candidatePreview: preview.candidatePreview,
      candidateSelection: preview.candidateSelection || null,
      originalityGuard: preview.originalityGuard || null,
      visibleOnly: true
    });
    importState.selectionImportRecordId = importRecordId;
    importState.selectedCandidateIds = next;
    rerenderImportResult();
  }

  return {
    candidateIdsForSelection,
    defaultSelectedCandidateIds,
    syncImportSelection,
    selectedCandidateIdsFor,
    selectionSummary,
    renderImportWritingActions,
    summarizeLiteratureBatchFromNotes,
    literatureBatchSummaryForPayload,
    renderWritingResultDetails,
    renderResult,
    showImportOperationResultModal,
    hideImportOperationResultModal,
    showImportResult,
    showExportResult,
    showWritingResult,
    syncWritingResultFromCurrentState,
    refreshImportLiteratureBatchSummary,
    enrichImportHistoryItemsWithLiteratureProgress,
    openImportedLiteratureQueue,
    openFirstImportedPermanentNote,
    addImportedPermanentNotesToWritingBasket,
    activeImportPreviewContext,
    updateImportConfirmButton,
    rerenderImportResult,
    setImportResultFocus,
    applyCandidateSelection
  };
}
