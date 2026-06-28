export function resolveWritingThemeSelectionForPanel(deps = {}) {
  const {
    writingState = {},
    selectedWritingThemeIndex = () => null,
    writingThemeIndexNoteIds = () => [],
    shouldHydrateWritingThemeNotes = () => false,
    hydrateWritingThemeNotes = () => {},
    shouldRefreshWritingThemeRelationCounts = () => false,
    refreshWritingThemeRelationCounts = () => {},
    clearWritingThemeRelationCounts = () => {}
  } = deps;

  const selectedTheme = selectedWritingThemeIndex();
  if (selectedTheme) {
    const selectedThemeNoteIds = writingThemeIndexNoteIds(selectedTheme);
    if (shouldHydrateWritingThemeNotes(selectedThemeNoteIds)) {
      void hydrateWritingThemeNotes(selectedThemeNoteIds);
    }
    if (shouldRefreshWritingThemeRelationCounts(selectedThemeNoteIds)) {
      void refreshWritingThemeRelationCounts(selectedThemeNoteIds);
    }
    return selectedTheme;
  }

  if (
    (Array.isArray(writingState.themeRelationNoteIds) && writingState.themeRelationNoteIds.length) ||
    Object.keys(writingState.themeRelationCounts || {}).length ||
    (Array.isArray(writingState.themeNoteDetailIds) && writingState.themeNoteDetailIds.length)
  ) {
    writingState.themeNoteDetailIds = [];
    writingState.loadingThemeNoteDetails = false;
    clearWritingThemeRelationCounts();
  }

  return null;
}
