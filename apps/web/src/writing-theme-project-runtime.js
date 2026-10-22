import { captureWritingProjectCreationContext } from "./writing-project-creation-context.js";
import { createWritingProjectKeepingForm } from "./writing-project-form-sync.js";
import { writingNoteEligibility as deriveWritingNoteEligibility } from "./note-readiness-signals.js";
export function createWritingThemeProjectRuntime(deps = {}) {
  const {
    $,
    deriveBasketWritingReadiness,
    deriveWritingProjectIntent,
    deriveWritingProjectTakeaway,
    describeWritingContinuationAction,
    describeWritingThemeProjectEntryState,
    findExistingWritingProjectForTheme,
    isDirectoryUnderOriginalRoot,
    loadWritingDraftVersions,
    loadWritingProjectsList,
    loadWritingScaffoldVersions,
    normalizeAuthorshipItem,
    normalizeWritingProjectTitleSeed,
    renderWritingPanel,
    sameUniqueStringSet,
    showWritingResult,
    syncWritingLocalBookIdeasFromProject,
    useThemeIndexAsWritingEntry,
    writingKnownNoteById,
    writingState,
    writingThemeIndexNoteIds,
    writingRelationCountsErrored,
    writingRelationCountsReady,
    writingThemeNotesLoaded
  } = deps;

  async function createWritingProjectFromThemeIndex(indexCardId) {
    const context = captureWritingProjectCreationContext(deps);
    try {
      const currentTheme = String(writingState.selectedThemeIndexId || "").trim() === String(indexCardId || "").trim();
      const form = currentTheme ? Object.fromEntries(["Title", "Goal", "Audience", "Tone"]
        .map((field) => [field, String($(`writing${field}`)?.value || "").trim()])) : {};
      const { indexCard, noteIds } = await useThemeIndexAsWritingEntry(indexCardId, {
        replaceBasket: true,
        resetContext: true,
        source: "writing_theme_create_project",
        assertCurrent: () => context.assertCurrent(),
        onEntryApplied: () => context.acceptLocalChanges()
      });
      context.assertCurrent();
      const title = form.Title || String($("writingTitle")?.value || "").trim() || normalizeWritingProjectTitleSeed(indexCard.title || indexCard.id);
      const goal = form.Goal || String($("writingGoal")?.value || "").trim() || String(indexCard.central_question || indexCard.summary || "").trim();
      const audience = form.Audience ?? String($("writingAudience")?.value || "").trim();
      const tone = form.Tone ?? String($("writingTone")?.value || "").trim();
      const project = await createWritingProjectKeepingForm(deps, context, {
        title,
        goal,
        audience,
        tone,
        intent: deriveWritingProjectIntent({ title, goal, indexCard }),
        desiredReaderTakeaway: deriveWritingProjectTakeaway({ title, goal, audience, indexCard }),
        basketNoteIds: noteIds,
        relatedIndexIds: [indexCard.id],
        bookStructure: { schema_version: 1, parts: [] }
      });
      context.assertCurrent();
      writingState.project = project;
      context.acceptLocalChanges();
      syncWritingLocalBookIdeasFromProject(project);
      writingState.scaffold = null;
      writingState.scaffoldMarkdown = "";
      writingState.draftMarkdown = "";
      writingState.draftSaveState = "idle";
      showWritingResult({
        stage: "writing_project",
        writingProjectId: project?.id,
        title: project?.title,
        relatedIndexIds: project?.related_index_ids,
        basketNoteIds: project?.basket_note_ids,
        basketNotes: project?.basket_notes
      });
      await loadWritingProjectsList();
      context.assertCurrent();
      await loadWritingScaffoldVersions();
      context.assertCurrent();
      await loadWritingDraftVersions();
      context.assertCurrent();
      renderWritingPanel();
      return project;
    } catch (error) { context.assertCurrent(); throw error; }
  }

  function writingNoteEligibility(note) {
    return deriveWritingNoteEligibility(note, { isDirectoryUnderOriginalRoot, normalizeAuthorshipItem });
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

  return {
    createWritingProjectFromThemeIndex,
    writingNoteEligibility,
    writingThemeProjectEntry
  };
}
