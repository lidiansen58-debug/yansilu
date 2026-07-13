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
  renderWritingThemeDetailDom,
  renderWritingThemeIndexCardDom
} from "./writing-theme-card-panel.js";
import {
  renderWritingStatusStripDom
} from "./writing-status-strip-panel.js";
import {
  renderWritingScaffoldPreviewDom
} from "./writing-scaffold-preview-panel.js";
import {
  renderWritableThemeDiscoveryPanelDom
} from "./writable-theme-discovery-panel.js";
import {
  updateWritingRelatedNoteCounters
} from "./writing-related-notes-panel.js";
import {
  writingWorkbenchHasTopic
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

function writingEntryContextText(writingState = {}) {
  const reason = String(writingState.entryContextReason || "").trim();
  if (!reason) return "";
  const sourceLabel = String(writingState.entryContextSourceLabel || "").trim();
  return `${sourceLabel || "入口"}推荐理由：${reason}`;
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
  const themeIndexList = $("writingThemeIndexList");
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
    const entryContextText = writingEntryContextText(writingState);
    const shouldShowScopeHint = Boolean(candidateFocusPlan.usingFocusedScope);
    const scopeText = candidateFocusPlan.usingFocusedScope
        ? `当前查看范围：${scopeRoot?.name || "永久笔记"} / ${scopeFolder?.name || "当前目录"}。你是从图谱进入写作的，下面会优先显示${candidateFocusPlan.scopeLabel}里的永久笔记；已选相关笔记和可写主题仍保持当前目录范围。`
      : `当前查看范围：${scopeRoot?.name || "永久笔记"} / ${scopeFolder?.name || "当前目录"}。这里只显示当前目录及其子目录里的永久笔记，不展示原始导入资料；写作默认从已有观点开始。`;
    scopeHint.hidden = !shouldShowScopeHint;
    scopeHint.textContent = shouldShowScopeHint ? (entryContextText ? `${scopeText} ${entryContextText}` : scopeText) : "";
  }
  renderWritingStatusStripDom(deps);
  if (themeIndexesHint) {
    themeIndexesHint.textContent = writingState.loadingThemeIndexes ? "正在读取主题..." : "";
  }
  const selectedTheme = resolveWritingThemeSelectionForPanel(deps);
  const explicitSelectedTheme = writingState.selectedThemeIndexId ? selectedTheme : null;
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
  const themeIndexes = Array.isArray(writingState.themeIndexes) ? writingState.themeIndexes : [];
  const visibleThemeIndexes = themeIndexes.slice(0, 3);
  if (themeIndexList) {
    if (writingState.loadingThemeIndexes) {
      themeIndexList.innerHTML = visibleThemeIndexes.length
        ? visibleThemeIndexes.map((indexCard) => renderWritingThemeIndexCardDom(deps, indexCard)).join("")
        : `<div class="writing-empty">正在加载可写主题...</div>`;
    } else if (visibleThemeIndexes.length) {
      themeIndexList.innerHTML = visibleThemeIndexes.map((indexCard) => renderWritingThemeIndexCardDom(deps, indexCard)).join("");
    } else {
      themeIndexList.innerHTML = `<div class="writing-empty">还没有可写主题。用当前相关笔记保存一个，后续就能从这里继续写。</div>`;
    }
  }
  if (themeDiscoverySuggestions) {
    const discoverySuggestions = Array.isArray(writingState.themeDiscoverySuggestions) ? writingState.themeDiscoverySuggestions : [];
    const showDiscoverySuggestions = Boolean(writingState.themeDiscoveryLoading || discoverySuggestions.length);
    themeDiscoverySuggestions.hidden = !showDiscoverySuggestions;
    themeDiscoverySuggestions.innerHTML = showDiscoverySuggestions ? renderWritableThemeDiscoveryPanelDom(deps) : "";
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
    basketList.innerHTML = relatedEntries.length
      ? relatedEntries.map((entry) => renderWritingNoteCard(entry, {
          selected: true,
          action: basketIdSet.has(entry.id) ? "remove" : "open",
          actionLabel: "移出相关笔记",
          usageText: outlineUsageFor(entry.id)
        })).join("")
      : `<div class="writing-empty">先在左侧打开一条原创笔记，点击“加入当前笔记”，或从下面选择已经成熟的永久笔记。</div>`;
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
    createScaffoldButton.disabled = !hasProject && !basketEntries.length && !explicitSelectedTheme;
    createScaffoldButton.textContent = "生成提纲";
  }
  if (copyScaffoldButton) {
    copyScaffoldButton.disabled = !writingState.project?.scaffold_id;
    copyScaffoldButton.hidden = !hasScaffold;
  }
  if (exportScaffoldButton) {
    exportScaffoldButton.disabled = !writingState.project?.scaffold_id;
    exportScaffoldButton.hidden = !hasScaffold;
  }
  if (openDraftButton) openDraftButton.hidden = !hasDraft;
  if (moreMenu) {
    moreMenu.hidden = !hasScaffold && !hasDraft;
    if (moreMenu.hidden) moreMenu.open = false;
  }
  if (outputActionsDetails && (hasScaffold || hasDraft)) outputActionsDetails.open = true;
  if (saveDraftButton) {
    const canSaveDraft = Boolean(writingState.scaffold?.id);
    const draftSaveState = String(writingState.draftSaveState || "idle");
    saveDraftButton.disabled = !canSaveDraft || draftSaveState === "saving";
    saveDraftButton.textContent = !writingState.scaffold?.id
      ? !writingState.project?.id
        ? projectEntry?.projectId && projectEntry?.actionLabel
          ? `先${projectEntry.actionLabel}`
          : projectEntry?.actionLabel === "确定可写主题"
            ? "先确定可写主题"
            : projectEntry?.actionLabel || "先补相关笔记"
        : projectPreflightSummary.level === "needs_clarification"
          ? "先澄清主题问题"
          : projectPreflightSummary.level === "has_gaps"
            ? "先补主题缺口"
            : "先生成文章提纲"
      : hasDraft
        ? draftSaveState === "saving"
          ? "正在保存..."
          : draftSaveState === "saved"
            ? "已保存"
            : draftSaveState === "error"
              ? "保存失败，重试"
              : "保存草稿"
        : "保存为草稿笔记";
  }
  if (startDraftButton) startDraftButton.disabled = !hasScaffold;
  if (draftEditor && (typeof document === "undefined" || document.activeElement !== draftEditor)) {
    const draftBody = String(writingState.draftMarkdown || writingState.project?.draft_note?.body || writingState.scaffoldMarkdown || "").trim();
    draftEditor.value = draftBody;
  }
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
