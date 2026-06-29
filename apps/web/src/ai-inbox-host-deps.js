export function createAiInboxWorkspaceHostDeps(deps = {}) {
  const {
    aiInboxState = {},
    openAiInboxModule = async () => {},
    applyAiInboxFiltersFromUi = async () => {},
    loadAiInboxDetail = async () => {},
    openAiInboxNote = async () => {},
    recordAiInboxReviewDecision = async () => {},
    acceptAiInboxLinkSuggestion = async () => {},
    promoteAiInboxArtifactToNote = async () => {},
    adoptAiInboxFieldSuggestionDraft = async () => {},
    applyAiInboxSuggestionStatus = async () => {},
    runAiInboxSummary = async () => {},
    applyAiInboxRecommendedAction = async () => {},
    setStatus = () => {}
  } = deps;

  return {
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
  };
}
