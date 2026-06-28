import {
  buildWritingPanelHostDeps
} from "./writing-panel-deps.js";

export function buildWritingPanelPrototypeHostDeps(host = {}) {
  return {
    $: host.$,
    state: host.state,
    writingState: host.writingState,
    folderById: host.folderById,
    rootBoxIdFromFolder: host.rootBoxIdFromFolder,
    writingCandidateNotes: host.writingCandidateNotes,
    writingSourceIndexSummary: host.writingSourceIndexSummary,
    writingBasketEntries: host.writingBasketEntries,
    normalizeWritingBookStructure: host.normalizeWritingBookStructure,
    deriveWritingBookDesign: host.deriveWritingBookDesign,
    writingBookStructureStats: host.writingBookStructureStats,
    parseWritingBasketIds: host.parseWritingBasketIds,
    writingKnownNoteById: host.writingKnownNoteById,
    isWritingEligibleNote: host.isWritingEligibleNote,
    writingRelationCountsReady: host.writingRelationCountsReady,
    writingRelationCountsErrored: host.writingRelationCountsErrored,
    currentWritingBasketEligibility: host.currentWritingBasketEligibility,
    writingIneligibleSummary: host.writingIneligibleSummary,
    writingDraftDirectoryId: host.writingDraftDirectoryId,
    currentWritingContinuationEntry: host.currentWritingContinuationEntry,
    selectedWritingThemeIndex: host.selectedWritingThemeIndex,
    writingThemeIndexNoteIds: host.writingThemeIndexNoteIds,
    findExistingWritingProjectForTheme: host.findExistingWritingProjectForTheme,
    renderThinkingStatusBadge: host.renderThinkingStatusBadge,
    writingNoteMeta: host.writingNoteMeta,
    writingNoteExcerpt: host.writingNoteExcerpt,
    writingProjectStatusLabel: host.writingProjectStatusLabel,
    writingThemeProjectEntry: host.writingThemeProjectEntry,
    shouldHydrateWritingThemeNotes: host.shouldHydrateWritingThemeNotes,
    hydrateWritingThemeNotes: host.hydrateWritingThemeNotes,
    shouldRefreshWritingThemeRelationCounts: host.shouldRefreshWritingThemeRelationCounts,
    refreshWritingThemeRelationCounts: host.refreshWritingThemeRelationCounts,
    clearWritingThemeRelationCounts: host.clearWritingThemeRelationCounts,
    writingThemeDetailHintText: host.writingThemeDetailHintText,
    renderWritingToplineMetric: host.renderWritingToplineMetric,
    writingThemeSummary: host.writingThemeSummary,
    renderScaffoldVersionCard: host.renderScaffoldVersionCard,
    renderDraftVersionCard: host.renderDraftVersionCard,
    writingBookProjectGoal: host.writingBookProjectGoal,
    writingBookProjectAudience: host.writingBookProjectAudience,
    escapeHtml: host.escapeHtml
  };
}

export function createWritingPanelPrototypeHostProvider(hostProvider = () => ({})) {
  return () => buildWritingPanelHostDeps(buildWritingPanelPrototypeHostDeps(hostProvider()));
}
