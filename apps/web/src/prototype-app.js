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
  renderImportResultMount
} from "./import-result-mount.js";
import {
  syncRailSelectionDom
} from "./app-shell-rail.js";
import {
  editorSelectionAiActionElements
} from "./app-shell-editor-elements.js";
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
  buildAppShellStateChangeDeps
} from "./app-shell-state-change-deps.js";
import {
  handleCreateDirectoryFromDialog
} from "./app-shell-state-file-actions.js";
import {
  routeAppShellStateChange
} from "./app-shell-state-change-router.js";
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
  relationNetworkWorkflowMessageForNote as computeRelationNetworkWorkflowMessageForNote,
  saveAiSuggestionKey,
  sourcePromotionWorkflowMessageForNote as computeSourcePromotionWorkflowMessageForNote,
  sourceNoteTypeLabel,
  workflowMessageDedupeKey,
  writingProjectStatusLabel
} from "./prototype-note-state-helpers.js";
import { basenameLocalPath, dirnameLocalPath, joinLocalPath } from "./desktop-file-adapter.js";
import {
  aiInboxFeedbackFromWorkspace,
  aiInboxFiltersFromWorkspace,
  bindAiInboxWorkspaceEvents,
  renderAiInboxWorkspaceView
} from "./ai-inbox-workspace.js";
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
  systemMessageActionRoute,
  systemMessageSubjectText,
  upsertSystemMessageList,
  writingAnalysisSystemMessageDeliveryOptions,
  writingAnalysisSystemMessageForResult
} from "./prototype-system-messages.js";
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
  handleMarkSystemMessagesRead,
  handleOpenAllAiInboxFromSystemMessages,
  handleSystemMessageEscapeKey,
  handleSystemMessageModalClick,
  handleSystemMessagesButtonClick
} from "./system-message-events.js";
import {
  buildSystemMessageEventDeps,
  buildSystemMessagesRuntimeDeps,
  createSystemMessageStateAccessors
} from "./system-message-deps.js";
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
  graphRelationWorkspaceRouteForFollowup,
  graphSelectEdgeActionAttrs as computeGraphSelectEdgeActionAttrs,
  graphWritingCandidateNoteIds,
  graphWritingContinuationFailureMessage,
  graphWritingContinuationInput,
  graphWritingContinuationStatusMessage,
  graphWritingFollowupEntryPlan
} from "./graph-followup.js";
import {
  graphFollowupOpenedNoteStatus
} from "./graph-followup-status-messages.js";
import {
  clearGraphIsolatedRelationDraftForState
} from "./graph-relation-drafts.js";
import {
  createGraphIsolatedRelationController
} from "./graph-isolated-relation-controller.js";
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
  renderGraphSelectionPanelViaDispatcher
} from "./graph-selection-dispatcher.js";
import {
  renderGraphClusterSelectionPanelView
} from "./graph-cluster-selection-panel.js";
import {
  buildGraphEdgeSelectionRuntimeDeps,
  buildGraphNodeSelectionRuntimeDeps,
  buildGraphSelectionDispatcherDeps
} from "./graph-selection-runtime-deps.js";
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
  renderGraphNodeSelectionPanel as renderGraphNodeSelectionPanelView
} from "./graph-node-selection-panel.js";
import {
  renderGraphEdgeSelectionPanel as renderGraphEdgeSelectionPanelView
} from "./graph-edge-selection-panel.js";
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
  graphEdgeSelectionKey,
  graphRelationGroupMeta,
  graphRelationVisual
} from "./graph-relation-visual-state.js";
import {
  graphBridgeSelectionKey,
  graphIsolatedSelectionKey,
  graphNodeClass,
  graphThemeNoteIds,
  graphThemeSelectionKey
} from "./graph-visual-selection-state.js";
import {
  renderDraftVersionCardView,
  renderScaffoldVersionCardView,
  renderWritingToplineMetricView
} from "./writing-workspace-view.js";
import {
  createWritingPanelShellController
} from "./writing-panel-shell.js";
import {
  createWritingPanelPrototypeHostProvider
} from "./writing-panel-host-deps.js";
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
  isPersistableRelationNetworkStatus,
  notePersistenceFieldsForSave,
  relationNetworkStatusForNotePolicy,
  resolveFolderRootNoteType
} from "./note-persistence-policy.js";
import {
  describeWritingContinuationAction,
  describeWritingStrongModelStatus,
  describeWritingBatchAppendStatus,
  planWritingCandidateFocus,
  describeWritingThemeProjectEntryState,
  describeWritingProjectPreflight,
  planWritingBasketEntry,
  planImportedPermanentNotesWritingEntry,
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
  describeProjectPreflight
} from "./writing-readiness.js";
import {
  deriveWritingBookDesign as computeDeriveWritingBookDesign,
  deriveWritingLocalBookIdeas as computeDeriveWritingLocalBookIdeas,
  currentWritingBookStructureForRuntime as computeCurrentWritingBookStructureForRuntime,
  normalizeWritingBookStructure as computeNormalizeWritingBookStructure,
  normalizeWritingProjectTitleSeed as computeNormalizeWritingProjectTitleSeed,
  resetWritingLocalBookIdeasState as resetWritingLocalBookIdeasForRuntime,
  suggestedThemeIndexTitle as computeSuggestedThemeIndexTitle,
  suggestedWritingProjectTitle as computeSuggestedWritingProjectTitle,
  syncWritingLocalBookIdeasFromProjectState as syncWritingLocalBookIdeasFromProjectForRuntime,
  uniqueWritingBookPoolItems as computeUniqueWritingBookPoolItems,
  writingBookMatchesAny as computeWritingBookMatchesAny,
  writingBookPlainText as computeWritingBookPlainText,
  writingBookProjectAudienceForRuntime as computeWritingBookProjectAudienceForRuntime,
  writingBookProjectGoalForRuntime as computeWritingBookProjectGoalForRuntime,
  writingBookProjectTitleForRuntime as computeWritingBookProjectTitleForRuntime,
  writingBookSectionFromNote as computeWritingBookSectionFromNote,
  writingBookShortText as computeWritingBookShortText,
  writingBookStructureStats as computeWritingBookStructureStats,
  writingSourceIndexSummary as computeWritingSourceIndexSummary,
  writingThemeLabels as computeWritingThemeLabels,
  writingThemeSummary as computeWritingThemeSummary
} from "./prototype-writing-workspace.js";
import {
  scheduledTaskFormDefaults,
  scheduledTaskFromCanonical,
  scheduledTaskFormFromTask,
  scheduledTaskPayloadFromForm,
  normalizeScheduledTaskFilters
} from "./scheduled-tasks-model.js";
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
  aiTestBlockedReasonForState,
  currentOllamaModelTiersForState,
  installedLocalModelReadyForState
} from "./ai-test-readiness.js";
import {
  localAiPreviewOptionsForAction,
  ollamaStopRuntimeUiOutcome
} from "./ai-local-runtime-ui-model.js";
import {
  AI_LOCAL_MODEL_TIERS,
  AI_REMOTE_MODEL_TIERS,
  OLLAMA_CHAT_ENDPOINT_URL,
  OLLAMA_HEALTH_ENDPOINT_URL,
  OLLAMA_RECOMMENDED_MODEL,
  aiDefaultsForRuntimeMode,
  aiFallbackPolicyForRuntimeMode,
  aiPrivacyPolicyForRuntimeMode,
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
const GENERATED_ORIGINAL_MARKER_PATTERN = /<!--\s*yansilu:generated-original=([^\s>]+)\s*-->/i;
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
  renderSystemMessages,
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

function generatedOriginalNoteIdFromBody(body = "") {
  const match = String(body || "").match(GENERATED_ORIGINAL_MARKER_PATTERN);
  return String(match?.[1] || "").trim();
}

function stripGeneratedOriginalMarker(body = "") {
  return String(body || "")
    .replace(/\n?<!--\s*yansilu:generated-original=[^\s>]+\s*-->\s*\n?/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function withGeneratedOriginalMarker(body = "", originalNoteId = "") {
  const cleanId = String(originalNoteId || "").trim();
  const base = stripGeneratedOriginalMarker(body);
  if (!cleanId) return base;
  const separator = base.trim() ? "\n\n" : "";
  return `${base}${separator}<!-- yansilu:generated-original=${cleanId} -->`;
}

function withGeneratedOriginalReference(body = "", originalTitle = "") {
  const cleanTitle = String(originalTitle || "").trim();
  const base = stripGeneratedOriginalMarker(body);
  if (!cleanTitle) return base;
  const visibleLink = `[[${cleanTitle}]]`;
  const visibleLine = `关联永久笔记：${visibleLink}`;
  if (base.includes(visibleLine)) return base;
  const separator = base.trim() ? "\n\n" : "";
  return `${base}${separator}${visibleLine}`;
}

function noteGeneratedOriginalNoteId(note = null) {
  return String(
    note?.generatedOriginalNoteId ||
      note?.generated_original_note_id ||
      generatedOriginalNoteIdFromBody(note?.body || "")
  ).trim();
}

function noteHasGeneratedOriginal(note = null) {
  return Boolean(noteGeneratedOriginalNoteId(note));
}

function relationNetworkStatusForNote(note = null, options = {}) {
  const noteType = resolveFolderRootNoteType(note, { typeFromFolder: (folderId) => typeFromFolder(state, folderId) });
  const connectedIds = options.connectedIds instanceof Set
    ? options.connectedIds
    : state.graphConnectedNoteIds instanceof Set
      ? state.graphConnectedNoteIds
      : null;
  const connectivityReady = options.connectivityReady === undefined ? state.graphConnectivityReady === true : options.connectivityReady === true;
  return relationNetworkStatusForNotePolicy({
    note,
    noteType,
    connectedIds,
    connectivityReady,
    storedStatus: readStoredRelationNetworkStatus(note?.id)
  });
}

function syncNoteRelationNetworkStatus(note = null, options = {}) {
  if (!note || typeof note !== "object") return "";
  const nextStatus = relationNetworkStatusForNote(note, options);
  note.relationNetworkStatus = nextStatus;
  const noteType = resolveFolderRootNoteType(note, { typeFromFolder: (folderId) => typeFromFolder(state, folderId) });
  if (noteType === "permanent" || noteType === "original") {
    if (isPersistableRelationNetworkStatus(nextStatus)) writeStoredRelationNetworkStatus(note.id, nextStatus);
  }
  else writeStoredRelationNetworkStatus(note.id, "");
  return nextStatus;
}

function syncAllNoteRelationNetworkStatuses(options = {}) {
  for (const note of state.notes) syncNoteRelationNetworkStatus(note, options);
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

const systemMessageStateAccessors = createSystemMessageStateAccessors({
  getMessagesRef: () => systemMessages,
  setMessagesRef: (messages = []) => {
    systemMessages = messages;
  },
  getSelectedMessageIdRef: () => selectedSystemMessageId,
  setSelectedMessageIdRef: (messageId = "") => {
    selectedSystemMessageId = messageId;
  }
});

function systemMessageEventDeps() {
  return buildSystemMessageEventDeps({
    stateAccessors: systemMessageStateAccessors,
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
    setStatus
  });
}

function systemMessagesRuntimeDeps() {
  return buildSystemMessagesRuntimeDeps({
    stateAccessors: systemMessageStateAccessors,
    normalizeSystemMessage,
    upsertSystemMessageList,
    limit: SYSTEM_MESSAGES_LIMIT,
    persistSystemMessages,
    renderSystemMessages,
    openSystemMessages
  });
}

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
  const scope = noteTemplateStorageScope();
  for (const kind of ["permanent", "literature"]) {
    const entry = settingsState.noteTemplates[kind];
    const previousScope = String(entry?.scope || "");
    const savedTextBeforeLoad = normalizeStoredNoteTemplateSource(entry?.text, kind);
    const rawDraftTextBeforeLoad = normalizeDraftBuffer(entry?.draftText || "");
    const draftTextBeforeLoad = rawDraftTextBeforeLoad.trim()
      ? normalizeStoredNoteTemplateSource(rawDraftTextBeforeLoad, kind)
      : rawDraftTextBeforeLoad;
    const hasUnsavedDraft =
      previousScope === scope &&
      entry?.draftActive === true &&
      draftTextBeforeLoad !== normalizeDraftBuffer(savedTextBeforeLoad);
    const scopedKey = noteTemplateStorageKey(kind);
    const scopedHistoryKey = noteTemplateStorageKey(kind, { suffix: "history" });
    const legacyKey = NOTE_TEMPLATE_STORAGE_KEYS[kind];
    const legacyHistoryKey = `${legacyKey}:history`;
    const scopedText = readStoredText(scopedKey, "");
    const legacyText = readStoredText(legacyKey, "");
    const scopedHistory = readStoredText(scopedHistoryKey, "");
    const legacyHistory = readStoredText(legacyHistoryKey, "");
    const shouldMigrateLegacy = scope !== "global" && !String(scopedText || "").trim() && String(legacyText || "").trim();
    const resolvedText = shouldMigrateLegacy ? legacyText : scopedText || (scope === "global" ? legacyText : "");
    const resolvedHistory = shouldMigrateLegacy ? legacyHistory : scopedHistory || (scope === "global" ? legacyHistory : "");
    const normalizedText = normalizeStoredNoteTemplateSource(resolvedText, kind);
    settingsState.noteTemplates[kind].text = normalizedText;
    settingsState.noteTemplates[kind].scope = scope;
    if (!hasUnsavedDraft) {
      settingsState.noteTemplates[kind].draftText = normalizedText;
      settingsState.noteTemplates[kind].draftActive = false;
    }
    let parsedHistory = [];
    try {
      parsedHistory = resolvedHistory ? JSON.parse(resolvedHistory) : [];
    } catch {}
    settingsState.noteTemplates[kind].history = normalizeNoteTemplateHistory(parsedHistory, kind);
    if (shouldMigrateLegacy) {
      writeStoredText(scopedKey, normalizedText);
      writeStoredText(scopedHistoryKey, JSON.stringify(settingsState.noteTemplates[kind].history));
    }
  }
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
  return /^(local_private_gateway|ollama_local_gateway|minicpm_local_gateway):/i.test(String(value || "").trim());
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

function aiSettingsPayload() {
  const selection = canonicalizeAiSettingsSelection({
    runtimeMode: settingsState.ai.runtimeMode,
    modelPack: settingsState.ai.modelPack,
    userMode: settingsState.ai.userMode,
    providerPreset: localProviderPresetForModelPack(settingsState.ai.modelPack)
  });
  const localProviderPreset = preferredLocalProviderPresetForSelection();
  const providerPreset = providerPresetForModelPack(selection.modelPack);
  const draftTouched = settingsState.ai.providerDraftTouched || {};
  const endpointUrl = String(settingsState.ai.providerEndpointUrl || "").trim();
  const secretRef = String(settingsState.ai.secretRef || "").trim();
  const remoteRuntimeModelMap = runtimeModelMapForRemoteModel(providerPreset, settingsState.ai.remoteRuntimeModel);
  const shouldSendEndpointUrl = draftTouched.providerEndpointUrl || Boolean(endpointUrl);
  const shouldSendRemoteRuntimeMap = draftTouched.remoteRuntimeModel || Boolean(Object.keys(remoteRuntimeModelMap).length);
  const shouldSendSecretRef = draftTouched.secretRef || Boolean(secretRef);
  const localModelAllowed = ["local_only", "hybrid"].includes(selection.runtimeMode);
  const localModelReady = localModelAllowed && installedLocalModelReady(settingsState.ai.localModel);
  const advancedModelRef = String(settingsState.ai.advancedModelRef || "").trim();
  const advancedModelRefIsLocal = isLocalAdvancedModelRef(advancedModelRef);
  const modelRefAllowed = Boolean(advancedModelRef) && (
    advancedModelRefIsLocal
      ? localModelReady
      : selection.runtimeMode !== "local_only"
  );
  return {
    userMode: settingsState.ai.userMode,
    modelPack: selection.modelPack,
    ...(providerPreset ? { providerPreset } : {}),
    ...(shouldSendEndpointUrl ? { endpointUrl } : {}),
    ...(shouldSendRemoteRuntimeMap ? { runtimeModelMap: remoteRuntimeModelMap } : {}),
    privacy: aiPrivacyPolicyForRuntimeMode(selection.runtimeMode),
    fallbackPolicy: aiFallbackPolicyForRuntimeMode(selection.runtimeMode),
    advancedSettings: {
      runtimeMode: selection.runtimeMode,
      ...(localModelReady ? { localModel: settingsState.ai.localModel } : {}),
      ...(localModelReady ? { localProviderPreset } : {}),
      ...(modelRefAllowed ? { modelRef: advancedModelRef } : {}),
      ...(shouldSendSecretRef ? { secretRef } : {})
    }
  };
}

function aiProviderConfigPayload(options = {}) {
  const providerId = String(options.providerId || currentAiProviderId()).trim();
  const endpointUrl = String(options.endpointUrl || settingsState.ai.providerEndpointUrl || defaultProviderEndpointUrl(providerId) || "").trim();
  const healthEndpointUrl = String(
    options.healthEndpointUrl || settingsState.ai.providerHealthEndpointUrl || defaultProviderHealthEndpointUrl(providerId, endpointUrl) || ""
  ).trim();
  const secretRef = String(options.secretRef || settingsState.ai.secretRef || "").trim();
  const localModel = String(options.localModel || settingsState.ai.localModel || "").trim();
  const remoteRuntimeModel = String(options.remoteRuntimeModel || settingsState.ai.remoteRuntimeModel || "").trim();
  const localProviderConfig = Boolean(localModel) && ["local_private_gateway", "ollama_local_gateway", "minicpm_local_gateway"].includes(providerId);
  const remoteConfigurableProvider = isRemoteConfigurableProviderId(providerId);
  const remoteRuntimeModelMap = runtimeModelMapForRemoteModel(providerId, remoteRuntimeModel);
  const authMode = options.authMode || authModeForProvider(providerId, settingsState.ai.routePreview);
  const secretReady = !providerAuthModeRequiresSecret(authMode) || Boolean(secretRef);
  const configRunnable = remoteConfigurableProvider
    ? Boolean(endpointUrl && remoteRuntimeModel && secretReady)
    : Boolean(endpointUrl);
  return {
    providerId,
    authMode,
    status: configRunnable ? "enabled" : "disabled",
    secretRef,
    endpointUrl,
    ...(localProviderConfig
      ? {
          runtimeModelMap: Object.fromEntries(AI_LOCAL_MODEL_TIERS.map((tier) => [`${providerId}:${tier}`, localModel]))
        }
      : {}),
    ...(!localProviderConfig && remoteConfigurableProvider
      ? {
          runtimeModelMap: remoteRuntimeModelMap
        }
      : {}),
    ...(healthEndpointUrl
      ? {
          healthCheck: {
            enabled: true,
            endpointUrl: healthEndpointUrl,
            method: "GET",
            timeoutMs: 5000,
            expectedStatus: 200,
            intervalSeconds: 300
          }
        }
      : {
          healthCheck: {
            enabled: false,
            endpointUrl: "",
            method: "GET",
            timeoutMs: 5000,
            expectedStatus: 200,
            intervalSeconds: 300
          }
        })
  };
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
  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  if (!["local_only", "hybrid"].includes(runtimeMode) || !shouldUseOllamaLocalRuntime()) return null;
  const model = String(options.model || primaryRecommendedOllamaModelName() || OLLAMA_RECOMMENDED_MODEL).trim();
  settingsState.ai.localRuntimeChecking = true;
  settingsState.ai.localRuntimeError = "";
  if (options.render !== false) renderSettingsPanel();
  try {
    const result = await fetchOllamaBootstrapStatus({ model, runtimeMode });
    applyOllamaBootstrapResult(result);
    if (result?.ready !== true) {
      settingsState.ai.localRuntimeError = ollamaBootstrapStatusText(result);
      if (!installedLocalModelReady()) clearLocalOllamaSelectionState();
    }
    if (options.silent !== true) {
      setStatus(ollamaBootstrapStatusText(result), result?.ready === true ? "ok" : "warn");
    }
    return result;
  } catch (error) {
    settingsState.ai.localRuntimeError = String(error?.message || error);
    if (options.silent !== true) setStatus(`本地 AI 检查失败：${settingsState.ai.localRuntimeError}`, "warn");
    return null;
  } finally {
    settingsState.ai.localRuntimeChecking = false;
    if (options.render !== false) renderSettingsPanel();
  }
}

async function bootstrapOllamaLocalAiFromUi(options = {}) {
  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  if (!["local_only", "hybrid"].includes(runtimeMode) || !shouldUseOllamaLocalRuntime()) return null;
  const model = String(options.model || primaryRecommendedOllamaModelName() || OLLAMA_RECOMMENDED_MODEL).trim();
  settingsState.ai.localRuntimeChecking = true;
  settingsState.ai.localRuntimePulling = options.pullModel === false ? false : true;
  settingsState.ai.localRuntimeError = "";
  if (options.render !== false) renderSettingsPanel();
  if (options.silent !== true) setStatus(`正在准备本地 AI：${model}`, "warn");
  try {
    const result = await bootstrapOllamaLocalAi({
      model,
      runtimeMode,
      autoStart: options.autoStart !== false,
      pullModel: options.pullModel !== false,
      enableConfig: options.enableConfig !== false,
      healthCheck: options.healthCheck !== false
    });
    applyOllamaBootstrapResult(result);
    if (result?.ready === true) {
      await refreshAiRoutePreview({ render: false });
    } else {
      settingsState.ai.localRuntimeError = ollamaBootstrapStatusText(result);
      if (!installedLocalModelReady()) clearLocalOllamaSelectionState();
    }
    if (options.silent !== true) {
      setStatus(ollamaBootstrapStatusText(result), result?.ready === true ? "ok" : "warn");
    }
    return result;
  } catch (error) {
    settingsState.ai.localRuntimeError = String(error?.message || error);
    if (options.silent !== true) setStatus(`本地 AI 引导失败：${settingsState.ai.localRuntimeError}`, "warn");
    return null;
  } finally {
    settingsState.ai.localRuntimeChecking = false;
    settingsState.ai.localRuntimePulling = false;
    if (options.render !== false) renderSettingsPanel();
  }
}

async function persistOllamaRuntimeSelectionAfterPreview() {
  if (!localOllamaSetupActive() || String(settingsState.ai.localRuntimeStatus || "").trim() !== "available") return false;
  await syncAiSettingsToApi();
  if (installedLocalModelReady()) {
    await saveLocalOllamaProviderConfig();
    await refreshAiRoutePreview({ render: false });
  } else {
    clearLocalOllamaSelectionState();
  }
  return true;
}

async function detectOllamaModels(options = {}) {
  settingsState.ai.localRuntimeChecking = true;
  settingsState.ai.localRuntimeError = "";
  if (options.render !== false) renderSettingsPanel();
  try {
    const runtime = await fetchOllamaModels();
    const models = applyOllamaRuntimePreview(runtime);
    await persistOllamaRuntimeSelectionAfterPreview();
    if (options.silent !== true) {
      const count = models.length;
      if (settingsState.ai.localRuntimeStatus === "available") {
        setStatus(count ? `已检测到 ${count} 个本地模型。` : "本地 AI 可连接，但还没有本地模型。", count ? "ok" : "warn");
      } else {
        const message = settingsState.ai.localRuntimeError || "本地 AI 当前不可用。";
        setStatus(`未检测到本地 AI：${message}。请先下载安装并启动本地 AI。`, "warn");
      }
    }
    return runtime;
  } catch (error) {
    settingsState.ai.localRuntimeStatus = "unavailable";
    settingsState.ai.localRuntimeModels = [];
    settingsState.ai.localRuntimeReadinessStatus = "check_failed";
    settingsState.ai.localRuntimeApiReachable = false;
    settingsState.ai.localRuntimeDefaultModelInstalled = false;
    settingsState.ai.localRuntimeSetupGuide = null;
    settingsState.ai.localRuntimeChatEndpointUrl = "";
    settingsState.ai.localRuntimeHealthEndpointUrl = "";
    settingsState.ai.localRuntimeError = String(error?.message || error);
    if (options.silent !== true) setStatus(`本地 AI 检测失败：${settingsState.ai.localRuntimeError}。请先下载安装并启动本地 AI。`, "warn");
    return null;
  } finally {
    settingsState.ai.localRuntimeChecking = false;
    if (options.render !== false) renderSettingsPanel();
  }
}

async function startOllamaRuntimeFromUi() {
  settingsState.ai.localRuntimeStarting = true;
  settingsState.ai.localRuntimeError = "";
  renderSettingsPanel();
  setStatus("正在启动本地 AI...", "warn");
  try {
    const result = await startOllamaRuntime();
    const runtime = result?.runtime || await fetchOllamaModels();
    const models = applyOllamaRuntimePreview(runtime);
    await persistOllamaRuntimeSelectionAfterPreview();
    if (runtime?.status === "available") {
      setStatus(models.length ? `本地 AI 已启动，检测到 ${models.length} 个本地模型。` : "本地 AI 已启动，但还没有本地模型。", models.length ? "ok" : "warn");
    } else {
      settingsState.ai.localRuntimeError = String(runtime?.message || result?.message || "本地 AI 还没有响应。");
      setStatus(`已尝试启动本地 AI：${settingsState.ai.localRuntimeError}`, "warn");
    }
    return result;
  } catch (error) {
    settingsState.ai.localRuntimeStatus = "unavailable";
    settingsState.ai.localRuntimeModels = [];
    settingsState.ai.localRuntimeReadinessStatus = "check_failed";
    settingsState.ai.localRuntimeApiReachable = false;
    settingsState.ai.localRuntimeDefaultModelInstalled = false;
    settingsState.ai.localRuntimeError = String(error?.message || error);
    setStatus(`启动本地 AI 失败：${settingsState.ai.localRuntimeError}。如果还没安装，请先下载本地 AI 运行环境。`, "warn");
    return null;
  } finally {
    settingsState.ai.localRuntimeStarting = false;
    renderSettingsPanel();
  }
}

async function stopOllamaRuntimeFromUi() {
  const confirmed = typeof window === "undefined" || typeof window.confirm !== "function"
    ? true
    : window.confirm("停止本地 AI 会结束这台电脑上的本地模型服务，可能影响其他正在使用本地模型的软件。确定停止吗？");
  if (!confirmed) return null;
  settingsState.ai.localRuntimeStopping = true;
  settingsState.ai.localRuntimeError = "";
  renderSettingsPanel();
  setStatus("正在停止本地 AI...", "warn");
  try {
    const result = await stopOllamaRuntime();
    const runtime = result?.runtime || await fetchOllamaModels();
    const stopOutcome = ollamaStopRuntimeUiOutcome(result, runtime);
    applyOllamaRuntimePreview(runtime);
    settingsState.ai.localRuntimeManagedStopPending = stopOutcome.managedStopPending;
    if (stopOutcome.status === "manual_stop_required") {
      settingsState.ai.localRuntimeError = stopOutcome.error;
      setStatus(`需要手动管理本地 AI：${settingsState.ai.localRuntimeError}`, "warn");
    } else if (stopOutcome.status === "stopped") {
      settingsState.ai.localRuntimeModels = [];
      settingsState.ai.localRuntimeError = stopOutcome.error;
      setStatus("本地 AI 已停止。需要本地模型时可以再启动。", "ok");
    } else if (stopOutcome.status === "stopping") {
      settingsState.ai.localRuntimeError = stopOutcome.error;
      setStatus(`停止命令已发送，正在等待确认：${settingsState.ai.localRuntimeError}`, "warn");
    } else {
      settingsState.ai.localRuntimeError = stopOutcome.error;
      setStatus(`已发送停止命令，但本地 AI 仍可连接：${settingsState.ai.localRuntimeError}`, "warn");
    }
    return result;
  } catch (error) {
    settingsState.ai.localRuntimeError = String(error?.message || error);
    setStatus(`停止本地 AI 失败：${settingsState.ai.localRuntimeError}`, "warn");
    return null;
  } finally {
    settingsState.ai.localRuntimeStopping = false;
    renderSettingsPanel();
  }
}

async function pullRecommendedOllamaModel(modelName = "") {
  const requestedModel = String(modelName || "").trim();
  const modelNameToPull = requestedModel || ollamaPullModelName();
  const recommendation = ollamaRecommendationForModel(modelNameToPull, currentOllamaModelTiers());
  const command = recommendation?.downloadCommand || `ollama pull ${modelNameToPull}`;
  const confirmed = typeof window === "undefined" || typeof window.confirm !== "function"
    ? true
    : window.confirm(`下载 ${modelNameToPull} 会获取大模型文件，可能需要较长时间和数 GB 磁盘空间。\n\n命令：${command}\n\n确认开始下载吗？`);
  if (!confirmed) return null;
  settingsState.ai.localRuntimePulling = true;
  settingsState.ai.localRuntimeError = "";
  renderSettingsPanel();
  setStatus(`正在下载本地模型：${modelNameToPull}。这可能需要几分钟。`, "warn");
  try {
    const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
    const shouldEnable = ["local_only", "hybrid"].includes(runtimeMode);
    const result = await pullOllamaModel(modelNameToPull, {
      enable: shouldEnable,
      runtimeMode
    });
    const runtime = result?.runtime || await fetchOllamaModels();
    const runtimePreview = {
      ...(runtime || {}),
      status: runtime?.status || "available"
    };
    const models = applyOllamaRuntimePreview(runtimePreview);
    if (result?.enabled?.preferences) {
      applyAiPreferencesToSettingsState(result.enabled.preferences);
    } else {
      settingsState.ai.localModel = selectedLocalModelNameForInstalledModels(modelNameToPull, models, currentOllamaModelTiers());
    }
    if (!installedLocalModelReady()) clearLocalOllamaSelectionState();
    else applyOllamaLocalModelDefaults();
    if (result?.enabled?.providerConfig) upsertAiProviderConfig(result.enabled.providerConfig);
    persistAiSettingsToStorage();
    if (shouldEnable) await persistOllamaRuntimeSelectionAfterPreview();
    else await refreshAiRoutePreview({ render: false });
    const readyModel = String(settingsState.ai.localModel || "").trim();
    setStatus(
      installedLocalModelReady(readyModel)
        ? `本地模型已就绪：${readyModel}`
        : `模型下载已完成，但还没有在本地模型列表里检测到 ${modelNameToPull}。请稍后重新检测。`,
      installedLocalModelReady(readyModel) ? "ok" : "warn"
    );
    return result;
  } catch (error) {
    settingsState.ai.localRuntimeError = String(error?.message || error);
    setStatus(`本地模型下载失败：${settingsState.ai.localRuntimeError}`, "warn");
    return null;
  } finally {
    settingsState.ai.localRuntimePulling = false;
    renderSettingsPanel();
  }
}

async function selectInstalledLocalModelFromUi(modelName = "") {
  const requested = String(modelName || "").trim();
  const inCatalog = Boolean(ollamaRecommendationForModel(requested, currentOllamaModelTiers()));
  const next = requested && inCatalog && hasLocalModel(requested) ? requested : "";
  settingsState.ai.localModel = next;
  clearLocalOllamaSelectionState({ clearModel: false });
  if (next) applyOllamaLocalModelDefaults();
  persistAiSettingsToStorage();
  await syncAiSettingsToApi();
  if (installedLocalModelReady() && ["local_only", "hybrid"].includes(normalizeAiRuntimeMode(settingsState.ai.runtimeMode)) && shouldUseOllamaLocalRuntime()) {
    await saveLocalOllamaProviderConfig();
    await refreshAiRoutePreview();
  } else {
    await refreshAiRoutePreview();
  }
  renderSettingsPanel();
  setStatus(
    next
      ? `本地模型已选择：${next}。建议再试运行一次。`
      : requested
        ? inCatalog
          ? "这个本地模型没有检测到，请先下载或重新检测本地 AI。"
          : "这个模型不在研思录内置本地模型目录里，不能设为默认模型。"
        : "本地模型选择已清空。",
    next || !requested ? "ok" : "warn"
  );
  return next;
}

async function refreshAiRoutePreview(options = {}) {
  settingsState.ai.routePreviewLoading = true;
  settingsState.ai.routePreviewError = "";
  if (options.render !== false) renderSettingsPanel();
  try {
    settingsState.ai.routePreview = await previewAiRoute(aiSettingsPayload());
    applyActiveAiProviderConfigToState();
  } catch (error) {
    settingsState.ai.routePreview = null;
    settingsState.ai.routePreviewError = String(error?.message || error);
  } finally {
    settingsState.ai.routePreviewLoading = false;
    if (options.render !== false) renderSettingsPanel();
  }
  return settingsState.ai.routePreview;
}

async function syncAiProviderConfigToApi() {
  const providerId = currentAiProviderId();
  if (!providerId) return false;
  settingsState.ai.providerConfigSaving = true;
  settingsState.ai.providerConfigError = "";
  renderSettingsPanel();
  try {
    const saved = await saveAiProviderConfig(aiProviderConfigPayload());
    upsertAiProviderConfig(saved);
    applyActiveAiProviderConfigToState();
    persistAiSettingsToStorage();
    await syncAiSettingsToApi();
    resetAiProviderDraftTouched();
    await refreshAiRoutePreview({ render: false });
    setStatus(`AI 服务配置已保存：${providerId}`, "ok");
    return true;
  } catch (error) {
    settingsState.ai.providerConfigError = String(error?.message || error);
    setStatus(`AI 服务配置保存失败：${settingsState.ai.providerConfigError}`, "bad");
    return false;
  } finally {
    settingsState.ai.providerConfigSaving = false;
    renderSettingsPanel();
  }
}

async function checkCurrentAiProviderHealth() {
  const providerId = currentAiProviderId();
  if (!providerId || providerId === "platform_managed_openai") return false;
  const endpointUrl = String(settingsState.ai.providerEndpointUrl || defaultProviderEndpointUrl(providerId) || "").trim();
  const healthEndpointUrl = String(
    settingsState.ai.providerHealthEndpointUrl || defaultProviderHealthEndpointUrl(providerId, endpointUrl) || ""
  ).trim();
  if (!healthEndpointUrl) {
    settingsState.ai.providerConfigError = "";
    settingsState.ai.providerHealthResult = null;
    renderSettingsPanel();
    setStatus("未填写检测地址；请用 AI 试运行确认远程服务是否可用。", "warn");
    return false;
  }
  settingsState.ai.providerHealthChecking = true;
  settingsState.ai.providerConfigError = "";
  renderSettingsPanel();
  try {
    const saved = await saveAiProviderConfig(aiProviderConfigPayload());
    upsertAiProviderConfig(saved);
    resetAiProviderDraftTouched();
    applyActiveAiProviderConfigToState();
    const result = await checkAiProviderHealth(providerId, {
      networkEnabled: true,
      healthCheck: {
        enabled: true,
        endpointUrl: healthEndpointUrl,
        method: "GET",
        timeoutMs: 5000,
        expectedStatus: 200,
        intervalSeconds: 300
      }
    });
    settingsState.ai.providerHealthResult = result;
    const record = result?.record || {};
    const label = record.status === "healthy" ? "连接正常" : `连接状态：${record.status || "未检测"}`;
    setStatus(`AI 服务 ${label}`, record.status === "healthy" ? "ok" : "warn");
    return true;
  } catch (error) {
    settingsState.ai.providerHealthResult = null;
    settingsState.ai.providerConfigError = String(error?.message || error);
    setStatus(`AI 服务连接测试失败：${settingsState.ai.providerConfigError}`, "bad");
    return false;
  } finally {
    settingsState.ai.providerHealthChecking = false;
    renderSettingsPanel();
  }
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

function currentImportToolbarValues() {
  return {
    connector: String($("importConnector")?.value || "obsidian").trim(),
    directoryId: String($("importDirectoryId")?.value || importState.directoryId || "").trim(),
    path: String($("importPath")?.value || "").trim(),
    payload: String($("importPayload")?.value || ""),
    options: String($("importOptions")?.value || ""),
    importRecordId: String($("importRecordId")?.value || importState.importRecordId || "").trim()
  };
}

function renderImportToolbar() {
  const el = $("importToolbarMount");
  if (!el) return;
  const values = currentImportToolbarValues();
  importState.directoryId = preferredImportDirectoryId(values.directoryId);
  const preview = activeImportPreviewContext();
  const hasMatchingPreview = Boolean(preview?.candidatePreview && preview.importRecordId === values.importRecordId);
  const summary = hasMatchingPreview
    ? selectionSummary(preview.candidatePreview, values.importRecordId, null, preview.candidateSelection || null)
    : { selectedCount: 0, totalCount: 0 };
  const confirmButton = importConfirmButtonState({
    hasMatchingPreview,
    selectedCount: summary.selectedCount,
    totalCount: summary.totalCount
  });

  el.innerHTML = renderImportToolbarMount({
    ...values,
    directoryId: importState.directoryId,
    directoryOptions: importTargetDirectories().map((folder) => ({
      value: folder.id,
      label: directoryPathLabel(folder.id)
    })),
    confirmButton
  });
}

function renderImportPageShell() {
  const el = $("importPageMount");
  if (!el) return;
  el.innerHTML = renderImportPageMount({
    toolbar: currentImportToolbarValues(),
    activeTab: importState.activeTab,
    result: importState.lastResultPayload
      ? {
          data: importState.lastResultPayload,
          raw: JSON.stringify(importState.lastResultPayload, null, 2)
        }
      : null
  });
  mountExportCardIntoImportShell();
  syncImportWorkspaceTabs();
}

function mountExportCardIntoImportShell() {
  const legacyExportCard = $("importPanel")?.querySelector(".export-card");
  const exportMount = $("exportCardMount");
  if (!legacyExportCard || !exportMount) return;
  if (legacyExportCard.parentElement === exportMount) return;
  legacyExportCard.remove();
}

function normalizeImportWorkspaceTab(tab = "import") {
  return String(tab || "").trim().toLowerCase() === "export" ? "export" : "import";
}

function syncImportWorkspaceTabs() {
  const mount = $("importPageMount");
  if (!mount) return;
  const activeTab = normalizeImportWorkspaceTab(importState.activeTab);
  mount.setAttribute("data-import-workspace-tab", activeTab);
  mount.querySelectorAll("[data-import-workspace-tab]").forEach((button) => {
    const buttonTab = normalizeImportWorkspaceTab(button.getAttribute("data-import-workspace-tab"));
    const isActive = buttonTab === activeTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.setAttribute("tabindex", isActive ? "0" : "-1");
  });
  const importPanel = $("importToolbarMount");
  const exportPanel = $("exportCardMount");
  if (importPanel) importPanel.hidden = activeTab !== "import";
  if (exportPanel) exportPanel.hidden = activeTab !== "export";
}

function setImportWorkspaceTab(tab = "import") {
  importState.activeTab = normalizeImportWorkspaceTab(tab);
  syncImportWorkspaceTabs();
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

function scheduledTaskFiltersFromUi() {
  return normalizeScheduledTaskFilters({
    ...settingsState.ai.scheduledTaskFilters,
    status: $("scheduledTaskStatusFilter")?.value || settingsState.ai.scheduledTaskFilters.status,
    taskType: $("scheduledTaskTypeFilter")?.value || settingsState.ai.scheduledTaskFilters.taskType
  });
}

function scheduledTaskTemplateById(templateId = "") {
  const id = String(templateId || "").trim();
  return settingsState.ai.scheduledTaskTemplates.find((template) => String(template.templateId || "").trim() === id) || null;
}

function scheduledTaskFormFromUi() {
  return {
    ...settingsState.ai.scheduledTaskForm,
    templateId: $("scheduledTaskTemplateSelect")?.value || settingsState.ai.scheduledTaskForm.templateId,
    name: $("scheduledTaskNameInput")?.value || "",
    status: $("scheduledTaskStatusSelect")?.value || "paused",
    scheduleType: $("scheduledTaskScheduleTypeSelect")?.value || "weekly",
    dayOfWeek: $("scheduledTaskDaySelect")?.value || "monday",
    time: $("scheduledTaskTimeInput")?.value || "09:00",
    intervalMinutes: $("scheduledTaskIntervalInput")?.value || 30,
    noteIdsText: $("scheduledTaskNoteIdsInput")?.value || "",
    directoryIdsText: $("scheduledTaskDirectoryIdsInput")?.value || "",
    tagsText: $("scheduledTaskTagsInput")?.value || "",
    keywordsText: $("scheduledTaskKeywordsInput")?.value || "",
    includePrivateNotes: $("scheduledTaskIncludePrivateInput")?.checked === true
  };
}

function resetScheduledTaskForm(overrides = {}) {
  const { formOpen = false, ...formOverrides } = overrides || {};
  settingsState.ai.scheduledTaskForm = {
    ...scheduledTaskFormDefaults({
      templates: settingsState.ai.scheduledTaskTemplates,
      currentNoteId: state.selectedFileId || state.activeTabId || "",
      currentDirectoryId: state.selectedFolderId || ""
    }),
    ...formOverrides
  };
  settingsState.ai.scheduledTaskFormOpen = Boolean(formOpen);
  renderScheduledTasksWorkspace();
}

function applyScheduledTaskTemplateToForm(templateId = "") {
  const template = scheduledTaskTemplateById(templateId);
  if (!template) return;
  const task = template.task || {};
  const schedule = task.schedule || {};
  settingsState.ai.scheduledTaskForm = {
    ...settingsState.ai.scheduledTaskForm,
    templateId: template.templateId,
    name: template.name || settingsState.ai.scheduledTaskForm.name,
    scheduleType: schedule.type || settingsState.ai.scheduledTaskForm.scheduleType,
    dayOfWeek: schedule.dayOfWeek || schedule.day_of_week || settingsState.ai.scheduledTaskForm.dayOfWeek,
    time: schedule.time || settingsState.ai.scheduledTaskForm.time
  };
  settingsState.ai.scheduledTaskFormOpen = true;
  renderScheduledTasksWorkspace();
}

async function refreshScheduledTaskTemplates(options = {}) {
  if (!options.silent) {
    settingsState.ai.scheduledTaskTemplatesLoading = true;
    settingsState.ai.scheduledTaskTemplatesError = "";
    renderScheduledTasksWorkspace();
  }
  try {
    const result = await fetchAiScheduledTaskTemplates({ implementationReady: true });
    settingsState.ai.scheduledTaskTemplates = result.items;
    settingsState.ai.scheduledTaskTemplatesError = "";
    if (!String(settingsState.ai.scheduledTaskForm.templateId || "").trim()) resetScheduledTaskForm();
    return result;
  } catch (error) {
    settingsState.ai.scheduledTaskTemplatesError = String(error?.message || error);
    setStatus(`计划任务模板加载失败：${settingsState.ai.scheduledTaskTemplatesError}`, "warn");
    return null;
  } finally {
    settingsState.ai.scheduledTaskTemplatesLoading = false;
    renderScheduledTasksWorkspace();
  }
}

function scheduledTaskPayloadHasScope(payload = {}) {
  const scope = payload.scope || {};
  return ["noteIds", "directoryIds", "tags", "keywords"].some((key) => Array.isArray(scope[key]) && scope[key].length);
}

async function saveScheduledTaskFromUi() {
  const form = scheduledTaskFormFromUi();
  settingsState.ai.scheduledTaskForm = form;
  settingsState.ai.scheduledTaskFormOpen = true;
  const payload = scheduledTaskPayloadFromForm(form);
  if (payload.status === "active" && !scheduledTaskPayloadHasScope(payload)) {
    const confirmed = window.confirm("Create an active scheduled task without a note, directory, tag, or keyword scope?");
    if (!confirmed) return null;
  }

  settingsState.ai.scheduledTaskActionLoading = true;
  renderScheduledTasksWorkspace();
  try {
    const item = await saveAiScheduledTask({ ...payload, canonical: true });
    rememberAiDebugSnapshot("scheduledTaskAction", item);
    const canonicalTask = item?.canonical?.item ? scheduledTaskFromCanonical(item.canonical.item) : null;
    settingsState.ai.scheduledTaskForm = scheduledTaskFormFromTask(canonicalTask || item);
    settingsState.ai.scheduledTaskFormOpen = false;
    await refreshScheduledTasks({ silent: true });
    setStatus(`Scheduled task saved: ${item?.name || item?.scheduledTaskId || ""}`, "ok");
    return item;
  } catch (error) {
    setStatus(`Scheduled task save failed: ${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    settingsState.ai.scheduledTaskActionLoading = false;
    renderScheduledTasksWorkspace();
  }
}

function editScheduledTaskFromList(scheduledTaskId = "") {
  const id = String(scheduledTaskId || "").trim();
  const task = settingsState.ai.scheduledTasks.find((item) => String(item.scheduledTaskId || "").trim() === id);
  if (!task) return setStatus("Scheduled task not found in the current list", "warn");
  settingsState.ai.scheduledTaskForm = scheduledTaskFormFromTask(task);
  settingsState.ai.scheduledTaskFormOpen = true;
  renderScheduledTasksWorkspace();
  setStatus(`Editing scheduled task: ${task.name || id}`, "ok");
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

async function refreshScheduledTasks(options = {}) {
  settingsState.ai.scheduledTaskFilters = normalizeScheduledTaskFilters(settingsState.ai.scheduledTaskFilters);
  if (!options.silent) {
    settingsState.ai.scheduledTasksLoading = true;
    settingsState.ai.scheduledTasksError = "";
    renderScheduledTasksWorkspace();
  }
  try {
    const result = await fetchAiScheduledTasks({ ...settingsState.ai.scheduledTaskFilters, canonical: true });
    settingsState.ai.scheduledTasks = Array.isArray(result?.canonical?.items) && result.canonical.items.length
      ? result.canonical.items.map((item) => scheduledTaskFromCanonical(item))
      : result.items;
    settingsState.ai.scheduledTasksTotal = result.total;
    rememberAiDebugSnapshot("scheduledTasksList", result);
    settingsState.ai.scheduledTasksError = "";
    return result;
  } catch (error) {
    settingsState.ai.scheduledTasksError = String(error?.message || error);
    setStatus(`Scheduled task load failed: ${settingsState.ai.scheduledTasksError}`, "warn");
    return null;
  } finally {
    settingsState.ai.scheduledTasksLoading = false;
    renderScheduledTasksWorkspace();
  }
}

async function setScheduledTaskStatus(scheduledTaskId, status) {
  const cleanScheduledTaskId = String(scheduledTaskId || "").trim();
  const cleanStatus = String(status || "").trim();
  if (!cleanScheduledTaskId || !cleanStatus) return null;
  settingsState.ai.scheduledTaskActionLoading = true;
  renderScheduledTasksWorkspace();
  try {
    const item = await updateAiScheduledTaskStatusWithOptions(cleanScheduledTaskId, cleanStatus, { canonical: true });
    rememberAiDebugSnapshot("scheduledTaskAction", item);
    const canonicalTask = item?.canonical?.item ? scheduledTaskFromCanonical(item.canonical.item) : null;
    const nextTask = canonicalTask || item;
    settingsState.ai.scheduledTasks = settingsState.ai.scheduledTasks.map((task) =>
      String(task.scheduledTaskId || "").trim() === cleanScheduledTaskId ? nextTask : task
    );
    await refreshScheduledTasks({ silent: true });
    setStatus(`Scheduled task ${cleanStatus}: ${cleanScheduledTaskId}`, "ok");
    return item;
  } catch (error) {
    setStatus(`Scheduled task status failed: ${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    settingsState.ai.scheduledTaskActionLoading = false;
    renderScheduledTasksWorkspace();
  }
}

async function runDueScheduledTasksFromUi() {
  const confirmed = window.confirm("现在运行到期的 AI 任务吗？新的输出会先进入系统消息，等待你确认。");
  if (!confirmed) return null;
  settingsState.ai.scheduledTaskActionLoading = true;
  settingsState.ai.scheduledTasksError = "";
  renderScheduledTasksWorkspace();
  try {
    const summary = await runDueAiScheduledTasks({ limit: settingsState.ai.scheduledTaskFilters.limit || 50 });
    settingsState.ai.scheduledTaskRunSummary = summary;
    await Promise.all([
      refreshScheduledTasks({ silent: true }),
      refreshAiInbox({ silent: true, preserveDetail: true }),
      refreshAiInboxEvaluationSummary({ silent: true })
    ]);
    const artifactCount = scheduledTaskReviewArtifactCount(summary);
    if (artifactCount > 0) {
      aiInboxState.filters = normalizeAiInboxFilters({
        ...globalPendingAiInboxFilters(),
        type: aiInboxState.filters?.type || "all"
      });
      aiInboxState.detail = null;
      aiInboxState.selectedArtifactId = "";
      addSystemMessage(scheduledTaskSystemMessageForArtifacts(artifactCount), { interrupt: true });
    }
    setStatus(`Scheduled tasks run: ${summary?.succeeded || 0} succeeded, ${summary?.skipped || 0} skipped, ${summary?.failed || 0} failed`, "ok");
    return summary;
  } catch (error) {
    setStatus(`Run due scheduled tasks failed: ${String(error?.message || error)}`, "bad");
    return null;
  } finally {
    settingsState.ai.scheduledTaskActionLoading = false;
    renderScheduledTasksWorkspace();
  }
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

async function openWritingModule({
  statusMessage = "已打开写作中心",
  focusedCandidateNoteIds = null,
  focusedCandidateScopeLabel = "",
  preserveFocusedCandidateScope = false
} = {}) {
  const normalizedFocusedCandidateNoteIds = Array.isArray(focusedCandidateNoteIds) ? uniqueStrings(focusedCandidateNoteIds) : null;
  if (normalizedFocusedCandidateNoteIds?.length) {
    try {
      await ensureNotesLoaded(normalizedFocusedCandidateNoteIds, { force: true });
    } catch {}
  }
  const statusRevisionAtStart = statusRevision;
  if (normalizedFocusedCandidateNoteIds) {
    setWritingFocusedCandidateScope(normalizedFocusedCandidateNoteIds, focusedCandidateScopeLabel || "当前图谱切片");
  } else if (!preserveFocusedCandidateScope) {
    clearWritingFocusedCandidateScope();
  }
  activateModule("writing");
  const writingProjectId = String(writingState.project?.id || "").trim();
  const basketIds = parseWritingBasketIds();
  writingState.loadingProjects = true;
  writingState.loadingThemeIndexes = true;
  writingState.loadingScaffoldVersions = Boolean(writingProjectId);
  writingState.loadingDraftVersions = Boolean(writingProjectId);
  writingState.loadingRelationCounts = basketIds.length > 0;
  renderWritingPanel();
  try {
    const [projects, themeIndexes, project, scaffoldVersions, draftVersions, relationPayload] = await Promise.all([
      listWritingProjects({
        limit: 8,
        q: writingState.projectFilters.q,
        status: writingState.projectFilters.status,
        hasDraft: writingState.projectFilters.hasDraft
      }).catch(() => writingState.projects),
      listIndexCards({
        directoryId: writingThemeIndexScopeDirectoryId(),
        includeDescendants: true,
        indexType: "topic",
        limit: 12
      }).catch(() => writingState.themeIndexes),
      writingProjectId ? fetchWritingProject(writingProjectId).catch(() => writingState.project) : Promise.resolve(null),
      writingProjectId ? listProjectScaffolds(writingProjectId, 12).catch(() => writingState.scaffoldVersions) : Promise.resolve([]),
      writingProjectId ? listProjectDraftVersions(writingProjectId, 12).catch(() => writingState.draftVersions) : Promise.resolve([]),
      refreshWritingRelationCounts(basketIds, { render: false }).catch(() => ({
        counts: writingState.relationCounts,
        errors: writingState.relationCountErrors
      }))
    ]);
    writingState.projects = Array.isArray(projects) ? projects : writingState.projects;
    writingState.themeIndexes = Array.isArray(themeIndexes) ? themeIndexes : writingState.themeIndexes;
    if (project) writingState.project = project;
    writingState.scaffoldVersions = Array.isArray(scaffoldVersions) ? scaffoldVersions : writingState.scaffoldVersions;
    writingState.draftVersions = Array.isArray(draftVersions) ? draftVersions : writingState.draftVersions;
    if (relationPayload && typeof relationPayload === "object") {
      writingState.relationCounts = relationPayload.counts && typeof relationPayload.counts === "object" ? relationPayload.counts : writingState.relationCounts;
      writingState.relationCountErrors =
        relationPayload.errors && typeof relationPayload.errors === "object" ? relationPayload.errors : writingState.relationCountErrors;
    }
  } finally {
    writingState.loadingProjects = false;
    writingState.loadingThemeIndexes = false;
    writingState.loadingScaffoldVersions = false;
    writingState.loadingDraftVersions = false;
    writingState.loadingRelationCounts = false;
    renderWritingPanel();
    syncWritingResultFromCurrentState();
  }
  if (statusMessage) setStatus(statusMessage, "ok", { skipIfStaleSince: statusRevisionAtStart, requireModule: "writing" });
}

async function createWritingProjectFromCurrentBasket() {
  const title = String($("writingTitle")?.value || "").trim();
  const basketNoteIds = parseWritingBasketIds();
  const relatedIndexIds = uniqueStrings(writingState.sourceIndexIds);
  if (writingState.project?.id) {
    setStatus(`当前项目已创建：${writingState.project.id}。下一步生成草稿骨架或打开当前项目。`, "warn");
    return writingState.project;
  }
  if (!title) {
    setStatus("请先填写项目标题", "warn");
    return null;
  }
  if (!basketNoteIds.length) {
    setStatus("请先加入至少一条永久笔记", "warn");
    return null;
  }
  try {
    const goal = String($("writingGoal")?.value || "").trim();
    const audience = String($("writingAudience")?.value || "").trim();
    const tone = String($("writingTone")?.value || "").trim();
    const bookStructure = currentWritingBookStructure({
      notes: basketNoteIds.map((noteId) => writingKnownNoteById(noteId) || { id: noteId, title: noteId }),
      includeLocalIdeas: true
    });
    const project = await createWritingProject({
      title,
      goal,
      audience,
      tone,
      intent: deriveWritingProjectIntent({ title, goal }),
      desiredReaderTakeaway: deriveWritingProjectTakeaway({ title, goal, audience }),
      basketNoteIds,
      relatedIndexIds,
      bookStructure
    });
    writingState.project = project;
    syncWritingLocalBookIdeasFromProject(project);
    writingState.scaffold = null;
    writingState.scaffoldMarkdown = "";
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
    setStatus(`项目已创建：${project?.id}`, "ok");
    return project;
  } catch (error) {
    showWritingResult({
      stage: "writing_project_error",
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`项目创建失败：${String(error?.message || error)}`, "bad");
    return null;
  }
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
  const noteIds = createdNoteIdsByTypeFromImportPayload(importState.lastResultPayload || {}, "permanent");
  if (!noteIds.length) {
    setStatus("当前导入结果里没有可创建项目的 PermanentNote", "warn");
    return false;
  }
  await ensureNotesLoaded(noteIds);
  const title = suggestedWritingProjectTitle(noteIds);
  const entryPlan = planImportedPermanentNotesWritingEntry({ noteIds, title });
  if (entryPlan.shouldBeginEntry) {
    beginWritingEntry(entryPlan.noteIds, {
      title: entryPlan.title,
      source: entryPlan.source
    });
  }
  try {
    const goal = String($("writingGoal")?.value || "").trim();
    const audience = String($("writingAudience")?.value || "").trim();
    const tone = String($("writingTone")?.value || "").trim();
    const project = await createWritingProject({
      title,
      goal,
      audience,
      tone,
      intent: deriveWritingProjectIntent({ title, goal }),
      desiredReaderTakeaway: deriveWritingProjectTakeaway({ title, goal, audience }),
      basketNoteIds: noteIds
    });
    writingState.project = project;
    syncWritingLocalBookIdeasFromProject(project);
    populateWritingFormFromProject(project);
    showWritingResult({
      stage: "writing_project",
      writingProjectId: project?.id,
      title: project?.title,
      basketNoteIds: project?.basket_note_ids,
      basketNotes: project?.basket_notes
    });
    await openWritingModule({ statusMessage: `已从导入结果创建项目：${project?.id}` });
    return true;
  } catch (error) {
    showWritingResult({
      stage: "writing_project_error",
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`从导入结果创建项目失败：${String(error?.message || error)}`, "bad");
    return false;
  }
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
  if (!note || !isUntitledTitle(note.title)) return note;
  const tab = noteTabFor(note.id);
  const currentBody = normalizedDefaultUntitledBody(note.folderId);
  const existingBody = ensureEditableNoteBody(typeof tab?.body === "string" ? tab.body : note.body).replace(/\r\n/g, "\n").trim();
  if (!existingBody || existingBody === currentBody || !isEmptyUntitledMarkdown(existingBody, note.folderId)) return note;

  const nextBody = ensureEditableNoteBody(initialBodyForFolder(note.folderId));
  if (isLocalOnlyNote(note)) {
    note.body = nextBody;
    note.bodyLoaded = true;
    note.tags = parseTags(nextBody);
    note.links = parseLinks(nextBody);
    note.updatedAt = new Date().toISOString();
    if (tab) {
      tab.body = nextBody;
      tab.savedBody = nextBody;
      tab.dirty = false;
    }
    return note;
  }

  try {
    const updated = await updateNote(note.id, {
      title: note.title,
      body: nextBody,
      status: note.status || "draft",
      generatedOriginalNoteId: note.generatedOriginalNoteId || undefined,
      originalityStatus: note.originalityStatus || undefined,
      originalitySimilarity: note.originalitySimilarity ?? undefined
    });
    if (updated) {
      Object.assign(note, mapNoteItem(updated), { bodyLoaded: true });
      if (tab) {
        tab.body = note.body;
        tab.savedBody = note.body;
        tab.title = note.title;
        tab.savedTitle = note.title;
        tab.dirty = false;
      }
    }
  } catch (error) {
    setStatus(`未命名占位模板刷新失败，仍打开旧内容：${String(error?.message || error)}`, "warn");
  }
  return note;
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

function notesUnderRoot(rootId = "") {
  const ids = new Set(descendantDirectoryIds(rootId));
  return state.notes.filter((note) => ids.has(note.folderId));
}

function noteHasNetworkSignal(note = null) {
  const bodyLinks = parseLinks(note?.body || "");
  const bodyTags = parseTags(note?.body || "");
  return bodyLinks.length > 0 || bodyTags.length > 0;
}

function noteHasBoundarySignal(note = null) {
  if (String(note?.boundaryOrCounterpoint || note?.boundary_or_counterpoint || "").trim()) return true;
  const body = String(note?.body || "");
  return /边界|反例|不成立|适用条件|counterpoint|boundary|counterexample/i.test(body);
}

function distillationSummaryForNotes(notes = []) {
  return notes.reduce(
    (acc, note) => {
      const thesis = String(note?.thesis || "").trim();
      const summary = Array.isArray(note?.threeLineSummary) ? note.threeLineSummary.filter((item) => String(item || "").trim()) : [];
      const confirmed = distillationStatusOf(note) === "confirmed";
      if (!thesis) acc.missingThesis += 1;
      if (summary.length < 3) acc.missingSummary += 1;
      if (!confirmed && thesis && summary.length >= 3) acc.needsConfirm += 1;
      if (!noteHasBoundarySignal(note)) acc.missingBoundary += 1;
      if (!confirmed) acc.pending += 1;
      if (confirmed) acc.confirmed += 1;
      if (confirmed && thesis && summary.length >= 3) acc.writingReady += 1;
      return acc;
    },
    {
      pending: 0,
      confirmed: 0,
      writingReady: 0,
      missingThesis: 0,
      missingSummary: 0,
      needsConfirm: 0,
      missingBoundary: 0
    }
  );
}

function renderExplorerSidebarFlow(rootId = state.browserRootId) {
  const el = $("sidebarFlow");
  if (!el) return;
  const isOriginal = rootId === "dir_original_default";
  const isFleeting = rootId === "dir_fleeting_default";
  const isLiterature = rootId === "dir_literature_default";
  const currentNotes = notesUnderRoot(rootId);
  const originalNotes = notesUnderRoot("dir_original_default");
  const linkedOriginalCount = originalNotes.filter(noteHasNetworkSignal).length;
  const generatedMaterialCount = currentNotes.filter(noteHasGeneratedOriginal).length;
  const pendingMaterialCount = Math.max(0, currentNotes.length - generatedMaterialCount);
  const distillation = distillationSummaryForNotes(originalNotes.filter((note) => isPermanentLikeNote(note)));
  const topGaps = [
    distillation.missingThesis ? `缺一句话判断 ${distillation.missingThesis}` : "",
    distillation.missingSummary ? `缺三句话压缩 ${distillation.missingSummary}` : "",
    distillation.needsConfirm ? `待确认观点 ${distillation.needsConfirm}` : "",
    distillation.missingBoundary ? `缺边界/反例 ${distillation.missingBoundary}` : ""
  ].filter(Boolean);
  const primaryAction = distillation.pending > 0 ? "continue-distillation" : distillation.writingReady > 0 ? "open-writing" : "create-permanent";
  const title = isOriginal
    ? "观点形成进度"
    : isLiterature
      ? "文献是证据入口"
      : isFleeting
        ? "随笔是线索入口"
        : "当前目录接入主路";
  const note = isOriginal
    ? topGaps.length
      ? `下一步：${topGaps.slice(0, 2).join("，")}。`
      : distillation.writingReady
        ? "当前观点已经可以进入写作中心。"
        : "先写出第一条可以被确认的观点。"
    : isLiterature
      ? "先写转述，再记录永久笔记。来源字段保留追溯能力，但不让资料管理盖过判断形成。"
      : isFleeting
        ? "先捕捉还不成熟的问题和线索，等它出现判断，再单独沉淀为永久笔记。"
        : "这一级目录会被放回永久笔记、关系网络、主题索引和写作中心的路径里理解。";
  const steps = isOriginal
    ? [
        ["写一句判断", distillation.missingThesis < originalNotes.length],
        ["压缩成三句话", distillation.missingSummary < originalNotes.length],
        ["确认观点", distillation.confirmed > 0],
        ["写作中心", distillation.writingReady > 0]
      ]
    : [
        ["素材入口", true],
        ["记录永久笔记", generatedMaterialCount > 0],
        ["关系网络", linkedOriginalCount > 0],
        ["写作中心", false]
      ];
  const metrics = isOriginal
    ? [
        [distillation.pending, "待提纯"],
        [distillation.confirmed, "已确认观点"],
        [distillation.writingReady, "可进入写作中心"]
      ]
    : [
        [currentNotes.length, "素材条目"],
        [generatedMaterialCount, "已生成永久笔记"],
        [pendingMaterialCount, "待处理"]
      ];

  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="sidebar-flow-card">
      <div>
        <div class="sidebar-flow-kicker">${isOriginal ? "Main Route" : "Material Route"}</div>
        <div class="sidebar-flow-title">${escapeHtml(title)}</div>
        <div class="sidebar-flow-note">${escapeHtml(note)}</div>
      </div>
      <div class="sidebar-flow-steps" aria-label="当前工作路径">
        ${steps.map(([label, active]) => `<div class="sidebar-flow-step ${active ? "is-active" : ""}">${escapeHtml(label)}</div>`).join("")}
      </div>
      <div class="sidebar-flow-metrics">
        ${metrics
          .map(
            ([value, label]) => `
              <div class="sidebar-flow-metric">
                <strong>${Number(value) || 0}</strong>
                <span>${escapeHtml(label)}</span>
              </div>
            `
          )
          .join("")}
      </div>
      ${
        isOriginal
          ? `<div class="sidebar-flow-gaps">${topGaps.length ? topGaps.map((gap) => `<span>${escapeHtml(gap)}</span>`).join("") : `<span>观点链路已清爽</span>`}</div>
             <button class="mini-btn primary sidebar-flow-action" type="button" data-sidebar-flow-action="${escapeHtml(primaryAction)}">${escapeHtml(
               primaryAction === "continue-distillation" ? "继续整理观点" : primaryAction === "open-writing" ? "进入写作中心" : "新建永久笔记"
             )}</button>`
          : ""
      }
    </div>
  `;
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

function sourcePromotionWorkflowMessageForNote(note = null, suggestion = null) {
  return computeSourcePromotionWorkflowMessageForNote(note, suggestion, {
    isOriginalRecordableSource,
    noteHasGeneratedOriginal,
    state,
    typeFromFolder
  });
}

function syncSourcePromotionSystemMessageForNote(note = null, suggestion = null) {
  if (!note?.id || !isOriginalRecordableSource(note)) return null;
  const dedupeKey = workflowMessageDedupeKey(note.id, "source-promotion", "record-permanent");
  if (noteHasGeneratedOriginal(note)) return resolveSystemMessageByDedupeKey(dedupeKey);
  const message = sourcePromotionWorkflowMessageForNote(note, suggestion);
  if (!message) return null;
  return upsertSystemMessage(message, { preserveRead: true });
}

function relationNetworkWorkflowMessageForNote(note = null, overview = {}) {
  return computeRelationNetworkWorkflowMessageForNote(note, overview, {
    distillationStatusOf,
    isPermanentLikeNote
  });
}

function syncRelationNetworkSystemMessageForNote(note = null, overview = {}) {
  const message = relationNetworkWorkflowMessageForNote(note, overview);
  if (!message) return null;
  if (message.resolved) return resolveSystemMessageByDedupeKey(message.dedupeKey);
  return upsertSystemMessage(message, { preserveRead: true });
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

function distillationQueueFilters(counts = {}) {
  return [
    ["all", "全部", counts.all || 0],
    ["needs_thesis", "待一句话判断", counts.needs_thesis || 0],
    ["needs_summary", "待三句话压缩", counts.needs_summary || 0],
    ["needs_confirm", "待确认", counts.needs_confirm || 0],
    ["confirmed", "已确认", counts.confirmed || 0]
  ];
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
  const noteType = editorHelperNoteType(activeNote, { typeFromFolder: (folderId) => typeFromFolder(state, folderId) });
  if (!activeNote) {
    action.dataset.helperAction = "noop";
    action.dataset.targetNoteId = "";
    helper.hidden = false;
    helper.setAttribute("aria-hidden", "false");
    helper.style.pointerEvents = "";
    helper.classList.remove("hidden");
    kicker.textContent = "下一步推荐";
    title.textContent = "先打开一条笔记";
    body.textContent = "从随笔、文献或永久笔记里任选一条开始。后续会根据当前上下文提示相关任务和推荐下一步。";
    action.textContent = "知道了";
    return;
  }
  if (activeNote && !state.focusMode) {
    hideEditorHelper();
    return;
  }
  action.dataset.helperAction = "noop";
  action.dataset.targetNoteId = "";
  helper.hidden = false;
  helper.setAttribute("aria-hidden", "false");
  helper.style.pointerEvents = "";
  helper.classList.remove("hidden");

  if (state.focusMode) {
    kicker.textContent = "专注模式";
    title.textContent = "现在只保留当前笔记";
    body.textContent = activeNote
      ? `专注模式会收起左侧导航和回链，只留下正文与关键按钮。先把${noteGrowthStage(activeNote, activeBody) === "提炼中" ? "核心判断" : "关键判断与边界"}写清楚，再决定是否补连接与标签。`
      : "专注模式会收起左侧导航和回链，只留下正文与关键按钮。打开一条笔记后再开始提炼。";
    action.textContent = "保持专注";
    return;
  }
  if (noteType === "literature") {
    kicker.textContent = "文献笔记";
    if (noteHasGeneratedOriginal(activeNote)) {
      const targetNoteId = noteGeneratedOriginalNoteId(activeNote);
      title.textContent = "这条文献已经长出永久笔记";
      body.textContent = "你可以继续补文献里的证据与边界，也可以直接跳到那条永久笔记里继续提炼自己的判断。";
      action.textContent = "打开永久笔记";
      action.dataset.helperAction = "open-generated-original";
      action.dataset.targetNoteId = targetNoteId;
    } else {
      title.textContent = "先把原文转成你的判断";
      body.textContent = "文献笔记现在和其它笔记共用同一个编辑器。等你觉得材料已经能支撑一个明确判断时，再点“记录永久笔记”。";
      action.textContent = "继续整理";
    }
    return;
  }
  if (isPermanentLikeNote(activeNote)) {
    kicker.textContent = "永久笔记";
    title.textContent = `当前在${noteGrowthStage(activeNote, activeBody)}`;
    body.textContent = "先把观点写清楚，再决定是否补连接、标签和证据。原创性检测现在会以浮窗方式提醒，不再把确认操作压在编辑器底部。";
    action.textContent = "继续提炼";
    return;
  }
  kicker.textContent = "随笔笔记";
  if (noteHasGeneratedOriginal(activeNote)) {
    const targetNoteId = noteGeneratedOriginalNoteId(activeNote);
    title.textContent = "这条随笔已经沉淀为永久笔记";
    body.textContent = "原始线索还可以继续补，但它已经对应到一条永久笔记。你可以直接跳过去继续完善核心判断。";
    action.textContent = "打开永久笔记";
    action.dataset.helperAction = "open-generated-original";
    action.dataset.targetNoteId = targetNoteId;
    return;
  }
  title.textContent = `当前在${noteGrowthStage(activeNote, activeBody)}`;
  body.textContent = "随笔只负责抓住线索，不必在这里完成所有整理。等你判断它值得长期保留时，再点“记录永久笔记”。";
  action.textContent = "继续记录";
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
  const items = distillationQueueItems();
  const stageCounts = items.reduce(
    (acc, item) => {
      acc.all += 1;
      acc[item.stage] = (acc[item.stage] || 0) + 1;
      return acc;
    },
    { all: 0, needs_thesis: 0, needs_summary: 0, needs_confirm: 0, confirmed: 0 }
  );
  const counts = items.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { missing: 0, draft: 0, confirmed: 0 }
  );
  const activeCount = (counts.missing || 0) + (counts.draft || 0);
  const writingReadyCount = items.filter(({ note, status }) => {
    const summary = Array.isArray(note.threeLineSummary) ? note.threeLineSummary.filter((item) => String(item || "").trim()) : [];
    return status === "confirmed" && String(note.thesis || "").trim() && summary.length >= 3;
  }).length;
  const activeFilter = distillationState.filter || "all";
  const filteredItems = activeFilter === "all" ? items : items.filter((item) => item.stage === activeFilter);
  const gapChips = [
    stageCounts.needs_thesis ? `缺一句话判断 ${stageCounts.needs_thesis}` : "",
    stageCounts.needs_summary ? `缺三句话压缩 ${stageCounts.needs_summary}` : "",
    stageCounts.needs_confirm ? `待确认观点 ${stageCounts.needs_confirm}` : ""
  ].filter(Boolean);
  const filtersHtml = distillationQueueFilters(stageCounts)
    .map(([key, label, value]) => {
      const active = activeFilter === key;
      return `<button class="distillation-filter ${active ? "active" : ""}" type="button" data-distillation-filter="${escapeHtml(key)}" aria-pressed="${active ? "true" : "false"}">${escapeHtml(label)} <span>${Number(value) || 0}</span></button>`;
    })
    .join("");
  const rows = filteredItems.length
    ? filteredItems
        .map(({ note, status, reason }) => {
          const title = note.title || titleFromBody(note.body || "") || "未命名笔记";
          const summary = Array.isArray(note.threeLineSummary) ? note.threeLineSummary.filter(Boolean).slice(0, 3).join(" / ") : "";
          return `
            <button class="distillation-queue-item" type="button" data-distillation-open-note="${escapeHtml(note.id)}" data-status="${escapeHtml(status)}">
              <span class="distillation-queue-main">
                <strong>${escapeHtml(title)}</strong>
                <small>${escapeHtml(reason)}</small>
                ${note.thesis ? `<em>${escapeHtml(note.thesis)}</em>` : ""}
                ${summary ? `<em>${escapeHtml(summary)}</em>` : ""}
              </span>
              <span class="inspector-chip">${escapeHtml(distillationStatusLabel(status))}</span>
            </button>
          `;
        })
        .join("")
    : activeFilter !== "all"
      ? `<div class="distillation-empty">当前筛选下没有条目。可以切回“全部”，或继续进入写作中心。</div>`
      : activeCount === 0 && writingReadyCount > 0
        ? `<div class="distillation-empty">当前没有待提纯条目。已确认观点可以进入写作中心。</div>`
        : `<div class="distillation-empty">还没有可整理的永久笔记。先新建或导入一条永久笔记。</div>`;
  const nextActiveItem = items.find((item) => item.stage !== "confirmed") || null;
  const primaryAction = nextActiveItem ? "open-next" : writingReadyCount > 0 ? "open-writing" : "create-permanent";
  const primaryActionLabel = primaryAction === "open-writing" ? "进入写作中心" : primaryAction === "create-permanent" ? "新建永久笔记" : "继续整理观点";
  const primaryActionAttrs = primaryAction === "open-next"
    ? `data-distillation-open-note="${escapeHtml(nextActiveItem.note.id)}"`
    : `data-distillation-action="${escapeHtml(primaryAction)}"`;
  panel.innerHTML = `
    <div class="distillation-shell">
      <section class="distillation-card distillation-home">
        <div>
          <div class="import-card-kicker">观点整理</div>
          <strong>先把材料整理成你愿意确认的观点</strong>
          <p>${escapeHtml(gapChips.length ? `优先处理：${gapChips.join("，")}。` : writingReadyCount ? "当前观点已经准备进入写作中心。" : "从第一条永久笔记开始写一句判断。")}</p>
        </div>
        <button class="mini-btn primary" type="button" ${primaryActionAttrs}>${escapeHtml(primaryActionLabel)}</button>
      </section>
      <section class="distillation-overview">
        <div>
          <span>待提纯</span>
          <strong>${activeCount}</strong>
        </div>
        <div>
          <span>已确认观点</span>
          <strong>${counts.confirmed || 0}</strong>
        </div>
        <div>
          <span>可进入写作中心</span>
          <strong>${writingReadyCount}</strong>
        </div>
        <div>
          <span>缺口提醒</span>
          <strong>${gapChips.length}</strong>
        </div>
      </section>
      <section class="distillation-card">
        <div class="distillation-card-head">
          <div>
            <div class="import-card-kicker">Queue</div>
            <strong>观点整理队列</strong>
          </div>
          <button class="mini-btn is-ghost" id="btnDistillationRefresh" type="button">刷新</button>
        </div>
        <div class="distillation-filters" role="group" aria-label="观点整理队列筛选">${filtersHtml}</div>
        <div class="distillation-queue">${rows}</div>
      </section>
    </div>
  `;
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

function beginWritingEntry(noteIds = [], { title = "", source = "writing_center" } = {}) {
  const normalizedIds = [...new Set((noteIds || []).map((item) => String(item || "").trim()).filter(Boolean))];
  if (!normalizedIds.length) return false;
  const nextGoal = String($("writingGoal")?.value || "").trim();
  const nextAudience = String($("writingAudience")?.value || "").trim();
  const nextTone = String($("writingTone")?.value || "").trim();
  writingState.strongModelEpoch += 1;
  writingState.strongModelLoading = false;
  writingState.strongModelResult = null;
  writingState.strongModelError = "";
  resetWritingLocalBookIdeas();
  writingState.relationCounts = {};
  writingState.relationCountErrors = {};
  writingState.loadingRelationCounts = normalizedIds.length > 0;
  clearWritingSourceIndexIds();
  setSelectedWritingThemeIndex("");
  setWritingBasketIds(normalizedIds);
  resetWritingProjectContext({
    title: String(title || "").trim(),
    goal: nextGoal,
    audience: nextAudience,
    tone: nextTone
  });
  showWritingResult({
    stage: "writing_entry_from_notes",
    source,
    basketNoteIds: normalizedIds
  });
  renderWritingPanel();
  void refreshWritingRelationCounts(normalizedIds);
  return true;
}

function continueWritingEntry(noteIds = [], { title = "", source = "writing_center", sourceIndexIds = [], preserveSourceIndexIds = true } = {}) {
  const plan = planWritingBasketEntry({
    existingNoteIds: parseWritingBasketIds(),
    incomingNoteIds: noteIds
  });
  if (!plan.basketNoteIds.length) return null;

  const resolvedTitle = resolveWritingEntryTitle({
    entryMode: plan.entryMode,
    requestedTitle: title,
    existingTitle: String($("writingTitle")?.value || "").trim()
  });
  const nextGoal = String($("writingGoal")?.value || "").trim();
  const nextAudience = String($("writingAudience")?.value || "").trim();
  const nextTone = String($("writingTone")?.value || "").trim();

  writingState.strongModelEpoch += 1;
  writingState.strongModelLoading = false;
  writingState.strongModelResult = null;
  writingState.strongModelError = "";
  resetWritingLocalBookIdeas();
  writingState.relationCounts = {};
  writingState.relationCountErrors = {};
  writingState.loadingRelationCounts = plan.basketNoteIds.length > 0;
  const nextSourceIndexIds = resolveWritingSourceIndexIds({
    existingSourceIndexIds: writingState.sourceIndexIds,
    incomingSourceIndexIds: sourceIndexIds,
    preserveExisting: preserveSourceIndexIds
  });
  if (nextSourceIndexIds.length) setWritingSourceIndexIds(nextSourceIndexIds);
  else clearWritingSourceIndexIds();
  setSelectedWritingThemeIndex(
    resolveWritingSelectedThemeIndexId({
      currentSelectedThemeIndexId: writingState.selectedThemeIndexId,
      nextSourceIndexIds
    })
  );
  setWritingBasketIds(plan.basketNoteIds);
  resetWritingProjectContext({
    title: resolvedTitle,
    goal: nextGoal,
    audience: nextAudience,
    tone: nextTone
  });
  showWritingResult({
    stage: "writing_entry_from_notes",
    source,
    basketNoteIds: plan.basketNoteIds
  });
  renderWritingPanel();
  void refreshWritingRelationCounts(plan.basketNoteIds);
  return plan;
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

function renderAiRoutePreview() {
  const stats = $("settingsAiRouteStats");
  const detail = $("settingsAiRoutePreview");
  if (!stats || !detail) return;

  if (settingsState.ai.routePreviewLoading) {
    stats.innerHTML = `<span class="settings-stat-badge warn">正在预览</span>`;
    detail.textContent = "正在根据当前选择判断会使用的服务和模型...";
    return;
  }

  if (settingsState.ai.routePreviewError) {
    const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
    const localModel = String(settingsState.ai.localModel || "").trim();
    const localReady = ["local_only", "hybrid"].includes(runtimeMode)
      && installedLocalModelReady(localModel);
    if (localReady) {
      stats.innerHTML = [
        `<span class="settings-stat-badge ok">${runtimeMode === "hybrid" ? "自动选择" : "只用本地模型"}</span>`,
        `<span class="settings-stat-badge ok">本地模型已就绪</span>`,
        `<span class="settings-stat-badge muted">待试运行</span>`
      ].join("");
      detail.innerHTML = `
        <div class="settings-route-preview-title">本地 AI 已就绪</div>
        <div class="settings-route-preview-copy">研思录会使用你电脑上的本地 AI 运行模型。</div>
        <div class="settings-route-preview-facts">
          <div class="settings-route-preview-fact">
            <span>使用方式</span>
            <strong>${runtimeMode === "hybrid" ? "自动选择" : "只用本地模型"}</strong>
          </div>
          <div class="settings-route-preview-fact">
            <span>运行位置</span>
            <strong>本机</strong>
          </div>
          <div class="settings-route-preview-fact">
            <span>当前模型</span>
            <strong>${escapeHtml(localModel)}</strong>
          </div>
        </div>
        <div class="settings-route-preview-privacy">数据位置：本地运行，内容不会因为这一路线发送到远程模型服务。</div>
        <div class="settings-route-preview-action">下一步：输入一句普通测试话，确认 AI 能正常回复。</div>
      `;
      return;
    }
    stats.innerHTML = `<span class="settings-stat-badge warn">需要确认</span>`;
    detail.innerHTML = `
      <div class="settings-route-preview-title">当前设置还不能确认</div>
      <div class="settings-route-preview-copy">请先检查 AI 使用方式、模型入口和远程服务信息；保存后再试运行。</div>
    `;
    return;
  }

  const preview = settingsState.ai.routePreview;
  if (!preview) {
    stats.innerHTML = `<span class="settings-stat-badge warn">等待确认</span>`;
    detail.innerHTML = `
      <div class="settings-route-preview-title">还没有确认 AI 设置</div>
      <div class="settings-route-preview-copy">先完成本地或远程大模型设置，再用一句短句试运行。</div>
    `;
    return;
  }

  function localRuntimeSummaryText() {
    const status = String(settingsState.ai.localRuntimeStatus || "unknown").trim() || "unknown";
    const models = Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
    const selectedModel = String(settingsState.ai.localModel || "").trim();
    if (status === "available" && selectedModel) return `本地 AI 可连接 / ${selectedModel}`;
    if (status === "available") return `本地 AI 可连接 / ${models.length} 个模型`;
    if (status === "unavailable") return "本地 AI 不可用";
    return "本地 AI 未检测";
  }

  const provider = preview.provider || {};
  const route = preview.route || {};
  const access = preview.access || {};
  const providerId = String(provider.providerId || currentAiProviderId()).trim();
  const providerConfig = activeAiProviderConfig();
  const draftTouched = settingsState.ai.providerDraftTouched || {};
  const remoteConfigurable = isRemoteConfigurableProviderId(providerId);
  const remoteRuntimeModel = remoteConfigurable
    ? String(draftTouched.remoteRuntimeModel
      ? settingsState.ai.remoteRuntimeModel
      : settingsState.ai.remoteRuntimeModel || remoteRuntimeModelFromMap(providerId, providerConfig?.runtimeModelMap || providerConfig?.runtime_model_map || {}) || "").trim()
    : "";
  const remoteEndpointUrl = remoteConfigurable
    ? String(draftTouched.providerEndpointUrl
      ? settingsState.ai.providerEndpointUrl
      : settingsState.ai.providerEndpointUrl || providerConfig?.endpointUrl || providerConfig?.endpoint_url || "").trim()
    : "";
  function providerDisplayLabel() {
    const displayName = String(provider.displayName || "").trim();
    if (providerId === "platform_managed_openai") return "平台托管 OpenAI";
    if (displayName === "Platform Managed OpenAI") return "平台托管 OpenAI";
    if (displayName === "Ollama Local") return "本地 AI";
    return displayName || providerId || "未知服务";
  }
  function modelPackDisplayLabel(value = "") {
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
  function routeModelDisplayLabel(value = "") {
    const key = String(value || "").trim();
    const labels = {
      standard: "标准档",
      fast: "快速档",
      balanced: "均衡档",
      strong: "高质量档",
      premium: "高质量档"
    };
    return labels[key.toLowerCase()] || key || "自动选择";
  }
  const health = preview.health || {};
  const healthStatus = String(health.status || "unknown").trim() || "unknown";
  const healthLabels = {
    healthy: "已连通",
    degraded: "需检查",
    down: "不可用",
    unknown: "待试运行"
  };
  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  const modelRef = String(route.modelRef || "").trim();
  const routeModelName = modelRef.includes(":")
    ? modelRef.slice(modelRef.lastIndexOf(":") + 1)
    : modelRef;
  const localModel = String(settingsState.ai.localModel || "").trim();
  const rawDisplayModel = route.localOnly
    ? String(localModel || "自动选择").trim()
    : String(remoteRuntimeModel || routeModelName || "自动选择").trim();
  const displayModel = routeModelDisplayLabel(rawDisplayModel);
  const modeLabel = runtimeMode === "local_only"
    ? "只用本地模型"
    : runtimeMode === "hybrid"
      ? "自动选择"
      : runtimeMode === "cloud_only"
        ? "只用远程模型"
        : "自动选择";
  const serviceLabel = route.localOnly ? "本地 AI" : providerDisplayLabel();
  const ready = route.localOnly
    ? installedLocalModelReady(localModel)
    : access.ready === true && (!remoteConfigurable || Boolean(remoteEndpointUrl && remoteRuntimeModel));
  const statusText = route.localOnly
    ? (ready ? "本地 AI 已就绪" : "本地 AI 待设置")
    : (ready ? "在线 AI 已就绪" : "在线 AI 待设置");
  const statusTone = ready ? "ok" : "warn";
  const actionText = ready
    ? "下一步：输入一句普通测试话，确认 AI 能正常回复。"
    : route.localOnly
      ? "下一步：在本地 AI 面板启动本地 AI，并选择或下载一个模型。"
      : "下一步：填写服务地址、模型名和密钥名称，然后保存。";
  const localRuntimeLine = ["local_only", "hybrid"].includes(runtimeMode)
    ? `<div class="settings-route-preview-meta">${escapeHtml(localRuntimeSummaryText())}</div>`
    : "";
  const routeTitle = statusText;
  const routeSummary = route.localOnly
    ? ready
      ? "研思录会使用你电脑上的本地 AI 运行模型，适合处理更私密的研究材料。"
      : "本地 AI 还没有准备好。安装、运行、下载和切换模型都在本地 AI 面板完成。"
    : ready
      ? "研思录会使用平台托管的在线 AI，不需要你自己填写密钥。"
      : "在线 AI 还没有准备好。请先保存远程服务信息，再做试运行。";
  const privacyText = route.localOnly
    ? "数据位置：本地运行，内容不会因为这一路线发送到远程模型服务。"
    : "数据位置：试运行内容会发送到在线 AI 服务；含隐私内容时建议切到本地 AI。";
  const factRows = route.localOnly
    ? [
        ["使用方式", modeLabel],
        ["运行位置", "本机"],
        ["当前模型", displayModel]
      ]
    : [
        ["使用方式", modeLabel],
        ["服务来源", serviceLabel],
        ["模型档位", displayModel]
      ];

  stats.innerHTML = [
    `<span class="settings-stat-badge ${route.localOnly ? "ok" : ""}">${escapeHtml(modeLabel)}</span>`,
    `<span class="settings-stat-badge ${statusTone}">${escapeHtml(statusText)}</span>`,
    `<span class="settings-stat-badge muted">${escapeHtml(healthLabels[healthStatus] || "待试运行")}</span>`
  ].join("");
  detail.innerHTML = `
    <div class="settings-route-preview-title">${escapeHtml(routeTitle)}</div>
    <div class="settings-route-preview-copy">${escapeHtml(routeSummary)}</div>
    <div class="settings-route-preview-facts">
      ${factRows.map(([label, value]) => `
        <div class="settings-route-preview-fact">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="settings-route-preview-meta">AI 方案：${escapeHtml(modelPackDisplayLabel(preview.modelPack || settingsState.ai.modelPack || "Starter Auto"))}</div>
    ${localRuntimeLine}
    <div class="settings-route-preview-privacy">${escapeHtml(privacyText)}</div>
    <div class="settings-route-preview-action">${escapeHtml(actionText)}</div>
  `;
}

function renderAiSettingsExperience() {
  const title = $("settingsAiSetupTitle");
  const body = $("settingsAiSetupBody");
  const badges = $("settingsAiSetupBadges");
  const quickstartStatus = $("settingsAiQuickstartStatus");
  const localHomeSteps = $("settingsAiLocalHomeSteps");
  const stepsEl = $("settingsAiSetupSteps");
  const localHint = $("settingsAiLocalHint");
  const advancedBadge = $("settingsAiAdvancedBadge");
  const labBadge = $("settingsAiLabBadge");
  if (!badges || !localHint || !advancedBadge || !labBadge) return;

  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  const localMode = runtimeMode === "local_only" || runtimeMode === "hybrid";
  const localStatus = String(settingsState.ai.localRuntimeStatus || "unknown").trim() || "unknown";
  const models = Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
  const setupGuide = currentOllamaSetupGuide();
  const guideAction = String(setupGuide?.nextAction || "").trim();
  const guideSteps = Array.isArray(setupGuide?.steps) ? setupGuide.steps : [];
  const guideRecommendedModel = primaryRecommendedOllamaModelName();
  const localModel = String(settingsState.ai.localModel || "").trim();
  const modelPack = String(settingsState.ai.modelPack || "").trim();
  const providerId = currentAiProviderId();
  const providerDisplayName = String(settingsState.ai.routePreview?.provider?.displayName || "").trim();
  const localFlowActive = isAiLocalFlowActive({
    runtimeMode,
    modelPack,
    providerId
  });
  const localDefaultsProviderId = localFlowActive ? preferredLocalProviderPresetForSelection() : providerId;
  const providerLabel = providerId === "platform_managed_openai"
    ? "平台托管 OpenAI"
    : providerDisplayName === "Ollama Local"
      ? "本地 AI"
      : providerDisplayName || providerId || "未选择服务";
  const routeModelRef = String(settingsState.ai.routePreview?.route?.modelRef || "").trim();
  const endpointOverride = String(settingsState.ai.providerEndpointUrl || "").trim();
  const healthOverride = String(settingsState.ai.providerHealthEndpointUrl || "").trim();
  const defaultEndpoint = defaultProviderEndpointUrl(localDefaultsProviderId) || (localFlowActive ? OLLAMA_CHAT_ENDPOINT_URL : "");
  const defaultHealthEndpoint =
    defaultProviderHealthEndpointUrl(localDefaultsProviderId, endpointOverride || defaultEndpoint) ||
    (localFlowActive ? OLLAMA_HEALTH_ENDPOINT_URL : "");
  const implicitLocalModelRef =
    localModel && (runtimeMode === "local_only" || isLocalModelPack(modelPack))
      ? `${preferredLocalProviderPresetForSelection()}:${localModel}`
      : "";
  const implicitLocalAdvancedOverride =
    Boolean(settingsState.ai.routePreview?.route?.advancedOverride) &&
    Boolean(implicitLocalModelRef) &&
    routeModelRef === implicitLocalModelRef;
  const advancedFields = [
    String(settingsState.ai.advancedModelRef || "").trim() !== implicitLocalModelRef
      ? String(settingsState.ai.advancedModelRef || "").trim()
      : "",
    String(settingsState.ai.secretRef || "").trim(),
    endpointOverride && endpointOverride !== defaultEndpoint ? endpointOverride : "",
    healthOverride && healthOverride !== defaultHealthEndpoint ? healthOverride : ""
  ].filter(Boolean).length;
  const hasMeaningfulAdvancedOverride = Boolean(settingsState.ai.routePreview?.route?.advancedOverride) && !implicitLocalAdvancedOverride;

  const runtimeModeLabel = runtimeMode === "local_only"
    ? "只用本地模型"
    : runtimeMode === "hybrid"
      ? "本地优先"
      : runtimeMode === "cloud_only"
        ? "只用远程模型"
        : "自动选择";
  const localRuntimeLabel = ollamaRuntimeStateLabel();

  const primaryRuntimeModeLabel = runtimeMode === "hybrid" ? "自动选择" : runtimeModeLabel;
  const badgeItems = [
    { tone: localFlowActive ? "ok" : "muted", text: `使用方式 ${primaryRuntimeModeLabel}` }
  ];
  if (localFlowActive) {
    badgeItems.push({
      tone: localStatus === "available" ? "ok" : localStatus === "unavailable" ? "warn" : "muted",
      text: localRuntimeLabel
    });
    if (localModel) {
      badgeItems.push({ tone: "ok", text: `本地模型 ${localModel}` });
    } else if (models.length) {
      badgeItems.push({ tone: "muted", text: `${models.length} 个本地模型` });
    }
  } else {
    badgeItems.push({ tone: providerId.includes("local") ? "ok" : "", text: providerLabel });
  }
  badges.innerHTML = badgeItems
    .map((item) => `<span class="settings-stat-badge ${item.tone ? escapeHtml(item.tone) : ""}">${escapeHtml(item.text)}</span>`)
    .join("");

  let setupTitle = "当前适合日常研究任务";
  let setupBody = "默认设置会自动选择合适的服务，适合阅读、摘要、整理和一般写作辅助。需要处理敏感材料时，请切到“只用本地模型”。";
  let quickstartLabel = "自动推荐";
  let helperText = "只有需要本地模型时，才需要安装并检测本地 AI；日常研究可以先保持自动。";
  let steps = [
    { state: "complete", title: "默认方案已可使用", note: "不需要先理解模型参数，也不需要安装本地环境。" },
    { state: "current", title: "需要私密处理时再切换", note: "把 AI 使用方式改为“只用本地模型”，再按提示检测本地模型。" },
    { state: "pending", title: "用一句短句试运行", note: "保存设置后，发一句不含敏感内容的测试语确认连接。" }
  ];
  let homeSteps = [
    { state: "current", title: "安装并启动本地 AI" },
    { state: "pending", title: `安装推荐模型 ${guideRecommendedModel}` },
    { state: "pending", title: "试运行一句短句" }
  ];

  if (localFlowActive) {
    helperText = "本地模式下，推荐顺序是：检测本地 AI，下载或选择模型，最后用一句短句试运行。";
    if (settingsState.ai.localRuntimeChecking) {
      setupTitle = "正在检测本地模型环境";
      setupBody = "研思录正在检查这台电脑上的本地 AI 服务和已安装模型，通常几秒内会返回状态。";
      quickstartLabel = "检测中";
      steps = [
        { state: "complete", title: "已进入本地模型流程", note: `${runtimeMode === "hybrid" ? "当前是本地优先模式" : "当前只使用本地模型"}。` },
        { state: "current", title: "正在检测本地 AI", note: "如果等待过久，先确认本地 AI 应用是否已经启动。" },
        { state: "pending", title: "检测完成后选择或下载模型", note: `建议优先从 ${guideRecommendedModel} 开始。` }
      ];
    } else if (localStatus !== "available") {
      const installedNotRunning = settingsState.ai.localRuntimeReadinessStatus === "installed_not_running";
      setupTitle = "先让本地 AI 在这台电脑上启动";
      setupBody = installedNotRunning
        ? "已检测到本地 AI 运行环境，但服务还没有运行。可以在这里启动本地 AI，或先手动打开本地 AI 应用。"
        : "当前还没有连上本地 AI。先安装并启动本地 AI，再回来点“检测本地 AI”。";
      quickstartLabel = installedNotRunning ? "等待启动" : "等待本地 AI";
      steps = [
        { state: "complete", title: "已进入本地模型流程", note: `${runtimeMode === "hybrid" ? "本地优先已启用，敏感资料仍建议切到只用本地模型。" : "AI 任务会尽量留在这台电脑上。"} ` },
        { state: "current", title: installedNotRunning ? "启动本地 AI" : "下载并启动本地 AI", note: installedNotRunning ? "点击“启动本地 AI”，或手动打开本地 AI 应用。" : "如果还没安装，点“下载本地 AI 运行环境”；安装后保持它在后台运行。" },
        { state: "pending", title: "回到研思录，点“检测本地 AI”", note: "检测成功后，研思录会自动列出可选的本地模型。" }
      ];
      if (guideAction === "install_or_start_ollama" && guideSteps.length) {
        steps = [
          { state: "complete", title: "已切到本地模型流程", note: runtimeMode === "hybrid" ? "本地优先已启用，敏感资料仍建议切到只用本地模型。" : "已切到只用本地模型，本地模型就绪前不会默认使用远程服务。" },
          { state: "current", title: "下载并启动本地 AI", note: "安装后保持本地 AI 在后台运行。" },
          { state: "pending", title: guideSteps[2] || "回到研思录重新检测", note: "检测成功后会显示本地模型列表。" }
        ];
      }
      helperText = installedNotRunning
        ? "启动只会尝试运行已安装的本地 AI，不会安装系统软件。"
        : "如果刚装好本地 AI 但仍显示未连接，先确认本地 AI 应用已经启动。";
      homeSteps = [
        { state: "current", title: "安装并启动本地 AI" },
        { state: "pending", title: `安装推荐模型 ${guideRecommendedModel}` },
        { state: "pending", title: "试运行一句短句" }
      ];
    } else if (!models.length) {
      setupTitle = "本地 AI 已连上，还差一个本地模型";
      setupBody = `本地 AI 已经可用，但这台电脑里还没有可运行的模型。直接点“下载 ${guideRecommendedModel}”即可开始。`;
      quickstartLabel = "等待模型";
      steps = [
        { state: "complete", title: "本地 AI 已连接", note: "研思录已经能访问这台电脑上的本地模型服务。" },
        { state: "current", title: "下载第一个本地模型", note: `推荐先从 ${guideRecommendedModel} 开始，兼顾效果和资源占用。` },
        { state: "pending", title: "下载后回来选择它并测试", note: "模型下载完成后，下面的本地模型下拉框会自动出现选项。" }
      ];
      if (guideAction === "pull_recommended_model" && guideSteps.length) {
        steps = [
          { state: "complete", title: "本地 AI 已连接", note: "本地推理服务在线。" },
          { state: "current", title: guideSteps[0] || `下载推荐模型 ${guideRecommendedModel}`, note: guideSteps[1] || "下载完成后会自动设为本地模型。" },
          { state: "pending", title: guideSteps[2] || "运行一次测试聊天", note: "测试通过后即可开始使用本地模型。" }
        ];
      }
      homeSteps = [
        { state: "complete", title: "本地 AI 已启动" },
        { state: "current", title: `安装推荐模型 ${guideRecommendedModel}` },
        { state: "pending", title: "试运行一句短句" }
      ];
    } else if (!installedLocalModelReady(localModel)) {
      setupTitle = "本地模型已经可选，再选一个就能开始";
      setupBody = localModel
        ? `当前选择的 ${localModel} 没有在本地模型列表里检测到。请重新检测，或从下拉框里选一个已安装模型。`
        : "本地 AI 和模型都已经准备好了。现在从“本地模型”里选一个即可。";
      quickstartLabel = "选择模型";
      steps = [
        { state: "complete", title: "本地 AI 已连接", note: "本地推理服务在线。" },
        { state: "complete", title: "至少有一个本地模型可用", note: `当前检测到 ${models.length} 个模型。` },
        { state: "current", title: localModel ? "重新选择已安装模型" : "从下拉框里选一个模型", note: "选中后建议试运行一次，确认当前确实走本地。" }
      ];
      if (guideAction === "select_or_test_model" && guideSteps.length) {
        steps = [
          { state: "complete", title: "本地 AI 已连接", note: "本地推理服务在线。" },
          { state: "current", title: guideSteps[0] || "选择一个本地模型", note: guideSteps[1] || "选择后会保存当前服务配置。" },
          { state: "pending", title: guideSteps[2] || "运行一次测试聊天", note: "确认返回来自当前模型。" }
        ];
      }
      homeSteps = [
        { state: "complete", title: "本地 AI 已启动" },
        { state: "complete", title: "本地模型已安装" },
        { state: "current", title: "选择模型并试运行" }
      ];
    } else {
      setupTitle = "本地模型已经就绪";
      setupBody = runtimeMode === "hybrid"
        ? `当前已选中 ${localModel}。本地优先是高级模式，部分任务仍可能使用远程；敏感资料请切换到“只用本地模型”。`
        : `当前已选中 ${localModel}。AI 任务会尽量留在这台电脑上，不再默认依赖远程服务。`;
      quickstartLabel = "本地已就绪";
      steps = [
        { state: "complete", title: "已切到本地模型流程", note: `${runtimeMode === "hybrid" ? "当前是本地优先模式" : "当前只使用本地模型"}。` },
        { state: "complete", title: "本地 AI 和模型都已准备好", note: `当前使用 ${localModel}。` },
        { state: settingsState.ai.testOutput ? "complete" : "current", title: "试运行一次确认连接", note: settingsState.ai.testOutput ? "最近一次测试已经返回结果。" : "现在适合试运行一次，确认内容从本地模型返回。" }
      ];
      homeSteps = [
        { state: "complete", title: "本地 AI 已启动" },
        { state: "complete", title: `本地模型 ${localModel}` },
        { state: settingsState.ai.testOutput ? "complete" : "current", title: "试运行一句短句" }
      ];
    }
  }

  if (title) title.textContent = setupTitle;
  if (body) body.textContent = setupBody;
  if (quickstartStatus) {
    quickstartStatus.textContent = quickstartLabel;
    quickstartStatus.classList.toggle("ok", quickstartLabel === "本地已就绪");
    quickstartStatus.classList.toggle("warn", ["等待本地 AI", "等待启动", "等待模型", "选择模型", "检测中"].includes(quickstartLabel));
    quickstartStatus.classList.toggle("muted", quickstartLabel === "自动推荐");
  }
  if (localHomeSteps) {
    localHomeSteps.innerHTML = homeSteps
      .map((step) => `<span class="settings-ai-local-home-step ${escapeHtml(step.state === "complete" ? "is-complete" : step.state === "current" ? "is-current" : "")}">${escapeHtml(step.title)}</span>`)
      .join("");
  }
  const localGuide = $("settingsAiLocalGuide");
  const localGuideBadge = $("settingsAiLocalGuideBadge");
  const localGuideTitle = $("settingsAiLocalGuideTitle");
  const localGuideBody = $("settingsAiLocalGuideBody");
  const localGuideHint = $("settingsAiLocalGuideHint");
  let localGuideState = "idle";
  let localGuideBadgeText = "第 1 步";
  let localGuideTone = "muted";
  let localGuideTitleText = "先启用本地大模型";
  let localGuideBodyText = "点击“使用本地大模型”，然后检测这台电脑的本地 AI 环境是否已经安装并运行。";
  let localGuideHintText = "没有安装时，会在这里给出官方下载入口。";
  if (localFlowActive) {
    if (settingsState.ai.localRuntimeChecking) {
      localGuideState = "checking";
      localGuideBadgeText = "正在检测";
      localGuideTone = "warn";
      localGuideTitleText = "正在检查本地 AI 是否可用";
      localGuideBodyText = "研思录正在检查这台电脑上的本地 AI 服务和已安装模型。";
      localGuideHintText = "如果长时间没有结果，先确认本地 AI 应用是否已经启动。";
    } else if (localStatus !== "available") {
      const installedNotRunning = settingsState.ai.localRuntimeReadinessStatus === "installed_not_running";
      localGuideState = "blocked";
      localGuideBadgeText = installedNotRunning ? "需要启动" : "需要安装";
      localGuideTone = "warn";
      localGuideTitleText = installedNotRunning ? "本地 AI 已安装，但还没有运行" : "还没有检测到本地 AI";
      localGuideBodyText = installedNotRunning
        ? "可以点击“启动本地 AI”，也可以手动打开本地 AI 应用。研思录不会静默安装系统软件。"
        : "先下载并安装本地 AI 运行环境，安装后保持它在后台运行，再回到这里点“检测本地 AI”。";
      localGuideHintText = installedNotRunning
        ? "启动失败时，请手动打开本地 AI 应用后重新检测。"
        : `下载地址：${String(setupGuide?.installUrl || "https://ollama.com/download").trim() || "https://ollama.com/download"}`;
    } else if (!models.length) {
      localGuideState = "blocked";
      localGuideBadgeText = "需要模型";
      localGuideTone = "warn";
      localGuideTitleText = "本地 AI 已启动，还缺一个本地模型";
      localGuideBodyText = `点击“下载 ${guideRecommendedModel}”，研思录会把推荐模型下载到这台电脑。`;
      localGuideHintText = `推荐顺序：${ollamaRecommendationHintText()}。下载可能需要几分钟。`;
    } else if (!installedLocalModelReady(localModel)) {
      localGuideState = "idle";
      localGuideBadgeText = "选择模型";
      localGuideTone = "warn";
      localGuideTitleText = localModel ? "当前选择的模型没有检测到" : "本地 AI 已可用，选择一个本地模型";
      localGuideBodyText = localModel
        ? `${localModel} 不在当前本地模型列表里。请重新检测，或从下面选择一个已安装模型。`
        : `当前检测到 ${models.length} 个模型。从下面的“本地模型”下拉框里选一个即可。`;
      localGuideHintText = "选中后建议打开“试运行”，确认返回确实来自本地模型。";
    } else {
      localGuideState = "ready";
      localGuideBadgeText = "已就绪";
      localGuideTone = "ok";
      localGuideTitleText = `已可用：${localModel}`;
      localGuideBodyText = "适合本机处理研究笔记、摘要和整理。需要更换时直接在下方选择模型。";
      localGuideHintText = "";
    }
  }
  const localSetupReady = localFlowActive && installedLocalModelReady(localModel);
  if (localHomeSteps) localHomeSteps.classList.toggle("hidden", localSetupReady);
  if (localGuide) localGuide.dataset.state = localGuideState;
  if (localGuideBadge) {
    localGuideBadge.textContent = localGuideBadgeText;
    localGuideBadge.classList.toggle("ok", localGuideTone === "ok");
    localGuideBadge.classList.toggle("warn", localGuideTone === "warn");
    localGuideBadge.classList.toggle("muted", localGuideTone === "muted");
  }
  if (localGuideTitle) localGuideTitle.textContent = localGuideTitleText;
  if (localGuideBody) localGuideBody.textContent = localGuideBodyText;
  if (localGuideHint) localGuideHint.textContent = localGuideHintText;
  if (stepsEl) {
    stepsEl.classList.toggle("hidden", localSetupReady);
    stepsEl.innerHTML = steps
      .map((step, index) => `
        <div class="settings-ai-step ${escapeHtml(step.state === "complete" ? "is-complete" : step.state === "current" ? "is-current" : "")}">
          <span class="settings-ai-step-index">${step.state === "complete" ? "✓" : index + 1}</span>
          <div>
            <span class="settings-ai-step-title">${escapeHtml(step.title)}</span>
            <span class="settings-ai-step-note">${escapeHtml(step.note)}</span>
          </div>
        </div>
      `)
      .join("");
  }
  localHint.textContent = helperText;
  localHint.classList.toggle("hidden", localSetupReady);

  advancedBadge.textContent = advancedFields
    ? `${advancedFields} 项已填写`
    : hasMeaningfulAdvancedOverride
      ? "已手动指定"
      : "保持默认";
  advancedBadge.classList.toggle("warn", advancedFields > 0 || hasMeaningfulAdvancedOverride);
  advancedBadge.classList.toggle("muted", !(advancedFields > 0 || hasMeaningfulAdvancedOverride));

  labBadge.textContent = settingsState.ai.testRunning
    ? "运行中"
    : settingsState.ai.testOutput
      ? "已有结果"
      : "等待运行";
  labBadge.classList.toggle("warn", settingsState.ai.testRunning);
  labBadge.classList.toggle("ok", Boolean(settingsState.ai.testOutput) && !settingsState.ai.testRunning);
  labBadge.classList.toggle("muted", !settingsState.ai.testRunning && !settingsState.ai.testOutput);

  const hybridToggle = $("settingsAiHybridToggle");
  if (hybridToggle) {
    const hybridActive = runtimeMode === "hybrid";
    hybridToggle.textContent = hybridActive ? "退出本地优先" : "启用本地优先";
    hybridToggle.classList.toggle("primary", hybridActive);
    hybridToggle.classList.toggle("is-subtle", !hybridActive);
  }
}

function renderAiLocalModelRecommendations() {
  const recommendationsEl = $("settingsAiLocalModelRecommendations");
  if (!recommendationsEl) return;

  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  const showLocalModel = isAiLocalFlowActive({
    runtimeMode,
    modelPack: settingsState.ai.modelPack,
    providerId: currentAiProviderId()
  });
  const runtimeAvailable = settingsState.ai.localRuntimeStatus === "available";
  const runtimeBusy = settingsState.ai.localRuntimeChecking
    || settingsState.ai.localRuntimeStarting
    || settingsState.ai.localRuntimeStopping
    || settingsState.ai.localRuntimePulling;
  recommendationsEl.classList.remove("hidden");

  const models = Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
  const installedNames = models.map((model) => String(model?.name || model || "").trim()).filter(Boolean);
  const catalogProfiles = ollamaModelRecommendationProfiles(currentOllamaModelTiers());
  const recommendedNames = new Set(catalogProfiles.map((item) => item.name.toLowerCase()));
  const extraInstalledProfiles = installedNames
    .filter((name) => !recommendedNames.has(name.toLowerCase()))
    .map((name) => localModelDisplayProfile(name, currentOllamaModelTiers()));
  const profiles = [
    ...catalogProfiles.map((item) => localModelDisplayProfile(item.name, currentOllamaModelTiers())),
    ...extraInstalledProfiles
  ];
  const installedCount = profiles.filter((item) => hasLocalModel(item.name)).length;
  const selectedModel = String(settingsState.ai.localModel || "").trim();
  const summaryText = !showLocalModel
    ? "可选本地模型"
    : runtimeAvailable
      ? installedCount
        ? `已检测到 ${installedCount} 个可用模型`
        : `建议先下载 ${primaryRecommendedOllamaModelName()}`
      : "先检测本地 AI，再下载或切换模型";
  const helperText = !showLocalModel
    ? "先启用本地模式，之后在这里下载、选择和试运行。"
    : runtimeAvailable
      ? "当前按内置模型目录展示；以后可按语言、模型来源和本机配置自动调整推荐。"
      : "本地 AI 连接后，这些模型会直接变成下载或切换按钮。";
  recommendationsEl.innerHTML = `
    <div class="settings-ai-local-recommendations-head">
      <span>${escapeHtml(summaryText)}</span>
      <small>${escapeHtml(helperText)}</small>
    </div>
    <div class="settings-ai-local-recommendation-list">
      ${profiles.map((item) => {
        const installed = hasLocalModel(item.name);
        const selected = installed && selectedModel.toLowerCase() === item.name.toLowerCase();
        let action = "";
        if (runtimeBusy) {
          action = `<button class="mini-btn is-subtle" type="button" disabled>处理中</button>`;
        } else if (!showLocalModel) {
          action = `<button class="mini-btn is-subtle" type="button" data-settings-ai-quick-setup="local">启用本地</button>`;
        } else if (!runtimeAvailable) {
          action = `<button class="mini-btn is-subtle" type="button" data-settings-ai-detect-ollama>检测本地 AI</button>`;
        } else if (installed && selected) {
          action = `<span class="settings-ai-local-recommendation-current">当前使用</span>`;
        } else if (installed && item.verified) {
          action = `<button class="mini-btn is-subtle" type="button" data-settings-ai-select-local-model="${escapeHtml(item.name)}">切换</button>`;
        } else if (installed) {
          action = `<span class="settings-ai-local-recommendation-current">仅检测</span>`;
        } else {
          action = `<button class="mini-btn is-subtle" type="button" data-settings-ai-pull-local-model="${escapeHtml(item.name)}">下载</button>`;
        }
        const command = item.downloadCommand || `ollama pull ${item.name}`;
        return `
          <div class="settings-ai-local-recommendation ${installed ? "is-installed" : ""} ${selected ? "is-selected" : ""} ${item.verified ? "" : "is-unverified"} ${!runtimeAvailable ? "is-preview" : ""}">
            <div class="settings-ai-local-recommendation-main">
              <div class="settings-ai-local-recommendation-title">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml(item.role || item.label)}</span>
              </div>
              <div class="settings-ai-local-recommendation-note">${escapeHtml(item.note)}</div>
              <div class="settings-ai-local-recommendation-meta">
                <span>${escapeHtml(installed ? "已安装" : runtimeAvailable ? "未安装" : "待检测")}</span>
                <span>${escapeHtml(item.sizeHint || item.resource || (item.verified ? "已推荐" : "未验证"))}</span>
                ${item.resource && item.resource !== item.sizeHint ? `<span>${escapeHtml(item.resource)}</span>` : ""}
                ${item.hardwareHint ? `<span>${escapeHtml(item.hardwareHint)}</span>` : ""}
                <button class="settings-ai-command-copy" type="button" data-settings-ai-copy-command="${escapeHtml(command)}" aria-label="复制 ${escapeHtml(item.name)} 下载命令">复制命令</button>
              </div>
            </div>
            <div class="settings-ai-local-recommendation-action">${action}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderAiLocalModelControls() {
  const runtimeMode = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  const runtimeSelect = $("settingsAiRuntimeMode");
  const primaryRuntimeMode = runtimeMode === "hybrid" ? "auto" : runtimeMode;
  if (runtimeSelect && runtimeSelect.value !== primaryRuntimeMode) runtimeSelect.value = primaryRuntimeMode;

  const modelSelect = $("settingsAiLocalModel");
  const modelLabel = $("settingsAiLocalModelLabel");
  const providerId = currentAiProviderId();
  const showLocalModel = isAiLocalFlowActive({
    runtimeMode,
    modelPack: settingsState.ai.modelPack,
    providerId
  });
  const localSetupActive = showLocalModel && (runtimeMode === "local_only" || runtimeMode === "hybrid" || isLocalModelPack(settingsState.ai.modelPack));
  const runtimeAvailable = settingsState.ai.localRuntimeStatus === "available";
  modelSelect?.classList.toggle("hidden", !showLocalModel);
  modelLabel?.classList.toggle("hidden", !showLocalModel);
  if (modelSelect) {
    const models = Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : [];
    const selectedModel = String(settingsState.ai.localModel || "").trim();
    const catalogNames = new Set(ollamaModelRecommendationProfiles(currentOllamaModelTiers()).map((item) => item.name.toLowerCase()));
    const names = models
      .map((model) => String(model?.name || "").trim())
      .filter((name) => name && catalogNames.has(name.toLowerCase()));
    const optionNames = selectedModel && !names.includes(selectedModel) ? [selectedModel, ...names] : names;
    if (settingsState.ai.localRuntimeChecking) {
      modelSelect.innerHTML = `<option value="">正在检测本地 AI...</option>`;
    } else if (optionNames.length) {
      modelSelect.innerHTML = [
        `<option value="">自动选择本地模型</option>`,
        ...optionNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      ].join("");
      modelSelect.value = selectedModel;
    } else {
      modelSelect.innerHTML = `<option value="">未检测到本地模型</option>`;
    }
    modelSelect.disabled = !showLocalModel || settingsState.ai.localRuntimeChecking;
  }

  const detectButton = $("settingsAiDetectOllama");
  const startButton = $("settingsAiStartOllama");
  const stopButton = $("settingsAiStopOllama");
  const useLocalButton = $("settingsAiUseLocalSetup");
  const managedStopPending = settingsState.ai.localRuntimeManagedStopPending === true;
  const runtimeBusy = settingsState.ai.localRuntimeChecking
    || settingsState.ai.localRuntimeStarting
    || settingsState.ai.localRuntimeStopping
    || settingsState.ai.localRuntimePulling;
  if (useLocalButton) {
    useLocalButton.classList.toggle("hidden", localSetupActive);
    useLocalButton.disabled = localSetupActive || runtimeBusy;
    useLocalButton.textContent = "使用本地大模型";
    useLocalButton.classList.toggle("primary", !localSetupActive);
    useLocalButton.classList.toggle("is-subtle", localSetupActive);
  }
  if (detectButton) {
    detectButton.classList.toggle("hidden", !localSetupActive);
    detectButton.disabled = !localSetupActive || runtimeBusy;
    detectButton.textContent = !localSetupActive
      ? "先启用本地模式"
      : settingsState.ai.localRuntimeChecking
        ? "正在检测本地 AI..."
        : runtimeAvailable
          ? "重新检测本地 AI"
          : "检测本地 AI";
  }
  if (startButton) {
    const canStartOllama = settingsState.ai.localRuntimeReadinessStatus === "installed_not_running";
    startButton.classList.toggle("hidden", !localSetupActive || runtimeAvailable || managedStopPending || !canStartOllama);
    startButton.disabled = !localSetupActive || runtimeAvailable || managedStopPending || !canStartOllama || runtimeBusy;
    startButton.textContent = settingsState.ai.localRuntimeStarting ? "正在启动..." : "启动本地 AI";
  }
  if (stopButton) {
    const canStopOllama = runtimeAvailable || managedStopPending;
    stopButton.classList.toggle("hidden", !localSetupActive || !canStopOllama);
    stopButton.disabled = !localSetupActive || !canStopOllama || runtimeBusy;
    stopButton.textContent = settingsState.ai.localRuntimeStopping
      ? "正在停止..."
      : managedStopPending
        ? "继续停止"
        : "停止本地 AI";
  }

  $("settingsAiDownloadOllama")?.classList.toggle("hidden", !localSetupActive || settingsState.ai.localRuntimeStatus === "available");
  const downloadLink = $("settingsAiDownloadOllama");
  if (downloadLink) {
    const guide = currentOllamaSetupGuide();
    const installUrl = String(guide?.installUrl || "https://ollama.com/download").trim() || "https://ollama.com/download";
    if (downloadLink.getAttribute("href") !== installUrl) downloadLink.setAttribute("href", installUrl);
  }
  const copyInstallCommandButton = $("settingsAiCopyOllamaInstallCommand");
  if (copyInstallCommandButton) {
    const guide = currentOllamaSetupGuide();
    const installCommand = Array.isArray(guide?.commands) ? String(guide.commands[0] || "").trim() : "";
    copyInstallCommandButton.classList.toggle("hidden", !localSetupActive || runtimeAvailable || !installCommand);
    copyInstallCommandButton.disabled = !localSetupActive || runtimeAvailable || !installCommand || runtimeBusy;
    if (installCommand) copyInstallCommandButton.dataset.command = installCommand;
  }

  const pullButton = $("settingsAiPullOllamaModel");
  if (pullButton) {
    const modelName = ollamaPullModelName();
    const recommendation = ollamaRecommendationForModel(modelName, currentOllamaModelTiers());
    const installed = hasLocalModel(modelName);
    const hasAnyLocalModel = (Array.isArray(settingsState.ai.localRuntimeModels) ? settingsState.ai.localRuntimeModels : []).length > 0;
    pullButton.classList.toggle("hidden", !localSetupActive || !runtimeAvailable || installed);
    pullButton.classList.toggle("primary", !hasAnyLocalModel);
    pullButton.classList.toggle("is-subtle", hasAnyLocalModel);
    pullButton.disabled = !localSetupActive || !runtimeAvailable || runtimeBusy || installed;
    pullButton.textContent = settingsState.ai.localRuntimePulling
      ? `正在下载 ${modelName}...`
      : installed
        ? `已安装 ${modelName}`
        : hasAnyLocalModel
          ? `下载 ${modelName}${recommendation ? `（${recommendation.label}）` : ""}`
          : `下载推荐模型 ${modelName}`;
  }
  renderAiLocalModelRecommendations();
}

function renderAiProviderConfigControls() {
  const providerId = currentAiProviderId();
  const remoteConfigurable = isRemoteConfigurableProviderId(providerId);
  const remoteModelInput = $("settingsAiRemoteRuntimeModel");
  if (remoteModelInput) {
    const stored = String(settingsState.ai.remoteRuntimeModel || "").trim();
    if (String(remoteModelInput.value || "") !== stored) remoteModelInput.value = stored;
    remoteModelInput.disabled = !remoteConfigurable;
    remoteModelInput.placeholder = remoteConfigurable
      ? "服务商提供的模型名，例如：deepseek-chat、minicpm"
      : "当前方案不需要填写远程模型";
  }

  const endpointInput = $("settingsAiProviderEndpointUrl");
  if (endpointInput) {
    const stored = String(settingsState.ai.providerEndpointUrl || "").trim();
    if (String(endpointInput.value || "") !== stored) endpointInput.value = stored;
  }
  const healthEndpointInput = $("settingsAiProviderHealthEndpointUrl");
  if (healthEndpointInput) {
    const stored = String(settingsState.ai.providerHealthEndpointUrl || "").trim();
    if (String(healthEndpointInput.value || "") !== stored) healthEndpointInput.value = stored;
  }

  const config = activeAiProviderConfig();
  const healthRecord = settingsState.ai.providerHealthResult?.record || null;
  const badge = $("settingsAiProviderConfigBadge");
  if (badge) {
    badge.classList.toggle("ok", Boolean(config));
    badge.classList.toggle("warn", !config && providerId !== "platform_managed_openai");
    if (healthRecord) {
      badge.classList.toggle("ok", healthRecord.status === "healthy");
      badge.classList.toggle("warn", healthRecord.status !== "healthy");
    }
    const draftTouched = settingsState.ai.providerDraftTouched || {};
    const endpointValue = draftTouched.providerEndpointUrl
      ? settingsState.ai.providerEndpointUrl
      : settingsState.ai.providerEndpointUrl || config?.endpointUrl || config?.endpoint_url || "";
    const secretValue = draftTouched.secretRef
      ? settingsState.ai.secretRef
      : settingsState.ai.secretRef || config?.secretRef || config?.secret_ref || "";
    const remoteModelValue = draftTouched.remoteRuntimeModel
      ? settingsState.ai.remoteRuntimeModel
      : settingsState.ai.remoteRuntimeModel || remoteRuntimeModelFromMap(providerId, config?.runtimeModelMap || config?.runtime_model_map || {}) || "";
    const endpointReady = Boolean(String(endpointValue || "").trim());
    const secretReady = Boolean(String(secretValue || "").trim());
    const remoteModelReady = Boolean(String(remoteModelValue || "").trim());
    const configReady = remoteConfigurable
      ? endpointReady && remoteModelReady
      : endpointReady || secretReady || remoteModelReady;
    if (settingsState.ai.providerHealthChecking) badge.textContent = "测试中";
    else if (healthRecord?.status === "healthy") badge.textContent = `健康 ${healthRecord.latencyMs || 0}ms`;
    else if (healthRecord) badge.textContent = `状态 ${healthRecord.status || "未检测"}`;
    else if (settingsState.ai.providerConfigSaving) badge.textContent = "保存中";
    else if (settingsState.ai.providerConfigError) badge.textContent = "配置失败";
    else if (providerId === "platform_managed_openai") badge.textContent = "平台托管";
    else if (config && String(config.status || "").trim() === "disabled") badge.textContent = "未启用";
    else if (config) badge.textContent = configReady ? "已配置" : "未完成";
    else badge.textContent = "未配置";
  }

  const saveButton = $("settingsAiSaveProviderConfig");
  if (saveButton) {
    const platformManaged = providerId === "platform_managed_openai";
    saveButton.disabled = settingsState.ai.providerConfigSaving || settingsState.ai.providerHealthChecking || !providerId || platformManaged;
    saveButton.textContent = settingsState.ai.providerConfigSaving
      ? "保存中..."
      : platformManaged
        ? "默认服务无需保存"
        : "保存服务连接";
  }

  const checkButton = $("settingsAiCheckProviderHealth");
  if (checkButton) {
    const platformManaged = providerId === "platform_managed_openai";
    const endpointUrl = String(settingsState.ai.providerEndpointUrl || defaultProviderEndpointUrl(providerId) || "").trim();
    const healthEndpointUrl = String(
      settingsState.ai.providerHealthEndpointUrl || defaultProviderHealthEndpointUrl(providerId, endpointUrl) || ""
    ).trim();
    checkButton.disabled =
      settingsState.ai.providerConfigSaving ||
      settingsState.ai.providerHealthChecking ||
      !providerId ||
      platformManaged ||
      !healthEndpointUrl;
    checkButton.textContent = settingsState.ai.providerHealthChecking
      ? "测试中..."
      : platformManaged
        ? "平台托管"
        : !healthEndpointUrl
          ? "填写检测地址后测试"
        : "测试服务连接";
  }
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
  const activeSection = normalizeSettingsSection(settingsState.activeSection);
  const activeItem = settingsDetailItemConfig(settingsState.activeItem);
  const vault = settingsState.vault;
  const chromeMap = settingsSectionChromeMap();
  const aiSummary = settingsAiOverviewSummary();
  const automationCount = Number(settingsState.ai.scheduledTasksTotal || 0) + Number(settingsState.ai.suggestionsTotal || 0);
  const mapStatusValue = $("settingsMapStatusValue");
  const overviewKicker = document.querySelector("#settingsPanel .settings-overview-kicker");
  const overviewTitle = document.querySelector("#settingsPanel .settings-overview-title");
  const overviewBody = document.querySelector("#settingsPanel .settings-overview-body");
  const overviewLabels = document.querySelectorAll("#settingsPanel .settings-overview-label");
  const mobileItemSelect = $("settingsMobileItemSelect");

  if (overviewKicker) overviewKicker.textContent = "Current Context";
  if (overviewTitle) {
    overviewTitle.textContent = "先看当前工作区与 AI 路线，再直接进入左栏参数入口。";
  }
  if (overviewBody) {
    overviewBody.textContent = "这里保留最小必要的上下文信息，避免重复解释设置结构；真正的参数切换和操作都放在下面的左栏与右侧工作区里。";
  }
  if (overviewLabels.length >= 3) {
    overviewLabels[0].textContent = "工作区";
    overviewLabels[1].textContent = "AI 路线";
    overviewLabels[2].textContent = "自动处理";
  }

  SETTINGS_SECTIONS.forEach((section) => {
    const pane = $(section.paneId);
    const button = $(section.buttonId);
    const badge = $(section.badgeId);
    const meta = $(section.metaId);
    const isActive = section.id === activeSection;
    pane?.classList.toggle("hidden", !isActive);
    button?.classList.toggle("is-active", isActive);
    button?.setAttribute("aria-pressed", isActive ? "true" : "false");
    if (badge) badge.textContent = chromeMap[section.id]?.badge || section.label;
    if (meta) meta.textContent = chromeMap[section.id]?.meta || section.label;
  });

  if (mapStatusValue) {
    mapStatusValue.textContent = activeItem.label;
  }
  if (mobileItemSelect) {
    const nextOptionsHtml = settingsMobileItemOptionsHtml();
    if (mobileItemSelect.innerHTML !== nextOptionsHtml) {
      mobileItemSelect.innerHTML = nextOptionsHtml;
    }
    mobileItemSelect.value = activeItem.id;
  }

  const workspaceName = $("settingsOverviewWorkspaceName");
  const workspaceMetaEl = $("settingsOverviewWorkspaceMeta");
  const aiRoute = $("settingsOverviewAiRoute");
  const aiMeta = $("settingsOverviewAiMeta");
  const automationValue = $("settingsOverviewAutomation");
  const automationMeta = $("settingsOverviewAutomationMeta");
  if (workspaceName) workspaceName.textContent = vault?.vaultPath ? settingsLeafLabel(vault.vaultPath) : "等待同步";
  if (workspaceMetaEl) {
    workspaceMetaEl.textContent = vault
      ? `${vault.initialized ? "已初始化" : "待初始化"} · ${vault.defaultVaultPath ? `默认：${settingsLeafLabel(vault.defaultVaultPath)}` : "等待默认路径"}`
      : (formatSettingsUserError(settingsState.error) || "笔记库状态会在这里汇总。");
  }
  if (aiRoute) aiRoute.textContent = aiSummary.value;
  if (aiMeta) aiMeta.textContent = aiSummary.meta || "当前使用的模型、服务和连接状态。";
  if (automationValue) automationValue.textContent = `${automationCount} 个待看项`;
  if (automationMeta) automationMeta.textContent = `待确认 ${Number(settingsState.ai.suggestionsTotal || 0)} / 后台任务 ${Number(settingsState.ai.scheduledTasksTotal || 0)}`;
}

function renderSettingsSidebarColumn() {
  const activeSection = normalizeSettingsSection(settingsState.activeSection);
  const activeItem = settingsDetailItemConfig(settingsState.activeItem);
  const config = settingsSectionConfig(activeSection);
  const chromeMap = settingsSectionChromeMap();
  const guidance = settingsSectionGuidanceMap()[activeSection] || {};
  const entryCard = $("settingsNavEntryCard");
  const navCardNote = document.querySelector("#settingsSectionNav")?.closest(".settings-nav-card")?.querySelector(".settings-nav-card-note");
  const introNote = $("settingsSidebarIntroNote");
  const focusPill = $("settingsSidebarFocusPill");
  const focusBody = $("settingsSidebarFocusBody");
  const checklist = $("settingsSidebarChecklist");

  entryCard?.classList.remove("hidden");
  if (introNote) {
    introNote.textContent = "先在左侧选中设置项，再在右侧修改这一项的具体参数。";
  }
  if (navCardNote) {
    navCardNote.textContent = "先在左侧选中设置项，再在右侧修改这一项的具体参数。";
  }
  if (focusPill) {
    const badge = chromeMap[activeSection]?.badge || activeItem.label;
    focusPill.textContent = `${activeItem.label} · ${badge}`;
  }
  if (focusBody) {
    focusBody.textContent = guidance.focus || "先在左栏选中当前参数域，再在右侧完成具体调整。";
  }
  if (checklist) {
    const notes = Array.isArray(guidance.notes) && guidance.notes.length > 0
      ? guidance.notes
      : ["当前参数会跟随笔记库同步。", "先确认状态，再执行写入操作。", "右侧区域只显示当前设置项内容。"];
    checklist.innerHTML = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  }
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
  const activeItem = settingsDetailItemConfig(settingsState.activeItem);
  const config = settingsSectionConfig(activeItem.sectionId);
  const visibleCardIds = new Set(activeItem.cardIds || []);
  SETTINGS_DETAIL_ITEMS.forEach((item) => {
    item.cardIds.forEach((cardId) => {
      const card = $(cardId);
      if (!card) return;
      const belongsToActivePane = item.sectionId === config.id;
      const visible = belongsToActivePane && visibleCardIds.has(cardId);
      card.classList.toggle("hidden", !visible);
    });
  });
  const pane = $(config.paneId);
  const paneTitle = pane?.querySelector(".settings-pane-title");
  const paneNote = pane?.querySelector(".settings-pane-note");
  if (paneTitle) paneTitle.textContent = activeItem.label;
  if (paneNote) paneNote.textContent = settingsItemSummary(activeItem.id);
}

function renderSettingsPanel() {
  syncRailSelectionState();
  ensureSettingsWorkbenchLayout();
  mountSettingsAutomationWorkspace(document);
  renderSettingsWorkbenchChrome();
  renderSettingsSidebarColumn();
  renderSettingsDetailFocus();
  const input = $("settingsVaultPath");
  const switchHint = $("settingsVaultSwitchHint");
  const switchButton = $("settingsSwitchVault");
  if (!input || !switchHint || !switchButton) return;
  const vault = settingsState.vault;
  if (vault?.vaultPath && !String(input.value || "").trim()) input.value = vault.vaultPath;
  if (vault) {
    switchHint.textContent = vault.vaultPath
      ? `当前使用：${settingsLeafLabel(vault.vaultPath)}${vault.initialized ? " · 已就绪" : ""}`
      : "选择一个真实存在的笔记库目录。";
    switchButton.textContent = "切换到这个路径";
  } else {
    const missingPath = settingsVaultPathMissing();
    switchHint.textContent = missingPath
      ? "当前路径已失效，请重新选一个笔记库目录。"
      : (formatSettingsUserError(settingsState.error) || "选择一个真实存在的笔记库目录。");
    switchButton.textContent = "选好后切换";
  }

  const feedbackBadge = $("settingsFeedbackRepoBadge");
  const feedbackDetail = $("settingsFeedbackDetail");
  const feedbackLink = $("settingsFeedbackLink");
  if (feedbackBadge) {
    feedbackBadge.textContent = FEEDBACK_REPOSITORY_READY ? FEEDBACK_REPOSITORY : "待绑定仓库";
    feedbackBadge.classList.toggle("ok", FEEDBACK_REPOSITORY_READY);
    feedbackBadge.classList.toggle("warn", !FEEDBACK_REPOSITORY_READY);
  }
  if (feedbackDetail) {
    feedbackDetail.textContent = FEEDBACK_REPOSITORY_READY
      ? "当前会打开公开反馈页，并自动带上版本、模块和页面上下文；提交前请检查是否包含私人信息。"
      : "仓库名已经建议为 yansilu-feedback。把 prototype-app.js 里的 GitHub owner 补上后即可启用。";
  }
  if (feedbackLink) {
    const href = FEEDBACK_REPOSITORY_READY ? feedbackBaseUrl() : "#";
    feedbackLink.href = href;
    feedbackLink.textContent = FEEDBACK_REPOSITORY_READY ? "打开反馈页" : "等待填写真实 GitHub 仓库";
    feedbackLink.setAttribute("aria-disabled", FEEDBACK_REPOSITORY_READY ? "false" : "true");
  }

  renderUpdateSettingsCard({ $, escapeHtml, settingsState, appVersion: APP_VERSION });
  renderNoteTemplateSettingsCard("permanent");
  renderNoteTemplateSettingsCard("literature");

  renderAiLocalModelControls();
  renderAiSettingsExperience();

  const aiMode = $("settingsAiUserMode");
  if (aiMode) {
    const stored = String(settingsState.ai.userMode || "Auto").trim() || "Auto";
    if (aiMode.value !== stored) aiMode.value = stored;
  }
  const aiPack = $("settingsAiModelPack");
  if (aiPack) {
    const stored = String(settingsState.ai.modelPack || "Starter Auto").trim() || "Starter Auto";
    if (aiPack.value !== stored) aiPack.value = stored;
  }
  const aiRef = $("settingsAiAdvancedModelRef");
  if (aiRef) {
    const stored = String(settingsState.ai.advancedModelRef || "").trim();
    if (String(aiRef.value || "") !== stored) aiRef.value = stored;
  }
  const aiSecretRef = $("settingsAiSecretRef");
  if (aiSecretRef) {
    const stored = String(settingsState.ai.secretRef || "").trim();
    if (String(aiSecretRef.value || "") !== stored) aiSecretRef.value = stored;
  }
  renderAiProviderConfigControls();
  renderAiRoutePreview();
  renderScheduledTasksWorkspace();
  renderAiSuggestionsWorkspace();

  const testPrompt = $("settingsAiTestPrompt");
  if (testPrompt) {
    const stored = String(settingsState.ai.testPrompt || "").trim();
    if (String(testPrompt.value || "") !== stored) testPrompt.value = stored;
  }
  const testMeta = $("settingsAiTestChatMeta");
  const testRunButton = $("btnAiTestChatRun");
  const testBlockedReason = aiTestBlockedReason();
  if (testRunButton) {
    testRunButton.disabled = settingsState.ai.testRunning || Boolean(testBlockedReason);
    testRunButton.textContent = settingsState.ai.testRunning
      ? "运行中..."
      : testBlockedReason
        ? "先完成设置"
        : "运行";
    if (testBlockedReason) testRunButton.setAttribute("title", testBlockedReason);
    else testRunButton.removeAttribute("title");
  }
  if (testMeta) {
    const meta = settingsState.ai.testRunning ? "运行中..." : settingsState.ai.testMeta || testBlockedReason || "等待运行";
    testMeta.textContent = meta;
    testMeta.classList.toggle("warn", settingsState.ai.testRunning || Boolean(testBlockedReason));
  }
  const testOutput = $("settingsAiTestChatOutput");
  if (testOutput) {
    testOutput.textContent = settingsState.ai.testOutput || "（空）";
  }
  renderAiCanonicalDebugPanel();
  renderSettingsWorkbenchChrome();
  if (state.module === "settings") renderSidebarTitle();
  renderModuleWorkspaceHeader();
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
  return escapeHtml(String(text || ""))
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="preview-wikilink">[[$1]]</span>')
    .replace(/(^|\s)#([^\s#]+)/g, '$1<span class="preview-tag">#$2</span>');
}

function renderTemplateMarkdownPreviewHtml(source = "") {
  const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listItems = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${escapePreviewInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.map((item) => `<li>${escapePreviewInline(item)}</li>`).join("")}</ul>`);
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = String(rawLine || "");
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      html.push(`<h1>${escapePreviewInline(trimmed.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      html.push(`<h2>${escapePreviewInline(trimmed.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (/^>\s*/.test(trimmed)) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${escapePreviewInline(trimmed.replace(/^>\s*/, ""))}</blockquote>`);
      continue;
    }
    if (/^-\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^-\s+/, ""));
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return html.join("") || `<div class="markdown-preview-empty">还没有可预览的内容。</div>`;
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
  const cleanKind = String(kind || "").trim().toLowerCase() === "literature" ? "literature" : "permanent";
  const capitalizedKind = cleanKind === "literature" ? "Literature" : "Permanent";
  const stats = $(`settings${capitalizedKind}TemplateStats`);
  const summary = $(`settings${capitalizedKind}TemplateSummary`);
  const detail = $(`settings${capitalizedKind}TemplateDetail`);
  const editorField = $(`settings${capitalizedKind}TemplateEditor`);
  const saveButton = $(noteTemplateSaveButtonElementId(cleanKind));
  const feedback = $(noteTemplateFeedbackElementId(cleanKind));
  const feedbackText = $(noteTemplateFeedbackTextElementId(cleanKind));
  const stateEntry = settingsState.noteTemplates?.[cleanKind] || {
    text: defaultTemplateSourceForKind(cleanKind),
    draftText: defaultTemplateSourceForKind(cleanKind),
    draftActive: false,
    feedbackTone: "",
    feedbackText: ""
  };
  const copy = noteTemplateCardCopy(cleanKind);
  const savedSource = normalizeStoredNoteTemplateSource(stateEntry.text, cleanKind);
  const draftSource = normalizeDraftBuffer(stateEntry.draftText || "");
  const visibleSource = stateEntry.draftActive === true ? draftSource : savedSource;
  const validation = noteTemplateDraftValidation(cleanKind, normalizeNoteTemplateSource(visibleSource, cleanKind));

  if (stats) {
    const draftBadgeText = !validation.ok
      ? "当前草稿不可保存"
      : stateEntry.draftActive
        ? copy.statusClosed
        : "已保存";
    stats.innerHTML = `
      <span class="settings-stat-badge ok">${escapeHtml(copy.stats[0])}</span>
      <span class="settings-stat-badge">${escapeHtml(copy.stats[1])}</span>
      <span class="settings-stat-badge ${validation.ok ? (stateEntry.draftActive ? "warn" : "ok") : "warn"}">${escapeHtml(draftBadgeText)}</span>
    `;
  }
  if (summary) {
    summary.textContent = validation.ok
      ? copy.summaryOpen
      : `${copy.summaryOpen} 当前草稿还不能保存：${validation.message}`;
  }
  if (detail) detail.classList.remove("hidden");
  if (editorField && String(editorField.value || "") !== visibleSource) editorField.value = visibleSource;
  if (saveButton) {
    saveButton.disabled = !validation.ok;
    saveButton.title = validation.ok ? "" : validation.message;
    saveButton.dataset.tip = saveButton.title;
  }
  if (feedback && feedbackText) {
    const visibleFeedback = String(stateEntry.feedbackText || "").trim();
    feedback.classList.toggle("is-visible", Boolean(visibleFeedback));
    feedback.classList.toggle("ok", stateEntry.feedbackTone === "ok");
    feedback.classList.toggle("warn", stateEntry.feedbackTone === "warn");
    feedbackText.textContent = visibleFeedback;
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
  if (!indexCard?.id) return "查看中心问题、主题压缩、相关永久笔记，并确认一条可续接的写作入口。";
  const { readiness, projectEntry } = writingThemeProjectEntry(indexCard);
  const themeLabel = String(indexCard.title || indexCard.id || "当前主题").trim() || "当前主题";
  return `${themeLabel}：当前主题入口：${projectEntry.status}。${projectEntry.hint || readiness?.hint || "先补齐条件，再决定是继续当前项目还是创建项目。"}`;
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
  if (openDraft) {
    const draftNoteId = String(project?.draft_note_id || "").trim();
    if (!draftNoteId) throw new Error("current project has no draft note");
    await openWritingDraftNoteById(draftNoteId);
    setStatus(statusMessage || `已打开当前草稿：${draftNoteId}`, "ok");
    return project;
  }
  setStatus(statusMessage || `已继续当前项目：${projectId}`, "ok");
  return project;
}

async function prepareWritingStrongModelAnalysis() {
  const noteIds = parseWritingBasketIds();
  if (!noteIds.length) {
    setStatus("先把永久笔记加入写作篮，再准备强模型分析", "warn");
    return;
  }
  if (!writingState.project?.id) {
    setStatus("先创建写作项目，再准备强模型分析", "warn");
    return;
  }
  const confirmed =
    typeof window === "undefined" ||
    window.confirm("这会为远程强模型准备写作分析请求。当前实现不会直接调用模型，但请求包包含写作篮笔记摘要。继续？");
  if (!confirmed) return;
  const requestRevision = writingState.strongModelRevision + 1;
  writingState.strongModelRevision = requestRevision;
  writingState.strongModelLoading = true;
  writingState.strongModelResult = null;
  writingState.strongModelError = "";
  renderWritingPanel();
  try {
    const result = await analyzeWritingWithStrongModel({
      userConfirmedRemoteModel: true,
      projectId: writingState.project?.id || "",
      writingGoal: String($("writingGoal")?.value || writingState.project?.goal || "").trim(),
      audience: String($("writingAudience")?.value || writingState.project?.audience || "").trim(),
      noteIds,
      persistArtifacts: true
    });
    if (writingState.strongModelRevision !== requestRevision) return;
    writingState.strongModelResult = result;
    const model = result?.request?.model?.model || "strong_model";
    const artifactCount = Number(result?.result?.storedArtifactIds?.length || result?.result?.summary?.artifactCount || result?.result?.artifacts?.length || 0);
    const systemMessage = writingAnalysisSystemMessageForResult({
      projectId: writingState.project?.id || "",
      noteIds,
      model,
      artifactCount
    });
    addSystemMessage(systemMessage, writingAnalysisSystemMessageDeliveryOptions({ artifactCount }));
    setStatus(`已准备 ${model} 写作分析请求包，尚未直接调用远程模型`, "ok");
  } catch (error) {
    if (writingState.strongModelRevision !== requestRevision) return;
    writingState.strongModelError = String(error?.message || error);
    setStatus(`强模型写作分析准备失败：${writingState.strongModelError}`, "warn");
  } finally {
    if (writingState.strongModelRevision !== requestRevision) return;
    writingState.strongModelLoading = false;
    renderWritingPanel();
  }
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


function writingBookPlainText(note) {
  return computeWritingBookPlainText(note);
}

function writingBookShortText(value, limit = 36) {
  return computeWritingBookShortText(value, limit);
}

function writingBookMatchesAny(text, keywords = []) {
  return computeWritingBookMatchesAny(text, keywords);
}

function uniqueWritingBookPoolItems(items = []) {
  return computeUniqueWritingBookPoolItems(items);
}

function writingBookSectionFromNote(note, fallbackTitle = "") {
  return computeWritingBookSectionFromNote(note, fallbackTitle);
}

function normalizeWritingBookStructure(value = {}) {
  return computeNormalizeWritingBookStructure(value);
}

function writingBookStructureStats(bookStructure = {}) {
  return computeWritingBookStructureStats(bookStructure);
}

function writingBookProjectTitle() {
  return computeWritingBookProjectTitleForRuntime({
    projectTitle: writingState.project?.title,
    inputTitle: $("writingTitle")?.value
  });
}

function writingBookProjectGoal() {
  return computeWritingBookProjectGoalForRuntime({
    projectGoal: writingState.project?.goal,
    inputGoal: $("writingGoal")?.value
  });
}

function writingBookProjectAudience() {
  return computeWritingBookProjectAudienceForRuntime({
    projectAudience: writingState.project?.audience,
    inputAudience: $("writingAudience")?.value
  });
}



function deriveWritingBookDesign({ notes = writingBasketEntries(), project = writingState.project, scaffold = writingState.scaffold } = {}) {
  return computeDeriveWritingBookDesign({
    notes,
    project,
    scaffold,
    title: writingBookProjectTitle(),
    goal: writingBookProjectGoal(),
    audience: writingBookProjectAudience()
  });
}

function deriveWritingLocalBookIdeas({ notes = writingBasketEntries(), project = writingState.project } = {}) {
  return computeDeriveWritingLocalBookIdeas({
    notes,
    project,
    title: String($('writingTitle')?.value || '').trim()
  });
}

function currentWritingBookStructure({ notes = writingBasketEntries(), includeLocalIdeas = true } = {}) {
  return computeCurrentWritingBookStructureForRuntime({
    persistedStructure: writingState.project?.book_structure || {},
    derivedDesign: deriveWritingBookDesign({ notes }),
    localBookIdeas: writingState.localBookIdeas,
    includeLocalIdeas
  });
}



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

function renderGraphIcon(name = "") {
  const key = String(name || "").trim().toLowerCase();
  if (key === "close") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M5.5 5.5L14.5 14.5"></path>
        <path d="M14.5 5.5L5.5 14.5"></path>
      </svg>
    `;
  }
  if (key === "collapse") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M7.5 4.5H4.5V7.5M4.8 4.8L8.2 8.2M12.5 15.5H15.5V12.5M15.2 15.2L11.8 11.8"></path>
      </svg>
    `;
  }
  if (key === "expand") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M8 4.5H4.5V8M4.8 4.8L8.2 8.2M12 15.5H15.5V12M15.2 15.2L11.8 11.8"></path>
      </svg>
    `;
  }
  if (key === "read") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M10 4.5V15.5M4.5 10H15.5"></path>
      </svg>
    `;
  }
  if (key === "detail") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="4.2"></circle>
        <path d="M10 2.8V4.2M10 15.8V17.2M2.8 10H4.2M15.8 10H17.2"></path>
      </svg>
    `;
  }
  if (key === "zoom-out") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="8.5" cy="8.5" r="4.6"></circle>
        <path d="M6.2 8.5H10.8"></path>
        <path d="M12.3 12.3L15.4 15.4"></path>
      </svg>
    `;
  }
  if (key === "zoom-in") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="8.5" cy="8.5" r="4.6"></circle>
        <path d="M8.5 6.2V10.8M6.2 8.5H10.8"></path>
        <path d="M12.3 12.3L15.4 15.4"></path>
      </svg>
    `;
  }
  if (key === "drag") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="6" cy="5.5" r="1"></circle>
        <circle cx="10" cy="5.5" r="1"></circle>
        <circle cx="14" cy="5.5" r="1"></circle>
        <circle cx="6" cy="10" r="1"></circle>
        <circle cx="10" cy="10" r="1"></circle>
        <circle cx="14" cy="10" r="1"></circle>
        <circle cx="6" cy="14.5" r="1"></circle>
        <circle cx="10" cy="14.5" r="1"></circle>
        <circle cx="14" cy="14.5" r="1"></circle>
      </svg>
    `;
  }
  if (key === "hand") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M6.2 9.7V6.1C6.2 5.3 6.8 4.8 7.5 4.8C8.2 4.8 8.8 5.3 8.8 6.1V9.2"></path>
        <path d="M8.8 8.6V4.8C8.8 4 9.4 3.5 10.1 3.5C10.8 3.5 11.4 4 11.4 4.8V9.1"></path>
        <path d="M11.4 8.7V5.8C11.4 5.1 12 4.6 12.7 4.6C13.4 4.6 14 5.1 14 5.8V10"></path>
        <path d="M14 9.4V7.6C14 6.9 14.6 6.4 15.2 6.4C15.9 6.4 16.4 6.9 16.4 7.6V11.2C16.4 14.2 14.2 16.5 11.2 16.5H9.8C8.2 16.5 7.1 15.9 6.2 14.8L4.1 12.2C3.6 11.6 3.7 10.8 4.3 10.4C4.9 10 5.6 10.1 6.1 10.6L7.2 11.7"></path>
      </svg>
    `;
  }
  if (key === "reset") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M5.2 8.2A5.6 5.6 0 1 1 6.4 14.7"></path>
        <path d="M5.2 4.8V8.4H8.8"></path>
      </svg>
    `;
  }
  if (key === "clue") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="6" cy="6.5" r="2.2"></circle>
        <circle cx="14" cy="5" r="1.8"></circle>
        <circle cx="12.5" cy="14" r="2.4"></circle>
        <path d="M8.1 6.1L12.2 5.3M7.5 8.2L11 12.2"></path>
      </svg>
    `;
  }
  if (key === "question") {
    return `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M6.2 6.9C6.7 4.8 8.3 3.8 10.3 3.8C12.4 3.8 14 5 14 6.8C14 8.3 13.2 9.1 11.6 10.1C10.5 10.8 10.1 11.3 10.1 12.5"></path>
        <path d="M10.1 15.4H10.2"></path>
        <circle cx="10" cy="10" r="8"></circle>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M5 10H15"></path>
      <path d="M7 6.5L5 10L7 13.5M13 6.5L15 10L13 13.5"></path>
    </svg>
  `;
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

function graphFilterOptions(edges, field, selected, allLabel, labelFn, statsOverride = null) {
  const fallbackCounts = edges.reduce((acc, edge) => {
    const fallback = field === "status" ? "confirmed" : "associated_with";
    const key = String(edge?.[field] || fallback).trim().toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  if (field === "relationType") {
    const counts = statsOverride?.counts && typeof statsOverride.counts === "object" ? statsOverride.counts : fallbackCounts;
    const selectedKey = normalizeGraphRelationTypeFilter(selected, "meaningful");
    const structureFallback = statsOverride?.structureFallback === true;
    const meaningfulCount =
      Number.isFinite(Number(statsOverride?.meaningfulCount))
        ? Number(statsOverride.meaningfulCount)
        : edges.filter((edge) => GRAPH_MEANINGFUL_RELATION_TYPES.has(String(edge?.relationType || "associated_with").trim().toLowerCase())).length;
    const indexCount =
      Number.isFinite(Number(statsOverride?.indexCount))
        ? Number(statsOverride.indexCount)
        : edges.filter((edge) => GRAPH_INDEX_RELATION_TYPES.has(String(edge?.relationType || "associated_with").trim().toLowerCase())).length;
    const noisyCount =
      Number.isFinite(Number(statsOverride?.noisyCount))
        ? Number(statsOverride.noisyCount)
        : edges.filter((edge) => GRAPH_LINK_CLUE_RELATION_TYPES.has(String(edge?.relationType || "associated_with").trim().toLowerCase())).length;
    const totalCount = Number.isFinite(Number(statsOverride?.totalCount)) ? Number(statsOverride.totalCount) : edges.length;
    const leadingOptions = [
      `<option value="meaningful"${selectedKey === "meaningful" ? " selected" : ""}>先看正式关系 (${meaningfulCount})</option>`,
      `<option value="all"${selectedKey === "all" ? " selected" : ""}>${escapeHtml(allLabel)} (${totalCount})</option>`
    ];
    if (noisyCount > 0) {
      leadingOptions.push(`<option value="noisy"${selectedKey === "noisy" ? " selected" : ""}>只看普通链接 (${noisyCount})</option>`);
    }
    if (indexCount > 0 || structureFallback) {
      const indexLabel = structureFallback && selectedKey === "index" ? "主题分布（自动分组）" : "只看主题归属";
      const indexDisplayCount = structureFallback && selectedKey === "index" ? meaningfulCount || totalCount : indexCount;
      leadingOptions.push(`<option value="index"${selectedKey === "index" ? " selected" : ""}>${escapeHtml(indexLabel)} (${indexDisplayCount})</option>`);
    }
    const selectedTypeHasOption =
      selectedKey === "meaningful" ||
      selectedKey === "all" ||
      (selectedKey === "noisy" && noisyCount > 0) ||
      (selectedKey === "index" && structureFallback) ||
      (selectedKey === "index" && indexCount > 0) ||
      (selectedKey !== "meaningful" &&
        selectedKey !== "all" &&
        selectedKey !== "noisy" &&
        selectedKey !== "index" &&
        Object.prototype.hasOwnProperty.call(counts, selectedKey));
    if (!selectedTypeHasOption && selectedKey) {
      const selectedLabel =
        selectedKey === "noisy"
          ? "只看普通链接"
          : selectedKey === "index"
            ? "只看主题归属"
            : labelFn(selectedKey);
      leadingOptions.push(`<option value="${escapeHtml(selectedKey)}" selected>${escapeHtml(selectedLabel)} (0)</option>`);
    }
    const groupedCounts = new Map();
    for (const [value, count] of Object.entries(counts)) {
      const group = graphRelationGroupMeta(value);
      const key = group.key || "neutral";
      if (!groupedCounts.has(key)) groupedCounts.set(key, []);
      groupedCounts.get(key).push({ value, count, label: labelFn(value), group });
    }
    const groupOrder = ["support", "conflict", "boundary", "bridge", "flow", "neutral", "index"];
    const typedOptions = groupOrder
      .filter((key) => groupedCounts.has(key) && key !== "index")
      .map((key) => {
        const items = groupedCounts
          .get(key)
          .slice()
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"));
        const groupMeta = GRAPH_RELATION_GROUP_META[key] || GRAPH_RELATION_GROUP_META.neutral;
        const groupCount = items.reduce((sum, item) => sum + item.count, 0);
        const options = items
          .map((item) => {
            const selectedAttr = item.value === selectedKey ? " selected" : "";
            return `<option value="${escapeHtml(item.value)}"${selectedAttr}>${escapeHtml(item.label)} (${item.count})</option>`;
          })
          .join("");
        return `<optgroup label="${escapeHtml(`${groupMeta.label} (${groupCount})`)}">${options}</optgroup>`;
      })
      .join("");
    return `${leadingOptions.join("")}${typedOptions}`;
  }
  const options = Object.entries(fallbackCounts)
    .sort((a, b) => b[1] - a[1] || labelFn(a[0]).localeCompare(labelFn(b[0]), "zh-Hans-CN"))
    .map(([value, count]) => {
      const selectedAttr = value === selected ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selectedAttr}>${escapeHtml(labelFn(value))} (${count})</option>`;
    })
    .join("");
  return `<option value="all"${selected === "all" ? " selected" : ""}>${escapeHtml(allLabel)} (${edges.length})</option>${options}`;
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

async function saveGraphIsolatedDecision(button = null) {
  const noteId = String(button?.getAttribute?.("data-graph-isolated-decision-save") || "").trim();
  if (!noteId) return false;
  const panel = button.closest?.(".graph-isolated-decision-form") || document;
  const escapedNoteId = globalThis.CSS?.escape ? CSS.escape(noteId) : noteId.replace(/["\\]/g, "\\$&");
  const mode = graphIsolatedDecisionMode(panel.querySelector?.(`input[name="graph-isolated-decision-${escapedNoteId}"]:checked`)?.value);
  const text = String(panel.querySelector?.(`[data-graph-isolated-decision-text="${escapedNoteId}"]`)?.value || "").trim();
  if (!text) {
    setStatus("请先写一句说明，再保存这个处理决定", "warn");
    return false;
  }
  const note = await loadGraphEditableNote(noteId);
  if (!note) {
    setStatus("没有找到这条笔记，无法保存说明", "bad");
    return false;
  }
  const previousText = button.textContent || "";
  button.disabled = true;
  button.textContent = "正在保存";
  const originalBody = ensureEditableNoteBody(note.body || `# ${note.title || "未命名笔记"}\n`);
  let nextBody = originalBody;
  const decisionTitle = graphIsolatedDecisionTitle(mode);
  if (mode === "rewrite") {
    nextBody = graphUpsertMarkdownSection(nextBody, "一句话论点", text);
    nextBody = graphUpsertMarkdownSection(nextBody, "关联整理备注", `已重写中心判断。下一步：根据新的判断再寻找一条能说明理由的关系。`);
  } else {
    nextBody = graphUpsertMarkdownSection(nextBody, "关联整理备注", `${decisionTitle}：${text}`);
  }
  try {
    let updated = null;
    if (isLocalOnlyNote(note)) {
      note.body = nextBody;
      note.tags = parseTags(nextBody);
      note.links = parseLinks(nextBody);
      note.thesis = mode === "rewrite" ? text : note.thesis || "";
      note.updatedAt = new Date().toISOString();
      note.bodyLoaded = true;
      updated = note;
    } else {
      updated = await updateNote(note.id, {
        title: note.title,
        body: nextBody,
        status: note.status || "draft",
        generatedOriginalNoteId: note.generatedOriginalNoteId || undefined,
        originalityStatus: note.originalityStatus || undefined,
        originalitySimilarity: note.originalitySimilarity ?? undefined
      });
      if (updated) Object.assign(note, mapNoteItem(updated), { bodyLoaded: true });
    }
    const tab = noteTabFor(note.id);
    if (tab) {
      tab.body = note.body;
      tab.savedBody = note.body;
      tab.title = note.title;
      tab.savedTitle = note.title;
      tab.dirty = false;
    }
    setGraphIsolatedWorkflowActiveTab(noteId, "queue");
    renderGraphPanel();
    setStatus(`${decisionTitle}已保存到当前笔记`, "ok");
    return Boolean(updated);
  } catch (error) {
    button.disabled = false;
    button.textContent = previousText || "保存说明";
    setStatus(`保存说明失败：${String(error?.message || error)}`, "bad");
    return false;
  }
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

async function refineGraphPotentialRelationsForNote(noteId = "", candidates = [], { directoryId = "" } = {}) {
  const cleanNoteId = String(noteId || "").trim();
  const items = (Array.isArray(candidates) ? candidates : []).filter(Boolean).slice(0, 3);
  if (!cleanNoteId || !items.length) return;
  let generatedThisRun = 0;
  let waitingConfirmationThisRun = 0;
  let failedThisRun = 0;
  let removedThisRun = 0;
  for (const candidate of items) {
    const refineResult = await refineGraphPotentialRelationCandidate(cleanNoteId, candidate, { directoryId });
    if (refineResult?.aiReasonGenerated) generatedThisRun += 1;
    if (refineResult?.removed) {
      removedThisRun += 1;
      continue;
    }
    if (refineResult?.needsConfirmation) {
      waitingConfirmationThisRun += 1;
      break;
    }
    if (refineResult?.ok === false) failedThisRun += 1;
  }
  if (waitingConfirmationThisRun && generatedThisRun) {
    setStatus(`已补充 ${generatedThisRun} 条潜在关联的 AI 复核理由，另有 ${waitingConfirmationThisRun} 条等待你确认当前 AI 设置后再生成理由`, "warn");
    return;
  }
  if (waitingConfirmationThisRun) {
    setStatus(`${waitingConfirmationThisRun} 条潜在关联等待你确认当前 AI 设置后再生成理由`, "warn");
    return;
  }
  if (removedThisRun && generatedThisRun) {
    setStatus(`已补充 ${generatedThisRun} 条潜在关联的 AI 复核理由，另有 ${removedThisRun} 条因图谱已变化从候选列表移除`, "warn");
    return;
  }
  if (removedThisRun && failedThisRun) {
    setStatus(`${failedThisRun} 条潜在关联暂未生成 AI 理由，另有 ${removedThisRun} 条因图谱已变化从候选列表移除`, "warn");
    return;
  }
  if (removedThisRun) {
    return;
  }
  if (failedThisRun && generatedThisRun) {
    setStatus(`已补充 ${generatedThisRun} 条潜在关联的 AI 复核理由，另有 ${failedThisRun} 条暂未生成理由，可稍后重试`, "warn");
    return;
  }
  if (failedThisRun) {
    setStatus(`${failedThisRun} 条潜在关联暂未生成 AI 理由，可稍后重试`, "warn");
    return;
  }
  if (generatedThisRun) {
    setStatus(`已补充 ${generatedThisRun} 条潜在关联的 AI 复核理由`, "ok");
  }
}

async function refineGraphPotentialRelationCandidate(noteId = "", candidate = {}, { directoryId = "", confirmationApproved = false } = {}) {
  const cleanNoteId = String(noteId || candidate?.sourceNoteId || candidate?.fromNoteId || "").trim();
  if (!cleanNoteId || !candidate) return { ok: false, needsConfirmation: false };
  try {
    const refined = await refinePotentialRelationCandidate({
      directoryId,
      includeDescendants: true,
      focusNoteId: cleanNoteId,
      currentNoteId: cleanNoteId,
      candidate,
      timeoutMs: 60000,
      ...(confirmationApproved ? { confirmationApproved: true, confirmBudget: true } : {})
    });
    const merged = Boolean(refined && mergePotentialRelationCandidateIntoGraphAnalysis(refined));
    if (merged) renderGraphPanel();
    const aiReason = String(refined?.aiRationale || "").trim();
    const aiError = String(refined?.aiError || "").trim();
    const needsConfirmation =
      refined?.aiNeedsConfirmation === true ||
      graphPotentialRelationNeedsConfirmation(refined) ||
      refined?.aiErrorCode === "AI_ROUTE_CONFIRMATION_REQUIRED" ||
      refined?.aiErrorCode === "AI_BUDGET_CONFIRMATION_REQUIRED";
    if (needsConfirmation) {
      setStatus("当前 AI 设置需要确认后才能生成这条关系说明", "warn");
      return { ok: false, needsConfirmation: true, merged };
    }
    if (confirmationApproved && aiReason) {
      setStatus(
        merged ? "已确认使用当前 AI 设置，并补充这条潜在关联的复核理由" : "AI 理由已生成，但当前图谱范围已变化，请重新打开这条笔记查看",
        merged ? "ok" : "warn"
      );
      return { ok: true, needsConfirmation: false, merged, aiReasonGenerated: true };
    }
    if (aiError) {
      setStatus(`生成关系说明失败：${aiError}`, "warn");
      return { ok: false, needsConfirmation: false, merged };
    }
    if (confirmationApproved) {
      setStatus("未生成可用的关系说明，请稍后重试", "warn");
      return { ok: false, needsConfirmation: false, merged };
    }
    return { ok: true, needsConfirmation: false, merged, aiReasonGenerated: Boolean(aiReason) };
  } catch (error) {
    const code = String(error?.code || "").trim();
    if (code === "POTENTIAL_RELATION_CANDIDATE_NOT_FOUND") {
      const removed = removePotentialRelationCandidateFromGraphAnalysis(candidate);
      if (removed) renderGraphPanel();
      setStatus("这条潜在关联已不在当前图谱范围内，已从候选列表移除", "warn");
      return { ok: false, needsConfirmation: false, merged: false, removed };
    }
    const needsConfirmation = code === "AI_ROUTE_CONFIRMATION_REQUIRED" || code === "AI_BUDGET_CONFIRMATION_REQUIRED";
    mergePotentialRelationCandidateIntoGraphAnalysis({
      ...candidate,
      aiError: needsConfirmation ? "当前 AI 设置需要确认后才能生成理由。" : String(error?.message || error),
      aiErrorCode: code,
      aiNeedsConfirmation: needsConfirmation
    });
    renderGraphPanel();
    if (needsConfirmation) setStatus("当前 AI 设置需要确认后才能生成这条关系说明", "warn");
    else setStatus(`生成关系说明失败：${String(error?.message || error)}`, "warn");
    return { ok: false, needsConfirmation, merged: true };
  }
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
  return {
    relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge,
    relationGroupCounts: graphRelationGroupCounts,
    nodeTitle: graphNodeTitle,
    suggestThemeIndexTitle: suggestedThemeIndexTitle,
    edgeSelectionKey: graphEdgeSelectionKey,
    relationTypeLabel: graphRelationTypeLabel,
    renderSelectionMetrics: renderGraphSelectionMetrics
  };
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

function renderGraphSelectionPanel({ selection = null, nodeMap = new Map(), edges = [], topicCandidates = [], isolatedNotes = [], bridgeGaps = [], clusterMeta = [] } = {}) {
  const { renderers, deps } = buildGraphSelectionDispatcherDeps({
    renderGraphClusterSelectionPanel,
    renderGraphThemeSelectionPanel,
    renderGraphIsolatedSelectionPanel,
    renderGraphIsolatedCompletePanel,
    renderGraphRelationFormSelectionPanel,
    renderGraphBridgeSelectionPanel,
    renderGraphNodeSelectionPanel,
    renderGraphEdgeSelectionPanel,
    normalizeGraphSelectionForVisibleItems
  });
  return renderGraphSelectionPanelViaDispatcher({
    selection,
    nodeMap,
    edges,
    topicCandidates,
    isolatedNotes,
    bridgeGaps,
    clusterMeta
  }, renderers, deps);
}

function renderGraphNodeSelectionPanel(args = {}) {
  return renderGraphNodeSelectionPanelView(args, buildGraphNodeSelectionRuntimeDeps({
    escapeHtml,
    graphRelationStatusCountsAsNetworkEdge,
    graphNodeNeedsRelationWorkflow,
    renderGraphIsolatedSelectionPanel,
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
    aiAnalysisLoading: graphState.aiAnalysisLoading
  }));
}

function renderGraphEdgeSelectionPanel(args = {}) {
  return renderGraphEdgeSelectionPanelView(args, buildGraphEdgeSelectionRuntimeDeps({
    escapeHtml,
    graphEdgeSelectionKey,
    graphNodeTitle,
    graphRelationTypeLabel,
    graphRelationGroupMeta,
    graphEdgeReviewMeta,
    graphEdgeAdjustmentPlan,
    graphFocusCardActionMeta,
    graphRelationSourceLabel,
    graphRelationStatusLabel,
    renderGraphSelectionMetrics,
    renderGraphPromptDetails,
    renderGraphSelectionShell,
    focusContextMode: graphState.focusContextMode,
    relationAdjustmentFocusById: graphState.relationAdjustmentFocusById
  }));
}

function graphHash(value = "") {
  return String(value || "").split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);
}

function graphShortTitle(value = "", maxLength = 14) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(2, maxLength - 1))}…`;
}

function graphNodeAttentionReasons(node = {}, { selected = false, inSelectedTheme = false, selectedIsolated = false, inSelectedBridge = false } = {}) {
  const reasons = [];
  if (selected) reasons.push("当前选中");
  if (node.isFocused) reasons.push("当前焦点");
  if (node.isGraphIsolatedCandidate || selectedIsolated) reasons.push("待关联笔记");
  if (inSelectedTheme) reasons.push("主题候选成员");
  if (inSelectedBridge) reasons.push("桥接候选两端");
  if (node.isHub && !node.isFocused) reasons.push("关系最密集");
  if (node.isAnchor && !node.isHub) reasons.push("主题核心候选");
  if (!node.isGraphIsolatedCandidate && Number(node.degree || 0) >= 4) reasons.push("连接较多");
  return uniqueStrings(reasons);
}

function graphNodeStarTier(node = {}) {
  if (node.isFocused) return "focus";
  if (node.isHub) return "core";
  if (node.isAnchor) return "major";
  if (node.isGraphIsolatedCandidate) return "isolated";
  const degree = Number(node.degree || 0);
  if (degree >= 10) return "major";
  if (degree >= 5) return "medium";
  if (degree >= 2) return "minor";
  return "dust";
}

function graphNodeStarRank(tier = "") {
  if (tier === "focus") return 5;
  if (tier === "core") return 4;
  if (tier === "major") return 3;
  if (tier === "medium") return 2;
  if (tier === "minor") return 1;
  return 0;
}

function graphNodeRadiusByTier(tier = "", degree = 0) {
  const safeDegree = Number(degree || 0);
  if (tier === "focus") return Number((8.8 + Math.min(3.6, safeDegree * 0.12)).toFixed(1));
  if (tier === "core") return Number((7.1 + Math.min(2.8, safeDegree * 0.11)).toFixed(1));
  if (tier === "major") return Number((5.2 + Math.min(1.8, safeDegree * 0.08)).toFixed(1));
  if (tier === "medium") return Number((3.1 + Math.min(0.9, safeDegree * 0.04)).toFixed(1));
  if (tier === "minor") return Number((1.55 + Math.min(0.45, safeDegree * 0.02)).toFixed(1));
  if (tier === "isolated") return 3.8;
  return 0.95;
}

function graphNodeShowsAsPoint(node = {}) {
  const tier = String(node?.starTier || "").trim().toLowerCase();
  return tier === "dust" || tier === "minor";
}

function graphDenseGalaxyMode({ nodes = [], edges = [], filterActive = false } = {}) {
  if (filterActive) return false;
  const nodeCount = Array.isArray(nodes) ? nodes.length : 0;
  const edgeCount = Array.isArray(edges) ? edges.length : 0;
  return edgeCount >= 140 || (nodeCount >= 80 && edgeCount >= 60);
}

function graphEdgeVisibleAtFit(edge = {}, nodeMap = new Map(), options = {}) {
  const from = nodeMap.get(String(edge?.fromNoteId || "").trim());
  const to = nodeMap.get(String(edge?.toNoteId || "").trim());
  const fromRank = graphNodeStarRank(from?.starTier);
  const toRank = graphNodeStarRank(to?.starTier);
  const strongest = Math.max(fromRank, toRank);
  const weakest = Math.min(fromRank, toRank);
  const relationType = String(edge?.relationType || "").trim().toLowerCase();
  const relationGroup = graphRelationVisual(relationType).key;
  const denseMode = options.denseMode === true;
  const intercluster = options.intercluster === true;
  if (relationGroup === "index") return true;
  if (denseMode) {
    if (relationGroup === "bridge") return strongest >= 3;
    if (relationGroup === "flow") {
      return intercluster ? strongest >= 3 && weakest >= 2 : strongest >= 4 && weakest >= 2;
    }
    if (["support", "conflict", "boundary"].includes(relationGroup)) {
      return intercluster ? strongest >= 4 && weakest >= 2 : strongest >= 4 && weakest >= 3;
    }
    return false;
  }
  if (strongest >= 4) return true;
  if (relationGroup === "bridge") return strongest >= 3;
  if (["support", "conflict", "boundary", "flow"].includes(relationGroup)) {
    return strongest >= 3 && weakest >= 2;
  }
  return false;
}

function graphEdgeShouldRender({
  zoomKey = "fit",
  filterActive = false,
  relationType = "meaningful",
  fitVisible = false,
  connectsFocus = false,
  selected = false,
  inSelectedNodeNeighborhood = false,
  inSelectedTheme = false,
  inSelectedBridge = false,
  lensPriority = false,
  visualKey = "",
  denseMode = false,
  intercluster = false
} = {}) {
  if (zoomKey !== "fit") return true;
  if (filterActive) {
    // Focused scopes are already trimmed by relation filter + reading depth, so
    // fit view should not silently hide edges inside that explicit local graph.
    return true;
  }
  if (graphViewModeForRelationType(relationType) === "structure" || visualKey === "index") {
    return fitVisible || lensPriority || selected || inSelectedTheme || inSelectedBridge;
  }
  if (denseMode) {
    return fitVisible || lensPriority || selected || inSelectedNodeNeighborhood || inSelectedTheme || inSelectedBridge || (intercluster && connectsFocus);
  }
  return fitVisible || lensPriority || selected || inSelectedNodeNeighborhood || inSelectedTheme || inSelectedBridge;
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
  const from = nodeMap.get(String(edge?.fromNoteId || "").trim());
  const to = nodeMap.get(String(edge?.toNoteId || "").trim());
  if (!from || !to) return null;

  if (from.id === to.id) {
    const loopRadius = from.radius + 18;
    return {
      d: `M ${from.x} ${from.y - from.radius - 3} C ${from.x + loopRadius} ${from.y - loopRadius * 2}, ${from.x + loopRadius * 2} ${from.y}, ${from.x + from.radius + 5} ${from.y}`,
      labelX: from.x + loopRadius + 4,
      labelY: from.y - loopRadius,
      titleX: from.x,
      titleY: from.y
    };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const startX = from.x + unitX * (from.radius + 5);
  const startY = from.y + unitY * (from.radius + 5);
  const endX = to.x - unitX * (to.radius + 8);
  const endY = to.y - unitY * (to.radius + 8);
  const relationGroup = graphRelationVisual(edge?.relationType).key;
  const signedSeed = ((graphHash(`${edge.fromNoteId}:${edge.toNoteId}:${edge.relationType}`) % 11) - 5) / 5;
  const curveBoost =
    relationGroup === "bridge"
      ? 1.34
      : relationGroup === "flow"
        ? 1.22
        : relationGroup === "boundary"
          ? 1.12
          : 1;
  const curveMagnitude = Math.min(78, Math.max(18, length * 0.12 * curveBoost));
  const curve = signedSeed === 0 ? curveMagnitude * 0.35 : signedSeed * curveMagnitude;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const controlOffsetX = -unitY * curve;
  const controlOffsetY = unitX * curve;
  const control1X = startX + dx * 0.32 + controlOffsetX;
  const control1Y = startY + dy * 0.32 + controlOffsetY;
  const control2X = startX + dx * 0.68 + controlOffsetX;
  const control2Y = startY + dy * 0.68 + controlOffsetY;
  const labelX = midX + controlOffsetX * 0.62;
  const labelY = midY + controlOffsetY * 0.62;
  return {
    d: `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${control1X.toFixed(1)} ${control1Y.toFixed(1)} ${control2X.toFixed(1)} ${control2Y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    labelX: Math.round(labelX),
    labelY: Math.round(labelY - 8),
    titleX: Math.round(midX),
    titleY: Math.round(midY)
  };
}

function graphThemeBoundaryMeta({ nodes = [], noteIds = [], title = "", layoutWidth = 0, layoutHeight = 0 } = {}) {
  const noteSet = new Set(graphThinkingCleanIds(noteIds));
  if (!noteSet.size) return null;
  const members = (Array.isArray(nodes) ? nodes : []).filter((node) => noteSet.has(String(node?.id || "").trim()));
  if (!members.length) return null;
  const minX = Math.min(...members.map((node) => Number(node.x || 0) - Number(node.radius || 0)));
  const maxX = Math.max(...members.map((node) => Number(node.x || 0) + Number(node.radius || 0)));
  const minY = Math.min(...members.map((node) => Number(node.y || 0) - Number(node.radius || 0)));
  const maxY = Math.max(...members.map((node) => Number(node.y || 0) + Number(node.radius || 0)));
  const padding = Math.max(34, Math.min(82, 28 + members.length * 0.55));
  const safeWidth = Math.max(1, Number(layoutWidth || 0));
  const safeHeight = Math.max(1, Number(layoutHeight || 0));
  const x = Math.max(18, Math.round(minX - padding));
  const y = Math.max(18, Math.round(minY - padding));
  const width = Math.max(96, Math.min(Math.round(maxX - minX + padding * 2), Math.round(safeWidth - x - 18)));
  const height = Math.max(78, Math.min(Math.round(maxY - minY + padding * 2), Math.round(safeHeight - y - 18)));
  const coverage = (width * height) / Math.max(1, safeWidth * safeHeight);
  const broad = members.length >= Math.max(24, nodes.length * 0.45) || coverage > 0.62;
  const compact = members.length <= 4 || coverage < 0.18;
  return {
    x,
    y,
    width,
    height,
    rx: Math.round(Math.min(64, Math.max(28, Math.min(width, height) * 0.18))),
    labelX: Math.round(x + 18),
    labelY: Math.round(y + 25),
    count: members.length,
    title: String(title || "待验证主题").trim() || "待验证主题",
    tone: broad ? "is-broad" : compact ? "is-compact" : "is-cluster",
    label: broad ? "松散主题范围" : compact ? "小型主题候选" : "主题候选范围"
  };
}

function renderGraphThemeBoundary(boundary = null) {
  if (!boundary) return "";
  return `
    <g class="graph-theme-boundary ${escapeHtml(boundary.tone)}" data-graph-theme-boundary="true" aria-hidden="true">
      <rect class="graph-theme-boundary-aura" x="${boundary.x}" y="${boundary.y}" width="${boundary.width}" height="${boundary.height}" rx="${boundary.rx}"></rect>
      <rect class="graph-theme-boundary-line" x="${boundary.x + 5}" y="${boundary.y + 5}" width="${Math.max(1, boundary.width - 10)}" height="${Math.max(1, boundary.height - 10)}" rx="${Math.max(1, boundary.rx - 5)}"></rect>
      <text class="graph-theme-boundary-label" x="${boundary.labelX}" y="${boundary.labelY}">${escapeHtml(boundary.label)} · ${escapeHtml(String(boundary.count))} 条</text>
    </g>
  `;
}

function graphScopeDirectoryId() {
  const selected = String(state.selectedFolderId || "").trim();
  return selected && isDirectoryUnderOriginalRoot(selected) ? selected : GRAPH_ORIGINAL_SCOPE_DIRECTORY_ID;
}

function graphLoadedScopeCoversDirectory(scopeDirectoryId = "") {
  const loadedDirectoryId = String(graphState.lastLoadedDirectoryId || "").trim();
  const targetDirectoryId = String(scopeDirectoryId || "").trim();
  if (!graphState.item || !loadedDirectoryId || !targetDirectoryId) return false;
  if (loadedDirectoryId === targetDirectoryId) return true;
  return descendantDirectoryIds(loadedDirectoryId).includes(targetDirectoryId);
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
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const allEdges = Array.isArray(graph?.edges) ? graph.edges : [];
  const scopeDirectoryId = graphScopeDirectoryId();
  const scopedDirectoryIds = new Set(descendantDirectoryIds(scopeDirectoryId));
  const scopedNodes = nodes.filter((node) => scopedDirectoryIds.has(String(node.directoryId || node.folderId || "").trim()));
  const focusedNoteId = String(state.selectedFileId || "").trim();
  if (focusedNoteId && !scopedNodes.some((node) => String(node?.id || "").trim() === focusedNoteId)) {
    const focusedNote = state.notes.find((note) => String(note?.id || "").trim() === focusedNoteId);
    const focusedFolderId = String(focusedNote?.folderId || focusedNote?.directoryId || "").trim();
    if (focusedNote && focusedFolderId && scopedDirectoryIds.has(focusedFolderId)) {
      scopedNodes.push({
        id: focusedNoteId,
        title: String(focusedNote.title || focusedNoteId).trim() || focusedNoteId,
        folderId: focusedFolderId,
        directoryId: focusedFolderId,
        noteType: String(focusedNote.noteType || (focusedFolderId ? typeFromFolder(state, focusedFolderId) : "") || "original").trim() || "original",
        status: String(focusedNote.status || "draft").trim() || "draft",
        degree: 0
      });
    }
  }
  const scopedNodeIds = new Set(scopedNodes.map((node) => node.id));
  const scopedEdges = allEdges.filter((edge) => scopedNodeIds.has(edge.fromNoteId) && scopedNodeIds.has(edge.toNoteId));
  const relatedNodeIds = new Set(scopedEdges.flatMap((edge) => [edge.fromNoteId, edge.toNoteId]).filter(Boolean));
  return {
    scopeDirectoryId,
    allNodes: scopedNodes,
    nodes: scopedNodes.filter((node) => relatedNodeIds.has(node.id)),
    edges: scopedEdges
  };
}

function graphFocusedItems(nodes = [], edges = [], allNodes = nodes, traversalEdges = edges) {
  const focusedNoteId = String(state.selectedFileId || "").trim();
  if (!focusedNoteId) return { focusedNoteId: "", nodes, edges, focused: false };
  const focusDepth = normalizeGraphFocusDepth(graphState.focusDepth, "1");
  const adjacency = new Map();
  traversalEdges.forEach((edge) => {
    const fromId = String(edge?.fromNoteId || "").trim();
    const toId = String(edge?.toNoteId || "").trim();
    if (!fromId || !toId) return;
    if (!adjacency.has(fromId)) adjacency.set(fromId, new Set());
    if (!adjacency.has(toId)) adjacency.set(toId, new Set());
    adjacency.get(fromId).add(toId);
    adjacency.get(toId).add(fromId);
  });
  const visibleIds = new Set([focusedNoteId]);
  const queue = [{ id: focusedNoteId, depth: 0 }];
  const visited = new Set([focusedNoteId]);
  const maxDepth = focusDepth === "all" ? Number.POSITIVE_INFINITY : Number(focusDepth || 1) || 1;
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    if (current.depth >= maxDepth) continue;
    for (const neighborId of adjacency.get(current.id) || []) {
      visibleIds.add(neighborId);
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ id: neighborId, depth: current.depth + 1 });
    }
  }
  const relatedEdges = edges.filter((edge) => visibleIds.has(edge.fromNoteId) && visibleIds.has(edge.toNoteId));
  if (!relatedEdges.length) {
    return {
      focusedNoteId,
      nodes: allNodes.filter((node) => node.id === focusedNoteId),
      edges: [],
      focused: true,
      focusDepth
    };
  }
  return {
    focusedNoteId,
    nodes: nodes.filter((node) => visibleIds.has(node.id)),
    edges: relatedEdges,
    focused: true,
    focusDepth
  };
}

function graphBuildFocusedRelationTypeStats(nodes = [], edges = [], allNodes = nodes, filters = {}) {
  const normalizedSelected = normalizeGraphRelationTypeFilter(filters.relationType, "meaningful");
  const normalizedStatus = String(filters.status || "all").trim().toLowerCase() || "all";
  const relationTypes = new Set(
    (Array.isArray(edges) ? edges : [])
      .map((edge) => String(edge?.relationType || "associated_with").trim().toLowerCase())
      .filter(Boolean)
  );
  const countFor = (relationType = "all") => {
    const traversalFilters = { relationType, status: normalizedStatus };
    const traversalEdges = (Array.isArray(edges) ? edges : []).filter((edge) => graphEdgeMatchesFilters(edge, traversalFilters));
    const focusedScope = graphFocusedItems(nodes, edges, allNodes, traversalEdges);
    return focusedScope.edges.filter((edge) => graphEdgeMatchesFilters(edge, traversalFilters)).length;
  };
  const counts = {};
  relationTypes.forEach((relationType) => {
    const count = countFor(relationType);
    if (count > 0) counts[relationType] = count;
  });
  if (
    normalizedSelected &&
    !["meaningful", "all", "noisy", "index"].includes(normalizedSelected) &&
    !Object.prototype.hasOwnProperty.call(counts, normalizedSelected)
  ) {
    counts[normalizedSelected] = 0;
  }
  return {
    counts,
    totalCount: countFor("all"),
    meaningfulCount: countFor("meaningful"),
    noisyCount: countFor("noisy"),
    indexCount: countFor("index")
  };
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

function graphThinkingModelRuntimeDeps() {
  return {
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
  };
}

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
  if (!nodes.length) {
    return `
      <div class="graph-map-card">
        <div class="graph-map-head">
          <strong>结构预览</strong>
          <small>当前范围暂无笔记</small>
        </div>
        <div class="graph-empty">先建立几条永久笔记，再用关系把它们串成局部图谱。</div>
      </div>
    `;
  }

  const edgeRows = edges.slice(0, 5).map((edge) => {
    const fromNode = nodes.find((node) => node.id === edge.fromNoteId);
    const toNode = nodes.find((node) => node.id === edge.toNoteId);
    const relationGroup = graphRelationGroupMeta(edge.relationType);
    return {
      from: fromNode?.title || edge.fromTitle || edge.fromNoteId || "源笔记",
      to: toNode?.title || edge.toTitle || edge.toNoteId || "目标笔记",
      relation: graphRelationTypeLabel(edge.relationType),
      relationGroupLabel: relationGroup.label,
      relationGroupClass: relationGroup.className,
      fromState: linkedNodeIds.has(edge.fromNoteId) ? "linked" : "",
      toState: linkedNodeIds.has(edge.toNoteId) ? "linked" : ""
    };
  });
  const isolatedRows = edgeRows.length
    ? []
    : nodes.slice(0, 4).map((node) => ({
        from: node.title || node.id,
        to: "等待连接",
        relation: "未连接",
        isolated: true
      }));
  const rows = edgeRows.length ? edgeRows : isolatedRows;
  return `
    <div class="graph-map-card">
      <div class="graph-map-head">
        <strong>结构预览</strong>
        <small>${escapeHtml(edges.length ? `展示前 ${Math.min(edges.length, 5)} 条关系` : "当前主要是待关联笔记")}</small>
      </div>
      <div class="graph-map" aria-label="当前图谱结构预览">
        ${rows
          .map(
            (row) => `
              <div class="graph-map-node-row">
                <span class="graph-map-node" data-state="${escapeHtml(row.isolated ? "isolated" : row.fromState || "")}">${escapeHtml(row.from)}</span>
                <span class="graph-map-link ${escapeHtml(row.relationGroupClass || "")}">
                  <strong>${escapeHtml(row.relation)}</strong>
                  ${row.relationGroupLabel ? `<small>${escapeHtml(row.relationGroupLabel)}</small>` : ""}
                </span>
                <span class="graph-map-node" data-state="${escapeHtml(row.isolated ? "isolated" : row.toState || "")}">${escapeHtml(row.to)}</span>
              </div>
            `
          )
          .join("")}
      </div>
      ${
        edges.length > 5
          ? `<div class="graph-map-more">还有 ${escapeHtml(edges.length - 5)} 条关系在下方列表中。</div>`
          : ""
      }
    </div>
  `;
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
  const cleanNoteId = String(noteId || "").trim();
  if (!cleanNoteId || graphState.aiAnalysisLoading) return false;
  const directoryId = graphScopeDirectoryId();
  const previousSelection = graphState.selection;
  graphState.aiAnalysisLoading = true;
  graphState.aiAnalysisError = "";
  graphRelationWorkflowController.startAiConnectForNote(cleanNoteId);
  try {
    const localAiReady = await ensureGraphLocalAiReadyForAnalysis();
    if (!localAiReady) return false;
    const result = await analyzeDirectoryGraph(directoryId, {
      includeDescendants: true,
      minScore: 0.05,
      relationLimit: 24,
      focusNoteId: cleanNoteId,
      currentNoteId: cleanNoteId,
      persistArtifacts: true
    });
    graphState.aiAnalysis = result;
    const nodes = Array.isArray(graphState.item?.nodes) ? graphState.item.nodes : [];
    const currentEdges = Array.isArray(graphState.item?.edges) ? graphState.item.edges : [];
    const route = graphRelationWorkflowController.applyAiConnectRoute({
      noteId: cleanNoteId,
      previousSelection,
      edges: currentEdges,
      relationStatusCountsAsNetworkEdge: graphRelationStatusCountsAsNetworkEdge
    });
    const graphSelectionKind = route?.graphSelectionKind || "isolated";
    const nodeMap = new Map(nodes.map((node) => [String(node?.id || "").trim(), node]).filter(([id]) => id));
    const candidates = graphAiRelationCandidatesForNote(cleanNoteId, { nodeMap, edges: currentEdges, limit: 5 });
    const firstTargetId = String(candidates[0]?.counterpartNoteId || candidates[0]?.targetNoteId || "").trim();
    if (firstTargetId) {
      graphState.isolatedCandidatePreviewByNoteId = graphState.isolatedCandidatePreviewByNoteId || {};
      graphState.isolatedCandidatePreviewByNoteId[cleanNoteId] = firstTargetId;
    }
    const noteTitle = graphNodeTitle(nodeMap, cleanNoteId, state.notes.find((note) => note.id === cleanNoteId)?.title || cleanNoteId);
    const candidateTitles = candidates
      .map((candidate) => String(candidate.counterpartTitle || candidate.targetTitle || candidate.targetNoteId || "").trim())
      .filter(Boolean)
      .slice(0, 3);
    const count = Number(result?.reviewItems?.summary?.artifactCount || 0);
    if (count > 0) {
      const messageId = `graph-ai-connect:${directoryId || "root"}:${cleanNoteId}:${Date.now()}`;
      addSystemMessage({
        id: messageId,
        type: "ai",
        title: `${noteTitle} 发现了潜在关联`,
        body: candidates.length
          ? `“${noteTitle}”找到 ${candidates.length} 个可选目标${candidateTitles.length ? `：${candidateTitles.join("、")}` : ""}。打开后只保存能说清理由的关系。`
          : `“${noteTitle}”接入扫描完成，但暂时没有足够清楚的候选连接。`,
        action: "open-graph",
        actionLabel: "查看候选并确认关系",
        noteId: cleanNoteId,
        sourceNoteId: cleanNoteId,
        artifactCount: candidates.length,
        workflowRoute: { focus: "graph", source: "graph-ai-connect", graphSelectionKind }
      });
      graphState.aiReviewSystemMessageId = messageId;
    }
    graphState.thinkingPanelVisible = true;
    setStatus(candidates.length ? `已找到 ${candidates.length} 条潜在关联，请确认后再写入图谱` : "当前笔记接入扫描完成，暂无清楚候选连接", candidates.length ? "ok" : "warn");
    if (candidates.length) void refineGraphPotentialRelationsForNote(cleanNoteId, candidates, { directoryId });
    return true;
  } catch (error) {
    graphState.aiAnalysisError = String(error?.message || error);
    setStatus(`AI 找连接失败：${graphState.aiAnalysisError}`, "warn");
    return false;
  } finally {
    graphState.aiAnalysisLoading = false;
    renderGraphPanel();
  }
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
  const note = state.notes.find((n) => n.id === noteId);
  if (!note || note.bodyLoaded) return;
  const expectedNoteBody = note.body;
  const expectedTab = state.tabs.find((t) => t.noteId === note.id);
  const expectedTabBody = expectedTab?.body;
  try {
    const full = await fetchNote(noteId);
    if (!full) return;
    const currentTab = state.tabs.find((t) => t.noteId === note.id);
    if (currentTab?.dirty) {
      note.bodyLoaded = true;
      return;
    }
    const hasLocalEditorChange = currentTab && currentTab.body !== expectedTabBody;
    const hasLocalNoteChange = note.body !== expectedNoteBody;
    if (hasLocalEditorChange || hasLocalNoteChange) {
      note.bodyLoaded = true;
      return;
    }
    note.body = full.body || note.body;
    note.title = full.title || note.title;
    note.status = full.status || note.status;
    note.markdownPath = full.markdownPath || note.markdownPath;
    note.originalityStatus = full.originalityStatus || note.originalityStatus;
    note.originalitySimilarity = normalizeOptionalNumber(full.originalitySimilarity ?? note.originalitySimilarity);
    note.authorship = normalizeAuthorshipItem(full.authorship) || note.authorship;
    note.thesis = full.thesis || note.thesis || "";
    note.threeLineSummary = Array.isArray(full.threeLineSummary) ? full.threeLineSummary : note.threeLineSummary || [];
    note.distillationStatus = full.distillationStatus || note.distillationStatus || "";
    note.thinkingStatus = normalizeThinkingStatusItem(full.thinkingStatus) || note.thinkingStatus || null;
    note.boundaryOrCounterpoint = full.boundaryOrCounterpoint || note.boundaryOrCounterpoint || "";
    note.updatedAt = full.updatedAt || note.updatedAt;
    note.bodyLoaded = true;
    const tab = state.tabs.find((t) => t.noteId === note.id);
    if (tab) {
      tab.body = note.body;
      tab.title = note.title;
      tab.savedBody = note.body;
      tab.savedTitle = note.title;
      tab.dirty = false;
      editor.syncTabMetadataFromNote(note.id);
      if (state.activeTabId === tab.id) editor.fillEditorFromTab();
    }
  } catch {}
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

function openGraphFollowupNote(noteId = "", action = "", options = {}) {
  const cleanNoteId = String(noteId || "").trim();
  const cleanAction = String(action || "").trim().toLowerCase();
  const actionRoute = graphFollowupActionRoute(cleanAction);
  const cleanRelationId = String(options.relationId || "").trim();
  const cleanTargetNoteId = String(options.targetNoteId || "").trim();
  const cleanRelationType = String(options.relationType || "").trim().toLowerCase();
  const requestedGraphFocusNoteIds = String(options.basketNoteIds || "")
    .split(",")
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  if (actionRoute.kind === "writing") {
    const graphFocusNoteIds = requestedGraphFocusNoteIds.length ? requestedGraphFocusNoteIds : currentGraphVisibleNodeIds();
    const graphBasketNoteIds = graphWritingCandidateNoteIds(graphFocusNoteIds, {
      noteLookup: writingKnownNoteById,
      isEligible: isWritingEligibleNote
    });
    const plan = graphWritingFollowupEntryPlan({
      basketNoteIds: parseWritingBasketIds(),
      candidateNoteIds: graphBasketNoteIds,
      scopeNoteIds: graphFocusNoteIds
    });
    if (plan.prefillNoteIds.length) {
      continueWritingEntry(plan.prefillNoteIds, {
        title: suggestedWritingProjectTitle(plan.prefillNoteIds),
        source: "graph_followup_writing"
      });
    }
    const continuation = graphWritingContinuationEntry(graphBasketNoteIds, "当前图谱切片");
    void (async () => {
      try {
        if (continuation?.projectId) {
          await continueWritingProjectEntry(continuation.projectId, {
            openDraft: continuation.action === "open-draft",
            statusMessage: graphWritingContinuationStatusMessage(continuation)
          });
          return;
        }
        if (plan.mode === "no-candidates" && !plan.hasBasket) {
          setStatus(plan.statusMessage, "warn");
          return;
        }
        await openWritingModule({
          statusMessage: "",
          focusedCandidateNoteIds: graphFocusNoteIds,
          focusedCandidateScopeLabel: "当前图谱切片"
        });
        setStatus(plan.statusMessage, "ok", { requireModule: "writing" });
      } catch (error) {
        if (continuation?.projectId) {
          setStatus(graphWritingContinuationFailureMessage(continuation, error), "bad");
          return;
        }
        setStatus(`从图谱进入写作中心失败：${String(error?.message || error)}`, "bad");
      }
    })();
    return true;
  }
  if (!cleanNoteId) return false;
  const sourceNote = state.notes.find((note) => note?.id === cleanNoteId) || null;
  const targetNote = cleanTargetNoteId ? state.notes.find((note) => note?.id === cleanTargetNoteId) || null : null;
  const sourceLabel = sourceNote?.title || cleanNoteId;
  const targetLabel = targetNote?.title || cleanTargetNoteId;
  const relationLabel = cleanRelationType ? graphRelationTypeLabel(cleanRelationType) : "关系";
  const followupStatusOptions = { priority: 2, holdMs: 3200, requireModule: "explorer" };
  const relationDrafts = graphFollowupDraftTemplates({
    action: cleanAction,
    sourceLabel,
    targetLabel,
    relationLabel
  });
  const providedRationaleDraft = String(options.rationaleDraft || "").trim();
  const providedInsightQuestionDraft = String(options.insightQuestionDraft || "").trim();
  if (providedRationaleDraft || providedInsightQuestionDraft) {
    relationDrafts.rationaleDraft = providedRationaleDraft || relationDrafts.rationaleDraft;
    relationDrafts.insightQuestionDraft = providedInsightQuestionDraft || relationDrafts.insightQuestionDraft;
    relationDrafts.variants = [];
    relationDrafts.selectedVariant = "";
  }
  activateModule("explorer");
  openNoteById(cleanNoteId, { preferTitleSelection: false });
  state.inspectorVisible = true;
  editor?.setInspectorVisible?.(true);
  editor?.renderRelated?.("图谱下一步");

  const focusRelationCreate = (entryHint = "") => {
    editor?.openPermanentRelationWorkspace?.(graphRelationWorkspaceRouteForFollowup({
      targetNoteId: cleanTargetNoteId,
      relationType: cleanRelationType,
      notice: entryHint,
      relationDrafts
    }));
  };

  const focusExistingRelationEdit = (entryHint = "") => {
    editor?.setRelationPanelState?.("edit", {
      noteId: cleanNoteId,
      relationId: cleanRelationId,
      entryHint,
      rationaleDraft: relationDrafts.rationaleDraft,
      insightQuestionDraft: relationDrafts.insightQuestionDraft,
      draftVariants: relationDrafts.variants,
      selectedTemplateVariant: relationDrafts.selectedVariant
    });
    editor?.jumpToInspectorSection?.("[data-note-relations-section]");
    const tryOpen = () => {
      const relation = editor?.findSemanticRelation?.(cleanRelationId);
      if (!relation) return false;
      editor?.openEditRelationForm?.(cleanRelationId, {
        entryHint,
        rationaleDraft: relationDrafts.rationaleDraft,
        insightQuestionDraft: relationDrafts.insightQuestionDraft,
        draftVariants: relationDrafts.variants,
        selectedTemplateVariant: relationDrafts.selectedVariant
      });
      window.setTimeout(() => {
        editor?.jumpToInspectorSection?.("[data-edit-relation-form]", {
          focus: true,
          focusSelector: '[data-edit-relation-form] textarea[name="rationale"]'
        });
      }, 40);
      return true;
    };
    if (tryOpen()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryOpen() || attempts >= 20) window.clearInterval(timer);
    }, 120);
  };

  const focusBoundaryField = () => {
    editor?.setDistillationPrefill?.(cleanNoteId, {
      boundaryDraft: relationDrafts.boundaryDraft,
      draftVariants: relationDrafts.variants,
      selectedTemplateVariant: relationDrafts.selectedVariant
    });
    editor?.renderRelated?.("图谱下一步");
    const selectorNoteId = cleanNoteId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const tryFocus = () => {
      const textarea = document.querySelector(
        `[data-note-distillation-section][data-note-id="${selectorNoteId}"] [data-note-distillation-form] textarea[name="boundaryOrCounterpoint"]`
      );
      if (!textarea) return false;
      if (!String(textarea.value || "").trim() && relationDrafts.boundaryDraft) {
        textarea.value = relationDrafts.boundaryDraft;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
      editor?.jumpToInspectorSection?.("[data-note-distillation-section]", {
        focus: true,
        focusSelector: '[data-note-distillation-form] textarea[name="boundaryOrCounterpoint"]'
      });
      return true;
    };
    if (tryFocus()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryFocus() || attempts >= 20) window.clearInterval(timer);
    }, 120);
  };

  if (cleanAction === "relations-edit" && cleanRelationId) {
    focusExistingRelationEdit(`从图谱进入：继续写清“${sourceLabel}”这条${relationLabel}为什么成立。`);
    const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
    setStatus(status.message, status.tone, followupStatusOptions);
    return true;
  }

  if (cleanAction === "relations" || cleanAction === "bridge") {
    focusRelationCreate(
      cleanAction === "bridge"
        ? `从图谱进入：把“${sourceLabel}”和“${targetLabel || "目标笔记"}”关联为一条${relationLabel}。`
        : `从图谱进入：把“${sourceLabel}”和“${targetLabel || "目标笔记"}”建立为带理由的正式关联。`
    );
    const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
    setStatus(status.message, status.tone, followupStatusOptions);
    return true;
  }
  if (actionRoute.kind === "boundary-draft") {
    focusBoundaryField();
    const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
    setStatus(status.message, status.tone, followupStatusOptions);
    return true;
  }
  if (cleanAction === "boundary" || cleanAction === "tension") {
    focusBoundaryField();
    const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
    setStatus(status.message, status.tone, followupStatusOptions);
    return true;
  }
  const status = graphFollowupOpenedNoteStatus({ action: cleanAction });
  setStatus(status.message, status.tone, followupStatusOptions);
  return true;
}

function graphFollowupDraftTemplates({ action = "", sourceLabel = "", targetLabel = "", relationLabel = "" } = {}) {
  const cleanAction = String(action || "").trim().toLowerCase();
  const fromLabel = String(sourceLabel || "当前笔记").trim() || "当前笔记";
  const toLabel = String(targetLabel || "目标笔记").trim() || "目标笔记";
  const relLabel = String(relationLabel || "关系").trim() || "关系";
  const withVariants = (selectedVariant = "", variants = [], boundaryDraft = "") => {
    const cleanVariants = Array.isArray(variants) ? variants.filter((variant) => variant?.key && variant?.label) : [];
    const picked = cleanVariants.find((variant) => variant.key === selectedVariant) || cleanVariants[0] || null;
    return {
      selectedVariant: picked?.key || "",
      variants: cleanVariants,
      rationaleDraft: String(picked?.rationaleDraft || "").trim(),
      insightQuestionDraft: String(picked?.insightQuestionDraft || "").trim(),
      boundaryDraft: String(boundaryDraft || "").trim()
    };
  };
  if (cleanAction === "bridge") {
    return withVariants("writing", [
      {
        key: "argument",
        label: "论证版",
        rationaleDraft: `“${fromLabel}”和“${toLabel}”之间还缺一条可检验的中间判断，因为前者已经说明了________，但后者直接跳到了________。把这条桥接补清后，整段论证才不会像跳步。`,
        insightQuestionDraft: `如果读者现在还接不上“${fromLabel}”和“${toLabel}”，最可能是中间缺了哪条判断？`
      },
      {
        key: "writing",
        label: "写作版",
        rationaleDraft: `“${fromLabel}”和“${toLabel}”之间还缺一小步过渡，因为前者已经说明了________，但后者一下子跳到了________。补上这条桥接后，读者才能顺着同一条思路继续往下走。`,
        insightQuestionDraft: `如果要把“${fromLabel}”自然带到“${toLabel}”，中间最缺的那句过渡判断是什么？`
      },
      {
        key: "product",
        label: "产品版",
        rationaleDraft: `从产品理解上看，“${fromLabel}”和“${toLabel}”之间少了一步用户能感知到的过渡：前者负责________，后者直接要求用户理解________。这条桥接要把中间那步认知转换说清楚。`,
        insightQuestionDraft: `如果把这条桥接做成产品提示或交互反馈，最该暴露给用户的那一步是什么？`
      }
    ]);
  }
  if (cleanAction === "relations-edit") {
    return withVariants("argument", [
      {
        key: "argument",
        label: "论证版",
        rationaleDraft: `这条${relLabel}成立，因为“${fromLabel}”会把________补给当前目标；如果拿掉它，读者会在________这一步感觉论证断开。`,
        insightQuestionDraft: `要让这条${relLabel}更可检验，还缺哪条证据、边界或反方？`
      },
      {
        key: "writing",
        label: "写作版",
        rationaleDraft: `在写作顺序里，“${fromLabel}”之所以应该放在这里，是因为它负责把________交代清楚；没有它，后文的________会显得来得太快。`,
        insightQuestionDraft: `如果把这条${relLabel}写成段落过渡，还要补哪一句承上启下的话？`
      },
      {
        key: "product",
        label: "产品版",
        rationaleDraft: `从产品体验看，这条${relLabel}成立，因为“${fromLabel}”提供了用户理解下一步所需的________；如果缺它，用户会在________这里失去判断依据。`,
        insightQuestionDraft: `如果把这条${relLabel}变成界面提示或流程设计，最该补哪一个判断环节？`
      }
    ]);
  }
  if (cleanAction === "relations") {
    return withVariants("argument", [
      {
        key: "argument",
        label: "论证版",
        rationaleDraft: `“${fromLabel}”和“${toLabel}”可以建立${relLabel}，因为前者会把后者所需的________补清楚；这不是简单相关，而是会直接改变读者如何理解目标判断。`,
        insightQuestionDraft: `如果把这条${relLabel}写得更扎实，还需要补哪条证据、条件或反例？`
      },
      {
        key: "writing",
        label: "写作版",
        rationaleDraft: `在文章推进里，“${fromLabel}”和“${toLabel}”适合用${relLabel}连起来，因为前者负责________，后者接着把________往下展开。`,
        insightQuestionDraft: `如果把这条${relLabel}写进草稿，它更适合放在段落开头、中间还是转折处？`
      },
      {
        key: "product",
        label: "产品版",
        rationaleDraft: `从产品判断看，“${fromLabel}”和“${toLabel}”适合建立${relLabel}，因为前者对应的设计选择会直接影响用户如何理解或完成________。`,
        insightQuestionDraft: `如果要把这条${relLabel}落成产品动作、提示或约束，最该出现在哪一步？`
      }
    ]);
  }
  if (cleanAction === "boundary") {
    return withVariants(
      "argument",
      [
        {
          key: "argument",
          label: "论证版",
          boundaryDraft: `这条判断在________条件下成立；一旦遇到________情况，就需要收窄、改写，或补上一条明确的反例。`
        },
        {
          key: "writing",
          label: "写作版",
          boundaryDraft: `如果把这条判断放进文章里，最容易让读者误解的地方是________。为了不写得过满，这里至少要补上________这个例外条件。`
        },
        {
          key: "product",
          label: "产品版",
          boundaryDraft: `从产品使用场景看，这条判断只在________用户条件下成立；一旦遇到________情境，界面或流程就要明确收窄，而不能默认它总是有效。`
        }
      ],
      `这条判断在________条件下成立；一旦遇到________情况，就需要收窄、改写，或补上一条明确的反例。`
    );
  }
  if (cleanAction === "isolate-keep") {
    return withVariants(
      "argument",
      [
        {
          key: "argument",
          label: "论证版",
          boundaryDraft: `暂时独立：这条判断现在先不连线，因为________。如果未来出现________笔记，再考虑把它作为支持、反驳、限定或桥接关系接入。`
        },
        {
          key: "writing",
          label: "写作版",
          boundaryDraft: `暂时独立：这条判断目前更像一段独立论证，不强行接入现有段落，因为________。等写作主题推进到________时，再决定它是否需要成为过渡或反方。`
        },
        {
          key: "product",
          label: "产品版",
          boundaryDraft: `暂时独立：这条判断对应的使用场景还没有和现有产品线索稳定连接，因为________。等出现________场景证据后，再补成正式关系。`
        }
      ],
      `暂时独立：这条判断现在先不连线，因为________。如果未来出现________笔记，再考虑把它作为支持、反驳、限定或桥接关系接入。`
    );
  }
  if (cleanAction === "isolate-hold") {
    return withVariants(
      "argument",
      [
        {
          key: "argument",
          label: "论证版",
          boundaryDraft: `暂存观察：这条笔记现在还缺少稳定判断，暂不接入关系网。下一步先补清________，再判断它应该支持、反驳、限定还是桥接哪条笔记。`
        },
        {
          key: "writing",
          label: "写作版",
          boundaryDraft: `暂存观察：这条笔记暂时只是一段材料或灵感，还不能直接放进文章结构。等它回答了________这个问题，再决定要不要进入写作篮或关系图谱。`
        },
        {
          key: "product",
          label: "产品版",
          boundaryDraft: `暂存观察：这条笔记还没有对应到清楚的用户场景或决策点。先补________，再判断它是否需要和现有产品判断建立关系。`
        }
      ],
      `暂存观察：这条笔记现在还缺少稳定判断，暂不接入关系网。下一步先补清________，再判断它应该支持、反驳、限定还是桥接哪条笔记。`
    );
  }
  if (cleanAction === "tension") {
    return withVariants(
      "argument",
      [
        {
          key: "argument",
          label: "论证版",
          boundaryDraft: `当前最强的反方或反例是________。如果它成立，那么这条判断至少要在________边界内重新表述。`
        },
        {
          key: "writing",
          label: "写作版",
          boundaryDraft: `为了不把这条判断写成单边论证，这里最好先承认________这个反方，再交代为什么最终仍然保留________这个主判断。`
        },
        {
          key: "product",
          label: "产品版",
          boundaryDraft: `如果用户真的处在________这个反向场景里，当前产品判断就会失效或伤害体验。因此至少要在________这一步给出保护、提示或退出条件。`
        }
      ],
      `当前最强的反方或反例是________。如果它成立，那么这条判断至少要在________边界内重新表述。`
    );
  }
  return withVariants("", [], "");
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

function appShellStateChangeDeps() {
  return buildAppShellStateChangeDeps({
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
  });
}

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

const editor = new EditorPane({
  state,
  elements: {
    tabs: $("tabs"),
    body: $("editorBody"),
    wysiwygHost: $("wysiwygHost"),
    editorHost: $("editorHost"),
    markdownSplit: $("markdownSplit"),
    emptyStart: $("editorEmptyStart"),
    literatureWorkspace: $("literatureWorkspace"),
    literatureQueueSummary: $("literatureQueueSummary"),
    literatureQueueList: $("literatureQueueList"),
    literatureQueueNote: $("literatureQueueNote"),
    literatureOpenNext: $("btnLiteratureOpenNext"),
    literatureTitle: $("literatureTitleInput"),
    literatureOriginal: $("literatureOriginalInput"),
    literatureParaphrase: $("literatureParaphraseInput"),
    literatureWhyKeep: $("literatureWhyKeepInput"),
    literatureSupportsJudgment: $("literatureSupportsJudgmentInput"),
    literatureQuestion: $("literatureQuestionInput"),
    literatureBoundary: $("literatureBoundaryInput"),
    previewPanel: $("markdownPreviewPanel"),
    preview: $("markdownPreview"),
    editorThinkingStatus: $("editorThinkingStatus"),
    assetPreviewMask: $("assetPreviewMask"),
    assetPreviewTitle: $("assetPreviewTitle"),
    assetPreviewBody: $("assetPreviewBody"),
    assetPreviewOpenLink: $("assetPreviewOpenLink"),
    closeAssetPreview: $("btnCloseAssetPreview"),
    editorWrap: $("markdownPanel")?.closest(".editor-wrap"),
    editorRelationsBelow: $("editorRelationsBelow"),
    relatedPanel: $("relatedPanel"),
    result: $("resultArea"),
    linkPicker: $("linkPicker"),
    linkSearchInput: $("linkSearchInput"),
    linkSearchList: $("linkSearchList"),
    linkRelationTypeSelect: $("linkRelationTypeSelect"),
    linkReasonInput: $("linkReasonInput"),
    confirmLinkInsert: $("btnConfirmLinkInsert"),
    closeLinkPicker: $("btnCloseLinkPicker"),
    tagPicker: $("tagPicker"),
    tagSearchInput: $("tagSearchInput"),
    tagSearchList: $("tagSearchList"),
    closeTagPicker: $("btnCloseTagPicker"),
    originalityNotice: $("originalityNotice"),
    originalityNoticeTitle: $("originalityNoticeTitle"),
    originalityNoticeBody: $("originalityNoticeBody"),
    closeOriginalityNotice: $("btnCloseOriginalityNotice"),
    ...editorSelectionAiActionElements($),
    insertLink: $("btnInsertLink"),
    insertImage: $("btnInsertImage"),
    insertTag: $("btnInsertTag"),
    toolbarCommandMenu: $("toolbarCommandMenu"),
    toolbarCommandList: $("toolbarCommandList"),
    headingLevel: $("headingLevelSelect"),
    assetImageInput: $("assetImageInput"),
    assetFileInput: $("assetFileInput"),
    modeEdit: $("btnModeToggle"),
    modeSplit: $("btnModeSplit"),
    modePreview: $("btnModeToggle"),
    showRelated: $("btnShowRelated"),
    hideRelated: $("btnHideRelated"),
    completeNote: $("btnCompleteNote"),
    recordPermanent: $("btnRecordPermanent"),
    save: $("btnSave"),
    statusHint: $("statusHint"),
    authorshipPanel: $("authorshipPanel"),
    authorshipClaimInput: $("authorshipClaimInput"),
    authorshipConfirm: $("authorshipConfirm"),
    authorshipHint: $("authorshipHint"),
    openExternalUrl: desktopCommands.openExternalUrl
  },
  onStatus: setStatus,
  onStateChange: handleStateChange,
  onOpenNote: openNoteById,
  resolveNoteWritingContinuation: (note) => noteMainPathWritingContinuationEntry(note?.id || "", "当前笔记"),
  notifyWorkflowReminder: (event = {}) => {
    if (event?.kind === "relation-network") {
      syncRelationNetworkSystemMessageForNote(event.note, event.overview);
    }
  },
  selectPermanentDirectory,
  resolveLiteratureSectionLabels: currentLiteratureTemplateSectionLabels,
  resolveLiteratureSectionLabelCandidates: literatureTemplateSectionLabelCandidates,
  onChromeChange: () => {
    renderStatusMeta();
    renderWorkspaceStatusHint();
  }
});
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

$("settingsRefreshVault")?.addEventListener("click", async () => {
  setSettingsSection("workspace", { render: false });
  try {
    await refreshVaultSettings();
    setStatus("已刷新当前笔记库信息", "ok");
  } catch (error) {
    setStatus(`刷新笔记库信息失败：${String(error?.message || error)}`, "bad");
  }
});

$("settingsSectionNav")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-settings-section]");
  if (!button) return;
  setSettingsSection(button.getAttribute("data-settings-section"), { announce: true });
});

$("settingsMobileItemSelect")?.addEventListener("change", (event) => {
  setSettingsItem(event.target.value, { announce: true });
});

$("settingsCheckUpdate")?.addEventListener("click", async () => {
  await updateController.refreshAppVersionInfo();
  await updateController.runAppUpdateCheck({ manual: true });
});

$("settingsOpenUpdateDownload")?.addEventListener("click", async () => {
  await updateController.openUpdateDownloadUrl();
});

$("settingsInstallUpdate")?.addEventListener("click", async () => {
  await updateController.installUpdateFromDesktopUpdater();
});

$("settingsRelaunchUpdate")?.addEventListener("click", async () => {
  await updateController.relaunchAfterInstalledUpdate();
});

$("settingsRemindUpdateLater")?.addEventListener("click", () => {
  settingsState.update = updateStateRemindLater(settingsState.update);
  updateController.persistUpdateSettingsToStorage();
  renderSettingsPanel();
  setStatus("已设置稍后提醒，今天不会自动提醒这个更新。", "ok");
});

$("settingsIgnoreUpdateVersion")?.addEventListener("click", () => {
  settingsState.update = updateStateIgnoreLatest(settingsState.update);
  updateController.persistUpdateSettingsToStorage();
  renderSettingsPanel();
  setStatus("已忽略当前检测到的版本；手动检查仍会显示结果。", "ok");
});

$("settingsAutoUpdateEnabled")?.addEventListener("change", (event) => {
  settingsState.update = updateStateAutoCheckEnabled(settingsState.update, event.target.checked);
  updateController.persistUpdateSettingsToStorage();
  renderSettingsPanel();
  setStatus(event.target.checked ? "已开启启动后的每日更新检查。" : "已关闭启动后的自动更新检查。", event.target.checked ? "ok" : "warn");
});

$("moduleSidebar")?.addEventListener("click", (event) => {
  if (state.module !== "settings") return;
  if (event.target.closest("#settingsSidebarBackToApp")) {
    activateModule("explorer");
    return;
  }
  const itemButton = event.target.closest("[data-settings-item]");
  if (itemButton) {
    setSettingsItem(itemButton.getAttribute("data-settings-item"), { announce: true });
    return;
  }
  const button = event.target.closest("[data-settings-section]");
  if (!button) return;
  setSettingsSection(button.getAttribute("data-settings-section"), { announce: true });
});

$("btnEditorHelperMute")?.addEventListener("click", () => {
  editorHelperDismissed = true;
  editorHelperMuted = true;
  writeStoredBoolean(EDITOR_HELPER_MUTE_KEY, true);
  hideEditorHelper();
  setStatus("后续将不再显示这类编辑提示", "ok", { requireModule: "explorer" });
});

$("settingsBrowseVault")?.addEventListener("click", async () => {
  setSettingsSection("workspace", { render: false });
  const picked = await desktopCommands.pickVaultDirectory({ defaultPath: $("settingsVaultPath")?.value || settingsState.vault?.vaultPath || "" });
  if (picked.path) {
    $("settingsVaultPath").value = picked.path;
    setStatus(`已选择笔记库路径（${picked.source}）`, "ok");
  }
});

$("settingsSwitchVault")?.addEventListener("click", async () => {
  setSettingsSection("workspace", { render: false });
  try {
    const currentInputPath = String($("settingsVaultPath")?.value || "").trim();
    const defaultPath = currentInputPath || settingsState.vault?.vaultPath || "";
    let nextPath = currentInputPath;
    if (!currentInputPath) {
      const picked = await desktopCommands.pickVaultDirectory({ defaultPath });
      if (!picked.path) {
        setStatus("未选择新的笔记库路径", "warn");
        return;
      }
      nextPath = String(picked.path || "").trim();
      if ($("settingsVaultPath")) $("settingsVaultPath").value = nextPath;
    }
    if (!editor.confirmDiscardDirtyTabs("切换笔记库会关闭当前所有打开的笔记，未同步更改会丢失。是否继续？")) return;
    const nextVault = await desktopCommands.switchVault(nextPath);
    settingsState.vault = nextVault;
    loadNoteTemplateSettingsFromStorage();
    state.notes = [];
    state.tabs = [];
    state.activeTabId = null;
    state.selectedFileId = null;
    await syncDirectoriesFromApi();
    state.browserRootId = "dir_original_default";
    state.selectedFolderId = "dir_original_default";
    await syncNotesForDirectory(state.selectedFolderId);
    renderAll();
    setStatus(`已重新选择并初始化笔记库：${nextVault.vaultPath}`, "ok");
  } catch (error) {
    setStatus(`切换笔记库失败：${String(error?.message || error)}`, "bad");
  }
});

$("settingsPreviewPermanentTemplate")?.addEventListener("click", () => {
  setSettingsSection("templates", { render: false });
  openNoteTemplatePreview("permanent");
});

$("settingsPreviewLiteratureTemplate")?.addEventListener("click", () => {
  setSettingsSection("templates", { render: false });
  openNoteTemplatePreview("literature");
});

$("settingsSavePermanentTemplate")?.addEventListener("click", () => {
  saveNoteTemplateFromEditor("permanent");
});

$("settingsResetPermanentTemplate")?.addEventListener("click", () => {
  resetNoteTemplateToDefault("permanent");
});

$("settingsSaveLiteratureTemplate")?.addEventListener("click", () => {
  saveNoteTemplateFromEditor("literature");
});

$("settingsResetLiteratureTemplate")?.addEventListener("click", () => {
  resetNoteTemplateToDefault("literature");
});

$("settingsPermanentTemplateEditor")?.addEventListener("input", () => {
  updateNoteTemplatePreviewFromEditor("permanent");
});

$("settingsLiteratureTemplateEditor")?.addEventListener("input", () => {
  updateNoteTemplatePreviewFromEditor("literature");
});

$("settingsTemplatePreviewClose")?.addEventListener("click", () => {
  closeNoteTemplatePreview();
});

$("settingsTemplatePreviewModal")?.addEventListener("click", (event) => {
  if (event.target === $("settingsTemplatePreviewModal")) closeNoteTemplatePreview();
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

$("settingsAiRuntimeMode")?.addEventListener("change", async (event) => {
  await applyAiRuntimeModeChange(event?.target?.value || "auto");
});

$("settingsAiHybridToggle")?.addEventListener("click", async () => {
  const current = normalizeAiRuntimeMode(settingsState.ai.runtimeMode);
  await applyAiRuntimeModeChange(current === "hybrid" ? "auto" : "hybrid");
});

$("settingsAiUserMode")?.addEventListener("change", (event) => {
  const next = String(event?.target?.value || "Auto").trim() || "Auto";
  settingsState.ai.userMode = next;
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(`AI 模式已切换为：${next}`, "ok");
});

$("settingsAiModelPack")?.addEventListener("change", (event) => {
  const next = String(event?.target?.value || "Starter Auto").trim() || "Starter Auto";
  applyAiModelPackChange(next, { source: "settings" });
});

$("settingsAiLocalModel")?.addEventListener("change", async (event) => {
  await selectInstalledLocalModelFromUi(event?.target?.value || "");
});

$("settingsAiAdvancedModelRef")?.addEventListener("blur", (event) => {
  const next = String(event?.target?.value || "").trim();
  settingsState.ai.advancedModelRef = next;
  persistAiSettingsToStorage();
  syncAiSettingsToApi();
  refreshAiRoutePreview();
  renderSettingsPanel();
  setStatus(next ? "指定模型已保存" : "指定模型已清空（恢复自动选择）", "ok");
});

$("settingsAiSecretRef")?.addEventListener("blur", async (event) => {
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("secretRef");
  settingsState.ai.secretRef = next;
  persistAiSettingsToStorage();
  const saved = await syncAiProviderConfigToApi();
  if (!saved) {
    renderSettingsPanel();
    return;
  }
  renderSettingsPanel();
  setStatus(next ? "密钥名称已保存到服务连接" : "密钥名称已清空，服务连接已停用", "ok");
});

$("settingsAiSecretRef")?.addEventListener("input", (event) => {
  markAiProviderDraftTouched("secretRef");
  settingsState.ai.secretRef = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiRemoteRuntimeModel")?.addEventListener("input", (event) => {
  markAiProviderDraftTouched("remoteRuntimeModel");
  settingsState.ai.remoteRuntimeModel = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiRemoteRuntimeModel")?.addEventListener("blur", async (event) => {
  markAiProviderDraftTouched("remoteRuntimeModel");
  settingsState.ai.remoteRuntimeModel = String(event?.target?.value || "").trim();
  persistAiSettingsToStorage();
  const saved = await syncAiProviderConfigToApi();
  if (!saved) {
    renderSettingsPanel();
    return;
  }
  renderSettingsPanel();
  setStatus(settingsState.ai.remoteRuntimeModel ? "远程模型已保存到服务连接" : "远程模型已清空，服务连接已停用", "ok");
});

$("settingsAiProviderEndpointUrl")?.addEventListener("input", (event) => {
  markAiProviderDraftTouched("providerEndpointUrl");
  settingsState.ai.providerEndpointUrl = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiProviderEndpointUrl")?.addEventListener("blur", async (event) => {
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("providerEndpointUrl");
  settingsState.ai.providerEndpointUrl = next;
  persistAiSettingsToStorage();
  const saved = await syncAiProviderConfigToApi();
  if (!saved) {
    renderSettingsPanel();
    return;
  }
  renderSettingsPanel();
});

$("settingsAiTestPrompt")?.addEventListener("input", (event) => {
  settingsState.ai.testPrompt = String(event?.target?.value || "");
  if (settingsState.ai.testMeta === "需要测试内容") {
    settingsState.ai.testMeta = "";
    settingsState.ai.testOutput = "";
    const meta = $("settingsAiTestChatMeta");
    const output = $("settingsAiTestChatOutput");
    if (meta) meta.textContent = "等待运行";
    if (output) output.textContent = "（空）";
  }
  persistAiSettingsToStorage();
});

$("btnAiTestChatRun")?.addEventListener("click", async () => {
  const promptInput = $("settingsAiTestPrompt");
  const prompt = String(promptInput?.value || settingsState.ai.testPrompt || "").trim();
  if (!prompt) {
    settingsState.ai.testMeta = "需要测试内容";
    settingsState.ai.testOutput = "请先输入一句不含敏感内容的测试内容。例如：请用一句话总结“研究笔记应该先记录问题，再整理结论”。";
    renderSettingsPanel();
    $("settingsAiTestPrompt")?.focus();
    return setStatus("先输入一条测试内容", "warn");
  }
  const blockedReason = aiTestBlockedReason();
  if (blockedReason) {
    settingsState.ai.testMeta = blockedReason;
    settingsState.ai.testOutput = `${blockedReason}，再试运行。`;
    renderSettingsPanel();
    return setStatus(`${blockedReason}，再试运行`, "warn");
  }
  settingsState.ai.testRunning = true;
  settingsState.ai.testMeta = "";
  settingsState.ai.testOutput = "";
  renderSettingsPanel();
  try {
    const providerId = currentAiProviderId();
    const settingsPayload = aiSettingsPayload();
    const advancedSettings = settingsPayload.advancedSettings || {};
    const result = await runAiTestChat({
      ...settingsPayload,
      prompt,
      authMode: authModeForProvider(providerId, settingsState.ai.routePreview),
      ...(advancedSettings.secretRef ? { secretRef: advancedSettings.secretRef } : {}),
      ...(advancedSettings.modelRef ? { modelRef: advancedSettings.modelRef } : {}),
      modelTier: "standard",
      privacyMode: settingsState.ai.routePreview?.privacy?.mode || ""
    });
    settingsState.ai.testMeta = `${result?.providerId || "服务"} / ${result?.modelRef || "模型"} (${result?.status || "未检测"})`;
    settingsState.ai.testOutput = String(result?.output?.content || "").trim() || JSON.stringify(result?.output?.json || result || {}, null, 2);
    setStatus("AI 试运行已完成", "ok");
  } catch (error) {
    settingsState.ai.testMeta = "运行失败";
    settingsState.ai.testOutput = String(error?.message || error);
    setStatus(`AI 试运行失败：${settingsState.ai.testOutput}`, "bad");
  } finally {
    settingsState.ai.testRunning = false;
    renderSettingsPanel();
  }
});

$("btnAiTestChatCopy")?.addEventListener("click", async () => {
  const text = String(settingsState.ai.testOutput || "").trim();
  if (!text) return setStatus("没有可复制的输出", "warn");
  try {
    await navigator.clipboard.writeText(text);
    setStatus("已复制输出", "ok");
  } catch {
    setStatus("复制失败（浏览器权限限制）", "warn");
  }
});

$("settingsAiProviderHealthEndpointUrl")?.addEventListener("input", (event) => {
  markAiProviderDraftTouched("providerHealthEndpointUrl");
  settingsState.ai.providerHealthEndpointUrl = String(event?.target?.value || "").trim();
  settingsState.ai.providerConfigError = "";
  settingsState.ai.providerHealthResult = null;
  persistAiSettingsToStorage();
});

$("settingsAiProviderHealthEndpointUrl")?.addEventListener("blur", (event) => {
  const next = String(event?.target?.value || "").trim();
  markAiProviderDraftTouched("providerHealthEndpointUrl");
  settingsState.ai.providerHealthEndpointUrl = next;
  persistAiSettingsToStorage();
  renderSettingsPanel();
});

$("settingsAiSaveProviderConfig")?.addEventListener("click", async () => {
  await syncAiProviderConfigToApi();
});

$("settingsAiCheckProviderHealth")?.addEventListener("click", async () => {
  await checkCurrentAiProviderHealth();
});

$("settingsAiRemoteHelpToggle")?.addEventListener("click", () => {
  const help = $("settingsAiRemoteHelp");
  const toggle = $("settingsAiRemoteHelpToggle");
  if (!help || !toggle) return;
  const shouldShow = help.classList.contains("hidden");
  help.classList.toggle("hidden", !shouldShow);
  toggle.setAttribute("aria-expanded", shouldShow ? "true" : "false");
  toggle.textContent = shouldShow ? "收起帮助" : "帮助";
});

$("settingsAiDetectOllama")?.addEventListener("click", async () => {
  await detectOllamaModels();
});

$("settingsAiStartOllama")?.addEventListener("click", async () => {
  await startOllamaRuntimeFromUi();
});

$("settingsAiStopOllama")?.addEventListener("click", async () => {
  await stopOllamaRuntimeFromUi();
});

$("settingsAiPullOllamaModel")?.addEventListener("click", async () => {
  await pullRecommendedOllamaModel();
});

$("settingsAiCopyOllamaInstallCommand")?.addEventListener("click", async (event) => {
  const command = String(event?.currentTarget?.dataset?.command || "").trim();
  if (!command) return setStatus("当前没有可复制的安装命令", "warn");
  try {
    await copyTextToClipboard(command);
    setStatus("已复制安装命令", "ok");
  } catch {
    setStatus("复制失败，请手动复制安装命令", "warn");
  }
});

$("settingsCardAiSettings")?.addEventListener("click", async (event) => {
  const selectLocalModelButton = event.target.closest("[data-settings-ai-select-local-model]");
  if (selectLocalModelButton) {
    await selectInstalledLocalModelFromUi(selectLocalModelButton.getAttribute("data-settings-ai-select-local-model"));
    return;
  }
  const detectOllamaButton = event.target.closest("[data-settings-ai-detect-ollama]");
  if (detectOllamaButton) {
    await detectOllamaModels();
    return;
  }
  const pullLocalModelButton = event.target.closest("[data-settings-ai-pull-local-model]");
  if (pullLocalModelButton) {
    await pullRecommendedOllamaModel(pullLocalModelButton.getAttribute("data-settings-ai-pull-local-model"));
    return;
  }
  const copyLocalModelCommandButton = event.target.closest("[data-settings-ai-copy-command]");
  if (copyLocalModelCommandButton) {
    const command = String(copyLocalModelCommandButton.getAttribute("data-settings-ai-copy-command") || "").trim();
    if (!command) return;
    try {
      await copyTextToClipboard(command);
      setStatus("已复制模型下载命令", "ok");
    } catch {
      setStatus("复制失败，请手动选择命令文本", "warn");
    }
    return;
  }
  const quickSetupButton = event.target.closest("[data-settings-ai-quick-setup]");
  if (quickSetupButton) {
    await applySettingsAiQuickSetup(quickSetupButton.getAttribute("data-settings-ai-quick-setup"));
    return;
  }
  const openButton = event.target.closest("[data-settings-ai-dialog-open]");
  if (openButton) {
    openSettingsAiDialog(openButton.getAttribute("data-settings-ai-dialog-open"));
    return;
  }
  if (event.target.closest("[data-settings-ai-dialog-close]")) {
    closeSettingsAiDialogs();
    return;
  }
  const popover = event.target.closest(".settings-ai-popover");
  if (popover && event.target === popover) closeSettingsAiDialogs();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSettingsAiDialogs();
});

$("settingsPaneAutomationBody")?.addEventListener("click", async (event) => {
  if (!event.target.closest("#settingsScheduledTasksPanel")) return;
  const formSummary = event.target.closest(".scheduled-task-form-details > summary");
  if (formSummary) {
    const details = formSummary.closest(".scheduled-task-form-details");
    settingsState.ai.scheduledTaskFormOpen = !details?.open;
    return;
  }

  if (event.target.closest("#btnScheduledTasksApplyFilters")) {
    settingsState.ai.scheduledTaskFilters = scheduledTaskFiltersFromUi();
    await refreshScheduledTasks();
    setStatus("计划任务已刷新", "ok");
    return;
  }

  if (event.target.closest("#btnScheduledTasksRefresh")) {
    await refreshScheduledTasks();
    setStatus("计划任务已刷新", "ok");
    return;
  }

  if (event.target.closest("#btnScheduledTasksRunDue")) {
    await runDueScheduledTasksFromUi();
    return;
  }

  if (event.target.closest("#btnScheduledTaskUseCurrentNote")) {
    const noteId = String(state.selectedFileId || state.activeTabId || "").trim();
    if (!noteId) return setStatus("还没有选中当前笔记", "warn");
    settingsState.ai.scheduledTaskForm = {
      ...scheduledTaskFormFromUi(),
      noteIdsText: noteId,
      directoryIdsText: ""
    };
    settingsState.ai.scheduledTaskFormOpen = true;
    renderScheduledTasksWorkspace();
    return;
  }

  if (event.target.closest("#btnScheduledTaskUseCurrentDirectory")) {
    const directoryId = String(state.selectedFolderId || "").trim();
    if (!directoryId) return setStatus("还没有选中当前目录", "warn");
    settingsState.ai.scheduledTaskForm = {
      ...scheduledTaskFormFromUi(),
      noteIdsText: "",
      directoryIdsText: directoryId
    };
    settingsState.ai.scheduledTaskFormOpen = true;
    renderScheduledTasksWorkspace();
    return;
  }

  if (event.target.closest("#btnScheduledTaskClearForm")) {
    resetScheduledTaskForm();
    setStatus("计划任务草稿已重置", "ok");
    return;
  }

  if (event.target.closest("#btnScheduledTaskSave")) {
    await saveScheduledTaskFromUi();
    return;
  }

  const editButton = event.target.closest("[data-scheduled-task-edit]");
  if (editButton) {
    editScheduledTaskFromList(editButton.getAttribute("data-scheduled-task-edit"));
    return;
  }

  const statusButton = event.target.closest("[data-scheduled-task-status]");
  if (statusButton) {
    await setScheduledTaskStatus(
      statusButton.getAttribute("data-scheduled-task-id"),
      statusButton.getAttribute("data-scheduled-task-status")
    );
  }
});

$("settingsPaneAutomationBody")?.addEventListener("input", (event) => {
  if (!event.target.closest("#settingsScheduledTasksPanel")) return;
  if (!event.target.closest("#scheduledTaskForm")) return;
  settingsState.ai.scheduledTaskForm = scheduledTaskFormFromUi();
  settingsState.ai.scheduledTaskFormOpen = true;
});

$("settingsPaneAutomationBody")?.addEventListener("change", (event) => {
  if (!event.target.closest("#settingsScheduledTasksPanel")) return;
  if (!event.target.closest("#scheduledTaskForm")) return;
  settingsState.ai.scheduledTaskForm = scheduledTaskFormFromUi();
  settingsState.ai.scheduledTaskFormOpen = true;
  if (event.target.closest("#scheduledTaskTemplateSelect")) {
    applyScheduledTaskTemplateToForm(event.target.value);
  }
});

bindAiSuggestionsWorkspaceEvents($("settingsAiSuggestionsPanel"), {
  settingsAiState: settingsState.ai,
  getFilters: aiSuggestionFiltersFromUi,
  refreshAiSuggestions,
  loadAiSuggestionDetail,
  applyAiSuggestionStatus,
  openTargetNote: async (noteId) => {
    const cleanNoteId = String(noteId || "").trim();
    if (!cleanNoteId) {
      setStatus("这条建议还没有指向目标笔记", "warn");
      return false;
    }
    activateModule("explorer");
    openNoteById(cleanNoteId, { preferTitleSelection: false });
    setStatus("已打开目标笔记，你可以继续审阅这条已采纳的草稿", "ok");
    return true;
  },
  refreshStatusMessage: "AI 建议已刷新",
  setStatus
});

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

$("btnWritingUseCurrent")?.addEventListener("click", () => {
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  if (!note) return setStatus("请先在左侧选择一条永久笔记", "warn");
  const eligibility = writingNoteEligibility(note);
  if (!eligibility.ok) {
    const message =
      eligibility.key === "type"
        ? "写作篮只接受永久笔记，请先切到永久笔记目录选择笔记"
        : eligibility.message;
    return setStatus(message, "warn");
  }
  const plan = continueWritingEntry([note.id], {
    title: normalizeWritingProjectTitleSeed(note.title || "新的项目"),
    source: "writing_panel_current_note"
  });
  const addedCount = Number(plan?.addedNoteIds?.length || 0);
  setStatus(addedCount > 0 ? `已加入写作篮：${note.title}` : `写作篮已包含：${note.title}`, "ok");
});

$("btnWritingAddVisible")?.addEventListener("click", () => {
  const allCandidates = writingCandidateNotes();
  const candidateFocusSourceIds = uniqueStrings([
    ...allCandidates.map((note) => note.id),
    ...writingState.focusedCandidateNoteIds
  ]);
  const candidateFocusPlan = planWritingCandidateFocus({
    candidateNoteIds: candidateFocusSourceIds,
    focusedNoteIds: writingState.focusedCandidateNoteIds,
    focusedScopeLabel: writingState.focusedCandidateScopeLabel || "当前图谱切片"
  });
  const candidateById = new Map(allCandidates.map((note) => [note.id, note]));
  const candidates = candidateFocusPlan.usingFocusedScope
    ? candidateFocusPlan.noteIds
        .map((id) => writingKnownNoteById(id) || null)
        .filter((note) => Boolean(note) && isWritingEligibleNote(note))
    : candidateFocusPlan.noteIds.map((id) => candidateById.get(id) || null).filter(Boolean);
  if (!candidates.length) {
    return setStatus(
      candidateFocusPlan.usingFocusedScope ? `${candidateFocusPlan.scopeLabel}里没有可加入的永久笔记` : "当前目录没有可加入的永久笔记",
      "warn"
    );
  }
  const candidateIds = candidates.map((note) => note.id);
  const plan = continueWritingEntry(candidateIds, {
    title: suggestedWritingProjectTitle(candidateIds),
    source: "writing_panel_visible_notes"
  });
  const addedCount = Number(plan?.addedNoteIds?.length || 0);
  setStatus(
    describeWritingBatchAppendStatus({
      scopeLabel: candidateFocusPlan.scopeLabel,
      addedCount,
      totalCount: candidates.length
    }),
    "ok"
  );
});

$("btnWritingClearBasket")?.addEventListener("click", () => {
  resetWritingStrongModelState();
  clearWritingBasket();
  clearWritingSourceIndexIds();
  resetWritingProjectContext();
  renderWritingPanel();
  showWritingResult("已清空写作篮。");
  setStatus("已清空写作篮", "ok");
});

$("writingBasketNoteIds")?.addEventListener("input", handleWritingBasketManualInput);

$("btnWritingStrongModelAnalysis")?.addEventListener("click", async () => {
  await prepareWritingStrongModelAnalysis();
});

$("btnWritingLocalBookIdeas")?.addEventListener("click", async () => {
  const notes = writingBasketEntries();
  if (!notes.length) {
    setStatus("先把易经材料加入写作篮，再生成书稿方向建议", "warn");
    return;
  }
  writingState.localBookIdeas = deriveWritingLocalBookIdeas({ notes, project: writingState.project });
  writingState.localBookIdeasGeneratedAt = new Date().toISOString();
  if (writingState.project?.id) {
    try {
      writingState.project = await updateWritingProjectBookStructure(writingState.project.id, {
        bookStructure: currentWritingBookStructure({ notes, includeLocalIdeas: true })
      });
      writingState.localBookIdeas = normalizeWritingBookStructure(writingState.project?.book_structure || {}).direction_ideas;
    } catch (error) {
      setStatus(`书稿方向已在本地生成，但保存到项目失败：${String(error?.message || error)}`, "warn");
      renderWritingPanel();
      return;
    }
  }
  renderWritingPanel();
  setStatus(
    writingState.project?.id
      ? "已生成 3 个书稿方向，并保存到当前项目结构"
      : "已在本地生成 3 个书稿方向建议；不会上传材料，也不会自动写入项目",
    "ok"
  );
});

$("writingCandidateList")?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-writing-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-action") || "");
  const noteId = String(button.getAttribute("data-writing-note-id") || "");
  if (!noteId) return;
  const noteLabel = writingKnownNoteById(noteId)?.title || noteId;
  if (action === "add") {
    const note = writingNoteById(noteId);
    const plan = continueWritingEntry([noteId], {
      title: note?.title || noteId,
      source: "writing_candidate_list"
    });
    const addedCount = Number(plan?.addedNoteIds?.length || 0);
    setStatus(addedCount > 0 ? `已加入写作篮：${noteLabel}` : `写作篮已包含：${noteLabel}`, "ok");
    return;
  }
  if (action === "remove") {
    resetWritingStrongModelState();
    clearWritingSourceIndexIds();
    removeWritingBasketId(noteId);
    renderWritingPanel();
    setStatus(`已移出写作篮：${noteLabel}`, "ok");
    return;
  }
  if (action === "open") {
    openNoteById(noteId);
    setStatus(`已打开永久笔记：${noteLabel}`, "ok");
  }
});

$("writingBasketList")?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-writing-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-action") || "");
  const noteId = String(button.getAttribute("data-writing-note-id") || "");
  if (!noteId) return;
  const noteLabel = writingKnownNoteById(noteId)?.title || noteId;
  if (action === "remove") {
    resetWritingStrongModelState();
    clearWritingSourceIndexIds();
    removeWritingBasketId(noteId);
    renderWritingPanel();
    setStatus(`已移出写作篮：${noteLabel}`, "ok");
    return;
  }
  if (action === "open") {
    openNoteById(noteId);
    setStatus(`已打开永久笔记：${noteLabel}`, "ok");
  }
});

$("btnWritingRefreshThemeIndexes")?.addEventListener("click", async () => {
  try {
    await loadWritingThemeIndexes();
    setStatus("已刷新主题索引", "ok");
  } catch (error) {
    setStatus(`刷新主题索引失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingSaveThemeIndex")?.addEventListener("click", async () => {
  try {
    const card = await saveWritingBasketAsThemeIndex();
    if (!card) return;
    setStatus(`已保存主题索引：${card.title}`, "ok");
  } catch (error) {
    setStatus(`保存主题索引失败：${String(error?.message || error)}`, "bad");
  }
});

$("writingThemeIndexList")?.addEventListener("click", async (event) => {
  const card = event.target?.closest?.("[data-writing-index-card-id]");
  const button = event.target?.closest?.("[data-writing-index-action]");
  if (!button && card) {
    const cardId = String(card.getAttribute("data-writing-index-card-id") || "");
    if (!cardId) return;
    try {
      await selectWritingThemeIndex(cardId);
      setStatus(`已查看主题索引：${cardId}`, "ok");
    } catch (error) {
      setStatus(`打开主题索引失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (!button) return;
  const action = String(button.getAttribute("data-writing-index-action") || "");
  const indexId = String(button.getAttribute("data-writing-index-id") || "");
  const projectId = String(button.getAttribute("data-writing-project-id") || "");
  const continuationRoute = writingThemeIndexContinuationRoute({ action, projectId });
  if (continuationRoute.kind === "continue-project") {
    try {
      await continueWritingProjectEntry(continuationRoute.projectId, {
        openDraft: continuationRoute.openDraft,
        statusMessage: continuationRoute.statusMessage
      });
    } catch (error) {
      setStatus(`${continuationRoute.failurePrefix}失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (continuationRoute.kind === "missing-project") return;
  if (!indexId) return;
  if (action === "use") {
    try {
      const { indexCard, noteIds, addedCount } = await useThemeIndexAsWritingEntry(indexId, {
        replaceBasket: false,
        resetContext: false,
        source: "writing_theme_index_list"
      });
      setStatus(
        addedCount > 0
          ? `已从主题索引进入写作篮：${indexCard.title || indexId}（新增 ${addedCount} 条，共 ${noteIds.length} 条）`
          : `主题索引已在写作篮中：${indexCard.title || indexId}`,
        "ok"
      );
    } catch (error) {
      setStatus(`使用主题索引失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "open") {
    try {
      await selectWritingThemeIndex(indexId);
      setStatus(`已查看主题索引：${indexId}`, "ok");
    } catch (error) {
      setStatus(`打开主题索引失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("writingThemeDetail")?.addEventListener("click", async (event) => {
  const actionButton = event.target?.closest?.("[data-writing-theme-action]");
  if (!actionButton) return;
  const action = String(actionButton.getAttribute("data-writing-theme-action") || "");
  const indexId = String(actionButton.getAttribute("data-writing-theme-id") || "");
  const noteId = String(actionButton.getAttribute("data-writing-note-id") || "");
  const projectId = String(actionButton.getAttribute("data-writing-project-id") || "");
  try {
    if (action === "save") {
      const item = await saveSelectedThemeIndexDetail();
      setStatus(`已保存主题：${item.title || item.id}`, "ok");
      return;
    }
    if (action === "use") {
      const { indexCard, noteIds, addedCount } = await useThemeIndexAsWritingEntry(indexId, {
        replaceBasket: false,
        resetContext: false,
        source: "writing_theme_detail"
      });
      setStatus(
        addedCount > 0
          ? `已从主题进入写作篮：${indexCard.title || indexId}（新增 ${addedCount} 条，共 ${noteIds.length} 条）`
          : `主题已在写作篮中：${indexCard.title || indexId}`,
        "ok"
      );
      return;
    }
    if (action === "open-draft" && projectId) {
      await continueWritingProjectEntry(projectId, {
        openDraft: true,
        statusMessage: `已从主题打开当前草稿：${projectId}`
      });
      return;
    }
    if ((action === "resume-project" || action === "resume-scaffold") && projectId) {
      await continueWritingProjectEntry(projectId, {
        statusMessage: action === "resume-scaffold" ? `已从主题回到草稿骨架：${projectId}` : `已从主题继续当前项目：${projectId}`
      });
      return;
    }
      if (action === "create-project") {
        const selectedTheme = writingThemeIndexById(indexId) || (await fetchIndexCard(indexId));
        const existingProject = findExistingWritingProjectForTheme(selectedTheme, writingThemeIndexNoteIds(selectedTheme));
        if (existingProject?.id) {
          await continueWritingProjectEntry(existingProject.id, {
            openDraft: Boolean(existingProject.draft_note_id),
            statusMessage: existingProject.draft_note_id
              ? `已从主题打开当前草稿：${existingProject.id}`
              : existingProject.scaffold_id
                ? `已从主题回到草稿骨架：${existingProject.id}`
                : `已从主题继续当前项目：${existingProject.id}`
          });
          return;
        }
      const project = await createWritingProjectFromThemeIndex(indexId);
      setStatus(`已从主题创建项目：${project?.id}`, "ok");
      return;
    }
    if (action === "replace-from-basket") {
      const item = await syncSelectedThemeIndexWithBasket("replace");
      setStatus(`已用当前写作篮覆盖主题：${item.title || item.id}`, "ok");
      return;
    }
    if (action === "append-from-basket") {
      const item = await syncSelectedThemeIndexWithBasket("append");
      setStatus(`已把当前写作篮加入主题：${item.title || item.id}`, "ok");
      return;
    }
    if (action === "open-note" && noteId) {
      activateModule("explorer");
      openNoteById(noteId);
      setStatus(`已打开主题中的永久笔记：${noteId}`, "ok");
      return;
    }
    if (action === "remove-note" && noteId) {
      const item = await removeNoteFromSelectedThemeIndex(noteId);
      setStatus(`已从主题移出笔记：${noteId}（${item.title || item.id}）`, "ok");
      return;
    }
  } catch (error) {
    if (action === "open-draft" || action === "resume-project" || action === "resume-scaffold") {
      setStatus(
        `${action === "open-draft" ? "从主题打开当前草稿" : action === "resume-scaffold" ? "从主题回到草稿骨架" : "从主题继续当前项目"}失败：${String(error?.message || error)}`,
        "bad"
      );
      return;
    }
    setStatus(`主题操作失败：${String(error?.message || error)}`, "bad");
  }
});

$("writingProjectsList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-project-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-project-action") || "");
  const projectId = String(button.getAttribute("data-writing-project-id") || "");
  if (!projectId) return;
  if (action === "open-draft" || action === "resume-project" || action === "resume-scaffold") {
    try {
      await continueWritingProjectEntry(projectId, {
        openDraft: action === "open-draft",
        statusMessage:
          action === "open-draft"
            ? `已从项目列表打开当前草稿：${projectId}`
            : action === "resume-scaffold"
              ? `已从项目列表回到草稿骨架：${projectId}`
              : action === "resume-project"
                ? `已从项目列表继续当前项目：${projectId}`
                : ""
      });
    } catch (error) {
      setStatus(
        `${action === "open-draft" ? "从项目列表打开当前草稿" : action === "resume-scaffold" ? "从项目列表回到草稿骨架" : "从项目列表继续当前项目"}失败：${String(error?.message || error)}`,
        "bad"
      );
    }
    return;
  }
  if (action === "open") {
    try {
      await openWritingProject(projectId);
      setStatus(`已恢复项目：${projectId}`, "ok");
    } catch (error) {
      setStatus(`打开项目失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }

  const project = writingState.projects.find((item) => item.id === projectId) || { id: projectId };
  if (action === "copy-scaffold") {
    try {
      const result = await copyWritingScaffold(project);
      setStatus(`已复制草稿骨架 Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`复制草稿骨架失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "export-scaffold") {
    try {
      const result = await exportWritingScaffold(project);
      setStatus(`已导出草稿骨架 Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`导出草稿骨架失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("writingScaffoldVersionsList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-scaffold-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-scaffold-action") || "");
  const scaffoldId = String(button.getAttribute("data-writing-scaffold-id") || "");
  if (!scaffoldId) return;
  const version = writingState.scaffoldVersions.find((item) => item.id === scaffoldId) || { id: scaffoldId, writing_project_id: writingState.project?.id };

  if (action === "open") {
    try {
      await openScaffoldVersion(scaffoldId);
      setStatus(`已切换到草稿骨架版本：${scaffoldId}`, "ok");
    } catch (error) {
      setStatus(`打开草稿骨架版本失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }

  const projectLike = {
    ...(writingState.project || {}),
    id: writingState.project?.id || version.writing_project_id,
    scaffold_id: scaffoldId
  };
  if (action === "copy") {
    try {
      const result = await copyWritingScaffold(projectLike);
      setStatus(`已复制草稿骨架 Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`复制草稿骨架失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "export") {
    try {
      const result = await exportWritingScaffold(projectLike);
      setStatus(`已导出草稿骨架 Markdown：${result.fileName}`, "ok");
    } catch (error) {
      setStatus(`导出草稿骨架失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "edit-note") {
    const nextNote = promptVersionNoteEdit(version?.version_note || "", "草稿骨架版本");
    if (nextNote === null) return;
    try {
      const updated = await updateDraftScaffoldVersionNote(scaffoldId, nextNote);
      writingState.scaffoldVersions = writingState.scaffoldVersions.map((item) =>
        item.id === scaffoldId ? { ...item, version_note: updated?.version_note || "" } : item
      );
      if (writingState.scaffold?.id === scaffoldId) {
        writingState.scaffold = {
          ...writingState.scaffold,
          version_note: updated?.version_note || ""
        };
      }
      renderWritingPanel();
      setStatus(`已更新草稿骨架版本说明：${scaffoldId}`, "ok");
    } catch (error) {
      setStatus(`更新草稿骨架版本说明失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("writingDraftVersionsList")?.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-writing-draft-action]");
  if (!button) return;
  const action = String(button.getAttribute("data-writing-draft-action") || "");
  const draftNoteId = String(button.getAttribute("data-writing-draft-note-id") || "");
  const draftVersionId = String(button.getAttribute("data-writing-draft-version-id") || "");
  if (!draftNoteId) return;
  if (action === "edit-note") {
    const version = writingState.draftVersions.find((item) => item.id === draftVersionId) || null;
    const nextNote = promptVersionNoteEdit(version?.version_note || "", "草稿版本");
    if (nextNote === null) return;
    try {
      const updated = await updateDraftNoteVersionNote(draftVersionId, nextNote);
      writingState.draftVersions = writingState.draftVersions.map((item) =>
        item.id === draftVersionId ? { ...item, version_note: updated?.version_note || "" } : item
      );
      renderWritingPanel();
      setStatus(`已更新草稿版本说明：${draftVersionId}`, "ok");
    } catch (error) {
      setStatus(`更新草稿版本说明失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "set-current") {
    try {
      const project = await setWritingCurrentDraftNote(writingState.project?.id, draftNoteId);
      writingState.project = project;
      await loadWritingProjectsList();
      await loadWritingDraftVersions();
      renderWritingPanel();
      setStatus(`已将草稿版本设为当前：${draftNoteId}`, "ok");
    } catch (error) {
      setStatus(`设为当前版本失败：${String(error?.message || error)}`, "bad");
    }
    return;
  }
  if (action === "open") {
    try {
      if (!writingNoteById(draftNoteId)) {
        const fetched = await fetchNote(draftNoteId);
        if (fetched) state.notes = [mapNoteItem(fetched), ...state.notes.filter((item) => item.id !== draftNoteId)];
      }
      activateModule("explorer");
      openNoteById(draftNoteId);
      setStatus(`已打开草稿版本：${draftNoteId}`, "ok");
    } catch (error) {
      setStatus(`打开草稿版本失败：${String(error?.message || error)}`, "bad");
    }
  }
});

$("btnWritingRefreshProjects")?.addEventListener("click", async () => {
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
    setStatus("已刷新最近项目", "ok");
  } catch (error) {
    setStatus(`刷新项目失败：${String(error?.message || error)}`, "bad");
  }
});

$("writingProjectsSearch")?.addEventListener("input", async () => {
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
  } catch {}
});

$("writingProjectsStatusFilter")?.addEventListener("change", async () => {
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
  } catch {}
});

$("writingProjectsDraftFilter")?.addEventListener("change", async () => {
  try {
    syncWritingProjectFiltersFromUi();
    await loadWritingProjectsList();
  } catch {}
});

$("btnWritingRefreshScaffolds")?.addEventListener("click", async () => {
  try {
    await loadWritingScaffoldVersions();
    setStatus("已刷新草稿骨架版本", "ok");
  } catch (error) {
    setStatus(`刷新草稿骨架版本失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingRefreshDraftVersions")?.addEventListener("click", async () => {
  try {
    await loadWritingDraftVersions();
    setStatus("已刷新草稿版本", "ok");
  } catch (error) {
    setStatus(`刷新草稿版本失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingCreateProject")?.addEventListener("click", async () => {
  try {
    await createWritingProjectFromCurrentBasket();
  } catch (error) {
    setStatus(`从写作中心创建项目失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingCreateScaffold")?.addEventListener("click", async () => {
  const writingProjectId = writingState.project?.id;
  const projectPreflightSummary = describeWritingProjectPreflight(writingState.project?.preflight || null);
  const continuation = !writingProjectId ? currentWritingContinuationEntry("当前写作篮") : null;
  const missingProjectLabel = String($("btnWritingCreateScaffold")?.textContent || "").trim();
  if (!writingProjectId && continuation?.projectId) {
    try {
      await continueWritingProjectEntry(continuation.projectId, {
        openDraft: continuation.action === "open-draft",
        statusMessage: writingCenterContinuationStatusMessage(continuation)
      });
    } catch (error) {
      setStatus(writingCenterContinuationFailureMessage(continuation, error), "bad");
    }
    return;
  }
  if (!writingProjectId) return setStatus(missingProjectLabel || "先补写作材料", "warn");
  if (projectPreflightSummary.level !== "ready") {
    return setStatus(writingScaffoldPreflightWarning(projectPreflightSummary), "warn");
  }
  try {
    const result = await createDraftScaffold(writingProjectId, currentWritingVersionNote());
    writingState.scaffold = result.item || null;
    writingState.scaffoldMarkdown = result.export?.markdown || "";
    if (writingState.project) {
      const returnedProject = result.item?.writing_project || null;
      writingState.project = {
        ...writingState.project,
        ...(returnedProject || {}),
        scaffold_id: returnedProject?.scaffold_id || result.item?.id || null
      };
    }
    showWritingResult({
      stage: "draft_scaffold",
      writingProjectId,
      draftScaffoldId: result.item?.id,
      sections: result.item?.sections,
      markdown: result.export?.markdown,
      versionNote: result.item?.version_note || ""
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    renderWritingPanel();
    setStatus(`草稿骨架已生成：${result.item?.id}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "draft_scaffold_error",
      writingProjectId,
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`草稿骨架生成失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingCopyScaffold")?.addEventListener("click", async () => {
  try {
    const result = await copyWritingScaffold();
    setStatus(`已复制草稿骨架 Markdown：${result.fileName}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_copy_scaffold_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null
    });
    setStatus(`复制草稿骨架失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingExportScaffold")?.addEventListener("click", async () => {
  try {
    const result = await exportWritingScaffold();
    setStatus(`已导出草稿骨架 Markdown：${result.fileName}`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_export_scaffold_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null
    });
    setStatus(`导出草稿骨架失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingSaveDraft")?.addEventListener("click", async () => {
  const missingScaffoldLabel = String($("btnWritingSaveDraft")?.textContent || "").trim();
  if (!writingState.scaffold || !String(writingState.scaffoldMarkdown || "").trim()) {
    showWritingResult({
      stage: "writing_draft_note_error",
      message: "scaffold is required before creating a draft note",
      code: "WRITING_DRAFT_INVALID"
    });
    return setStatus(missingScaffoldLabel || "先生成草稿骨架", "warn");
  }
  const projectPreflightSummary = describeWritingProjectPreflight(writingState.project?.preflight || null);
  if (writingState.project?.id && projectPreflightSummary.level !== "ready") {
    return setStatus(
      projectPreflightSummary.hint ||
        (projectPreflightSummary.level === "needs_clarification"
          ? "先澄清项目关键问题，再保存草稿。"
          : projectPreflightSummary.level === "has_gaps"
            ? "先补项目缺口，再保存草稿。"
            : "先检查项目条件，再保存草稿。"),
      "warn"
    );
  }

  const directoryId = writingDraftDirectoryId();
  const body = writingDraftBody();
  try {
    const created = await createNote({
      directoryId,
      status: "draft",
      body
    });
    const project = await bindWritingDraftNote(
      writingState.project?.id,
      created?.id,
      writingState.scaffold?.id,
      currentWritingVersionNote()
    );
    writingState.project = project;
    const note = mapNoteItem({
      ...created,
      body: typeof created?.body === "string" ? created.body : body
    });
    state.notes = [note, ...state.notes.filter((item) => item.id !== note.id)];
    showWritingResult({
      stage: "writing_draft_note",
      writingProjectId: project?.id || writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      noteId: note.id,
      directoryId,
      title: note.title
    });
    await loadWritingProjectsList();
    await loadWritingScaffoldVersions();
    await loadWritingDraftVersions();
    renderWritingPanel();
    setStatus(`已创建草稿笔记：${note.title}。你可以继续留在写作中心检查版本，或直接打开当前草稿。`, "ok");
  } catch (error) {
    showWritingResult({
      stage: "writing_draft_note_error",
      writingProjectId: writingState.project?.id,
      draftScaffoldId: writingState.scaffold?.id,
      message: String(error?.message || error),
      code: error?.code || null,
      details: error?.details || null
    });
    setStatus(`草稿笔记创建失败：${String(error?.message || error)}`, "bad");
  }
});

$("btnWritingOpenDraft")?.addEventListener("click", async () => {
  const draftNoteId = String(writingState.project?.draft_note_id || "").trim();
  const continuation = !draftNoteId ? currentWritingContinuationEntry("当前写作篮") : null;
  if (!draftNoteId && continuation?.projectId) {
    try {
      await continueWritingProjectEntry(continuation.projectId, {
        openDraft: continuation.action === "open-draft",
        statusMessage: writingCenterContinuationStatusMessage(continuation)
      });
    } catch (error) {
      setStatus(writingCenterContinuationFailureMessage(continuation, error), "bad");
    }
    return;
  }
  if (!draftNoteId) return setStatus("当前项目还没有绑定草稿笔记", "warn");
  try {
    await openWritingDraftNoteById(draftNoteId);
    setStatus(`已打开草稿笔记：${draftNoteId}`, "ok");
  } catch (error) {
    setStatus(`打开草稿失败：${String(error?.message || error)}`, "bad");
  }
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

bindAiInboxWorkspaceEvents($("aiInboxPanel"), {
  aiInboxState,
  openAiInboxModule,
  applyFiltersFromUi: applyAiInboxFiltersFromUi,
  loadAiInboxDetail,
  openNote: openAiInboxNote,
  recordDecision: recordAiInboxReviewDecision,
  acceptLink: acceptAiInboxLinkSuggestion,
  promoteNote: promoteAiInboxArtifactToNote,
  adoptField: adoptAiInboxFieldSuggestionDraft,
  applySuggestionStatus: applyAiInboxSuggestionStatus,
  runSummary: runAiInboxSummary,
  applyRecommendedAction: applyAiInboxRecommendedAction,
  setStatus
});

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

$("systemMessagesButton")?.addEventListener("click", (event) => {
  handleSystemMessagesButtonClick(event, systemMessageEventDeps());
});

$("btnSystemMessageClose")?.addEventListener("click", () => {
  closeSystemMessages();
});

$("btnSystemMessageMarkRead")?.addEventListener("click", () => {
  handleMarkSystemMessagesRead(systemMessageEventDeps());
});

$("btnSystemMessageOpenAiInbox")?.addEventListener("click", async () => {
  await handleOpenAllAiInboxFromSystemMessages(systemMessageEventDeps());
});

$("systemMessageModal")?.addEventListener("click", async (event) => {
  await handleSystemMessageModalClick(event, systemMessageEventDeps());
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

$("sidebarFlow")?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-sidebar-flow-action]");
  if (!button) return;
  const action = String(button.dataset.sidebarFlowAction || "").trim();
  if (action === "continue-distillation") {
    activateModule("distillation");
    await openDistillationModule();
    return;
  }
  if (action === "open-writing") {
    activateModule("writing");
    await openWritingModule();
    return;
  }
  if (action === "create-permanent") {
    state.browserRootId = "dir_original_default";
    state.selectedFolderId = "dir_original_default";
    await handleStateChange("create-note-in-selected-folder");
  }
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

async function bootstrap() {
  usingLocalFallbackData = false;
  renderImportPageShell();

  const importToolbarActions = createImportToolbarActions({
    getToolbarValues: currentImportToolbarValues,
    getFallbackImportRecordId: () => importState.importRecordId,
    getActivePreview: () => activeImportPreviewContext(),
    selectionSummary,
    resolveDirectoryRootId: (directoryId) => rootBoxIdFromFolder(state, directoryId),
    previewImport,
    confirmImport,
    onPreviewSuccess: async (preview) => {
      importState.lastPreview = preview;
      syncImportSelection(preview.importRecordId, preview.candidatePreview, preview.candidateSelection || null, {
        selectedIds: defaultSelectedCandidateIds(
          preview.candidatePreview,
          preview.candidateSelection || null,
          preview.originalityGuard || null
        )
      });
      setImportRecordId(preview.importRecordId);
      showImportResult({
        stage: "preview",
        importRecordId: preview.importRecordId,
        connector: preview.connector,
        status: preview.status,
        summary: preview.summary,
        candidatePreview: preview.candidatePreview,
        candidateSelection: preview.candidateSelection || null,
        warnings: preview.warnings,
        originalityGuard: preview.originalityGuard
      });
    },
    onConfirmSuccess: async ({ importRecordId, result, preview }) => {
      setImportRecordId(importRecordId);
      const targetDirectoryId = confirmedImportTargetDirectoryId(result, preferredImportDirectoryId(importState.directoryId));
      if (targetDirectoryId && folderById(state, targetDirectoryId)) {
        importState.directoryId = targetDirectoryId;
        state.selectedFolderId = targetDirectoryId;
        state.browserRootId = rootBoxIdFromFolder(state, targetDirectoryId);
        await syncNotesForDirectory(targetDirectoryId);
      }
      showImportResult({
        stage: "confirm",
        importRecordId,
        status: result.status,
        result: result.result,
        originalityGuard: result.originalityGuard,
        candidatePreview: preview?.candidatePreview || null
      });
      importState.lastPreview = null;
    },
    showImportResult,
    refreshImportedNotesView,
    setStatus
  });

  renderImportToolbar();

  $("importPageMount")?.addEventListener("click", (event) => {
    if (event.target?.closest?.("#btnCloseImportOperationResult") || event.target?.id === "importOperationResultModal") {
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
      if (action === "open-literature-queue") {
        void openImportedLiteratureQueue();
      } else if (action === "add-permanent-notes" || action === "add-permanent-notes-open-writing") {
        void addImportedPermanentNotesToWritingBasket({ openWriting: action === "add-permanent-notes-open-writing" });
      } else if (action === "create-writing-project") {
        void createWritingProjectFromImportedPermanentNotes();
      }
      return;
    }
    const clearFocusButton = event.target?.closest?.("[data-clear-candidate-focus]");
    if (clearFocusButton) {
      setImportResultFocus("");
      return;
    }
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
    if (actionButton) {
      applyCandidateSelection(String(actionButton.getAttribute("data-candidate-action") || ""));
      return;
    }

    if (event.target?.closest?.("#btnImportPreview")) {
      setImportWorkspaceTab("import");
      void importToolbarActions.handlePreview();
      return;
    }
    if (event.target?.closest?.("#btnBrowseImportPath")) {
      void (async () => {
        const picked = await desktopCommands.browseDirectory({
          defaultPath: $("importPath")?.value || "",
          purpose: "导入目录"
        });
        if (!picked.path) return;
        $("importPath").value = picked.path;
        setStatus(`已选择导入目录（${picked.source}）`, "ok");
      })();
      return;
    }
    if (event.target?.closest?.("#btnImportConfirm")) {
      setImportWorkspaceTab("import");
      void importToolbarActions.handleConfirm();
      return;
    }
    if (event.target?.closest?.("#btnExportMarkdown")) {
      setImportWorkspaceTab("export");
      void (async () => {
        const directoryId = String($("exportDirectoryId")?.value || "").trim();
        if (!directoryId) return setStatus("请先选择永久笔记目录", "warn");
        let targetPath = String($("exportTargetPath")?.value || "").trim();
        if (!targetPath) {
          const picked = await desktopCommands.browseDirectory({
            defaultPath: "",
            purpose: "导出目录"
          });
          targetPath = String(picked?.path || "").trim();
          if (targetPath) {
            $("exportTargetPath").value = targetPath;
            $("exportAdvanced")?.setAttribute("open", "open");
            updateExportTargetHint();
          }
        }
        if (!targetPath) return setStatus("请先选择导出目标目录", "warn");
        try {
          const result = await exportMarkdown({
            targetPath,
            directoryId
          });
          showExportResult({
            stage: "export_markdown",
            targetPath,
            directoryId,
            directoryLabel: directoryPathLabel(directoryId),
            exportJobId: result.exportJobId,
            status: result.status,
            copied: result.copied,
            copiedBreakdown: result.copiedBreakdown || null
          });
          setStatus(`已导出 ${result.copied} 个文件`, "ok");
        } catch (error) {
          showExportResult({
            stage: "export_error",
            targetPath,
            directoryId,
            directoryLabel: directoryPathLabel(directoryId),
            message: String(error?.message || error),
            code: error?.code || null,
            details: error?.details || null
          });
          setStatus(`导出失败：${String(error?.message || error)}`, "bad");
        }
      })();
      return;
    }
    if (event.target?.closest?.("#btnBrowseExportPath")) {
      void (async () => {
        const picked = await desktopCommands.browseDirectory({
          defaultPath: $("exportTargetPath")?.value || "",
          purpose: "导出目录"
        });
        if (!picked.path) return;
        $("exportTargetPath").value = picked.path;
        $("exportAdvanced")?.setAttribute("open", "open");
        updateExportTargetHint();
        setStatus("已选择导出目录", "ok");
      })();
    }
  });

  $("importPageMount")?.addEventListener("change", (event) => {
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
      setStatus(`导入工作目录已切换到 ${directoryPathLabel(importState.directoryId)}`, "ok");
      return;
    }
    if (event.target?.closest?.("#exportDirectoryId") || event.target?.closest?.("#exportTargetPath")) {
      updateExportTargetHint();
      return;
    }
  });

  try {
    await refreshVaultSettings();
    await syncDirectoriesFromApi();
    await syncNotesForDirectoryTree(state.browserRootId);
    setStatus(`已连接 API：${getApiBase()}`, "ok");
  } catch (error) {
    const tauri = typeof window !== "undefined" ? window.__TAURI__ : null;
    if (tauri) {
      setStatus(`API 连接失败：${String(error?.message || error)}`, "bad");
      try {
        const message =
          `无法连接到本地 API（${getApiBase()}）。\n\n` +
          `当前桌面版需要本地 API 服务在后台运行。\n\n` +
          `解决办法：\n` +
          `1) 在项目目录运行：npm run dev:api\n` +
          `2) 保持窗口打开，然后重启桌面应用\n\n` +
          `如果你是安装包用户，请联系开发者获取“内置 API”的版本。`;

        if (typeof tauri?.dialog?.message === "function") {
          await tauri.dialog.message(message, { title: "API 未启动", kind: "error" });
        } else if (typeof tauri?.core?.invoke === "function") {
          await tauri.core.invoke("plugin:dialog|message", {
            message,
            options: { title: "API 未启动", kind: "error" }
          });
        }
      } catch {}
    } else {
      usingLocalFallbackData = true;
      setStatus(`API 连接失败，已回退到本地示例数据：${String(error?.message || error)}`, "warn");
    }
  }

  renderAll();
  const startupParams = new URLSearchParams(window.location.search);
  const startupDemo = String(startupParams.get("demo") || "").trim().toLowerCase();
  const explicitNoteId = startupParams.get("note") || "";
  const initialNote = explicitNoteId ? state.notes.find((n) => n.id === explicitNoteId) : null;
  const shouldSkipAutoOpen = () => startupAutoOpenSuppressed || Boolean(state.activeTabId || state.selectedFileId);
  const openedDemo =
    startupDemo === "smart-notes-product-thinking" || startupDemo === "smart-notes"
      ? await importSmartNotesProductThinkingDemo({ startup: true })
      : startupDemo === "yijing-rich" || startupDemo === "yijing"
        ? await (startupDemo === "yijing" ? importYijingKnowledgeNetworkDemo({ startup: true }) : importYijingRichAcceptanceDemo({ startup: true }))
        : false;
  if (openedDemo) {
    renderAll();
  } else if (initialNote) {
    state.browserRootId = rootBoxIdFromFolder(state, initialNote.folderId);
    state.selectedFolderId = initialNote.folderId;
    openNoteById(explicitNoteId);
  } else if (usingLocalFallbackData) {
    const fallbackNote = preferredLocalFallbackNote();
    if (fallbackNote) {
      state.browserRootId = rootBoxIdFromFolder(state, fallbackNote.folderId);
      state.selectedFolderId = fallbackNote.folderId;
      openNoteById(fallbackNote.id, { preferTitleSelection: false });
      setStatus(`API 连接失败，已打开本地示例笔记：${fallbackNote.title || fallbackNote.id}`, "warn");
    } else if (!shouldSkipAutoOpen()) {
      await openStartupUntitledNote();
    }
  } else if (!shouldSkipAutoOpen()) {
    await openStartupUntitledNote();
  }

  // Best-effort update check. This only reads metadata and never installs or migrates data.
  setTimeout(async () => {
    await updateController.refreshAppVersionInfo();
    await updateController.runAppUpdateCheck({ manual: false });
  }, 1200);
}

bootstrap();
