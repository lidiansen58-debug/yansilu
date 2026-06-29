import {
  childFolders,
  createInitialState,
  folderById,
  joinFsPath,
  parseLinks,
  notesInFolder,
  parseTags,
  rootBoxIdFromFolder,
  typeFromFolder,
  uid
} from "./prototype-store.js";
import { ContextMenu } from "./components-context-menu.js";
import { CreateBoxDialog } from "./components-create-box-dialog.js";
import { PermanentNoteDialog } from "./components-permanent-note-dialog.js";
import { createDesktopFileCommandService } from "./desktop-file-command-service.js";
import { ExplorerPane, explorerNewNoteButtonCopy, resolveExplorerNewNoteFolderId } from "./components-explorer-pane.js";
import {
  deriveLiteratureSectionLabelsFromTemplate,
  EditorPane,
  normalizeFieldText,
  parseLiteratureWorkspace,
  validateLiteratureTemplateSource
} from "./components-editor-pane.js";
import {
  renderImportPageMount
} from "./import-page-mount.js";
import {
  importConfirmButtonState,
  preferredImportDirectoryIdFromOptions
} from "./import-toolbar-model.js";
import {
  createImportToolbarActions,
} from "./import-toolbar-actions.js";
import {
  renderImportToolbarMount
} from "./import-toolbar-mount.js";
import {
  createImportWorkspaceShellController
} from "./import-workspace-shell.js";
import {
  renderImportResultMount
} from "./import-result-mount.js";
import {
  renderDistillationPanelView
} from "./distillation-panel-view.js";
import {
  syncRailSelectionDom
} from "./app-shell-rail.js";
import {
  editorSelectionAiActionElements
} from "./app-shell-editor-elements.js";
import {
  createEditorPaneHostDeps
} from "./editor-host-deps.js";
import {
  editorHelperNoteType,
  editorHelperShouldHide
} from "./editor-helper-model.js";
import {
  createRenderAppShellController
} from "./app-shell-render-all.js";
import {
  createRenderAppShellPrototypeDepsProvider
} from "./app-shell-render-all-host-deps.js";
import {
  buildWorkspaceStatusHintModel
} from "./workspace-status-hint-model.js";
import {
  currentModuleSidebarUi,
  syncModuleChromeClassesForRuntime
} from "./app-shell-module-ui.js";
import {
  renderModuleWorkspaceHeaderForRuntime
} from "./app-shell-module-header.js";
import {
  createSidebarTitleController
} from "./app-shell-sidebar-controller.js";
import {
  createSidebarTitlePrototypeDepsProvider
} from "./app-shell-sidebar-host-deps.js";
import {
  installSidebarFlowEventHandler,
  renderExplorerSidebarFlowForRuntime
} from "./app-shell-sidebar-flow.js";
import {
  createAppShellStateChangePrototypeDepsProvider
} from "./app-shell-state-change-host-deps.js";
import {
  handleCreateDirectoryFromDialog
} from "./app-shell-state-file-actions.js";
import {
  routeAppShellStateChange
} from "./app-shell-state-change-router.js";
import {
  bootstrapAppForRuntime
} from "./app-startup-controller.js";
import {
  candidatePreviewItemIds,
  candidatePreviewItems,
  confirmSkipReasonMap,
  confirmSkippedCandidateIds,
  selectionSummary as summarizeCandidateSelection
} from "./import-candidate-preview-model.js";
import {
  renderCandidatePreview,
  renderConfirmSkipBreakdown
} from "./import-candidate-preview-panel.js";
import {
  selectedCandidateIdsForImportAction
} from "./import-selection-actions.js";
import {
  candidateIdsForSelection as computeCandidateIdsForSelection,
  candidatePreviewFromPayload,
  candidateSelectionFromPayload,
  createdNoteIdsByTypeFromImportPayload,
  createdNoteIdsByTypeFromImportRecord,
  defaultSelectedCandidateIds as computeDefaultSelectedCandidateIds,
  importPayloadRecordId,
  literatureBatchSummaryForPayload as computeLiteratureBatchSummaryForPayload,
  renderImportWritingActions as renderImportWritingActionsHtml,
  renderWritingResultDetails as renderWritingResultDetailsHtml,
  selectedCandidateIdsForImportState,
  selectionSummaryForImportState,
  summarizeLiteratureBatchFromNotes as computeSummarizeLiteratureBatchFromNotes,
  syncImportSelectionState
} from "./prototype-import-result-helpers.js";
import {
  literatureQueueLaneForNote as computeLiteratureQueueLaneForNote,
  preferredLiteratureQueueNoteId as computePreferredLiteratureQueueNoteId,
  rankedLiteratureQueueNotes as computeRankedLiteratureQueueNotes
} from "./prototype-literature-queue.js";
import {
  normalizeAuthorshipItem,
  normalizeThinkingStatusItem,
  renderThinkingStatusBadge as renderThinkingStatusBadgeHtml,
  uniqueStrings
} from "./prototype-thinking-status.js";
import {
  createLocalDraftNote as computeCreateLocalDraftNote,
  deriveWritingProjectIntent,
  deriveWritingProjectTakeaway,
  directoryPathLabel as computeDirectoryPathLabel,
  displayFolderName,
  distillationReasonOf,
  distillationStageLabel,
  distillationStageOf,
  distillationStatusLabel,
  distillationStatusOf,
  mapDirectoryItem,
  moduleLabel,
  mapNoteItem as computeMapNoteItem,
  noteMatchesSearchQuery,
  noteTypeLabel,
  saveAiSuggestionKey,
  sourceNoteTypeLabel,
  writingProjectStatusLabel
} from "./prototype-note-state-helpers.js";
import {
  createNoteRuntimeController
} from "./note-runtime-controller.js";
import { basenameLocalPath, dirnameLocalPath, joinLocalPath } from "./desktop-file-adapter.js";
import {
  aiInboxFeedbackFromWorkspace,
  aiInboxFiltersFromWorkspace,
  bindAiInboxWorkspaceEvents,
  renderAiInboxWorkspaceView
} from "./ai-inbox-workspace.js";
import {
  createAiInboxWorkspaceHostDeps
} from "./ai-inbox-host-deps.js";
import {
  dismissSaveAiSuggestionForLater,
  saveAiSuggestionForNoteModel,
  saveAiSuggestionPrimaryRoute
} from "./save-ai-suggestion-model.js";
import {
  aiSuggestionFiltersFromWorkspace,
  aiSuggestionReviewedContentFromWorkspace,
  bindAiSuggestionsWorkspaceEvents,
  renderAiSuggestionsWorkspaceView
} from "./ai-suggestions-workspace.js";
import {
  createAiSuggestionsWorkspaceHostDeps
} from "./ai-suggestions-host-deps.js";
import {
  applyAiRuntimeModeChangeForRuntime
} from "./ai-runtime-mode-controller.js";
import {
  aiInboxActionLabel,
  aiArtifactFromCanonical,
  aiInboxItemFromCanonical,
  normalizeAiInboxFilters
} from "./ai-inbox-model.js";
import {
  aiInboxFiltersForSystemMessage,
  globalPendingAiInboxFilters,
  markSystemMessageRead,
  normalizeSystemMessage,
  noteAnalysisSystemMessageForResult,
  scheduledTaskSystemMessageForArtifacts,
  systemMessageSubjectText,
  upsertSystemMessageList
} from "./prototype-system-messages.js";
import {
  systemMessageActionRoute
} from "./system-message-route-model.js";
import {
  createSystemMessagesShellController
} from "./system-messages-shell.js";
import {
  persistSystemMessagesForRuntime,
  readStoredSystemMessagesForRuntime
} from "./system-message-storage.js";
import {
  createSystemMessagesPrototypeHostProvider
} from "./system-messages-host-deps.js";
import {
  addSystemMessageForRuntime,
  markSystemMessagesReadForRuntime,
  resolveSystemMessageByDedupeKeyForRuntime,
  upsertSystemMessageForRuntime
} from "./system-messages-runtime-controller.js";
import {
  handleSystemMessageEscapeKey,
  installSystemMessageEventHandlers
} from "./system-message-events.js";
import {
  createSystemMessagePrototypeDepsProviders
} from "./system-message-deps.js";
import {
  createWorkflowReminderController
} from "./workflow-reminder-controller.js";
import {
  createRecordPermanentWorkflowOpener,
  createSystemMessageWorkflowOpener
} from "./prototype-system-message-workflow.js";
import {
  aiInboxDecisionFailedStatusMessage,
  aiInboxDecisionSucceededStatusMessage,
  aiInboxFieldSuggestionDraftAlreadyAppliedNotice,
  aiInboxFieldSuggestionDraftAlreadyAppliedStatusMessage,
  aiInboxFieldSuggestionDraftFailedStatusMessage,
  aiInboxFieldSuggestionDraftSucceededStatusMessage,
  aiInboxInFlightReviewActionNotice,
  aiInboxInFlightReviewActionStatusMessage,
  aiInboxLinkAcceptFailedStatusMessage,
  aiInboxLinkAcceptedStatusMessage,
  aiInboxLinkAlreadyAppliedNotice,
  aiInboxLinkAlreadyAppliedStatusMessage,
  aiInboxNotePromotionAlreadyAppliedNotice,
  aiInboxNotePromotionAlreadyAppliedStatusMessage,
  aiInboxNotePromotionFailedStatusMessage,
  aiInboxNotePromotionSucceededStatusMessage,
  aiInboxReviewRetryNotice,
  aiInboxReviewRetryStatusMessage,
  aiInboxReviewSafetyNotice,
  aiInboxReviewSafetyStatusMessage,
  aiInboxSuggestionAlreadyAppliedNotice,
  aiInboxSuggestionAlreadyAppliedStatusMessage,
  aiInboxSuggestionUpdateFailedStatusMessage,
  aiInboxSuggestionUpdatedStatusMessage
} from "./prototype-ai-inbox-messages.js";
import {
  SETTINGS_DETAIL_ITEMS,
  SETTINGS_SECTIONS,
  formatSettingsUserError as computeFormatSettingsUserError,
  normalizeSettingsItem,
  normalizeSettingsSection,
  settingsDetailItemConfig,
  settingsItemSummary as computeSettingsItemSummary,
  settingsMobileItemOptionsHtml as renderSettingsMobileItemOptionsHtml,
  settingsModuleHeaderCopy as computeSettingsModuleHeaderCopy,
  settingsSectionChromeMap as computeSettingsSectionChromeMap,
  settingsSectionConfig,
  settingsSectionGuidanceMap as computeSettingsSectionGuidanceMap,
  settingsSidebarNavigationHtml as renderSettingsSidebarNavigationHtml
} from "./prototype-settings-navigation.js";
import {
  LITERATURE_TEMPLATE_SETTINGS_FIELDS,
  NOTE_TEMPLATE_STORAGE_KEYS,
  PERMANENT_TEMPLATE_SETTINGS_FIELDS,
  applyTitleToNoteTemplate as computeApplyTitleToNoteTemplate,
  composePermanentTemplateDraft as computeComposePermanentTemplateDraft,
  defaultLiteratureTemplateSource as computeDefaultLiteratureTemplateSource,
  defaultPermanentTemplateSource as computeDefaultPermanentTemplateSource,
  defaultTemplateSourceForKind as computeDefaultTemplateSourceForKind,
  legacyPermanentTemplateSource as computeLegacyPermanentTemplateSource,
  mergeTemplateFieldText as computeMergeTemplateFieldText,
  normalizeDraftBuffer as computeNormalizeDraftBuffer,
  normalizeNoteTemplateHistory as computeNormalizeNoteTemplateHistory,
  normalizeNoteTemplateSource as computeNormalizeNoteTemplateSource,
  normalizeStoredNoteTemplateSource as computeNormalizeStoredNoteTemplateSource,
  noteTemplateHistoryWithPrevious as computeNoteTemplateHistoryWithPrevious
} from "./prototype-note-templates.js";
import {
  aiSuggestionDetailFromResponse as suggestionDetailFromResponse,
  aiSuggestionFromCanonical,
  aiSuggestionStatusLabel,
  aiSuggestionReviewEventFromCanonical as suggestionReviewEventFromCanonical,
  aiSuggestionTraceFromCanonical as suggestionTraceFromCanonical,
  normalizeAiSuggestionFilters
} from "./ai-suggestions-model.js";
import {
  applyAiSuggestionStatusForRuntime,
  loadAiSuggestionDetailForRuntime,
  refreshAiSuggestionsForRuntime
} from "./ai-suggestions-runtime-controller.js";
import {
  acceptAiInboxLinkSuggestionForRuntime,
  adoptAiInboxFieldSuggestionDraftForRuntime,
  applyAiInboxRecommendedActionForRuntime,
  applyAiInboxSuggestionStatusForRuntime,
  finalizeAiInboxActionRefreshForRuntime,
  loadAiInboxDetailForRuntime,
  promoteAiInboxArtifactToNoteForRuntime,
  recordAiInboxReviewDecisionForRuntime,
  refreshAiInboxEvaluationSummaryForRuntime,
  refreshAiInboxForRuntime,
  runAiInboxSummaryForRuntime
} from "./ai-inbox-runtime-controller.js";
import {
  renderScheduledTasksPanel
} from "./scheduled-tasks-panel.js";
import {
  mountSettingsAutomationWorkspace
} from "./settings-automation-workspace.js";
import {
  renderSettingsAutomationRunHistory
} from "./settings-automation-run-history.js";
import {
  graphFocusCardActionMeta as computeGraphFocusCardActionMeta,
  graphIsolatedNodeIds,
  graphFollowupActionForRelationType,
  graphNextActionForSummary,
  graphSelectEdgeActionAttrs as computeGraphSelectEdgeActionAttrs,
  graphWritingCandidateNoteIds,
  graphWritingContinuationInput
} from "./graph-followup.js";
import {
  createGraphFollowupController
} from "./graph-followup-controller.js";
import {
  clearGraphIsolatedRelationDraftForState
} from "./graph-relation-drafts.js";
import {
  createGraphIsolatedRelationController
} from "./graph-isolated-relation-controller.js";
import {
  createGraphIsolatedDecisionController
} from "./graph-isolated-decision-controller.js";
import {
  createGraphRelationSaveController
} from "./graph-relation-save-controller.js";
import {
  createGraphRelationWorkflowController,
  graphNormalizeRelationWorkflowSelection
} from "./graph-relation-workflow-controller.js";
import {
  createGraphIsolatedWorkflowShellRenderer
} from "./graph-isolated-workflow-shell.js";
import {
  graphBlockedAiRelationPairKeysForNote as computeGraphBlockedAiRelationPairKeysForNote,
  graphCandidateBlocksFormalRelation as computeGraphCandidateBlocksFormalRelation,
  graphCandidateCanSaveRelation as computeGraphCandidateCanSaveRelation,
  graphCandidateCountKey as computeGraphCandidateCountKey,
  graphCandidateEndpointIds as computeGraphCandidateEndpointIds,
  graphCandidatePercent as computeGraphCandidatePercent,
  graphCandidateUndirectedPairKey as computeGraphCandidateUndirectedPairKey,
  graphAiRelationCandidatesForNote as computeGraphAiRelationCandidatesForNote,
  graphDecoratePotentialRelationCandidate as computeGraphDecoratePotentialRelationCandidate,
  graphMergeRelationCandidatesForDisplay as computeGraphMergeRelationCandidatesForDisplay,
  graphPendingAiCandidateCount as computeGraphPendingAiCandidateCount,
  graphPotentialRelationActionEndpoints as computeGraphPotentialRelationActionEndpoints,
  graphPotentialRelationEvidenceText as computeGraphPotentialRelationEvidenceText,
  graphPotentialRelationRationaleDraft as computeGraphPotentialRelationRationaleDraft,
  graphPreferredPotentialRelationType as computeGraphPreferredPotentialRelationType,
  graphRelationCandidateKey as computeGraphRelationCandidateKey,
  graphRelationRationaleIsActionable as computeGraphRelationRationaleIsActionable,
} from "./graph-ai-candidates.js";
import {
  createGraphAiConnectRuntimeController
} from "./graph-ai-connect-runtime-controller.js";
import {
  graphDirectNetworkEdgeCount as computeGraphDirectNetworkEdgeCount,
  graphExistingRelationKeys as computeGraphExistingRelationKeys,
  graphExistingRelationPairKeys as computeGraphExistingRelationPairKeys,
  graphRelationPairKey as computeGraphRelationPairKey,
  graphRelationSaveResultForNote,
  graphRelationStatusCountsAsNetworkEdge as computeGraphRelationStatusCountsAsNetworkEdge,
  graphRelationStatusKey as computeGraphRelationStatusKey
} from "./graph-relation-state-query.js";
import {
  graphComputedIsolatedNotesForGraph,
  graphIsolatedQueueItemsForGraph,
  graphMarkIsolatedNodesForGraph,
  graphNextIsolatedQueueItem as computeGraphNextIsolatedQueueItem,
  graphNoteIdFromIsolatedItem as computeGraphNoteIdFromIsolatedItem
} from "./graph-isolated-queue.js";
import {
  graphFullNoteByIdFromSources,
  graphIsolatedPreviewTargetForNote,
  graphLocalRelationCandidatesForNote as computeGraphLocalRelationCandidatesForNote,
  graphManualRelationTargetsForNote as computeGraphManualRelationTargetsForNote,
  graphNotePreviewTextForLocalRelation,
  graphNoteTagsForLocalRelation,
  graphTitleCharacterOverlap as computeGraphTitleCharacterOverlap
} from "./graph-local-relations.js";
import {
  renderGraphIsolatedJoinNetworkFlowHtml
} from "./graph-isolated-relation-workspace.js";
import {
  renderGraphIsolatedNextStepActionsHtml
} from "./graph-isolated-next-step.js";
import {
  graphThemeCandidateNoteIdsForNode as computeGraphThemeCandidateNoteIdsForNode,
  renderGraphRelationWorkspaceForNote as renderGraphRelationWorkspaceMarkup,
  renderGraphThemeIndexWorkspace as renderGraphThemeIndexWorkspaceMarkup
} from "./prototype-graph-workspace.js";
import {
  renderGraphResearchNavigatorEntryView,
  renderGraphThinkingItemsView,
  renderGraphThinkingPanelContentView,
  renderGraphThinkingPanelView,
  renderGraphThinkingReviewNoteView,
  renderGraphWorkbenchEntryPillsView,
  renderGraphWorkbenchPanelView,
  renderGraphWorkbenchPriorityQueueView
} from "./graph-workbench-panel.js";
import {
  graphRelationQualityLabel,
  graphRelationReviewReasonLabel,
  renderGraphUtilityDrawerView,
  renderRelationReviewQueueSectionView
} from "./graph-review-surface-view.js";
import {
  applyGraphEmptyCloseInteraction,
  applyGraphSectionOpenState,
  applyGraphThinkingFilterInteraction,
  applyGraphThinkingHideInteraction,
  applyGraphThinkingToggleInteraction,
  applyGraphThinkingVisibilityInteraction,
  applyGraphUtilityDrawerCloseInteraction,
  applyGraphUtilityDrawerOpenState,
  applyGraphUtilityVisibilityInteraction,
  applyGraphWorkbenchCloseInteraction,
  applyGraphWorkbenchEntryInteraction,
  applyGraphWorkbenchTabInteraction
} from "./graph-workspace-interaction-controller.js";
import {
  buildGraphQuestionSpotSummaryForGraph,
  buildGraphQuestionSpotSummaryFromItems as computeGraphQuestionSpotSummaryFromItems,
  buildGraphThinkingItemsForGraph,
  graphAiAnalysisSummaryStateForGraph,
  graphLiveAiAnalysisCountsForGraph,
  graphThinkingCleanIds as computeGraphThinkingCleanIds,
  graphThinkingNoteTitle as computeGraphThinkingNoteTitle
} from "./graph-thinking-items-model.js";
import {
  applyGraphEdgeHoverDomState,
  applyGraphNodeHoverDomState,
  applyGraphThinkingHoverDomState,
  graphThinkingHighlightAttrsForItem,
  resetGraphHoverDomState
} from "./graph-thinking-hover-controller.js";
import {
  renderGraphPromptDetailsView,
  renderGraphSelectionMetricsView,
  renderGraphSelectionShellView,
  renderGraphSelectionTaskView
} from "./graph-selection-panel.js";
import {
  renderGraphClusterSelectionPanelView
} from "./graph-cluster-selection-panel.js";
import {
  createGraphSelectionPanelRenderer
} from "./graph-selection-panel-renderer.js";
import {
  buildGraphWorkspaceRenderDeps,
  createGraphThinkingModelRuntimeDepsProvider
} from "./graph-workspace-host-deps.js";
import {
  graphFocusContextCollapsedState,
  graphFocusContextCollapsedStatus,
  graphFocusHelpOpenState,
  graphFocusHelpStatus,
  renderGraphFocusContextPanel as renderGraphFocusContextPanelView
} from "./graph-focus-context-panel.js";
import {
  GRAPH_FOCUS_CONTEXT_MODE_KEY,
  GRAPH_FOCUS_DEPTH_KEY,
  graphFocusContextModeMeta,
  graphFocusDepthMeta,
  normalizeGraphFocusContextMode,
  normalizeGraphFocusDepth,
  setGraphFocusContextModeForRuntime,
  setGraphFocusDepthForRuntime
} from "./graph-focus-controls-state.js";
import {
  yijingRichDemoPostImportPlan
} from "./graph-demo-presentation-state.js";
import {
  createGraphPresentationController
} from "./graph-presentation-controller.js";
import {
  graphClusterResearchMeta as computeGraphClusterResearchMeta,
  graphResearchNavigatorState as computeGraphResearchNavigatorState,
  graphUniqueClusterMeta as computeGraphUniqueClusterMeta,
  renderGraphResearchNavigatorPanelView
} from "./graph-research-navigator.js";
import {
  buildGraphPanelState
} from "./graph-panel-state-builder.js";
import {
  renderGraphPanelShell
} from "./graph-panel-shell.js";
import {
  createGraphPanelPrototypeRuntimeDepsProvider
} from "./graph-panel-host-deps.js";
import {
  renderGraphPanelForRuntime
} from "./graph-panel-renderer.js";
import {
  renderGraphIconView
} from "./graph-icon-view.js";
import {
  graphFilterOptionsForRuntime
} from "./graph-filter-options-view.js";
import {
  renderGraphMapPreviewView
} from "./graph-map-preview-view.js";
import {
  refreshDirectoryGraphForRuntime
} from "./graph-refresh-controller.js";
import {
  createGraphVisualMapController
} from "./graph-visual-map-controller.js";
import {
  createGraphVisualMapPrototypeDepsProvider
} from "./graph-visual-map-host-deps.js";
import {
  bindGraphCanvasEvents
} from "./graph-canvas-event-router.js";
import {
  graphBuildVisualLayout as graphBuildVisualLayoutForRuntime
} from "./graph-visual-layout.js";
import {
  createGraphViewportController
} from "./graph-viewport-controller.js";
import {
  createGraphUtilityDrawerController
} from "./graph-utility-drawer-controller.js";
import {
  GRAPH_VISUAL_ZOOM_OPTIONS,
  graphZoomOption,
  graphZoomStep
} from "./graph-visual-zoom-model.js";
import {
  applyGraphFocusContextModeInteraction,
  applyGraphFocusDepthInteraction,
  applyGraphReadingLensInteraction,
  applyGraphRelationTypeFilterInteraction,
  applyGraphViewModeInteraction,
  applyGraphWheelZoomInteraction,
  applyGraphZoomOptionInteraction,
  applyGraphZoomStepInteraction
} from "./graph-toolbar-interaction-controller.js";
import {
  renderGraphClusterGlowView,
  renderGraphNebulaFieldView,
  renderGraphStarfieldView
} from "./graph-visual-map-view.js";
import {
  graphReadingLensMeta as computeGraphReadingLensMeta,
  renderGraphReadingLensControls as renderGraphReadingLensControlsView
} from "./graph-reading-lens-controls.js";
import {
  createGraphReadingLensStateController
} from "./graph-reading-lens-state.js";
import {
  GRAPH_INDEX_RELATION_TYPES,
  GRAPH_LINK_CLUE_RELATION_TYPES,
  GRAPH_MEANINGFUL_RELATION_TYPES,
  GRAPH_RELATION_TYPE_FILTER_KEY,
  graphHasMeaningfulStructureEdges,
  graphReadingModeMeta,
  graphStructureFallbackEdges as graphStructureFallbackEdgesForRuntime,
  graphViewModeForRelationType,
  normalizeGraphRelationTypeFilter,
  renderGraphRelationTypeFilter as renderGraphRelationTypeFilterForRuntime,
  renderGraphViewModeSwitcher as renderGraphViewModeSwitcherForRuntime,
  setGraphRelationTypeFilterForRuntime
} from "./graph-view-mode-state.js";
import {
  GRAPH_RELATION_GROUP_META,
  GRAPH_RELATION_MARKER_COLORS,
  graphEdgeSelectionKey,
  graphRelationGroupMeta,
  graphRelationVisual
} from "./graph-relation-visual-state.js";
import {
  graphDenseGalaxyMode,
  graphEdgePath as graphEdgePathForRuntime,
  graphEdgeShouldRender as graphEdgeShouldRenderForRuntime,
  graphEdgeVisibleAtFit as graphEdgeVisibleAtFitForRuntime,
  graphHash,
  graphNodeAttentionReasons,
  graphNodeRadiusByTier,
  graphNodeShowsAsPoint,
  graphNodeStarRank,
  graphNodeStarTier,
  graphShortTitle,
  graphThemeBoundaryMeta as graphThemeBoundaryMetaForRuntime,
  renderGraphThemeBoundary as renderGraphThemeBoundaryForRuntime
} from "./graph-visual-geometry.js";
import {
  graphBridgeSelectionKey,
  graphIsolatedSelectionKey,
  graphNodeClass,
  graphThemeNoteIds,
  graphThemeSelectionKey
} from "./graph-visual-selection-state.js";
import {
  graphBuildFocusedRelationTypeStatsForRuntime,
  graphFocusedItemsForRuntime,
  graphLoadedScopeCoversDirectoryForRuntime,
  graphScopedItemsForRuntime,
  graphScopeDirectoryIdForRuntime
} from "./graph-scope-state.js";
import {
  renderDraftVersionCardView,
  renderScaffoldVersionCardView,
  renderWritingToplineMetricView
} from "./writing-workspace-view.js";
import {
  titleFromBody
} from "./editor-template-workspace.js";
import {
  createWritingPanelShellController
} from "./writing-panel-shell.js";
import {
  createWritingPanelPrototypeHostProvider
} from "./writing-panel-host-deps.js";
import {
  installWritingPanelBasketEventHandlers,
  installWritingThemeIndexEventHandlers,
  installWritingThemeDetailEventHandlers,
  installWritingProjectListEventHandlers,
  installWritingProjectHistoryEventHandlers,
  installWritingDraftActionEventHandlers
} from "./writing-panel-events.js";
import {
  writingCandidateNotesForRuntime,
  writingScopeDirectoryIdsForRuntime
} from "./writing-candidate-state.js";
import {
  addWritingBasketIdsForRuntime,
  clearWritingBasketForRuntime,
  parseWritingBasketIdsForRuntime,
  removeWritingBasketIdForRuntime,
  setWritingBasketIdsForRuntime
} from "./writing-basket-state.js";
import {
  writingBasketContinuationPlan,
  writingProjectContinuationRoute
} from "./writing-entry-route-model.js";
import {
  clearWritingFocusedCandidateScopeForRuntime,
  clearWritingSourceIndexIdsForRuntime,
  clearWritingThemeRelationCountsForRuntime,
  resetWritingStrongModelStateForRuntime,
  setWritingFocusedCandidateScopeForRuntime,
  setWritingSourceIndexIdsForRuntime
} from "./writing-session-state.js";
import {
  sameUniqueStringSetForRuntime,
  selectedWritingThemeIndexForRuntime,
  setSelectedWritingThemeIndexForRuntime,
  writingThemeIndexByIdForRuntime,
  writingThemeIndexScopeDirectoryIdForRuntime,
  writingThemeIndexNoteIdsForRuntime
} from "./writing-theme-state.js";
import {
  graphAssociateNoteRoute,
  graphFollowupActionRoute,
  noteDeleteKeyRoute
} from "./note-browser-action-router.js";
import {
  generatedOriginalNoteIdFromBody,
  isPersistableRelationNetworkStatus,
  notePersistenceFieldsForSave,
  stripGeneratedOriginalMarker,
  withGeneratedOriginalMarker,
  withGeneratedOriginalReference
} from "./note-persistence-policy.js";
import {
  describeWritingContinuationAction,
  describeWritingStrongModelStatus,
  describeWritingBatchAppendStatus,
  planWritingCandidateFocus,
  describeWritingThemeProjectEntryState,
  describeWritingProjectPreflight,
  planWritingBasketEntry,
  planWritingThemeIndexEntry,
  resolveWritingSelectedThemeIndexId,
  resolveWritingSourceIndexIds,
  resolveWritingEntryTitle,
  shouldPreserveWritingThemeContext,
  writingThemeIndexContinuationRoute,
  writingCenterContinuationFailureMessage,
  writingCenterContinuationStatusMessage,
  writingScaffoldPreflightWarning,
  isWritingStrongModelReady
} from "./writing-center-flow.js";
import {
  countExplicitSemanticRelations,
  deriveBasketWritingReadiness,
  describeProjectPreflight,
  noteHasBoundarySignal
} from "./writing-readiness.js";
import {
  createWritingProjectRuntimeController
} from "./writing-project-runtime-controller.js";
import {
  createWritingEntryRuntimeController
} from "./writing-entry-runtime-controller.js";
import {
  normalizeWritingProjectTitleSeed as computeNormalizeWritingProjectTitleSeed,
  resetWritingLocalBookIdeasState as resetWritingLocalBookIdeasForRuntime,
  suggestedThemeIndexTitle as computeSuggestedThemeIndexTitle,
  suggestedWritingProjectTitle as computeSuggestedWritingProjectTitle,
  syncWritingLocalBookIdeasFromProjectState as syncWritingLocalBookIdeasFromProjectForRuntime,
  writingSourceIndexSummary as computeWritingSourceIndexSummary,
  writingThemeLabels as computeWritingThemeLabels,
  writingThemeSummary as computeWritingThemeSummary
} from "./prototype-writing-workspace.js";
import {
  createWritingBookRuntime
} from "./writing-book-runtime.js";
import {
  scheduledTaskFormDefaults
} from "./scheduled-tasks-model.js";
import {
  createScheduledTasksRuntimeController
} from "./scheduled-tasks-runtime-controller.js";
import {
  aiSettingsSelectionFromPreferences,
  canonicalizeAiSettingsSelection,
  isAiLocalFlowActive,
  isLocalModelPack,
  localProviderPresetForModelPack,
  normalizeAiRuntimeMode,
  providerPresetForModelPack,
  shouldUseOllamaLocalRuntimeForSelection,
  supportedAiSettingsModelPack
} from "./ai-settings-state.js";
import {
  renderAiLocalModelControlsForRuntime,
  renderAiLocalModelRecommendationsForRuntime,
  renderAiProviderConfigControlsForRuntime
} from "./settings-ai-controls-view.js";
import {
  renderAiSettingsExperienceForRuntime
} from "./settings-ai-experience-view.js";
import {
  renderAiRoutePreviewForRuntime
} from "./settings-ai-route-preview-view.js";
import {
  escapeTemplatePreviewInline,
  renderTemplateMarkdownPreviewHtmlForRuntime
} from "./settings-template-preview-view.js";
import {
  buildNoteTemplateSettingsCardModel
} from "./settings-template-card-model.js";
import {
  renderSettingsDetailFocusForRuntime,
  renderSettingsSidebarColumnForRuntime,
  renderSettingsWorkbenchChromeForRuntime
} from "./settings-panel-shell.js";
import {
  renderSettingsPanelForRuntime
} from "./settings-panel-renderer.js";
import {
  installSettingsEventBindings
} from "./settings-event-bindings.js";
import {
  installSettingsAiEventBindings
} from "./settings-ai-event-bindings.js";
import {
  aiTestBlockedReasonForState,
  currentOllamaModelTiersForState,
  installedLocalModelReadyForState
} from "./ai-test-readiness.js";
import {
  localAiPreviewOptionsForAction,
  ollamaStopRuntimeUiOutcome
} from "./ai-local-runtime-ui-model.js";
import {
  isLocalAdvancedModelRefForSettings
} from "./settings-ai-runtime-actions.js";
import {
  createSettingsAiRuntimeController
} from "./settings-ai-runtime-controller.js";
import {
  buildAiProviderConfigPayload
} from "./settings-ai-provider-config-actions.js";
import {
  AI_LOCAL_MODEL_TIERS,
  AI_REMOTE_MODEL_TIERS,
  OLLAMA_CHAT_ENDPOINT_URL,
  OLLAMA_HEALTH_ENDPOINT_URL,
  OLLAMA_RECOMMENDED_MODEL,
  aiDefaultsForRuntimeMode,
  defaultProviderEndpointUrl,
  defaultProviderHealthEndpointUrl,
  enabledProviderHealthEndpointUrl,
  isBuiltInOllamaModel,
  isRemoteConfigurableProviderId,
  localModelDisplayProfile,
  modelNameExistsInList,
  normalizeOllamaSetupGuide,
  ollamaBootstrapStatusText,
  ollamaModelRecommendationProfiles,
  ollamaRecommendationForModel,
  preferredLocalModelName,
  remoteRuntimeModelFromMap,
  runtimeModelMapForRemoteModel,
  selectedLocalModelNameForInstalledModels
} from "./prototype-ai-settings-controller.js";
import {
  createUpdateState,
  shouldShowUpdateAttention,
  updateStateAutoCheckEnabled,
  updateStateIgnoreLatest,
  updateStateRemindLater
} from "./update-state.js";
import {
  createPrototypeUpdateController,
  renderUpdateSettingsCard
} from "./prototype-update-controller.js";
import {
  analyzeDirectoryGraph,
  analyzePermanentNote,
  analyzeWritingWithStrongModel,
  refinePotentialRelationCandidate,
  bindWritingDraftNote,
  acceptAiInboxLink,
  checkAppUpdate,
  checkAiProviderHealth,
  confirmPermanentNoteDistillation,
  confirmImport,
  createDirectory,
  createDraftScaffold,
  createAiSuggestion,
  createIndexCard,
  createNote,
  createWritingProject,
  deleteDirectory,
  deleteNote,
  exportMarkdown,
  fetchDraftScaffold,
  fetchDirectories,
  fetchGraphConflicts,
  fetchDirectoryGraph,
  fetchAiInbox,
  fetchAiInboxEvaluationSummary,
  fetchAiInboxItem,
  fetchAiInboxItemWithOptions,
  fetchAiSuggestion,
  fetchAiSuggestions,
  fetchAiScheduledTasks,
  fetchAiScheduledTaskTemplates,
  fetchRelationReviewQueue,
  fetchIndexCard,
  updateIndexCard,
  fetchDirectoryNotes,
  fetchAiProviderConfigs,
  fetchAiPreferences,
  fetchAppVersion,
  fetchOllamaModels,
  fetchOllamaBootstrapStatus,
  bootstrapOllamaLocalAi,
  pullOllamaModel,
  startOllamaRuntime,
  stopOllamaRuntime,
  listIndexCards,
  fetchNote,
  fetchNoteRelations,
  searchNotes,
  createNoteRelation,
  fetchWritingProject,
  listProjectDraftVersions,
  listProjectScaffolds,
  listWritingProjects,
  setWritingCurrentDraftNote,
  updateWritingProjectBookStructure,
  updateDraftNoteVersionNote,
  updateDraftScaffoldVersionNote,
  fetchVaultInfo,
  saveAiPreferences,
  saveAiProviderConfig,
  runAiTestChat,
  getApiBase,
  moveNote,
  previewAiRoute,
  previewImport,
  promoteAiInboxNote,
  recordAiInboxDecision,
  summarizeAiInboxItem,
  seedYijingKnowledgeNetwork,
  seedYijingRichAcceptanceDemo,
  seedSmartNotesProductThinkingDemo,
  runDueAiScheduledTasks,
  saveAiScheduledTask,
  switchVault,
  updateDirectory,
  updateAiScheduledTaskStatus,
  updateAiScheduledTaskStatusWithOptions,
  updateAiSuggestion,
  updateNote,
  updatePermanentNoteDistillation,
  adoptAiInboxFieldSuggestion
} from "./prototype-api.js";

const $ = (id) => document.getElementById(id);
const state = createInitialState();
let usingLocalFallbackData = false;
let lastChosenPermanentDirectoryId = "dir_original_default";
let graphModuleActivationGuardUntil = 0;
state.literatureQueueFocusNoteIds = [];
state.literatureQueueFocusLabel = "";
state.graphConnectivityReady = false;
state.graphVisibleNoteIdsReady = false;
const importState = {
  importRecordId: "",
  directoryId: "",
  lastPreview: null,
  lastResultPayload: null,
  activeTab: "import",
  literatureBatchSummary: null,
  selectionImportRecordId: "",
  selectedCandidateIds: new Set(),
  resultFocusReason: ""
};
const graphState = {
  item: null,
  lastLoadedDirectoryId: "",
  lastLoadedAt: "",
  conflicts: null,
  reviewQueue: null,
  aiAnalysis: null,
  aiAnalysisLoading: false,
  aiAnalysisError: "",
  aiReviewSystemMessageId: "",
  loading: false,
  error: "",
  lastErrorAt: "",
  requestSerial: 0,
  filters: {
    relationType: normalizeGraphRelationTypeFilter(readStoredText(GRAPH_RELATION_TYPE_FILTER_KEY, "meaningful"), "meaningful"),
    status: "all"
  },
  focusDepth: normalizeGraphFocusDepth(readStoredText(GRAPH_FOCUS_DEPTH_KEY, "1"), "1"),
  focusContextMode: normalizeGraphFocusContextMode(readStoredText(GRAPH_FOCUS_CONTEXT_MODE_KEY, "argument"), "argument"),
  focusContextCollapsed: false,
  focusContextHelpOpen: false,
  zoom: "fit",
  expanded: false,
  legendOpen: false,
  researchNavigatorHidden: false,
  researchNavigatorTouched: false,
  workbenchPanelOpen: false,
  workbenchPanelTab: "clues",
  thinkingPanelOpen: false,
  thinkingPanelVisible: true,
  thinkingFilter: "all",
  readingLens: "insight",
  densityHintKey: "",
  densityHintVisibleUntil: 0,
  densityHintTimer: 0,
  selection: null,
  isolatedWorkflowTabsByNoteId: {},
  isolatedRelationDraftByNoteId: {},
  isolatedRelationSaveResultByNoteId: {},
  relationAdjustmentFocusById: {},
  utilityDrawerOpen: false,
  utilityDrawerVisible: true,
  utilityDrawerPosition: null,
  sectionOpen: {
    "bridge-gaps": false,
    "review-queue": false,
    "ai-analysis": false
  }
};
function setGraphRelationTypeFilter(value = "", options = {}) {
  return setGraphRelationTypeFilterForRuntime(graphState, value, {
    ...options,
    writeStoredText
  });
}
setGraphRelationTypeFilter(graphState.filters?.relationType, { persist: false });
const graphViewportController = createGraphViewportController({
  graphState,
  documentRef: document,
  graphZoomOption
});
const {
  graphViewportDragState,
  centerGraphViewportIfZoomed,
  beginGraphViewportDrag,
  updateGraphViewportDrag,
  endGraphViewportDrag
} = graphViewportController;
const graphUtilityDrawerController = createGraphUtilityDrawerController({
  graphState,
  rootProvider: () => $("graphCanvas")
});
const {
  graphUtilityDrawerDragState,
  applyGraphUtilityDrawerPosition,
  beginGraphUtilityDrawerDrag,
  updateGraphUtilityDrawerDrag,
  endGraphUtilityDrawerDrag
} = graphUtilityDrawerController;
const graphPresentationController = createGraphPresentationController({
  graphState,
  windowRef: window,
  isGraphModule: () => state.module === "graph",
  renderGraphPanel,
  setRelationTypeFilter: setGraphRelationTypeFilter
});
const {
  syncGraphDisclosureState,
  clearGraphDensityHintTimer,
  scheduleGraphDensityHintDismiss,
  shouldShowGraphDensityHint,
  resetGraphDemoPresentationState
} = graphPresentationController;
const distillationState = {
  filter: "all"
};
const aiInboxState = {
  items: [],
  counts: { pending: 0, reviewed: 0, archived: 0, all: 0 },
  views: [],
  filters: {
    view: "pending",
    type: "all",
    sourceNoteId: "",
    privacyMode: "",
    limit: 50
  },
  selectedArtifactId: "",
  detail: null,
  detailArtifactId: "",
  loading: false,
  detailLoading: false,
  evaluationLoading: false,
  actionLoading: false,
  error: "",
  detailError: "",
  actionArtifactId: "",
  actionSuggestionId: "",
  actionError: "",
  actionNoticeArtifactId: "",
  actionNoticeSuggestionId: "",
  actionNotice: "",
  actionNoticeTone: "",
  evaluationError: "",
  evaluationSummary: null,
  detailRequestToken: 0,
  evaluationRequestToken: 0,
  aiSummary: "",
  aiSummaryArtifactId: "",
  aiSummarySuggestionId: "",
  aiSummaryMeta: "",
  aiSummaryRecommendedAction: "",
  aiSummaryLoading: false,
  aiSummaryError: "",
  aiSummaryRequestToken: 0
};
const settingsState = {
  activeSection: "workspace",
  activeItem: "current-vault",
  vault: null,
  noteTemplates: {
    permanent: {
      panelOpen: false,
      scope: "",
      text: "",
      draftText: "",
      draftActive: false,
      history: [],
      feedbackTone: "",
      feedbackText: ""
    },
    literature: {
      panelOpen: false,
      scope: "",
      text: "",
      draftText: "",
      draftActive: false,
      history: [],
      feedbackTone: "",
      feedbackText: ""
    }
  },
  update: createUpdateState(),
  ai: {
    runtimeMode: "auto",
    userMode: "Auto",
    modelPack: "Starter Auto",
    advancedModelRef: "",
    secretRef: "",
    providerEndpointUrl: "",
    providerHealthEndpointUrl: "",
    remoteRuntimeModel: "",
    providerDraftTouched: {
      secretRef: false,
      providerEndpointUrl: false,
      providerHealthEndpointUrl: false,
      remoteRuntimeModel: false
    },
    localModel: "",
    localRuntimeStatus: "unknown",
    localRuntimeModels: [],
    localRuntimeModelTiers: [],
    localRuntimeReadinessStatus: "unknown",
    localRuntimeDefaultModelInstalled: false,
    localRuntimeApiReachable: false,
    localRuntimeManagedStopPending: false,
    localRuntimeSetupGuide: null,
    localRuntimeChatEndpointUrl: "",
    localRuntimeHealthEndpointUrl: "",
    localRuntimeChecking: false,
    localRuntimeStarting: false,
    localRuntimeStopping: false,
    localRuntimePulling: false,
    localRuntimeError: "",
    providerConfigs: [],
    providerConfigSaving: false,
    providerHealthChecking: false,
    providerHealthResult: null,
    providerConfigError: "",
    routePreview: null,
    routePreviewLoading: false,
    routePreviewError: "",
    testPrompt: "",
    testRunning: false,
    testMeta: "",
    testOutput: "",
    suggestions: [],
    suggestionsTotal: 0,
    suggestionFilters: {
      status: "all",
      targetType: "",
      targetId: "",
      scope: "",
      limit: 50
    },
    selectedSuggestionId: "",
    suggestionDetail: null,
    suggestionDetailSuggestionId: "",
    suggestionDetailRequestToken: 0,
    suggestionDetailLoading: false,
    suggestionsLoading: false,
    suggestionActionLoading: false,
    suggestionActionSuggestionId: "",
    suggestionActionNoticeSuggestionId: "",
    suggestionActionNotice: "",
    suggestionActionNoticeTone: "",
    suggestionsError: "",
    suggestionDetailError: "",
    suggestionActionError: "",
    scheduledTasks: [],
    scheduledTasksTotal: 0,
    scheduledTaskTemplates: [],
    scheduledTaskTemplatesLoading: false,
    scheduledTaskTemplatesError: "",
    scheduledTaskForm: scheduledTaskFormDefaults(),
    scheduledTaskFormOpen: false,
    scheduledTaskFilters: {
      status: "all",
      taskType: "all",
      limit: 50
    },
    scheduledTasksLoading: false,
    scheduledTaskActionLoading: false,
    scheduledTasksError: "",
    scheduledTaskRunSummary: null,
    debugSnapshots: {
      inboxList: null,
      inboxDetail: null,
      inboxDecision: null,
      suggestionsList: null,
      suggestionDetail: null,
      suggestionDecision: null,
      scheduledTasksList: null,
      scheduledTaskAction: null
    }
  },
  error: ""
};
function settingsSectionChromeMap() {
  return computeSettingsSectionChromeMap({
    settingsState,
    settingsVaultPathMissing,
    settingsLeafLabel,
    settingsAiOverviewSummary,
    settingsAiRuntimeModeLabel,
    feedbackRepository: FEEDBACK_REPOSITORY,
    feedbackRepositoryReady: FEEDBACK_REPOSITORY_READY
  });
}

function settingsItemSummary(itemId = "") {
  return computeSettingsItemSummary(itemId);
}

function formatSettingsUserError(errorMessage = "") {
  return computeFormatSettingsUserError(errorMessage);
}

function settingsVaultPathMissing() {
  return /找不到当前笔记库路径|ENOENT|no such file or directory/i.test(String(settingsState.error || "").trim());
}

function settingsSectionGuidanceMap() {
  return computeSettingsSectionGuidanceMap({
    settingsState,
    settingsLeafLabel,
    settingsAiOverviewSummary
  });
}

function settingsSidebarNavigationHtml() {
  return renderSettingsSidebarNavigationHtml({
    settingsState,
    chromeMap: settingsSectionChromeMap(),
    escapeHtml
  });
}

function settingsMobileItemOptionsHtml() {
  return renderSettingsMobileItemOptionsHtml({ escapeHtml });
}

function settingsModuleHeaderCopy() {
  return computeSettingsModuleHeaderCopy({ settingsState });
}

const writingState = {
  project: null,
  scaffold: null,
  scaffoldMarkdown: "",
  relationCounts: {},
  relationCountErrors: {},
  loadingRelationCounts: false,
  relationCountRequestSerial: 0,
  themeNoteDetailIds: [],
  loadingThemeNoteDetails: false,
  themeNoteDetailRequestSerial: 0,
  themeRelationNoteIds: [],
  themeRelationCounts: {},
  themeRelationCountErrors: {},
  loadingThemeRelationCounts: false,
  themeRelationCountRequestSerial: 0,
  sourceIndexIds: [],
  focusedCandidateNoteIds: [],
  focusedCandidateScopeLabel: "",
  selectedThemeIndexId: "",
  themeIndexes: [],
  loadingThemeIndexes: false,
  projects: [],
  projectFilters: {
    q: "",
    status: "all",
    hasDraft: "all"
  },
  loadingProjects: false,
  scaffoldVersions: [],
  loadingScaffoldVersions: false,
  draftVersions: [],
  loadingDraftVersions: false,
  strongModelEpoch: 0,
  strongModelRunId: 0,
  strongModelLoading: false,
  strongModelResult: null,
  strongModelError: "",
  strongModelRevision: 0,
  localBookIdeas: [],
  localBookIdeasGeneratedAt: ""
};
const desktopCommands = createDesktopFileCommandService({ switchVaultImpl: switchVault });
let statusRevision = 0;
let statusHoldUntil = 0;
let statusHoldPriority = 0;
let editorHelperDismissed = false;
const EDITOR_HELPER_MUTE_KEY = "yansilu:editor-helper-muted";
let editorHelperMuted = readStoredBoolean(EDITOR_HELPER_MUTE_KEY);
let saveAiSuggestion = null;
const dismissedSaveAiSuggestionKeys = new Set();
const SYSTEM_MESSAGES_KEY = "yansilu:system-messages:v1";
const SYSTEM_MESSAGES_LIMIT = 80;
let systemMessages = readStoredSystemMessages();
let selectedSystemMessageId = systemMessages[0]?.id || "";
let startupAutoOpenSuppressed = false;
const FEEDBACK_REPOSITORY = "lidiansen58-debug/yansilu-feedback";
const FEEDBACK_REPOSITORY_READY =
  Boolean(String(FEEDBACK_REPOSITORY || "").trim()) && !FEEDBACK_REPOSITORY.includes("YOUR_GITHUB_");
const APP_VERSION = "0.1.1-beta.1";
const UPDATE_SETTINGS_KEY = "yansilu:update:settings:v1";
const UPDATE_LAST_RESULT_KEY = "yansilu:update:last-result:v1";
const AI_RUNTIME_MODE_KEY = "yansilu:ai:runtime-mode";
const AI_USER_MODE_KEY = "yansilu:ai:user-mode";
const AI_MODEL_PACK_KEY = "yansilu:ai:model-pack";
const AI_ADVANCED_MODEL_REF_KEY = "yansilu:ai:advanced-model-ref";
const AI_SECRET_REF_KEY = "yansilu:ai:secret-ref";
const AI_PROVIDER_ENDPOINT_URL_KEY = "yansilu:ai:provider-endpoint-url";
const AI_PROVIDER_HEALTH_ENDPOINT_URL_KEY = "yansilu:ai:provider-health-endpoint-url";
const AI_REMOTE_RUNTIME_MODEL_KEY = "yansilu:ai:remote-runtime-model";
const AI_LOCAL_MODEL_KEY = "yansilu:ai:local-model";
const GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID = "dir_original_default";
const updateController = createPrototypeUpdateController({
  settingsState,
  readStoredText,
  writeStoredText,
  updateSettingsKey: UPDATE_SETTINGS_KEY,
  updateLastResultKey: UPDATE_LAST_RESULT_KEY,
  appVersion: APP_VERSION,
  fetchAppVersion,
  checkAppUpdate,
  renderSettingsPanel,
  renderSystemMessages: (...args) => renderSystemMessages(...args),
  setStatus,
  upsertSystemMessage,
  desktopCommands,
  getDirtyTabCount: () => typeof editor?.dirtyTabs === "function" ? editor.dirtyTabs().length : 0
});
updateController.loadUpdateSettingsFromStorage();
loadAiSettingsFromStorage();
loadNoteTemplateSettingsFromStorage();

if (typeof document !== "undefined") {
  const suppressStartupAutoOpen = () => {
    startupAutoOpenSuppressed = true;
  };
  document.addEventListener("pointerdown", suppressStartupAutoOpen, true);
  document.addEventListener("keydown", suppressStartupAutoOpen, true);
}

function feedbackBaseUrl() {
  return `https://github.com/${FEEDBACK_REPOSITORY}/issues/new`;
}

function activePrototypeUrl() {
  if (typeof window === "undefined") return "/app";
  return window.location.href || `${window.location.origin}/app`;
}

function buildFeedbackUrl(kind = "bug") {
  const issueType = kind === "feature" ? "feature_request" : "bug_report";
  const moduleName = moduleLabel(state.module);
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  const titlePrefix = kind === "feature" ? "[建议]" : "[反馈]";
  const title = `${titlePrefix} ${moduleName}：`;
  const bodyLines = [
    "## 背景",
    "",
    "请描述你遇到的问题或建议改进的体验。",
    "",
    "## 当前环境",
    `- 版本：${APP_VERSION}`,
    `- 模块：${moduleName}`,
    `- 页面：${activePrototypeUrl()}`,
    `- 当前笔记：${note?.title || "未选中"}`,
    "",
    "## 补充信息",
    "- 预期发生什么：",
    "- 实际发生什么：",
    "- 复现步骤："
  ];
  const url = new URL(feedbackBaseUrl());
  url.searchParams.set("template", `${issueType}.md`);
  url.searchParams.set("title", title);
  url.searchParams.set("body", bodyLines.join("\n"));
  return url.toString();
}

function buildFeedbackDiagnosticText() {
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  const folder = folderById(state, state.selectedFolderId);
  const lines = [
    "# Yansilu Feedback Diagnostics",
    `capturedAt: ${new Date().toISOString()}`,
    `repository: ${FEEDBACK_REPOSITORY}`,
    `appVersion: ${APP_VERSION}`,
    `module: ${moduleLabel(state.module)}`,
    `page: ${activePrototypeUrl()}`,
    `selectedFolder: ${folder?.name || state.selectedFolderId || "未选中"}`,
    `selectedNote: ${note?.title || "未选中"}`,
    `userAgent: ${typeof navigator !== "undefined" ? navigator.userAgent || "unknown" : "unknown"}`
  ];
  return lines.join("\n");
}

async function openFeedbackUrl(url = "") {
  const result = await desktopCommands.openExternalUrl(url);
  return Boolean(result?.ok);
}

const noteRuntimeController = createNoteRuntimeController(() => ({
  editor,
  ensureEditableNoteBody,
  fetchNote,
  initialBodyForFolder,
  isEmptyUntitledMarkdown,
  isLocalOnlyNote,
  isUntitledTitle,
  mapNoteItem,
  normalizeAuthorshipItem,
  normalizeDraftBuffer,
  normalizeNoteTemplateHistory,
  normalizeOptionalNumber,
  normalizeStoredNoteTemplateSource,
  normalizeThinkingStatusItem,
  normalizedDefaultUntitledBody,
  noteTabFor,
  noteTemplateStorageKey,
  noteTemplateStorageScope,
  parseLinks,
  parseTags,
  readStoredRelationNetworkStatus,
  readStoredText,
  setStatus,
  settingsState,
  state,
  typeFromFolder,
  updateNote,
  writeStoredRelationNetworkStatus,
  writeStoredText
}));

function noteGeneratedOriginalNoteId(note = null) {
  return noteRuntimeController.noteGeneratedOriginalNoteId(note);
}

function noteHasGeneratedOriginal(note = null) {
  return noteRuntimeController.noteHasGeneratedOriginal(note);
}

function relationNetworkStatusForNote(note = null, options = {}) {
  return noteRuntimeController.relationNetworkStatusForNote(note, options);
}

function syncNoteRelationNetworkStatus(note = null, options = {}) {
  return noteRuntimeController.syncNoteRelationNetworkStatus(note, options);
}

function syncAllNoteRelationNetworkStatuses(options = {}) {
  return noteRuntimeController.syncAllNoteRelationNetworkStatuses(options);
}

function isOriginalRecordableSource(note = null) {
  const noteType = String((note?.folderId ? typeFromFolder(state, note.folderId) : "") || note?.noteType || "").trim().toLowerCase();
  return noteType === "fleeting" || noteType === "literature";
}

function setStatus(text, cls = "", options = {}) {
  const requiredRevision = Number(options?.skipIfStaleSince || 0);
  if (requiredRevision && statusRevision !== requiredRevision) return false;
  const requiredModule = String(options?.requireModule || "").trim();
  if (requiredModule && state.module !== requiredModule) return false;
  const now = Date.now();
  const incomingTone = String(cls || "").trim().toLowerCase();
  const incomingPriority = Math.max(
    Number(options?.priority || 0) || 0,
    incomingTone === "bad" ? 4 : incomingTone === "warn" ? 3 : 0
  );
  const force = options?.force === true;
  if (!force && now < statusHoldUntil && incomingPriority < statusHoldPriority) return false;
  statusRevision += 1;
  $("statusText").className = `status-pill ${cls}`.trim();
  $("statusText").textContent = text;
  const statusBar = $("statusBar");
  if (statusBar) statusBar.dataset.tone = cls || "";
  const holdMs = Math.max(0, Number(options?.holdMs || 0) || 0);
  if (holdMs > 0) {
    statusHoldUntil = now + holdMs;
    statusHoldPriority = incomingPriority;
  } else if (force || now >= statusHoldUntil || incomingPriority >= statusHoldPriority) {
    statusHoldUntil = 0;
    statusHoldPriority = 0;
  }
  return true;
}


function readStoredSystemMessages() {
  return readStoredSystemMessagesForRuntime({
    storage: window.localStorage,
    key: SYSTEM_MESSAGES_KEY,
    limit: SYSTEM_MESSAGES_LIMIT,
    normalizeSystemMessage
  });
}

function persistSystemMessages() {
  return persistSystemMessagesForRuntime(systemMessages, {
    storage: window.localStorage,
    key: SYSTEM_MESSAGES_KEY,
    limit: SYSTEM_MESSAGES_LIMIT
  });
}





const systemMessagesShellController = createSystemMessagesShellController({
  hostProvider: createSystemMessagesPrototypeHostProvider(() => ({
    $,
    document,
    getMessagesRef: () => systemMessages,
    getSelectedMessageIdRef: () => selectedSystemMessageId,
    setSelectedMessageIdRef: (messageId = "") => {
      selectedSystemMessageId = messageId;
    },
    notes: state.notes,
    escapeHtml,
    hideEditorHelper,
    renderSystemMessages
  }))
});
const {
  renderSystemMessages,
  openSystemMessages,
  closeSystemMessages,
  isSystemMessageModalOpen
} = systemMessagesShellController;

const systemMessageDepsProviders = createSystemMessagePrototypeDepsProviders(() => ({
  getMessagesRef: () => systemMessages,
  setMessagesRef: (messages = []) => {
    systemMessages = messages;
  },
  getSelectedMessageIdRef: () => selectedSystemMessageId,
  setSelectedMessageIdRef: (messageId = "") => {
    selectedSystemMessageId = messageId;
  },
  markSystemMessageRead,
  persistSystemMessages,
  renderSystemMessages,
  openSystemMessages,
  closeSystemMessages,
  isSystemMessageModalOpen,
  systemMessageActionRoute,
  aiInboxFiltersForSystemMessage,
  globalPendingAiInboxFilters,
  setAiInboxFilters: (filters) => {
    aiInboxState.filters = filters;
  },
  resetAiInboxDetail: () => {
    aiInboxState.detail = null;
    aiInboxState.selectedArtifactId = "";
  },
  activateModule,
  openAiInboxModule,
  setSettingsItem,
  openNoteById,
  openSystemMessageWorkflow,
  setStatus,
  normalizeSystemMessage,
  upsertSystemMessageList,
  limit: SYSTEM_MESSAGES_LIMIT
}));
const {
  eventDeps: systemMessageEventDeps,
  runtimeDeps: systemMessagesRuntimeDeps
} = systemMessageDepsProviders;

function markSystemMessagesRead() {
  return markSystemMessagesReadForRuntime(systemMessagesRuntimeDeps());
}

function addSystemMessage(message = {}, { interrupt = false } = {}) {
  return addSystemMessageForRuntime(message, { interrupt }, systemMessagesRuntimeDeps());
}

function upsertSystemMessage(message = {}, { interrupt = false, preserveRead = true } = {}) {
  return upsertSystemMessageForRuntime(message, { interrupt, preserveRead }, systemMessagesRuntimeDeps());
}

function resolveSystemMessageByDedupeKey(dedupeKey = "") {
  return resolveSystemMessageByDedupeKeyForRuntime(dedupeKey, systemMessagesRuntimeDeps());
}


function scheduledTaskReviewArtifactCount(summary = {}) {
  return (Array.isArray(summary?.runs) ? summary.runs : []).reduce((total, run) => {
    const result = run?.result || {};
    const artifacts = Array.isArray(result.artifacts) ? result.artifacts.length : 0;
    const storedIds = Array.isArray(result.reviewItems?.storedArtifactIds) ? result.reviewItems.storedArtifactIds.length : 0;
    const reviewArtifacts = Array.isArray(result.reviewItems?.artifacts) ? result.reviewItems.artifacts.length : 0;
    return total + Math.max(artifacts, storedIds, reviewArtifacts);
  }, 0);
}

function readStoredBoolean(key, fallback = false) {
  try {
    const raw = window.localStorage?.getItem(String(key || ""));
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {}
  return fallback;
}

function writeStoredBoolean(key, value) {
  try {
    window.localStorage?.setItem(String(key || ""), value ? "1" : "0");
  } catch {}
}

function readStoredText(key, fallback = "") {
  try {
    const raw = window.localStorage?.getItem(String(key || ""));
    if (raw === null || raw === undefined) return fallback;
    return String(raw);
  } catch {}
  return fallback;
}

function writeStoredText(key, value) {
  try {
    const clean = String(value ?? "");
    if (!clean) window.localStorage?.removeItem(String(key || ""));
    else window.localStorage?.setItem(String(key || ""), clean);
  } catch {}
}

function defaultLiteratureTemplateSource(title = "{{title}}") {
  return computeDefaultLiteratureTemplateSource(title);
}

function currentLiteratureTemplateSectionLabels() {
  return deriveLiteratureSectionLabelsFromTemplate(effectiveSavedNoteTemplateSource("literature"));
}

function literatureTemplateSectionLabelCandidates() {
  return [
    currentLiteratureTemplateSectionLabels(),
    ...normalizeNoteTemplateHistory(settingsState.noteTemplates.literature.history, "literature").map((template) =>
      deriveLiteratureSectionLabelsFromTemplate(template)
    )
  ];
}

function defaultPermanentTemplateSource(title = "{{title}}") {
  return computeDefaultPermanentTemplateSource(title);
}

function legacyPermanentTemplateSource(title = "{{title}}") {
  return computeLegacyPermanentTemplateSource(title);
}

function defaultTemplateSourceForKind(kind = "") {
  return computeDefaultTemplateSourceForKind(kind);
}

function normalizeNoteTemplateSource(text = "", kind = "") {
  return computeNormalizeNoteTemplateSource(text, kind);
}

function normalizeStoredNoteTemplateSource(text = "", kind = "") {
  return computeNormalizeStoredNoteTemplateSource(text, kind);
}

function effectiveSavedNoteTemplateSource(kind = "") {
  const cleanKind = String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
  const savedSource = normalizeStoredNoteTemplateSource(settingsState.noteTemplates[cleanKind]?.text, cleanKind);
  if (cleanKind !== "literature") return savedSource;
  const validation = validateLiteratureTemplateSource(savedSource);
  return validation.ok ? savedSource : defaultTemplateSourceForKind(cleanKind);
}

function normalizeNoteTemplateHistory(items = [], kind = "") {
  return computeNormalizeNoteTemplateHistory(items, kind);
}

function noteTemplateStorageScope(vaultPath = "") {
  const cleanPath = String(vaultPath || currentVaultPath() || "").trim().replace(/\//g, "\\").toLowerCase();
  return cleanPath || "global";
}

function noteTemplateStorageKey(kind = "", options = {}) {
  const cleanKind = String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
  const base = NOTE_TEMPLATE_STORAGE_KEYS[cleanKind];
  const suffix = String(options?.suffix || "").trim();
  const scope = noteTemplateStorageScope(options?.vaultPath || "");
  return `${base}:${scope}${suffix ? `:${suffix}` : ""}`;
}

function noteTemplateHistoryWithPrevious(history = [], previousText = "", kind = "") {
  return computeNoteTemplateHistoryWithPrevious(history, previousText, kind);
}

function normalizeDraftBuffer(text = "") {
  return computeNormalizeDraftBuffer(text);
}

function applyTitleToNoteTemplate(templateSource = "", title = "未命名笔记", kind = "") {
  return computeApplyTitleToNoteTemplate(templateSource, title, kind, { ensureEditableNoteBody });
}

function mergeTemplateFieldText(base = "", addition = "") {
  return computeMergeTemplateFieldText(base, addition);
}

function composePermanentTemplateDraft(fields = {}) {
  return computeComposePermanentTemplateDraft(fields, { permanentNoteTemplateBody });
}

function loadNoteTemplateSettingsFromStorage() {
  return noteRuntimeController.loadNoteTemplateSettingsFromStorage();
}

function persistNoteTemplateSettingsToStorage() {
  for (const kind of ["permanent", "literature"]) {
    writeStoredText(
      noteTemplateStorageKey(kind),
      normalizeNoteTemplateSource(settingsState.noteTemplates[kind].text, kind)
    );
    writeStoredText(
      noteTemplateStorageKey(kind, { suffix: "history" }),
      JSON.stringify(normalizeNoteTemplateHistory(settingsState.noteTemplates[kind].history, kind))
    );
  }
}

const NOTE_RELATION_STATUS_KEY_PREFIX = "yansilu.noteRelationStatus.";

function noteRelationStatusStorageKey(noteId = "") {
  const cleanId = String(noteId || "").trim();
  return cleanId ? `${NOTE_RELATION_STATUS_KEY_PREFIX}${cleanId}` : "";
}

function readStoredRelationNetworkStatus(noteId = "") {
  const key = noteRelationStatusStorageKey(noteId);
  if (!key) return "";
  const value = String(readStoredText(key, "") || "").trim().toLowerCase();
  return isPersistableRelationNetworkStatus(value) ? value : "";
}

function writeStoredRelationNetworkStatus(noteId = "", status = "") {
  const key = noteRelationStatusStorageKey(noteId);
  if (!key) return;
  const cleanStatus = String(status || "").trim().toLowerCase();
  if (!cleanStatus) {
    writeStoredText(key, "");
    return;
  }
  if (!isPersistableRelationNetworkStatus(cleanStatus)) return;
  writeStoredText(key, cleanStatus);
}

function loadAiSettingsFromStorage() {
  const storedRuntimeMode = String(readStoredText(AI_RUNTIME_MODE_KEY, "") || "").trim();
  const storedMode = String(readStoredText(AI_USER_MODE_KEY, "") || "").trim();
  const storedPack = String(readStoredText(AI_MODEL_PACK_KEY, "") || "").trim();
  const storedModelRef = String(readStoredText(AI_ADVANCED_MODEL_REF_KEY, "") || "").trim();
  const storedSecretRef = String(readStoredText(AI_SECRET_REF_KEY, "") || "").trim();
  const storedEndpointUrl = String(readStoredText(AI_PROVIDER_ENDPOINT_URL_KEY, "") || "").trim();
  const storedHealthEndpointUrl = String(readStoredText(AI_PROVIDER_HEALTH_ENDPOINT_URL_KEY, "") || "").trim();
  const storedRemoteRuntimeModel = String(readStoredText(AI_REMOTE_RUNTIME_MODEL_KEY, "") || "").trim();
  const storedLocalModel = String(readStoredText(AI_LOCAL_MODEL_KEY, "") || "").trim();
  if (storedRuntimeMode) settingsState.ai.runtimeMode = normalizeAiRuntimeMode(storedRuntimeMode);
  if (storedMode) settingsState.ai.userMode = storedMode;
  if (storedPack) settingsState.ai.modelPack = storedPack;
  settingsState.ai.advancedModelRef = storedModelRef;
  settingsState.ai.secretRef = storedSecretRef;
  settingsState.ai.providerEndpointUrl = storedEndpointUrl;
  settingsState.ai.providerHealthEndpointUrl = storedHealthEndpointUrl;
  settingsState.ai.remoteRuntimeModel = storedRemoteRuntimeModel;
  settingsState.ai.localModel = storedLocalModel;
  reconcileAiSelectionState();
}

function persistAiSettingsToStorage() {
  writeStoredText(AI_RUNTIME_MODE_KEY, settingsState.ai.runtimeMode);
  writeStoredText(AI_USER_MODE_KEY, settingsState.ai.userMode);
  writeStoredText(AI_MODEL_PACK_KEY, settingsState.ai.modelPack);
  writeStoredText(AI_ADVANCED_MODEL_REF_KEY, settingsState.ai.advancedModelRef);
  writeStoredText(AI_SECRET_REF_KEY, settingsState.ai.secretRef);
  writeStoredText(AI_PROVIDER_ENDPOINT_URL_KEY, settingsState.ai.providerEndpointUrl);
  writeStoredText(AI_PROVIDER_HEALTH_ENDPOINT_URL_KEY, settingsState.ai.providerHealthEndpointUrl);
  writeStoredText(AI_REMOTE_RUNTIME_MODEL_KEY, settingsState.ai.remoteRuntimeModel);
  writeStoredText(AI_LOCAL_MODEL_KEY, settingsState.ai.localModel);
}

function settingsSupportedModelPack(modelPack = "") {
  return supportedAiSettingsModelPack(modelPack);
}

function isLocalAdvancedModelRef(value = "") {
  return isLocalAdvancedModelRefForSettings(value);
}

function preferredLocalProviderPresetForSelection() {
  return localProviderPresetForModelPack(settingsState.ai.modelPack) || "local_private_gateway";
}

function shouldUseOllamaLocalRuntime() {
  return shouldUseOllamaLocalRuntimeForSelection({
    runtimeMode: settingsState.ai.runtimeMode,
    modelPack: settingsState.ai.modelPack,
    providerPreset: preferredLocalProviderPresetForSelection()
  });
}

function resetAiProviderDraftTouched() {
  settingsState.ai.providerDraftTouched = {
    secretRef: false,
    providerEndpointUrl: false,
    providerHealthEndpointUrl: false,
    remoteRuntimeModel: false
  };
}

function markAiProviderDraftTouched(field = "") {
  if (!settingsState.ai.providerDraftTouched || typeof settingsState.ai.providerDraftTouched !== "object") {
    resetAiProviderDraftTouched();
  }
  if (field && Object.hasOwn(settingsState.ai.providerDraftTouched, field)) {
    settingsState.ai.providerDraftTouched[field] = true;
  }
}

function reconcileAiSelectionState(options = {}) {
  const previousModelPack = String(settingsState.ai.modelPack || "").trim();
  const previousProviderPreset = providerPresetForModelPack(previousModelPack);
  const unsupportedLocalProviderPreset = previousProviderPreset === "minicpm_local_gateway" ? previousProviderPreset : "";
  const nextSelection = canonicalizeAiSettingsSelection({
    runtimeMode: settingsState.ai.runtimeMode,
    modelPack: settingsSupportedModelPack(settingsState.ai.modelPack),
    userMode: settingsState.ai.userMode,
    providerPreset: localProviderPresetForModelPack(settingsSupportedModelPack(settingsState.ai.modelPack))
  }, {
    syncUserMode: options.syncUserMode === true
  });

  settingsState.ai.runtimeMode = nextSelection.runtimeMode;
  settingsState.ai.modelPack = nextSelection.modelPack;
  if (unsupportedLocalProviderPreset) {
    settingsState.ai.localModel = "";
    if (String(settingsState.ai.advancedModelRef || "").trim().startsWith(`${unsupportedLocalProviderPreset}:`)) {
      settingsState.ai.advancedModelRef = "";
    }
  }
  if (options.syncUserMode === true || !String(settingsState.ai.userMode || "").trim()) {
    settingsState.ai.userMode = nextSelection.userMode;
  }
  if (options.resetRoutePreview !== false) settingsState.ai.routePreview = null;
  if (options.resetProviderState === true || previousProviderPreset !== nextSelection.providerPreset) {
    settingsState.ai.providerEndpointUrl = "";
    settingsState.ai.providerHealthEndpointUrl = "";
    settingsState.ai.remoteRuntimeModel = "";
    settingsState.ai.secretRef = "";
    resetAiProviderDraftTouched();
  }
  if (nextSelection.providerPreset === "platform_managed_openai") {
    settingsState.ai.providerEndpointUrl = "";
    settingsState.ai.providerHealthEndpointUrl = "";
    settingsState.ai.remoteRuntimeModel = "";
    settingsState.ai.secretRef = "";
    resetAiProviderDraftTouched();
  }
  if (nextSelection.runtimeMode === "local_only" && settingsState.ai.advancedModelRef && !isLocalAdvancedModelRef(settingsState.ai.advancedModelRef)) {
    settingsState.ai.advancedModelRef = "";
  }
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;

  if (nextSelection.localFlowActive) {
    const providerId = preferredLocalProviderPresetForSelection();
    const endpointUrl = defaultProviderEndpointUrl(providerId) || OLLAMA_CHAT_ENDPOINT_URL;
    const healthEndpointUrl = defaultProviderHealthEndpointUrl(providerId, endpointUrl) || OLLAMA_HEALTH_ENDPOINT_URL;
    if (!settingsState.ai.providerEndpointUrl) settingsState.ai.providerEndpointUrl = endpointUrl;
    if (!settingsState.ai.providerHealthEndpointUrl) settingsState.ai.providerHealthEndpointUrl = healthEndpointUrl;
  }

  if (settingsState.ai.localModel) {
    applyOllamaLocalModelDefaults();
  } else if (!nextSelection.localFlowActive && isLocalAdvancedModelRef(settingsState.ai.advancedModelRef)) {
    settingsState.ai.advancedModelRef = "";
  }

  if (options.applyProviderConfig !== false) {
    applyActiveAiProviderConfigToState();
  }
  return nextSelection;
}

function applyOllamaLocalModelDefaults() {
  if (!settingsState.ai.localModel) return;
  const providerId = preferredLocalProviderPresetForSelection();
  const localFlowActive = isAiLocalFlowActive({
    runtimeMode: settingsState.ai.runtimeMode,
    modelPack: settingsState.ai.modelPack,
    providerId: localProviderPresetForModelPack(settingsState.ai.modelPack)
  });
  if (localFlowActive) {
    const endpointUrl = defaultProviderEndpointUrl(providerId) || OLLAMA_CHAT_ENDPOINT_URL;
    const healthEndpointUrl = defaultProviderHealthEndpointUrl(providerId, endpointUrl) || OLLAMA_HEALTH_ENDPOINT_URL;
    settingsState.ai.providerEndpointUrl = endpointUrl;
    settingsState.ai.providerHealthEndpointUrl = healthEndpointUrl;
    settingsState.ai.secretRef = "";
  }
  if (normalizeAiRuntimeMode(settingsState.ai.runtimeMode) === "local_only" || isLocalModelPack(settingsState.ai.modelPack)) {
    settingsState.ai.advancedModelRef = `${providerId}:${settingsState.ai.localModel}`;
  } else if (isLocalAdvancedModelRef(settingsState.ai.advancedModelRef)) {
    settingsState.ai.advancedModelRef = "";
  }
}

function authModeForProvider(providerId = "", preview = null) {
  const authMode = String(preview?.access?.authMode || "").trim();
  if (authMode) return authMode;
  const id = String(providerId || "").trim();
  if (id === "platform_managed_openai") return "platform_managed";
  if (["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"].includes(id)) {
    return settingsState.ai.secretRef ? "enterprise_secret" : "local_no_key";
  }
  return "workspace_managed";
}

function providerAuthModeRequiresSecret(authMode = "") {
  return ["workspace_managed", "byok_advanced", "enterprise_secret"].includes(String(authMode || "").trim());
}

function currentAiProviderId() {
  return String(settingsState.ai.routePreview?.provider?.providerId || providerPresetForModelPack(settingsState.ai.modelPack)).trim();
}

function activeAiProviderConfig() {
  const providerId = currentAiProviderId();
  return settingsState.ai.providerConfigs.find((config) => String(config?.providerId || config?.provider_id || "").trim() === providerId) || null;
}

function applyActiveAiProviderConfigToState() {
  const providerId = currentAiProviderId();
  const config = activeAiProviderConfig();
  const draftTouched = settingsState.ai.providerDraftTouched || {};
  if (!config) {
    const endpointUrl = defaultProviderEndpointUrl(providerId);
    const healthEndpointUrl = defaultProviderHealthEndpointUrl(providerId, endpointUrl);
    if (endpointUrl) settingsState.ai.providerEndpointUrl = endpointUrl;
    if (healthEndpointUrl) settingsState.ai.providerHealthEndpointUrl = healthEndpointUrl;
    if (!isRemoteConfigurableProviderId(providerId)) settingsState.ai.remoteRuntimeModel = "";
    return;
  }
  const configuredEndpointUrl = String(config.endpointUrl || config.endpoint_url || "").trim();
  const configuredHealthEndpointUrl = enabledProviderHealthEndpointUrl(config);
  const configuredSecretRef = String(config.secretRef || config.secret_ref || "").trim();
  if (!draftTouched.providerEndpointUrl && !settingsState.ai.providerEndpointUrl && configuredEndpointUrl) {
    settingsState.ai.providerEndpointUrl = configuredEndpointUrl;
  }
  if (!draftTouched.providerHealthEndpointUrl && !settingsState.ai.providerHealthEndpointUrl && configuredHealthEndpointUrl) {
    settingsState.ai.providerHealthEndpointUrl = configuredHealthEndpointUrl;
  }
  if (!draftTouched.secretRef && !settingsState.ai.secretRef && configuredSecretRef) {
    settingsState.ai.secretRef = configuredSecretRef;
  }
  if (isRemoteConfigurableProviderId(providerId)) {
    const configuredRemoteModel = remoteRuntimeModelFromMap(
      providerId,
      config.runtimeModelMap || config.runtime_model_map || {}
    );
    if (!draftTouched.remoteRuntimeModel && !settingsState.ai.remoteRuntimeModel && configuredRemoteModel) {
      settingsState.ai.remoteRuntimeModel = configuredRemoteModel;
    }
  } else {
    settingsState.ai.remoteRuntimeModel = "";
  }
}

function aiTestBlockedReason() {
  const providerId = currentAiProviderId();
  return aiTestBlockedReasonForState(settingsState.ai, {
    providerId,
    shouldUseOllamaLocalRuntime: shouldUseOllamaLocalRuntime(),
    authMode: authModeForProvider(providerId, settingsState.ai.routePreview)
  });
}

const settingsAiRuntimeController = createSettingsAiRuntimeController(() => ({
  aiProviderConfigPayload,
  applyActiveAiProviderConfigToState,
  applyAiPreferencesToSettingsState,
  applyOllamaBootstrapResult,
  applyOllamaLocalModelDefaults,
  applyOllamaRuntimePreview,
  bootstrapOllamaLocalAi,
  checkAiProviderHealth,
  clearLocalOllamaSelectionState,
  currentAiProviderId,
  currentOllamaModelTiers,
  fetchOllamaBootstrapStatus,
  fetchOllamaModels,
  hasLocalModel,
  installedLocalModelReady,
  localOllamaSetupActive,
  ollamaBootstrapStatusText,
  ollamaPullModelName,
  persistAiSettingsToStorage,
  persistOllamaRuntimeSelectionAfterPreview,
  preferredLocalProviderPresetForSelection,
  previewAiRoute,
  primaryRecommendedOllamaModelName,
  pullOllamaModel,
  refreshAiRoutePreview,
  renderSettingsPanel,
  resetAiProviderDraftTouched,
  saveAiProviderConfig,
  saveLocalOllamaProviderConfig,
  selectedLocalModelNameForInstalledModels,
  setStatus,
  settingsState,
  shouldUseOllamaLocalRuntime,
  startOllamaRuntime,
  stopOllamaRuntime,
  syncAiSettingsToApi,
  upsertAiProviderConfig,
  window
}));

function aiSettingsPayload() {
  return settingsAiRuntimeController.aiSettingsPayload();
}

function aiProviderConfigPayload(options = {}) {
  const providerId = String(options.providerId || currentAiProviderId()).trim();
  return buildAiProviderConfigPayload({
    ...settingsState.ai,
    ...options
  }, {
    providerId,
    authMode: options.authMode || authModeForProvider(providerId, settingsState.ai.routePreview),
    isRemoteConfigurableProvider: isRemoteConfigurableProviderId,
    providerAuthModeRequiresSecret,
    localModelTiers: AI_LOCAL_MODEL_TIERS
  });
}
function upsertAiProviderConfig(config = null) {
  if (!config) return;
  const providerId = String(config.providerId || config.provider_id || "").trim();
  if (!providerId) return;
  settingsState.ai.providerConfigs = [
    ...settingsState.ai.providerConfigs.filter((item) => String(item?.providerId || item?.provider_id || "").trim() !== providerId),
    config
  ];
}

function applyAiPreferencesToSettingsState(preferences = null, options = {}) {
  const nextAiSelection = aiSettingsSelectionFromPreferences(preferences);
  settingsState.ai.runtimeMode = nextAiSelection.runtimeMode;
  settingsState.ai.userMode = nextAiSelection.userMode;
  settingsState.ai.modelPack = nextAiSelection.modelPack;
  settingsState.ai.localModel = nextAiSelection.localModel;
  settingsState.ai.advancedModelRef = nextAiSelection.advancedModelRef;
  settingsState.ai.secretRef = nextAiSelection.secretRef;
  settingsState.ai.providerEndpointUrl = "";
  settingsState.ai.providerHealthEndpointUrl = "";
  settingsState.ai.remoteRuntimeModel = "";
  resetAiProviderDraftTouched();
  reconcileAiSelectionState({
    resetRoutePreview: false,
    applyProviderConfig: options.applyProviderConfig
  });
}

async function syncAiSettingsToApi() {
  try {
    await saveAiPreferences(aiSettingsPayload());
    return true;
  } catch {
    return false;
  }
}

async function saveLocalOllamaProviderConfig() {
  if (!shouldUseOllamaLocalRuntime()) return null;
  if (!isBuiltInOllamaModel(settingsState.ai.localModel, currentOllamaModelTiers())) return null;
  const endpointUrl = String(settingsState.ai.localRuntimeChatEndpointUrl || OLLAMA_CHAT_ENDPOINT_URL).trim() || OLLAMA_CHAT_ENDPOINT_URL;
  const healthEndpointUrl = String(settingsState.ai.localRuntimeHealthEndpointUrl || OLLAMA_HEALTH_ENDPOINT_URL).trim() || OLLAMA_HEALTH_ENDPOINT_URL;
  const saved = await saveAiProviderConfig(aiProviderConfigPayload({
    providerId: preferredLocalProviderPresetForSelection(),
    authMode: "local_no_key",
    endpointUrl,
    healthEndpointUrl
  }));
  upsertAiProviderConfig(saved);
  resetAiProviderDraftTouched();
  return saved;
}
function currentOllamaModelTiers() {
  return currentOllamaModelTiersForState(settingsState.ai);
}


function hasLocalModel(modelName = "") {
  return modelNameExistsInList(modelName, settingsState.ai.localRuntimeModels);
}

function installedLocalModelReady(modelName = settingsState.ai.localModel) {
  return installedLocalModelReadyForState(settingsState.ai, modelName);
}

function localOllamaSetupActive() {
  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  return ["local_only", "hybrid"].includes(runtimeMode) && shouldUseOllamaLocalRuntime();
}

function clearLocalOllamaSelectionState(options = {}) {
  if (options.clearModel !== false) settingsState.ai.localModel = "";
  if (isLocalAdvancedModelRef(settingsState.ai.advancedModelRef)) settingsState.ai.advancedModelRef = "";
  settingsState.ai.routePreview = null;
}

function currentOllamaSetupGuide() {
  return normalizeOllamaSetupGuide(settingsState.ai.localRuntimeSetupGuide);
}

function recommendedOllamaModelName() {
  return currentOllamaSetupGuide()?.recommendedModel || OLLAMA_RECOMMENDED_MODEL;
}

function recommendedOllamaModelNames() {
  const names = [
    recommendedOllamaModelName(),
    OLLAMA_RECOMMENDED_MODEL,
    ...ollamaModelRecommendationProfiles(currentOllamaModelTiers()).map((item) => item.name)
  ].map((name) => String(name || "").trim()).filter(Boolean);
  return [...new Set(names)];
}

function primaryRecommendedOllamaModelName() {
  return recommendedOllamaModelNames()[0] || OLLAMA_RECOMMENDED_MODEL;
}

function nextMissingRecommendedOllamaModelName() {
  return recommendedOllamaModelNames().find((name) => !hasLocalModel(name)) || "";
}

function ollamaRecommendationHintText() {
  return ollamaModelRecommendationProfiles(currentOllamaModelTiers())
    .map((item) => `${item.name}：${item.label}`)
    .join("；");
}

function ollamaPullModelName() {
  const missingRecommended = nextMissingRecommendedOllamaModelName();
  if (missingRecommended) return missingRecommended;
  const recommended = primaryRecommendedOllamaModelName();
  return String(settingsState.ai.localModel || preferredLocalModelName(settingsState.ai.localRuntimeModels) || recommended).trim();
}

function applyOllamaRuntimePreview(runtime = null) {
  const models = Array.isArray(runtime?.models) ? runtime.models : [];
  settingsState.ai.localRuntimeStatus = String(runtime?.status || "unknown");
  settingsState.ai.localRuntimeReadinessStatus = String(runtime?.readinessStatus || runtime?.readiness_status || "unknown").trim() || "unknown";
  settingsState.ai.localRuntimeApiReachable = runtime?.apiReachable === true || runtime?.api_reachable === true;
  settingsState.ai.localRuntimeDefaultModelInstalled = runtime?.defaultModelInstalled === true || runtime?.default_model_installed === true;
  settingsState.ai.localRuntimeModels = models;
  settingsState.ai.localRuntimeModelTiers = Array.isArray(runtime?.modelTiers || runtime?.model_tiers)
    ? (runtime.modelTiers || runtime.model_tiers)
    : settingsState.ai.localRuntimeModelTiers;
  settingsState.ai.localRuntimeSetupGuide = normalizeOllamaSetupGuide(runtime?.setupGuide || runtime?.setup_guide);
  settingsState.ai.localRuntimeChatEndpointUrl = String(runtime?.chatEndpointUrl || runtime?.chat_endpoint_url || settingsState.ai.localRuntimeChatEndpointUrl || "").trim();
  settingsState.ai.localRuntimeHealthEndpointUrl = String(runtime?.healthEndpointUrl || runtime?.health_endpoint_url || settingsState.ai.localRuntimeHealthEndpointUrl || "").trim();
  settingsState.ai.localRuntimeError = settingsState.ai.localRuntimeStatus === "available" ? "" : String(runtime?.message || "");
  if (settingsState.ai.localRuntimeStatus === "available") {
    settingsState.ai.localRuntimeManagedStopPending = false;
    const nextLocalModel = selectedLocalModelNameForInstalledModels(settingsState.ai.localModel, models, currentOllamaModelTiers());
    settingsState.ai.localModel = nextLocalModel;
    if (!nextLocalModel) clearLocalOllamaSelectionState();
  }
  if (settingsState.ai.localModel) applyOllamaLocalModelDefaults();
  persistAiSettingsToStorage();
  return models;
}

function applyOllamaBootstrapResult(result = null) {
  if (!result || typeof result !== "object") return [];
  const runtime = result.runtime || null;
  const models = runtime ? applyOllamaRuntimePreview(runtime) : [];
  if (result.enabled?.preferences) {
    applyAiPreferencesToSettingsState(result.enabled.preferences, {
      applyProviderConfig: false
    });
  }
  if (result.enabled?.providerConfig) upsertAiProviderConfig(result.enabled.providerConfig);
  if (result.providerConfig) upsertAiProviderConfig(result.providerConfig);
  if (result.health && String(result.health.status || "").trim() !== "unknown") {
    settingsState.ai.providerHealthResult = { record: result.health };
  }
  const model = String(result.model || "").trim();
  if (model && modelNameExistsInList(model, settingsState.ai.localRuntimeModels)) {
    settingsState.ai.localModel = model;
    applyOllamaLocalModelDefaults();
  }
  persistAiSettingsToStorage();
  return models;
}

function ollamaRuntimeStateLabel() {
  if (settingsState.ai.localRuntimePulling) return "模型下载中";
  if (settingsState.ai.localRuntimeChecking) return "正在检测本地 AI";
  const readiness = String(settingsState.ai.localRuntimeReadinessStatus || "").trim();
  if (readiness === "ready") return "本地 AI 已就绪";
  if (readiness === "running_missing_model") return "正在运行但缺少模型";
  if (readiness === "installed_not_running") return "已安装但未运行";
  if (readiness === "not_installed") return "未检测到本地 AI";
  if (readiness === "check_failed") return "检测失败";
  const status = String(settingsState.ai.localRuntimeStatus || "").trim();
  if (status === "available" && installedLocalModelReady()) return "本地 AI 已就绪";
  if (status === "available") return "正在运行但缺少模型";
  if (status === "unavailable") return "未检测到本地 AI";
  return "等待检测本地 AI";
}

async function previewOllamaLocalAiBootstrapFromUi(options = {}) {
  return settingsAiRuntimeController.previewOllamaLocalAiBootstrapFromUi(options);
}

async function bootstrapOllamaLocalAiFromUi(options = {}) {
  return settingsAiRuntimeController.bootstrapOllamaLocalAiFromUi(options);
}

async function persistOllamaRuntimeSelectionAfterPreview() {
  return settingsAiRuntimeController.persistOllamaRuntimeSelectionAfterPreview();
}

async function detectOllamaModels(options = {}) {
  return settingsAiRuntimeController.detectOllamaModels(options);
}

async function startOllamaRuntimeFromUi() {
  return settingsAiRuntimeController.startOllamaRuntimeFromUi();
}

async function stopOllamaRuntimeFromUi() {
  return settingsAiRuntimeController.stopOllamaRuntimeFromUi();
}

async function selectInstalledLocalModelFromUi(modelName = "") {
  return settingsAiRuntimeController.selectInstalledLocalModelFromUi(modelName);
}

async function refreshAiRoutePreview(options = {}) {
  return settingsAiRuntimeController.refreshAiRoutePreview(options);
}

async function syncAiProviderConfigToApi() {
  return settingsAiRuntimeController.syncAiProviderConfigToApi();
}

async function pullRecommendedOllamaModel(modelName = "") {
  return settingsAiRuntimeController.pullRecommendedOllamaModel(modelName);
}

async function checkCurrentAiProviderHealth() {
  return settingsAiRuntimeController.checkCurrentAiProviderHealth();
}

function hideEditorHelper() {
  const helper = $("editorHelper");
  if (!helper) return;
  helper.classList.add("hidden");
  helper.hidden = true;
  helper.setAttribute("aria-hidden", "true");
  helper.style.pointerEvents = "none";
  const action = $("btnEditorHelperAction");
  if (action) {
    action.dataset.helperAction = "noop";
    action.dataset.targetNoteId = "";
  }
  if (typeof document !== "undefined" && helper.contains(document.activeElement)) {
    document.activeElement?.blur?.();
  }
}

function setImportRecordId(value) {
  importState.importRecordId = String(value || "").trim();
  const input = $("importRecordId");
  if (input) input.value = importState.importRecordId;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatClockTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  } catch {
    return raw;
  }
}

function primitiveEntries(value = {}) {
  return Object.entries(value || {}).filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item));
}

function compactValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

const importWorkspaceShellController = createImportWorkspaceShellController({
  getElement: $,
  importState,
  renderImportPageMount,
  renderImportToolbarMount,
  preferredImportDirectoryId,
  activeImportPreviewContext,
  selectionSummary,
  importConfirmButtonState,
  importTargetDirectories,
  directoryPathLabel,
  mountExportCardIntoImportShell
});

function currentImportToolbarValues() {
  return importWorkspaceShellController.currentToolbarValues();
}

function renderImportToolbar() {
  importWorkspaceShellController.renderToolbar();
}

function renderImportPageShell() {
  importWorkspaceShellController.renderPage();
}

function mountExportCardIntoImportShell() {
  const legacyExportCard = $("importPanel")?.querySelector(".export-card");
  const exportMount = $("exportCardMount");
  if (!legacyExportCard || !exportMount) return;
  if (legacyExportCard.parentElement === exportMount) return;
  legacyExportCard.remove();
}

function normalizeImportWorkspaceTab(tab = "import") {
  return importWorkspaceShellController.normalizeTab(tab);
}

function syncImportWorkspaceTabs() {
  importWorkspaceShellController.syncTabs();
}

function setImportWorkspaceTab(tab = "import") {
  importWorkspaceShellController.setTab(tab);
}

function renderAiInboxWorkspace() {
  renderAiInboxWorkspaceView({
    mount: $("aiInboxPanel"),
    state: aiInboxState
  });
}

function clearAiInboxActionNotice() {
  aiInboxState.actionNoticeArtifactId = "";
  aiInboxState.actionNoticeSuggestionId = "";
  aiInboxState.actionNotice = "";
  aiInboxState.actionNoticeTone = "";
}

function setAiInboxActionNotice(message = "", tone = "muted", artifactId = "", suggestionId = "") {
  aiInboxState.actionNoticeArtifactId = String(artifactId || aiInboxState.selectedArtifactId || aiInboxState.detail?.item?.artifactId || aiInboxState.detail?.artifact?.id || "").trim();
  aiInboxState.actionNoticeSuggestionId = String(suggestionId || aiInboxState.detail?.suggestion?.id || "").trim();
  aiInboxState.actionNotice = String(message || "").trim();
  aiInboxState.actionNoticeTone = aiInboxState.actionNotice ? String(tone || "muted").trim() : "";
  if (!aiInboxState.actionNotice) {
    aiInboxState.actionNoticeArtifactId = "";
    aiInboxState.actionNoticeSuggestionId = "";
  }
}

function recommendedAiInboxActionFromText(text = "") {
  const raw = String(text || "").toLowerCase();
  const match = raw.match(/(?:recommended\s+action|recommendedaction)\s*[=:：]\s*([a-z_ -]+)/i);
  const candidate = String(match?.[1] || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z_].*$/, "");
  const aliases = {
    accept: "accept_link",
    accept_link: "accept_link",
    create_link: "accept_link",
    promote: "promote_note",
    promote_note: "promote_note",
    create_note: "promote_note",
    ignore: "ignore",
    ignored: "ignore",
    archive: "ignore",
    needs_more_context: "needs_more_context",
    more_context: "needs_more_context"
  };
  return aliases[candidate] || "";
}

function resetAiInboxSummaryState(options = {}) {
  if (options.invalidate === true) aiInboxState.aiSummaryRequestToken += 1;
  aiInboxState.aiSummary = "";
  aiInboxState.aiSummaryArtifactId = "";
  aiInboxState.aiSummarySuggestionId = "";
  aiInboxState.aiSummaryMeta = "";
  aiInboxState.aiSummaryRecommendedAction = "";
  aiInboxState.aiSummaryError = "";
  aiInboxState.aiSummaryLoading = false;
}

function resetAiInboxEvaluationState(options = {}) {
  if (options.invalidate === true) aiInboxState.evaluationRequestToken += 1;
  if (options.clearSummary === true) aiInboxState.evaluationSummary = null;
  aiInboxState.evaluationError = "";
  aiInboxState.evaluationLoading = false;
}

function syncAiInboxSummaryFromDetail(detail = null) {
  const decisions = Array.isArray(detail?.artifact?.userDecisions || detail?.item?.userDecisions)
    ? detail?.artifact?.userDecisions || detail?.item?.userDecisions
    : [];
  const summaryDecision = decisions
    .slice()
    .reverse()
    .find((decision) => String(decision?.comment || "").includes("[AI Summary]"));
  if (!summaryDecision) {
    resetAiInboxSummaryState({ invalidate: false });
    return;
  }
  const comment = String(summaryDecision.comment || "").trim();
  const provider = comment.match(/^provider=(.+)$/m)?.[1]?.trim() || "";
  const model = comment.match(/^model=(.+)$/m)?.[1]?.trim() || "";
  const body = comment
    .replace(/^\[AI Summary]\s*/m, "")
    .replace(/^provider=.*$/m, "")
    .replace(/^model=.*$/m, "")
    .replace(/^recommendedAction=.*$/m, "")
    .trim();
  aiInboxState.aiSummary = body;
  aiInboxState.aiSummaryArtifactId = cleanText(detail?.item?.artifactId || detail?.artifact?.id);
  aiInboxState.aiSummarySuggestionId = cleanText(detail?.suggestion?.id);
  aiInboxState.aiSummaryMeta = [provider, model].filter(Boolean).join(" / ") || "persisted";
  aiInboxState.aiSummaryRecommendedAction = recommendedAiInboxActionFromText(comment);
  aiInboxState.aiSummaryError = "";
}

async function runAiInboxSummary(artifactId) {
  return runAiInboxSummaryForRuntime({
    aiInboxState,
    summarizeAiInboxItem,
    summaryRequestOptions: () => ({
      userMode: settingsState.ai.userMode,
      modelPack: settingsState.ai.modelPack,
      modelTier: "cheap_fast",
      privacyMode: settingsState.ai.routePreview?.privacy?.mode || ""
    }),
    recommendedAiInboxActionFromText,
    resetAiInboxSummaryState,
    loadAiInboxDetail,
    render: renderAiInboxWorkspace,
    setStatus,
    messages: {
      summarySucceededStatusMessage: () => "AI 摘要已生成",
      summaryFailedStatusMessage: (error) => `AI 摘要失败：${String(error?.message || error)}`
    }
  }, artifactId);
}

function renderScheduledTasksWorkspace() {
  const el = $("settingsScheduledTasksPanel");
  if (!el) return;
  el.innerHTML = renderScheduledTasksPanel({
    items: settingsState.ai.scheduledTasks,
    total: settingsState.ai.scheduledTasksTotal,
    templates: settingsState.ai.scheduledTaskTemplates,
    templatesLoading: settingsState.ai.scheduledTaskTemplatesLoading,
    templatesError: settingsState.ai.scheduledTaskTemplatesError,
    form: settingsState.ai.scheduledTaskForm,
    currentNoteId: state.selectedFileId || state.activeTabId || "",
    currentDirectoryId: state.selectedFolderId || "",
    filters: settingsState.ai.scheduledTaskFilters,
    loading: settingsState.ai.scheduledTasksLoading,
    actionLoading: settingsState.ai.scheduledTaskActionLoading,
    error: settingsState.ai.scheduledTasksError,
    runSummary: settingsState.ai.scheduledTaskRunSummary,
    compact: true,
    formOpen: settingsState.ai.scheduledTaskFormOpen
  });
}

function renderAiSuggestionsWorkspace() {
  renderAiSuggestionsWorkspaceView({
    mount: $("settingsAiSuggestionsPanel"),
    state: settingsState.ai
  });
}

function aiSuggestionFiltersFromUi() {
  return aiSuggestionFiltersFromWorkspace({
    getElement: $,
    state: settingsState.ai
  });
}

async function loadAiSuggestionDetail(suggestionId) {
  return loadAiSuggestionDetailForRuntime({
    aiState: settingsState.ai,
    fetchAiSuggestion,
    suggestionDetailFromResponse,
    rememberAiDebugSnapshot,
    render: renderAiSuggestionsWorkspace,
    setStatus
  }, suggestionId);
}

async function refreshAiSuggestions(options = {}) {
  return refreshAiSuggestionsForRuntime({
    aiState: settingsState.ai,
    fetchAiSuggestions,
    normalizeAiSuggestionFilters,
    rememberAiDebugSnapshot,
    render: renderAiSuggestionsWorkspace,
    setStatus,
    loadDetail: loadAiSuggestionDetail
  }, options);
}

function aiSuggestionReviewedContentFromUi(current = {}) {
  return aiSuggestionReviewedContentFromWorkspace({
    getElement: $,
    current
  });
}

function aiInboxSuggestionReviewedContentFromUi(current = {}) {
  const editorValue = $("aiInboxSuggestionContentEditor")?.value;
  if (editorValue === undefined) return current.content;
  const raw = String(editorValue || "");
  if (typeof current.content === "string") {
    const trimmed = raw.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {}
    }
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Reviewed suggestion content in AI inbox must be valid JSON before it can be marked edited or confirmed");
  }
}

function aiSuggestionReviewRetryNotice() {
  return "Detail changed while you were reviewing. Retry from the latest reviewed item.";
}

function aiSuggestionReviewRetryStatusMessage() {
  return "AI suggestion detail changed before the review action could run. Retry on the latest detail.";
}

function aiSuggestionAlreadyAppliedNotice(status = "") {
  return `This reviewed suggestion is already ${String(status || "").trim() || "updated"}.`;
}

function aiSuggestionReviewSafetyNotice() {
  return "Load the latest suggestion detail before running review actions.";
}

function aiSuggestionReviewSafetyStatusMessage() {
  return "AI suggestion detail is not ready yet. Retry after the latest detail loads.";
}

function aiSuggestionInFlightReviewNotice() {
  return "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion.";
}

function aiSuggestionInFlightReviewStatusMessage() {
  return "Another AI suggestion review is still running. Wait for it to finish before reviewing a different suggestion.";
}

function aiSuggestionAlreadyAppliedStatusMessage(status = "", suggestionId = "") {
  return `AI suggestion already ${String(status || "").trim() || "updated"}: ${String(suggestionId || "").trim()}`;
}

function aiSuggestionUpdateFailedStatusMessage(error) {
  return `AI suggestion update failed: ${String(error?.message || error)}`;
}

function aiSuggestionUpdatedStatusMessage(status = "", suggestionId = "") {
  return `AI suggestion ${String(status || "").trim() || "updated"}: ${String(suggestionId || "").trim()}`;
}

async function applyAiSuggestionStatus(suggestionId, status) {
  return applyAiSuggestionStatusForRuntime({
    aiState: settingsState.ai,
    suggestionDetailFromResponse,
    aiSuggestionReviewedContent: aiSuggestionReviewedContentFromUi,
    updateAiSuggestion,
    refreshAiSuggestions,
    loadAiSuggestionDetail,
    rememberAiDebugSnapshot,
    setStatus,
    render: renderAiSuggestionsWorkspace,
    aiSuggestionStatusLabel,
    messages: {
      reviewRetryNotice: aiSuggestionReviewRetryNotice,
      reviewRetryStatusMessage: aiSuggestionReviewRetryStatusMessage,
      reviewSafetyNotice: aiSuggestionReviewSafetyNotice,
      reviewSafetyStatusMessage: aiSuggestionReviewSafetyStatusMessage,
      inFlightReviewNotice: aiSuggestionInFlightReviewNotice,
      inFlightReviewStatusMessage: aiSuggestionInFlightReviewStatusMessage,
      alreadyAppliedNotice: aiSuggestionAlreadyAppliedNotice,
      alreadyAppliedStatusMessage: aiSuggestionAlreadyAppliedStatusMessage,
      updateFailedStatusMessage: aiSuggestionUpdateFailedStatusMessage,
      updatedStatusMessage: aiSuggestionUpdatedStatusMessage
    }
  }, suggestionId, status);
}

const scheduledTasksRuntimeController = createScheduledTasksRuntimeController(() => ({
  addSystemMessage,
  aiInboxState,
  fetchAiScheduledTasks,
  fetchAiScheduledTaskTemplates,
  getElement: $,
  globalPendingAiInboxFilters,
  normalizeAiInboxFilters,
  refreshAiInbox,
  refreshAiInboxEvaluationSummary,
  refreshScheduledTasks,
  rememberAiDebugSnapshot,
  render: renderScheduledTasksWorkspace,
  runDueAiScheduledTasks,
  saveAiScheduledTask,
  scheduledTaskReviewArtifactCount,
  scheduledTaskSystemMessageForArtifacts,
  setStatus,
  settingsState,
  state,
  updateAiScheduledTaskStatusWithOptions,
  window
}));

function scheduledTaskFiltersFromUi() {
  return scheduledTasksRuntimeController.filtersFromUi();
}

function scheduledTaskTemplateById(templateId = "") {
  return scheduledTasksRuntimeController.templateById(templateId);
}

function scheduledTaskFormFromUi() {
  return scheduledTasksRuntimeController.formFromUi();
}

function resetScheduledTaskForm(overrides = {}) {
  return scheduledTasksRuntimeController.resetForm(overrides);
}

function applyScheduledTaskTemplateToForm(templateId = "") {
  return scheduledTasksRuntimeController.applyTemplateToForm(templateId);
}

async function refreshScheduledTaskTemplates(options = {}) {
  return scheduledTasksRuntimeController.refreshTemplates(options);
}

async function saveScheduledTaskFromUi() {
  return scheduledTasksRuntimeController.saveFromUi();
}

function editScheduledTaskFromList(scheduledTaskId = "") {
  return scheduledTasksRuntimeController.editFromList(scheduledTaskId);
}

async function refreshScheduledTasks(options = {}) {
  return scheduledTasksRuntimeController.refreshTasks(options);
}

async function setScheduledTaskStatus(scheduledTaskId, status) {
  return scheduledTasksRuntimeController.setTaskStatus(scheduledTaskId, status);
}

async function runDueScheduledTasksFromUi() {
  return scheduledTasksRuntimeController.runDueFromUi();
}

function aiInboxFiltersFromUi() {
  return aiInboxFiltersFromWorkspace({
    getElement: $,
    state: aiInboxState
  });
}

function aiInboxFeedbackFromUi() {
  return aiInboxFeedbackFromWorkspace(document);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function rememberAiDebugSnapshot(key, response) {
  if (!settingsState.ai.debugSnapshots || !Object.prototype.hasOwnProperty.call(settingsState.ai.debugSnapshots, key)) return;
  const runtime = cloneJson(response);
  if (runtime && typeof runtime === "object" && !Array.isArray(runtime) && Object.prototype.hasOwnProperty.call(runtime, "canonical")) {
    delete runtime.canonical;
  }
  settingsState.ai.debugSnapshots[key] = {
    capturedAt: new Date().toISOString(),
    runtime,
    canonical: cloneJson(response?.canonical || null)
  };
  if (state.module === "settings") renderSettingsPanel();
}

function aiAdoptionEventFromCanonical(event = {}) {
  return {
    adoptionEventId: String(event.adoption_event_id || "").trim(),
    subjectKind: String(event.subject_kind || "").trim(),
    subjectId: String(event.subject_id || "").trim(),
    eventType: String(event.event_type || "").trim(),
    actorType: String(event.actor_type || "").trim(),
    actorId: String(event.actor_id || "").trim(),
    target: {
      kind: String(event.target?.kind || "").trim(),
      id: String(event.target?.id || "").trim(),
      field: String(event.target?.field || "").trim()
    },
    comment: String(event.comment || "").trim(),
    feedback: {
      useful: event.feedback?.useful === true,
      noisy: event.feedback?.noisy === true,
      wrong: event.feedback?.wrong === true,
      alreadyKnown: event.feedback?.already_known === true,
      privacyConcern: event.feedback?.privacy_concern === true
    },
    metadata: {
      fromStatus: String(event.metadata?.from_status || "").trim(),
      toStatus: String(event.metadata?.to_status || "").trim(),
      noteId: String(event.metadata?.note_id || "").trim()
    },
    createdAt: String(event.created_at || "").trim()
  };
}

function aiSuggestionTraceFromCanonical(trace = {}) {
  return {
    suggestionId: String(trace.suggestion_id || "").trim(),
    sourceArtifactId: String(trace.source_artifact_id || "").trim(),
    primarySourceNoteId: String(trace.primary_source_note_id || "").trim(),
    sourceNoteIds: Array.isArray(trace.source_note_ids) ? [...trace.source_note_ids] : [],
    targetNoteId: String(trace.target_note_id || "").trim(),
    targetField: String(trace.target_field || "").trim(),
    suggestionStatus: String(trace.suggestion_status || "").trim()
  };
}

function aiInboxDetailFromResponse(response = {}) {
  const canonical = response?.canonical || {};
  const item = canonical.item ? aiInboxItemFromCanonical(canonical.item) : response?.item || null;
  const artifact = canonical.artifact ? aiArtifactFromCanonical(canonical.artifact) : response?.artifact || null;
  const suggestion = canonical.suggestion ? aiSuggestionFromCanonical(canonical.suggestion) : response?.suggestion || null;
  const suggestionReviewEvents =
      Array.isArray(canonical.suggestion_review_events)
        ? canonical.suggestion_review_events.map((event) => suggestionReviewEventFromCanonical(event))
        : Array.isArray(response?.suggestionReviewEvents)
          ? response.suggestionReviewEvents
          : [];
  const latestSuggestionReviewEvent = canonical.latest_suggestion_review_event
      ? suggestionReviewEventFromCanonical(canonical.latest_suggestion_review_event)
      : response?.latestSuggestionReviewEvent || null;
  const trace = canonical.trace ? suggestionTraceFromCanonical(canonical.trace) : response?.trace || null;
  return { item, artifact, suggestion, suggestionReviewEvents, latestSuggestionReviewEvent, trace };
}

function aiInboxDetailMatchesSelection() {
  const selectedArtifactId = String(aiInboxState.selectedArtifactId || "").trim();
  const detailArtifactId = String(aiInboxState.detail?.item?.artifactId || aiInboxState.detail?.artifact?.id || "").trim();
  return Boolean(selectedArtifactId) && detailArtifactId === selectedArtifactId;
}

function currentAiInboxArtifactForSelection(artifactId = "") {
  const cleanArtifactId = String(artifactId || aiInboxState.selectedArtifactId || "").trim();
  if (!cleanArtifactId) return null;
  if (aiInboxDetailMatchesSelection()) {
    const detailArtifact = aiInboxState.detail?.artifact || null;
    if (String(detailArtifact?.id || "").trim() === cleanArtifactId) return detailArtifact;
  }
  return null;
}

function currentAiInboxSuggestionForSelection(artifactId = "") {
  const cleanArtifactId = String(artifactId || aiInboxState.selectedArtifactId || "").trim();
  if (!cleanArtifactId || !aiInboxDetailMatchesSelection()) return null;
  const detailArtifactId = String(aiInboxState.detail?.item?.artifactId || aiInboxState.detail?.artifact?.id || "").trim();
  if (detailArtifactId !== cleanArtifactId) return null;
  return aiInboxState.detail?.suggestion || null;
}

function latestArtifactDecision(artifact = null) {
  const decisions = Array.isArray(artifact?.userDecisions) ? artifact.userDecisions : [];
  return decisions.length ? decisions[decisions.length - 1] : null;
}

async function loadAiInboxDetail(artifactId) {
  return loadAiInboxDetailForRuntime({
    aiInboxState,
    fetchAiInboxItemWithOptions,
    aiInboxDetailFromResponse,
    rememberAiDebugSnapshot,
    syncAiInboxSummaryFromDetail,
    resetAiInboxSummaryState,
    clearAiInboxActionNotice,
    render: renderAiInboxWorkspace,
    setStatus
  }, artifactId);
}

async function refreshAiInbox({ silent = false, preserveDetail = false } = {}) {
  return refreshAiInboxForRuntime({
    aiInboxState,
    fetchAiInbox,
    normalizeAiInboxFilters,
    aiInboxItemFromCanonical,
    rememberAiDebugSnapshot,
    clearAiInboxActionNotice,
    resetAiInboxSummaryState,
    render: renderAiInboxWorkspace,
    setStatus,
    loadDetail: loadAiInboxDetail
  }, { silent, preserveDetail });
}

async function refreshAiInboxEvaluationSummary({ silent = false } = {}) {
  return refreshAiInboxEvaluationSummaryForRuntime({
    aiInboxState,
    fetchAiInboxEvaluationSummary,
    normalizeAiInboxFilters,
    render: renderAiInboxWorkspace,
    setStatus,
    messages: {
      evaluationFailedStatusMessage: (error) => `AI 建议处理统计加载失败：${String(error?.message || error)}`
    }
  }, { silent });
}

async function openAiInboxModule() {
  await Promise.all([
    refreshAiInbox(),
    refreshAiInboxEvaluationSummary()
  ]);
  if (aiInboxState.selectedArtifactId && !aiInboxState.detail) {
    await loadAiInboxDetail(aiInboxState.selectedArtifactId);
  }
}

async function applyAiInboxFiltersFromUi() {
  aiInboxState.filters = aiInboxFiltersFromUi();
  aiInboxState.detail = null;
  aiInboxState.selectedArtifactId = "";
  await openAiInboxModule();
  setStatus("AI 建议已刷新", "ok");
}

async function openAiInboxNote(noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return false;
  try {
    if (!state.notes.some((item) => item.id === cleanNoteId)) {
      const fetched = await fetchNote(cleanNoteId);
      if (fetched) state.notes = [mapNoteItem(fetched), ...state.notes.filter((item) => item.id !== cleanNoteId)];
    }
    activateModule("explorer");
    openNoteById(cleanNoteId, { focusDistillation: true, preferTitleSelection: false });
    setStatus(`已回到笔记 ${cleanNoteId}，请在编辑器内继续处理这条建议`, "ok");
    return true;
  } catch (error) {
    setStatus(`打开来源笔记失败：${String(error?.message || error)}`, "warn");
    return false;
  }
}

async function finalizeAiInboxActionRefresh({ preserveDetail = false } = {}) {
  return finalizeAiInboxActionRefreshForRuntime({
    aiInboxState,
    refreshAiInbox,
    refreshAiInboxEvaluationSummary,
    loadAiInboxDetail
  }, { preserveDetail });
}

async function recordAiInboxReviewDecision(decision) {
  return recordAiInboxReviewDecisionForRuntime({
    aiInboxState,
    recordAiInboxDecision,
    aiInboxFeedback: aiInboxFeedbackFromUi,
    commentText: () => $("aiInboxDecisionComment")?.value || "",
    aiInboxDetailFromResponse,
    loadAiInboxDetail,
    rememberAiDebugSnapshot,
    finalizeAiInboxActionRefresh,
    aiInboxActionLabel,
    setStatus,
    setAiInboxActionNotice,
    clearAiInboxActionNotice,
    render: renderAiInboxWorkspace,
    messages: {
      reviewSafetyNotice: aiInboxReviewSafetyNotice,
      reviewSafetyStatusMessage: aiInboxReviewSafetyStatusMessage,
      reviewRetryNotice: aiInboxReviewRetryNotice,
      reviewRetryStatusMessage: aiInboxReviewRetryStatusMessage,
      inFlightReviewActionNotice: aiInboxInFlightReviewActionNotice,
      inFlightReviewActionStatusMessage: aiInboxInFlightReviewActionStatusMessage,
      decisionSucceededStatusMessage: aiInboxDecisionSucceededStatusMessage,
      decisionFailedStatusMessage: aiInboxDecisionFailedStatusMessage
    }
  }, decision);
}

async function applyAiInboxRecommendedAction(action = "") {
  return applyAiInboxRecommendedActionForRuntime({
    aiInboxState,
    confirm: (message) => window.confirm(message),
    appendDecisionComment: (comment) => {
      const commentEl = $("aiInboxDecisionComment");
      const nextComment = `${commentEl?.value || ""}\n\n${comment}`.trim();
      if (commentEl) commentEl.value = nextComment;
    },
    acceptLink: acceptAiInboxLinkSuggestion,
    adoptFieldSuggestion: adoptAiInboxFieldSuggestionDraft,
    promoteNote: promoteAiInboxArtifactToNote,
    recordDecision: recordAiInboxReviewDecision,
    loadAiInboxDetail,
    setAiInboxActionNotice,
    setStatus,
    render: renderAiInboxWorkspace,
    messages: {
      reviewSafetyNotice: aiInboxReviewSafetyNotice,
      reviewSafetyStatusMessage: aiInboxReviewSafetyStatusMessage,
      reviewRetryNotice: aiInboxReviewRetryNotice,
      reviewRetryStatusMessage: aiInboxReviewRetryStatusMessage
    }
  }, action);
}

async function acceptAiInboxLinkSuggestion(artifactId) {
  return acceptAiInboxLinkSuggestionForRuntime({
    aiInboxState,
    currentAiInboxArtifactForSelection,
    latestArtifactDecision,
    acceptAiInboxLink,
    commentText: () => $("aiInboxDecisionComment")?.value || "",
    aiInboxDetailFromResponse,
    loadAiInboxDetail,
    rememberAiDebugSnapshot,
    finalizeAiInboxActionRefresh,
    afterFinalize: async () => {
      if (state.module === "graph") await refreshDirectoryGraph();
    },
    setStatus,
    setAiInboxActionNotice,
    clearAiInboxActionNotice,
    render: renderAiInboxWorkspace,
    messages: {
      reviewSafetyNotice: aiInboxReviewSafetyNotice,
      reviewSafetyStatusMessage: aiInboxReviewSafetyStatusMessage,
      reviewRetryNotice: aiInboxReviewRetryNotice,
      reviewRetryStatusMessage: aiInboxReviewRetryStatusMessage,
      inFlightReviewActionNotice: aiInboxInFlightReviewActionNotice,
      inFlightReviewActionStatusMessage: aiInboxInFlightReviewActionStatusMessage,
      linkAlreadyAppliedNotice: aiInboxLinkAlreadyAppliedNotice,
      linkAlreadyAppliedStatusMessage: aiInboxLinkAlreadyAppliedStatusMessage,
      linkAcceptedStatusMessage: aiInboxLinkAcceptedStatusMessage,
      linkAcceptFailedStatusMessage: aiInboxLinkAcceptFailedStatusMessage
    }
  }, artifactId);
}

async function promoteAiInboxArtifactToNote(artifactId) {
  return promoteAiInboxArtifactToNoteForRuntime({
    aiInboxState,
    currentAiInboxArtifactForSelection,
    latestArtifactDecision,
    promoteAiInboxNote,
    commentText: () => $("aiInboxDecisionComment")?.value || "",
    aiInboxDetailFromResponse,
    loadAiInboxDetail,
    rememberAiDebugSnapshot,
    finalizeAiInboxActionRefresh,
    beforeFinalize: async (result) => {
      if (result.note?.id) {
        state.notes = [mapNoteItem(result.note), ...state.notes.filter((item) => item.id !== result.note.id)];
      }
    },
    afterFinalize: async (result, context) => {
      if (result.note?.id && !context.selectionChangedDuringAction) {
        activateModule("explorer");
        openNoteById(result.note.id);
      }
    },
    setStatus,
    setAiInboxActionNotice,
    clearAiInboxActionNotice,
    render: renderAiInboxWorkspace,
    messages: {
      reviewSafetyNotice: aiInboxReviewSafetyNotice,
      reviewSafetyStatusMessage: aiInboxReviewSafetyStatusMessage,
      reviewRetryNotice: aiInboxReviewRetryNotice,
      reviewRetryStatusMessage: aiInboxReviewRetryStatusMessage,
      inFlightReviewActionNotice: aiInboxInFlightReviewActionNotice,
      inFlightReviewActionStatusMessage: aiInboxInFlightReviewActionStatusMessage,
      notePromotionAlreadyAppliedNotice: aiInboxNotePromotionAlreadyAppliedNotice,
      notePromotionAlreadyAppliedStatusMessage: aiInboxNotePromotionAlreadyAppliedStatusMessage,
      notePromotionSucceededStatusMessage: aiInboxNotePromotionSucceededStatusMessage,
      notePromotionFailedStatusMessage: aiInboxNotePromotionFailedStatusMessage
    }
  }, artifactId);
}

async function adoptAiInboxFieldSuggestionDraft(artifactId, expectedSuggestionId = "") {
  return adoptAiInboxFieldSuggestionDraftForRuntime({
    aiInboxState,
    currentAiInboxArtifactForSelection,
    currentAiInboxSuggestionForSelection,
    latestArtifactDecision,
    aiSuggestionStatusLabel,
    adoptAiInboxFieldSuggestion,
    aiInboxFeedback: aiInboxFeedbackFromUi,
    commentText: () => $("aiInboxDecisionComment")?.value || "",
    aiInboxDetailFromResponse,
    loadAiInboxDetail,
    rememberAiDebugSnapshot,
    finalizeAiInboxActionRefresh,
    beforeFinalize: async (result) => {
      if (result.note?.id) {
        state.notes = [mapNoteItem(result.note), ...state.notes.filter((item) => item.id !== result.note.id)];
      }
    },
    afterFinalize: async (result, context) => {
      if (result.note?.id && !context.selectionChangedDuringAction) {
        activateModule("explorer");
        openNoteById(result.note.id, { focusDistillation: true });
      }
    },
    setStatus,
    setAiInboxActionNotice,
    clearAiInboxActionNotice,
    render: renderAiInboxWorkspace,
    messages: {
      reviewSafetyNotice: aiInboxReviewSafetyNotice,
      reviewSafetyStatusMessage: aiInboxReviewSafetyStatusMessage,
      reviewRetryNotice: aiInboxReviewRetryNotice,
      reviewRetryStatusMessage: aiInboxReviewRetryStatusMessage,
      inFlightReviewActionNotice: aiInboxInFlightReviewActionNotice,
      inFlightReviewActionStatusMessage: aiInboxInFlightReviewActionStatusMessage,
      fieldSuggestionDraftAlreadyAppliedNotice: aiInboxFieldSuggestionDraftAlreadyAppliedNotice,
      fieldSuggestionDraftAlreadyAppliedStatusMessage: aiInboxFieldSuggestionDraftAlreadyAppliedStatusMessage,
      fieldSuggestionDraftSucceededStatusMessage: aiInboxFieldSuggestionDraftSucceededStatusMessage,
      fieldSuggestionDraftFailedStatusMessage: aiInboxFieldSuggestionDraftFailedStatusMessage
    }
  }, artifactId, expectedSuggestionId);
}

async function applyAiInboxSuggestionStatus(status, expectedSuggestionId = "") {
  return applyAiInboxSuggestionStatusForRuntime({
    aiInboxState,
    updateAiSuggestion,
    adoptAiInboxFieldSuggestionDraft,
    aiInboxSuggestionReviewedContent: aiInboxSuggestionReviewedContentFromUi,
    commentText: () => $("aiInboxDecisionComment")?.value || "",
    aiSuggestionStatusLabel,
    loadAiInboxDetail,
    rememberAiDebugSnapshot,
    finalizeAiInboxActionRefresh,
    setStatus,
    setAiInboxActionNotice,
    clearAiInboxActionNotice,
    render: renderAiInboxWorkspace,
    messages: {
      reviewSafetyNotice: aiInboxReviewSafetyNotice,
      reviewSafetyStatusMessage: aiInboxReviewSafetyStatusMessage,
      reviewRetryNotice: aiInboxReviewRetryNotice,
      reviewRetryStatusMessage: aiInboxReviewRetryStatusMessage,
      inFlightReviewActionNotice: aiInboxInFlightReviewActionNotice,
      inFlightReviewActionStatusMessage: aiInboxInFlightReviewActionStatusMessage,
      suggestionAlreadyAppliedNotice: aiInboxSuggestionAlreadyAppliedNotice || aiSuggestionAlreadyAppliedNotice,
      suggestionAlreadyAppliedStatusMessage: aiInboxSuggestionAlreadyAppliedStatusMessage,
      suggestionUpdatedStatusMessage: aiInboxSuggestionUpdatedStatusMessage,
      suggestionUpdateFailedStatusMessage: aiInboxSuggestionUpdateFailedStatusMessage
    }
  }, status, expectedSuggestionId);
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const NOTE_SAVE_REFLECTION_PROMPTS = [
  "这段材料你真正理解成什么？",
  "你为什么要保留它？",
  "它会支持什么判断？"
];

const ORIGINALITY_REASON_LABELS = {
  similarity_above_block_threshold: "它仍然过于贴近关联文献的原句",
  similarity_above_warn_threshold: "它还没有完全转成你自己的判断语言",
  citation_locator_missing: "它缺少可追溯的引用定位",
  core_claim_empty: "它的核心判断还不够清楚"
};

function noteSaveReflectionHint(prefix = "") {
  const head = String(prefix || "").trim();
  return `${head ? `${head} ` : ""}${NOTE_SAVE_REFLECTION_PROMPTS.join("  ")}`.trim();
}

function originalityReasonSummary(reasons = []) {
  const labels = [...new Set((reasons || []).map((reason) => ORIGINALITY_REASON_LABELS[String(reason || "").trim()] || "").filter(Boolean))];
  return labels.join("；");
}

function noteSaveFailureFeedback(error) {
  const code = String(error?.code || "").trim();
  if (code === "LITERATURE_PARAPHRASE_REQUIRED") {
    return {
      ok: false,
      saveMode: "blocked",
      saveMessage: noteSaveReflectionHint("当前文件：缺少转述，暂不能标记完成。"),
      statusTone: "warn",
      statusMessage: "保存被拦下：先写出你真正理解后的转述，再把文献笔记标记为已完成。"
    };
  }

  if (code === "PERMANENT_ORIGINALITY_BLOCKED") {
    const originality = error?.details?.originality || {};
    const similarity = Math.round((Number(originality.similarity) || 0) * 100);
    const reasons = originalityReasonSummary(originality.reasons);
    const reasonSuffix = reasons ? ` ${reasons}。` : "";
    return {
      ok: false,
      saveMode: "blocked",
      saveMessage: noteSaveReflectionHint(
        `当前文件：原创性检测阻止落盘。相似度约 ${similarity}%。先把外部语言改写成你自己的判断，再继续保存。`
      ),
      statusTone: "warn",
      statusMessage: `保存被拦下：这条永久笔记仍然过于贴近关联文献原文（相似度 ${similarity}%）。${reasonSuffix}`.trim()
    };
  }

  return {
    ok: false,
    saveMode: "error",
    saveMessage: "当前文件：保存失败，修改仍保留在编辑器中。",
    statusTone: "warn",
    statusMessage: `保存失败（修改已保留在编辑器中）：${String(error?.message || error)}`
  };
}

function renderThinkingStatusBadge(value, className = "thinking-status-badge") {
  return renderThinkingStatusBadgeHtml(value, { className, escapeHtml });
}

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


function suggestedWritingProjectTitle(noteIds = []) {
  return computeSuggestedWritingProjectTitle(noteIds, { noteById: writingNoteById });
}

function normalizeWritingProjectTitleSeed(title = "") {
  return computeNormalizeWritingProjectTitleSeed(title);
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
  const shouldHydrate =
    !currentText ||
    currentText === "尚未开始写作项目。" ||
    currentText === "尚未开始项目。" ||
    currentText === "请先创建写作项目" ||
    currentText === "请先创建项目";
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

async function ensureNotesLoaded(noteIds, { force = false } = {}) {
  const uniqueIds = [...new Set((noteIds || []).map((item) => String(item || "").trim()).filter(Boolean))];
  for (const noteId of uniqueIds) {
    const existing = writingNoteById(noteId);
    if (existing) {
      if (force && !isLocalOnlyNote(existing)) {
        try {
          const fetched = await fetchNote(noteId);
          if (!fetched) continue;
          const mapped = mapNoteItem(fetched);
          state.notes = [mapped, ...state.notes.filter((item) => item.id !== mapped.id)];
        } catch {}
        continue;
      }
      if (!existing.bodyLoaded && !isLocalOnlyNote(existing)) {
        await ensureNoteBodyLoaded(noteId);
      }
      continue;
    }
    try {
      const fetched = await fetchNote(noteId);
      if (!fetched) continue;
      const mapped = mapNoteItem(fetched);
      state.notes = [mapped, ...state.notes.filter((item) => item.id !== mapped.id)];
    } catch {}
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

function literatureQueueLaneForNote(note) {
  return computeLiteratureQueueLaneForNote(note, {
    literatureTemplateSectionLabelCandidates,
    normalizeFieldText,
    parseLiteratureWorkspace
  });
}

function rankedLiteratureQueueNotes(notes = []) {
  return computeRankedLiteratureQueueNotes(notes, {
    literatureTemplateSectionLabelCandidates,
    normalizeFieldText,
    parseLiteratureWorkspace
  });
}

function preferredLiteratureQueueNoteId(noteIds = [], { targetLane = "" } = {}) {
  return computePreferredLiteratureQueueNoteId(noteIds, { targetLane }, { rankedLiteratureQueueNotes, writingNoteById });
}

function setLiteratureQueueFocus(noteIds = [], label = "") {
  state.literatureQueueFocusNoteIds = [...new Set((noteIds || []).map((item) => String(item || "").trim()).filter(Boolean))];
  state.literatureQueueFocusLabel = state.literatureQueueFocusNoteIds.length ? String(label || "").trim() : "";
}

function clearLiteratureQueueFocus() {
  setLiteratureQueueFocus([], "");
}

async function openImportedLiteratureQueue() {
  const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "literature");
  if (!noteIds.length) {
    setStatus("当前导入结果里没有可继续处理的 LiteratureNote", "warn");
    return false;
  }
  await ensureNotesLoaded(noteIds);
  const importRecordId = importPayloadRecordId(importState.lastResultPayload || {}) || importState.importRecordId || "";
  setLiteratureQueueFocus(noteIds, importRecordId ? `导入批次 ${importRecordId}` : "本次导入");
  activateModule("explorer");
  const opened = openNoteById(noteIds[0], { preferTitleSelection: false });
  if (!opened) return false;
  setStatus(`已打开 ${noteIds.length} 条导入文献中的第一条，并只显示本次导入的待转述队列`, "ok");
  return true;
}

const writingEntryRuntimeController = createWritingEntryRuntimeController(() => ({
  $,
  activateModule,
  clearWritingFocusedCandidateScope,
  clearWritingSourceIndexIds,
  ensureNotesLoaded,
  fetchWritingProject,
  listIndexCards,
  listProjectDraftVersions,
  listProjectScaffolds,
  listWritingProjects,
  parseWritingBasketIds,
  refreshWritingRelationCounts,
  renderWritingPanel,
  resetWritingLocalBookIdeas,
  resetWritingProjectContext,
  setSelectedWritingThemeIndex,
  setStatus,
  setWritingBasketIds,
  setWritingFocusedCandidateScope,
  setWritingSourceIndexIds,
  showWritingResult,
  statusRevision,
  syncWritingResultFromCurrentState,
  writingState,
  writingThemeIndexScopeDirectoryId
}));

async function openWritingModule(options = {}) {
  return writingEntryRuntimeController.openWritingModule(options);
}

function beginWritingEntry(noteIds = [], options = {}) {
  return writingEntryRuntimeController.beginWritingEntry(noteIds, options);
}

function continueWritingEntry(noteIds = [], options = {}) {
  return writingEntryRuntimeController.continueWritingEntry(noteIds, options);
}

const writingProjectRuntimeController = createWritingProjectRuntimeController(() => ({
  $,
  addSystemMessage,
  analyzeWritingWithStrongModel,
  beginWritingEntry,
  createWritingProject,
  currentWritingBookStructure,
  ensureNotesLoaded,
  importState,
  loadWritingDraftVersions,
  loadWritingProjectsList,
  loadWritingScaffoldVersions,
  openWritingModule,
  parseWritingBasketIds,
  populateWritingFormFromProject,
  renderWritingPanel,
  setStatus,
  showWritingResult,
  suggestedWritingProjectTitle,
  syncWritingLocalBookIdeasFromProject,
  window,
  writingKnownNoteById,
  writingState
}));

async function createWritingProjectFromCurrentBasket() {
  return writingProjectRuntimeController.createWritingProjectFromCurrentBasket();
}

async function addImportedPermanentNotesToWritingBasket({ openWriting = false } = {}) {
  const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "permanent");
  if (!noteIds.length) {
    setStatus("当前导入结果里没有可加入写作篮的 PermanentNote", "warn");
    return false;
  }
  await ensureNotesLoaded(noteIds);
  if (openWriting) {
    beginWritingEntry(noteIds, {
      title: suggestedWritingProjectTitle(noteIds),
      source: "import_permanent_notes"
    });
    activateModule("writing");
    await openWritingModule({ statusMessage: `已把 ${noteIds.length} 条导入永久笔记加入写作篮，并打开写作中心` });
  } else {
    clearWritingSourceIndexIds();
    addWritingBasketIds(noteIds);
    if (!$("writingTitle")?.value.trim()) {
      const firstNote = noteIds.map((id) => writingNoteById(id)).find(Boolean);
      if (firstNote?.title) $("writingTitle").value = normalizeWritingProjectTitleSeed(firstNote.title);
    }
    renderWritingPanel();
    setStatus(`已把 ${noteIds.length} 条导入永久笔记加入写作篮`, "ok");
  }
  return true;
}


async function useThemeIndexAsWritingEntry(indexCardId, { replaceBasket = false, resetContext = false, source = "writing_theme_index" } = {}) {
  const id = String(indexCardId || "").trim();
  if (!id) throw new Error("indexCardId is required");
  const indexCard = writingThemeIndexById(id) || (await fetchIndexCard(id));
  const noteIds = uniqueStrings(indexCard?.item_note_ids || indexCard?.items?.map((item) => item.note_id) || []);
  if (!noteIds.length) throw new Error("theme index is empty");
  await ensureNotesLoaded(noteIds);
  const entryPlan = planWritingThemeIndexEntry({
    existingNoteIds: parseWritingBasketIds(),
    themeNoteIds: noteIds,
    resetContext,
    replaceBasket
  });
  if (entryPlan.action === "begin-entry") {
    beginWritingEntry(noteIds, {
      title: normalizeWritingProjectTitleSeed(indexCard.title || suggestedWritingProjectTitle(noteIds)),
      source
    });
    setWritingSourceIndexIds([id]);
  } else if (entryPlan.action === "replace-entry") {
    continueWritingEntry(noteIds, {
      title: normalizeWritingProjectTitleSeed(indexCard.title || suggestedWritingProjectTitle(noteIds)),
      source,
      sourceIndexIds: [id],
      preserveSourceIndexIds: entryPlan.preserveSourceIndexIds
    });
  } else {
    if (entryPlan.action === "append-entry") {
      continueWritingEntry(noteIds, {
        title: normalizeWritingProjectTitleSeed(indexCard.title || suggestedWritingProjectTitle(noteIds)),
        source,
        sourceIndexIds: [id]
      });
    } else {
      const nextSourceIndexIds = resolveWritingSourceIndexIds({
        existingSourceIndexIds: writingState.sourceIndexIds,
        incomingSourceIndexIds: [id],
        preserveExisting: true
      });
      setWritingSourceIndexIds(nextSourceIndexIds);
      setSelectedWritingThemeIndex(
        resolveWritingSelectedThemeIndexId({
          currentSelectedThemeIndexId: writingState.selectedThemeIndexId,
          nextSourceIndexIds
        })
      );
    }
  }
  if (!$("writingTitle")?.value.trim()) $("writingTitle").value = normalizeWritingProjectTitleSeed(indexCard.title || suggestedWritingProjectTitle(noteIds));
  renderWritingPanel();
  return {
    indexCard,
    noteIds,
    addedNoteIds: entryPlan.addedNoteIds,
    addedCount: entryPlan.addedNoteIds.length
  };
}

async function saveWritingBasketAsThemeIndex() {
  const basketNoteIds = parseWritingBasketIds();
  if (!basketNoteIds.length) throw new Error("writing basket is empty");
  await ensureNotesLoaded(basketNoteIds);
  const suggestedTitle = suggestedThemeIndexTitle(basketNoteIds);
  const title = window.prompt("主题索引标题", suggestedTitle);
  if (title === null) return null;
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) throw new Error("title is required");
  const summarySeed = String($("writingGoal")?.value || "").trim() || "把这一组成熟永久笔记保留为后续可续接的写作入口。";
  const summary = window.prompt("主题索引说明", summarySeed);
  if (summary === null) return null;
  const notes = basketNoteIds.map((id) => writingNoteById(id)).filter(Boolean);
  const card = await createIndexCard({
    directoryId: writingThemeIndexScopeDirectoryId(),
    indexType: "topic",
    title: cleanTitle,
    summary: String(summary || "").trim(),
    noteIds: basketNoteIds,
    items: basketNoteIds.map((noteId, index) => ({
      noteId,
      shortLabel: notes[index]?.title || "",
      rationale: ""
    }))
  });
  setWritingSourceIndexIds([card.id]);
  await loadWritingThemeIndexes();
  renderWritingPanel();
  return card;
}

async function createWritingProjectFromImportedPermanentNotes() {
  return writingProjectRuntimeController.createWritingProjectFromImportedPermanentNotes();
}

async function refreshWritingProjectState() {
  const writingProjectId = String(writingState.project?.id || "").trim();
  if (!writingProjectId) return null;
  try {
    const project = await fetchWritingProject(writingProjectId);
    writingState.project = project;
    renderWritingPanel();
    return project;
  } catch {
    return writingState.project;
  }
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

async function refreshImportedNotesView() {
  try {
    await syncDirectoriesFromApi();
    await syncNotesForDirectory(state.selectedFolderId);
    renderAll();
  } catch {}
}

function mapNoteItem(item) {
  return computeMapNoteItem(item, {
    generatedOriginalNoteIdFromBody,
    normalizeAuthorshipItem,
    normalizeOptionalNumber,
    normalizeThinkingStatusItem,
    relationNetworkStatusForNote,
    state,
    typeFromFolder
  });
}

function isLocalOnlyNote(note) {
  return Boolean(note?.isLocalOnly);
}

function createLocalDraftNote({ folderId, body }) {
  return computeCreateLocalDraftNote({ folderId, body }, {
    ensureEditableNoteBody,
    generatedOriginalNoteIdFromBody,
    relationNetworkStatusForNote,
    state,
    typeFromFolder,
    uid
  });
}

const UNTITLED_NOTE_TITLE = "未命名笔记";
const STARTUP_NOTE_FOLDER_ID = "dir_original_default";

function isUntitledTitle(title = "") {
  return String(title || "").trim() === UNTITLED_NOTE_TITLE;
}

function normalizedDefaultUntitledBody(folderId = "") {
  return ensureEditableNoteBody(initialBodyForFolder(folderId)).replace(/\r\n/g, "\n").trim();
}

function historicalUntitledTemplateBodies(folderId = "") {
  const noteType = String(typeFromFolder(state, folderId) || "").trim().toLowerCase();
  const kind = noteType === "literature" ? "literature" : noteType === "original" || noteType === "permanent" ? "permanent" : "";
  if (!kind) return [];
  const candidates = normalizeNoteTemplateHistory(settingsState.noteTemplates[kind]?.history, kind).map((template) =>
    applyTitleToNoteTemplate(template, UNTITLED_NOTE_TITLE, kind).replace(/\r\n/g, "\n").trim()
  );
  if (kind === "literature") {
    const rawSavedSource = normalizeNoteTemplateSource(settingsState.noteTemplates[kind]?.text, kind);
    if (!validateLiteratureTemplateSource(rawSavedSource).ok) {
      const rawBody = applyTitleToNoteTemplate(rawSavedSource, UNTITLED_NOTE_TITLE, kind).replace(/\r\n/g, "\n").trim();
      if (rawBody && !candidates.includes(rawBody)) candidates.unshift(rawBody);
    }
  }
  return candidates;
}

function isEmptyUntitledMarkdown(body = "", folderId = "") {
  const text = String(body || "").replace(/\r\n/g, "\n").trim();
  if (!text) return true;
  if (!text.replace(/^#{1,6}\s*未命名笔记\s*/u, "").trim()) return true;
  const candidates = [normalizedDefaultUntitledBody(folderId), ...historicalUntitledTemplateBodies(folderId)];
  return candidates.some((candidate) => candidate === text);
}

async function refreshUntitledPlaceholderForCurrentTemplate(note) {
  return noteRuntimeController.refreshUntitledPlaceholderForCurrentTemplate(note);
}

function noteTabFor(noteId = "") {
  return state.tabs.find((item) => item.noteId === noteId) || null;
}

function isUntitledPlaceholderNote(note) {
  if (!note) return false;
  const tab = noteTabFor(note.id);
  if (tab?.dirty) return false;
  if (!tab && !note.bodyLoaded && !isLocalOnlyNote(note)) return false;
  const title = tab?.title || note.title;
  const body = typeof tab?.body === "string" ? tab.body : note.body;
  return isUntitledTitle(title) && isEmptyUntitledMarkdown(body, note.folderId);
}

async function ensureNoteLoadedForPlaceholderCheck(note) {
  if (!note || note.bodyLoaded || isLocalOnlyNote(note)) return note;
  try {
    const full = await fetchNote(note.id);
    if (!full) return note;
    Object.assign(note, mapNoteItem(full), { bodyLoaded: typeof full.body === "string" });
  } catch {}
  return note;
}

async function cleanupDuplicateUntitledPlaceholders(folderId) {
  const candidates = state.notes.filter((item) => item.folderId === folderId && isUntitledTitle(item.title));
  for (const note of candidates) {
    await ensureNoteLoadedForPlaceholderCheck(note);
  }
  const placeholders = candidates.filter(isUntitledPlaceholderNote);
  if (placeholders.length <= 1) {
    return { kept: placeholders[0] || null, removed: 0 };
  }

  const [kept, ...duplicates] = placeholders;
  const duplicateIds = new Set(duplicates.map((item) => item.id));
  for (const note of duplicates) {
    if (isLocalOnlyNote(note)) continue;
    try {
      await deleteNote(note.id);
    } catch {}
  }
  state.notes = state.notes.filter((item) => !duplicateIds.has(item.id));
  state.tabs = state.tabs.filter((item) => !duplicateIds.has(item.noteId));
  if (state.activeTabId && !state.tabs.some((item) => item.id === state.activeTabId)) {
    state.activeTabId = state.tabs[0]?.id || null;
  }
  if (duplicateIds.has(state.selectedFileId)) {
    state.selectedFileId = kept?.id || null;
  }
  return { kept, removed: duplicateIds.size };
}

function replaceLocalNoteIdentity(previousNoteId, savedItem) {
  const note = state.notes.find((item) => item.id === previousNoteId);
  if (!note) return null;
  const mapped = mapNoteItem(savedItem);
  Object.assign(note, mapped, { bodyLoaded: true, isLocalOnly: false });

  const previousTabId = `tab_${previousNoteId}`;
  const tab = state.tabs.find((item) => item.noteId === previousNoteId);
  if (tab) {
    tab.noteId = note.id;
    tab.id = `tab_${note.id}`;
  }
  if (state.activeTabId === previousTabId && tab) {
    state.activeTabId = tab.id;
  }
  if (state.selectedFileId === previousNoteId) {
    state.selectedFileId = note.id;
  }
  if (Array.isArray(state.literatureQueueFocusNoteIds) && state.literatureQueueFocusNoteIds.length) {
    state.literatureQueueFocusNoteIds = state.literatureQueueFocusNoteIds.map((item) =>
      item === previousNoteId ? note.id : item
    );
  }
  const basketIds = parseWritingBasketIds();
  if (basketIds.includes(previousNoteId)) {
    setWritingBasketIds(basketIds.map((item) => (item === previousNoteId ? note.id : item)));
  }
  return note;
}

function upsertNotesForDirectory(folderId, mappedNotes) {
  const keep = state.notes.filter((n) => n.folderId !== folderId);
  const localOnly = state.notes.filter((n) => n.folderId === folderId && isLocalOnlyNote(n));
  state.notes = [...localOnly, ...mappedNotes, ...keep];
}

function upsertGraphNodeSummaries(nodes = []) {
  const mapped = nodes.map(mapNoteItem);
  const byId = new Map(state.notes.map((note) => [note.id, note]));
  for (const node of mapped) {
    const existing = byId.get(node.id);
    if (existing?.bodyLoaded) {
      Object.assign(existing, {
        title: node.title,
        folderId: node.folderId,
        noteType: node.noteType,
        status: node.status,
        markdownPath: node.markdownPath,
        updatedAt: node.updatedAt
      });
    } else {
      byId.set(node.id, { ...(existing || {}), ...node });
    }
  }
  state.notes = Array.from(byId.values());
}

function replaceFirstMarkdownTitle(body, title) {
  const cleanTitle = String(title || "未命名笔记").trim() || "未命名笔记";
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
  if (!lines.length || !String(lines[0] || "").trim()) return `# ${cleanTitle}\n`;
  if (/^#{1,6}\s+/.test(lines[0])) {
    lines[0] = `# ${cleanTitle}`;
    return lines.join("\n");
  }
  lines[0] = `# ${cleanTitle}`;
  return lines.join("\n");
}

function titleFromSeedText(text, fallback = "未命名笔记") {
  const clean = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)[0] || "";
  const singleLine = clean.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
  return (singleLine || String(fallback || "").trim() || "未命名笔记").slice(0, 48);
}

function citationSummaryLines(citation = {}) {
  const fields = citation && typeof citation === "object" ? citation : {};
  const lines = [
    fields.sourceTitle ? `- 文献标题：${fields.sourceTitle}` : "",
    fields.authors ? `- 作者：${fields.authors}` : "",
    fields.year ? `- 年份：${fields.year}` : "",
    fields.container ? `- 容器：${fields.container}` : "",
    fields.publisher ? `- 出版社 / 来源：${fields.publisher}` : "",
    fields.locator ? `- 页码 / 定位：${fields.locator}` : "",
    fields.identifier ? `- DOI / ISBN / arXiv / URL / PDF：${fields.identifier}` : ""
  ].filter(Boolean);
  return lines.length ? lines : ["- 引用信息：尚未补齐"];
}

function originalDraftBodyFromSource(payload = {}) {
  const sourceType = String(payload.sourceType || "").trim().toLowerCase();
  if (sourceType === "literature") {
    const parsed = parseLiteratureWorkspace(payload.sourceBody || payload.body || "", {
      sectionLabelCandidates: literatureTemplateSectionLabelCandidates()
    });
    const sourceTitle = String(payload.sourceTitle || "").trim() || "未命名文献笔记";
    const claim = String(payload.paraphrase || parsed.paraphrase || "").trim();
    const whyKeep = String(payload.whyKeep || parsed.whyKeep || "").trim();
    const supportsJudgment = String(payload.supportsJudgment || parsed.supportsJudgment || "").trim();
    const question = String(payload.question || parsed.question || "").trim();
    const boundary = String(payload.boundary || parsed.boundary || "").trim();
    const originalText = String(payload.originalText || parsed.originalText || "").trim();
    const citation = payload.citation && typeof payload.citation === "object" ? payload.citation : parsed.citation;
    const titleSeed =
      sourceTitle === "未命名文献笔记"
        ? titleFromSeedText(citation?.sourceTitle || supportsJudgment || question || claim || originalText, "未命名永久笔记")
        : sourceTitle;
    const relatedClues = [
      `- 来自文献笔记：[[${sourceTitle}]]`,
      payload.sourceNoteId ? `- 来源笔记 ID：${payload.sourceNoteId}` : "",
      ...citationSummaryLines(citation)
    ]
      .filter(Boolean)
      .join("\n");
    const supplement = [
      claim ? "- 已有用户转述仍保留在来源文献笔记中，写永久笔记时请继续改写，不要直接复述。" : "",
      whyKeep ? `- 来源文献里的保留原因：${whyKeep}` : "",
      question ? `- 还待回答的追问：${question}` : "",
      originalText ? "- 原文摘录与证据链仍以来源文献笔记为准，永久笔记里不重复复制。" : "",
      supportsJudgment ? `- 来源里的判断种子：${supportsJudgment}` : ""
    ]
      .filter(Boolean)
      .join("\n");
    return composePermanentTemplateDraft({
      title: titleSeed,
      coreClaim: supportsJudgment
        ? "从来源文献里的判断种子继续改写成一句你自己的原创判断，不要直接复述摘录或文献笔记原句。"
        : "把这条文献转述继续改写成一句你自己的原创判断，不要直接复述摘录或文献笔记原句。",
      whyTrue: question
        ? "先回答来源文献里留下的追问，再说明这条判断为什么成立，以及它依赖哪些证据或观察。"
        : "用你自己的理由说明这条判断为什么成立，以及它依赖哪些证据或观察。",
      boundary: boundary ? "把来源文献里的边界或反例改写成这条判断的适用条件，不要只复制原句。" : "写出这条判断在哪些条件下不成立，或最容易被什么反例推翻。",
      relatedClues,
      supplement
    });
  }
  const sourceTitle = String(payload.sourceTitle || "").trim() || "未命名随笔笔记";
  const sourceBody = stripGeneratedOriginalMarker(String(payload.sourceBody || payload.body || "").trim());
  const excerpt = sourceBody
    .replace(/^#\s+[^\n]*\n?/m, "")
    .trim();
  const titleSeed = titleFromSeedText(excerpt || sourceTitle, sourceTitle === "未命名随笔笔记" ? "未命名永久笔记" : sourceTitle);
  return composePermanentTemplateDraft({
    title: titleSeed,
    coreClaim: "把这条随笔里已经开始成形的判断，改写成一句更清楚、可复用的原创观点。",
    whyTrue: "补上这条判断为什么值得成立、依赖了哪些观察或经验。",
    boundary: "写出它在哪些条件下不成立，或还有哪些地方需要继续验证。",
    relatedClues: [`- 来自随笔笔记：[[${sourceTitle}]]`, payload.sourceNoteId ? `- 来源笔记 ID：${payload.sourceNoteId}` : ""]
      .filter(Boolean)
      .join("\n"),
    supplement: excerpt ? `- 原始线索摘录：${excerpt}` : ""
  });
}

async function syncDirectoriesFromApi() {
  const items = await fetchDirectories(true);
  if (!items.length) return;
  state.folders = items.map(mapDirectoryItem);
  const selectedExists = state.folders.some((f) => f.id === state.selectedFolderId);
  if (!selectedExists) {
    state.selectedFolderId = state.browserRootId;
  }
}

async function syncNotesForDirectory(folderId) {
  if (!folderId) return;
  const items = await fetchDirectoryNotes(folderId);
  const mapped = items.map(mapNoteItem);
  upsertNotesForDirectory(folderId, mapped);
}

async function syncLoadedNotesForDirectories(directoryIds = []) {
  const ids = [...new Set(directoryIds.map((item) => String(item || "").trim()).filter(Boolean))];
  for (const directoryId of ids) {
    if (!state.notes.some((note) => note.folderId === directoryId)) continue;
    await syncNotesForDirectory(directoryId);
  }
}

async function syncNotesForDirectoryTree(rootDirectoryId) {
  const rootId = String(rootDirectoryId || "").trim();
  if (!rootId) return;
  const directoryIds = descendantDirectoryIds(rootId).filter((id) => folderById(state, id));
  for (const directoryId of directoryIds) {
    await syncNotesForDirectory(directoryId);
  }
}

function descendantDirectoryIds(directoryId) {
  const result = [];
  const queue = [directoryId];
  const seen = new Set();
  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId || seen.has(currentId)) continue;
    seen.add(currentId);
    result.push(currentId);
    for (const folder of state.folders) {
      if (folder.parentId === currentId) queue.push(folder.id);
    }
  }
  return result;
}

function renamedDirectoryFsPath(folder, nextTitle) {
  if (!folder?.fsPath) return "";
  return joinLocalPath(dirnameLocalPath(folder.fsPath), nextTitle);
}

function movedDirectoryFsPath(folder, targetParentFolder) {
  if (!folder?.fsPath || !targetParentFolder?.fsPath) return "";
  const baseName = basenameLocalPath(folder.fsPath) || folder.name || "folder";
  return joinLocalPath(targetParentFolder.fsPath, baseName);
}

function ensureSelection() {
  const visible = state.folders.filter((f) => !f.hidden);
  const scoped = visible.filter((f) => rootBoxIdFromFolder(state, f.id) === state.browserRootId);
  const source = scoped.length ? scoped : visible;
  if (!folderById(state, state.selectedFolderId) || folderById(state, state.selectedFolderId)?.hidden) {
    state.selectedFolderId = source[0]?.id || state.browserRootId;
  }
  createBoxDialog.setOptions(source);
}

function renderExplorerSidebarFlow(rootId = state.browserRootId) {
  const directoryIds = new Set(descendantDirectoryIds(rootId));
  const originalDirectoryIds = new Set(descendantDirectoryIds("dir_original_default"));
  return renderExplorerSidebarFlowForRuntime({
    rootId,
    element: $("sidebarFlow"),
    currentNotes: state.notes.filter((note) => directoryIds.has(note.folderId)),
    originalNotes: state.notes.filter((note) => originalDirectoryIds.has(note.folderId))
  }, {
    parseLinks,
    parseTags,
    noteHasGeneratedOriginal,
    distillationStatusOf,
    noteHasBoundarySignal,
    isPermanentLikeNote,
    escapeHtml
  });
}

function syncNewNoteButtons() {
  const copy = explorerNewNoteButtonCopy(state);
  const label = copy.title || copy.label;
  const sidebarNew = $("btnNewNote");
  const mobileNew = $("btnMobileNewNote");
  for (const button of [sidebarNew, mobileNew].filter(Boolean)) {
    button.title = label;
    button.setAttribute("aria-label", label);
    button.dataset.tip = label;
    button.dataset.noteEntryKind = copy.entryKind || "permanent";
  }
  const mobileLabel = mobileNew?.querySelector("span");
  if (mobileLabel) mobileLabel.textContent = "";
}

const sidebarTitleController = createSidebarTitleController({
  depsProvider: createSidebarTitlePrototypeDepsProvider(() => ({
    state,
    folderById,
    $,
    documentRef: document,
    windowRef: typeof window !== "undefined" ? window : null,
    displayFolderName,
    currentModuleUi,
    syncNewNoteButtons
  }))
});
const {
  renderSidebarTitle
} = sidebarTitleController;

function currentModuleUi() {
  const root = folderById(state, state.browserRootId);
  return currentModuleSidebarUi({
    module: state.module,
    rootName: root?.name || "当前目录",
    escapeHtml,
    settingsSidebarNavigationHtml
  });
}

function renderModuleWorkspaceHeader() {
  const moduleTitle = $("moduleTitle");
  const moduleSummary = $("moduleSummary");
  const moduleHeaderActions = $("moduleHeaderActions");
  const settingsPackSelect = $("settingsAiModelPack");
  const packOptionsHtml = settingsPackSelect
    ? [...settingsPackSelect.querySelectorAll("option")]
        .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.textContent || option.value)}</option>`)
        .join("")
    : `
      <option value="Starter Auto">日常整理</option>
      <option value="Privacy First">本地私密</option>
      <option value="Ollama Local">本地 AI</option>
    `;

  return renderModuleWorkspaceHeaderForRuntime({
    state,
    elements: {
      moduleTitle,
      moduleSummary,
      moduleHeaderActions,
      moduleBackToNotes: $("moduleBackToNotes"),
      moduleAiModelPack: $("moduleAiModelPack"),
      moduleAiRefreshRoute: $("moduleAiRefreshRoute")
    },
    settingsState,
    moduleUi: currentModuleUi(),
    settingsHeader: settingsModuleHeaderCopy(),
    settingsPackOptionsHtml: packOptionsHtml,
    currentAiProviderId,
    activateModule,
    applyAiModelPackChange,
    refreshAiRoutePreview,
    renderModuleWorkspaceHeader,
    renderSettingsPanel,
    setStatus,
    escapeHtml
  });
}

function isPermanentLikeNote(note = null) {
  const noteType = String((note?.folderId ? typeFromFolder(state, note.folderId) : "") || note?.noteType || "").trim().toLowerCase();
  return noteType === "permanent" || noteType === "original";
}

function saveAiSuggestionForNote(note = null) {
  return saveAiSuggestionForNoteModel(
    note,
    {
      currentModule: state.module,
      activeNote: activeEditorNote(),
      activeBody: activeEditorBody()
    },
    {
      isEmptyUntitledMarkdown,
      isOriginalRecordableSource,
      noteHasGeneratedOriginal,
      noteTypeForNote: (item) => String((item?.folderId ? typeFromFolder(state, item.folderId) : "") || item?.noteType || "").trim().toLowerCase(),
      isPermanentLikeNote,
      distillationStatusOf,
      saveAiSuggestionKey
    }
  );
}

const workflowReminderController = createWorkflowReminderController(() => ({
  isOriginalRecordableSource,
  noteHasGeneratedOriginal,
  state,
  typeFromFolder,
  distillationStatusOf,
  isPermanentLikeNote,
  resolveSystemMessageByDedupeKey,
  upsertSystemMessage: (message) => upsertSystemMessage(message, { preserveRead: true })
}));

function sourcePromotionWorkflowMessageForNote(note = null, suggestion = null) {
  return workflowReminderController.sourcePromotionWorkflowMessageForNote(note, suggestion);
}

function syncSourcePromotionSystemMessageForNote(note = null, suggestion = null) {
  return workflowReminderController.syncSourcePromotionSystemMessageForNote(note, suggestion);
}

function relationNetworkWorkflowMessageForNote(note = null, overview = {}) {
  return workflowReminderController.relationNetworkWorkflowMessageForNote(note, overview);
}

function syncRelationNetworkSystemMessageForNote(note = null, overview = {}) {
  return workflowReminderController.syncRelationNetworkSystemMessageForNote(note, overview);
}

function clearSaveAiSuggestion() {
  saveAiSuggestion = null;
  renderSaveAiSuggestion();
}

function showSaveAiSuggestionForNote(note = null) {
  const suggestion = saveAiSuggestionForNote(note);
  if (!suggestion || dismissedSaveAiSuggestionKeys.has(suggestion.key)) {
    if (saveAiSuggestion?.noteId === note?.id) clearSaveAiSuggestion();
    return null;
  }
  saveAiSuggestion = suggestion;
  renderSaveAiSuggestion();
  return suggestion;
}

function renderSaveAiSuggestion() {
  const root = $("saveAiSuggestion");
  if (!root) return;
  const text = $("saveAiSuggestionText");
  const primary = $("btnSaveAiSuggestionPrimary");
  const later = $("btnSaveAiSuggestionLater");
  const activeNote = activeEditorNote();
  const visible =
    Boolean(saveAiSuggestion?.noteId) &&
    state.module === "explorer" &&
    activeNote?.id === saveAiSuggestion.noteId;

  root.classList.toggle("hidden", !visible);
  if (!visible) return;

  if (text) text.textContent = saveAiSuggestion.text;
  if (primary) primary.textContent = saveAiSuggestion.primaryLabel || "立即处理";
  if (later) later.textContent = saveAiSuggestion.laterLabel || "稍后";
  root.dataset.action = saveAiSuggestion.action || "";
  root.dataset.noteId = saveAiSuggestion.noteId || "";
}

function distillationQueueItems() {
  const rank = { needs_thesis: 0, needs_summary: 1, needs_confirm: 2, confirmed: 3 };
  return state.notes
    .filter((note) => isPermanentLikeNote(note))
    .map((note) => {
      const status = distillationStatusOf(note);
      const stage = distillationStageOf(note);
      return {
        note,
        status,
        stage,
        reason: distillationReasonOf(note),
        rank: rank[stage] ?? 9
      };
    })
    .sort((a, b) => a.rank - b.rank || String(b.note.updatedAt || "").localeCompare(String(a.note.updatedAt || "")));
}

function directoryPathLabel(directoryId) {
  return computeDirectoryPathLabel(directoryId, { folderById, state });
}

function permanentExportDirectories() {
  return state.folders
    .filter((folder) => folder?.id && isDirectoryUnderOriginalRoot(folder.id))
    .sort((a, b) => directoryPathLabel(a.id).localeCompare(directoryPathLabel(b.id), "zh-Hans-CN"));
}

function defaultPermanentDirectoryId() {
  if (isDirectoryUnderOriginalRoot(state.selectedFolderId)) return state.selectedFolderId;
  if (isDirectoryUnderOriginalRoot(lastChosenPermanentDirectoryId)) return lastChosenPermanentDirectoryId;
  return permanentExportDirectories()[0]?.id || "";
}

function permanentDirectoryDialogOptions() {
  return permanentExportDirectories().map((folder) => ({
    id: folder.id,
    label: directoryPathLabel(folder.id),
    hint:
      folder.id === "dir_original_default"
        ? "会在永久笔记盒根目录创建，之后可以再移动整理。"
        : `会在这个目录创建，创建后直接打开继续编辑。`
  }));
}

function noteMoveDirectoryOptions(currentDirectoryId = "") {
  const currentFolder = folderById(state, currentDirectoryId);
  const rootId = currentFolder ? rootBoxIdFromFolder(state, currentFolder.id) : "";
  return state.folders
    .filter((folder) => folder?.id && !folder.hidden && folder.id !== currentDirectoryId && rootBoxIdFromFolder(state, folder.id) === rootId)
    .sort((a, b) => directoryPathLabel(a.id).localeCompare(directoryPathLabel(b.id), "zh-Hans-CN"))
    .map((folder) => ({
      id: folder.id,
      label: directoryPathLabel(folder.id),
      hint: `移动后会放到“${displayFolderName(folder)}”目录。`
    }));
}

function importTargetDirectories() {
  return state.folders
    .filter((folder) => folder?.id && !folder.hidden && ["dir_fleeting_default", "dir_literature_default", "dir_original_default"].includes(rootBoxIdFromFolder(state, folder.id)))
    .sort((a, b) => directoryPathLabel(a.id).localeCompare(directoryPathLabel(b.id), "zh-Hans-CN"));
}

function preferredImportDirectoryId(currentValue = "") {
  return preferredImportDirectoryIdFromOptions({
    currentValue,
    selectedFolderId: state.selectedFolderId,
    directoryOptions: importTargetDirectories(),
    rootIdForDirectory: (directoryId) => rootBoxIdFromFolder(state, directoryId)
  });
}

function confirmedImportTargetDirectoryId(result = {}, fallbackDirectoryId = "") {
  const targetDirectories = Array.isArray(result?.result?.targetDirectories) ? result.result.targetDirectories : [];
  if (targetDirectories.length === 1) return String(targetDirectories[0]?.directoryId || "").trim();
  if (targetDirectories.length > 1) {
    const fallback = String(fallbackDirectoryId || "").trim();
    if (targetDirectories.some((item) => String(item?.directoryId || "").trim() === fallback)) return fallback;
    return "";
  }
  return "";
}

function syncExportDirectoryOptions() {
  const select = $("exportDirectoryId");
  if (!select) return;
  const options = permanentExportDirectories();
  const currentValue = String(select.value || "").trim();
  const preferredValue =
    options.some((folder) => folder.id === currentValue)
      ? currentValue
      : options.some((folder) => folder.id === String(state.selectedFolderId || "").trim())
        ? String(state.selectedFolderId || "").trim()
        : options[0]?.id || "dir_original_default";

  select.innerHTML = options
    .map((folder) => `<option value="${escapeHtml(folder.id)}">${escapeHtml(directoryPathLabel(folder.id))}</option>`)
    .join("");
  if (!options.length) {
    select.innerHTML = `<option value="dir_original_default">永久笔记盒</option>`;
  }
  select.value = preferredValue;
  updateExportTargetHint();
}

function selectedExportDirectoryLabel() {
  const directoryId = String($("exportDirectoryId")?.value || "").trim();
  if (!directoryId) return "";
  return directoryPathLabel(directoryId);
}

function updateExportTargetHint() {
  const hint = $("exportTargetHint");
  if (!hint) return;
  const targetPath = String($("exportTargetPath")?.value || "").trim();
  const directoryLabel = selectedExportDirectoryLabel() || "永久笔记盒";
  hint.textContent = targetPath
    ? `将从 ${directoryLabel} 导出，写入 ${targetPath}。`
    : `将从 ${directoryLabel} 导出。首次导出时再选择保存位置。`;
}

function activeEditorNote() {
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
  if (!activeTab) return null;
  return state.notes.find((note) => note.id === activeTab.noteId) || null;
}

function activeEditorBody() {
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
  return String(activeTab?.body || activeEditorNote()?.body || "");
}

function applyExplorerSelectionContext({
  note = null,
  noteId = "",
  folderId = "",
  clearSelectedFile = false,
  syncSearch = false,
  expandFolder = true
} = {}) {
  const resolvedNote =
    note?.id
      ? note
      : noteId
        ? state.notes.find((item) => item.id === String(noteId || "").trim()) || null
        : null;
  if (resolvedNote?.id) {
    const folder = folderById(state, resolvedNote.folderId);
    if (!folder) return false;
    state.selectedFileId = resolvedNote.id;
    state.selectedFolderId = folder.id;
    state.browserRootId = rootBoxIdFromFolder(state, folder.id);
    if (syncSearch && !noteMatchesSearchQuery(resolvedNote, state.searchQuery)) {
      state.searchQuery = "";
      const searchInput = $("searchInput");
      if (searchInput) searchInput.value = "";
    }
    if (expandFolder) explorer?.expandFolderPath?.(folder.id);
    return true;
  }

  const cleanFolderId = String(folderId || "").trim();
  const folder = cleanFolderId ? folderById(state, cleanFolderId) : null;
  if (folder) {
    state.selectedFolderId = folder.id;
    state.browserRootId = rootBoxIdFromFolder(state, folder.id);
    if (clearSelectedFile) state.selectedFileId = null;
    if (expandFolder) explorer?.expandFolderPath?.(folder.id);
    return true;
  }

  if (clearSelectedFile) state.selectedFileId = null;
  return false;
}

function syncExplorerContextToNote(note = null) {
  return applyExplorerSelectionContext({ note, syncSearch: true, expandFolder: true });
}

function syncExplorerContextToActiveTab() {
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
  return activeTab?.noteId
    ? applyExplorerSelectionContext({ noteId: activeTab.noteId, syncSearch: true, expandFolder: true })
    : applyExplorerSelectionContext({ clearSelectedFile: true, expandFolder: false });
}

function noteGrowthStage(note, body = "") {
  const noteType = String((note?.folderId ? typeFromFolder(state, note.folderId) : "") || note?.noteType || "").toLowerCase();
  const text = String(body || note?.body || "");
  const tagCount = parseTags(text).length;
  const linkCount = parseLinks(text).length;
  const bodyLength = text.replace(/\s+/g, "").length;

  if (noteType === "fleeting") return "捕捉中";
  if (noteType === "literature") return "转述中";
  if (linkCount >= 2 || (linkCount >= 1 && tagCount >= 2)) return "已串联";
  if (bodyLength >= 140 || tagCount >= 2) return "正在成形";
  return "提炼中";
}

function renderStatusMeta() {
  return;
}

function renderWorkspaceStatusHint() {
  const helper = $("editorHelper");
  if (!helper) return;
  const kicker = $("editorHelperKicker");
  const title = $("editorHelperTitle");
  const body = $("editorHelperBody");
  const action = $("btnEditorHelperAction");
  const visibility = editorHelperShouldHide({
    elementsReady: Boolean(kicker && title && body && action),
    dismissed: editorHelperDismissed,
    muted: editorHelperMuted,
    module: state.module
  });
  if (visibility.hide) {
    hideEditorHelper();
    return;
  }
  const activeNote = activeEditorNote();
  const activeBody = activeEditorBody();
  const model = buildWorkspaceStatusHintModel({
    activeNote,
    activeBody,
    noteType: editorHelperNoteType(activeNote, { typeFromFolder: (folderId) => typeFromFolder(state, folderId) }),
    focusMode: state.focusMode,
    growthStage: activeNote ? noteGrowthStage(activeNote, activeBody) : "",
    hasGeneratedOriginal: activeNote ? noteHasGeneratedOriginal(activeNote) : false,
    generatedOriginalNoteId: activeNote ? noteGeneratedOriginalNoteId(activeNote) : "",
    isPermanentLike: activeNote ? isPermanentLikeNote(activeNote) : false
  });
  if (!model.visible) {
    hideEditorHelper();
    return;
  }
  action.dataset.helperAction = model.helperAction || "noop";
  action.dataset.targetNoteId = model.targetNoteId || "";
  helper.hidden = false;
  helper.setAttribute("aria-hidden", "false");
  helper.style.pointerEvents = "";
  helper.classList.remove("hidden");
  kicker.textContent = model.kicker || "";
  title.textContent = model.title || "";
  body.textContent = model.body || "";
  action.textContent = model.actionText || "";
}

function applyFocusModeChrome() {
  const focusActive = state.module === "explorer" && Boolean(state.focusMode);
  document.querySelector(".app")?.setAttribute("data-focus-mode", focusActive ? "true" : "false");
  if (focusActive) editor?.setInspectorVisible?.(false);
  const focusButton = $("btnFocusMode");
  if (focusButton) {
    focusButton.classList.toggle("active", focusActive);
    focusButton.setAttribute("aria-pressed", focusActive ? "true" : "false");
    focusButton.title = focusActive ? "退出专注模式" : "专注模式：收起导航和关联，只保留当前笔记";
    focusButton.dataset.tip = focusActive ? "退出专注模式" : "专注模式：收起导航和关联，只保留当前笔记";
    const label = focusButton.querySelector("span");
    if (label) label.textContent = focusActive ? "退出专注" : "专注模式";
  }
  const intentNote = $("editorIntentNote");
  if (intentNote) {
    intentNote.textContent = focusActive
      ? "你现在处在低干扰视图里，先把核心判断写清楚，再决定是否补连接与标签。"
      : "这里不强调更快完成，而强调更清楚地形成观点、边界与连接。";
  }
}

function renderDistillationPanel() {
  const panel = $("distillationPanel");
  if (!panel) return;
  panel.innerHTML = renderDistillationPanelView({
    items: distillationQueueItems(),
    activeFilter: distillationState.filter || "all"
  }, {
    escapeHtml,
    titleFromBody,
    distillationStatusLabel
  });
}

async function refreshDistillationNotes() {
  const rootId = "dir_original_default";
  const directoryIds = descendantDirectoryIds(rootId).filter((id) => folderById(state, id));
  for (const directoryId of directoryIds) {
    await syncNotesForDirectory(directoryId);
  }
  renderDistillationPanel();
}

async function openDistillationModule() {
  try {
    await refreshDistillationNotes();
    setStatus("已打开观点整理", "ok");
  } catch (error) {
    renderDistillationPanel();
    setStatus(`观点整理队列刷新失败：${String(error?.message || error)}`, "warn");
  }
}

async function openDistillationQueueNote(noteId = "") {
  const id = String(noteId || "").trim();
  if (!id) return;
  await ensureNoteBodyLoaded(id);
  state.module = "explorer";
  document.querySelectorAll(".rail-btn[data-module]").forEach((button) => {
    button.classList.toggle("active", button.dataset.module === "explorer");
  });
  const opened = openNoteById(id, { preferTitleSelection: false });
  if (opened) {
    state.inspectorVisible = false;
    editor?.setInspectorVisible?.(false);
    setStatus("已从观点整理队列打开笔记", "ok");
  }
  renderAll();
  queueMicrotask(() => {
    const note = state.notes.find((item) => item.id === id) || null;
    const stage = distillationStageOf(note);
    const selector =
      stage === "needs_thesis"
        ? '[data-note-distillation-form] textarea[name="thesis"]'
        : stage === "needs_summary"
          ? '[data-note-distillation-form] textarea[name="summary1"]'
          : stage === "needs_confirm"
            ? "[data-note-distillation-confirm]"
            : "[data-note-distillation-section]";
    document.querySelector("[data-note-distillation-section]")?.scrollIntoView({ block: "start", behavior: "smooth" });
    document.querySelector(selector)?.focus?.();
  });
}

const renderAppShellController = createRenderAppShellController({
  depsProvider: createRenderAppShellPrototypeDepsProvider(() => ({
    state,
    explorer,
    editor,
    ensureSelection,
    syncRailSelectionState,
    renderSidebarTitle,
    renderModulePanels,
    syncExportDirectoryOptions,
    renderAiInboxWorkspace,
    renderDistillationPanel,
    renderGraphPanel,
    renderSettingsPanel,
    renderWritingPanel,
    applyFocusModeChrome,
    renderStatusMeta,
    renderWorkspaceStatusHint,
    renderSaveAiSuggestion,
    renderSystemMessages
  }))
});
const {
  renderAll
} = renderAppShellController;

function explorerQuickAction(rootId = state.browserRootId) {
  if (rootId === "dir_fleeting_default") return "quick-fleeting";
  if (rootId === "dir_literature_default") return "quick-literature";
  return "quick-original";
}

function syncRailSelectionState() {
  syncRailSelectionDom({
    document,
    currentQuickAction: explorerQuickAction(),
    currentModule: state.module,
    updateAvailable: shouldShowUpdateAttention(settingsState.update)
  });
}

function currentVaultPath() {
  return settingsState.vault?.vaultPath || "";
}

function resolveNotePath(note) {
  if (!note) return "";
  if (note.markdownPath && currentVaultPath()) return joinLocalPath(currentVaultPath(), note.markdownPath);
  const folder = folderById(state, note.folderId);
  if (!folder?.fsPath) return "";
  const fileName = `${note.id}.md`;
  return joinLocalPath(folder.fsPath, fileName);
}

function standaloneEditorUrl(noteId = "") {
  const baseUrl = `${window.location.origin}/app/editor`;
  const id = String(noteId || "").trim();
  return id ? `${baseUrl}?note=${encodeURIComponent(id)}` : baseUrl;
}

function openStandaloneEditorWindow(noteId = "") {
  const url = standaloneEditorUrl(noteId);
  window.open(url, "_blank", "noopener,noreferrer");
  return url;
}

function ensureEditableNoteBody(body = "") {
  const value = String(body || "").replace(/\r\n/g, "\n");
  if (!value.trim()) return "# 未命名笔记\n\n";
  return /\n\s*\n\s*$/.test(value) ? value : `${value}\n\n`;
}

function literatureNoteTemplateBody(title = "未命名笔记") {
  return applyTitleToNoteTemplate(effectiveSavedNoteTemplateSource("literature"), title, "literature");
}

function permanentNoteTemplateBody(title = "未命名笔记") {
  return applyTitleToNoteTemplate(effectiveSavedNoteTemplateSource("permanent"), title, "permanent");
}

function initialBodyForFolder(folderId = "") {
  const noteType = typeFromFolder(state, folderId);
  if (noteType === "literature") return literatureNoteTemplateBody();
  if (noteType === "original" || noteType === "permanent") return permanentNoteTemplateBody();
  return "# 未命名笔记\n\n";
}

async function createNoteInSelectedFolder(options = {}) {
  const folderId = state.selectedFolderId;
  const preferTitleSelection = options.preferTitleSelection !== false;
  const openInStandalone = options.openInStandalone === true;
  const reuseUntitled = options.reuseUntitled !== false;
  const preferPlainEditor = options.preferPlainEditor === true;
  try {
    const cleanup = await cleanupDuplicateUntitledPlaceholders(folderId);
    if (reuseUntitled && cleanup.kept) {
      await refreshUntitledPlaceholderForCurrentTemplate(cleanup.kept);
      if (openInStandalone) {
        openStandaloneEditorWindow(cleanup.kept.id);
      } else {
        openNoteById(cleanup.kept.id, { preferTitleSelection, preferPlainEditor });
      }
      return { note: cleanup.kept, remote: !isLocalOnlyNote(cleanup.kept), reused: true, cleanedCount: cleanup.removed };
    }
    const initialBody = initialBodyForFolder(folderId);
    const created = await createNote({
      directoryId: folderId,
      body: initialBody
    });
    if (!created) throw new Error("创建笔记失败");
    const note = mapNoteItem({
      ...created,
      body: ensureEditableNoteBody(typeof created?.body === "string" ? created.body : initialBody)
    });
    state.notes.unshift(note);
    if (openInStandalone) {
      openStandaloneEditorWindow(note.id);
    } else {
      openNoteById(note.id, { preferTitleSelection, preferPlainEditor });
    }
    return { note, remote: true, cleanedCount: cleanup.removed };
  } catch (error) {
    const fallback = {
      id: uid("pn"),
      title: "未命名笔记",
      folderId,
      noteType: typeFromFolder(state, folderId),
      status: "draft",
      body: ensureEditableNoteBody(initialBodyForFolder(folderId)),
      tags: [],
      links: [],
      updatedAt: new Date().toISOString(),
      bodyLoaded: true,
      isLocalOnly: true
    };
    state.notes.unshift(fallback);
    if (openInStandalone) {
      openStandaloneEditorWindow(fallback.id);
    } else {
      openNoteById(fallback.id, { preferTitleSelection, preferPlainEditor });
    }
    return { note: fallback, remote: false, error };
  }
}

async function createPrimaryOriginalNote(options = {}) {
  const previousRootId = state.browserRootId;
  const previousFolderId = state.selectedFolderId;
  const originalRootId = "dir_original_default";
  const currentRootId = rootBoxIdFromFolder(state, state.selectedFolderId);
  const switchedToOriginal = currentRootId !== originalRootId;

  if (folderById(state, originalRootId) && switchedToOriginal) {
    state.browserRootId = originalRootId;
    state.selectedFolderId = originalRootId;
    state.selectedFileId = null;
  } else if (folderById(state, originalRootId) && !folderById(state, state.selectedFolderId)) {
    state.browserRootId = originalRootId;
    state.selectedFolderId = originalRootId;
  }

  try {
    const result = await createNoteInSelectedFolder({ ...options, preferPlainEditor: true });
    return { ...result, switchedToOriginal, previousRootId, previousFolderId };
  } catch (error) {
    state.browserRootId = previousRootId;
    state.selectedFolderId = previousFolderId;
    throw error;
  }
}

async function openStartupUntitledNote() {
  if (folderById(state, STARTUP_NOTE_FOLDER_ID)) {
    state.browserRootId = rootBoxIdFromFolder(state, STARTUP_NOTE_FOLDER_ID);
    state.selectedFolderId = STARTUP_NOTE_FOLDER_ID;
  }
  const result = await createNoteInSelectedFolder({ preferTitleSelection: true });
  if (result.reused) {
    setStatus(
      result.cleanedCount
        ? `已打开未命名笔记，并清理 ${result.cleanedCount} 条空白占位`
        : "已打开未命名笔记",
      result.cleanedCount ? "warn" : "ok"
    );
  } else if (result.remote) {
    setStatus("已打开新的未命名笔记", "ok");
  } else {
    setStatus(`API 不可用，已打开本地未命名笔记：${String(result.error?.message || result.error)}`, "warn");
  }
  return result;
}

function resetWritingProjectContext({ title = "", goal = "", audience = "", tone = "" } = {}) {
  writingState.project = null;
  writingState.scaffold = null;
  writingState.scaffoldMarkdown = "";
  writingState.scaffoldVersions = [];
  writingState.draftVersions = [];
  if ($("writingTitle")) $("writingTitle").value = title;
  if ($("writingGoal")) $("writingGoal").value = goal;
  if ($("writingAudience")) $("writingAudience").value = audience;
  if ($("writingTone")) $("writingTone").value = tone;
}

function resetWritingProjectContextForBasketChange() {
  resetWritingStrongModelState();
  resetWritingProjectContext({
    title: String($("writingTitle")?.value || "").trim(),
    goal: String($("writingGoal")?.value || "").trim(),
    audience: String($("writingAudience")?.value || "").trim(),
    tone: String($("writingTone")?.value || "").trim()
  });
  resetWritingLocalBookIdeas();
}

function preferredLocalFallbackNote() {
  return (
    state.notes.find((note) => rootBoxIdFromFolder(state, note.folderId) === "dir_original_default") ||
    state.notes[0] ||
    null
  );
}

function applyAiModelPackChange(nextPack = "Starter Auto", options = {}) {
  const next = String(nextPack || "Starter Auto").trim() || "Starter Auto";
  const currentRuntimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  settingsState.ai.runtimeMode = isLocalModelPack(next)
    ? "local_only"
    : currentRuntimeMode === "local_only"
      ? "auto"
      : currentRuntimeMode;
  settingsState.ai.modelPack = next;
  reconcileAiSelectionState({ syncUserMode: true, resetProviderState: true });
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview({ render: false });

  const settingsPack = $("settingsAiModelPack");
  if (settingsPack && settingsPack.value !== settingsState.ai.modelPack) settingsPack.value = settingsState.ai.modelPack;
  const modulePack = $("moduleAiModelPack");
  if (modulePack && modulePack.value !== settingsState.ai.modelPack) modulePack.value = settingsState.ai.modelPack;

  renderModuleWorkspaceHeader();
  renderSettingsPanel();

  const source = String(options.source || "").trim();
  setStatus(`AI model pack switched: ${settingsState.ai.modelPack}${source ? ` (${source})` : ""}`, "ok");
}

function syncMobileNewNoteButton() {
  const button = $("btnMobileNewNote");
  if (!button) return;
  const copy = explorerNewNoteButtonCopy(state);
  button.title = copy.title;
  const folderId = resolveExplorerNewNoteFolderId(state);
  const noteType = typeFromFolder(state, folderId);
  const permanentLike = noteType === "permanent" || noteType === "original";
  button.setAttribute("aria-label", noteType === "literature" ? `${copy.ariaLabel}（文摘）` : permanentLike ? `${copy.ariaLabel}（永久）` : copy.ariaLabel);
  const label = button.querySelector("span");
  if (label) label.textContent = "";
}

function renderModulePanels() {
  const graphMode = state.module === "graph";
  const aiInboxMode = state.module === "aiInbox";
  const settingsMode = state.module === "settings";
  const writingMode = state.module === "writing";
  const importsMode = state.module === "imports";
  const distillationMode = state.module === "distillation";
  const editorMode = !graphMode && !aiInboxMode && !settingsMode && !writingMode && !importsMode && !distillationMode;
  $("editorWorkspace")?.classList.toggle("hidden", !editorMode);
  const moduleWorkspace = $("moduleWorkspace");
  moduleWorkspace?.classList.toggle("hidden", editorMode);
  syncModuleChromeClassesForRuntime({
    module: state.module,
    moduleWorkspace,
    appShell: document.querySelector(".app")
  });
  $("aiInboxPanel")?.classList.toggle("hidden", !aiInboxMode);
  $("graphPanel")?.classList.toggle("hidden", !graphMode);
  $("settingsPanel")?.classList.toggle("hidden", !settingsMode);
  $("writingPanel")?.classList.toggle("hidden", !writingMode);
  $("importPanel")?.classList.toggle("hidden", !importsMode);
  $("distillationPanel")?.classList.toggle("hidden", !distillationMode);
  $("markdownPanel")?.classList.toggle("hidden", !editorMode);
  $("relatedPanel")?.classList.toggle("hidden", !editorMode || !state.inspectorVisible);
  $("btnMobileNewNote")?.classList.toggle("hidden", !editorMode);
  syncMobileNewNoteButton();
  renderModuleWorkspaceHeader();
}

function settingsAiRoutePreviewRuntimeDeps() {
  return {
    $,
    escapeHtml,
    settingsState,
    normalizeAiRuntimeMode,
    installedLocalModelReady,
    currentAiProviderId,
    activeAiProviderConfig,
    isRemoteConfigurableProviderId,
    remoteRuntimeModelFromMap
  };
}

function renderAiRoutePreview() {
  renderAiRoutePreviewForRuntime(settingsAiRoutePreviewRuntimeDeps());
}

function settingsAiExperienceRuntimeDeps() {
  return {
    $,
    escapeHtml,
    settingsState,
    normalizeAiRuntimeMode,
    currentOllamaSetupGuide,
    primaryRecommendedOllamaModelName,
    currentAiProviderId,
    isAiLocalFlowActive,
    preferredLocalProviderPresetForSelection,
    defaultProviderEndpointUrl,
    OLLAMA_CHAT_ENDPOINT_URL,
    defaultProviderHealthEndpointUrl,
    OLLAMA_HEALTH_ENDPOINT_URL,
    isLocalModelPack,
    ollamaRuntimeStateLabel,
    installedLocalModelReady,
    ollamaRecommendationHintText
  };
}

function renderAiSettingsExperience() {
  renderAiSettingsExperienceForRuntime(settingsAiExperienceRuntimeDeps());
}

function settingsAiControlsRuntimeDeps() {
  return {
    $,
    escapeHtml,
    settingsState,
    normalizeAiRuntimeMode,
    isAiLocalFlowActive,
    currentAiProviderId,
    isLocalModelPack,
    ollamaModelRecommendationProfiles,
    currentOllamaModelTiers,
    localModelDisplayProfile,
    hasLocalModel,
    primaryRecommendedOllamaModelName,
    currentOllamaSetupGuide,
    ollamaPullModelName,
    ollamaRecommendationForModel,
    isRemoteConfigurableProviderId,
    activeAiProviderConfig,
    remoteRuntimeModelFromMap,
    defaultProviderEndpointUrl,
    defaultProviderHealthEndpointUrl
  };
}

function renderAiLocalModelRecommendations() {
  renderAiLocalModelRecommendationsForRuntime(settingsAiControlsRuntimeDeps());
}

function renderAiLocalModelControls() {
  renderAiLocalModelControlsForRuntime(settingsAiControlsRuntimeDeps());
}

function renderAiProviderConfigControls() {
  renderAiProviderConfigControlsForRuntime(settingsAiControlsRuntimeDeps());
}

function settingsAiDialogByName(name = "") {
  const normalized = String(name || "").trim();
  const map = {
    remote: "settingsAiRemoteDialog",
    test: "settingsAiTestDialog"
  };
  return $(map[normalized] || "");
}

function closeSettingsAiDialogs() {
  ["settingsAiRemoteDialog", "settingsAiTestDialog"].forEach((id) => {
    $(id)?.classList.add("hidden");
  });
}

function openSettingsAiDialog(name = "") {
  const dialog = settingsAiDialogByName(name);
  if (!dialog) return;
  closeSettingsAiDialogs();
  dialog.classList.remove("hidden");
  const firstField = dialog.querySelector("select, input, textarea, button");
  if (firstField instanceof HTMLElement) firstField.focus({ preventScroll: true });
}

async function applySettingsAiQuickSetup(kind = "") {
  const normalized = String(kind || "").trim();
  if (normalized === "local") {
    settingsState.ai.runtimeMode = "local_only";
    settingsState.ai.modelPack = "Ollama Local";
    settingsState.ai.userMode = "Local / Private";
  } else if (normalized === "remote") {
    settingsState.ai.runtimeMode = "cloud_only";
    settingsState.ai.modelPack = "Global Optimized";
    settingsState.ai.userMode = "Balanced";
  } else {
    return;
  }
  reconcileAiSelectionState({ syncUserMode: true, resetProviderState: true });
  persistAiSettingsToStorage();
  await syncAiSettingsToApi();
  if (normalized === "local") {
    await previewOllamaLocalAiBootstrapFromUi(localAiPreviewOptionsForAction("settings_quick_setup"));
  }
  await refreshAiRoutePreview();
  renderSettingsPanel();
  openSettingsAiDialog(normalized);
  if (normalized === "local") {
    setStatus("已进入本地 AI 设置。下载模型前会先等待你确认。", "ok");
    return;
  }
  setStatus(normalized === "local" ? "已切换为本地大模型设置流程" : "已切换为远程大模型设置流程", "ok");
}

function activateModule(moduleName) {
  const normalizedModule = moduleName === "search" ? "imports" : moduleName;
  if (normalizedModule === "graph") {
    state.browserRootId = "dir_original_default";
    if (!isDirectoryUnderOriginalRoot(state.selectedFolderId)) {
      state.selectedFolderId = "dir_original_default";
    }
    state.selectedFileId = null;
  }
  state.module = normalizedModule;
  if (normalizedModule === "graph") expandGraphBrowserTree();
  syncRailSelectionState();
  renderAll();
  if (normalizedModule === "imports") renderImportPageShell();
}

function settingsLeafLabel(value = "", fallback = "默认笔记库") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const segments = text.split(/[\\/]+/).filter(Boolean);
  return segments.at(-1) || text || fallback;
}

function settingsAiRuntimeModeLabel(value = "") {
  const normalized = normalizeAiRuntimeMode(value || "auto");
  if (normalized === "local_only") return "只用本地模型";
  if (normalized === "cloud_only") return "只用远程模型";
  return "自动选择";
}

function settingsAiAdvancedRuntimeModeLabel(value = "") {
  return normalizeAiRuntimeMode(value || "auto") === "hybrid" ? "本地优先（高级）" : settingsAiRuntimeModeLabel(value);
}

function settingsAiUserModeDisplayLabel(value = "") {
  const key = String(value || "").trim();
  const labels = {
    Auto: "自动",
    Economy: "节省成本",
    Balanced: "均衡质量",
    "Deep Thinking": "深度思考",
    "Local / Private": "本地 / 私密"
  };
  return labels[key] || key || "自动";
}

function settingsAiProviderDisplayLabel(value = "") {
  const key = String(value || "").trim();
  const labels = {
    "Ollama Local": "本地 AI",
    ollama_local_gateway: "本地 AI",
    local_private_gateway: "本地 AI",
    "Platform Managed OpenAI": "在线 AI",
    platform_managed_openai: "在线 AI"
  };
  return labels[key] || key || "AI 服务";
}

function settingsAiModelPackDisplayLabel(value = "") {
  const key = String(value || "").trim();
  const labels = {
    "Starter Auto": "日常整理",
    "Low Cost Research": "低成本研究",
    "Deep Work": "深度工作",
    "China Optimized": "国内优化",
    "Global Optimized": "远程增强",
    "Privacy First": "本地私密",
    "Ollama Local": "本地 AI",
    "MiniCPM Local": "MiniCPM 本地",
    "MiniCPM Remote": "MiniCPM 远程"
  };
  return labels[key] || key || "日常整理";
}

function settingsAiOverviewSummary() {
  const preview = settingsState.ai.routePreview || null;
  const providerName = String(preview?.provider?.displayName || preview?.provider?.providerId || "").trim();
  const routeModel = String(preview?.route?.modelRef || "").trim();
  const localModel = String(settingsState.ai.localModel || "").trim();
  const routeModelName = routeModel.includes(":") ? routeModel.slice(routeModel.lastIndexOf(":") + 1) : routeModel;
  const rawValue = routeModelName || localModel || String(settingsState.ai.modelPack || "Starter Auto").trim() || "Starter Auto";
  const value = settingsAiModelPackDisplayLabel(rawValue);
  const metaParts = [
    settingsAiRuntimeModeLabel(settingsState.ai.runtimeMode),
    settingsAiUserModeDisplayLabel(settingsState.ai.userMode)
  ];
  if (providerName) metaParts.push(settingsAiProviderDisplayLabel(providerName));
  return {
    value,
    meta: metaParts.filter(Boolean).join(" / ")
  };
}

function setSettingsSection(sectionId = "", options = {}) {
  const nextSection = normalizeSettingsSection(sectionId);
  const changed = settingsState.activeSection !== nextSection;
  settingsState.activeSection = nextSection;
  const firstItem = SETTINGS_DETAIL_ITEMS.find((item) => item.sectionId === nextSection);
  if (firstItem) settingsState.activeItem = firstItem.id;
  if (options.render !== false) {
    if (state.module === "settings") renderSidebarTitle();
    renderSettingsPanel();
  }
  if (changed && options.announce) {
    const config = settingsSectionConfig(nextSection);
    setStatus(`已切换到设置分区：${config.label}`, "ok");
  }
}

function setSettingsItem(itemId = "", options = {}) {
  const nextItem = settingsDetailItemConfig(itemId);
  const changed = settingsState.activeItem !== nextItem.id;
  settingsState.activeItem = nextItem.id;
  settingsState.activeSection = nextItem.sectionId;
  if (options.render !== false) {
    if (state.module === "settings") renderSidebarTitle();
    renderSettingsPanel();
  }
  if (changed && options.announce) {
    setStatus(`已切换到设置项：${nextItem.label}`, "ok");
  }
}

function ensureSettingsWorkbenchLayout() {
  return;
}

function renderSettingsWorkbenchChrome() {
  renderSettingsWorkbenchChromeForRuntime({
    $,
    document,
    settingsState,
    settingsSectionChromeMap,
    settingsAiOverviewSummary,
    settingsMobileItemOptionsHtml,
    settingsLeafLabel,
    formatSettingsUserError
  });
}

function renderSettingsSidebarColumn() {
  renderSettingsSidebarColumnForRuntime({
    $,
    document,
    settingsState,
    settingsSectionChromeMap,
    settingsSectionGuidanceMap,
    escapeHtml
  });
}

function filterSettingsSidebarMenu(query = "") {
  const normalized = String(query || "").trim().toLowerCase();
  document.querySelectorAll("#moduleSidebar .settings-sidebar-menu-item[data-settings-search]").forEach((button) => {
    const searchText = String(button.getAttribute("data-settings-search") || "").toLowerCase();
    const hidden = normalized && !searchText.includes(normalized);
    button.classList.toggle("hidden", Boolean(hidden));
  });
}

function renderSettingsDetailFocus() {
  renderSettingsDetailFocusForRuntime({ $, settingsState });
}

function settingsPanelRuntimeDeps() {
  return {
    $,
    document,
    state,
    settingsState,
    appVersion: APP_VERSION,
    feedbackRepository: FEEDBACK_REPOSITORY,
    feedbackRepositoryReady: FEEDBACK_REPOSITORY_READY,
    syncRailSelectionState,
    ensureSettingsWorkbenchLayout,
    mountSettingsAutomationWorkspace,
    renderSettingsWorkbenchChrome,
    renderSettingsSidebarColumn,
    renderSettingsDetailFocus,
    settingsLeafLabel,
    settingsVaultPathMissing,
    formatSettingsUserError,
    feedbackBaseUrl,
    renderUpdateSettingsCard,
    renderNoteTemplateSettingsCard,
    renderAiLocalModelControls,
    renderAiSettingsExperience,
    renderAiProviderConfigControls,
    renderAiRoutePreview,
    renderScheduledTasksWorkspace,
    renderAiSuggestionsWorkspace,
    aiTestBlockedReason,
    renderAiCanonicalDebugPanel,
    renderSidebarTitle,
    renderModuleWorkspaceHeader,
    escapeHtml
  };
}

function renderSettingsPanel() {
  renderSettingsPanelForRuntime(settingsPanelRuntimeDeps());
}

function noteTemplateFieldMeta(kind = "") {
  return String(kind || "").trim().toLowerCase() === "literature"
    ? LITERATURE_TEMPLATE_SETTINGS_FIELDS
    : PERMANENT_TEMPLATE_SETTINGS_FIELDS;
}

function noteTemplateCardCopy(kind = "") {
  if (String(kind || "").trim().toLowerCase() === "literature") {
    return {
      stats: ["文献模板", "普通 Markdown"],
      summaryClosed: "修改后会用于后续新建文献笔记。",
      summaryOpen: "修改后会用于后续新建文献笔记。",
      statusClosed: "待保存修改",
      statusOpen: "正在编辑",
      previewTitle: "示例文献笔记"
    };
  }
  return {
    stats: ["统一骨架", "普通 Markdown"],
    summaryClosed: "修改后会用于后续新建永久笔记。",
    summaryOpen: "修改后会用于后续新建永久笔记。",
    statusClosed: "待保存修改",
    statusOpen: "正在编辑",
    previewTitle: "示例永久笔记"
  };
}

function noteTemplateEditorElementId(kind = "") {
  return String(kind || "").trim().toLowerCase() === "literature"
    ? "settingsLiteratureTemplateEditor"
    : "settingsPermanentTemplateEditor";
}

function noteTemplateSaveButtonElementId(kind = "") {
  return String(kind || "").trim().toLowerCase() === "literature"
    ? "settingsSaveLiteratureTemplate"
    : "settingsSavePermanentTemplate";
}

function noteTemplateFeedbackElementId(kind = "") {
  return String(kind || "").trim().toLowerCase() === "literature"
    ? "settingsLiteratureTemplateFeedback"
    : "settingsPermanentTemplateFeedback";
}

function noteTemplateFeedbackTextElementId(kind = "") {
  return String(kind || "").trim().toLowerCase() === "literature"
    ? "settingsLiteratureTemplateFeedbackText"
    : "settingsPermanentTemplateFeedbackText";
}

function escapePreviewInline(text = "") {
  return escapeTemplatePreviewInline(text, { escapeHtml });
}

function renderTemplateMarkdownPreviewHtml(source = "") {
  return renderTemplateMarkdownPreviewHtmlForRuntime(source, { escapeHtml });
}

function noteTemplateDraftValidation(kind = "", source = "") {
  const cleanKind = String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
  if (cleanKind !== "literature") return { ok: true, message: "" };
  return validateLiteratureTemplateSource(source);
}

function openNoteTemplatePreview(kind = "") {
  const cleanKind = String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
  const stateEntry = settingsState.noteTemplates?.[cleanKind];
  if (!stateEntry) return;
  const source = normalizeStoredNoteTemplateSource(
    stateEntry.draftActive ? stateEntry.draftText : stateEntry.text,
    cleanKind
  );
  const validation = noteTemplateDraftValidation(cleanKind, source);
  const copy = noteTemplateCardCopy(cleanKind);
  const modal = $("settingsTemplatePreviewModal");
  const title = $("settingsTemplatePreviewTitle");
  const note = $("settingsTemplatePreviewNote");
  const body = $("settingsTemplatePreviewBody");
  if (!modal || !title || !note || !body) return;
  title.textContent = cleanKind === "literature" ? "文献笔记模板预览" : "永久笔记模板预览";
  note.textContent = validation.ok ? "这里会按真实笔记的样子显示。" : `当前内容还不能保存：${validation.message}`;
  body.innerHTML = validation.ok
    ? renderTemplateMarkdownPreviewHtml(applyTitleToNoteTemplate(source, copy.previewTitle, cleanKind))
    : `<div class="markdown-preview-empty">模板当前不能保存：${escapeHtml(validation.message)}</div>`;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeNoteTemplatePreview() {
  const modal = $("settingsTemplatePreviewModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function saveNoteTemplateFromEditor(kind = "") {
  const cleanKind = String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
  const editorField = $(noteTemplateEditorElementId(cleanKind));
  const previousSource = normalizeNoteTemplateSource(settingsState.noteTemplates[cleanKind].text, cleanKind);
  const draftSource = String(editorField?.value || settingsState.noteTemplates[cleanKind].draftText || "").replace(/\r\n/g, "\n");
  const nextSource = normalizeNoteTemplateSource(draftSource, cleanKind);
  if (cleanKind === "literature") {
    const validation = validateLiteratureTemplateSource(nextSource);
    if (!validation.ok) {
      settingsState.noteTemplates[cleanKind].feedbackTone = "warn";
      settingsState.noteTemplates[cleanKind].feedbackText = validation.message || "文献模板当前还不能保存。";
      renderSettingsPanel();
      setStatus(validation.message || "文献模板当前形状不受支持", "warn");
      return;
    }
  }
  if (nextSource !== previousSource) {
    settingsState.noteTemplates[cleanKind].history = noteTemplateHistoryWithPrevious(
      settingsState.noteTemplates[cleanKind].history,
      previousSource,
      cleanKind
    );
  }
  settingsState.noteTemplates[cleanKind].text = nextSource;
  settingsState.noteTemplates[cleanKind].draftText = nextSource;
  settingsState.noteTemplates[cleanKind].draftActive = false;
  settingsState.noteTemplates[cleanKind].feedbackTone = "ok";
  settingsState.noteTemplates[cleanKind].feedbackText = "已保存，新建时会使用这个模板。";
  persistNoteTemplateSettingsToStorage();
  renderSettingsPanel();
  setStatus(`${cleanKind === "literature" ? "文献笔记" : "永久笔记"}模板已保存，后续新建会采用新模板`, "ok");
}

function resetNoteTemplateToDefault(kind = "") {
  const cleanKind = String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
  const previousSource = normalizeNoteTemplateSource(settingsState.noteTemplates[cleanKind].text, cleanKind);
  settingsState.noteTemplates[cleanKind].history = noteTemplateHistoryWithPrevious(
    settingsState.noteTemplates[cleanKind].history,
    previousSource,
    cleanKind
  );
  settingsState.noteTemplates[cleanKind].text = defaultTemplateSourceForKind(cleanKind);
  settingsState.noteTemplates[cleanKind].draftText = settingsState.noteTemplates[cleanKind].text;
  settingsState.noteTemplates[cleanKind].draftActive = false;
  settingsState.noteTemplates[cleanKind].feedbackTone = "ok";
  settingsState.noteTemplates[cleanKind].feedbackText = "已恢复默认模板。";
  persistNoteTemplateSettingsToStorage();
  renderSettingsPanel();
  setStatus(`${cleanKind === "literature" ? "文献笔记" : "永久笔记"}模板已恢复默认`, "ok");
}

function updateNoteTemplatePreviewFromEditor(kind = "") {
  const cleanKind = String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
  const editorField = $(noteTemplateEditorElementId(cleanKind));
  const saveButton = $(noteTemplateSaveButtonElementId(cleanKind));
  const feedback = $(noteTemplateFeedbackElementId(cleanKind));
  const feedbackText = $(noteTemplateFeedbackTextElementId(cleanKind));
  const draftSource = normalizeDraftBuffer(editorField?.value || "");
  settingsState.noteTemplates[cleanKind].draftText = draftSource;
  settingsState.noteTemplates[cleanKind].draftActive = true;
  const validation = noteTemplateDraftValidation(cleanKind, normalizeNoteTemplateSource(draftSource, cleanKind));
  settingsState.noteTemplates[cleanKind].feedbackTone = "warn";
  settingsState.noteTemplates[cleanKind].feedbackText = validation.ok ? "有未保存修改。" : `当前内容还不能保存：${validation.message}`;
  if (feedback && feedbackText) {
    feedback.classList.add("is-visible", "warn");
    feedback.classList.remove("ok");
    feedbackText.textContent = settingsState.noteTemplates[cleanKind].feedbackText;
  }
  if (saveButton) {
    saveButton.disabled = !validation.ok;
    saveButton.title = validation.ok ? "" : validation.message;
    saveButton.dataset.tip = saveButton.title;
  }
}

function renderNoteTemplateSettingsCard(kind = "") {
  const model = buildNoteTemplateSettingsCardModel(kind, {
    stateEntry: settingsState.noteTemplates?.[String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent"],
    defaultTemplateSourceForKind,
    noteTemplateCardCopy,
    normalizeStoredNoteTemplateSource,
    normalizeDraftBuffer,
    normalizeNoteTemplateSource,
    noteTemplateDraftValidation
  });
  const stats = $(`settings${model.capitalizedKind}TemplateStats`);
  const summary = $(`settings${model.capitalizedKind}TemplateSummary`);
  const detail = $(`settings${model.capitalizedKind}TemplateDetail`);
  const editorField = $(`settings${model.capitalizedKind}TemplateEditor`);
  const saveButton = $(noteTemplateSaveButtonElementId(model.cleanKind));
  const feedback = $(noteTemplateFeedbackElementId(model.cleanKind));
  const feedbackText = $(noteTemplateFeedbackTextElementId(model.cleanKind));
  if (stats) {
    stats.innerHTML = model.statsBadges
      .map((badge) => `<span class="settings-stat-badge ${badge.tone || ""}">${escapeHtml(badge.text)}</span>`)
      .join("");
  }
  if (summary) summary.textContent = model.summaryText;
  if (detail) detail.classList.remove("hidden");
  if (editorField && String(editorField.value || "") !== model.visibleSource) editorField.value = model.visibleSource;
  if (saveButton) {
    saveButton.disabled = model.saveDisabled;
    saveButton.title = model.saveTitle;
    saveButton.dataset.tip = saveButton.title;
  }
  if (feedback && feedbackText) {
    feedback.classList.toggle("is-visible", model.feedback.visible);
    feedback.classList.toggle("ok", model.feedback.ok);
    feedback.classList.toggle("warn", model.feedback.warn);
    feedbackText.textContent = model.feedback.text;
  }
}

function renderAiCanonicalDebugPanel() {
  const panel = $("settingsAiCanonicalDebug");
  if (!panel) return;
  panel.innerHTML = renderSettingsAutomationRunHistory({
    snapshots: settingsState.ai.debugSnapshots || {}
  });
}

function isWritingEligibleNote(note) {
  return writingNoteEligibility(note).ok;
}

function writingScopeDirectoryIds() {
  return writingScopeDirectoryIdsForRuntime(state, { descendantDirectoryIds });
}

function writingCandidateNotes() {
  return writingCandidateNotesForRuntime(state, {
    writingScopeDirectoryIds,
    isWritingEligibleNote
  });
}



function writingThemeLabels(notes) {
  return computeWritingThemeLabels(notes, { parseTags });
}

function writingThemeSummary(notes) {
  return computeWritingThemeSummary(notes, { parseTags });
}

function writingThemeIndexById(indexId) {
  return writingThemeIndexByIdForRuntime(writingState, indexId);
}

function writingThemeIndexNoteIds(indexCard) {
  return writingThemeIndexNoteIdsForRuntime(indexCard);
}

function sameUniqueStringSet(left = [], right = []) {
  return sameUniqueStringSetForRuntime(left, right);
}

function selectedWritingThemeIndex() {
  return selectedWritingThemeIndexForRuntime(writingState, { themeIndexById: writingThemeIndexById });
}

function setSelectedWritingThemeIndex(indexId = "") {
  return setSelectedWritingThemeIndexForRuntime(writingState, indexId);
}

function clearWritingThemeRelationCounts(noteIds = []) {
  return clearWritingThemeRelationCountsForRuntime(writingState, noteIds);
}

function setWritingFocusedCandidateScope(noteIds = [], scopeLabel = "") {
  return setWritingFocusedCandidateScopeForRuntime(writingState, noteIds, scopeLabel);
}

function clearWritingFocusedCandidateScope() {
  return clearWritingFocusedCandidateScopeForRuntime(writingState);
}

function writingThemeNotesLoaded(noteIds = []) {
  return uniqueStrings(noteIds).every((noteId) => Boolean(writingKnownNoteById(noteId)?.bodyLoaded));
}

async function hydrateWritingThemeNotes(noteIds = [], { render = true } = {}) {
  const ids = uniqueStrings(noteIds);
  const requestSerial = ++writingState.themeNoteDetailRequestSerial;
  writingState.themeNoteDetailIds = ids;
  writingState.loadingThemeNoteDetails = ids.length > 0;
  if (render && state.module === "writing") renderWritingPanel();
  try {
    await ensureNotesLoaded(ids);
  } finally {
    if (requestSerial === writingState.themeNoteDetailRequestSerial && sameUniqueStringSet(ids, writingState.themeNoteDetailIds)) {
      writingState.loadingThemeNoteDetails = false;
      if (render && state.module === "writing") renderWritingPanel();
    }
  }
}

function shouldHydrateWritingThemeNotes(noteIds = []) {
  const ids = uniqueStrings(noteIds);
  if (!ids.length) return false;
  if (writingThemeNotesLoaded(ids)) return false;
  if (writingState.loadingThemeNoteDetails && sameUniqueStringSet(ids, writingState.themeNoteDetailIds)) return false;
  return true;
}

function upsertWritingThemeIndex(indexCard) {
  if (!indexCard?.id) return;
  writingState.themeIndexes = [
    indexCard,
    ...writingState.themeIndexes.filter((item) => item.id !== indexCard.id)
  ];
}

async function selectWritingThemeIndex(indexId) {
  const id = String(indexId || "").trim();
  if (!id) return null;
  const fetched = await fetchIndexCard(id);
  if (!fetched?.id) return null;
  const noteIds = writingThemeIndexNoteIds(fetched);
  const preservingExistingThemeContext = shouldPreserveWritingThemeContext({
    noteIds,
    loadedThemeNoteIds: writingState.themeNoteDetailIds,
    relationThemeNoteIds: writingState.themeRelationNoteIds,
    sameSet: sameUniqueStringSet
  });
  await ensureNotesLoaded(noteIds);
  upsertWritingThemeIndex(fetched);
  setSelectedWritingThemeIndex(fetched.id);
  writingState.themeNoteDetailIds = noteIds;
  writingState.loadingThemeNoteDetails = false;
  if (!preservingExistingThemeContext) clearWritingThemeRelationCounts(noteIds);
  renderWritingPanel();
  return fetched;
}

function buildThemeIndexItemsFromIds(indexCard, noteIds = []) {
  const existingById = new Map((Array.isArray(indexCard?.items) ? indexCard.items : []).map((item) => [item.note_id, item]));
  return uniqueStrings(noteIds).map((noteId, index) => {
    const existing = existingById.get(noteId);
    const note = writingNoteById(noteId) || existing?.note || null;
    return {
      noteId,
      shortLabel: existing?.short_label || note?.title || "",
      rationale: existing?.rationale || "",
      order: index + 1
    };
  });
}

async function saveSelectedThemeIndexDetail() {
  const selected = selectedWritingThemeIndex();
  if (!selected?.id) throw new Error("theme index is required");
  const title = String($("writingThemeDetailTitle")?.value || "").trim();
  if (!title) throw new Error("title is required");
  const item = await updateIndexCard(selected.id, {
    title,
    summary: String($("writingThemeDetailSummary")?.value || "").trim(),
    thesis: String($("writingThemeDetailThesis")?.value || "").trim(),
    threeLineSummary: [1, 2, 3].map((idx) => String($(`writingThemeDetailSummary${idx}`)?.value || "").trim()),
    centralQuestion: String($("writingThemeDetailCentralQuestion")?.value || "").trim()
  });
  upsertWritingThemeIndex(item);
  setSelectedWritingThemeIndex(item.id);
  renderWritingPanel();
  return item;
}

async function syncSelectedThemeIndexWithBasket(mode = "replace") {
  const selected = selectedWritingThemeIndex();
  if (!selected?.id) throw new Error("theme index is required");
  const basketIds = parseWritingBasketIds();
  if (!basketIds.length) throw new Error("writing basket is empty");
  await ensureNotesLoaded(basketIds);
  const mergedIds =
    mode === "append"
      ? uniqueStrings([...(selected.item_note_ids || []), ...basketIds])
      : uniqueStrings(basketIds);
  await ensureNotesLoaded(mergedIds);
  const item = await updateIndexCard(selected.id, {
    items: buildThemeIndexItemsFromIds(selected, mergedIds)
  });
  upsertWritingThemeIndex(item);
  setSelectedWritingThemeIndex(item.id);
  writingState.themeNoteDetailIds = mergedIds;
  writingState.loadingThemeNoteDetails = false;
  clearWritingThemeRelationCounts(mergedIds);
  renderWritingPanel();
  return item;
}

async function removeNoteFromSelectedThemeIndex(noteId) {
  const selected = selectedWritingThemeIndex();
  if (!selected?.id) throw new Error("theme index is required");
  const nextIds = (selected.item_note_ids || []).filter((id) => id !== noteId);
  if (!nextIds.length) throw new Error("theme index must keep at least one permanent note");
  await ensureNotesLoaded(nextIds);
  const item = await updateIndexCard(selected.id, {
    items: buildThemeIndexItemsFromIds(selected, nextIds)
  });
  upsertWritingThemeIndex(item);
  setSelectedWritingThemeIndex(item.id);
  writingState.themeNoteDetailIds = nextIds;
  writingState.loadingThemeNoteDetails = false;
  clearWritingThemeRelationCounts(nextIds);
  renderWritingPanel();
  return item;
}

async function createWritingProjectFromThemeIndex(indexCardId) {
  const { indexCard, noteIds } = await useThemeIndexAsWritingEntry(indexCardId, {
    replaceBasket: true,
    resetContext: true,
    source: "writing_theme_create_project"
  });
  const title = String($("writingTitle")?.value || "").trim() || normalizeWritingProjectTitleSeed(indexCard.title || indexCard.id);
  const goal = String($("writingGoal")?.value || "").trim() || String(indexCard.central_question || indexCard.summary || "").trim();
  const audience = String($("writingAudience")?.value || "").trim();
  const tone = String($("writingTone")?.value || "").trim();
  const bookStructure = currentWritingBookStructure({
    notes: noteIds.map((noteId) => writingKnownNoteById(noteId) || { id: noteId, title: noteId }),
    includeLocalIdeas: true
  });
  const project = await createWritingProject({
    title,
    goal,
    audience,
    tone,
    intent: deriveWritingProjectIntent({ title, goal, indexCard }),
    desiredReaderTakeaway: deriveWritingProjectTakeaway({ title, goal, audience, indexCard }),
    basketNoteIds: noteIds,
    relatedIndexIds: [indexCard.id],
    bookStructure
  });
  writingState.project = project;
  syncWritingLocalBookIdeasFromProject(project);
  writingState.scaffold = null;
  writingState.scaffoldMarkdown = "";
  populateWritingFormFromProject(project);
  showWritingResult({
    stage: "writing_project",
    writingProjectId: project?.id,
    title: project?.title,
    relatedIndexIds: project?.related_index_ids,
    basketNoteIds: project?.basket_note_ids,
    basketNotes: project?.basket_notes
  });
  await loadWritingProjectsList();
  await loadWritingScaffoldVersions();
  await loadWritingDraftVersions();
  renderWritingPanel();
  return project;
}



function writingSourceIndexSummary() {
  return computeWritingSourceIndexSummary(writingState.sourceIndexIds, { themeIndexById: writingThemeIndexById });
}

function suggestedThemeIndexTitle(noteIds = []) {
  return computeSuggestedThemeIndexTitle(noteIds, { noteById: writingNoteById, parseTags });
}

function clearWritingSourceIndexIds() {
  return clearWritingSourceIndexIdsForRuntime(writingState);
}

function setWritingSourceIndexIds(indexIds = []) {
  return setWritingSourceIndexIdsForRuntime(writingState, indexIds);
}

function resetWritingStrongModelState() {
  return resetWritingStrongModelStateForRuntime(writingState);
}

function resetWritingLocalBookIdeas() {
  return resetWritingLocalBookIdeasForRuntime(writingState);
}

function syncWritingLocalBookIdeasFromProject(project = null) {
  return syncWritingLocalBookIdeasFromProjectForRuntime(writingState, project);
}

function resetWritingProjectForm({ keepTitle = false } = {}) {
  if (!keepTitle && $("writingTitle")) $("writingTitle").value = "";
  if ($("writingGoal")) $("writingGoal").value = "";
  if ($("writingAudience")) $("writingAudience").value = "";
  if ($("writingTone")) $("writingTone").value = "";
}

function writingNoteById(noteId) {
  return state.notes.find((item) => item.id === noteId) || null;
}

function writingCachedNoteById(noteId) {
  return (writingState.project?.basket_notes || []).find((item) => item?.id === noteId) || null;
}

function isDirectoryUnderOriginalRoot(directoryId) {
  return rootBoxIdFromFolder(state, directoryId) === "dir_original_default";
}

function writingNoteEligibility(note) {
  if (!note) {
    return {
      ok: false,
      key: "missing",
      message: "还没能读取到这条永久笔记的完整信息。"
    };
  }
  const noteType = String(note.noteType || note.note_type || "").trim().toLowerCase();
  const inOriginalRoot = noteType === "permanent" || isDirectoryUnderOriginalRoot(note.folderId);
  if (!inOriginalRoot) {
    return {
      ok: false,
      key: "type",
      message: "写作篮只接受永久笔记。"
    };
  }
  const authorship = normalizeAuthorshipItem(note.authorship) || { user_confirmed: false, ai_assisted: false };
  if (!authorship.user_confirmed) {
    return {
      ok: false,
      key: "authorship",
      message: "这条永久笔记还没完成作者确认。"
    };
  }
  if (String(note.status || "").trim().toLowerCase() !== "active") {
    return {
      ok: false,
      key: "draft",
      message: "这条永久笔记仍是 draft，先完成原创性检查后再进入写作中心。"
    };
  }
  return { ok: true, key: "ok", message: "" };
}

function parseWritingBasketIds() {
  return parseWritingBasketIdsForRuntime({ $ });
}

function setWritingBasketIds(noteIds) {
  return setWritingBasketIdsForRuntime(noteIds, { $ });
}

function addWritingBasketIds(noteIds) {
  return addWritingBasketIdsForRuntime(noteIds, {
    parseWritingBasketIds,
    setWritingBasketIds,
    resetWritingProjectContextForBasketChange,
    refreshWritingRelationCounts
  });
}

function removeWritingBasketId(noteId) {
  return removeWritingBasketIdForRuntime(noteId, {
    writingState,
    parseWritingBasketIds,
    setWritingBasketIds,
    resetWritingProjectContextForBasketChange,
    refreshWritingRelationCounts
  });
}

function clearWritingBasket() {
  return clearWritingBasketForRuntime({
    writingState,
    setWritingBasketIds,
    resetWritingLocalBookIdeas
  });
}

let writingBasketManualRefreshTimer = 0;

function handleWritingBasketManualInput() {
  const basketIds = parseWritingBasketIds();
  const title = String($("writingTitle")?.value || "").trim();
  const goal = String($("writingGoal")?.value || "").trim();
  const audience = String($("writingAudience")?.value || "").trim();
  const tone = String($("writingTone")?.value || "").trim();
  resetWritingStrongModelState();
  resetWritingLocalBookIdeas();
  clearWritingSourceIndexIds();
  resetWritingProjectContext({ title, goal, audience, tone });
  writingState.relationCounts = {};
  writingState.relationCountErrors = {};
  writingState.loadingRelationCounts = basketIds.length > 0;
  renderWritingPanel();
  window.clearTimeout(writingBasketManualRefreshTimer);
  writingBasketManualRefreshTimer = window.setTimeout(() => {
    void refreshWritingRelationCounts(parseWritingBasketIds());
  }, 250);
}

function writingKnownNoteById(noteId) {
  return writingNoteById(noteId) || writingCachedNoteById(noteId) || null;
}

function partitionWritingEligibleNoteIds(noteIds = [], { noteLookup = writingKnownNoteById } = {}) {
  const eligibleIds = [];
  const ineligible = [];
  for (const noteId of uniqueStrings(noteIds)) {
    const note = noteLookup(noteId);
    const eligibility = writingNoteEligibility(note || { id: noteId });
    if (eligibility.ok) eligibleIds.push(noteId);
    else {
      ineligible.push({
        id: noteId,
        note,
        ...eligibility
      });
    }
  }
  return { eligibleIds, ineligible };
}

function writingIneligibleSummary(items = []) {
  const counts = items.reduce(
    (acc, item) => {
      const key = ["authorship", "draft", "type", "missing"].includes(item?.key) ? item.key : "other";
      acc[key] += 1;
      return acc;
    },
    { authorship: 0, draft: 0, type: 0, missing: 0, other: 0 }
  );
  return uniqueStrings([
    counts.authorship ? `${counts.authorship} 条未完成作者确认` : "",
    counts.draft ? `${counts.draft} 条仍是 draft` : "",
    counts.type ? `${counts.type} 条不属于永久笔记` : "",
    counts.missing ? `${counts.missing} 条暂未读取完整信息` : "",
    counts.other ? `${counts.other} 条暂不可进入写作` : ""
  ]).join("，");
}

function currentWritingBasketEligibility() {
  return partitionWritingEligibleNoteIds(parseWritingBasketIds());
}

function currentWritingBasketReadiness() {
  const noteIds = parseWritingBasketIds();
  const relationCounts = writingState.relationCounts || {};
  const relationCountErrors = writingState.relationCountErrors || {};
  const relationCountsReady = writingRelationCountsReady(noteIds, relationCounts) && !writingState.loadingRelationCounts;
  const relationCountsErrored = writingRelationCountsErrored(noteIds, relationCountErrors);
  const relationState = relationCountsErrored ? "error" : relationCountsReady ? "loaded" : "loading";
  return deriveBasketWritingReadiness(noteIds, writingKnownNoteById, relationCounts, { relationState });
}

function countExplicitRelationsForWriting(relations = null) {
  return countExplicitSemanticRelations(relations);
}

async function loadWritingRelationCounts(noteIds = []) {
  const ids = uniqueStrings(noteIds);
  if (!ids.length) return { counts: {}, errors: {} };
  const results = await Promise.all(
    ids.map(async (noteId) => {
      try {
        const relations = await fetchNoteRelations(noteId);
        return [noteId, { count: countExplicitRelationsForWriting(relations), error: false }];
      } catch {
        return [noteId, { count: 0, error: true }];
      }
    })
  );
  return results.reduce(
    (acc, [noteId, value]) => {
      acc.counts[noteId] = value.count;
      acc.errors[noteId] = value.error;
      return acc;
    },
    { counts: {}, errors: {} }
  );
}

async function refreshWritingRelationCounts(noteIds = parseWritingBasketIds(), { render = true } = {}) {
  const ids = uniqueStrings(noteIds);
  const requestSerial = ++writingState.relationCountRequestSerial;
  writingState.loadingRelationCounts = ids.length > 0;
  if (!ids.length) {
    writingState.relationCounts = {};
    writingState.relationCountErrors = {};
    if (render && state.module === "writing") renderWritingPanel();
    return { counts: {}, errors: {} };
  }
  if (render && state.module === "writing") renderWritingPanel();
  try {
    const payload = await loadWritingRelationCounts(ids);
    if (requestSerial !== writingState.relationCountRequestSerial) {
      return { counts: writingState.relationCounts, errors: writingState.relationCountErrors };
    }
    writingState.relationCounts = payload.counts;
    writingState.relationCountErrors = payload.errors;
    return payload;
  } finally {
    if (requestSerial === writingState.relationCountRequestSerial) {
      writingState.loadingRelationCounts = false;
      if (render && state.module === "writing") renderWritingPanel();
    }
  }
}

async function refreshWritingThemeRelationCounts(noteIds = [], { render = true } = {}) {
  const ids = uniqueStrings(noteIds);
  const requestSerial = ++writingState.themeRelationCountRequestSerial;
  writingState.themeRelationNoteIds = ids;
  writingState.loadingThemeRelationCounts = ids.length > 0;
  if (!ids.length) {
    writingState.themeRelationCounts = {};
    writingState.themeRelationCountErrors = {};
    if (render && state.module === "writing") renderWritingPanel();
    return { counts: {}, errors: {} };
  }
  if (render && state.module === "writing") renderWritingPanel();
  try {
    const payload = await loadWritingRelationCounts(ids);
    if (requestSerial !== writingState.themeRelationCountRequestSerial || !sameUniqueStringSet(ids, writingState.themeRelationNoteIds)) {
      return { counts: writingState.themeRelationCounts, errors: writingState.themeRelationCountErrors };
    }
    writingState.themeRelationCounts = payload.counts;
    writingState.themeRelationCountErrors = payload.errors;
    return payload;
  } finally {
    if (requestSerial === writingState.themeRelationCountRequestSerial && sameUniqueStringSet(ids, writingState.themeRelationNoteIds)) {
      writingState.loadingThemeRelationCounts = false;
      if (render && state.module === "writing") renderWritingPanel();
    }
  }
}

function writingRelationCountsReady(noteIds = [], relationCounts = {}) {
  const ids = uniqueStrings(noteIds);
  if (!ids.length) return true;
  return ids.every((noteId) => Object.prototype.hasOwnProperty.call(relationCounts || {}, noteId));
}

function writingRelationCountsErrored(noteIds = [], relationCountErrors = {}) {
  const ids = uniqueStrings(noteIds);
  if (!ids.length) return false;
  return ids.some((noteId) => Boolean(relationCountErrors?.[noteId]));
}

function shouldRefreshWritingThemeRelationCounts(noteIds = []) {
  const ids = uniqueStrings(noteIds);
  if (!ids.length) return false;
  if (!writingThemeNotesLoaded(ids)) return false;
  if (!sameUniqueStringSet(ids, writingState.themeRelationNoteIds)) return true;
  if (writingState.loadingThemeRelationCounts) return false;
  return !writingRelationCountsReady(ids, writingState.themeRelationCounts);
}

function writingThemeProjectEntry(indexCard) {
  const noteIds = writingThemeIndexNoteIds(indexCard);
  const notesLoaded = writingThemeNotesLoaded(noteIds);
  const existingProject = findExistingWritingProjectForTheme(indexCard, noteIds);
  const loadingNoteDetails = writingState.loadingThemeNoteDetails && sameUniqueStringSet(noteIds, writingState.themeNoteDetailIds);
  if (!notesLoaded || loadingNoteDetails) {
    return {
      noteIds,
      readiness: null,
      projectEntry: describeWritingThemeProjectEntryState({
        notesLoaded,
        loadingNoteDetails
      })
    };
  }
  const hasMatchingCounts = sameUniqueStringSet(noteIds, writingState.themeRelationNoteIds);
  const relationCounts = hasMatchingCounts ? writingState.themeRelationCounts : {};
  const relationErrors = hasMatchingCounts ? writingState.themeRelationCountErrors : {};
  const relationCountsReady =
    hasMatchingCounts &&
    writingRelationCountsReady(noteIds, relationCounts) &&
    !writingState.loadingThemeRelationCounts;
  const relationCountsErrored = hasMatchingCounts && writingRelationCountsErrored(noteIds, relationErrors);
  const relationState = relationCountsErrored ? "error" : relationCountsReady ? "loaded" : "loading";
  const readiness = deriveBasketWritingReadiness(noteIds, writingKnownNoteById, relationCounts, { relationState });
  const themeContinuation = describeWritingContinuationAction({
    existingProjectId: existingProject?.id || "",
    existingProjectHasScaffold: Boolean(existingProject?.scaffold_id),
    existingProjectHasDraft: Boolean(existingProject?.draft_note_id),
    scopeLabel: "当前主题"
  });
  return {
    noteIds,
    readiness,
    projectEntry:
      themeContinuation ||
      describeWritingThemeProjectEntryState({
        notesLoaded,
        loadingNoteDetails,
        existingProjectId: existingProject?.id || "",
        existingProjectHasScaffold: Boolean(existingProject?.scaffold_id),
        existingProjectHasDraft: Boolean(existingProject?.draft_note_id),
        relationCountsReady,
        relationCountsErrored,
        readinessLevel: readiness.level,
        readinessHint: readiness.hint
      })
  };
}

function findExistingWritingProjectForTheme(indexCard, noteIds = []) {
  const themeId = String(indexCard?.id || "").trim();
  const normalizedNoteIds = uniqueStrings(noteIds);
  if (!themeId && !normalizedNoteIds.length) return null;

  const projects = [writingState.project, ...(Array.isArray(writingState.projects) ? writingState.projects : [])]
    .filter(Boolean)
    .filter((project, index, items) => items.findIndex((item) => item?.id === project?.id) === index);

  return (
    projects.find((project) => {
      const relatedIndexIds = uniqueStrings(project?.related_index_ids || project?.relatedIndexIds || []);
      const basketNoteIds = uniqueStrings(project?.basket_note_ids || project?.basketNoteIds || []);
      if (themeId && relatedIndexIds.includes(themeId)) return true;
      return normalizedNoteIds.length > 0 && sameUniqueStringSet(basketNoteIds, normalizedNoteIds);
    }) || null
  );
}

function writingProjectMatchesContext(project, { themeId = "", noteIds = [] } = {}) {
  const normalizedThemeId = String(themeId || "").trim();
  const normalizedNoteIds = uniqueStrings(noteIds);
  if (!project?.id) return false;

  const relatedIndexIds = uniqueStrings(project?.related_index_ids || project?.relatedIndexIds || []);
  const basketNoteIds = uniqueStrings(project?.basket_note_ids || project?.basketNoteIds || []);

  if (normalizedThemeId && relatedIndexIds.includes(normalizedThemeId)) return true;
  return normalizedNoteIds.length > 0 && sameUniqueStringSet(basketNoteIds, normalizedNoteIds);
}

function writingEntryProjectForContext({ basketNoteIds = [], sourceIndexIds = [] } = {}) {
  const normalizedBasketNoteIds = uniqueStrings(basketNoteIds);
  if (!normalizedBasketNoteIds.length) return null;
  const normalizedSourceIndexIds = uniqueStrings(sourceIndexIds);
  const activeSourceIndexIds = normalizedSourceIndexIds.length
    ? normalizedSourceIndexIds
    : uniqueStrings([writingState.selectedThemeIndexId, ...writingState.sourceIndexIds]);
  const sourceIndexId = activeSourceIndexIds[0] || "";
  const sourceTheme = sourceIndexId ? writingThemeIndexById(sourceIndexId) : null;
  if (
    writingProjectMatchesContext(writingState.project, {
      themeId: sourceIndexId,
      noteIds: normalizedBasketNoteIds
    })
  ) {
    return writingState.project;
  }
  return findExistingWritingProjectForTheme(sourceTheme, normalizedBasketNoteIds);
}

function writingContinuationEntryForContext({ basketNoteIds = [], sourceIndexIds = [], scopeLabel = "当前材料" } = {}) {
  const existingProject = writingEntryProjectForContext({ basketNoteIds, sourceIndexIds });
  return describeWritingContinuationAction({
    existingProjectId: existingProject?.id || "",
    existingProjectHasScaffold: Boolean(existingProject?.scaffold_id),
    existingProjectHasDraft: Boolean(existingProject?.draft_note_id),
    scopeLabel
  });
}

function noteMainPathWritingContinuationEntry(noteId, scopeLabel = "当前笔记") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return null;
  const plan = planWritingBasketEntry({
    existingNoteIds: parseWritingBasketIds(),
    incomingNoteIds: [cleanNoteId]
  });
  return writingContinuationEntryForContext({
    basketNoteIds: plan.basketNoteIds,
    sourceIndexIds: [writingState.selectedThemeIndexId, ...writingState.sourceIndexIds],
    scopeLabel
  });
}

function graphWritingContinuationEntry(candidateNoteIds = [], scopeLabel = "当前图谱切片") {
  const projectedEntry = graphWritingContinuationInput({
    basketNoteIds: parseWritingBasketIds(),
    candidateNoteIds,
    selectedThemeIndexId: writingState.selectedThemeIndexId,
    sourceIndexIds: writingState.sourceIndexIds
  });
  return writingContinuationEntryForContext({
    basketNoteIds: projectedEntry.basketNoteIds,
    sourceIndexIds: projectedEntry.sourceIndexIds,
    scopeLabel
  });
}

function currentWritingEntryProject() {
  const basketNoteIds = parseWritingBasketIds();
  if (!basketNoteIds.length) return null;
  return writingEntryProjectForContext({
    basketNoteIds,
    sourceIndexIds: [writingState.selectedThemeIndexId, ...writingState.sourceIndexIds]
  });
}

function currentWritingContinuationEntry(scopeLabel = "当前材料") {
  return writingContinuationEntryForContext({
    basketNoteIds: parseWritingBasketIds(),
    sourceIndexIds: [writingState.selectedThemeIndexId, ...writingState.sourceIndexIds],
    scopeLabel
  });
}

function writingBasketEntries() {
  return parseWritingBasketIds().map((noteId) => writingKnownNoteById(noteId) || { id: noteId, title: noteId, folderId: "", noteType: "permanent", body: "" });
}

function writingDraftDirectoryId() {
  if (state.selectedFolderId && isDirectoryUnderOriginalRoot(state.selectedFolderId)) return state.selectedFolderId;
  const basketDirectoryId = writingBasketEntries().find((note) => note?.folderId && isDirectoryUnderOriginalRoot(note.folderId))?.folderId;
  return basketDirectoryId || "dir_original_default";
}

function writingDraftTitle() {
  const projectTitle = String(writingState.project?.title || $("writingTitle")?.value || "").trim() || "未命名项目";
  return `${projectTitle} 草稿`;
}

function rewriteMarkdownHeading(markdown, title) {
  const cleanTitle = String(title || "").trim() || "未命名草稿";
  const text = String(markdown || "").replace(/\r\n/g, "\n").trim();
  if (!text) return `# ${cleanTitle}\n`;
  if (/^#\s+/.test(text)) return text.replace(/^#\s+.*$/m, `# ${cleanTitle}`);
  return `# ${cleanTitle}\n\n${text}\n`;
}

function writingDraftBody() {
  const headingTitle = writingDraftTitle();
  const scaffoldMarkdown = rewriteMarkdownHeading(writingState.scaffoldMarkdown, headingTitle).trimEnd();
  const projectId = writingState.project?.id || "";
  const scaffoldId = writingState.scaffold?.id || "";
  const references = uniqueStrings([
    projectId ? `项目：${projectId}` : "",
    scaffoldId ? `草稿骨架：${scaffoldId}` : ""
  ]);
  const tail = references.length ? `\n\n---\n${references.join("\n")}\n` : "\n";
  return `${scaffoldMarkdown}${tail}`;
}

function writingScaffoldFileName(title = "") {
  const base = String(title || "writing-project")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${base || "writing-project"}_scaffold.md`;
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.left = "-10000px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!success) throw new Error("clipboard unavailable");
}

function downloadTextFile(fileName, text) {
  const blob = new Blob([String(text || "")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  window.__lastWritingExport__ = {
    fileName,
    bytes: blob.size,
    downloadedAt: new Date().toISOString()
  };
  return blob.size;
}

function writingNoteExcerpt(note) {
  const text = String(note?.body || "")
    .replace(/\r\n/g, "\n")
    .replace(/^#.*$/m, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "这条永久笔记还没有正文摘要。";
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function writingNoteMeta(note) {
  const folder = folderById(state, note?.folderId);
  return uniqueStrings([
    note?.id,
    folder?.name,
    note?.noteType === "permanent" || rootBoxIdFromFolder(state, note?.folderId) === "dir_original_default" ? "永久笔记" : note?.noteType
  ]).join(" · ");
}
function writingThemeIndexScopeDirectoryId() {
  return writingThemeIndexScopeDirectoryIdForRuntime(state, {
    isDirectoryUnderOriginalRoot,
    writingDraftDirectoryId
  });
}

async function loadWritingThemeIndexes() {
  const directoryId = writingThemeIndexScopeDirectoryId();
  writingState.loadingThemeIndexes = true;
  renderWritingPanel();
  try {
    writingState.themeIndexes = await listIndexCards({
      directoryId,
      includeDescendants: true,
      indexType: "topic",
      limit: 12
    });
    return writingState.themeIndexes;
  } finally {
    writingState.loadingThemeIndexes = false;
    renderWritingPanel();
  }
}



function writingThemeDetailHintText(indexCard) {
  if (!indexCard?.id) return "查看中心问题、主题压缩、相关永久笔记，并确认一条可续接的写作中心入口。";
  const { readiness, projectEntry } = writingThemeProjectEntry(indexCard);
  const themeLabel = String(indexCard.title || indexCard.id || "当前主题").trim() || "当前主题";
  return `${themeLabel}：写作中心入口：${projectEntry.status}。${projectEntry.hint || readiness?.hint || "先补齐条件，再决定是继续当前项目还是创建项目。"}`;
}

function populateWritingFormFromProject(project) {
  if (!project) return;
  if ($("writingTitle")) $("writingTitle").value = project.title || "";
  if ($("writingGoal")) $("writingGoal").value = project.goal || "";
  if ($("writingAudience")) $("writingAudience").value = project.audience || "";
  if ($("writingTone")) $("writingTone").value = project.tone || "";
  setWritingSourceIndexIds(project.related_index_ids || []);
  setWritingBasketIds(project.basket_note_ids || []);
  syncWritingLocalBookIdeasFromProject(project);
}

function currentWritingVersionNote() {
  return String($("writingVersionNote")?.value || "").trim();
}

function promptVersionNoteEdit(currentValue, label) {
  const next = window.prompt(`${label}说明`, String(currentValue || ""));
  if (next === null) return null;
  return String(next).trim();
}

function renderScaffoldVersionCard(version) {
  return renderScaffoldVersionCardView(version, { activeScaffoldId: writingState.scaffold?.id || "" }, { escapeHtml });
}

function renderDraftVersionCard(version) {
  return renderDraftVersionCardView(version, {
    escapeHtml,
    writingProjectStatusLabel
  });
}

async function loadWritingProjectsList() {
  writingState.loadingProjects = true;
  renderWritingPanel();
  try {
    writingState.projects = await listWritingProjects({
      limit: 8,
      q: writingState.projectFilters.q,
      status: writingState.projectFilters.status,
      hasDraft: writingState.projectFilters.hasDraft
    });
  } finally {
    writingState.loadingProjects = false;
    renderWritingPanel();
  }
}

function syncWritingProjectFiltersFromUi() {
  writingState.projectFilters.q = String($("writingProjectsSearch")?.value || "").trim();
  writingState.projectFilters.status = String($("writingProjectsStatusFilter")?.value || "all").trim() || "all";
  writingState.projectFilters.hasDraft = String($("writingProjectsDraftFilter")?.value || "all").trim() || "all";
}

async function loadWritingScaffoldVersions() {
  const writingProjectId = String(writingState.project?.id || "").trim();
  if (!writingProjectId) {
    writingState.scaffoldVersions = [];
    renderWritingPanel();
    return [];
  }
  writingState.loadingScaffoldVersions = true;
  renderWritingPanel();
  try {
    writingState.scaffoldVersions = await listProjectScaffolds(writingProjectId, 12);
    return writingState.scaffoldVersions;
  } finally {
    writingState.loadingScaffoldVersions = false;
    renderWritingPanel();
  }
}

async function loadWritingDraftVersions() {
  const writingProjectId = String(writingState.project?.id || "").trim();
  if (!writingProjectId) {
    writingState.draftVersions = [];
    renderWritingPanel();
    return [];
  }
  writingState.loadingDraftVersions = true;
  renderWritingPanel();
  try {
    writingState.draftVersions = await listProjectDraftVersions(writingProjectId, 12);
    return writingState.draftVersions;
  } finally {
    writingState.loadingDraftVersions = false;
    renderWritingPanel();
  }
}

async function openWritingProject(projectId) {
  resetWritingStrongModelState();
  const project = await fetchWritingProject(projectId);
  writingState.project = project;
  populateWritingFormFromProject(project);
  if (project?.scaffold_id) {
    try {
      const scaffold = await fetchDraftScaffold(project.scaffold_id);
      writingState.scaffold = scaffold.item || null;
      writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
    } catch {
      writingState.scaffold = null;
      writingState.scaffoldMarkdown = "";
    }
  } else {
    writingState.scaffold = null;
    writingState.scaffoldMarkdown = "";
  }
  await refreshWritingRelationCounts(parseWritingBasketIds(), { render: false });
  await refreshWritingProjectState();
  await loadWritingScaffoldVersions();
  await loadWritingDraftVersions();
  renderWritingPanel();
  return project;
}

async function openWritingDraftNoteById(draftNoteId) {
  const id = String(draftNoteId || "").trim();
  if (!id) throw new Error("draftNoteId is required");
  if (!writingNoteById(id)) {
    const fetched = await fetchNote(id);
    if (fetched) state.notes = [mapNoteItem(fetched), ...state.notes.filter((item) => item.id !== id)];
  }
  activateModule("explorer");
  openNoteById(id);
  return id;
}

async function continueWritingProjectEntry(projectId, { openDraft = false, statusMessage = "" } = {}) {
  const project = await openWritingProject(projectId);
  const route = writingProjectContinuationRoute({ projectId, project, openDraft, statusMessage });
  if (route.kind === "missing-draft" || route.kind === "invalid-project") throw new Error(route.errorMessage);
  if (route.kind === "open-draft") await openWritingDraftNoteById(route.draftNoteId);
  setStatus(route.statusMessage, "ok");
  return project;
}

async function prepareWritingStrongModelAnalysis() {
  return writingProjectRuntimeController.prepareWritingStrongModelAnalysis();
}

async function scaffoldBundleForProject(projectLike = null) {
  const project = projectLike || writingState.project;
  if (!project?.id) throw new Error("writingProjectId is required");
  if (!project?.scaffold_id) throw new Error("scaffold is not available for this project");
  if (writingState.project?.id === project.id && writingState.scaffold?.id === project.scaffold_id && String(writingState.scaffoldMarkdown || "").trim()) {
    return {
      project: writingState.project,
      scaffold: writingState.scaffold,
      markdown: writingState.scaffoldMarkdown
    };
  }
  const fetchedProject = writingState.project?.id === project.id ? writingState.project : await fetchWritingProject(project.id);
  const scaffold = await fetchDraftScaffold(project.scaffold_id);
  if (writingState.project?.id === project.id) {
    writingState.project = fetchedProject;
    writingState.scaffold = scaffold.item || null;
    writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
    renderWritingPanel();
  }
  return {
    project: fetchedProject,
    scaffold: scaffold.item || null,
    markdown: scaffold.export?.markdown || scaffold.item?.markdown || ""
  };
}

async function openScaffoldVersion(scaffoldId) {
  const id = String(scaffoldId || "").trim();
  if (!id) throw new Error("draftScaffoldId is required");
  const scaffold = await fetchDraftScaffold(id);
  writingState.scaffold = scaffold.item || null;
  writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
  renderWritingPanel();
  return scaffold;
}

async function copyWritingScaffold(projectLike = null) {
  const bundle = await scaffoldBundleForProject(projectLike);
  const markdown = String(bundle.markdown || "").trim();
  if (!markdown) throw new Error("scaffold markdown is empty");
  await copyTextToClipboard(markdown);
  const fileName = writingScaffoldFileName(bundle.project?.title);
  showWritingResult({
    stage: "writing_copy_scaffold",
    writingProjectId: bundle.project?.id,
    draftScaffoldId: bundle.scaffold?.id,
    fileName,
    characters: markdown.length
  });
  return { ...bundle, fileName, characters: markdown.length };
}

async function exportWritingScaffold(projectLike = null) {
  const bundle = await scaffoldBundleForProject(projectLike);
  const markdown = String(bundle.markdown || "").trim();
  if (!markdown) throw new Error("scaffold markdown is empty");
  const fileName = writingScaffoldFileName(bundle.project?.title);
  const bytes = downloadTextFile(fileName, `${markdown}\n`);
  showWritingResult({
    stage: "writing_export_scaffold",
    writingProjectId: bundle.project?.id,
    draftScaffoldId: bundle.scaffold?.id,
    fileName,
    characters: markdown.length,
    bytes
  });
  return { ...bundle, fileName, characters: markdown.length, bytes };
}


function renderWritingToplineMetric(label, value, note, tone = "") {
  return renderWritingToplineMetricView(label, value, note, tone, { escapeHtml });
}


const writingBookRuntime = createWritingBookRuntime({
  $,
  writingState,
  writingBasketEntries
});
const {
  currentWritingBookStructure,
  deriveWritingBookDesign,
  deriveWritingLocalBookIdeas,
  normalizeWritingBookStructure,
  uniqueWritingBookPoolItems,
  writingBookMatchesAny,
  writingBookPlainText,
  writingBookProjectAudience,
  writingBookProjectGoal,
  writingBookSectionFromNote,
  writingBookShortText,
  writingBookStructureStats
} = writingBookRuntime;

const writingPanelController = createWritingPanelShellController({
  hostProvider: createWritingPanelPrototypeHostProvider(() => ({
    $,
    state,
    writingState,
    folderById,
    rootBoxIdFromFolder,
    writingCandidateNotes,
    writingSourceIndexSummary,
    writingBasketEntries,
    normalizeWritingBookStructure,
    deriveWritingBookDesign,
    writingBookStructureStats,
    parseWritingBasketIds,
    writingKnownNoteById,
    isWritingEligibleNote,
    writingRelationCountsReady,
    writingRelationCountsErrored,
    currentWritingBasketEligibility,
    writingIneligibleSummary,
    writingDraftDirectoryId,
    currentWritingContinuationEntry,
    selectedWritingThemeIndex,
    writingThemeIndexNoteIds,
    findExistingWritingProjectForTheme,
    renderThinkingStatusBadge,
    writingNoteMeta,
    writingNoteExcerpt,
    writingProjectStatusLabel,
    writingThemeProjectEntry,
    shouldHydrateWritingThemeNotes,
    hydrateWritingThemeNotes,
    shouldRefreshWritingThemeRelationCounts,
    refreshWritingThemeRelationCounts,
    clearWritingThemeRelationCounts,
    writingThemeDetailHintText,
    renderWritingToplineMetric,
    writingThemeSummary,
    renderScaffoldVersionCard,
    renderDraftVersionCard,
    writingBookProjectGoal,
    writingBookProjectAudience,
    escapeHtml
  }))
});
const {
  renderWritingPanel,
  renderWritingScaffoldPreview
} = writingPanelController;

async function refreshVaultSettings() {
  try {
    settingsState.vault = await fetchVaultInfo();
    loadNoteTemplateSettingsFromStorage();
    const prefs = await fetchAiPreferences().catch(() => null);
    applyAiPreferencesToSettingsState(prefs, { applyProviderConfig: false });
    persistAiSettingsToStorage();
    settingsState.ai.providerConfigs = await fetchAiProviderConfigs().catch(() => []);
    applyActiveAiProviderConfigToState();
    persistAiSettingsToStorage();
    if (isAiLocalFlowActive({
      runtimeMode: settingsState.ai.runtimeMode,
      modelPack: settingsState.ai.modelPack,
      providerId: currentAiProviderId()
    }) && shouldUseOllamaLocalRuntime()) {
      await previewOllamaLocalAiBootstrapFromUi(localAiPreviewOptionsForAction("settings_refresh"));
    }
    await refreshAiRoutePreview({ render: false });
    await refreshScheduledTaskTemplates({ silent: true });
    await refreshScheduledTasks({ silent: true });
    await refreshAiSuggestions({ silent: true });
    settingsState.error = "";
    renderSettingsPanel();
    return settingsState.vault;
  } catch (error) {
    settingsState.error = String(error?.message || error);
    renderSettingsPanel();
    throw error;
  }
}

const GRAPH_RELATION_TYPE_LABELS = {
  associated_with: "相关",
  free_link: "自由链接",
  asks: "追问",
  duplicates: "重复重叠",
  belongs_to_topic: "归属主题",
  supports: "支持",
  complements: "补充",
  contrasts: "对比",
  contradicts: "反驳",
  extends: "推进",
  precedes: "前提",
  follows: "后续",
  qualifies: "限定",
  example_of: "例子",
  counterexample_to: "反例",
  same_topic: "同主题",
  unexpected_connection: "意外相关",
  bridges: "桥接",
  restates: "重述",
  reframes: "改写问题",
  appears_in_draft: "进入草稿"
};

const GRAPH_RELATION_STATUS_LABELS = {
  confirmed: "已确认",
  draft: "草稿",
  suggested: "建议",
  dismissed: "已忽略",
  archived: "已归档"
};

const GRAPH_CONFLICT_RELATION_TYPES = new Set(["contradicts", "counterexample_to", "contrasts", "qualifies"]);

function graphRelationTypeLabel(type) {
  const key = String(type || "associated_with").trim().toLowerCase();
  if (key === "meaningful") return "有解释力的关系";
  if (key === "noisy") return "链接线索";
  if (key === "index") return "主题归属";
  return GRAPH_RELATION_TYPE_LABELS[key] || key || "关联";
}

function graphRelationSourceLabel(value = "") {
  const key = String(value || "").trim().toLowerCase();
  if (key === "ai" || key === "ai_suggestion") return "AI";
  if (key === "team") return "团队";
  if (key === "import") return "导入";
  return "自己";
}

function graphRelationStatusLabel(status) {
  const key = String(status || "confirmed").trim().toLowerCase();
  return GRAPH_RELATION_STATUS_LABELS[key] || key || "已确认";
}

function renderGraphIcon(...args) {
  return renderGraphIconView(...args);
}

function setGraphFocusDepth(value = "", options = {}) {
  return setGraphFocusDepthForRuntime(graphState, value, {
    ...options,
    writeStoredText
  });
}

function setGraphFocusContextMode(value = "", options = {}) {
  return setGraphFocusContextModeForRuntime(graphState, value, {
    ...options,
    writeStoredText
  });
}

function renderGraphOrientation({ nodes = [], edges = [], supportingCount = 0, conflictCount = 0, bridgeGapCount = 0 } = {}) {
  return `
    <section class="graph-orientation" aria-label="图谱读法">
      <div class="graph-orientation-main">
        <strong>这张图谱帮你判断：这组永久笔记能不能形成一个清楚观点</strong>
        <span>每个点是一条永久笔记，每条线是一条正式关系。先看哪些笔记在支撑，哪里有反方、边界或缺少连接。下面这组数字按当前目录的全部关系统计，不受上方筛选影响。</span>
      </div>
      <div class="graph-read-steps">
        <span>1 找中心观点</span>
        <span>2 看证据链</span>
        <span>3 查反方和边界</span>
        <span>4 补缺少的连接</span>
      </div>
      <div class="graph-relation-legend" aria-label="关系类型说明">
        <span><strong>支持</strong> 形成证据链</span>
        <span><strong>反方</strong> 保留不同看法</span>
        <span><strong>限定</strong> 收束边界条件</span>
        <span><strong>连接</strong> 补上过渡思路</span>
      </div>
      <div class="graph-orientation-metrics">
        <span>笔记 ${Number(nodes.length || 0)} 条</span>
        <span>总关系 ${Number(edges.length || 0)}</span>
        <span>${Number(supportingCount || 0)} 条支持</span>
        <span>${Number(conflictCount || 0)} 条冲突</span>
        <span>${Number(bridgeGapCount || 0)} 个缺口</span>
      </div>
    </section>
  `;
}

function graphNodeTitle(nodeMap, id, fallback = "未命名笔记") {
  const key = String(id || "").trim();
  const node = key ? nodeMap.get(key) : null;
  const knownNote = key ? state.notes.find((note) => String(note?.id || "").trim() === key) : null;
  return String(node?.title || node?.label || node?.name || knownNote?.title || key || fallback).trim() || fallback;
}

function graphEdgeTitle(edge = {}, nodeMap = new Map()) {
  const sourceTitle = edge.fromTitle || graphNodeTitle(nodeMap, edge.fromNoteId, "源笔记");
  const targetTitle = edge.toTitle || graphNodeTitle(nodeMap, edge.toNoteId, "目标笔记");
  return `${sourceTitle} → ${targetTitle}`;
}

function buildGraphInsightCoach({ nodes = [], edges = [], conflictItems = [], bridgeGaps = [], untypedRelations = [] } = {}) {
  const nodeMap = new Map();
  nodes.forEach((node) => {
    const id = String(node?.id || "").trim();
    if (id) nodeMap.set(id, node);
  });

  const degreeMap = new Map(nodes.map((node) => [String(node?.id || ""), 0]));
  edges.forEach((edge) => {
    const fromId = String(edge?.fromNoteId || "").trim();
    const toId = String(edge?.toNoteId || "").trim();
    if (fromId) degreeMap.set(fromId, (degreeMap.get(fromId) || 0) + 1);
    if (toId) degreeMap.set(toId, (degreeMap.get(toId) || 0) + 1);
  });

  const central = [...nodeMap.values()]
    .map((node) => ({ node, degree: degreeMap.get(String(node.id || "")) || 0 }))
    .sort((a, b) => b.degree - a.degree || String(a.node.title || "").localeCompare(String(b.node.title || ""), "zh-Hans-CN"))[0];
  const centralId = central?.node?.id || "";
  const centralTitle = graphNodeTitle(nodeMap, centralId, "当前主题");
  const isCentralEdge = (edge) => edge?.fromNoteId === centralId || edge?.toNoteId === centralId;
  const edgeType = (edge) => String(edge?.relationType || "associated_with").trim().toLowerCase();
  const supports = edges.filter((edge) => ["supports", "complements", "extends", "example_of"].includes(edgeType(edge)));
  const tensions = edges.filter((edge) => GRAPH_CONFLICT_RELATION_TYPES.has(edgeType(edge)));
  const bridges = edges.filter((edge) => ["bridges", "unexpected_connection", "reframes"].includes(edgeType(edge)));
  const flows = edges.filter((edge) => ["precedes", "follows", "appears_in_draft"].includes(edgeType(edge)));
  const nearestSupport = supports.find(isCentralEdge) || supports[0] || null;
  const nearestTension = tensions.find(isCentralEdge) || tensions[0] || null;
  const nearestBridge = bridges.find(isCentralEdge) || bridges[0] || flows.find(isCentralEdge) || flows[0] || null;
  const pathEdges = [nearestSupport, nearestTension, nearestBridge].filter(Boolean);
  const uniquePathEdges = pathEdges.filter((edge, index) => pathEdges.findIndex((item) => item.fromNoteId === edge.fromNoteId && item.toNoteId === edge.toNoteId) === index);

  const headline = !nodes.length
    ? "还没有足够笔记形成图谱判断。"
    : !edges.length
      ? "这组笔记还没有连成可读结构。"
      : `这组笔记正在围绕「${centralTitle}」形成论证。`;
  const thesis = !nodes.length
    ? "先写几条永久笔记，再用关系把观点连接起来。"
    : !edges.length
      ? bridgeGaps.length
        ? `当前至少还有 ${bridgeGaps.length} 个缺少连接的地方。先把待关联笔记或断开的主题群连回主结构，再谈图谱阅读和写作路径。`
        : "当前还没有明确关系，先把两条笔记之间的支持、限定、反驳或桥接写出来。"
    : tensions.length || conflictItems.length
      ? `它不只是收集相近观点，还保留了 ${tensions.length + conflictItems.length} 个反方或边界信号，适合继续追问“这个判断在什么条件下不成立”。`
      : bridges.length || bridgeGaps.length
        ? `它已经有中心和支撑，但还需要补上 ${bridges.length + bridgeGaps.length} 个过渡连接，让读者能顺着思路走下去。`
        : supports.length
          ? "它已经开始形成证据链，可以把中心观点、支撑笔记和例外条件整理成写作提纲。"
          : "它目前更像主题集合，还需要把相邻笔记写成明确的支持、限定或反驳关系。";

  const prompts = !edges.length
    ? [
        nodes.length > 1 ? "这几条笔记之间最缺的那一步过渡判断是什么？" : "再补一条相关永久笔记，图谱才会开始形成结构。",
        bridgeGaps.length ? `先从 ${bridgeGaps[0]?.noteTitles?.[0] || "当前待关联笔记"} 开始，给它补一条能回到主结构的桥接关系。` : "先挑两条笔记，写出明确的支持、限定或反驳关系。",
        "桥接写清后，再回来看哪些关系说明还偏薄。"
      ]
    : [
        central?.degree ? `为什么「${centralTitle}」会成为连接最多的笔记？它是主题，还是只是材料中转站？` : "哪一条笔记最像这组材料的中心判断？",
        nearestTension ? `「${graphEdgeTitle(nearestTension, nodeMap)}」这条张力能不能变成文章里的反方段落？` : "有没有一条笔记能反驳或限定当前中心观点？",
        untypedRelations.length ? `${untypedRelations.length} 条关系还缺说明，先补一句“为什么相关”，洞见会更容易浮出来。` : "关系说明已经较清楚，可以开始挑一条阅读路径进入写作中心。"
      ];

  return {
    headline,
    thesis,
    central,
    pathEdges: uniquePathEdges,
    prompts,
    nodeMap
  };
}

function renderGraphInsightCoach(context = {}) {
  const insight = buildGraphInsightCoach(context);
  const pathMarkup = insight.pathEdges.length
    ? insight.pathEdges
        .map((edge, index) => {
          const relation = graphRelationTypeLabel(edge.relationType);
          return `
            <button class="graph-insight-path-item" type="button" ${graphSelectEdgeActionAttrs(edge)}>
              <span>${index + 1}</span>
              <strong>${escapeHtml(graphEdgeTitle(edge, insight.nodeMap))}</strong>
              <small>${escapeHtml(relation)}${edge.rationale ? ` · ${escapeHtml(edge.rationale)}` : ""}</small>
            </button>
          `;
        })
        .join("")
    : `<div class="graph-insight-empty">还没有可顺读路径。先补几条支持、反驳、限定或桥接关系。</div>`;
  return `
    <section class="graph-insight-coach" aria-label="图谱洞见建议">
      <div class="graph-insight-main">
        <span>图谱洞见</span>
        <strong>${escapeHtml(insight.headline)}</strong>
        <small>${escapeHtml(insight.thesis)}</small>
      </div>
      <div class="graph-insight-prompts" aria-label="可追问的问题">
        ${insight.prompts.map((prompt) => `<span>${escapeHtml(prompt)}</span>`).join("")}
      </div>
      <div class="graph-insight-path" aria-label="推荐阅读路径">
        <div class="graph-insight-path-head">
          <strong>推荐顺读路径</strong>
          <small>从中心、支撑、张力或桥接关系里挑一条线读下去</small>
        </div>
        ${pathMarkup}
      </div>
    </section>
  `;
}

function renderGraphBridgeGapSection(bridgeGaps = [], options = {}) {
  const items = Array.isArray(bridgeGaps) ? bridgeGaps.filter((item) => Array.isArray(item?.noteIds) && item.noteIds.length) : [];
  if (!items.length) return "";
  const open = options.open === true;
  return `
      <details class="graph-section graph-collapsible-section graph-bridge-gap-section" data-graph-section="bridge-gaps"${open ? " open" : ""}>
        <summary class="graph-collapsible-summary">
          <div>
            <div class="graph-section-title">潜在关联</div>
            <div class="graph-section-note">这里收的是还没连成清楚关系、但很值得补上的连接。点开后可以直接回到笔记补关联。</div>
          </div>
          <span class="graph-collapsible-badge">${items.length} 条</span>
        </summary>
        <div class="graph-collapsible-body">
          <div class="graph-list">
            ${items
              .map((gap) => {
                const sourceNoteId = String(gap?.noteIds?.[0] || "").trim();
                const sourceTitle = String(gap?.noteTitles?.[0] || sourceNoteId || "当前笔记").trim() || "当前笔记";
                const targetNoteId = String(gap?.targetNoteIds?.[0] || "").trim();
                const targetTitle = String(gap?.targetNoteTitles?.[0] || targetNoteId || "").trim();
                const gapType = String(gap?.gapType || "bridge_gap").trim().toLowerCase();
                const counterpartSummary = targetTitle
                  ? `建议先把它和「${targetTitle}」补上一条说得清理由的关联。`
                  : "它现在还挂在主结构外面，先补一条能把它带回来的关联。";
                const rationale = graphLocalizedActionText(gap?.suggestedAction || gap?.rationale, counterpartSummary);
                const metaLabel = gapType === "disconnected_cluster" ? "断开的主题群" : "待关联笔记";
                const highlightNodeIds = [sourceNoteId, targetNoteId].filter(Boolean).join(",");
                return `
                  <div class="graph-focus-card graph-bridge-gap-card" data-graph-bridge-gap-id="${escapeHtml(String(gap?.id || sourceNoteId || "").trim())}" data-graph-thinking-highlight="true" data-graph-thinking-node-ids="${escapeHtml(highlightNodeIds)}" data-graph-thinking-title="${escapeHtml(sourceTitle)}" data-graph-thinking-kicker="潜在关联" data-graph-thinking-detail="${escapeHtml(rationale || counterpartSummary)}">
                    <button class="graph-focus-card-main" type="button" data-open-note="${escapeHtml(sourceNoteId)}">
                      <strong>${escapeHtml(sourceTitle)}</strong>
                      <span>${escapeHtml(metaLabel)} · 潜在关联</span>
                      <small>${escapeHtml(rationale || counterpartSummary)}</small>
                    </button>
                    <button class="graph-focus-card-action" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(sourceNoteId)}"${targetNoteId ? ` data-graph-target-note="${escapeHtml(targetNoteId)}"` : ""} data-graph-relation-type="bridges">去补关联</button>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </details>
  `;
}

function graphWeakRelationClues(edges = [], limit = 6) {
  return (Array.isArray(edges) ? edges : [])
    .filter((edge) => GRAPH_LINK_CLUE_RELATION_TYPES.has(String(edge?.relationType || "associated_with").trim().toLowerCase()))
    .slice(0, limit);
}

function renderGraphWeakRelationClueSection(edges = [], options = {}) {
  const items = graphWeakRelationClues(edges, 6);
  if (!items.length) return "";
  const open = options.open === true;
  return `
      <details class="graph-section graph-collapsible-section graph-weak-relation-section" data-graph-section="weak-relations"${open ? " open" : ""}>
        <summary class="graph-collapsible-summary">
          <div>
            <div class="graph-section-title">待判断关联</div>
            <div class="graph-section-note">这些线已经连上，但语义还偏弱。先判断它该强化为论证关系，还是降级为普通线索。</div>
          </div>
          <span class="graph-collapsible-badge">${items.length} 条</span>
        </summary>
        <div class="graph-collapsible-body">
          <div class="graph-list">
            ${items
              .map((edge) => {
                const sourceNoteId = String(edge?.fromNoteId || "").trim();
                const targetNoteId = String(edge?.toNoteId || "").trim();
                const sourceTitle = String(edge?.fromTitle || sourceNoteId || "源笔记").trim() || "源笔记";
                const targetTitle = String(edge?.toTitle || targetNoteId || "目标笔记").trim() || "目标笔记";
                const relationLabel = graphRelationTypeLabel(edge?.relationType);
                const rationale = String(edge?.rationale || "").trim();
                const edgeKey = graphEdgeSelectionKey(edge);
                return `
                  <div class="graph-focus-card graph-weak-relation-card" data-graph-thinking-highlight="true" data-graph-thinking-node-ids="${escapeHtml([sourceNoteId, targetNoteId].filter(Boolean).join(","))}" data-graph-thinking-edge-key="${escapeHtml(edgeKey)}" data-graph-thinking-edge-id="${escapeHtml(String(edge?.id || "").trim())}" data-graph-thinking-edge-from="${escapeHtml(sourceNoteId)}" data-graph-thinking-edge-to="${escapeHtml(targetNoteId)}" data-graph-thinking-edge-type="${escapeHtml(String(edge?.relationType || "").trim().toLowerCase())}" data-graph-thinking-title="${escapeHtml(sourceTitle)} → ${escapeHtml(targetTitle)}" data-graph-thinking-kicker="待判断关联" data-graph-thinking-detail="${escapeHtml(rationale || relationLabel)}">
                    <button class="graph-focus-card-main" type="button" ${graphSelectEdgeActionAttrs(edge)}>
                      <strong>${escapeHtml(sourceTitle)} → ${escapeHtml(targetTitle)}</strong>
                      <span>${escapeHtml(relationLabel)} · 需要判断</span>
                      <small>${escapeHtml(rationale || "这条关系还没有形成清楚论证，需要判断是否值得保留或改类型。")}</small>
                    </button>
                    <button class="graph-focus-card-action" type="button" ${graphSelectEdgeActionAttrs(edge)}>复核</button>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </details>
  `;
}

function graphRelationFilterOptionsDepsForRuntime() {
  return {
    escapeHtml,
    normalizeGraphRelationTypeFilter,
    graphRelationGroupMeta,
    GRAPH_RELATION_GROUP_META,
    GRAPH_MEANINGFUL_RELATION_TYPES,
    GRAPH_INDEX_RELATION_TYPES,
    GRAPH_LINK_CLUE_RELATION_TYPES
  };
}

function graphFilterOptions(edges, field, selected, allLabel, labelFn, statsOverride = null) {
  return graphFilterOptionsForRuntime(edges, field, selected, allLabel, labelFn, statsOverride, graphRelationFilterOptionsDepsForRuntime());
}

const renderGraphViewModeSwitcher = (relationType = "meaningful") =>
  renderGraphViewModeSwitcherForRuntime(relationType, { escapeHtml });

const renderGraphRelationTypeFilter = (edges = [], selected = "meaningful", compact = false, statsOverride = null) =>
  renderGraphRelationTypeFilterForRuntime(edges, selected, compact, statsOverride, {
    escapeHtml,
    graphFilterOptions,
    graphRelationTypeLabel
  });

const graphStructureFallbackEdges = (edges = [], filters = {}) =>
  graphStructureFallbackEdgesForRuntime(edges, filters, { graphEdgeMatchesFilters });

function graphLocalizedActionText(value = "", fallback = "") {
  const text = String(value || "").trim();
  const defaultText = String(fallback || "").trim();
  if (!text) return defaultText;
  if (/Add an intermediate note or an explicit relation/i.test(text)) {
    return "补一条中间判断，或关联一条能说清理由的笔记，把它接回现有论证。";
  }
  if (/Add a bridge note or an explicit relation/i.test(text)) {
    return "补一条桥接笔记，或关联一条能把这个主题群接回主结构的笔记。";
  }
  if (/isolated from the rest/i.test(text)) {
    return "这条笔记暂时游离在当前图谱之外，需要判断是保留独立，还是关联到另一条笔记。";
  }
  if (/disconnected from the main note cluster/i.test(text)) {
    return "这个主题群暂时没有接回主结构，需要判断是否关联一条桥接笔记。";
  }
  if (/[A-Za-z]/.test(text) && !/[\u4e00-\u9fff]/.test(text)) {
    return defaultText || "这里需要补一句中文判断，再决定是否建立关系。";
  }
  return text;
}

function graphReadingLensMeta(value = "insight") {
  return computeGraphReadingLensMeta(value);
}

function renderGraphReadingLensControls(activeLens = "insight", legendOpen = false, trailingMarkup = "") {
  return renderGraphReadingLensControlsView(activeLens, legendOpen, trailingMarkup, { escapeHtml });
}
const GRAPH_WORKBENCH_TAB_META = {
  clues: {
    key: "clues",
    label: "关系待办",
    emptyLabel: "暂无关系待办",
    panelTitle: "关系待办",
    statusLabel: "关系待办",
    note: "优先处理待关联笔记、缺少连接和关系说明太薄的地方。"
  },
  questions: {
    key: "questions",
    label: "思考问题",
    emptyLabel: "暂无思考问题",
    panelTitle: "思考问题",
    statusLabel: "思考问题",
    note: "把值得继续追问的主题、冲突和边界放在这里。"
  }
};

function graphWorkbenchTabMeta(value = "clues") {
  const key = String(value || "clues").trim().toLowerCase();
  return GRAPH_WORKBENCH_TAB_META[key] || GRAPH_WORKBENCH_TAB_META.clues;
}

function graphClueSummaryState({ bridgeGapCount = 0, weakRelationCount = 0, reviewQueue = null, nodes = null, edges = null } = {}) {
  const reviewCount = Number(reviewQueue?.total || 0);
  const aiState = graphAiAnalysisSummaryState({ nodes, edges });
  const categories = [
    { key: "bridge", label: "缺少连接", count: Number(bridgeGapCount || 0) },
    { key: "weak", label: "关系待确认", count: Number(weakRelationCount || 0) },
    { key: "review", label: "理由待补", count: reviewCount },
    { key: "ai", label: "AI 建议", count: Number(aiState.totalCandidates || 0) }
  ].filter((item) => Number(item.count || 0) > 0);
  const total = categories.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const detail = categories.length
    ? categories
        .slice(0, 3)
        .map((item) => `${item.count} ${item.label}`)
        .join(" · ")
    : "当前范围暂时没有明显需要优先处理的关系。";
  return {
    total,
    label: total ? `${total} 项关系待处理` : "暂无待处理关系",
    detail: categories.length ? `建议先处理：${detail}` : detail,
    categories
  };
}

function renderGraphWorkbenchEntryPills({ clueSummary = null, questionSummary = null } = {}) {
  return renderGraphWorkbenchEntryPillsView({ clueSummary, questionSummary }, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}

function renderGraphResearchNavigatorEntry(open = false) {
  return renderGraphResearchNavigatorEntryView(open);
}

const graphReadingLensStateController = createGraphReadingLensStateController({
  graphReadingLensMeta,
  graphEdgeSelectionKey,
  graphRelationVisual,
  graphNodeStarRank
});
const graphEdgeMatchesReadingLens = graphReadingLensStateController.graphEdgeMatchesReadingLens;
const graphBuildReadingLensState = graphReadingLensStateController.graphBuildReadingLensState;

function graphLoadErrorMessage(error) {
  const code = String(error?.code || "").trim().toLowerCase();
  if (code === "request_timeout") {
    return "图谱读取超时，请重试；如果反复出现，检查本地 API 是否卡住。";
  }
  return String(error?.message || error || "图谱读取失败");
}

function renderGraphErrorState(message = "") {
  return `
    <div class="graph-empty graph-error-card">
      <strong>图谱暂时没有读出来</strong>
      <span>当前笔记树仍然可以浏览和编辑。等本地服务恢复后，可以再刷新图谱。</span>
      <div class="graph-empty-actions">
        <button class="mini-btn primary" type="button" data-graph-retry="refresh">刷新图谱</button>
      </div>
    </div>
  `;
}

function renderGraphInlineNotice({ tone = "info", title = "", message = "", retry = false } = {}) {
  const toneClass = tone === "warn" ? "is-warn" : "is-info";
  const safeTitle = String(title || "").trim() || "图谱状态";
  const safeMessage = String(message || "").trim();
  return `
    <div class="graph-inline-notice ${toneClass}">
      <div class="graph-inline-copy">
        <strong>${escapeHtml(safeTitle)}</strong>
        ${safeMessage ? `<span>${escapeHtml(safeMessage)}</span>` : ""}
      </div>
      ${
        retry
          ? `<div class="graph-empty-actions"><button class="mini-btn primary" type="button" data-graph-retry="refresh">刷新图谱</button></div>`
          : ""
      }
    </div>
  `;
}

function graphEdgeMatchesFilters(edge, filters = {}) {
  const type = String(edge?.relationType || "associated_with").trim().toLowerCase();
  const status = String(edge?.status || "confirmed").trim().toLowerCase();
  const filterType = String(filters.relationType || "all").trim().toLowerCase();
  const filterStatus = String(filters.status || "all").trim().toLowerCase();
  const typeMatches =
    filterType === "all"
      ? true
      : filterType === "meaningful"
        ? GRAPH_MEANINGFUL_RELATION_TYPES.has(type)
        : filterType === "index"
          ? GRAPH_INDEX_RELATION_TYPES.has(type)
        : filterType === "noisy"
          ? GRAPH_LINK_CLUE_RELATION_TYPES.has(type)
          : type === filterType;
  return typeMatches && (filterStatus === "all" || status === filterStatus);
}

function graphThemeTitleLooksGeneric(title = "") {
  const text = String(title || "").trim().toLowerCase();
  if (!text) return true;
  return [
    /^ai$/,
    /^notes?$/,
    /^permanent[-_\s]?notes?$/,
    /^knowledge[-_\s]?management$/,
    /^thinking$/,
    /^research$/,
    /^写作$/,
    /^思考$/,
    /^研究$/,
    /^笔记$/,
    /^永久笔记$/,
    /^知识管理$/,
    /^关联笔记$/,
    /^图谱$/
  ].some((pattern) => pattern.test(text));
}

function graphThemeBreadthMeta(topic = {}, { totalNodeCount = 0 } = {}) {
  const noteIds = graphThemeNoteIds(topic);
  const total = Math.max(0, Number(totalNodeCount || 0));
  const coverage = total ? noteIds.length / total : 0;
  const genericTitle = graphThemeTitleLooksGeneric(topic?.title);
  const wideByCount = noteIds.length >= Math.max(24, total * 0.45);
  const wideByCoverage = total >= 8 && coverage > 0.62;
  const genericWide = genericTitle && noteIds.length >= Math.max(8, total * 0.28);
  const broad = wideByCount || wideByCoverage || genericWide;
  return {
    noteIds,
    totalNodeCount: total,
    coverage,
    genericTitle,
    broad,
    reason: broad
      ? genericTitle
        ? "generic_title"
        : wideByCoverage
          ? "high_coverage"
          : "large_cluster"
      : ""
  };
}

function resolveGraphThemeSelection(selection = null, topicCandidates = []) {
  const topicKey = String(selection?.topicKey || selection?.themeKey || "").trim();
  const title = String(selection?.title || "").trim();
  const noteIds = Array.isArray(selection?.noteIds) ? selection.noteIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
  const topics = Array.isArray(topicCandidates) ? topicCandidates : [];
  const matchIndex = topics.findIndex((topic, index) => {
    if (topicKey && graphThemeSelectionKey(topic, index) === topicKey) return true;
    if (title && String(topic?.title || "").trim() === title) return true;
    const candidateNoteIds = graphThemeNoteIds(topic);
    return noteIds.length && candidateNoteIds.length && noteIds.every((id) => candidateNoteIds.includes(id));
  });
  if (matchIndex < 0) return null;
  const topic = topics[matchIndex] || {};
  const resolvedNoteIds = graphThemeNoteIds(topic);
  return {
    topic,
    topicIndex: matchIndex,
    topicKey: graphThemeSelectionKey(topic, matchIndex),
    title: String(topic?.title || "待验证主题").trim() || "待验证主题",
    noteIds: resolvedNoteIds
  };
}

function resolveGraphIsolatedSelection(selection = null, isolatedNotes = [], nodes = []) {
  const isolatedKey = String(selection?.isolatedKey || selection?.noteKey || "").trim();
  const noteId = String(selection?.noteId || selection?.id || "").trim();
  const title = String(selection?.title || "").trim();
  const items = Array.isArray(isolatedNotes) ? isolatedNotes : [];
  const matchIndex = items.findIndex((note, index) => {
    if (isolatedKey && graphIsolatedSelectionKey(note, index) === isolatedKey) return true;
    const candidateId = String(note?.noteId || note?.id || "").trim();
    if (noteId && candidateId === noteId) return true;
    return title && String(note?.title || "").trim() === title;
  });
  if (matchIndex >= 0) {
    const note = items[matchIndex] || {};
    const resolvedNoteId = String(note?.noteId || note?.id || noteId || "").trim();
    return {
      item: note,
      isolatedIndex: matchIndex,
      isolatedKey: graphIsolatedSelectionKey(note, matchIndex),
      noteId: resolvedNoteId,
      title: String(note?.title || resolvedNoteId || "待关联笔记").trim() || "待关联笔记"
    };
  }
  if (noteId && nodes.some((node) => String(node?.id || "").trim() === noteId)) {
    const node = nodes.find((item) => String(item?.id || "").trim() === noteId) || {};
    return {
      item: node,
      isolatedIndex: -1,
      isolatedKey: noteId,
      noteId,
      title: String(node?.title || noteId || "待关联笔记").trim() || "待关联笔记"
    };
  }
  return null;
}

function resolveGraphBridgeSelection(selection = null, bridgeGaps = [], nodes = []) {
  const bridgeKey = String(selection?.bridgeKey || "").trim();
  const noteId = String(selection?.noteId || selection?.sourceNoteId || "").trim();
  const targetNoteId = String(selection?.targetNoteId || "").trim();
  const items = Array.isArray(bridgeGaps) ? bridgeGaps : [];
  const matchIndex = items.findIndex((gap, index) => {
    if (bridgeKey && graphBridgeSelectionKey(gap, index) === bridgeKey) return true;
    const sourceId = String(gap?.noteIds?.[0] || "").trim();
    const candidateTargetId = String(gap?.targetNoteIds?.[0] || "").trim();
    if (noteId && sourceId === noteId && (!targetNoteId || candidateTargetId === targetNoteId)) return true;
    return false;
  });
  if (matchIndex < 0) return null;
  const gap = items[matchIndex] || {};
  const sourceId = String(gap?.noteIds?.[0] || noteId || "").trim();
  if (!sourceId) return null;
  const candidateTargetId = String(gap?.targetNoteIds?.[0] || targetNoteId || "").trim();
  const nodeMap = new Map((Array.isArray(nodes) ? nodes : []).map((node) => [String(node?.id || "").trim(), node]).filter(([id]) => id));
  return {
    item: gap,
    bridgeIndex: matchIndex,
    bridgeKey: graphBridgeSelectionKey(gap, matchIndex),
    noteId: sourceId,
    targetNoteId: candidateTargetId,
    title: String(gap?.noteTitles?.[0] || nodeMap.get(sourceId)?.title || sourceId || "缺少连接").trim() || "缺少连接",
    targetTitle: String(gap?.targetNoteTitles?.[0] || nodeMap.get(candidateTargetId)?.title || candidateTargetId || "").trim(),
    gapType: String(gap?.gapType || "bridge_gap").trim().toLowerCase()
  };
}

function graphBuildIsolatedVisualNodes({ isolatedNotes = [], allNodes = [], currentNodes = [], limit = 12 } = {}) {
  const scopedNodeMap = new Map(
    (Array.isArray(allNodes) ? allNodes : [])
      .map((node) => [String(node?.id || "").trim(), node])
      .filter(([id]) => id)
  );
  const usedIds = new Set((Array.isArray(currentNodes) ? currentNodes : []).map((node) => String(node?.id || "").trim()).filter(Boolean));
  const visualNodes = [];
  (Array.isArray(isolatedNotes) ? isolatedNotes : []).forEach((item, index) => {
    if (visualNodes.length >= limit) return;
    const noteId = String(item?.noteId || item?.id || "").trim();
    if (!noteId || usedIds.has(noteId)) return;
    const scopedNode = scopedNodeMap.get(noteId);
    if (!scopedNode) return;
    const title = String(item?.title || scopedNode?.title || noteId).trim() || noteId;
    const decision = graphIsolatedDecisionMeta(item, scopedNode);
    visualNodes.push({
      ...scopedNode,
      id: noteId,
      title,
      noteType: String(scopedNode?.noteType || scopedNode?.note_type || item?.noteType || item?.note_type || "original").trim() || "original",
      graphVisualState: "isolated",
      isGraphIsolatedCandidate: true,
      isolatedKey: graphIsolatedSelectionKey(item, index),
      isolatedIndex: index,
      isolatedDecisionTone: decision.tone
    });
    usedIds.add(noteId);
  });
  return visualNodes;
}

function normalizeGraphSelectionForVisibleItems(selection = null, { nodes = [], edges = [], topicCandidates = [], isolatedNotes = [], bridgeGaps = [], clusterMeta = [] } = {}) {
  const kind = String(selection?.kind || "").trim().toLowerCase();
  if (kind === "theme") {
    const theme = resolveGraphThemeSelection(selection, topicCandidates);
    return theme
      ? {
          kind: "theme",
          topicKey: theme.topicKey,
          topicIndex: theme.topicIndex,
          title: theme.title,
          noteIds: theme.noteIds
        }
      : null;
  }
  const relationWorkflowSelection = graphNormalizeRelationWorkflowSelection(selection, {
    nodes,
    isolatedNotes,
    resolveIsolatedSelection: resolveGraphIsolatedSelection
  });
  if (relationWorkflowSelection !== undefined) return relationWorkflowSelection;
  if (kind === "bridge") {
    const bridge = resolveGraphBridgeSelection(selection, bridgeGaps, nodes);
    return bridge
      ? {
          kind: "bridge",
          bridgeKey: bridge.bridgeKey,
          bridgeIndex: bridge.bridgeIndex,
          noteId: bridge.noteId,
          targetNoteId: bridge.targetNoteId,
          title: bridge.title,
          targetTitle: bridge.targetTitle,
          gapType: bridge.gapType
        }
      : null;
  }
  if (kind === "node") {
    const nodeId = String(selection?.nodeId || "").trim();
    return nodeId && nodes.some((node) => String(node?.id || "").trim() === nodeId) ? { kind: "node", nodeId } : null;
  }
  if (kind === "edge") {
    const edgeKey = String(selection?.edgeKey || "").trim();
    const fromNoteId = String(selection?.fromNoteId || "").trim();
    const toNoteId = String(selection?.toNoteId || "").trim();
    const relationType = String(selection?.relationType || "").trim().toLowerCase();
    const edge = edges.find((item) => {
      if (edgeKey && graphEdgeSelectionKey(item) === edgeKey) return true;
      const samePair = String(item?.fromNoteId || "").trim() === fromNoteId && String(item?.toNoteId || "").trim() === toNoteId;
      if (!samePair) return false;
      return !relationType || String(item?.relationType || "").trim().toLowerCase() === relationType;
    });
    return edge
      ? {
          kind: "edge",
          edgeKey: graphEdgeSelectionKey(edge),
          fromNoteId: String(edge?.fromNoteId || "").trim(),
          toNoteId: String(edge?.toNoteId || "").trim(),
          relationType: String(edge?.relationType || "").trim().toLowerCase(),
          relationId: String(edge?.id || "").trim()
        }
      : null;
  }
  if (kind === "cluster") {
    const clusterKey = String(selection?.clusterKey || "").trim();
    const cluster = (Array.isArray(clusterMeta) ? clusterMeta : []).find((item) => String(item?.clusterKey || "").trim() === clusterKey);
  return cluster
      ? {
          kind: "cluster",
          clusterKey,
          clusterIndex: Number(cluster.clusterIndex || 0),
          title: String(cluster.title || `主题群 ${Number(cluster.clusterIndex || 0) + 1}`).trim(),
          anchorId: String(cluster.anchorId || "").trim(),
          memberIds: uniqueStrings(cluster.memberIds || [])
        }
      : null;
  }
  return null;
}

function graphRelationGroupCounts(edges = []) {
  return edges.reduce(
    (acc, edge) => {
      const groupKey = graphRelationVisual(edge?.relationType).key || "neutral";
      acc[groupKey] = (acc[groupKey] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, support: 0, conflict: 0, boundary: 0, bridge: 0, flow: 0, neutral: 0, index: 0 }
  );
}

function graphNodeRoleMeta(node = {}, directEdges = []) {
  const counts = graphRelationGroupCounts(directEdges);
  const degree = Number(node?.degree || directEdges.length || 0);
  if (!degree) {
    return {
      label: "待关联笔记",
      tone: "isolated",
      detail: "它暂时还没有进入任何主题群。先判断：这是值得保留的独立观察，还是缺少一条能说清理由的关系。",
      prompt: "它应该暂时独立，还是能连接到一个正在形成的主题？"
    };
  }
  if (counts.conflict || counts.boundary) {
    return {
      label: "反方或边界角色",
      tone: "conflict",
      detail: "它已经承担反方、限定或边界工作。适合继续检查条件是否写清楚，避免观点滑得太宽。",
      prompt: "这条笔记是在限制一个观点，还是在提出真正的反例？"
    };
  }
  if (counts.bridge >= Math.max(1, counts.support) && counts.bridge) {
    return {
      label: "连接两个主题",
      tone: "bridge",
      detail: "它像两组想法之间的过渡。这里最有价值的动作不是多连线，而是把过渡理由写成一句清楚判断。",
      prompt: "它连接的两端，真正共享的是概念、问题，还是方法？"
    };
  }
  if (counts.flow) {
    return {
      label: "可进入写作",
      tone: "flow",
      detail: "它已经接近文章里的前提、后续或草稿路径。适合判断是否能进入段落顺序。",
      prompt: "它在文章里更像前提、转折，还是结论的一部分？"
    };
  }
  if (counts.support >= 2 || degree >= 4) {
    return {
      label: degree >= 4 ? "主题核心" : "关键支撑",
      tone: "support",
      detail: "它被多条关系支撑或连接。下一步要分辨：这是稳定主题，还是只是材料中转站。",
      prompt: "这些连接是否都在回答同一个问题？如果是，主题卡标题应该怎么写？"
    };
  }
  return {
    label: "普通关联笔记",
    tone: "neutral",
    detail: "它已经进入网络，但角色还不明显。适合补一句它与相邻笔记之间为什么相关。",
    prompt: "这条笔记贡献的是定义、例子、证据、反方，还是一个新问题？"
  };
}

function graphNodeInsightMeta(node = {}, directEdges = [], { nodeMap = new Map(), edges = [] } = {}) {
  const noteId = String(node?.id || "").trim();
  const role = graphNodeRoleMeta(node, directEdges);
  const counts = graphRelationGroupCounts(directEdges);
  const degree = Number(node?.degree || directEdges.length || 0);
  const missingReasonCount = directEdges.filter((edge) => {
    const rationale = String(edge?.rationale || "").trim();
    return !rationale || rationale === "markdown_wikilink";
  }).length;
  const weakTopicCount = directEdges.filter((edge) => {
    const type = String(edge?.relationType || "").trim().toLowerCase();
    return type === "same_topic" || type === "associated_with" || type === "free_link";
  }).length;
  const aiCandidates = graphAiRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 3 });
  const localCandidates = graphLocalRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 3 });
  const themeNoteIds = graphThemeCandidateNoteIdsForNode(noteId, directEdges, []);
  let quality = "关系清楚";
  let qualityDetail = "已有关系可以支撑网络阅读，继续检查是否能形成主题。";
  if (!degree) {
    quality = "还没有正式关系";
    qualityDetail = aiCandidates.length || localCandidates.length ? "已有候选，先确认一条真正成立的关系。" : "先找一条能说清理由的连接。";
  } else if (missingReasonCount) {
    quality = "理由待补";
    qualityDetail = `${missingReasonCount} 条关系还缺少可审查理由。`;
  } else if (weakTopicCount >= Math.max(2, directEdges.length)) {
    quality = "同主题偏多";
    qualityDetail = "当前更像索引聚合，需要判断哪些能升级为支持、限定或桥接。";
  } else if (counts.total >= 3 && !counts.conflict && !counts.boundary) {
    quality = "边界偏少";
    qualityDetail = "支撑关系已经有基础，但反方、限定或边界还不明显。";
  } else if (counts.conflict || counts.boundary) {
    quality = "已有边界";
    qualityDetail = "这条笔记已经有张力或限定关系，适合检查条件是否清楚。";
  }
  const nextStep = !degree
    ? "先保存一条关系"
    : missingReasonCount
      ? "先补最重要关系的理由"
      : themeNoteIds.length >= 3
        ? "整理成主题草稿"
        : counts.conflict || counts.boundary
          ? "把边界写进观点提纯"
          : "继续补一条高质量关系";
  return {
    role,
    position: role.label,
    positionDetail: role.detail,
    quality,
    qualityDetail,
    nextStep,
    candidateCount: aiCandidates.length + localCandidates.length,
    themeNoteCount: themeNoteIds.length
  };
}

function renderGraphNodeInsightPanel(insight = {}) {
  if (!insight?.position) return "";
  const candidateText = `${Number(insight.candidateCount || 0)} 个可选目标 · ${Number(insight.themeNoteCount || 0)} 条可整理笔记`;
  return `
    <section class="graph-node-insight" aria-label="笔记关系摘要">
      <div class="graph-node-insight-summary">
        <span>当前状态</span>
        <strong>${escapeHtml(insight.quality)}</strong>
        <p>${escapeHtml(insight.qualityDetail)}</p>
      </div>
      <div class="graph-node-next-action">
        <span>建议下一步</span>
        <strong>${escapeHtml(insight.nextStep)}</strong>
        <p>${escapeHtml(candidateText)}</p>
      </div>
      <details class="graph-node-insight-details">
        <summary>为什么这样判断</summary>
        <div>
          <span>在图谱中的作用</span>
          <strong>${escapeHtml(insight.position)}</strong>
          <p>${escapeHtml(insight.positionDetail)}</p>
        </div>
      </details>
    </section>
  `;
}

function graphEdgeReviewMeta(edge = {}) {
  const rationale = String(edge?.rationale || "").trim();
  const relationType = String(edge?.relationType || "associated_with").trim().toLowerCase();
  const visual = graphRelationVisual(relationType);
  if (!rationale || rationale === "markdown_wikilink") {
    return {
      label: "缺关系说明",
      tone: "review",
      detail: "这条线现在更像链接线索，还没有回答“为什么相关”。先补一句关系说明，再决定是否保留。",
      prompt: "如果只能留一句话解释这条关系，它应该是什么？"
    };
  }
  if (visual.key === "conflict") {
    return {
      label: "检查张力条件",
      tone: "conflict",
      detail: "这条关系保留了反方或对比。重点检查冲突成立的条件，别让它变成泛泛的不同意见。",
      prompt: "它反对的是结论、前提，还是适用范围？"
    };
  }
  if (visual.key === "boundary") {
    return {
      label: "检查边界",
      tone: "boundary",
      detail: "这条关系在收窄概念或补充限定。适合检查限定条件是否具体、可复用。",
      prompt: "这个限定能否变成未来判断同类材料的规则？"
    };
  }
  if (visual.key === "bridge") {
    return {
      label: "检查桥接质量",
      tone: "bridge",
      detail: "这条关系承担跨主题连接。重点看桥接理由是否足够清楚，而不是只因为两个标题相似。",
      prompt: "它桥接的是问题、概念，还是研究方法？"
    };
  }
  if (visual.key === "support") {
    return {
      label: "检查支撑强度",
      tone: "support",
      detail: "这条关系在支撑或推进观点。适合检查它提供的是证据、例子、定义，还是进一步推论。",
      prompt: "它是在证明观点，还是只是补充背景？"
    };
  }
  return {
    label: "复核关系类型",
    tone: "neutral",
    detail: "这条关系已经有说明，但语义角色还可以再判断一次，避免把索引关系当成论证关系。",
    prompt: "这条线如果删掉，会损失论证，还是只损失导航？"
  };
}

function graphEdgeRationaleLooksComplex(rationale = "") {
  const text = String(rationale || "").trim();
  if (text.length >= 96) return true;
  return /同时|但是|然而|另一方面|以及|并且|反过来|不过|既.*又/.test(text);
}

function graphEdgeAdjustmentPlan(edge = {}) {
  const rationale = String(edge?.rationale || "").trim();
  const relationType = String(edge?.relationType || "associated_with").trim().toLowerCase();
  const visual = graphRelationVisual(relationType);
  const source = String(edge?.createdBy || "").trim().toLowerCase();
  const status = String(edge?.status || "confirmed").trim().toLowerCase();
  const isWeakLink = GRAPH_LINK_CLUE_RELATION_TYPES.has(relationType) || relationType === "associated_with" || relationType === "free_link";
  const missingRationale = !rationale || rationale === "markdown_wikilink";
  const likelyGenerated = source === "ai" || source === "ai_suggestion" || status === "suggested" || status === "draft";
  const complex = graphEdgeRationaleLooksComplex(rationale);
  const directional = ["supports", "example_of", "counterexample_to", "precedes", "follows", "extends", "contradicts", "qualifies"].includes(relationType);
  let recommendation = "strengthen";
  let label = "先补理由";
  let detail = "这条关系现在还不够可判断。先把“为什么相连”写清楚，再决定是否改类型、反向或删除。";
  if (complex) {
    recommendation = "split";
    label = "考虑拆成两条";
    detail = "当前理由里可能混合了多个判断。与其用一条线承载太多意思，不如拆成两条更具体的关系。";
  } else if (isWeakLink && !missingRationale) {
    recommendation = "change-type";
    label = "考虑改类型";
    detail = "它已经有说明，但类型仍像普通链接。适合判断是否应改成支持、限定、反驳、桥接或前后关系。";
  } else if (directional && !missingRationale) {
    recommendation = "reverse";
    label = "核对方向";
    detail = "这类关系有方向性。请检查源笔记是否真的指向目标笔记，而不是目标笔记在支撑或限定源笔记。";
  } else if (missingRationale && (likelyGenerated || isWeakLink)) {
    recommendation = "remove";
    label = "可能降级或删除";
    detail = "如果补不出清楚理由，这条线可能只是标题相似或临时线索。可以降级为链接线索，或在编辑里删除。";
  } else if (visual.key === "conflict" || visual.key === "boundary") {
    recommendation = "change-type";
    label = "核对张力类型";
    detail = "它可能是反驳、对比、反例或限定。重点不是删掉张力，而是把张力类型和成立条件分清。";
  }
  const cards = [
    {
      key: "strengthen",
      title: "补理由",
      text: "先写清这条线为什么成立，尤其是它为论证贡献了什么。",
      actionLabel: "去补理由"
    },
    {
      key: "change-type",
      title: "改类型",
      text: "把普通链接改成支持、限定、反驳、桥接、前提或后续。",
      actionLabel: "去改类型"
    },
    {
      key: "reverse",
      title: "反向",
      text: "检查论证方向是否反了：谁支撑谁，谁限定谁。",
      actionLabel: "去核对方向"
    },
    {
      key: "split",
      title: "拆成两条",
      text: "当一条理由里有两个判断时，拆开会更清楚。",
      actionLabel: "去拆分"
    },
    {
      key: "remove",
      title: "删除/降级",
      text: "如果没有解释力，就删除，或降级为普通链接线索。",
      actionLabel: "去整理"
    }
  ].map((card) => ({ ...card, active: card.key === recommendation }));
  return { recommendation, label, detail, cards };
}

function renderGraphSelectionMetrics(items = []) {
  return renderGraphSelectionMetricsView(items, {
    escapeHtml,
    renderGraphIcon,
    graphSafeActionAttrs
  });
}

function graphSafeActionAttrs(attrs = "") {
  const text = String(attrs || "").trim();
  if (!text) return "";
  return /^(?:data-[a-z0-9-]+="[^"<>&]*"\s*)+$/i.test(text) ? text : "";
}

function renderGraphSelectionTask(task = null) {
  return renderGraphSelectionTaskView(task, {
    escapeHtml,
    renderGraphIcon,
    graphSafeActionAttrs
  });
}

function renderGraphPromptDetails(title = "思考提示（可选）", prompts = []) {
  return renderGraphPromptDetailsView(title, prompts, {
    escapeHtml,
    renderGraphIcon,
    graphSafeActionAttrs
  });
}

function renderGraphSelectionShell({ className = "", ariaLabel = "", kicker = "", title = "", meta = "", closeLabel = "收起详情", roleLabel = "", roleDetail = "", task = null, body = "", actions = "" } = {}) {
  return renderGraphSelectionShellView({ className, ariaLabel, kicker, title, meta, closeLabel, roleLabel, roleDetail, task, body, actions }, {
    escapeHtml,
    renderGraphIcon,
    graphSafeActionAttrs
  });
}

function graphThemeMaturityMeta(topic = {}, { nodeMap = new Map(), edges = [] } = {}) {
  const noteIds = graphThemeNoteIds(topic);
  const noteSet = new Set(noteIds);
  const memberEdges = (Array.isArray(edges) ? edges : []).filter(
    (edge) =>
      graphRelationStatusCountsAsNetworkEdge(edge?.status) &&
      noteSet.has(String(edge?.fromNoteId || "").trim()) &&
      noteSet.has(String(edge?.toNoteId || "").trim())
  );
  const externalEdges = (Array.isArray(edges) ? edges : []).filter((edge) => {
    if (!graphRelationStatusCountsAsNetworkEdge(edge?.status)) return false;
    const fromInside = noteSet.has(String(edge?.fromNoteId || "").trim());
    const toInside = noteSet.has(String(edge?.toNoteId || "").trim());
    return (fromInside || toInside) && fromInside !== toInside;
  });
  const counts = graphRelationGroupCounts(memberEdges);
  const title = String(topic?.title || "").trim();
  const rationale = String(topic?.rationale || topic?.summary || "").trim();
  const breadth = graphThemeBreadthMeta(topic, { totalNodeCount: nodeMap?.size || 0 });
  let score = 0;
  if (noteIds.length >= 5) score += 24;
  else if (noteIds.length >= 3) score += 18;
  else if (noteIds.length >= 2) score += 10;
  if (memberEdges.length >= Math.max(1, noteIds.length - 1)) score += 24;
  else if (memberEdges.length >= 2) score += 16;
  else if (memberEdges.length >= 1) score += 8;
  if (counts.support >= 2) score += 14;
  else if (counts.support) score += 8;
  if (counts.conflict || counts.boundary) score += 16;
  if (counts.bridge || externalEdges.length) score += 10;
  if (rationale.length >= 34) score += 10;
  if (title.length >= 4 && !["待验证主题", "主题候选"].includes(title)) score += 8;
  if (breadth.genericTitle) score -= 14;
  score = Math.max(0, Math.min(100, score));
  const missing = [];
  if (breadth.broad) missing.push("候选覆盖太宽，先收窄到一个可争论的问题。");
  if (breadth.genericTitle) missing.push("标题像标签而不是判断，先改写成研究问题或观点句。");
  if (noteIds.length < 3) missing.push("成员笔记偏少，先别急着建主题卡。");
  if (!memberEdges.length) missing.push("成员之间还缺明确关系，像聚类多过论证。");
  if (!counts.conflict && !counts.boundary) missing.push("还没有反方或边界，主题容易过宽。");
  if (!counts.support) missing.push("支撑关系不足，主题标题可能只是标签。");
  if (breadth.broad) {
    const looseScore = Math.max(18, Math.min(44, score));
    return {
      score: looseScore,
      tone: "loose",
      label: "松散标签，先收窄",
      detail: "这个候选覆盖面太大，更像导航标签或材料入口。现在不宜直接形成主题卡，应先缩成一个更具体、可争论的问题。",
      next: "从中挑 3-8 条真正回答同一问题的笔记，写出一句临时主题判断，再决定是否拆分或建主题卡。",
      missing,
      noteIds,
      memberEdges,
      externalEdges,
      counts,
      breadth
    };
  }
  if (score >= 74) {
    return {
      score,
      tone: "mature",
      label: "可以形成主题卡",
      detail: "这组笔记已有足够成员和内部关系，可以尝试把它写成一个明确问题或判断，再继续补边界。",
      next: "先写一句主题判断，再检查哪条笔记提供支撑、哪条笔记提供反方或限定。",
      missing,
      noteIds,
      memberEdges,
      externalEdges,
      counts,
      breadth
    };
  }
  if (score >= 48) {
    return {
      score,
      tone: "testing",
      label: "值得继续验证",
      detail: "这组笔记有成题迹象，但还需要补关系说明、反方或边界，避免过早把相似材料揉成一个主题。",
      next: "挑两条最关键的成员笔记，补清它们为什么属于同一个问题。",
      missing,
      noteIds,
      memberEdges,
      externalEdges,
      counts,
      breadth
    };
  }
  return {
    score,
    tone: "early",
    label: "暂不急着成题",
    detail: "这更像一个线索聚集，还没稳到可以形成主题。先找共同问题，或把它拆成更小的关系判断。",
    next: "先不要建主题卡，优先补一条成员之间的真实关系，或者拆成两个更具体的问题。",
    missing,
    noteIds,
    memberEdges,
    externalEdges,
    counts,
    breadth
  };
}

function graphThemeCandidateQualityMeta(topic = {}, { nodeMap = new Map(), edges = [], index = 0 } = {}) {
  const maturity = graphThemeMaturityMeta(topic, { nodeMap, edges });
  const noteIds = maturity.noteIds || [];
  const relationDensity = noteIds.length ? maturity.memberEdges.length / noteIds.length : 0;
  let sortScore = maturity.score;
  if (maturity.tone === "mature") sortScore += 18;
  else if (maturity.tone === "testing") sortScore += 10;
  else if (maturity.tone === "early") sortScore -= 6;
  else if (maturity.tone === "loose") sortScore -= 26;
  if (noteIds.length >= 3 && noteIds.length <= 18) sortScore += 8;
  if (relationDensity >= 0.8) sortScore += 6;
  if ((maturity.counts.conflict || 0) + (maturity.counts.boundary || 0)) sortScore += 5;
  sortScore -= Number(index || 0) * 0.1;
  const listLabel =
    maturity.tone === "mature"
      ? "成熟主题候选"
      : maturity.tone === "testing"
        ? "待验证聚集"
        : maturity.tone === "loose"
          ? "松散标签"
          : "早期线索聚集";
  const listPriority =
    maturity.tone === "loose"
      ? 70 + Math.min(6, maturity.score / 10)
      : maturity.tone === "early"
        ? 80 + Math.min(6, maturity.score / 10)
        : 88 + Math.min(11, maturity.score / 8);
  const listQuestion =
    maturity.tone === "loose"
      ? "它能否收窄成一个具体研究问题，还是应该只作为导航标签保留？"
      : "这组笔记能否写成一句可争论的判断，而不只是共享同一个标签？";
  return {
    ...maturity,
    sortScore,
    listLabel,
    listPriority,
    listQuestion
  };
}

function graphRankThemeCandidates(topicCandidates = [], { nodeMap = new Map(), edges = [] } = {}) {
  return (Array.isArray(topicCandidates) ? topicCandidates : [])
    .map((topic, index) => ({
      topic,
      originalIndex: index,
      quality: graphThemeCandidateQualityMeta(topic, { nodeMap, edges, index })
    }))
    .sort((a, b) => Number(b.quality?.sortScore || 0) - Number(a.quality?.sortScore || 0) || Number(a.originalIndex || 0) - Number(b.originalIndex || 0));
}

function renderGraphThemeSelectionPanel({ selection = null, topicCandidates = [], nodeMap = new Map(), edges = [] } = {}) {
  const theme = resolveGraphThemeSelection(selection, topicCandidates);
  if (!theme) return "";
  const topic = theme.topic || {};
  const maturity = graphThemeMaturityMeta(topic, { nodeMap, edges });
  const rationale = String(topic?.rationale || topic?.summary || "").trim();
  const firstNoteId = maturity.noteIds[0] || "";
  const memberNotes = maturity.noteIds
    .map((id) => nodeMap.get(id) || { id, title: id, noteType: "note" })
    .slice(0, 6);
  const prompts = [
    "这个主题能否写成一句可争论的判断，而不只是一个名词标签？",
    maturity.counts.conflict || maturity.counts.boundary ? "已有边界或反方：它是否应该成为主题卡里的限制条件？" : "它缺哪一种反方、限定或反例，才能避免主题过宽？",
    maturity.memberEdges.length ? "哪些关系是主题成立的关键，哪些只是导航线索？" : "哪两条成员笔记之间最应该先补一条明确关系？"
  ];
  return renderGraphSelectionShell({
    className: `is-theme is-${maturity.tone}`,
    ariaLabel: "主题群详情",
    kicker: "主题群评估",
    title: theme.title,
    meta: `${maturity.noteIds.length || 0} 条笔记 · ${maturity.memberEdges.length || 0} 条组内关系`,
    closeLabel: "收起主题群详情",
    roleLabel: maturity.label,
    roleDetail: maturity.detail,
    body: `
      <div class="graph-theme-maturity is-${escapeHtml(maturity.tone)}" aria-label="主题成熟度评分">
        <div class="graph-theme-maturity-head">
          <small>成熟度</small>
          <strong>${escapeHtml(String(maturity.score))}%</strong>
        </div>
        <div class="graph-theme-meter"><i style="width: ${escapeHtml(String(maturity.score))}%"></i></div>
        <p>${escapeHtml(maturity.next)}</p>
      </div>
      <div class="graph-selection-metrics" aria-label="主题群关系结构">
        ${renderGraphSelectionMetrics([
          { label: "成员", value: `${maturity.noteIds.length} 条` },
          { label: "组内关系", value: `${maturity.memberEdges.length} 条` },
          { label: "支撑", value: `${maturity.counts.support || 0} 条` },
          { label: "反方/边界", value: `${(maturity.counts.boundary || 0) + (maturity.counts.conflict || 0)} 条` }
        ])}
      </div>
      ${renderGraphThemeIndexWorkspace(maturity.noteIds, { title: theme.title, relationCount: maturity.memberEdges.length, tone: maturity.tone })}
      <section class="graph-selection-reason">
        <small>候选理由</small>
        <p>${escapeHtml(rationale || "这组笔记被识别为可能围绕同一问题，但还需要人工判断共同问题是什么。")}</p>
      </section>
      ${
        maturity.missing.length
          ? `<section class="graph-selection-reason is-warning">
              <small>先补这些缺口</small>
              ${maturity.missing.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
            </section>`
          : ""
      }
      <section class="graph-theme-notes" aria-label="主题候选成员笔记">
        <strong>成员笔记</strong>
        ${memberNotes
          .map(
            (note) => `
              <button class="graph-theme-note" type="button" data-open-note="${escapeHtml(note.id)}">
                <span>${escapeHtml(note.title || note.id)}</span>
                <small>${escapeHtml(noteTypeLabel(note.noteType))}</small>
              </button>
            `
          )
          .join("")}
      </section>
      ${renderGraphPromptDetails("判断提示（可选）", prompts)}`,
    actions: `
      <button class="graph-selection-action is-primary" type="button" data-graph-create-theme-index data-graph-theme-note-ids="${escapeHtml(maturity.noteIds.join(","))}" data-graph-theme-title="${escapeHtml(theme.title)}"${maturity.noteIds.length >= 3 ? "" : " disabled"}>整理成主题草稿</button>
      <button class="graph-selection-action is-secondary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(firstNoteId)}"${firstNoteId ? "" : " disabled"}>补一条主题关系</button>
      <button class="graph-selection-action is-quiet" type="button" data-open-note="${escapeHtml(firstNoteId)}"${firstNoteId ? "" : " disabled"}>打开代表笔记</button>`
  });
}

function graphIsolatedDecisionMeta(isolated = {}, note = {}) {
  const thesis = String(isolated?.thesis || note?.thesis || "").trim();
  const body = String(note?.body || note?.content || "").trim();
  const suggestedAction = String(isolated?.suggestedAction || isolated?.suggested_action || "").trim().toLowerCase();
  const hasClearThesis = thesis.length >= 18;
  const hasEnoughMaterial = body.length >= 320 || thesis.length >= 42;
  if (hasClearThesis && hasEnoughMaterial && suggestedAction !== "review_missing_relations") {
    return {
      label: "可先保留独立",
      tone: "keep",
      detail: "它可能是一条尚未进入主题的独立观察。现在不必强行连线，先保留它的清晰判断，再等新材料靠近。",
      next: "给它补一句“暂时独立的理由”，避免日后误判成遗漏关系。"
    };
  }
  if (hasClearThesis) {
    return {
      label: "优先寻找桥接",
      tone: "bridge",
      detail: "它已经有可读判断，但没有进入关系结构。最值得做的是找一条真实桥接，而不是随便连到相似标题。",
      next: "先问：它能支撑哪个观点、限制哪个主题，或给哪个问题提供反例？"
    };
  }
  if (body.length < 160 && thesis.length < 12) {
    return {
      label: "暂存观察",
      tone: "hold",
      detail: "它现在更像材料或灵感片段，还未形成永久笔记应有的判断。先暂存，不急着连进图谱。",
      next: "补一句自己的判断：这条笔记到底想说明什么？"
    };
  }
  return {
    label: "先重写判断",
    tone: "rewrite",
    detail: "它有一些内容，但图谱还读不出稳定角色。比起连线，先把中心判断写清楚更有价值。",
    next: "把它改写成一句可被支持、反驳或限定的判断。"
  };
}

function openGraphIsolatedDecisionAction(noteId = "", action = "") {
  const cleanNoteId = String(noteId || "").trim();
  const cleanAction = String(action || "").trim().toLowerCase();
  if (!cleanNoteId) return false;
  if (cleanAction === "bridge") {
    setGraphIsolatedWorkflowActiveTab(cleanNoteId, "candidates");
    renderGraphPanel();
    setStatus("已切到候选关联；先找一条能说明理由的关系，保存后再处理下一条", "ok");
    return true;
  }
  setGraphIsolatedWorkflowActiveTab(cleanNoteId, "hold");
  renderGraphPanel();
  const messages = {
    keep: "当前浮层已切到保留独立：暂不强行连线，可以继续处理下一条",
    hold: "当前浮层已切到暂存观察：等这条笔记形成更清楚判断后再关联",
    rewrite: "当前浮层已切到重写判断：先把中心判断写清楚，再回来找关系"
  };
  setStatus(messages[cleanAction] || "已在浮窗内记录处理方向", cleanAction === "hold" ? "warn" : "ok", {
    priority: 2,
    holdMs: 3600
  });
  return true;
}

async function loadGraphEditableNote(noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return null;
  let note = state.notes.find((item) => String(item?.id || "").trim() === cleanNoteId) || null;
  if (note && (note.bodyLoaded || isLocalOnlyNote(note))) return note;
  try {
    const full = await fetchNote(cleanNoteId);
    if (!full) return note;
    const mapped = mapNoteItem(full);
    note = note || mapped;
    Object.assign(note, mapped, { bodyLoaded: typeof full.body === "string" });
    if (!state.notes.some((item) => item.id === cleanNoteId)) state.notes.unshift(note);
  } catch (error) {
    setStatus(`读取笔记失败：${String(error?.message || error)}`, "bad");
  }
  return note;
}

const graphIsolatedDecisionController = createGraphIsolatedDecisionController(() => ({
  document,
  ensureEditableNoteBody,
  graphIsolatedDecisionMode,
  graphIsolatedDecisionTitle,
  graphUpsertMarkdownSection,
  isLocalOnlyNote,
  loadGraphEditableNote,
  mapNoteItem,
  noteTabFor,
  parseLinks,
  parseTags,
  renderGraphPanel,
  setGraphIsolatedWorkflowActiveTab,
  setStatus,
  updateNote
}));

async function saveGraphIsolatedDecision(button = null) {
  return graphIsolatedDecisionController.saveGraphIsolatedDecision(button);
}

function graphAiAnalysisPayload(result = graphState.aiAnalysis) {
  if (result?.analysis && typeof result.analysis === "object") return result.analysis;
  return result && typeof result === "object" ? result : {};
}

function graphAiConfidenceLabel(value = null) {
  const score = Number(value);
  if (!Number.isFinite(score) || score <= 0) return "待判断";
  return `${Math.round(Math.max(0, Math.min(score, 1)) * 100)}%`;
}

function graphNoteIdFromIsolatedItem(item = {}) {
  return computeGraphNoteIdFromIsolatedItem(item);
}

function graphComputedIsolatedNotes(nodes = [], edges = [], aiIsolatedNotes = []) {
  return graphComputedIsolatedNotesForGraph(nodes, edges, aiIsolatedNotes, {
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge
  });
}

function graphMarkIsolatedNodes(nodes = [], isolatedNotes = []) {
  return graphMarkIsolatedNodesForGraph(nodes, isolatedNotes, {
    selectionKey: graphIsolatedSelectionKey,
    decisionMeta: graphIsolatedDecisionMeta
  });
}

function graphIsolatedQueueItems({ isolatedNotes = [], nodeMap = new Map(), edges = [], currentNoteId = "", limit = 8 } = {}) {
  return graphIsolatedQueueItemsForGraph({
    isolatedNotes,
    nodeMap,
    edges,
    currentNoteId,
    limit,
    fullNoteById: graphFullNoteById,
    noteHasSavedIsolationDisposition: graphNoteHasSavedIsolationDisposition,
    decisionMeta: graphIsolatedDecisionMeta,
    aiRelationCandidatesForNote: graphAiRelationCandidatesForNote,
    localRelationCandidatesForNote: graphLocalRelationCandidatesForNote,
    selectionKey: graphIsolatedSelectionKey
  });
}

function graphNextIsolatedQueueItem(queueItems = [], currentNoteId = "") {
  return computeGraphNextIsolatedQueueItem(queueItems, currentNoteId);
}

function renderGraphIsolatedQueue({ isolatedNotes = [], nodeMap = new Map(), edges = [], currentNoteId = "", compact = false, limit = 8, queueItems: providedQueueItems = null } = {}) {
  return graphIsolatedWorkflowShell.renderQueue({ isolatedNotes, nodeMap, edges, currentNoteId, compact, limit, queueItems: providedQueueItems });
}

function renderGraphIsolatedQueueStrip({ isolatedNotes = [], nodeMap = new Map(), edges = [], currentNoteId = "", queueItems: providedQueueItems = null } = {}) {
  return graphIsolatedWorkflowShell.renderQueueStrip({ isolatedNotes, nodeMap, edges, currentNoteId, queueItems: providedQueueItems });
}

function graphRelationCandidateKey(fromNoteId = "", toNoteId = "", relationType = "") {
  return computeGraphRelationCandidateKey(fromNoteId, toNoteId, relationType);
}

function graphRelationPairKey(leftNoteId = "", rightNoteId = "") {
  return computeGraphRelationPairKey(leftNoteId, rightNoteId);
}

function graphCandidateEndpointIds(candidate = {}) {
  return computeGraphCandidateEndpointIds(candidate);
}

function graphCandidateCountKey(candidate = {}) {
  return computeGraphCandidateCountKey(candidate);
}

function graphRelationStatusKey(value = "") {
  return computeGraphRelationStatusKey(value);
}

function graphRelationStatusCountsAsNetworkEdge(value = "") {
  return computeGraphRelationStatusCountsAsNetworkEdge(value);
}

function graphRelationStatusCountsAsConfirmedEdge(value = "") {
  return String(value || "confirmed").trim().toLowerCase() === "confirmed";
}

function graphDirectConfirmedRelationCount(noteId = "", edges = []) {
  return computeGraphDirectNetworkEdgeCount(noteId, edges, {
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsConfirmedEdge
  });
}

function graphNodeNeedsRelationWorkflow(noteId = "", edges = [], nodeMap = new Map()) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return false;
  if (nodeMap instanceof Map && nodeMap.size && !nodeMap.has(cleanNoteId)) return false;
  return graphDirectConfirmedRelationCount(cleanNoteId, edges) === 0;
}

function graphNodeNeedsRelationWorkflowFromCurrentGraph(noteId = "") {
  const edges = Array.isArray(graphState.item?.edges) ? graphState.item.edges : [];
  return graphNodeNeedsRelationWorkflow(noteId, edges);
}

function graphExistingRelationKeys(edges = []) {
  return computeGraphExistingRelationKeys(edges);
}

function graphExistingRelationPairKeys(edges = []) {
  return computeGraphExistingRelationPairKeys(edges);
}

const GRAPH_CONFIRMABLE_RELATION_TYPES = new Set(["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with"]);
const GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES = new Set(["bridges", "same_topic", "associated_with"]);

function graphPreferredPotentialRelationType(candidate = {}) {
  return computeGraphPreferredPotentialRelationType(candidate, GRAPH_CONFIRMABLE_RELATION_TYPES);
}

function graphCandidateBlocksFormalRelation(candidate = {}) {
  return computeGraphCandidateBlocksFormalRelation(candidate);
}

function graphCandidateCanSaveRelation(candidate = {}) {
  return computeGraphCandidateCanSaveRelation(candidate, GRAPH_CONFIRMABLE_RELATION_TYPES);
}

function graphRelationRationaleIsActionable(value = "") {
  return computeGraphRelationRationaleIsActionable(value);
}

function graphPotentialRelationNodeMap() {
  const items = [
    ...(Array.isArray(graphState.item?.nodes) ? graphState.item.nodes : []),
    ...(Array.isArray(state.notes) ? state.notes : [])
  ];
  return new Map(items.map((item) => [String(item?.id || "").trim(), item]).filter(([id]) => id));
}

function graphPotentialRelationActionEndpoints(cleanNoteId = "", sourceNoteId = "", targetNoteId = "", relationType = "") {
  return computeGraphPotentialRelationActionEndpoints(cleanNoteId, sourceNoteId, targetNoteId, relationType, GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES);
}

function graphPotentialRelationEvidenceText(candidate = {}) {
  return computeGraphPotentialRelationEvidenceText(candidate);
}

function graphPotentialRelationRationaleDraft({
  relationLabel = "",
  actionSourceTitle = "",
  actionTargetTitle = "",
  aiRationale = "",
  evidenceText = ""
} = {}) {
  return computeGraphPotentialRelationRationaleDraft({
    relationLabel,
    actionSourceTitle,
    actionTargetTitle,
    aiRationale,
    evidenceText
  });
}

function graphDecoratePotentialRelationCandidate(candidate = {}, { nodeMap = new Map() } = {}) {
  return computeGraphDecoratePotentialRelationCandidate(candidate, { nodeMap }, {
    graphNodeTitle,
    graphRelationTypeLabel,
    graphPreferredRelationType: graphPreferredPotentialRelationType,
    evidenceTextForCandidate: graphPotentialRelationEvidenceText,
    rationaleDraftForCandidate: graphPotentialRelationRationaleDraft
  });
}

function graphCandidateRelationReviewQuestion(candidate = {}) {
  const explicitQuestion = String(candidate.reviewQuestion || candidate.review_question || "").trim();
  if (explicitQuestion) return explicitQuestion;
  const relationType = String(candidate.aiRelationType || candidate.relationType || candidate.coarseType || "").trim().toLowerCase();
  if (relationType === "supports") return "它是在提供证据、例子，还是在推进对方的结论？";
  if (relationType === "contradicts") return "它反对的是结论、前提，还是适用范围？";
  if (relationType === "qualifies") return "它限定了对方在什么条件下成立？";
  if (relationType === "bridges") return "它桥接的是共同问题、概念过渡，还是方法相似？";
  if (relationType === "same_topic") return "它们只是同主题，还是已经有明确论证动作？";
  return "这条关系能说清支持、限定、反驳或桥接动作吗？";
}

function graphCandidateRelationVerdict(candidate = {}) {
  const decision = String(candidate.aiDecision || candidate.ai_decision || "").trim().toLowerCase();
  const relationType = String(candidate.aiRelationType || candidate.relationType || candidate.coarseType || "associated_with").trim().toLowerCase();
  const relationLabel = graphRelationTypeLabel(relationType === "no_relation" ? "associated_with" : relationType);
  const confidenceLabel = graphAiConfidenceLabel(candidate.aiConfidence || candidate.confidence);
  if (decision === "reject" || relationType === "no_relation") return "AI 判断：暂不建议直接建正式关系";
  if (decision === "uncertain") return `AI 判断：先作为${relationLabel}复核`;
  if (decision === "accept") return `AI 判断：可复核为${relationLabel}`;
  return `建议先按${relationLabel}复核 · ${confidenceLabel}`;
}

function graphCandidateLocalReason(candidate = {}) {
  const reasons = Array.isArray(candidate.coarseReasons || candidate.coarse_reasons)
    ? candidate.coarseReasons || candidate.coarse_reasons
    : [];
  if (reasons.length) return reasons.join("；");
  return String(candidate.evidenceText || candidate.rationale || "").trim() || "本地规则发现可复查的概念线索。";
}

function renderGraphCandidateReviewRows(candidate = {}, { aiCandidate = true } = {}) {
  const localReason = graphCandidateLocalReason(candidate);
  const aiReason = String(candidate.aiRationale || candidate.ai_rationale || "").trim();
  const aiError = String(candidate.aiError || candidate.ai_error || "").trim();
  const needsConfirmation = candidate.aiNeedsConfirmation === true || graphPotentialRelationNeedsConfirmation(candidate);
  const reasonText = !aiCandidate
    ? `本地线索：${localReason}`
    : aiReason
      ? `AI 理由：${aiReason}`
      : needsConfirmation
        ? `本地线索：${localReason}。当前 AI 设置需要确认后才能生成理由。`
        : aiError
          ? `本地线索：${localReason}。AI 理由生成失败，可先人工判断。`
          : `本地线索：${localReason}。AI 理由生成中或尚未生成。`;
  return `
    <div class="graph-candidate-review" aria-label="候选复核信息">
      <div><span>推荐原因</span><p>${escapeHtml(reasonText)}</p></div>
      <div><span>可能关系</span><p>${escapeHtml(graphCandidateRelationVerdict(candidate))}</p></div>
      <div><span>复核问题</span><p>${escapeHtml(graphCandidateRelationReviewQuestion(candidate))}</p></div>
    </div>
  `;
}

function graphPotentialRelationMatchKey(candidate = {}) {
  const id = String(candidate.id || candidate.candidateId || candidate.candidate_id || "").trim();
  if (id) return `id:${id}`;
  const { sourceNoteId: fromNoteId, targetNoteId: toNoteId } = graphCandidateEndpointIds(candidate);
  if (!fromNoteId || !toNoteId) return "";
  return `pair:${graphRelationCandidateKey(fromNoteId, toNoteId, "")}`;
}

function graphPotentialRelationNeedsConfirmation(candidate = {}) {
  const code = String(candidate.aiErrorCode || candidate.ai_error_code || "").trim();
  return code === "AI_ROUTE_CONFIRMATION_REQUIRED" || code === "AI_BUDGET_CONFIRMATION_REQUIRED";
}

function graphFindPotentialRelationCandidate({ candidateId = "", sourceNoteId = "", targetNoteId = "" } = {}) {
  const cleanCandidateId = String(candidateId || "").trim();
  const cleanSourceNoteId = String(sourceNoteId || "").trim();
  const cleanTargetNoteId = String(targetNoteId || "").trim();
  const analysis = graphAiAnalysisPayload();
  const candidates = [
    ...(Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates : []),
    ...(Array.isArray(analysis?.bridgeCandidates) ? analysis.bridgeCandidates : [])
  ];
  return candidates.find((candidate) => {
    const id = String(candidate?.id || candidate?.candidateId || candidate?.candidate_id || "").trim();
    if (cleanCandidateId && id === cleanCandidateId) return true;
    const { sourceNoteId: fromNoteId, targetNoteId: toNoteId } = graphCandidateEndpointIds(candidate);
    return cleanSourceNoteId && cleanTargetNoteId && fromNoteId === cleanSourceNoteId && toNoteId === cleanTargetNoteId;
  }) || null;
}

function graphAiRelationCandidatesForNote(noteId = "", { nodeMap = new Map(), edges = [], limit = 5 } = {}) {
  return computeGraphAiRelationCandidatesForNote(noteId, {
    analysis: graphAiAnalysisPayload(),
    nodeMap,
    edges,
    limit
  }, {
    graphExistingRelationPairKeys,
    graphCandidateCanSaveRelation,
    graphPreferredRelationType: graphPreferredPotentialRelationType,
    decorateCandidate: graphDecoratePotentialRelationCandidate,
    actionEndpoints: graphPotentialRelationActionEndpoints,
    graphNodeTitle,
    graphRelationTypeLabel,
    graphPotentialRelationNeedsConfirmation
  });
}

function graphReviewSummaryFromAnalysis(analysis = {}, previousSummary = {}) {
  const topicCandidateCount = Array.isArray(analysis?.topicCandidates) ? analysis.topicCandidates.length : 0;
  const relationCandidateCount = Array.isArray(analysis?.relationCandidates) ? analysis.relationCandidates.length : 0;
  const bridgeCandidateCount = Array.isArray(analysis?.bridgeCandidates) ? analysis.bridgeCandidates.length : 0;
  const isolatedNoteCount = Array.isArray(analysis?.isolatedNotes) ? analysis.isolatedNotes.length : 0;
  const artifactCount = topicCandidateCount + Math.max(0, relationCandidateCount - bridgeCandidateCount) + bridgeCandidateCount + isolatedNoteCount;
  return {
    ...(previousSummary && typeof previousSummary === "object" ? previousSummary : {}),
    artifactCount,
    topicCandidateCount,
    relationCandidateCount,
    bridgeCandidateCount,
    isolatedNoteCount
  };
}

function mergePotentialRelationCandidateIntoGraphAnalysis(refinedCandidate = {}) {
  const matchKey = graphPotentialRelationMatchKey(refinedCandidate);
  if (!matchKey || !graphState.aiAnalysis) return false;
  const analysis = graphAiAnalysisPayload();
  if (!analysis) return false;
  const nodeMap = graphPotentialRelationNodeMap();
  let changed = false;
  const mergeList = (items = []) =>
    (Array.isArray(items) ? items : []).map((candidate) => {
      if (graphPotentialRelationMatchKey(candidate) !== matchKey) return candidate;
      changed = true;
      return graphDecoratePotentialRelationCandidate({
        ...candidate,
        ...refinedCandidate,
        fromNoteId: refinedCandidate.fromNoteId || refinedCandidate.sourceNoteId || candidate.fromNoteId,
        toNoteId: refinedCandidate.toNoteId || refinedCandidate.targetNoteId || candidate.toNoteId,
        sourceNoteId: refinedCandidate.sourceNoteId || refinedCandidate.fromNoteId || candidate.sourceNoteId,
        targetNoteId: refinedCandidate.targetNoteId || refinedCandidate.toNoteId || candidate.targetNoteId
      }, { nodeMap });
    });
  const nextAnalysis = {
    ...analysis,
    relationCandidates: mergeList(analysis.relationCandidates),
    bridgeCandidates: mergeList(analysis.bridgeCandidates)
  };
  const nextSummary = graphReviewSummaryFromAnalysis(nextAnalysis, graphState.aiAnalysis?.reviewItems?.summary);
  graphState.aiAnalysis = graphState.aiAnalysis?.analysis
    ? {
        ...graphState.aiAnalysis,
        analysis: nextAnalysis,
        reviewItems: {
          ...(graphState.aiAnalysis.reviewItems || {}),
          summary: nextSummary
        }
      }
    : nextAnalysis;
  return changed;
}

function removePotentialRelationCandidateFromGraphAnalysis(candidateToRemove = {}) {
  const matchKey = graphPotentialRelationMatchKey(candidateToRemove);
  if (!matchKey || !graphState.aiAnalysis) return false;
  const analysis = graphAiAnalysisPayload();
  if (!analysis) return false;
  const filterList = (items = []) => (Array.isArray(items) ? items : []).filter((candidate) => graphPotentialRelationMatchKey(candidate) !== matchKey);
  const nextRelationCandidates = filterList(analysis.relationCandidates);
  const nextBridgeCandidates = filterList(analysis.bridgeCandidates);
  const changed =
    nextRelationCandidates.length !== (Array.isArray(analysis.relationCandidates) ? analysis.relationCandidates.length : 0) ||
    nextBridgeCandidates.length !== (Array.isArray(analysis.bridgeCandidates) ? analysis.bridgeCandidates.length : 0);
  if (!changed) return false;
  const nextAnalysis = {
    ...analysis,
    relationCandidates: nextRelationCandidates,
    bridgeCandidates: nextBridgeCandidates
  };
  const nextSummary = graphReviewSummaryFromAnalysis(nextAnalysis, graphState.aiAnalysis?.reviewItems?.summary);
  graphState.aiAnalysis = graphState.aiAnalysis?.analysis
    ? {
        ...graphState.aiAnalysis,
        analysis: nextAnalysis,
        reviewItems: {
          ...(graphState.aiAnalysis.reviewItems || {}),
          summary: nextSummary
        }
      }
    : nextAnalysis;
  return true;
}

const graphAiConnectRuntimeController = createGraphAiConnectRuntimeController(() => ({
  addSystemMessage,
  analyzeDirectoryGraph,
  ensureGraphLocalAiReadyForAnalysis,
  graphAiRelationCandidatesForNote,
  graphNodeTitle,
  graphPotentialRelationNeedsConfirmation,
  graphRelationStatusCountsAsNetworkEdge,
  graphRelationWorkflowController,
  graphScopeDirectoryId,
  graphState,
  mergePotentialRelationCandidateIntoGraphAnalysis,
  refinePotentialRelationCandidate,
  removePotentialRelationCandidateFromGraphAnalysis,
  renderGraphPanel,
  setStatus,
  state
}));

async function refineGraphPotentialRelationsForNote(noteId = "", candidates = [], options = {}) {
  return graphAiConnectRuntimeController.refineGraphPotentialRelationsForNote(noteId, candidates, options);
}

async function refineGraphPotentialRelationCandidate(noteId = "", candidate = {}, options = {}) {
  return graphAiConnectRuntimeController.refineGraphPotentialRelationCandidate(noteId, candidate, options);
}

function graphNoteTags(note = {}) {
  return graphNoteTagsForLocalRelation(note, { parseTags });
}

function graphTitleCharacterOverlap(left = "", right = "") {
  return computeGraphTitleCharacterOverlap(left, right);
}

function graphLocalRelationCandidatesForNote(noteId = "", { nodeMap = new Map(), edges = [], limit = 5 } = {}) {
  return computeGraphLocalRelationCandidatesForNote(
    noteId,
    { nodeMap, edges, limit },
    {
      relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge,
      noteTags: graphNoteTags,
      relationTypeLabel: graphRelationTypeLabel
    }
  );
}

function graphCandidateSourceLabel(candidate = {}, fallback = "本地线索") {
  if (candidate.aiDecision || candidate.modelName || candidate.aiRationale) return "AI 候选";
  return fallback;
}

function graphCandidateUndirectedPairKey(candidate = {}) {
  return computeGraphCandidateUndirectedPairKey(candidate);
}

function graphBlockedAiRelationPairKeysForNote(noteId = "") {
  return computeGraphBlockedAiRelationPairKeysForNote(noteId, graphAiAnalysisPayload());
}

function graphCandidateEvidenceText(candidate = {}) {
  const evidenceText = String(candidate.evidenceText || candidate.aiRationale || candidate.rationale || "").trim();
  if (evidenceText) return evidenceText;
  const reasons = Array.isArray(candidate.coarseReasons || candidate.coarse_reasons)
    ? candidate.coarseReasons || candidate.coarse_reasons
    : [];
  return reasons.filter(Boolean).slice(0, 2).join("；") || "这是一条待确认的关联线索。";
}

function graphMergeRelationCandidatesForDisplay(aiCandidates = [], localCandidates = [], { limit = 6, blockedPairKeys = new Set() } = {}) {
  return computeGraphMergeRelationCandidatesForDisplay(aiCandidates, localCandidates, { limit, blockedPairKeys });
}

function graphNotePreviewText(note = {}) {
  return graphNotePreviewTextForLocalRelation(note);
}

function graphFullNoteById(noteId = "", nodeMap = new Map()) {
  return graphFullNoteByIdFromSources(noteId, { nodeMap, notes: state.notes });
}

function graphIsolatedPreviewTarget(noteId = "", nodeMap = new Map(), preferredTargetNoteId = "") {
  return graphIsolatedPreviewTargetForNote(
    noteId,
    {
      nodeMap,
      preferredTargetNoteId,
      previewTargetByNoteId: graphState.isolatedCandidatePreviewByNoteId,
      notes: state.notes
    },
    {
      fullNoteById: graphFullNoteByIdFromSources,
      nodeTitle: graphNodeTitle,
      noteTypeLabel,
      notePreviewText: graphNotePreviewText,
      noteTags: graphNoteTags
    }
  );
}

function renderGraphIsolatedPreviewPanel(noteId = "", { nodeMap = new Map(), preferredTargetNoteId = "" } = {}) {
  const preview = graphIsolatedPreviewTarget(noteId, nodeMap, preferredTargetNoteId);
  if (!preview) {
    return `
      <aside class="graph-isolated-preview" aria-label="目标预览" data-graph-isolated-preview>
        <div>
          <small data-graph-preview-kicker>目标预览</small>
          <button class="graph-selection-action is-quiet" type="button" data-graph-clear-candidate-preview="${escapeHtml(noteId)}" data-graph-preview-clear-inline hidden>收起</button>
        </div>
        <strong data-graph-preview-title>先选择一个目标笔记</strong>
        <span data-graph-preview-type hidden></span>
        <p data-graph-preview-text>选择 AI 推荐目标或手工搜索结果后，这里会显示目标笔记摘要。保存关系和继续处理都留在当前浮窗内。</p>
        <div class="graph-isolated-preview-tags" data-graph-preview-tags hidden></div>
      </aside>
    `;
  }
  return `
    <aside class="graph-isolated-preview is-active" aria-label="目标预览" data-graph-isolated-preview>
      <div>
        <small data-graph-preview-kicker>正在预览</small>
        <button class="graph-selection-action is-quiet" type="button" data-graph-clear-candidate-preview="${escapeHtml(noteId)}">收起</button>
      </div>
      <strong data-graph-preview-title>${escapeHtml(preview.title)}</strong>
      <span data-graph-preview-type>${escapeHtml(preview.type)}</span>
      <p data-graph-preview-text>${escapeHtml(preview.text)}</p>
      <div class="graph-isolated-preview-tags" data-graph-preview-tags${preview.tags.length ? "" : " hidden"}>${preview.tags.map((tag) => `<em>${escapeHtml(`#${tag}`)}</em>`).join("")}</div>
    </aside>
  `;
}

function renderGraphRelationCandidateCards(candidates = [], { title = "可能相关笔记", note = "先复查这些线索，再把能说清理由的关系写入图谱。", sourceLabel = "本地线索" } = {}) {
  const items = Array.isArray(candidates) ? candidates.filter((candidate) => candidate && graphCandidateCanSaveRelation(candidate)) : [];
  if (!items.length) return "";
  return `
    <section class="graph-ai-connect graph-local-connect" aria-label="${escapeHtml(title)}">
      <div class="graph-ai-connect-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${items.length} 个可选目标</span>
      </div>
      <p>${escapeHtml(note)}</p>
      <div class="graph-ai-connect-list">
        ${items
          .map(
            (candidate) => `
              <article class="graph-ai-connect-card">
                <div class="graph-ai-connect-card-head">
                  <span>${escapeHtml(graphCandidateSourceLabel(candidate, sourceLabel))}</span>
                  <strong>${escapeHtml(candidate.counterpartTitle || candidate.targetTitle)}</strong>
                  <small>${escapeHtml(candidate.relationLabel)} · ${escapeHtml(graphAiConfidenceLabel(candidate.confidence))}</small>
                </div>
                <p>${escapeHtml(graphCandidateEvidenceText(candidate))}</p>
                <details class="graph-candidate-details">
                  <summary>查看依据</summary>
                  ${renderGraphCandidateReviewRows(candidate, { aiCandidate: false })}
                </details>
                <div class="graph-ai-connect-actions">
                  <button class="graph-selection-action is-primary" type="button" data-graph-relation-candidate-apply data-open-note="${escapeHtml(candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(candidate.targetNoteId)}" data-graph-relation-type="${escapeHtml(candidate.relationType)}" data-graph-rationale-draft="${escapeHtml(candidate.rationaleDraft)}" data-graph-insight-question-draft="${escapeHtml(candidate.insightQuestionDraft)}">保存关系</button>
                  <button class="graph-selection-action is-quiet" type="button" data-graph-preview-candidate="${escapeHtml(candidate.counterpartNoteId || candidate.targetNoteId)}" data-graph-preview-source="${escapeHtml(candidate.sourceNoteId)}">预览目标</button>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderGraphAiConnectCandidates(noteId = "", { nodeMap = new Map(), edges = [], hideEmpty = false } = {}) {
  const aiCandidates = graphAiRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 5 });
  const localCandidates = graphLocalRelationCandidatesForNote(noteId, { nodeMap, edges, limit: 5 });
  const blockedPairKeys = graphBlockedAiRelationPairKeysForNote(noteId);
  const candidates = graphMergeRelationCandidatesForDisplay(aiCandidates, localCandidates, { limit: 6, blockedPairKeys });
  const hasAnalysis = Boolean(graphAiAnalysisPayload()?.analysisMode || graphAiAnalysisPayload()?.relationCandidates || graphAiAnalysisPayload()?.bridgeCandidates);
  const loading = graphState.aiAnalysisLoading === true;
  if (!candidates.length) {
    if (hideEmpty && !loading) return "";
    return `
      <section class="graph-ai-connect ${hasAnalysis ? "is-empty" : ""}" aria-label="待确认潜在关联">
        <div class="graph-ai-connect-head">
          <strong>可选关系</strong>
          <span>${loading ? "扫描中" : hasAnalysis ? "暂无候选" : "未扫描"}</span>
        </div>
        <p>${loading ? "正在从当前图谱范围内寻找可能连接。" : hasAnalysis ? "暂时没有清楚的相关笔记。可以直接选择一条，或先把这条笔记的中心判断写清楚。" : "点击“查找相关笔记”后，系统先列出可能相关的笔记；只有你保存后才写入正式关系。"}</p>
      </section>
    `;
  }
  return `
    <section class="graph-ai-connect" aria-label="待确认潜在关联">
      <div class="graph-ai-connect-head">
        <strong>可选关系</strong>
        <span>${candidates.length} 个可选目标</span>
      </div>
      <p>从这里挑一条真正相关的笔记。先预览目标，能说清“为什么相连”再保存。</p>
      <div class="graph-ai-connect-list">
        ${candidates
          .map(
            (candidate) => {
              const needsConfirmation = candidate.aiNeedsConfirmation === true || graphPotentialRelationNeedsConfirmation(candidate);
              const isLocal = candidate.candidateSource === "local";
              const currentNoteId = String(noteId || "").trim();
              const aiTargetNoteId = String(candidate.counterpartNoteId || candidate.actionTargetNoteId || candidate.targetNoteId || "").trim();
              const applyAttrs = isLocal
                ? `data-graph-relation-candidate-apply data-open-note="${escapeHtml(candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(candidate.targetNoteId)}"`
                : `data-graph-ai-candidate-apply data-open-note="${escapeHtml(currentNoteId || candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(aiTargetNoteId)}"`;
              return `
                <article class="graph-ai-connect-card">
                <div class="graph-ai-connect-card-head">
                  <span>${escapeHtml(isLocal ? "本地候选" : "AI 候选")}</span>
                  <strong>${escapeHtml(candidate.counterpartTitle || candidate.targetTitle)}</strong>
                  <small>${escapeHtml(candidate.relationLabel)} · ${escapeHtml(graphAiConfidenceLabel(candidate.confidence))}${candidate.componentBridge ? " · 桥接" : ""}${candidate.aiDecision ? ` · AI ${escapeHtml(candidate.aiDecision)}` : ""}</small>
                </div>
                <p>${escapeHtml(graphCandidateEvidenceText(candidate))}</p>
                <details class="graph-candidate-details">
                  <summary>查看依据</summary>
                  ${renderGraphCandidateReviewRows(candidate, { aiCandidate: !isLocal })}
                </details>
                <div class="graph-ai-connect-actions">
                  <button class="graph-selection-action is-primary" type="button" ${applyAttrs} data-graph-relation-type="${escapeHtml(candidate.relationType)}" data-graph-rationale-draft="${escapeHtml(candidate.rationaleDraft)}" data-graph-insight-question-draft="${escapeHtml(candidate.insightQuestionDraft)}">保存关系</button>
                  ${
                    !isLocal && needsConfirmation
                      ? `<button class="graph-selection-action is-ai" type="button" data-graph-ai-refine-confirm data-graph-candidate-id="${escapeHtml(candidate.id)}" data-graph-source-note="${escapeHtml(candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(candidate.targetNoteId)}">生成理由</button>`
                      : !isLocal && candidate.aiError
                      ? `<button class="graph-selection-action is-ai" type="button" data-graph-ai-refine-retry data-graph-candidate-id="${escapeHtml(candidate.id)}" data-graph-source-note="${escapeHtml(candidate.sourceNoteId)}" data-graph-target-note="${escapeHtml(candidate.targetNoteId)}">重新生成理由</button>`
                      : ""
                  }
                  <button class="graph-selection-action is-quiet" type="button" data-graph-preview-candidate="${escapeHtml(candidate.counterpartNoteId || candidate.targetNoteId)}" data-graph-preview-source="${escapeHtml(noteId)}">预览目标</button>
                </div>
              </article>
              `;
            }
          )
          .join("")}
      </div>
    </section>
  `;
}





function graphWorkspaceRenderDeps() {
  return buildGraphWorkspaceRenderDeps({
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationGroupCounts,
    graphNodeTitle,
    suggestedThemeIndexTitle,
    graphEdgeSelectionKey,
    graphRelationTypeLabel,
    renderGraphSelectionMetrics
  });
}

function graphThemeCandidateNoteIdsForNode(noteId = "", directEdges = [], aiCandidates = []) {
  return computeGraphThemeCandidateNoteIdsForNode(noteId, directEdges, aiCandidates);
}

function renderGraphRelationWorkspaceForNote(noteId = "", { nodeMap = new Map(), edges = [], title = "关联整理" } = {}) {
  return renderGraphRelationWorkspaceMarkup(noteId, { nodeMap, edges, title, deps: graphWorkspaceRenderDeps() });
}

function renderGraphThemeIndexWorkspace(noteIds = [], { title = "主题候选", relationCount = 0, tone = "" } = {}) {
  return renderGraphThemeIndexWorkspaceMarkup(noteIds, { title, relationCount, tone, deps: graphWorkspaceRenderDeps() });
}

const GRAPH_RELATION_FORM_TYPES = ["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with"];

function graphRelationFormTypeOptions(selectedType = "associated_with") {
  const selected = String(selectedType || "associated_with").trim().toLowerCase() || "associated_with";
  return GRAPH_RELATION_FORM_TYPES.map(
    (type) => `<option value="${escapeHtml(type)}"${type === selected ? " selected" : ""}>${escapeHtml(graphRelationTypeLabel(type))}</option>`
  ).join("");
}

function graphCandidatePercent(candidate = {}) {
  return computeGraphCandidatePercent(candidate);
}

function graphManualRelationTargetsForNote(noteId = "", { nodeMap = new Map(), edges = [], limit = 80 } = {}) {
  return computeGraphManualRelationTargetsForNote(
    noteId,
    { nodeMap, edges, limit },
    { relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge }
  );
}

function clearGraphIsolatedRelationDraft(noteId = "") {
  clearGraphIsolatedRelationDraftForState(graphState, noteId);
}

const graphRelationSaveController = createGraphRelationSaveController({
  graphState,
  getNotes: () => state.notes,
  confirmableRelationTypes: GRAPH_CONFIRMABLE_RELATION_TYPES,
  rationaleIsActionable: graphRelationRationaleIsActionable,
  createNoteRelation,
  refreshDirectoryGraph,
  renderGraphPanel,
  setStatus,
  graphNodeTitle,
  relationTypeLabel: graphRelationTypeLabel,
  clearIsolatedRelationDraft: clearGraphIsolatedRelationDraft,
  openRelationFormInSelection: openGraphRelationFormInSelection
});

const graphRelationWorkflowController = createGraphRelationWorkflowController({
  graphState,
  setWorkflowActiveTab: setGraphIsolatedWorkflowActiveTab,
  openGraphSelection,
  renderGraphPanel,
  setStatus
});

const graphIsolatedRelationController = createGraphIsolatedRelationController({
  graphState,
  normalizeMode: graphIsolatedWorkflowTabKey,
  setWorkflowActiveTab: setGraphIsolatedWorkflowActiveTab,
  confirmableRelationTypes: GRAPH_CONFIRMABLE_RELATION_TYPES,
  rationaleIsActionable: graphRelationRationaleIsActionable,
  saveConfirmedRelation: saveGraphConfirmedRelation,
  escapeHtml
});

function graphIsolatedRelationDraftForNote(noteId = "") {
  return graphIsolatedRelationController.relationDraftForNote(noteId);
}

function captureGraphIsolatedRelationDraftFromForm(form = null) {
  return graphIsolatedRelationController.captureDraftFromForm(form);
}

function renderGraphIsolatedJoinNetworkFlow(
  noteId = "",
  {
    nodeMap = new Map(),
    edges = [],
    visibleEdgeCount = 0,
    preferredTargetNoteId = "",
    preferredRelationType = "",
    preferredRationale = "",
    heading = "建立一条能说清理由的关系",
    helper = "先选目标笔记，再选关系类型并写下理由。保存后才会进入图谱。",
    saveHint = "保存后，这条笔记会退出“未关联”。"
  } = {}
) {
  return renderGraphIsolatedJoinNetworkFlowHtml(noteId, {
    nodeMap,
    edges,
    visibleEdgeCount,
    preferredTargetNoteId,
    preferredRelationType,
    preferredRationale,
    heading,
    helper,
    saveHint,
    relationDraft: graphState.isolatedRelationDraftByNoteId?.[String(noteId || "").trim()] || {},
    loading: graphState.aiAnalysisLoading === true
  }, {
    aiCandidatesForNote: graphAiRelationCandidatesForNote,
    manualTargetsForNote: graphManualRelationTargetsForNote,
    aiAnalysisPayload: graphAiAnalysisPayload,
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge,
    workflowTabKey: graphIsolatedWorkflowTabKey,
    activeTabForNote: graphIsolatedWorkflowActiveTab,
    reversibleRelationTypes: GRAPH_REVERSIBLE_POTENTIAL_RELATION_TYPES,
    nodeTitle: graphNodeTitle,
    escapeHtml,
    candidatePercent: graphCandidatePercent,
    graphFullNoteById,
    noteTypeLabel,
    graphNotePreviewText,
    graphNoteTags,
    relationFormTypeOptions: graphRelationFormTypeOptions,
    renderPreviewPanel: renderGraphIsolatedPreviewPanel
  });
}

function renderGraphIsolatedNextStepActions(noteId = "", { isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) {
  return renderGraphIsolatedNextStepActionsHtml(noteId, { isolatedNotes, nodeMap, edges }, {
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge,
    isolatedQueueItems: graphIsolatedQueueItems,
    nextIsolatedQueueItem: graphNextIsolatedQueueItem,
    themeCandidateNoteIdsForNode: graphThemeCandidateNoteIdsForNode,
    suggestThemeIndexTitle: suggestedThemeIndexTitle,
    escapeHtml
  });
}

function graphIsolatedWorkflowTabKey(value = "") {
  const key = String(value || "").trim().toLowerCase();
  if (key === "candidates" || key === "bridge") return "ai";
  return ["ai", "manual"].includes(key) ? key : "ai";
}

function graphIsolatedDecisionMode(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return ["keep", "hold", "rewrite"].includes(key) ? key : "keep";
}

function graphIsolatedDecisionTitle(mode = "") {
  const key = graphIsolatedDecisionMode(mode);
  if (key === "hold") return "暂存观察";
  if (key === "rewrite") return "重写中心判断";
  return "保留独立";
}

function graphExtractMarkdownSection(body = "", heading = "") {
  const cleanHeading = String(heading || "").trim();
  if (!cleanHeading) return "";
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
  const headingPattern = new RegExp(`^##\\s+${cleanHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (startIndex < 0) return "";
  const sectionLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) break;
    sectionLines.push(lines[index]);
  }
  return sectionLines.join("\n").trim();
}

function graphUpsertMarkdownSection(body = "", heading = "", content = "") {
  const cleanHeading = String(heading || "").trim();
  const cleanContent = String(content || "").replace(/\r\n/g, "\n").trim();
  const normalizedBody = String(body || "").replace(/\r\n/g, "\n").trimEnd();
  if (!cleanHeading || !cleanContent) return normalizedBody;
  const lines = normalizedBody.split("\n");
  const headingPattern = new RegExp(`^##\\s+${cleanHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));
  const replacement = [`## ${cleanHeading}`, "", cleanContent];
  if (startIndex < 0) {
    return `${normalizedBody ? `${normalizedBody}\n\n` : ""}${replacement.join("\n")}`.trimEnd();
  }
  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) {
      endIndex = index;
      break;
    }
  }
  lines.splice(startIndex, endIndex - startIndex, ...replacement);
  return lines.join("\n").trimEnd();
}

function graphIsolatedDecisionDefaultText(note = {}, decisionTone = "") {
  const body = String(note?.body || note?.markdown || "").replace(/\r\n/g, "\n");
  const mode = graphIsolatedDecisionMode(decisionTone);
  if (mode === "rewrite") {
    return graphExtractMarkdownSection(body, "一句话论点") || String(note?.thesis || note?.summary || note?.title || "").trim();
  }
  const saved = graphExtractMarkdownSection(body, "关联整理备注");
  if (saved) return saved;
  if (mode === "hold") return "暂时只作为材料观察；等它形成清楚判断后，再补一条有理由的关系。";
  return "这条笔记暂时保持独立；目前还没有找到能说明理由的关系，不强行连入关系网。";
}

function graphNoteHasSavedIsolationDisposition(note = {}) {
  const body = String(note?.body || note?.markdown || "").replace(/\r\n/g, "\n");
  const disposition = graphExtractMarkdownSection(body, "关联整理备注");
  if (!disposition) return false;
  return /^(保留独立|暂存观察|重写中心判断)[：:]|^已重写中心判断/.test(disposition.trim());
}

function renderGraphIsolatedDecisionForm(noteId = "", { note = {}, decision = {}, decisionCards = [], prompts = [] } = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return "";
  const defaultMode = graphIsolatedDecisionMode(decision?.tone);
  const defaultText = graphIsolatedDecisionDefaultText(note, defaultMode);
  const options = decisionCards
    .filter((card) => ["keep", "hold", "rewrite"].includes(String(card?.key || "").trim()))
    .map((card) => {
      const key = graphIsolatedDecisionMode(card.key);
      return `
        <label class="graph-isolated-decision-option">
          <input type="radio" name="graph-isolated-decision-${escapeHtml(cleanNoteId)}" value="${escapeHtml(key)}"${key === defaultMode ? " checked" : ""}>
          <span>
            <strong>${escapeHtml(card.title)}</strong>
            <small>${escapeHtml(card.text)}</small>
          </span>
        </label>
      `;
    })
    .join("");
  return `
    <section class="graph-isolated-decision-form" aria-label="暂不关联处理">
      <div class="graph-isolated-decision-form-head">
        <div>
          <small>暂不接入时要留下原因</small>
          <strong>避免之后反复看到同一条待关联笔记</strong>
        </div>
        <span>保存到当前笔记</span>
      </div>
      <div class="graph-isolated-decision-options">
        ${options}
      </div>
      <label class="graph-isolated-decision-note">
        <span>说明</span>
        <textarea data-graph-isolated-decision-text="${escapeHtml(cleanNoteId)}" rows="5">${escapeHtml(defaultText)}</textarea>
      </label>
      <div class="graph-isolated-decision-actions">
        <button class="graph-selection-action is-primary" type="button" data-graph-isolated-decision-save="${escapeHtml(cleanNoteId)}">保存说明</button>
        <button class="graph-selection-action is-secondary" type="button" data-graph-isolated-tab="candidates" data-graph-isolated-note="${escapeHtml(cleanNoteId)}">返回找相关笔记</button>
      </div>
      ${renderGraphPromptDetails("判断提示（可选）", prompts)}
    </section>
  `;
}

function graphIsolatedWorkflowActiveTab(noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  return graphIsolatedWorkflowTabKey(cleanNoteId ? graphState.isolatedWorkflowTabsByNoteId?.[cleanNoteId] : "");
}

function setGraphIsolatedWorkflowActiveTab(noteId = "", tabKey = "") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return "candidates";
  const cleanTabKey = graphIsolatedWorkflowTabKey(tabKey);
  graphState.isolatedWorkflowTabsByNoteId = graphState.isolatedWorkflowTabsByNoteId || {};
  graphState.isolatedWorkflowTabsByNoteId[cleanNoteId] = cleanTabKey;
  return cleanTabKey;
}

const graphIsolatedWorkflowShell = createGraphIsolatedWorkflowShellRenderer({
  escapeHtml,
  isolatedQueueItems: graphIsolatedQueueItems,
  nextIsolatedQueueItem: graphNextIsolatedQueueItem,
  resolveIsolatedSelection: resolveGraphIsolatedSelection,
  allNotes: () => state.notes,
  fullNoteById: graphFullNoteById,
  nodeTitle: graphNodeTitle,
  noteTypeLabel,
  decisionMeta: graphIsolatedDecisionMeta,
  relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge,
  renderSelectionShell: renderGraphSelectionShell,
  renderRelationWorkspaceForNote: renderGraphRelationWorkspaceForNote,
  renderJoinNetworkFlow: renderGraphIsolatedJoinNetworkFlow,
  renderNextStepActions: renderGraphIsolatedNextStepActions
});

function renderGraphIsolatedWorkflowTabs({ noteId = "", isolatedQueueMarkup = "", decisionCards = [], prompts = [], nodeMap = new Map(), edges = [], visibleEdgeCount = 0 } = {}) {
  return graphIsolatedWorkflowShell.renderWorkflowTabs({ noteId, isolatedQueueMarkup, decisionCards, prompts, nodeMap, edges, visibleEdgeCount });
}

function activateGraphIsolatedWorkflowTab(tabButton = null, { focus = false } = {}) {
  return graphIsolatedRelationController.activateWorkflowTab(tabButton, { focus });
}

function moveGraphIsolatedWorkflowTab(currentButton = null, direction = 1) {
  return graphIsolatedRelationController.moveWorkflowTab(currentButton, direction);
}

function previewGraphCandidateInOverlay(button = null) {
  const targetNoteId = String(button?.getAttribute?.("data-graph-preview-candidate") || "").trim();
  const sourceNoteId = String(
    button?.getAttribute?.("data-graph-preview-source") ||
      graphState.selection?.noteId ||
      graphState.selection?.nodeId ||
      ""
  ).trim();
  if (!sourceNoteId || !targetNoteId) return false;
  graphState.isolatedCandidatePreviewByNoteId = graphState.isolatedCandidatePreviewByNoteId || {};
  graphState.isolatedCandidatePreviewByNoteId[sourceNoteId] = targetNoteId;
  renderGraphPanel();
  setStatus("已在浮窗中预览候选笔记", "ok");
  return true;
}

function clearGraphCandidatePreviewInOverlay(button = null) {
  const sourceNoteId = String(
    button?.getAttribute?.("data-graph-clear-candidate-preview") ||
      graphState.selection?.noteId ||
      graphState.selection?.nodeId ||
      ""
  ).trim();
  if (!sourceNoteId || !graphState.isolatedCandidatePreviewByNoteId) return false;
  delete graphState.isolatedCandidatePreviewByNoteId[sourceNoteId];
  renderGraphPanel();
  setStatus("已收起候选预览", "ok");
  return true;
}

function graphIsolatedFormError(form = null, message = "") {
  return graphIsolatedRelationController.formError(form, message);
}

function markGraphIsolatedRationaleUserEdited(input = null) {
  return graphIsolatedRelationController.markRationaleUserEdited(input);
}

function updateGraphIsolatedInlinePreview(form = null, source = null) {
  return graphIsolatedRelationController.updateInlinePreview(form, source);
}

function syncGraphIsolatedAiCandidateForm(select = null) {
  return graphIsolatedRelationController.syncAiCandidateForm(select);
}

function filterGraphManualRelationTargets(input = null) {
  return graphIsolatedRelationController.filterManualRelationTargets(input);
}

function pickGraphManualRelationTarget(button = null) {
  return graphIsolatedRelationController.pickManualRelationTarget(button);
}

async function saveGraphIsolatedRelationForm(button = null) {
  return graphIsolatedRelationController.saveRelationForm(button);
}

async function saveGraphConfirmedRelation({ noteId = "", targetNoteId = "", relationType = "associated_with", rationale = "", insightQuestion = "", button = null } = {}) {
  return graphRelationSaveController.saveConfirmedRelation({ noteId, targetNoteId, relationType, rationale, insightQuestion, button });
}

function openGraphRelationFormInSelection(button = null) {
  return graphRelationWorkflowController.openRelationFormFromAction(button);
}

function focusGraphRelationAdjustmentInPlace(button = null) {
  const relationId = String(button?.getAttribute?.("data-graph-relation-id") || "").trim();
  const adjustment = String(button?.getAttribute?.("data-graph-relation-adjustment") || "").trim().toLowerCase();
  if (!relationId || !adjustment) return false;
  graphState.relationAdjustmentFocusById = graphState.relationAdjustmentFocusById || {};
  graphState.relationAdjustmentFocusById[relationId] = adjustment;
  renderGraphPanel();
  const labels = {
    strengthen: "先补清这条关系为什么成立",
    "change-type": "先判断这条关系类型是否准确",
    reverse: "先判断关系方向是否应该反过来",
    split: "先判断是否应该拆成两条关系",
    remove: "先判断是否删除或降级为线索"
  };
  setStatus(labels[adjustment] || "已在当前浮层标记这条关系的处理方向", "ok");
  return true;
}

function renderGraphIsolatedSelectionPanel({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) {
  return graphIsolatedWorkflowShell.renderSelectionPanel({ selection, isolatedNotes, nodeMap, edges });
}

function renderGraphIsolatedCompletePanel({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) {
  const noteId = String(selection?.noteId || selection?.nodeId || "").trim();
  return graphIsolatedWorkflowShell.renderCompletePanel({
    selection: {
      ...selection,
      saveResult: graphRelationSaveResultForNote(noteId, graphState.isolatedRelationSaveResultByNoteId)
    },
    isolatedNotes,
    nodeMap,
    edges
  });
}

function renderGraphRelationFormSelectionPanel({ selection = null, nodeMap = new Map(), edges = [] } = {}) {
  const noteId = String(selection?.noteId || selection?.nodeId || "").trim();
  if (!noteId) return "";
  const note = graphFullNoteById(noteId, nodeMap) || {};
  const title = graphNodeTitle(nodeMap, noteId, note.title || "当前笔记");
  const targetNoteId = String(selection?.targetNoteId || "").trim();
  const targetTitle = targetNoteId ? graphNodeTitle(nodeMap, targetNoteId, targetNoteId) : "";
  const visibleEdgeCount = computeGraphDirectNetworkEdgeCount(noteId, edges, {
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge
  });
  return renderGraphSelectionShell({
    className: "is-node is-relation-form",
    ariaLabel: "建立笔记关系",
    kicker: "建立关系",
    title,
    meta: targetTitle ? `预选目标：${targetTitle}` : "选择一条目标笔记并保存关系",
    closeLabel: "收起关系表单",
    body: renderGraphIsolatedJoinNetworkFlow(noteId, {
      nodeMap,
      edges,
      visibleEdgeCount,
      preferredTargetNoteId: targetNoteId,
      preferredRelationType: selection?.relationType || "",
      preferredRationale: selection?.rationale || "",
      heading: targetTitle ? "确认这条关系" : "手工选择一条相关笔记",
      helper: targetTitle
        ? "目标笔记已带入；只需要确认关系类型和理由，保存后仍留在图谱中。"
        : "输入关键词选择目标笔记，再写一句为什么相连。保存后仍留在图谱中。",
      saveHint: "保存后仍留在当前图谱。"
    }),
    actions: ""
  });
}

function renderGraphBridgeSelectionPanel({ selection = null, bridgeGaps = [], nodeMap = new Map() } = {}) {
  const bridge = resolveGraphBridgeSelection(selection, bridgeGaps, [...nodeMap.values()]);
  if (!bridge) return "";
  const noteId = bridge.noteId;
  const targetNoteId = bridge.targetNoteId;
  const targetTitle = bridge.targetTitle || (targetNoteId ? graphNodeTitle(nodeMap, targetNoteId, targetNoteId) : "");
  const item = bridge.item || {};
  const gapTypeLabel = bridge.gapType === "disconnected_cluster" ? "断开的主题群" : "缺少连接";
  const detail = String(item?.suggestedAction || item?.rationale || "这条笔记可能需要一条中间判断，才能回到当前结构。").trim();
  const prompts = [
    targetTitle ? `它和「${targetTitle}」之间缺的是证据、限定、反方，还是一个中间概念？` : "它应当保持独立，还是只是缺少一条能说明理由的连接？",
    "如果补上这条连接，图谱会产生新的论证路径，还是只是多一条导航线？",
    "这条连接应该写成概念过渡、方法相似，还是问题延伸？"
  ];
  return renderGraphSelectionShell({
    className: "is-bridge",
    ariaLabel: "缺少连接判断详情",
    kicker: "缺少连接",
    title: bridge.title,
    meta: targetTitle ? `建议连接到 ${targetTitle}` : "等待判断连接方向",
    closeLabel: "收起缺少连接判断",
    roleLabel: gapTypeLabel,
    roleDetail: detail,
    body: `
      <div class="graph-selection-metrics" aria-label="桥接两端">
        ${renderGraphSelectionMetrics([
          { label: "源笔记", value: bridge.title },
          { label: "目标", value: targetTitle || "待寻找" },
          { label: "状态", value: "候选，未确认" }
        ])}
      </div>
      ${renderGraphPromptDetails("缺少什么连接（可选）", prompts)}`,
    actions: `
      <button class="graph-selection-action is-primary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(noteId)}"${targetNoteId ? ` data-graph-target-note="${escapeHtml(targetNoteId)}"` : ""} data-graph-relation-type="bridges"${noteId ? "" : " disabled"}>在这里建立关系</button>
      <button class="graph-selection-action is-quiet" type="button" data-open-note="${escapeHtml(noteId)}"${noteId ? "" : " disabled"}>打开源笔记</button>`
  });
}

function graphUniqueClusterMeta(clusterMeta = []) {
  return computeGraphUniqueClusterMeta(clusterMeta);
}

function graphClusterResearchMeta(cluster = {}, { nodeMap = new Map(), edges = [] } = {}) {
  return computeGraphClusterResearchMeta(cluster, { nodeMap, edges }, {
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationVisual
  });
}

function renderGraphClusterSelectionPanel({ selection = null, clusterMeta = [], nodeMap = new Map(), edges = [] } = {}) {
  return renderGraphClusterSelectionPanelView({ selection, clusterMeta, nodeMap, edges }, {
    normalizeGraphSelectionForVisibleItems,
    graphUniqueClusterMeta,
    graphClusterResearchMeta,
    escapeHtml,
    renderGraphSelectionShell,
    renderGraphSelectionMetrics,
    renderGraphThemeIndexWorkspace,
    renderGraphPromptDetails
  });
}

function graphResearchNavigatorState({ nodes = [], edges = [], topicCandidates = [], bridgeGaps = [], clusterMeta = [], clueSummary = null, questionSummary = null } = {}) {
  return computeGraphResearchNavigatorState({ nodes, edges, topicCandidates, bridgeGaps, clusterMeta, clueSummary, questionSummary }, {
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationVisual
  });
}

function renderGraphResearchNavigatorPanel({ nodes = [], edges = [], topicCandidates = [], bridgeGaps = [], clusterMeta = [], clueSummary = null, questionSummary = null } = {}) {
  const nav = graphResearchNavigatorState({ nodes, edges, topicCandidates, bridgeGaps, clusterMeta, clueSummary, questionSummary });
  return renderGraphResearchNavigatorPanelView({ nav }, {
    escapeHtml,
    renderGraphIcon,
    renderGraphSelectionMetrics
  });
}

const graphSelectionPanelRenderer = createGraphSelectionPanelRenderer(() => ({
  escapeHtml,
  renderGraphClusterSelectionPanel,
  renderGraphThemeSelectionPanel,
  renderGraphIsolatedSelectionPanel,
  renderGraphIsolatedCompletePanel,
  renderGraphRelationFormSelectionPanel,
  renderGraphBridgeSelectionPanel,
  normalizeGraphSelectionForVisibleItems,
  graphRelationStatusCountsAsNetworkEdge,
  graphNodeNeedsRelationWorkflow,
  graphRelationGroupCounts,
  graphNodeRoleMeta,
  graphNodeInsightMeta,
  renderGraphNodeInsightPanel,
  renderGraphRelationWorkspaceForNote,
  renderGraphAiConnectCandidates,
  graphThemeCandidateNoteIdsForNode,
  suggestedThemeIndexTitle,
  renderGraphSelectionMetrics,
  renderGraphPromptDetails,
  renderGraphSelectionShell,
  noteTypeLabel,
  graphState,
  graphEdgeSelectionKey,
  graphNodeTitle,
  graphRelationTypeLabel,
  graphRelationGroupMeta,
  graphEdgeReviewMeta,
  graphEdgeAdjustmentPlan,
  graphFocusCardActionMeta,
  graphRelationSourceLabel,
  graphRelationStatusLabel
}));
const {
  renderGraphSelectionPanel
} = graphSelectionPanelRenderer;

function graphEdgeVisibleAtFit(edge = {}, nodeMap = new Map(), options = {}) {
  return graphEdgeVisibleAtFitForRuntime(edge, nodeMap, options, { graphRelationVisual });
}

function graphEdgeShouldRender(options = {}) {
  return graphEdgeShouldRenderForRuntime(options, { graphViewModeForRelationType });
}

function renderGraphStarfield(layoutWidth = 0, layoutHeight = 0, seed = "") {
  return renderGraphStarfieldView(layoutWidth, layoutHeight, seed, { hash: graphHash });
}

function renderGraphNebulaField(layoutWidth = 0, layoutHeight = 0, seed = "") {
  return renderGraphNebulaFieldView(layoutWidth, layoutHeight, seed, { hash: graphHash, escapeHtml });
}

function renderGraphClusterGlow(clusterMeta = []) {
  return renderGraphClusterGlowView(clusterMeta, {
    escapeHtml,
    formatSummaryLabel: (title) => `查看主题群摘要：${title || "未命名主题群"}`
  });
}

function graphBuildVisualLayout(nodes = [], edges = [], options = {}) {
  return graphBuildVisualLayoutForRuntime(nodes, edges, options, {
    graphHash,
    graphNodeStarTier,
    graphNodeRadiusByTier
  });
}
function graphEdgePath(edge, nodeMap) {
  return graphEdgePathForRuntime(edge, nodeMap, { graphRelationVisual });
}

function graphThemeBoundaryMeta(options = {}) {
  return graphThemeBoundaryMetaForRuntime(options, { graphThinkingCleanIds });
}

function renderGraphThemeBoundary(boundary = null) {
  return renderGraphThemeBoundaryForRuntime(boundary, { escapeHtml });
}

function graphScopeDirectoryId() {
  return graphScopeDirectoryIdForRuntime(state, {
    graphOriginalScopeDirectoryId: GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID,
    isDirectoryUnderOriginalRoot
  });
}

function graphLoadedScopeCoversDirectory(scopeDirectoryId = "") {
  return graphLoadedScopeCoversDirectoryForRuntime(graphState, scopeDirectoryId, { descendantDirectoryIds });
}

function expandGraphBrowserTree() {
  if (typeof explorer === "undefined" || !explorer) return;
  explorer.expandFolderPath(GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID);
  const topLevelFolders = state.folders.filter(
    (folder) => !folder.hidden && String(folder.parentId || "").trim() === GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID
  );
  topLevelFolders.forEach((folder) => explorer.expandedFolders.add(folder.id));
  const scopedFolderId = graphScopeDirectoryId();
  if (scopedFolderId) explorer.expandFolderPath(scopedFolderId);
}

function graphScopedItems(graph) {
  return graphScopedItemsForRuntime(graph, {
    scopeDirectoryId: graphScopeDirectoryId(),
    focusedNoteId: state.selectedFileId,
    notes: state.notes
  }, {
    descendantDirectoryIds,
    typeFromFolder: (folderId) => typeFromFolder(state, folderId)
  });
}

function graphFocusedItems(nodes = [], edges = [], allNodes = nodes, traversalEdges = edges) {
  return graphFocusedItemsForRuntime(nodes, edges, allNodes, traversalEdges, {
    focusedNoteId: state.selectedFileId,
    focusDepth: graphState.focusDepth
  }, {
    normalizeGraphFocusDepth
  });
}

function graphBuildFocusedRelationTypeStats(nodes = [], edges = [], allNodes = nodes, filters = {}) {
  return graphBuildFocusedRelationTypeStatsForRuntime(nodes, edges, allNodes, filters, {
    focusedNoteId: state.selectedFileId,
    focusDepth: graphState.focusDepth
  }, {
    normalizeGraphRelationTypeFilter,
    graphEdgeMatchesFilters,
    graphFocusedItems: (inputNodes, inputEdges, inputAllNodes, inputTraversalEdges, context) =>
      graphFocusedItemsForRuntime(inputNodes, inputEdges, inputAllNodes, inputTraversalEdges, context, { normalizeGraphFocusDepth }),
    normalizeGraphFocusDepth
  });
}

const graphVisualMapController = createGraphVisualMapController({
  depsProvider: createGraphVisualMapPrototypeDepsProvider(() => ({
    GRAPH_RELATION_GROUP_META,
    GRAPH_RELATION_MARKER_COLORS,
    GRAPH_VISUAL_ZOOM_OPTIONS,
    escapeHtml,
    graphBuildReadingLensState,
    graphBuildVisualLayout,
    graphClusterGlow: renderGraphClusterGlow,
    graphDenseGalaxyMode,
    graphEdgePath,
    graphEdgeSelectionKey,
    graphEdgeShouldRender,
    graphEdgeVisibleAtFit,
    graphFocusContextPanel: renderGraphFocusContextPanel,
    graphFocusDepthMeta,
    graphIcon: renderGraphIcon,
    graphNebulaField: renderGraphNebulaField,
    graphNodeAttentionReasons,
    graphNodeClass,
    graphNodeNeedsRelationWorkflow,
    graphNodeShowsAsPoint,
    graphNodeStarRank,
    graphReadingLensControls: renderGraphReadingLensControls,
    graphReadingLensMeta,
    graphReadingModeMeta,
    graphRelationGroupMeta,
    graphRelationSourceLabel,
    graphRelationTypeFilter: renderGraphRelationTypeFilter,
    graphRelationTypeLabel,
    graphRelationVisual,
    graphResearchNavigatorEntry: renderGraphResearchNavigatorEntry,
    graphResearchNavigatorPanel: renderGraphResearchNavigatorPanel,
    graphSelectionPanel: renderGraphSelectionPanel,
    graphShortTitle,
    graphStarfield: renderGraphStarfield,
    graphState,
    graphViewModeForRelationType,
    graphViewModeSwitcher: renderGraphViewModeSwitcher,
    graphZoomOption,
    normalizeGraphSelectionForVisibleItems,
    noteTypeLabel,
    shouldShowGraphDensityHint,
    graphThemeBoundary: renderGraphThemeBoundary,
    graphThemeBoundaryMeta
  }))
});
const {
  renderGraphVisualMap
} = graphVisualMapController;

function graphFocusedEdgeDirection(edge, focusedNoteId = "") {
  const focusedId = String(focusedNoteId || "").trim();
  if (!focusedId) return "相关";
  return String(edge?.fromNoteId || "").trim() === focusedId ? "当前指向" : "指向当前";
}

function graphFocusedCounterpartTitle(edge, focusedNoteId = "", nodeMap = new Map()) {
  const focusedId = String(focusedNoteId || "").trim();
  const counterpartId =
    String(edge?.fromNoteId || "").trim() === focusedId ? String(edge?.toNoteId || "").trim() : String(edge?.fromNoteId || "").trim();
  return {
    counterpartId,
    counterpartTitle: graphNodeTitle(nodeMap, counterpartId, counterpartId || "相关笔记")
  };
}

function graphFocusCardActionMeta(edge = {}, contextMode = "argument") {
  return computeGraphFocusCardActionMeta(edge, contextMode);
}

function renderGraphFocusContextPanel({ focusedNoteId = "", nodeMap = new Map(), edges = [] } = {}) {
  return renderGraphFocusContextPanelView({
    focusedNoteId,
    nodeMap,
    edges,
    focusContextMode: graphState.focusContextMode,
    focusContextHelpOpen: graphState.focusContextHelpOpen === true
  }, {
    escapeHtml,
    renderGraphIcon,
    graphNodeTitle,
    graphFocusContextModeMeta,
    graphRelationStatusCountsAsNetworkEdge,
    graphRelationVisual,
    graphFocusedCounterpartTitle,
    graphRelationTypeLabel,
    graphFocusedEdgeDirection,
    graphRelationSourceLabel,
    graphFocusCardActionMeta,
    relationGroupMeta: GRAPH_RELATION_GROUP_META
  });
}
function resetGraphHoverState() {
  return resetGraphHoverDomState({ document, getHoverCard: () => $("graphHoverCard") });
}

function openGraphSelection(selection = null) {
  if (!selection || !String(selection?.kind || "").trim()) return;
  graphState.selection = selection;
  graphState.thinkingPanelOpen = false;
  resetGraphHoverState();
  renderGraphPanel();
}

function openGraphNodeSelectionFromElement(element = null) {
  const nodeId = String(element?.getAttribute?.("data-graph-select-node") || element?.getAttribute?.("data-node-id") || "").trim();
  if (!nodeId) return false;
  const title = String(element?.getAttribute?.("data-node-title") || nodeId).trim() || nodeId;
  const isolatedKey = String(element?.getAttribute?.("data-graph-isolated-key") || "").trim();
  if (isolatedKey || graphNodeNeedsRelationWorkflowFromCurrentGraph(nodeId)) {
    openGraphSelection({
      kind: "isolated",
      ...(isolatedKey ? { isolatedKey } : {}),
      noteId: nodeId
    });
    setStatus(`已打开待关联笔记整理：${title}`, "ok");
    return true;
  }
  openGraphSelection({ kind: "node", nodeId });
  setStatus(`已选中笔记角色：${title}`, "ok");
  return true;
}

function applyGraphThinkingHoverState(thinkingElement) {
  return applyGraphThinkingHoverDomState(thinkingElement, {
    document,
    getHoverCard: () => $("graphHoverCard"),
    resetHoverState: resetGraphHoverState,
    escapeHtml
  });
}

function applyGraphNodeHoverState(nodeElement) {
  return applyGraphNodeHoverDomState(nodeElement, { document, getHoverCard: () => $("graphHoverCard"), escapeHtml });
}

function applyGraphEdgeHoverState(edgeElement) {
  return applyGraphEdgeHoverDomState(edgeElement, { document, getHoverCard: () => $("graphHoverCard"), escapeHtml });
}

function renderRelationReviewQueueSection(reviewQueue, options = {}) {
  return renderRelationReviewQueueSectionView(reviewQueue, options, {
    escapeHtml,
    graphEdgeSelectionKey,
    graphRelationGroupMeta,
    graphRelationSourceLabel,
    graphRelationStatusLabel,
    graphRelationTypeLabel
  });
}

function renderGraphMetricCard(label, value, note, tone = "") {
  return `
    <div class="graph-metric-card" data-tone="${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}

function graphPendingAiCandidateCount(candidates = [], { existingRelationPairKeys = new Set(), excludePairs = new Set(), bridgeOnly = false, excludeBridge = false } = {}) {
  return computeGraphPendingAiCandidateCount(candidates, { existingRelationPairKeys, excludePairs, bridgeOnly, excludeBridge });
}

const graphThinkingModelRuntimeDeps = createGraphThinkingModelRuntimeDepsProvider(() => ({
    escapeHtml,
    graphAiAnalysisPayload,
    graphBridgeSelectionKey,
    graphCandidateCanSaveRelation,
    graphCandidateEndpointIds,
    graphCandidateTouchesNodeScope,
    graphComputedIsolatedNotes,
    graphExistingRelationPairKeys,
    graphFullNoteById,
    graphIsolatedQueueItems,
    graphIsolatedSelectionKey,
    graphLocalizedActionText,
    graphNodeIdsInScope,
    graphNoteHasSavedIsolationDisposition,
    graphNoteIdFromIsolatedItem,
    graphPendingAiCandidateCount,
    graphPreferredPotentialRelationType,
    graphRankThemeCandidates,
    graphRelationPairKey,
    graphRelationQualityLabel,
    graphRelationReviewReasonLabel,
    graphRelationTypeLabel,
    graphSelectEdgeActionAttrs,
    graphThemeSelectionKey
}));

function graphLiveAiAnalysisCounts(aiAnalysis = graphState.aiAnalysis, { nodes = null, edges = null } = {}) {
  return graphLiveAiAnalysisCountsForGraph(aiAnalysis, { nodes, edges, graph: graphState.item || {} }, graphThinkingModelRuntimeDeps());
}

function graphAiAnalysisSummaryState(options = {}) {
  return graphAiAnalysisSummaryStateForGraph({ aiAnalysis: graphState.aiAnalysis, graph: graphState.item || {}, ...options }, graphThinkingModelRuntimeDeps());
}

function currentGraphVisibleNodeIds() {
  if (state.module === "graph" && state.graphVisibleNoteIdsReady === true && state.graphVisibleNoteIds instanceof Set) {
    return [...state.graphVisibleNoteIds];
  }
  const graph = graphState.item;
  if (!graph) return [];
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const allEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const filters = graphState.filters || { relationType: "all", status: "all" };
  const edges = allEdges.filter((edge) => graphEdgeMatchesFilters(edge, filters));
  const filterActive = filters.relationType !== "all" || filters.status !== "all";
  const visibleNodeIds = new Set(edges.flatMap((edge) => [edge.fromNoteId, edge.toNoteId]).filter(Boolean));
  return (filterActive ? nodes.filter((node) => visibleNodeIds.has(node.id)) : nodes).map((node) => node.id);
}

function currentGraphWritingCandidateNoteIds() {
  return graphWritingCandidateNoteIds(currentGraphVisibleNodeIds(), {
    noteLookup: writingKnownNoteById,
    isEligible: isWritingEligibleNote
  });
}

function renderGraphMapPreview(nodes = [], edges = [], linkedNodeIds = new Set()) {
  return renderGraphMapPreviewView(nodes, edges, linkedNodeIds, {
    escapeHtml,
    graphRelationGroupMeta,
    graphRelationTypeLabel
  });
}

function renderGraphAiAnalysisCard(options = {}) {
  const { analysis, summary, pendingCount, topicCount, relationCount, bridgeCount, isolatedCount, totalCandidates } = graphAiAnalysisSummaryState(options);
  const loading = graphState.aiAnalysisLoading;
  const error = graphState.aiAnalysisError;
  const shouldOpen = options.open === true || loading || Boolean(error);
  return `
    <details class="graph-section graph-collapsible-section" data-graph-section="ai-analysis"${shouldOpen ? " open" : analysis ? "" : ""} aria-label="AI 图谱初判">
      <summary class="graph-collapsible-summary">
        <div>
          <div class="graph-section-title">AI 图谱初判</div>
          <div class="graph-section-note">只生成待审候选：主题、缺少连接、弱关系和待关联笔记都不会直接写入图谱。</div>
        </div>
        <span class="graph-collapsible-badge">${loading ? "分析中" : `${totalCandidates} 项`}</span>
      </summary>
      <div class="graph-collapsible-body">
        <div class="graph-section-head">
          <div></div>
          <button class="secondary-btn small" type="button" data-run-graph-ai-analysis ${loading ? "disabled" : ""}>
            ${loading ? "分析中..." : analysis ? "重新分析" : "AI 扫描"}
          </button>
        </div>
        ${
          error
            ? `<div class="graph-empty bad">AI 图谱初判失败：${escapeHtml(error)}</div>`
            : analysis
              ? `
                <div class="graph-metrics" aria-label="AI 图谱初判摘要">
                  ${renderGraphMetricCard("待审项", pendingCount, "系统消息中复核", pendingCount ? "warn" : "good")}
                  ${renderGraphMetricCard("主题候选", topicCount, "不会自动建索引卡", topicCount ? "warn" : "good")}
                  ${renderGraphMetricCard("关系候选", relationCount, "不会自动建边", relationCount ? "warn" : "good")}
                  ${renderGraphMetricCard("潜在关联/孤岛", `${bridgeCount}/${isolatedCount}`, "优先补还没说清的连接", bridgeCount + isolatedCount ? "warn" : "good")}
                </div>
                <div class="graph-next-card">
                  <strong>待审优先级</strong>
                  <small>${escapeHtml(
                    pendingCount
                      ? "先在图谱里判断结构是否成立；需要逐条采纳时再到系统消息里复核 AI 建议。"
                      : "当前没有新的图谱候选。"
                  )}</small>
                </div>
              `
              : `<div class="graph-empty">运行一次本地图谱扫描，查看可能的主题、缺少连接和待关联笔记。</div>`
        }
      </div>
    </details>
  `;
}

function buildGraphQuestionSpotSummary({ reviewQueueTotal = 0, bridgeGaps = [], conflictCount = 0, aiAnalysis = null, nodes = null, edges = null } = {}) {
  return buildGraphQuestionSpotSummaryForGraph({ reviewQueueTotal, bridgeGaps, conflictCount, aiAnalysis, nodes, edges, graph: graphState.item || {} }, graphThinkingModelRuntimeDeps());
}

function buildGraphQuestionSpotSummaryFromItems(items = [], { artifactCount = 0 } = {}) {
  return computeGraphQuestionSpotSummaryFromItems(items, { artifactCount });
}

function renderGraphQuestionSpotChip(summary = {}) {
  const total = Number(summary?.total || 0);
  const open = graphState.thinkingPanelOpen === true;
  const empty = !total;
  return `
    <div class="graph-question-chip-wrap${open ? " is-open" : ""}${empty ? " is-empty" : ""}">
      <button class="graph-question-chip${open ? " is-open" : ""}${empty ? " is-empty" : ""}" type="button" data-graph-thinking-toggle aria-expanded="${open}" aria-label="${empty ? "打开追问并运行图谱扫描" : "打开追问"}">
        ${renderGraphIcon("question")}
        <span>${escapeHtml(summary?.label || "暂无追问")}</span>
        <small>${escapeHtml(summary?.detail || "当前范围暂时没有明显的待追问结构。")}</small>
      </button>
      <button class="graph-overlay-close graph-question-chip-close" type="button" data-graph-thinking-hide aria-label="关闭追问" title="关闭追问">${renderGraphIcon("close")}</button>
    </div>
  `;
}

function graphThinkingFilterMeta(value = "all") {
  const key = String(value || "all").trim().toLowerCase();
  if (key === "theme") return { key: "theme", label: "主题", note: "只看可能形成主题或索引卡的聚集。" };
  if (key === "organize") return { key: "organize", label: "整理", note: "只看孤立、桥接、关系复核和错位线索。" };
  return { key: "all", label: "全部", note: "按优先级列出当前最值得继续判断的地方。" };
}

function graphCompactActionLabel(label = "查看") {
  const text = String(label || "查看").trim() || "查看";
  if (/补.*理由/.test(text)) return "补理由";
  if (/桥接|复核|评估|判断|核对|整理|改类型|拆分/.test(text)) return "判断";
  if (/关联/.test(text)) return "关联";
  if (/查看/.test(text)) return "查看";
  return text.length > 4 ? text.slice(0, 4) : text;
}

function graphThinkingNoteTitle(nodeMap = new Map(), id = "", fallback = "相关笔记") {
  return computeGraphThinkingNoteTitle(nodeMap, id, fallback);
}

function graphThinkingCleanIds(values = []) {
  return computeGraphThinkingCleanIds(values);
}

function graphThinkingHighlightAttrs(item = {}) {
  return graphThinkingHighlightAttrsForItem(item, {
    escapeHtml,
    cleanIds: graphThinkingCleanIds,
    edgeSelectionKey: graphEdgeSelectionKey
  });
}

function graphSelectEdgeActionAttrs(edge = {}) {
  return computeGraphSelectEdgeActionAttrs(edge, { escape: escapeHtml });
}

function buildGraphThinkingItems({ nodes = [], edges = [], bridgeGaps = [], reviewQueue = null, conflictItems = [], conflictingRelations = [], aiAnalysis = null, isolatedNotes = [], nodeLookupMap = null } = {}) {
  return buildGraphThinkingItemsForGraph({
    nodes,
    edges,
    bridgeGaps,
    reviewQueue,
    conflictItems,
    conflictingRelations,
    aiAnalysis,
    isolatedNotes,
    nodeLookupMap
  }, graphThinkingModelRuntimeDeps());
}

function graphNodeIdsInScope(nodes = []) {
  return new Set((Array.isArray(nodes) ? nodes : []).map((node) => String(node?.id || "").trim()).filter(Boolean));
}

function graphRelationInNodeScope(edge = {}, nodeIds = new Set()) {
  const fromId = String(edge?.fromNoteId || edge?.source?.id || "").trim();
  const toId = String(edge?.toNoteId || edge?.target?.id || "").trim();
  return Boolean(fromId && toId && nodeIds.has(fromId) && nodeIds.has(toId));
}

function graphRelationTouchesNodeScope(edge = {}, nodeIds = new Set()) {
  const fromId = String(edge?.fromNoteId || edge?.source?.id || "").trim();
  const toId = String(edge?.toNoteId || edge?.target?.id || "").trim();
  return Boolean((fromId && nodeIds.has(fromId)) || (toId && nodeIds.has(toId)));
}

function graphCandidateTouchesNodeScope(candidate = {}, nodeIds = new Set()) {
  if (!nodeIds?.size) return true;
  const { sourceNoteId, targetNoteId } = graphCandidateEndpointIds(candidate);
  return Boolean((sourceNoteId && nodeIds.has(sourceNoteId)) || (targetNoteId && nodeIds.has(targetNoteId)));
}

function graphBridgeGapInNodeScope(gap = {}, nodeIds = new Set()) {
  const sourceIds = graphThinkingCleanIds(gap?.noteIds);
  const targetIds = graphThinkingCleanIds(gap?.targetNoteIds);
  if (!sourceIds.length || sourceIds.some((id) => !nodeIds.has(id))) return false;
  return !targetIds.length || targetIds.some((id) => nodeIds.has(id));
}

function graphConflictItemInNodeScope(item = {}, nodeIds = new Set()) {
  const itemIds = graphThinkingCleanIds(
    Array.isArray(item?.noteIds) && item.noteIds.length
      ? item.noteIds
      : Array.isArray(item?.notes)
        ? item.notes.map((note) => note?.id)
        : []
  );
  return !itemIds.length || itemIds.some((id) => nodeIds.has(id));
}

function graphReviewQueueInNodeScope(reviewQueue = null, nodeIds = new Set()) {
  if (!reviewQueue || typeof reviewQueue !== "object") return reviewQueue;
  const items = (Array.isArray(reviewQueue.items) ? reviewQueue.items : []).filter((item) => graphRelationInNodeScope(item, nodeIds));
  return {
    ...reviewQueue,
    total: items.length,
    items,
    summary: items.length === Number(reviewQueue.total || 0) ? reviewQueue.summary : null
  };
}

function graphMergeRelationsByKey(...groups) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const edge of Array.isArray(group) ? group : []) {
      const key = String(edge?.id || `${edge?.fromNoteId || ""}->${edge?.toNoteId || ""}:${edge?.relationType || ""}`).trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(edge);
    }
  }
  return merged;
}

function renderGraphThinkingItems(items = [], filter = "all") {
  return renderGraphThinkingItemsView(items, filter, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}

function renderGraphWorkbenchPriorityQueue(items = [], activeKey = "questions") {
  return renderGraphWorkbenchPriorityQueueView(items, activeKey, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}

function renderGraphThinkingReviewNote(summary = {}) {
  return renderGraphThinkingReviewNoteView(summary, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}

function renderGraphThinkingPanelContent({ summary = {}, items = [], includeSummary = true } = {}) {
  return renderGraphThinkingPanelContentView({ summary, items, includeSummary }, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });}

function renderGraphThinkingPanel({ summary = {}, items = [] } = {}) {
  return renderGraphThinkingPanelView({ summary, items }, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}



function renderGraphWorkbenchPanel({ clueSummary = {}, questionSummary = {}, clueSectionsMarkup = "", thinkingItems = [], isolatedQueueMarkup = "" } = {}) {
  return renderGraphWorkbenchPanelView({ clueSummary, questionSummary, clueSectionsMarkup, thinkingItems, isolatedQueueMarkup }, {
    escapeHtml,
    renderGraphIcon,
    graphWorkbenchTabMeta,
    graphThinkingFilterMeta,
    graphThinkingHighlightAttrs,
    graphCompactActionLabel,
    graphState
  });
}

function renderGraphUtilityDrawer(options = {}) {
  return renderGraphUtilityDrawerView(options, {
    escapeHtml,
    graphAiAnalysisSummaryState,
    renderGraphIcon
  });
}

function graphSummaryModeNote(relationType = "all") {
  const key = String(relationType || "all").trim().toLowerCase();
  if (key === "meaningful") return "先看有解释力的关系。";
  if (key === "all") return "展开全部关系。";
  if (key === "noisy") return "只看链接线索。";
  if (key === "index") return "只看主题归属。";
  return `只看${graphRelationTypeLabel(key)}。`;
}

const graphPanelRuntimeDeps = createGraphPanelPrototypeRuntimeDepsProvider(() => ({
    syncGraphDisclosureState,
    syncAllNoteRelationNetworkStatuses,
    buildGraphPanelState,
    renderGraphPanelForRuntime,
    graphRelationStatusCountsAsNetworkEdge,
    graphScopedItems,
    normalizeGraphRelationTypeFilter,
    graphEdgeMatchesFilters,
    graphFocusedItems,
    graphNodeIdsInScope,
    graphRelationTouchesNodeScope,
    graphRelationInNodeScope,
    graphRelationVisual,
    graphMergeRelationsByKey,
    graphConflictItemInNodeScope,
    graphReviewQueueInNodeScope,
    graphBridgeGapInNodeScope,
    graphHasMeaningfulStructureEdges,
    graphStructureFallbackEdges,
    graphComputedIsolatedNotes,
    graphMarkIsolatedNodes,
    graphBuildIsolatedVisualNodes,
    graphBuildFocusedRelationTypeStats,
    normalizeGraphSelectionForVisibleItems,
    formatClockTime,
    graphPotentialRelationNodeMap,
    graphWeakRelationClues,
    graphClueSummaryState,
    buildGraphThinkingItems,
    buildGraphQuestionSpotSummaryFromItems,
    graphIsolatedQueueItems,
    escapeHtml,
    renderGraphErrorState,
    renderGraphIsolatedQueue,
    renderGraphIsolatedQueueStrip,
    renderGraphBridgeGapSection,
    renderGraphWeakRelationClueSection,
    renderRelationReviewQueueSection,
    renderGraphAiAnalysisCard,
    renderGraphWorkbenchEntryPills,
    renderGraphWorkbenchPanel,
    renderGraphRelationTypeFilter,
    renderGraphInlineNotice,
    renderGraphVisualMap
}));

function renderGraphPanel() {
  const summary = $("graphSummary");
  const canvas = $("graphCanvas");
  const backButton = $("graphBackToDirectory");
  const folder = folderById(state, GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID);
  const scopeDirectoryId = graphScopeDirectoryId();
  return renderGraphPanelShell({
    appState: state,
    graphState,
    dom: { summary, canvas, backButton },
    folder,
    scopeDirectoryId,
    canReuseScopedGraph: graphLoadedScopeCoversDirectory(scopeDirectoryId)
  }, graphPanelRuntimeDeps());
}

async function refreshDirectoryGraph() {
  return refreshDirectoryGraphForRuntime({
    graphState,
    graphScopeDirectoryId,
    graphOriginalScopeDirectoryId: GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID,
    graphLoadedScopeCoversDirectory,
    syncNotesForDirectoryTree,
    fetchDirectoryGraph,
    fetchGraphConflicts,
    fetchRelationReviewQueue,
    upsertGraphNodeSummaries,
    graphLoadErrorMessage,
    renderGraphPanel,
    renderAll
  });
}

async function runGraphAiAnalysis() {
  if (graphState.aiAnalysisLoading) return;
  const directoryId = graphScopeDirectoryId();
  graphState.aiAnalysisLoading = true;
  graphState.aiAnalysisError = "";
  renderGraphPanel();
  try {
    const localAiReady = await ensureGraphLocalAiReadyForAnalysis();
    if (!localAiReady) return;
    const result = await analyzeDirectoryGraph(directoryId, {
      includeDescendants: true,
      minScore: 0.05,
      persistArtifacts: true
    });
    graphState.aiAnalysis = result;
    const count = Number(result?.reviewItems?.summary?.artifactCount || 0);
    if (count > 0) {
      const messageId = `graph-ai-analysis:${directoryId || "root"}:${Date.now()}`;
      addSystemMessage({
        id: messageId,
        type: "ai",
        title: "图谱目录扫描产生了待确认建议",
        body: `当前目录生成了 ${count} 条待确认建议。先判断关系或主题是否成立，再决定是否采纳。`,
        action: "open-ai-inbox",
        actionLabel: "查看待确认建议",
        artifactCount: count,
        aiInboxFilters: { view: "pending", sourceNoteId: "" }
      });
      graphState.aiReviewSystemMessageId = messageId;
    } else {
      graphState.aiReviewSystemMessageId = "";
    }
    graphState.thinkingPanelVisible = true;
    graphState.thinkingPanelOpen = true;
    graphState.thinkingFilter = "all";
    graphState.workbenchPanelOpen = true;
    graphState.workbenchPanelTab = "questions";
    setStatus(
      count ? `目录批处理已生成 ${count} 条待审候选，已在追问中展开` : "目录批处理完成，已打开追问",
      count ? "ok" : ""
    );
  } catch (error) {
    graphState.aiAnalysisError = String(error?.message || error);
    setStatus(`AI 图谱初判失败：${graphState.aiAnalysisError}`, "warn");
  } finally {
    graphState.aiAnalysisLoading = false;
    renderGraphPanel();
  }
}

async function ensureGraphLocalAiReadyForAnalysis() {
  if (!localOllamaSetupActive()) return true;
  const bootstrapResult = await previewOllamaLocalAiBootstrapFromUi(localAiPreviewOptionsForAction("graph_analysis"));
  if (bootstrapResult?.ready === true) {
    renderGraphPanel();
    return true;
  }
  graphState.aiAnalysisError = `${ollamaBootstrapStatusText(bootstrapResult)}。请先到 AI 设置完成安装、启动或模型下载。`;
  setStatus(graphState.aiAnalysisError, "warn");
  return false;
}

async function runGraphAiConnectForNote(noteId = "") {
  return graphAiConnectRuntimeController.runGraphAiConnectForNote(noteId);
}

async function saveGraphCandidateRelation(button = null) {
  return graphRelationSaveController.saveCandidateRelation(button);
}

async function saveGraphAiCandidateRelation(button = null) {
  return graphRelationSaveController.saveAiCandidateRelation(button);
}

async function triggerGraphPotentialRelationRefine(
  button = null,
  { confirmationApproved = false, missingStatus = "没有找到这条待确认关联，请重新运行当前笔记的接入扫描", progressStatus = "正在生成关系说明..." } = {}
) {
  const candidate = graphFindPotentialRelationCandidate({
    candidateId: button?.getAttribute?.("data-graph-candidate-id"),
    sourceNoteId: button?.getAttribute?.("data-graph-source-note"),
    targetNoteId: button?.getAttribute?.("data-graph-target-note")
  });
  if (!candidate) {
    setStatus(missingStatus, "warn");
    return false;
  }
  const sourceNoteId = String(candidate.sourceNoteId || candidate.fromNoteId || button?.getAttribute?.("data-graph-source-note") || "").trim();
  setStatus(progressStatus, "warn");
  const result = await refineGraphPotentialRelationCandidate(sourceNoteId, candidate, {
    directoryId: graphScopeDirectoryId(),
    confirmationApproved
  });
  if (!confirmationApproved && result?.aiReasonGenerated) {
    setStatus(
      result?.merged ? "已重新生成这条潜在关联的 AI 复核理由" : "AI 理由已生成，但当前图谱范围已变化，请重新打开这条笔记查看",
      result?.merged ? "ok" : "warn"
    );
  }
  return result;
}

async function confirmGraphPotentialRelationRefine(button = null) {
  return triggerGraphPotentialRelationRefine(button, {
    confirmationApproved: true,
    progressStatus: "正在按当前 AI 设置生成关系说明..."
  });
}

async function retryGraphPotentialRelationRefine(button = null) {
  return triggerGraphPotentialRelationRefine(button, {
    confirmationApproved: false,
    missingStatus: "没有找到这条待重试关联，请重新运行当前笔记的接入扫描",
    progressStatus: "正在重新生成关系说明..."
  });
}

function isGraphThemeIndexEligibleNote(note = null) {
  if (!note) return false;
  const noteType = String(note.noteType || note.note_type || "").trim().toLowerCase();
  return noteType === "permanent" || isDirectoryUnderOriginalRoot(note.folderId);
}

async function createGraphThemeIndexFromNoteIds(noteIds = [], { title = "", source = "graph-theme-index" } = {}) {
  const requestedIds = uniqueStrings(noteIds);
  if (requestedIds.length < 3) {
    setStatus("至少需要 3 条相关永久笔记，才适合整理成主题草稿", "warn");
    return null;
  }
  await ensureNotesLoaded(requestedIds);
  const eligibleIds = requestedIds.filter((id) => isGraphThemeIndexEligibleNote(writingKnownNoteById(id)));
  if (eligibleIds.length < 3) {
    setStatus("这组笔记里可用于主题草稿的永久笔记不足 3 条", "warn");
    return null;
  }
  const writingEligibleIds = eligibleIds.filter((id) => isWritingEligibleNote(writingKnownNoteById(id)));
  const notes = eligibleIds.map((id) => writingNoteById(id)).filter(Boolean);
  const cleanTitle = String(title || suggestedThemeIndexTitle(eligibleIds)).trim() || suggestedThemeIndexTitle(eligibleIds);
  const card = await createIndexCard({
    directoryId: writingThemeIndexScopeDirectoryId(),
    indexType: "topic",
    title: cleanTitle,
    summary: "从关联图谱保存的主题草稿入口，用于继续提炼中心问题、关系说明和后续写作。",
    centralQuestion: "这组笔记共同回答什么问题？",
    noteIds: eligibleIds,
    items: eligibleIds.map((noteId, index) => ({
      noteId,
      shortLabel: notes[index]?.title || "",
      rationale: "来自关联图谱的主题候选成员。"
    }))
  });
  if (!card?.id) throw new Error("主题笔记创建失败");
  upsertWritingThemeIndex(card);
  if (writingEligibleIds.length >= 2) {
    setWritingSourceIndexIds([card.id]);
    continueWritingEntry(writingEligibleIds, {
      title: normalizeWritingProjectTitleSeed(cleanTitle),
      source,
      sourceIndexIds: [card.id]
    });
  }
  const canEnterWriting = writingEligibleIds.length >= 2;
  addSystemMessage({
    id: `graph-theme-index:${card.id}:${Date.now()}`,
    type: "system",
    title: "已创建主题草稿",
    body: canEnterWriting
      ? `“${cleanTitle}”已收纳 ${eligibleIds.length} 条笔记，其中 ${writingEligibleIds.length} 条可继续进入写作整理。`
      : `“${cleanTitle}”已包含 ${eligibleIds.length} 条笔记。先补作者确认或状态，再进入写作会更稳。`,
    action: "open-writing",
    actionLabel: "继续整理主题",
    noteId: eligibleIds[0],
    sourceNoteId: eligibleIds[0],
    workflowRoute: {
      focus: "writing",
      source,
      indexCardId: card.id,
      basketNoteIds: eligibleIds.join(",")
    }
  });
  setStatus(`已创建主题草稿：${cleanTitle}`, "ok", { priority: 3, holdMs: 4200 });
  renderGraphPanel();
  return card;
}

async function createGraphThemeIndexFromButton(button = null) {
  const noteIds = graphDataList(button, "data-graph-theme-note-ids");
  const title = String(button?.getAttribute?.("data-graph-theme-title") || "").trim();
  if (!noteIds.length) {
    setStatus("当前范围还没有可整理成主题草稿的笔记", "warn");
    return null;
  }
  const previousDisabled = Boolean(button?.disabled);
  if (button) button.disabled = true;
  try {
    return await createGraphThemeIndexFromNoteIds(noteIds, { title, source: "graph-theme-index" });
  } catch (error) {
    setStatus(`创建主题草稿失败：${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    if (button) button.disabled = previousDisabled;
  }
}

async function importYijingKnowledgeNetworkDemo(options = {}) {
  const { startup = false } = options;
  const button = $("graphSeedYijing");
  const previousDisabled = Boolean(button?.disabled);
  if (button) button.disabled = true;
  setStatus("正在导入易经知识网络案例...", "");
  try {
    const result = await seedYijingKnowledgeNetwork();
    const directoryId = String(result?.directoryId || result?.directory?.id || "").trim();
    if (!directoryId) throw new Error("演示数据没有返回目录 ID");
    await syncDirectoriesFromApi();
    state.browserRootId = rootBoxIdFromFolder(state, directoryId);
    state.selectedFolderId = directoryId;
    await syncNotesForDirectory(directoryId);
    if (result?.firstNoteId) state.selectedFileId = result.firstNoteId;
    if (startup) {
      // Demo routes should always reopen into a readable, stable first-screen
      // graph state instead of inheriting stale filters or expanded UI state
      // from a previous session.
      resetGraphDemoPresentationState();
    }
    await refreshDirectoryGraph();
    renderAll();
    const summary = result?.summary || {};
    setStatus(`已导入易经案例：${summary.totalNodes || summary.notes || 0} 条笔记，${summary.totalEdges || summary.relations || 0} 条关系`, "ok");
    return true;
  } catch (error) {
    setStatus(`易经案例导入失败：${String(error?.message || error)}`, "bad");
    return false;
  } finally {
    if (button) button.disabled = previousDisabled;
  }
}

async function importYijingRichAcceptanceDemo(options = {}) {
  const { startup = false } = options;
  const button = $("graphSeedYijingRich");
  const previousDisabled = Boolean(button?.disabled);
  if (button) button.disabled = true;
  setStatus("正在导入易经官网演示案例...", "");
  try {
    const result = await seedYijingRichAcceptanceDemo();
    const directoryId = String(result?.directoryId || result?.directory?.id || "").trim();
    if (!directoryId) throw new Error("演示案例没有返回目录 ID");
    await syncDirectoriesFromApi();
    state.browserRootId = rootBoxIdFromFolder(state, directoryId);
    state.selectedFolderId = directoryId;
    await syncNotesForDirectory(directoryId);
    if (result?.firstNoteId) state.selectedFileId = result.firstNoteId;
    const postImportPlan = yijingRichDemoPostImportPlan({ startup });
    if (postImportPlan.resetGraphPresentationState) {
      // Demo routes should always reopen into a readable, stable first-screen
      // graph state instead of inheriting stale filters or expanded UI state
      // from a previous session.
      resetGraphDemoPresentationState();
    }
    if (postImportPlan.refreshDirectoryGraph) await refreshDirectoryGraph();
    if (postImportPlan.activateModule) {
      activateModule(postImportPlan.activateModule);
    } else if (postImportPlan.renderAll) {
      renderAll();
    }
    const counts = result?.counts || {};
    const summary = result?.summary || {};
    const noteCount = counts.original_notes || summary.createdNotes || summary.updatedNotes || 0;
    const relationCount = counts.relations || summary.createdRelations || summary.updatedRelations || 0;
    const projectCount = counts.writing_projects || summary.createdWritingProjects || summary.updatedWritingProjects || 0;
    setStatus(`已导入易经官网演示：${noteCount} 条永久笔记，${relationCount} 条关系，${projectCount} 个写作方案`, "ok");
    return true;
  } catch (error) {
    setStatus(`易经官网演示导入失败：${String(error?.message || error)}`, "bad");
    return false;
  } finally {
    if (button) button.disabled = previousDisabled;
  }
}

async function importSmartNotesProductThinkingDemo(options = {}) {
  const { startup = false } = options;
  setStatus("正在导入 Smart Notes 产品思考 Demo...", "");
  try {
    const result = await seedSmartNotesProductThinkingDemo();
    const directoryId = String(result?.directoryId || result?.directory?.id || "").trim();
    if (!directoryId) throw new Error("Demo 导入结果缺少目录 ID");
    await syncDirectoriesFromApi();
    state.browserRootId = rootBoxIdFromFolder(state, directoryId);
    state.selectedFolderId = directoryId;
    await syncNotesForDirectory(directoryId);
    const firstNoteId = String(result?.firstNoteId || "").trim();
    if (firstNoteId) {
      state.selectedFileId = firstNoteId;
      openNoteById(firstNoteId, { preferTitleSelection: false });
    }
    const writingProjectId = String(result?.writingProjectId || "").trim();
    if (writingProjectId) {
      try {
        const project = await fetchWritingProject(writingProjectId);
        writingState.project = project;
        populateWritingFormFromProject(project);
        const draftScaffoldId = String(result?.draftScaffoldId || project?.scaffold_id || "").trim();
        if (draftScaffoldId) {
          const scaffold = await fetchDraftScaffold(draftScaffoldId);
          writingState.scaffold = scaffold.item || null;
          writingState.scaffoldMarkdown = scaffold.export?.markdown || scaffold.item?.markdown || "";
        }
      } catch {}
    }
    if (startup) {
      // Demo routes should always reopen into a readable, stable first-screen
      // graph state instead of inheriting stale filters or expanded UI state
      // from a previous session.
      resetGraphDemoPresentationState();
    }
    await refreshDirectoryGraph();
    if (startup) activateModule("explorer");
    renderAll();
    const counts = result?.counts || {};
    const summary = result?.summary || {};
    const noteCount = counts.permanent_notes || summary.createdNotes || summary.updatedNotes || 0;
    const relationCount = counts.relations || summary.createdRelations || summary.updatedRelations || 0;
    const projectCount = counts.writing_projects || summary.createdWritingProjects || summary.updatedWritingProjects || 0;
    const suffix = startup && firstNoteId ? "，已打开导览笔记" : "";
    setStatus(`已导入 Smart Notes 产品思考 Demo：${noteCount} 条永久笔记，${relationCount} 条关系，${projectCount} 个项目${suffix}`, "ok");
    return true;
  } catch (error) {
    setStatus(`Smart Notes Demo 导入失败：${String(error?.message || error)}`, "bad");
    return false;
  }
}

async function ensureNoteBodyLoaded(noteId) {
  return noteRuntimeController.ensureNoteBodyLoaded(noteId);
}

function openNoteById(id, options = {}) {
  const note = state.notes.find((n) => n.id === id);
  if (!note) return false;
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (activeTab?.dirty && activeTab.noteId !== id) {
    editor.updateActiveTabFromEditor();
    void editor.autoSaveTabById(activeTab.id, "switch-note");
  }
  const focusedIds = Array.isArray(state.literatureQueueFocusNoteIds) ? state.literatureQueueFocusNoteIds : [];
  if (focusedIds.length) {
    const keepFocus =
      String((note?.folderId ? typeFromFolder(state, note.folderId) : "") || note?.noteType || "").trim() === "literature" &&
      focusedIds.includes(String(id || "").trim());
    if (!keepFocus) clearLiteratureQueueFocus();
  }
  if (note) applyExplorerSelectionContext({ note, syncSearch: true, expandFolder: true });
  editor.openNoteTab(id, options);
  renderAll();
  if (options.focusDistillation) {
    state.inspectorVisible = false;
    editor?.setInspectorVisible?.(false);
    window.setTimeout(() => {
      editor?.jumpToInspectorSection?.("[data-note-distillation-section]");
    }, 80);
  }
  ensureNoteBodyLoaded(id);
  return true;
}

function openNoteRelationEditor(noteId = "", options = {}) {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return false;
  activateModule("explorer");
  const opened = openNoteById(cleanNoteId, { preferTitleSelection: false });
  if (!opened) return false;
  state.inspectorVisible = true;
  editor?.setInspectorVisible?.(true);
  editor?.renderRelated?.();
  window.setTimeout(() => {
    editor?.openPermanentRelationWorkspace?.({
      mode: options.mode || "",
      targetNoteId: options.targetNoteId || "",
      relationType: options.relationType || "",
      rationaleDraft: options.rationaleDraft || "",
      insightQuestionDraft: options.insightQuestionDraft || ""
    });
  }, 60);
  return true;
}

const openRecordPermanentWorkflowFromCurrentNote = createRecordPermanentWorkflowOpener({
  getRecordPermanentButton: () => editor?.els?.recordPermanent,
  setStatus,
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  now: () => Date.now()
});

const openSystemMessageWorkflow = createSystemMessageWorkflowOpener({
  getNotes: () => state.notes,
  setNotes: (notes) => {
    state.notes = Array.isArray(notes) ? notes : state.notes;
  },
  ensureNotesLoaded,
  searchNotes,
  mapNoteItem,
  systemMessageSubjectText,
  closeSystemMessages,
  selectWritingThemeIndex,
  isWritingEligibleNote,
  writingKnownNoteById,
  continueWritingEntry,
  suggestedWritingProjectTitle,
  openWritingModule,
  setStatus,
  handleStateChange,
  getGraphEdges: () => graphState.item?.edges,
  setGraphSelection: (selection) => {
    graphState.selection = selection;
  },
  renderGraphPanel,
  openNoteRelationEditor,
  openGraphFollowupNote,
  activateModule,
  openNoteById,
  openRecordPermanentWorkflowFromCurrentNote
});

const graphFollowupController = createGraphFollowupController(() => ({
  activateModule,
  continueWritingEntry,
  continueWritingProjectEntry,
  currentGraphVisibleNodeIds,
  document,
  editor,
  graphRelationTypeLabel,
  graphWritingContinuationEntry,
  isWritingEligibleNote,
  openNoteById,
  openWritingModule,
  parseWritingBasketIds,
  setStatus,
  state,
  suggestedWritingProjectTitle,
  window,
  writingKnownNoteById
}));

function openGraphFollowupNote(noteId = "", action = "", options = {}) {
  return graphFollowupController.openGraphFollowupNote(noteId, action, options);
}

function removeNoteFromClientState(noteId = "") {
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId) return false;
  state.notes = state.notes.filter((note) => note.id !== cleanNoteId);
  state.tabs = state.tabs.filter((tab) => tab.noteId !== cleanNoteId);
  if (state.selectedFileId === cleanNoteId) state.selectedFileId = null;
  if (state.activeTabId && !state.tabs.find((tab) => tab.id === state.activeTabId)) {
    state.activeTabId = state.tabs[0]?.id || null;
  }
  return true;
}

function moveNoteInClientState(noteId = "", directoryId = "", moved = null) {
  const cleanNoteId = String(noteId || "").trim();
  const cleanDirectoryId = String(directoryId || "").trim();
  if (!cleanNoteId || !cleanDirectoryId) return false;
  const note = state.notes.find((item) => item.id === cleanNoteId);
  if (!note) return false;
  note.folderId = String(moved?.directoryId || cleanDirectoryId).trim() || cleanDirectoryId;
  note.noteType = typeFromFolder(state, note.folderId);
  note.markdownPath = moved?.markdownPath || note.markdownPath;
  note.updatedAt = moved?.updatedAt || new Date().toISOString();
  state.selectedFolderId = note.folderId;
  state.selectedFileId = note.id;
  return true;
}

const appShellStateChangeDeps = createAppShellStateChangePrototypeDepsProvider(() => ({
    GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID,
    activateModule,
    addSystemMessage,
    aiInboxState,
    analyzePermanentNote,
    applyExplorerSelectionContext,
    clearSaveAiSuggestion,
    confirmPermanentNoteDistillation,
    continueWritingEntry,
    continueWritingProjectEntry,
    createNote,
    createNoteInSelectedFolder,
    createPrimaryOriginalNote,
    createWritingProjectFromCurrentBasket,
    deleteDirectory,
    deleteNote,
    descendantDirectoryIds,
    editor,
    ensureNoteBodyLoaded,
    expandGraphBrowserTree,
    explorer,
    folderById,
    generatedOriginalNoteIdFromBody,
    graphAssociateNoteRoute,
    graphNodeNeedsRelationWorkflowFromCurrentGraph,
    graphRelationWorkflowController,
    graphState,
    handleStateChange,
    isOriginalRecordableSource,
    isPermanentLikeNote,
    mapNoteItem,
    moveNote,
    moveNoteInClientState,
    movedDirectoryFsPath,
    noteGeneratedOriginalNoteId,
    noteMainPathWritingContinuationEntry,
    notePersistenceFieldsForSave,
    noteSaveFailureFeedback,
    normalizeAiInboxFilters,
    normalizeAuthorshipItem,
    normalizeOptionalNumber,
    normalizeThinkingStatusItem,
    normalizeWritingProjectTitleSeed,
    noteAnalysisSystemMessageForResult,
    openAiInboxModule,
    openGraphSelection,
    openNoteById,
    openNoteRelationEditor,
    openSystemMessages,
    openWritingModule,
    originalDraftBodyFromSource,
    parseLinks,
    parseTags,
    refreshDirectoryGraph,
    removeNoteFromClientState,
    renamedDirectoryFsPath,
    renderAll,
    renderDistillationPanel,
    replaceFirstMarkdownTitle,
    rootBoxIdFromFolder,
    saveAiSuggestion,
    setGraphIsolatedWorkflowActiveTab,
    setStatus,
    showSaveAiSuggestionForNote,
    state,
    syncExplorerContextToActiveTab,
    syncExplorerContextToNote,
    syncDirectoriesFromApi,
    syncLoadedNotesForDirectories,
    syncNoteRelationNetworkStatus,
    syncNotesForDirectory,
    syncSourcePromotionSystemMessageForNote,
    titleFromSeedText,
    typeFromFolder,
    updateDirectory,
    updateNote,
    updatePermanentNoteDistillation,
    usingLocalFallbackData,
    windowRef: window,
    withGeneratedOriginalMarker,
    withGeneratedOriginalReference,
    writingCenterContinuationFailureMessage,
    writingCenterContinuationStatusMessage
  }));

async function handleStateChange(reason, payload = {}) {
  return routeAppShellStateChange(reason, payload, appShellStateChangeDeps());
}

const contextMenu = new ContextMenu($("contextMenu"));
const createBoxDialog = new CreateBoxDialog({
  maskEl: $("newBoxModal"),
  nameEl: $("modalBoxName"),
  parentEl: $("modalParentFolder"),
  fsPathEl: $("modalFsPath"),
  browseEl: $("modalBrowsePath"),
  maxEl: $("modalMaxCards"),
  cancelEl: $("modalCancel"),
  createEl: $("modalCreate"),
  onStatus: setStatus,
  pickDirectory: desktopCommands.browseDirectory
});
const permanentNoteDialog = new PermanentNoteDialog({
  maskEl: $("permanentNoteModal"),
  modalTitleEl: $("permanentNoteModalTitle"),
  modalNoteEl: $("permanentNoteModalNote"),
  sourceCardEl: $("permanentNoteSourceCard"),
  sourceTypeEl: $("permanentNoteSourceType"),
  sourceTitleEl: $("permanentNoteSourceTitle"),
  sourceHintEl: $("permanentNoteSourceHint"),
  directoryLabelEl: $("permanentNoteTargetFolderLabel"),
  directorySelectEl: $("permanentNoteTargetFolder"),
  directoryHintEl: $("permanentNoteTargetHint"),
  cancelEl: $("permanentNoteCancel"),
  createEl: $("permanentNoteCreate")
});

createBoxDialog.onCreate = async ({ name, parentId, fsPath, maxCards }) => {
  await handleCreateDirectoryFromDialog({ name, parentId, fsPath, maxCards }, {
    state,
    folderById,
    joinFsPath,
    createDirectory,
    mapDirectoryItem,
    rootBoxIdFromFolder,
    explorer,
    dialog: createBoxDialog,
    setStatus,
    renderAll
  });
};

async function selectPermanentDirectory({
  sourceNoteId = "",
  sourceType = "",
  sourceTitle = "",
  sourceHint = ""
} = {}) {
  const options = permanentDirectoryDialogOptions();
  if (!options.length) {
    setStatus("当前还没有可用的永久笔记盒目录", "warn");
    return "";
  }
  const directoryId = await permanentNoteDialog.open({
    sourceType,
    sourceTypeLabel: sourceNoteTypeLabel(sourceType),
    sourceTitle: sourceTitle || sourceNoteId || "未命名笔记",
    sourceHint: sourceHint || "选择保存位置，然后创建永久笔记。",
    directoryOptions: options,
    defaultDirectoryId: defaultPermanentDirectoryId(),
    actionLabel: "在这个目录创建"
  });
  if (directoryId) lastChosenPermanentDirectoryId = directoryId;
  return directoryId;
}

async function selectNoteMoveDirectory({
  noteId = "",
  noteTitle = "",
  currentDirectoryId = ""
} = {}) {
  const options = noteMoveDirectoryOptions(currentDirectoryId);
  if (!options.length) {
    setStatus("当前文件盒里没有其他可移动目录", "warn");
    return "";
  }
  return permanentNoteDialog.open({
    modalTitle: "移动笔记",
    modalNote: "选择要移动到的目录。这里只显示当前文件盒里可用的目录。",
    sourceCardVisible: false,
    directoryLabel: "目标目录",
    directoryOptions: options,
    defaultDirectoryId: options[0]?.id || "",
    actionLabel: "移动到这个目录",
    sourceTitle: noteTitle || noteId || "未命名笔记"
  });
}

const explorer = new ExplorerPane({
  state,
  elements: {
    searchInput: $("searchInput"),
    toggleSearchBtn: $("btnToggleSearch"),
    openNewBoxBtn: $("btnOpenNewBoxDialog"),
    newNoteBtn: $("btnNewNote"),
    listArea: $("listArea")
  },
  contextMenu,
  createBoxDialog,
  onOpenNote: openNoteById,
  onStatus: setStatus,
  onStateChange: handleStateChange,
  pickDirectory: desktopCommands.browseDirectory,
  selectPermanentDirectory,
  selectNoteMoveDirectory,
  desktopFile: { revealPath: desktopCommands.revealInFileManager, openPath: desktopCommands.openDirectory },
  resolveNotePath
});

const editor = new EditorPane(createEditorPaneHostDeps({
  $,
  state,
  desktopCommands,
  editorSelectionAiActionElements,
  setStatus,
  handleStateChange,
  openNoteById,
  noteMainPathWritingContinuationEntry,
  syncRelationNetworkSystemMessageForNote,
  selectPermanentDirectory,
  currentLiteratureTemplateSectionLabels,
  literatureTemplateSectionLabelCandidates,
  renderStatusMeta,
  renderWorkspaceStatusHint
}));
window.__prototypeEditor = editor;
window.__prototypeState = state;
window.__prototypeImport = {
  showResult: showImportResult,
  renderPage: renderImportPageShell
};
window.__prototypeGraph = {
  openFollowupNote: openGraphFollowupNote,
  openNoteById,
  runAiAnalysis: runGraphAiAnalysis,
  runAiConnectForNote: runGraphAiConnectForNote,
  createThemeIndexFromNoteIds: createGraphThemeIndexFromNoteIds,
  getSelectedFileId: () => state.selectedFileId,
  getActiveModule: () => state.module
};

$("btnFocusMode")?.addEventListener("click", () => {
  state.focusMode = !state.focusMode;
  applyFocusModeChrome();
  editor.setFocusMode(state.focusMode);
  setStatus(state.focusMode ? "已开启专注模式" : "已退出专注模式", "ok", { requireModule: "explorer" });
  renderWorkspaceStatusHint();
});

$("btnDismissEditorHelper")?.addEventListener("click", () => {
  editorHelperDismissed = true;
  hideEditorHelper();
});

$("btnEditorHelperAction")?.addEventListener("click", () => {
  const button = $("btnEditorHelperAction");
  const helperAction = String(button?.dataset.helperAction || "noop").trim();
  const targetNoteId = String(button?.dataset.targetNoteId || "").trim();
  if (helperAction === "noop") {
    editorHelperDismissed = true;
    hideEditorHelper();
    return;
  }
  if (helperAction === "open-generated-original" && targetNoteId) {
    const opened = openNoteById(targetNoteId, { preferTitleSelection: false });
    if (opened) {
      setStatus("已打开对应永久笔记", "ok", { requireModule: "explorer" });
      return;
    }
    setStatus("没有找到对应永久笔记", "warn", { requireModule: "explorer" });
    return;
  }
  setStatus("已记录当前建议，你可以继续编辑", "ok", { requireModule: "explorer" });
});

$("btnSaveAiSuggestionLater")?.addEventListener("click", () => {
  dismissSaveAiSuggestionForLater(saveAiSuggestion, dismissedSaveAiSuggestionKeys);
  clearSaveAiSuggestion();
});

$("btnSaveAiSuggestionPrimary")?.addEventListener("click", async () => {
  const suggestion = saveAiSuggestion;
  clearSaveAiSuggestion();
  if (!suggestion?.noteId) return;
  const note = state.notes.find((item) => item.id === suggestion.noteId) || null;
  const route = saveAiSuggestionPrimaryRoute(suggestion, note);
  if (route.kind === "missing-note") {
    setStatus("没有找到这条笔记", "warn", { requireModule: "explorer" });
    return;
  }

  try {
    if (route.kind === "record-permanent") {
      activateModule("explorer");
      const opened = openNoteById(route.noteId, { preferTitleSelection: false });
      if (!opened) {
        setStatus("没有找到这条笔记", "warn", { requireModule: "explorer" });
        return;
      }
      window.setTimeout(() => {
        const button = editor?.els?.recordPermanent;
        if (!button || button.disabled) {
          setStatus("当前笔记暂时不能创建永久笔记", "warn", { requireModule: "explorer" });
          return;
        }
        button.click();
      }, 30);
      return;
    }

    if (route.kind === "open-note-main-route") {
      await handleStateChange("open-note-main-route", {
        noteId: route.noteId,
        action: route.action,
        mode: route.mode
      });
      return;
    }

    setStatus("这条建议暂时没有可执行动作", "warn", { requireModule: "explorer" });
  } catch (error) {
    setStatus(`处理建议失败：${String(error?.message || error)}`, "bad", { requireModule: "explorer" });
  }
});

installSettingsEventBindings({
  $,
  state,
  settingsState,
  desktopCommands,
  editor,
  updateController,
  setSettingsSection,
  setSettingsItem,
  activateModule,
  refreshVaultSettings,
  loadNoteTemplateSettingsFromStorage,
  syncDirectoriesFromApi,
  syncNotesForDirectory,
  renderAll,
  renderSettingsPanel,
  renderScheduledTasksWorkspace,
  setStatus,
  updateStateRemindLater,
  updateStateIgnoreLatest,
  updateStateAutoCheckEnabled,
  openNoteTemplatePreview,
  saveNoteTemplateFromEditor,
  resetNoteTemplateToDefault,
  updateNoteTemplatePreviewFromEditor,
  closeNoteTemplatePreview,
  scheduledTaskFiltersFromUi,
  scheduledTaskFormFromUi,
  resetScheduledTaskForm,
  refreshScheduledTasks,
  runDueScheduledTasksFromUi,
  saveScheduledTaskFromUi,
  editScheduledTaskFromList,
  setScheduledTaskStatus,
  applyScheduledTaskTemplateToForm
});
$("btnEditorHelperMute")?.addEventListener("click", () => {
  editorHelperDismissed = true;
  editorHelperMuted = true;
  writeStoredBoolean(EDITOR_HELPER_MUTE_KEY, true);
  hideEditorHelper();
  setStatus("后续将不再显示这类编辑提示", "ok", { requireModule: "explorer" });
});

async function applyAiRuntimeModeChange(nextMode = "auto") {
  return applyAiRuntimeModeChangeForRuntime(nextMode, {
    settingsState,
    normalizeAiRuntimeMode,
    aiDefaultsForRuntimeMode,
    reconcileAiSelectionState,
    persistAiSettingsToStorage,
    syncAiSettingsToApi,
    isAiLocalFlowActive,
    shouldUseOllamaLocalRuntime,
    previewOllamaLocalAiBootstrapFromUi,
    localAiPreviewOptionsForAction,
    refreshAiRoutePreview,
    renderSettingsPanel,
    setStatus,
    currentAiProviderId,
    settingsAiAdvancedRuntimeModeLabel
  });
}

installSettingsAiEventBindings({
  $,
  settingsState,
  normalizeAiRuntimeMode,
  applyAiRuntimeModeChange,
  persistAiSettingsToStorage,
  syncAiSettingsToApi,
  refreshAiRoutePreview,
  renderSettingsPanel,
  setStatus,
  applyAiModelPackChange,
  selectInstalledLocalModelFromUi,
  markAiProviderDraftTouched,
  syncAiProviderConfigToApi,
  aiTestBlockedReason,
  currentAiProviderId,
  aiSettingsPayload,
  authModeForProvider,
  runAiTestChat,
  checkCurrentAiProviderHealth,
  detectOllamaModels,
  startOllamaRuntimeFromUi,
  stopOllamaRuntimeFromUi,
  pullRecommendedOllamaModel,
  copyTextToClipboard,
  applySettingsAiQuickSetup,
  openSettingsAiDialog,
  closeSettingsAiDialogs
});
bindAiSuggestionsWorkspaceEvents($("settingsAiSuggestionsPanel"), createAiSuggestionsWorkspaceHostDeps({
  settingsState,
  aiSuggestionFiltersFromUi,
  refreshAiSuggestions,
  loadAiSuggestionDetail,
  applyAiSuggestionStatus,
  activateModule,
  openNoteById,
  setStatus
}));
$("settingsCopyFeedbackDiagnostics")?.addEventListener("click", async () => {
  try {
    await copyTextToClipboard(buildFeedbackDiagnosticText());
    setStatus("已复制问题信息", "ok");
  } catch (error) {
    setStatus(`复制问题信息失败：${String(error?.message || error)}`, "bad");
  }
});

$("settingsOpenBugReport")?.addEventListener("click", async () => {
  if (!FEEDBACK_REPOSITORY_READY) {
    setStatus("反馈仓库还没绑定，先把 FEEDBACK_REPOSITORY 改成真实 owner/repo", "warn");
    return;
  }
  if (await openFeedbackUrl(buildFeedbackUrl("bug"))) {
    setStatus("已打开问题反馈入口", "ok");
    return;
  }
  setStatus("没有成功打开反馈入口，请检查浏览器是否拦截了新窗口", "warn");
});

$("settingsOpenFeatureRequest")?.addEventListener("click", async () => {
  if (!FEEDBACK_REPOSITORY_READY) {
    setStatus("反馈仓库还没绑定，先把 FEEDBACK_REPOSITORY 改成真实 owner/repo", "warn");
    return;
  }
  if (await openFeedbackUrl(buildFeedbackUrl("feature"))) {
    setStatus("已打开功能建议入口", "ok");
    return;
  }
  setStatus("没有成功打开建议入口，请检查浏览器是否拦截了新窗口", "warn");
});

window.addEventListener("beforeunload", (event) => {
  if (!editor.hasDirtyTabs()) return;
  event.preventDefault();
  event.returnValue = "";
});

installWritingPanelBasketEventHandlers({
  $,
  depsProvider: () => ({
    state,
    writingState,
    writingNoteEligibility,
    continueWritingEntry,
    normalizeWritingProjectTitleSeed: computeNormalizeWritingProjectTitleSeed,
    writingCandidateNotes,
    uniqueStrings,
    planWritingCandidateFocus,
    writingKnownNoteById,
    isWritingEligibleNote,
    suggestedWritingProjectTitle,
    describeWritingBatchAppendStatus,
    resetWritingStrongModelState,
    clearWritingBasket,
    clearWritingSourceIndexIds,
    resetWritingProjectContext,
    renderWritingPanel,
    showWritingResult,
    handleWritingBasketManualInput,
    prepareWritingStrongModelAnalysis,
    writingBasketEntries,
    deriveWritingLocalBookIdeas,
    currentWritingBookStructure,
    normalizeWritingBookStructure,
    updateWritingProjectBookStructure,
    writingNoteById,
    removeWritingBasketId,
    openNoteById,
    setStatus
  })
});

installWritingThemeIndexEventHandlers({
  $,
  depsProvider: () => ({
    loadWritingThemeIndexes,
    saveWritingBasketAsThemeIndex,
    selectWritingThemeIndex,
    writingThemeIndexContinuationRoute,
    continueWritingProjectEntry,
    useThemeIndexAsWritingEntry,
    setStatus
  })
});

installWritingThemeDetailEventHandlers({
  $,
  depsProvider: () => ({
    saveSelectedThemeIndexDetail,
    useThemeIndexAsWritingEntry,
    continueWritingProjectEntry,
    writingThemeIndexById,
    fetchIndexCard,
    findExistingWritingProjectForTheme,
    writingThemeIndexNoteIds,
    createWritingProjectFromThemeIndex,
    syncSelectedThemeIndexWithBasket,
    activateModule,
    openNoteById,
    removeNoteFromSelectedThemeIndex,
    setStatus
  })
});

installWritingProjectListEventHandlers({
  $,
  depsProvider: () => ({
    writingState,
    continueWritingProjectEntry,
    openWritingProject,
    copyWritingScaffold,
    exportWritingScaffold,
    setStatus
  })
});

installWritingProjectHistoryEventHandlers({
  $,
  depsProvider: () => ({
    state,
    writingState,
    openScaffoldVersion,
    copyWritingScaffold,
    exportWritingScaffold,
    promptVersionNoteEdit,
    updateDraftScaffoldVersionNote,
    updateDraftNoteVersionNote,
    setWritingCurrentDraftNote,
    loadWritingProjectsList,
    loadWritingDraftVersions,
    loadWritingScaffoldVersions,
    renderWritingPanel,
    writingNoteById,
    fetchNote,
    mapNoteItem,
    activateModule,
    openNoteById,
    syncWritingProjectFiltersFromUi,
    setStatus
  })
});

installWritingDraftActionEventHandlers({
  $,
  depsProvider: () => ({
    $,
    state,
    writingState,
    createWritingProjectFromCurrentBasket,
    describeWritingProjectPreflight,
    currentWritingContinuationEntry,
    continueWritingProjectEntry,
    writingCenterContinuationStatusMessage,
    writingCenterContinuationFailureMessage,
    writingScaffoldPreflightWarning,
    createDraftScaffold,
    currentWritingVersionNote,
    showWritingResult,
    loadWritingProjectsList,
    loadWritingScaffoldVersions,
    loadWritingDraftVersions,
    renderWritingPanel,
    copyWritingScaffold,
    exportWritingScaffold,
    writingDraftDirectoryId,
    writingDraftBody,
    createNote,
    bindWritingDraftNote,
    mapNoteItem,
    openWritingDraftNoteById,
    setStatus
  })
});

$("graphRefresh")?.addEventListener("click", async () => {
  const refreshed = await refreshDirectoryGraph();
  setStatus(
    refreshed ? "永久笔记关系图谱已刷新" : `图谱刷新失败：${graphState.error || "请重试"}`,
    refreshed ? "ok" : "warn"
  );
});

$("graphBackToDirectory")?.addEventListener("click", () => {
  state.selectedFileId = null;
  explorer?.restoreAutoCollapsedDisconnectedGroups?.();
  renderAll();
  setStatus("已返回目录关系视图", "ok");
});

$("graphSeedYijing")?.addEventListener("click", async () => {
  await importYijingKnowledgeNetworkDemo();
});

$("graphSeedYijingRich")?.addEventListener("click", async () => {
  await importYijingRichAcceptanceDemo();
});

bindAiInboxWorkspaceEvents($("aiInboxPanel"), createAiInboxWorkspaceHostDeps({
  aiInboxState,
  openAiInboxModule,
  applyAiInboxFiltersFromUi,
  loadAiInboxDetail,
  openAiInboxNote,
  recordAiInboxReviewDecision,
  acceptAiInboxLinkSuggestion,
  promoteAiInboxArtifactToNote,
  adoptAiInboxFieldSuggestionDraft,
  applyAiInboxSuggestionStatus,
  runAiInboxSummary,
  applyAiInboxRecommendedAction,
  setStatus
}));
bindGraphCanvasEvents($("graphCanvas"), {
  appState: state,
  graphState,
  graphViewportDragState,
  graphUtilityDrawerDragState,
  aiInboxState,
  systemMessages,
  normalizeAiInboxFilters,
  setSelectedSystemMessageId: (messageId) => {
    selectedSystemMessageId = String(messageId || "").trim();
  },
  openSystemMessages,
  refreshDirectoryGraph,
  resetGraphHoverState,
  applyGraphThinkingHoverState,
  applyGraphNodeHoverState,
  applyGraphEdgeHoverState,
  beginGraphUtilityDrawerDrag,
  beginGraphViewportDrag,
  updateGraphUtilityDrawerDrag,
  updateGraphViewportDrag,
  endGraphUtilityDrawerDrag,
  endGraphViewportDrag,
  renderGraphPanel,
  setStatus,
  moveGraphIsolatedWorkflowTab,
  activateGraphIsolatedWorkflowTab,
  pickGraphManualRelationTarget,
  saveGraphIsolatedRelationForm,
  graphWorkbenchTabMeta,
  applyGraphWorkbenchEntryInteraction,
  applyGraphWorkbenchTabInteraction,
  applyGraphWorkbenchCloseInteraction,
  applyGraphEmptyCloseInteraction,
  applyGraphUtilityDrawerCloseInteraction,
  applyGraphUtilityDrawerOpenState,
  applyGraphSectionOpenState,
  runGraphAiAnalysis,
  captureGraphIsolatedRelationDraftFromForm,
  runGraphAiConnectForNote,
  openGraphRelationFormInSelection,
  graphRelationWorkflowController,
  saveGraphAiCandidateRelation,
  confirmGraphPotentialRelationRefine,
  retryGraphPotentialRelationRefine,
  saveGraphCandidateRelation,
  previewGraphCandidateInOverlay,
  clearGraphCandidatePreviewInOverlay,
  saveGraphIsolatedDecision,
  createGraphThemeIndexFromButton,
  openGraphIsolatedDecisionAction,
  focusGraphRelationAdjustmentInPlace,
  openGraphFollowupNote,
  openGraphSelection,
  openGraphNodeSelectionFromElement,
  openNoteById,
  syncGraphIsolatedAiCandidateForm,
  graphIsolatedFormError,
  applyGraphRelationTypeFilterInteraction,
  setGraphRelationTypeFilter,
  graphRelationTypeLabel,
  markGraphIsolatedRationaleUserEdited,
  filterGraphManualRelationTargets,
  applyGraphViewModeInteraction,
  graphReadingModeMeta,
  applyGraphWheelZoomInteraction,
  graphZoomOption,
  graphZoomStep,
  applyGraphThinkingToggleInteraction,
  applyGraphThinkingHideInteraction,
  applyGraphUtilityVisibilityInteraction,
  applyGraphThinkingVisibilityInteraction,
  applyGraphThinkingFilterInteraction,
  graphThinkingFilterMeta,
  applyGraphZoomOptionInteraction,
  applyGraphZoomStepInteraction,
  applyGraphReadingLensInteraction,
  graphReadingLensMeta,
  applyGraphFocusDepthInteraction,
  setGraphFocusDepth,
  graphFocusDepthMeta,
  graphFocusContextCollapsedState,
  graphFocusContextCollapsedStatus,
  graphFocusHelpOpenState,
  graphFocusHelpStatus,
  applyGraphFocusContextModeInteraction,
  setGraphFocusContextMode,
  graphFocusContextModeMeta,
  centerGraphViewportIfZoomed,
  requestAnimationFrame: window.requestAnimationFrame.bind(window)
});
document.querySelectorAll(".rail-btn[data-module]").forEach((btn) => {
  btn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const targetModule = btn.dataset.module;
    if (targetModule === "graph") graphModuleActivationGuardUntil = Date.now() + 1800;
    activateModule(targetModule);
    if (targetModule === "graph" && state.module === "graph") {
      await previewOllamaLocalAiBootstrapFromUi(localAiPreviewOptionsForAction("graph_module_open"));
      await refreshDirectoryGraph();
      if (state.module !== "graph" && Date.now() < graphModuleActivationGuardUntil) {
        activateModule("graph");
      }
      if (state.module === "graph") setStatus("已打开永久笔记关系图谱", "ok");
	    }
	    if (targetModule === "aiInbox" && state.module === "aiInbox") {
	      await openAiInboxModule();
	      if (state.module === "aiInbox") setStatus("已打开 AI 建议复核", "ok");
	    }
	    if (targetModule === "settings" && state.module === "settings") {
	      try {
	        await refreshVaultSettings();
	        if (state.module === "settings") setStatus("已打开设置", "ok");
	      } catch (error) {
	        if (state.module === "settings") setStatus(`设置加载失败：${String(error?.message || error)}`, "warn");
	      }
	    }
	    if (targetModule === "writing" && state.module === "writing") {
	      await openWritingModule();
	    }
	    if (targetModule === "distillation" && state.module === "distillation") {
	      await openDistillationModule();
	    }
	  });
	});

installSystemMessageEventHandlers({
  $,
  depsProvider: systemMessageEventDeps
});

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

installSidebarFlowEventHandler({
  $,
  depsProvider: () => ({
    state,
    activateModule,
    openDistillationModule,
    openWritingModule,
    handleStateChange
  })
});

$("btnMobileNewNote")?.addEventListener("click", () => {
  const folderId = resolveExplorerNewNoteFolderId(state);
  if (folderById(state, folderId)) {
    state.selectedFolderId = folderId;
    state.browserRootId = rootBoxIdFromFolder(state, folderId);
    state.selectedFileId = null;
  }
  handleStateChange("create-note-in-selected-folder");
});

document.querySelectorAll("[data-action^='quick-']").forEach((btn) => {
  btn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const action = btn.dataset.action;
    if (action === "quick-original" && Date.now() < graphModuleActivationGuardUntil) {
      setStatus("已停留在关系图谱", "ok");
      return;
    }
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    if (activeTab?.dirty) {
      editor.updateActiveTabFromEditor();
      void editor.autoSaveTabById(activeTab.id, "switch-root");
    }
    if (action === "quick-fleeting") {
      state.browserRootId = "dir_fleeting_default";
      state.selectedFolderId = "dir_fleeting_default";
    }
    if (action === "quick-literature") {
      state.browserRootId = "dir_literature_default";
      state.selectedFolderId = "dir_literature_default";
    }
    if (action === "quick-original") {
      state.browserRootId = "dir_original_default";
      state.selectedFolderId = "dir_original_default";
    }
    state.module = "explorer";
    state.selectedFileId = null;
    await syncNotesForDirectoryTree(state.browserRootId);
    syncRailSelectionState();
    setStatus(`已切换到 ${displayFolderName(folderById(state, state.browserRootId))} 入口`, "ok");
    renderAll();
    });
  });

document.querySelectorAll("[data-action='open-handoff']").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = `${window.location.origin}/app/handoff`;
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("已打开工作台交付板", "ok");
  });
});

document.addEventListener("keydown", (e) => {
  if (handleSystemMessageEscapeKey(e, systemMessageEventDeps()).handled) return;

  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable || e.isComposing) return;

  if (e.key === "F2") {
    if (state.selectedFileId) {
      explorer.handleContextAction("rename", { kind: "file", id: state.selectedFileId });
      renderAll();
      e.preventDefault();
      return;
    }
    if (state.selectedFolderId) {
      explorer.handleContextAction("rename", { kind: "folder", id: state.selectedFolderId });
      renderAll();
      e.preventDefault();
      return;
    }
  }

  if (e.key === "Delete" && !e.ctrlKey && !e.altKey && !e.metaKey && state.module === "explorer") {
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
    const route = noteDeleteKeyRoute({
      module: state.module,
      selectedFileId: state.selectedFileId,
      activeTabNoteId: activeTab?.noteId
    });
    const noteId = route.handled ? route.noteId : "";
    if (noteId && state.notes.some((note) => note.id === noteId)) {
      void explorer.handleContextAction("delete", { kind: "file", id: noteId });
      e.preventDefault();
      return;
    }
  }

  if (e.ctrlKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
    if (idx >= 0 && state.tabs.length > 1) {
      const next = e.key === "ArrowLeft" ? (idx - 1 + state.tabs.length) % state.tabs.length : (idx + 1) % state.tabs.length;
      state.activeTabId = state.tabs[next].id;
      editor.fillEditorFromTab();
      syncExplorerContextToActiveTab();
      renderAll();
      e.preventDefault();
    }
    return;
  }

  if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    if (e.key === "ArrowLeft") {
      const cur = folderById(state, state.selectedFolderId);
      if (cur?.parentId) {
        state.selectedFolderId = cur.parentId;
        setStatus("已定位到上级目录", "ok");
      } else {
        setStatus("当前已在顶层目录", "warn");
      }
    } else {
      const children = childFolders(state, state.selectedFolderId);
      if (children.length) {
        state.selectedFolderId = children[0].id;
        setStatus("已进入子目录", "ok");
      } else {
        const files = notesInFolder(state, state.selectedFolderId);
        if (files.length) {
          openNoteById(files[0].id);
          setStatus("已打开当前目录首个文件", "ok");
        } else {
          setStatus("当前目录无文件", "warn");
        }
      }
    }
    renderAll();
    e.preventDefault();
  }
});

function appStartupDeps() {
  return {
    $,
    state,
    importState,
    desktopCommands,
    windowRef: typeof window !== "undefined" ? window : undefined,
    setUsingLocalFallbackData: (value) => { usingLocalFallbackData = value === true; },
    getUsingLocalFallbackData: () => usingLocalFallbackData,
    getStartupAutoOpenSuppressed: () => startupAutoOpenSuppressed,
    renderImportPageShell,
    createImportToolbarActions,
    currentImportToolbarValues,
    activeImportPreviewContext,
    selectionSummary,
    rootBoxIdFromFolder,
    previewImport,
    confirmImport,
    defaultSelectedCandidateIds,
    setImportRecordId,
    showImportResult,
    syncImportSelection,
    confirmedImportTargetDirectoryId,
    preferredImportDirectoryId,
    folderById,
    syncNotesForDirectory,
    refreshImportedNotesView,
    renderImportToolbar,
    normalizeImportWorkspaceTab,
    setImportWorkspaceTab,
    hideImportOperationResultModal,
    openImportedLiteratureQueue,
    addImportedPermanentNotesToWritingBasket,
    createWritingProjectFromImportedPermanentNotes,
    setImportResultFocus,
    applyCandidateSelection,
    rerenderImportResult,
    directoryPathLabel,
    updateExportTargetHint,
    exportMarkdown,
    showExportResult,
    refreshVaultSettings,
    syncDirectoriesFromApi,
    syncNotesForDirectoryTree,
    getApiBase,
    renderAll,
    importSmartNotesProductThinkingDemo,
    importYijingKnowledgeNetworkDemo,
    importYijingRichAcceptanceDemo,
    preferredLocalFallbackNote,
    openNoteById,
    openStartupUntitledNote,
    updateController,
    setStatus
  };
}

async function bootstrap() {
  return bootstrapAppForRuntime(appStartupDeps());
}

bootstrap();

