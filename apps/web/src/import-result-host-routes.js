export function createImportResultHostRoutes(depsProvider = () => ({})) {
  const deps = () => depsProvider() || {};
  const runtime = () => deps().importResultRuntime;
  const writingProjectRuntimeController = () => deps().writingProjectRuntimeController;

  return {
    activeImportPreviewContext: () => runtime().activeImportPreviewContext(),
    addImportedPermanentNotesToWritingBasket: (options = {}) => runtime().addImportedPermanentNotesToWritingBasket(options),
    applyCandidateSelection: (action) => runtime().applyCandidateSelection(action),
    candidateIdsForSelection: (candidatePreview, candidateSelection = null) => runtime().candidateIdsForSelection(candidatePreview, candidateSelection),
    createWritingProjectFromImportedPermanentNotes: () => writingProjectRuntimeController().createWritingProjectFromImportedPermanentNotes(),
    defaultSelectedCandidateIds: (candidatePreview, candidateSelection = null, originalityGuard = null) =>
      runtime().defaultSelectedCandidateIds(candidatePreview, candidateSelection, originalityGuard),
    enrichImportHistoryItemsWithLiteratureProgress: (items = []) => runtime().enrichImportHistoryItemsWithLiteratureProgress(items),
    hideImportOperationResultModal: () => runtime().hideImportOperationResultModal(),
    openFirstImportedPermanentNote: (noteId = "") => runtime().openFirstImportedPermanentNote(noteId),
    openImportedLiteratureQueue: () => runtime().openImportedLiteratureQueue(),
    refreshImportLiteratureBatchSummary: (payload = {}) => runtime().refreshImportLiteratureBatchSummary(payload),
    renderImportWritingActions: (payload = {}) => runtime().renderImportWritingActions(payload),
    renderResult: (el, payload) => runtime().renderResult(el, payload),
    renderWritingResultDetails: (data = {}) => runtime().renderWritingResultDetails(data),
    rerenderImportResult: () => runtime().rerenderImportResult(),
    selectedCandidateIdsFor: (candidatePreview, candidateSelection, importRecordId, selection = null) =>
      runtime().selectedCandidateIdsFor(candidatePreview, candidateSelection, importRecordId, selection),
    selectionSummary: (candidatePreview, importRecordId, selection = null, candidateSelection = null) =>
      runtime().selectionSummary(candidatePreview, importRecordId, selection, candidateSelection),
    setImportResultFocus: (reason) => runtime().setImportResultFocus(reason),
    showExportResult: (payload) => runtime().showExportResult(payload),
    showImportOperationResultModal: (mode = "import", title = "操作结果") => runtime().showImportOperationResultModal(mode, title),
    showImportResult: (payload) => runtime().showImportResult(payload),
    showWritingResult: (payload) => runtime().showWritingResult(payload),
    summarizeLiteratureBatchFromNotes: (notes = []) => runtime().summarizeLiteratureBatchFromNotes(notes),
    literatureBatchSummaryForPayload: (payload = {}) => runtime().literatureBatchSummaryForPayload(payload),
    syncImportSelection: (importRecordId, candidatePreview, candidateSelection = null, options = {}) =>
      runtime().syncImportSelection(importRecordId, candidatePreview, candidateSelection, options),
    syncWritingResultFromCurrentState: () => runtime().syncWritingResultFromCurrentState(),
    updateImportConfirmButton: () => runtime().updateImportConfirmButton()
  };
}
