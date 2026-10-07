import { handleImportResultDialogKey } from "./import-result-focus.js";
import { createImportMarkdownExportAction } from "./import-markdown-export-action.js";
import { changeImportPreviewPage } from "./import-candidate-pagination.js";

export function bindImportWorkspaceEventsForRuntime(deps = {}) {
  const {
    $ = () => null,
    importState = {},
    desktopCommands = {},
    importToolbarActions = {},
    normalizeImportWorkspaceTab = (value) => value,
    setImportWorkspaceTab = () => {},
    hideImportOperationResultModal = () => {},
    openFirstImportedPermanentNote = async () => {},
    openImportedLiteratureQueue = async () => {},
    addImportedPermanentNotesToWritingBasket = async () => {},
    createWritingProjectFromImportedPermanentNotes = async () => {},
    activateModule = () => {},
    setImportResultFocus = () => {},
    applyCandidateSelection = () => {},
    syncImportSelection = () => {},
    defaultSelectedCandidateIds = () => [],
    rerenderImportResult = () => {},
    preferredImportDirectoryId = (value) => value,
    directoryPathLabel = (value) => value,
    updateExportTargetHint = () => {},
    setStatus = () => {}
  } = deps;
  const mount = $("importPageMount");
  if (!mount) return [];
  // Settings can replace the mount; keep delegation on its stable document.
  const eventRoot = mount.ownerDocument || mount;
  const handleExportMarkdown = createImportMarkdownExportAction(deps);

  const clickHandler = (event) => {
    if (eventRoot !== mount && !event.target?.closest?.("#importPageMount")) return;
    if (event.target?.closest?.("#btnCloseImportOperationResult") || event.target?.closest?.("[data-import-dismiss]") || event.target?.id === "importOperationResultModal") {
      hideImportOperationResultModal();
      return;
    }
    const tabButton = event.target?.closest?.(".import-workspace-tab[data-import-workspace-tab]");
    if (tabButton) {
      const nextTab = normalizeImportWorkspaceTab(tabButton.getAttribute("data-import-workspace-tab"));
      if (nextTab !== importState.activeTab) {
        setImportWorkspaceTab(nextTab);
        setStatus(`已切换到${nextTab === "export" ? "导出" : "导入"}界面`, "ok");
      }
      return;
    }
    const importWritingButton = event.target?.closest?.("[data-import-writing-action]");
    if (importWritingButton) {
      const action = String(importWritingButton.getAttribute("data-import-writing-action") || "").trim();
      if (action === "open-first-isolated-note") {
        void openFirstImportedPermanentNote(importWritingButton.getAttribute("data-note-id") || "");
      } else if (action === "open-today") {
        hideImportOperationResultModal();
        activateModule("today");
        setStatus("已打开首页", "ok");
      } else if (action === "open-literature-queue") void openImportedLiteratureQueue();
      else if (action === "add-permanent-notes" || action === "add-permanent-notes-open-writing") {
        void addImportedPermanentNotesToWritingBasket({ openWriting: action === "add-permanent-notes-open-writing" });
      } else if (action === "create-writing-project") {
        void createWritingProjectFromImportedPermanentNotes();
      }
      return;
    }
    const clearFocusButton = event.target?.closest?.("[data-clear-candidate-focus]");
    if (clearFocusButton) return setImportResultFocus("");
    const skipFocusButton = event.target?.closest?.("[data-skip-focus]");
    if (skipFocusButton) {
      const nextReason = String(skipFocusButton.getAttribute("data-skip-focus") || "").trim();
      setImportResultFocus(importState.resultFocusReason === nextReason ? "" : nextReason);
      return;
    }
    const filterButton = event.target?.closest?.("[data-candidate-filter]");
    if (filterButton) {
      const nextReason = String(filterButton.getAttribute("data-candidate-filter") || "").trim();
      setImportResultFocus(importState.resultFocusReason === nextReason ? "" : nextReason);
      return;
    }
    const actionButton = event.target?.closest?.("[data-candidate-action]");
    if (actionButton) return applyCandidateSelection(String(actionButton.getAttribute("data-candidate-action") || ""));
    const pageButton = event.target?.closest?.("[data-candidate-page]");
    if (pageButton && !pageButton.disabled) {
      changeImportPreviewPage(importState, pageButton.getAttribute("data-candidate-page"));
      return rerenderImportResult();
    }
    if (event.target?.closest?.("#btnImportPreview") || event.target?.closest?.("#btnImportRepreview")) {
      setImportWorkspaceTab("import");
      void importToolbarActions.handlePreview?.({ restart: Boolean(event.target?.closest?.("#btnImportRepreview")) });
      return;
    }
    if (event.target?.closest?.("#btnBrowseImportPath")) {
      void (async () => {
        const picked = await desktopCommands.browseDirectory?.({ defaultPath: $("importPath")?.value || "", purpose: "导入目录" });
        if (!picked?.path) return;
        $("importPath").value = picked.path;
        deps.checkpointImportWorkspace?.();
        setStatus(`已选择导入目录：${picked.source || picked.path}`, "ok");
      })();
      return;
    }
    if (event.target?.closest?.("#btnImportConfirm")) {
      setImportWorkspaceTab("import");
      void importToolbarActions.handleConfirm?.();
      return;
    }
    if (event.target?.closest?.("#btnExportMarkdown")) {
      setImportWorkspaceTab("export");
      void handleExportMarkdown();
      return;
    }
    if (event.target?.closest?.("#btnBrowseExportPath")) {
      void (async () => {
        const picked = await desktopCommands.browseDirectory?.({ defaultPath: $("exportTargetPath")?.value || "", purpose: "导出目录" });
        if (!picked?.path) return;
        $("exportTargetPath").value = picked.path;
        $("exportAdvanced")?.setAttribute("open", "open");
        updateExportTargetHint();
        setStatus("已选择导出目录", "ok");
      })();
    }
  };

  const changeHandler = (event) => {
    if (eventRoot !== mount && !event.target?.closest?.("#importPageMount")) return;
    const pageSelect = event.target?.closest?.("[data-candidate-page-select]");
    if (pageSelect) {
      changeImportPreviewPage(importState, pageSelect.value);
      return rerenderImportResult();
    }
    const checkbox = event.target?.closest?.(".candidate-checkbox");
    if (checkbox) {
      const candidateId = String(checkbox.getAttribute("data-candidate-id") || "").trim();
      const importRecordId = String(importState.lastPreview?.importRecordId || "").trim();
      if (!candidateId || !importRecordId) return;
      if (importState.selectionImportRecordId !== importRecordId) {
        syncImportSelection(importRecordId, importState.lastPreview?.candidatePreview, importState.lastPreview?.candidateSelection || null, {
          selectedIds: defaultSelectedCandidateIds(
            importState.lastPreview?.candidatePreview,
            importState.lastPreview?.candidateSelection || null,
            importState.lastPreview?.originalityGuard || null
          )
        });
      }
      if (checkbox.checked) importState.selectedCandidateIds.add(candidateId);
      else importState.selectedCandidateIds.delete(candidateId);
      rerenderImportResult();
      return;
    }
    if (event.target?.closest?.("#importDirectoryId")) {
      importState.directoryId = preferredImportDirectoryId(String(event.target?.value || "").trim());
      setStatus(`导入目录已切换到 ${directoryPathLabel(importState.directoryId)}`, "ok");
      return;
    }
    if (event.target?.closest?.("#exportDirectoryId") || event.target?.closest?.("#exportTargetPath")) updateExportTargetHint();
  };

  eventRoot.addEventListener("click", clickHandler);
  eventRoot.addEventListener("change", changeHandler);
  eventRoot.addEventListener("input", event => {
    if (event.target?.id === "exportTargetPath") updateExportTargetHint();
    if (["importPath", "importPayload", "importOptions"].includes(event.target?.id)) deps.checkpointImportWorkspace?.();
  });
  eventRoot.addEventListener("keydown", event => handleImportResultDialogKey(event, $("importOperationResultModal"), hideImportOperationResultModal), true);
  return [
    { target: "importPageMount", eventName: "click", installed: true },
    { target: "importPageMount", eventName: "change", installed: true },
    { target: "importPageMount", eventName: "input", installed: true },
    { target: "importPageMount", eventName: "keydown", installed: true }
  ];
}
