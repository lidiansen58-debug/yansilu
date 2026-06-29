export function installDistillationEventBindings(deps = {}) {
  const {
    $ = () => null,
    state = {},
    distillationState = {},
    openDistillationModule = async () => {},
    renderDistillationPanel = () => {},
    activateModule = () => {},
    openWritingModule = async () => {},
    handleStateChange = async () => {},
    renderAll = () => {},
    openDistillationQueueNote = async () => {}
  } = deps;

  $("distillationPanel")?.addEventListener("click", async (event) => {
    const refresh = event.target.closest("#btnDistillationRefresh");
    if (refresh) {
      await openDistillationModule();
      return;
    }
    const filterButton = event.target.closest("[data-distillation-filter]");
    if (filterButton) {
      distillationState.filter = String(filterButton.dataset.distillationFilter || "all").trim() || "all";
      renderDistillationPanel();
      return;
    }
    const actionButton = event.target.closest("[data-distillation-action]");
    if (actionButton) {
      const action = String(actionButton.dataset.distillationAction || "").trim();
      if (action === "open-writing") {
        activateModule("writing");
        await openWritingModule();
        return;
      }
      if (action === "create-permanent") {
        activateModule("explorer");
        state.browserRootId = "dir_original_default";
        state.selectedFolderId = "dir_original_default";
        await handleStateChange("create-note-in-selected-folder");
        renderAll();
        return;
      }
    }
    const noteButton = event.target.closest("[data-distillation-open-note]");
    if (!noteButton) return;
    await openDistillationQueueNote(noteButton.dataset.distillationOpenNote);
  });
}
