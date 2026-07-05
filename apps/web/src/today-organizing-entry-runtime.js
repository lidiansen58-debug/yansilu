import { createTodayOrganizingRuntime } from "./today-organizing-runtime.js";
import { installTodayOrganizingEvents } from "./today-organizing-events.js";

export function createTodayOrganizingEntryRuntime(depsProvider = () => ({})) {
  const runtime = createTodayOrganizingRuntime(() => {
    const {
      $ = () => null,
      state = {},
      graphState = {},
      writingState = {},
      importState = {},
      currentVaultPath = () => "",
      loadWritingThemeIndexes = null,
      typeFromFolder = () => "",
      relationNetworkStatusForNote = () => ({})
    } = depsProvider() || {};
    const organizingOverview =
      importState.lastResultPayload?.result?.organizingOverview ||
      importState.lastResultPayload?.importRecord?.confirmResult?.organizingOverview ||
      null;
    return {
      panel: $("todayOrganizingPanel"),
      notes: state.notes,
      relations: graphState.item?.edges || [],
      relationsReady: Boolean(graphState.item) || state.graphConnectivityReady === true,
      themeIndexes: writingState.themeIndexes,
      organizingOverview: Number(organizingOverview?.permanentCount || 0) > 0 ? organizingOverview : null,
      loadingThemeIndexes: writingState.loadingThemeIndexes,
      loadThemeIndexes: loadWritingThemeIndexes,
      themeLoadKey: `${currentVaultPath()}|${importState.importRecordId}|${importState.lastResultPayload?.stage || ""}`,
      typeFromFolder: (folderId) => typeFromFolder(state, folderId),
      relationNetworkStatusForNote
    };
  });

  function installEvents() {
    const {
      $ = () => null,
      handleStateChange,
      activateModule,
      openNoteById,
      openWritingModule,
      addWritingBasketIds,
      selectWritingThemeIndex,
      createReviewOutline,
      markTodayReturnTarget,
      applyWritingTab,
      setStatus
    } = depsProvider() || {};
    return installTodayOrganizingEvents($("todayOrganizingPanel"), () => ({
      todayState: runtime.currentState(),
      handleStateChange,
      activateModule,
      openNoteById,
      openWritingModule,
      addWritingBasketIds,
      selectWritingThemeIndex,
      createReviewOutline,
      markTodayReturnTarget,
      applyWritingTab,
      setStatus
    }));
  }

  return { runtime, installEvents };
}
