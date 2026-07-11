export function createWritingThemeProjectRuntime(deps = {}) {
  const {
    $,
    createWritingProject,
    currentWritingBookStructure,
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
    populateWritingFormFromProject,
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
    writingState.draftMarkdown = "";
    writingState.draftSaveState = "idle";
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
        message: "相关笔记只接受永久笔记。"
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
