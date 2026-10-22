import { renderWritingEntryPreparation } from "./writing-entry-preparation.js";
import { renderWritingBookChapterSelector, selectedWritingBookChapter } from "./writing-book-chapter-controller.js";
import { renderWritingDraftFeedback } from "./writing-draft-feedback.js";
import { syncWritingDocumentEditor } from "./writing-document-editor.js";
import { renderWritingChapterNavigation } from "./writing-chapter-navigation.js";
import { renderWritingBookDirectoryTools, writingBookDirectoryPending } from "./writing-book-directory-controller.js";
import {
  renderWritingMainlineGuideView,
  renderWritingFlowStepsView,
  writingFlowStepItems
} from "./writing-workspace-view.js";
import {
  resolveWritingThemeSelectionForPanel
} from "./writing-theme-selection-controller.js";
import {
  renderWritingProjectHistoryDom
} from "./writing-project-history-panel.js";
import {
  renderWritingStrongModelSummaryDom
} from "./writing-strong-model-panel.js";
import {
  renderWritingBookDesignDom
} from "./writing-book-design-panel.js";
import {
  renderWritingStrongModelRequestDetailDom
} from "./writing-strong-model-request-panel.js";
import {
  renderWritingNoteCardDom,
  renderWritingProjectCardDom
} from "./writing-note-card-panel.js";
import {
  renderWritingThemeDetailDom
} from "./writing-theme-card-panel.js";
import {
  renderWritingStatusStripDom
} from "./writing-status-strip-panel.js";
import {
  renderWritingScaffoldPreviewDom
} from "./writing-scaffold-preview-panel.js";
import { syncWritingThemeDiscoveryView } from "./writing-theme-discovery-view.js";
import { renderWritingThemeLibrary } from "./writing-theme-library.js";
import {
  updateWritingRelatedNoteCounters
} from "./writing-related-notes-panel.js";
import {
  writingWorkbenchHasTopic,
  writingDraftContent
} from "./writing-workbench-model.js";
import {
  syncWritingTopicPickerAction
} from "./writing-sidebar-actions.js";

export {
  renderWritingBookDesignDom
} from "./writing-book-design-panel.js";
export {
  renderWritingStrongModelRequestDetailDom
} from "./writing-strong-model-request-panel.js";
export {
  renderWritingNoteCardDom,
  renderWritingProjectCardDom
} from "./writing-note-card-panel.js";
export {
  renderWritingThemeDetailDom,
  renderWritingThemeIndexCardDom
} from "./writing-theme-card-panel.js";
export {
  renderWritingStatusStripDom
} from "./writing-status-strip-panel.js";
export {
  renderWritingScaffoldPreviewDom
} from "./writing-scaffold-preview-panel.js";

export function renderWritingFlowStepsDom(deps = {}, {
  basketCount = 0,
  hasProject = false,
  projectEntry = null
} = {}) {
  const {
    $,
    writingState = {},
    escapeHtml = String
  } = deps;
  const el = $("writingFlowSteps");
  if (!el) return;
  const steps = writingFlowStepItems({
    basketCount,
    hasProject,
    projectEntry,
    writingState
  });
  el.innerHTML = renderWritingFlowStepsView(steps, { escapeHtml });
}

export function renderWritingPanelDom(deps = {}) {
  const {
    $,
    state,
    writingState,
    folderById,
    rootBoxIdFromFolder,
    writingCandidateNotes,
    writingSourceIndexSummary,
    writingBasketEntries,
    parseWritingBasketIds,
    buildWritingPanelState,
    planWritingCandidateFocus,
    writingKnownNoteById,
    isWritingEligibleNote,
    writingRelationCountsReady,
    writingRelationCountsErrored,
    deriveBasketWritingReadiness,
    currentWritingBasketEligibility,
    writingIneligibleSummary,
    describeWritingProjectEntryState,
    describeWritingMaterialStatus,
    describeWritingProjectPreflight,
    isWritingStrongModelReady,
    describeWritingStrongModelStatus,
    currentWritingContinuationEntry,
    writingOpenDraftButtonState,
    writingScaffoldButtonState,
    writingStrongModelButtonState,
    findExistingWritingProjectForTheme,
    describeWritingContinuationAction,
    renderThinkingStatusBadge,
    writingThemeProjectEntry,
    writingThemeDetailHintText,
    renderWritingToplineMetric,
    writingThemeSummary,
    renderScaffoldVersionCard,
    renderDraftVersionCard,
    describeWritingStrongModelIdleSummary,
    writingThemeIndexNoteIds = () => [],
    escapeHtml
  } = deps;
  const renderWritingNoteCard = (note, options) => renderWritingNoteCardDom(deps, note, options);
  const renderWritingProjectCard = (project) => renderWritingProjectCardDom(deps, project);

  const current = $("writingCurrentNote");
  const scopeHint = $("writingScopeHint");
  const themeIndexesHint = $("writingThemeIndexesHint");
  const themeDiscoverySuggestions = $("writingThemeDiscoverySuggestions");
  const themeDetail = $("writingThemeDetail");
  const themeDetailHint = $("writingThemeDetailHint");
  const basketSummary = $("writingBasketSummary");
  const basketList = $("writingBasketList");
  const candidateSummary = $("writingCandidateSummary");
  const candidateList = $("writingCandidateList");
  const candidateDetails = $("writingCandidateDetails");
  const toplineMetrics = $("writingToplineMetrics");
  const mainlineGuide = $("writingBeginnerMainline");
  const createProjectButton = $("btnWritingCreateProject");
  const createScaffoldButton = $("btnWritingCreateScaffold");
  const openDraftButton = $("btnWritingOpenDraft");
  const copyScaffoldButton = $("btnWritingCopyScaffold");
  const exportScaffoldButton = $("btnWritingExportScaffold");
  const moreMenu = $("writingMoreMenu");
  const saveDraftButton = $("btnWritingSaveDraft");
  const startDraftButton = $("btnWritingStartDraft");
  const draftEditor = $("writingDraftEditor");
  const outputActionsDetails = $("writingOutputActionsDetails");
  const strongModelButton = $("btnWritingStrongModelAnalysis");
  const strongModelSummary = $("writingStrongModelSummary");
  const projectsHint = $("writingProjectsHint");
  const projectsList = $("writingProjectsList");
  const scaffoldVersionsHint = $("writingScaffoldVersionsHint");
  const scaffoldVersionsList = $("writingScaffoldVersionsList");
  const draftVersionsHint = $("writingDraftVersionsHint");
  const draftVersionsList = $("writingDraftVersionsList");
  const shell = $("writingPanel")?.querySelector?.(".writing-shell") || null;
  if (!current) return;
  const note = state.notes.find((item) => item.id === state.selectedFileId);
  const scopeFolder = folderById(state, state.selectedFolderId);
  const scopeRoot = folderById(state, rootBoxIdFromFolder(state, state.selectedFolderId));
  const allCandidates = writingCandidateNotes();
  const sourceIndexSummary = writingSourceIndexSummary();
  const basketEntries = writingBasketEntries();
  const basketIds = parseWritingBasketIds();
  const panelState = buildWritingPanelState({
    appState: state,
    writingState,
    selectedNote: note,
    scopeFolder,
    scopeRoot,
    allCandidates,
    basketEntries,
    basketIds,
    sourceIndexSummary
  }, {
    planWritingCandidateFocus,
    writingKnownNoteById,
    isWritingEligibleNote,
    parseWritingBasketIds,
    writingRelationCountsReady,
    writingRelationCountsErrored,
    deriveBasketWritingReadiness,
    describeWritingProjectEntryState,
    describeWritingProjectPreflight,
    isWritingStrongModelReady,
    describeWritingStrongModelStatus,
    currentWritingContinuationEntry,
    writingOpenDraftButtonState,
    writingScaffoldButtonState,
    writingStrongModelButtonState
  });
  const {
    candidateFocusPlan,
    candidates,
    relationCountsReady,
    relationCountsErrored,
    basketReadiness,
    hasProject,
    hasScaffold,
    hasDraft,
    projectEntry,
    projectPreflightSummary,
    strongModelReady,
    strongModelState
  } = panelState;
  current.textContent = panelState.currentLabel;
  if (scopeHint) {
    const shouldShowScopeHint = Boolean(candidateFocusPlan.usingFocusedScope);
    scopeHint.hidden = !shouldShowScopeHint;
    scopeHint.textContent = shouldShowScopeHint ? `候选材料：${candidateFocusPlan.scopeLabel} · ${candidates.length} 条` : "";
  }
  renderWritingStatusStripDom(deps);
  if (themeIndexesHint) {
    themeIndexesHint.textContent = writingState.loadingThemeIndexes ? "正在读取主题..." : "";
  }
  const selectedTheme = resolveWritingThemeSelectionForPanel(deps);
  const explicitSelectedTheme = writingState.selectedThemeIndexId ? selectedTheme : null;
  const workspaceTitle = $("writingWorkspaceTitle");
  if (workspaceTitle) workspaceTitle.textContent = writingState.project?.title || explicitSelectedTheme?.title || "写作";
  const themeRelatedEntries = explicitSelectedTheme
    ? writingThemeIndexNoteIds(explicitSelectedTheme)
        .map((noteId) => writingKnownNoteById(noteId) || null)
        .filter(Boolean)
    : [];
  const relatedEntries = basketEntries.length ? basketEntries : themeRelatedEntries;
  const hasWorkbenchTopic = writingWorkbenchHasTopic({ writingState, basketIds, selectedTheme: explicitSelectedTheme });
  if (shell) {
    shell.dataset.writingHasTopic = hasWorkbenchTopic ? "true" : "false";
    updateWritingRelatedNoteCounters(relatedEntries.length, { root: shell });
    syncWritingTopicPickerAction(shell.dataset.writingView === "topic-picker");
  }
  renderWritingThemeLibrary(deps);
  if (themeDiscoverySuggestions) {
    syncWritingThemeDiscoveryView(themeDiscoverySuggestions, deps);
    $("btnWritingSaveThemeIndex")?.classList?.toggle?.("primary", themeDiscoverySuggestions.hidden);
  }
  if (themeDetailHint) {
    themeDetailHint.textContent = explicitSelectedTheme
      ? writingThemeDetailHintText(explicitSelectedTheme)
      : writingThemeDetailHintText(null);
  }
  if (themeDetail) {
    themeDetail.innerHTML = renderWritingThemeDetailDom(deps, explicitSelectedTheme);
  }

  if (toplineMetrics) {
    toplineMetrics.innerHTML = panelState.toplineMetrics
      .map((metric) => renderWritingToplineMetric(metric.label, metric.value, metric.note, metric.tone))
      .join("");
  }
  if (mainlineGuide) {
    mainlineGuide.innerHTML = renderWritingMainlineGuideView({
      basketCount: basketEntries.length,
      hasProject,
      hasScaffold,
      strongModelReady,
      projectEntry,
      basketReadiness
    }, { escapeHtml });
  }
  if (basketSummary) {
    basketSummary.textContent = relatedEntries.length
      ? `已选 ${relatedEntries.length} 条。保留真正会用到的笔记即可。`
      : "还没有相关笔记。";
  }
  const basketIdSet = new Set(parseWritingBasketIds());
  const outlineUsageFor = (noteId) => {
    const headings = (writingState.scaffold?.sections || [])
      .filter((section) => Array.isArray(section?.evidence_note_ids) && section.evidence_note_ids.includes(noteId))
      .map((section) => String(section.heading || "").trim())
      .filter(Boolean);
    return headings.length ? `用于：${headings.join("、")}` : "尚未用于章节";
  };
  if (basketList) {
    const preparation = renderWritingEntryPreparation(note, { escapeHtml, isWritingEligibleNote });
    basketList.innerHTML = preparation + (relatedEntries.length
      ? relatedEntries.map((entry) => renderWritingNoteCard(entry, {
          selected: true,
          action: basketIdSet.has(entry.id) ? "remove" : "open",
          actionLabel: "移出相关笔记",
          usageText: outlineUsageFor(entry.id)
        })).join("")
      : preparation ? "" : `<div class="writing-empty">从下面添加已确认的永久笔记。要使用其他笔记，先在永久笔记盒打开它，再回到这里。</div>`);
  }
  if (candidateSummary) {
    candidateSummary.textContent = candidates.length
      ? `可添加 ${candidates.length} 条笔记。`
      : "当前目录没有可添加的笔记。";
  }
  if (candidateList) {
    const candidateListExpanded = Boolean(candidateDetails?.open);
    const candidateLimit = candidateListExpanded ? candidates.length : Math.min(candidates.length, 12);
    const visibleCandidates = candidates.slice(0, candidateLimit);
    const hiddenCandidateCount = Math.max(0, candidates.length - visibleCandidates.length);
    candidateList.innerHTML = candidates.length
      ? `${visibleCandidates
          .map((entry) =>
            renderWritingNoteCard(entry, {
              selected: basketIdSet.has(entry.id),
              action: basketIdSet.has(entry.id) ? "remove" : "add",
              actionLabel: basketIdSet.has(entry.id) ? "移出相关笔记" : "加入相关笔记"
            })
          )
          .join("")}${hiddenCandidateCount ? `<div class="writing-empty">还有 ${hiddenCandidateCount} 条笔记。展开后可继续添加。</div>` : ""}`
      : `<div class="writing-empty">${candidateFocusPlan.usingFocusedScope ? `${candidateFocusPlan.scopeLabel}里还没有可用的永久笔记。` : "当前目录还没有可用的永久笔记。"}</div>`;
  }
  if ($("btnWritingAddVisible")) {
    const candidateListExpanded = Boolean(candidateDetails?.open);
    $("btnWritingAddVisible").textContent = candidateListExpanded ? candidateFocusPlan.addActionLabel : "加入已显示笔记";
    $("btnWritingAddVisible").disabled = candidates.length === 0;
  }

  if (openDraftButton) {
    openDraftButton.disabled = panelState.openDraftButtonState.disabled;
    openDraftButton.textContent = panelState.openDraftButtonState.text;
  }
  copyScaffoldButton?.closest?.(".writing-actions-secondary")?.classList.toggle("hidden", !hasScaffold);
  if (createProjectButton) {
    createProjectButton.disabled = hasProject || !projectEntry.canCreateProject;
    createProjectButton.textContent = hasProject ? "主题已确定" : projectEntry.actionLabel;
  }
  if (createScaffoldButton) {
    createScaffoldButton.disabled = Boolean(writingState.scaffoldGenerationPending) || (!hasProject && !basketEntries.length && !explicitSelectedTheme);
    createScaffoldButton.textContent = writingState.scaffoldGenerationPending ? "正在生成..." : "生成提纲";
  }
  if (copyScaffoldButton) {
    copyScaffoldButton.disabled = !writingState.project?.scaffold_id;
    copyScaffoldButton.hidden = !hasScaffold;
  }
  if (exportScaffoldButton) {
    exportScaffoldButton.disabled = !writingState.project?.scaffold_id;
    exportScaffoldButton.hidden = !hasScaffold;
  }
  if ($("btnWritingReloadScaffold")) $("btnWritingReloadScaffold").hidden = !hasScaffold;
  if ($("btnWritingHistory")) $("btnWritingHistory").hidden = !hasScaffold;
  const bookChapter = selectedWritingBookChapter(writingState);
  renderWritingBookChapterSelector({ ...deps, escapeHtml });
  renderWritingChapterNavigation({ ...deps, escapeHtml });
  renderWritingBookDirectoryTools(deps);
  const directoryPending = writingBookDirectoryPending(writingState);
  const bookExportButton = $("btnWritingExportBook");
  const hasBookChapters = (writingState.project?.book_structure?.parts || []).some(part => part.chapters?.length);
  if (bookExportButton) {
    bookExportButton.hidden = !hasBookChapters;
    bookExportButton.disabled = directoryPending || writingState.bookExportPending?.projectId === writingState.project?.id || writingState.draftSaveState === "saving" || bookChapter?.saveState === "saving";
  }
  if ($("writingDraftTarget")) $("writingDraftTarget").disabled ||= directoryPending;
  if (openDraftButton) openDraftButton.hidden = !hasDraft || Boolean(bookChapter);
  for (const id of ["btnWritingCopyArticle", "btnWritingExportArticle"]) {
    const button = $(id);
    if (button) {
      button.hidden = Boolean(bookChapter) || (!hasDraft && !writingState.draftMarkdown);
      button.disabled = writingState.draftSaveState === "saving";
    }
  }
  if (moreMenu) {
    moreMenu.hidden = !hasScaffold && !hasDraft && !hasBookChapters;
    if (moreMenu.hidden) moreMenu.open = false;
  }
  if (outputActionsDetails && (hasScaffold || hasDraft)) outputActionsDetails.open = true;
  let draftUnavailableReason = "";
  if (saveDraftButton) {
    const canSaveDraft = Boolean(bookChapter || writingState.scaffold?.id);
    const draftSaveState = String(bookChapter?.saveState || writingState.draftSaveState || "idle");
    saveDraftButton.disabled = directoryPending || !canSaveDraft || draftSaveState === "saving";
    if (!canSaveDraft) draftUnavailableReason = !writingState.project?.id
        ? projectEntry?.projectId && projectEntry?.actionLabel
          ? `先${projectEntry.actionLabel}`
          : projectEntry?.actionLabel === "确定可写主题"
            ? "先确定可写主题"
            : projectEntry?.actionLabel || "先补相关笔记"
        : projectPreflightSummary.level === "needs_clarification"
          ? "先澄清主题问题"
          : projectPreflightSummary.level === "has_gaps"
            ? "先补主题缺口"
            : "先生成文章提纲";
  }
  renderWritingDraftFeedback(deps, {
    saveState: bookChapter?.saveState || writingState.draftSaveState || "idle",
    unavailableReason: draftUnavailableReason,
    uncertain: bookChapter?.saveErrorCode === "NOTE_SAVE_RESULT_UNCERTAIN" || writingState.draftSaveErrorCode === "NOTE_SAVE_RESULT_UNCERTAIN"
  });
  if (startDraftButton) startDraftButton.disabled = !hasScaffold || Boolean(bookChapter);
  if (draftEditor) draftEditor.disabled = directoryPending || (!hasScaffold && !bookChapter);
  if (draftEditor && (typeof document === "undefined" || document.activeElement !== draftEditor)) {
    const draftBody = String(writingDraftContent({ writingState, title: $("writingTitle")?.value, notes: basketEntries }));
    draftEditor.value = draftBody;
  }
  syncWritingDocumentEditor(deps);
  const strongModelBasketIds = renderWritingStrongModelSummaryDom({
    writingState,
    panelState,
    strongModelState,
    basketIds,
    strongModelButton,
    strongModelSummary,
    contextualAiState: writingState.contextualAiActionState,
    describeWritingStrongModelIdleSummary
  });
  renderWritingStrongModelRequestDetailDom(deps, { noteIds: strongModelBasketIds, strongModelReady });
  renderWritingBookDesignDom(deps);

  renderWritingProjectHistoryDom({
    writingState,
    projectEntry,
    hasProject,
    projectsHint,
    projectsList,
    scaffoldVersionsHint,
    scaffoldVersionsList,
    draftVersionsHint,
    draftVersionsList,
    renderWritingProjectCard,
    renderScaffoldVersionCard,
    renderDraftVersionCard,
    escapeHtml
  });

  renderWritingFlowStepsDom(deps, {
    basketCount: basketEntries.length,
    hasProject: Boolean(writingState.project?.id),
    projectId: writingState.project?.id || "",
    projectEntry
  });
  renderWritingScaffoldPreviewDom(deps);
}
