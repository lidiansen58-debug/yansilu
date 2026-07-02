import { buildTodayOrganizingState } from "./today-organizing-model.js";
import { renderTodayOrganizingPanel } from "./today-organizing-panel.js";

export function createTodayOrganizingRuntime(depsProvider = () => ({})) {
  function currentState() {
    const { notes = [], relations = [], themeIndexes = [], relationsReady = false, typeFromFolder = () => "", relationNetworkStatusForNote = () => ({}) } = depsProvider() || {};
    return buildTodayOrganizingState({ notes, relations, themeIndexes, relationsReady }, { typeFromFolder, relationNetworkStatusForNote });
  }

  function render() {
    const { panel = null } = depsProvider() || {};
    if (panel) panel.innerHTML = renderTodayOrganizingPanel(currentState());
  }

  return { currentState, render };
}
