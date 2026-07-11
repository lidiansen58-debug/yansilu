import {
  writingBasketContinuationPlan
} from "./writing-entry-route-model.js";
import {
  uniqueStrings
} from "./prototype-thinking-status.js";
import {
  clearWritingEntryContextForRuntime,
  setWritingEntryContextForRuntime
} from "./writing-session-state.js";

function writingFormContext($ = () => null) {
  return {
    goal: String($("writingGoal")?.value || "").trim(),
    audience: String($("writingAudience")?.value || "").trim(),
    tone: String($("writingTone")?.value || "").trim()
  };
}

function resetWritingEntryRuntimeState(writingState = {}, basketNoteIds = []) {
  writingState.strongModelEpoch += 1;
  writingState.strongModelLoading = false;
  writingState.strongModelResult = null;
  writingState.strongModelError = "";
  writingState.relationCounts = {};
  writingState.relationCountErrors = {};
  writingState.loadingRelationCounts = basketNoteIds.length > 0;
}

export function createWritingEntryRuntimeController(depsProvider = () => ({})) {
  const runtimeDeps = () => depsProvider() || {};

  async function openWritingModule({
    statusMessage = "已打开写作",
    activeTab = "",
    focusedCandidateNoteIds = null,
    focusedCandidateScopeLabel = "",
    preserveFocusedCandidateScope = false,
    preserveEntryContext = false,
    entryReason = "",
    entrySourceLabel = ""
  } = {}) {
    const {
      activateModule = () => {},
      applyWritingTab = () => "",
      clearWritingFocusedCandidateScope = () => {},
      ensureNotesLoaded = async () => {},
      fetchWritingProject = async () => null,
      listIndexCards = async () => [],
      listProjectDraftVersions = async () => [],
      listProjectScaffolds = async () => [],
      listWritingProjects = async () => [],
      parseWritingBasketIds = () => [],
      refreshWritingRelationCounts = async () => null,
      renderWritingPanel = () => {},
      setStatus = () => {},
      setWritingFocusedCandidateScope = () => {},
      statusRevision = 0,
      syncWritingResultFromCurrentState = () => {},
      writingState = {},
      writingThemeIndexScopeDirectoryId = () => ""
    } = runtimeDeps();
    const normalizedFocusedCandidateNoteIds = Array.isArray(focusedCandidateNoteIds) ? uniqueStrings(focusedCandidateNoteIds) : null;
    const cleanEntryReason = String(entryReason || "").trim();
    const cleanEntrySourceLabel = String(entrySourceLabel || "").trim();
    if (normalizedFocusedCandidateNoteIds?.length) {
      try {
        await ensureNotesLoaded(normalizedFocusedCandidateNoteIds, { force: true });
      } catch {}
    }
    const statusRevisionAtStart = statusRevision;
    if (normalizedFocusedCandidateNoteIds) {
      setWritingFocusedCandidateScope(normalizedFocusedCandidateNoteIds, focusedCandidateScopeLabel || "当前图谱范围");
    } else if (!preserveFocusedCandidateScope) {
      clearWritingFocusedCandidateScope();
    }
    if (cleanEntryReason) {
      setWritingEntryContextForRuntime(writingState, { reason: cleanEntryReason, sourceLabel: cleanEntrySourceLabel });
    } else if (!preserveEntryContext) {
      clearWritingEntryContextForRuntime(writingState);
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
    if (activeTab) applyWritingTab(activeTab);
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
      if (activeTab) applyWritingTab(activeTab);
      syncWritingResultFromCurrentState();
    }
    if (statusMessage) setStatus(statusMessage, "ok", { skipIfStaleSince: statusRevisionAtStart, requireModule: "writing" });
  }

  function beginWritingEntry(noteIds = [], { title = "", source = "writing_center" } = {}) {
    const {
      $ = () => null,
      clearWritingSourceIndexIds = () => {},
      refreshWritingRelationCounts = async () => null,
      renderWritingPanel = () => {},
      resetWritingLocalBookIdeas = () => {},
      resetWritingProjectContext = () => {},
      setSelectedWritingThemeIndex = () => {},
      setWritingBasketIds = () => {},
      showWritingResult = () => {},
      writingState = {}
    } = runtimeDeps();
    const normalizedIds = uniqueStrings(noteIds);
    if (!normalizedIds.length) return false;
    const formContext = writingFormContext($);
    resetWritingEntryRuntimeState(writingState, normalizedIds);
    resetWritingLocalBookIdeas();
    clearWritingSourceIndexIds();
    setSelectedWritingThemeIndex("");
    setWritingBasketIds(normalizedIds);
    resetWritingProjectContext({
      title: String(title || "").trim(),
      ...formContext
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
    const {
      $ = () => null,
      clearWritingSourceIndexIds = () => {},
      parseWritingBasketIds = () => [],
      refreshWritingRelationCounts = async () => null,
      renderWritingPanel = () => {},
      resetWritingLocalBookIdeas = () => {},
      resetWritingProjectContext = () => {},
      setSelectedWritingThemeIndex = () => {},
      setWritingBasketIds = () => {},
      setWritingSourceIndexIds = () => {},
      showWritingResult = () => {},
      writingState = {}
    } = runtimeDeps();
    const plan = writingBasketContinuationPlan({
      existingNoteIds: parseWritingBasketIds(),
      incomingNoteIds: noteIds,
      requestedTitle: title,
      existingTitle: String($("writingTitle")?.value || "").trim(),
      existingSourceIndexIds: writingState.sourceIndexIds,
      incomingSourceIndexIds: sourceIndexIds,
      preserveSourceIndexIds,
      currentSelectedThemeIndexId: writingState.selectedThemeIndexId
    });
    if (!plan?.basketNoteIds?.length) return null;
    const formContext = writingFormContext($);

    resetWritingEntryRuntimeState(writingState, plan.basketNoteIds);
    resetWritingLocalBookIdeas();
    if (plan.nextSourceIndexIds.length) setWritingSourceIndexIds(plan.nextSourceIndexIds);
    else clearWritingSourceIndexIds();
    setSelectedWritingThemeIndex(plan.selectedThemeIndexId);
    setWritingBasketIds(plan.basketNoteIds);
    resetWritingProjectContext({
      title: plan.resolvedTitle,
      ...formContext
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

  return {
    beginWritingEntry,
    continueWritingEntry,
    openWritingModule
  };
}
