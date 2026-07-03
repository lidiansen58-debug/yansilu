import { buildTodayOrganizingState } from "./today-organizing-model.js";
import { renderTodayOrganizingPanel } from "./today-organizing-panel.js";

export function createTodayOrganizingRuntime(depsProvider = () => ({})) {
  let loadingThemeIndexes = false;
  let themeIndexesLoadAttemptKey = "";

  function currentState() {
    const { notes = [], relations = [], themeIndexes = [], relationsReady = false, organizingOverview = null, reviewSuggestions = [], typeFromFolder = () => "", relationNetworkStatusForNote = () => ({}) } = depsProvider() || {};
    return buildTodayOrganizingState({ notes, relations, themeIndexes, relationsReady, organizingOverview, reviewSuggestions }, { typeFromFolder, relationNetworkStatusForNote });
  }

  function ensureThemeIndexesLoaded() {
    const {
      themeIndexes = [],
      loadingThemeIndexes: externalLoading = false,
      loadThemeIndexes = null,
      themeLoadKey = "default"
    } = depsProvider() || {};
    const cleanKey = String(themeLoadKey || "default").trim() || "default";
    if (themeIndexes.length || themeIndexesLoadAttemptKey === cleanKey || externalLoading || loadingThemeIndexes || typeof loadThemeIndexes !== "function") return;
    themeIndexesLoadAttemptKey = cleanKey;
    loadingThemeIndexes = true;
    let shouldRender = false;
    Promise.resolve(loadThemeIndexes())
      .then(() => {
        shouldRender = true;
      })
      .catch(() => {
        themeIndexesLoadAttemptKey = "";
      })
      .finally(() => {
        loadingThemeIndexes = false;
        const { panel = null } = depsProvider() || {};
        if (shouldRender && panel && !panel.classList?.contains?.("hidden")) render();
      });
  }

  function render() {
    const { panel = null } = depsProvider() || {};
    if (panel) panel.innerHTML = renderTodayOrganizingPanel(currentState());
    ensureThemeIndexesLoaded();
  }

  return { currentState, render, ensureThemeIndexesLoaded };
}
