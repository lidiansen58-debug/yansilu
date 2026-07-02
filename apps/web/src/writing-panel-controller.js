import {
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
    escapeHtml
  } = deps;
  const renderWritingNoteCard = (note, options) => renderWritingNoteCardDom(deps, note, options);
  const renderWritingProjectCard = (project) => renderWritingProjectCardDom(deps, project);

  const current = $("writingCurrentNote");
  const scopeHint = $("writingScopeHint");
  const themeIndexesHint = $("writingThemeIndexesHint");
  const themeIndexList = $("writingThemeIndexList");
  const themeDetail = $("writingThemeDetail");
  const themeDetailHint = $("writingThemeDetailHint");
  const basketSummary = $("writingBasketSummary");
  const basketList = $("writingBasketList");
  const candidateSummary = $("writingCandidateSummary");
  const candidateList = $("writingCandidateList");
  const toplineMetrics = $("writingToplineMetrics");
  const createProjectButton = $("btnWritingCreateProject");
  const createScaffoldButton = $("btnWritingCreateScaffold");
  const openDraftButton = $("btnWritingOpenDraft");
  const copyScaffoldButton = $("btnWritingCopyScaffold");
  const exportScaffoldButton = $("btnWritingExportScaffold");
  const saveDraftButton = $("btnWritingSaveDraft");
  const strongModelButton = $("btnWritingStrongModelAnalysis");
  const strongModelSummary = $("writingStrongModelSummary");
  const projectsHint = $("writingProjectsHint");
  const projectsList = $("writingProjectsList");
  const scaffoldVersionsHint = $("writingScaffoldVersionsHint");
  const scaffoldVersionsList = $("writingScaffoldVersionsList");
  const draftVersionsHint = $("writingDraftVersionsHint");
  const draftVersionsList = $("writingDraftVersionsList");
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
    const scopeText = candidateFocusPlan.usingFocusedScope
      ? `当前作用范围：${scopeRoot?.name || "永久笔记"} / ${scopeFolder?.name || "当前目录"}。你是从图谱进入写作中心的，下面会优先显示${candidateFocusPlan.scopeLabel}里的永久笔记；相关笔记和可写主题仍保持当前目录范围。`
      : `当前作用范围：${scopeRoot?.name || "永久笔记"} / ${scopeFolder?.name || "当前目录"}。这里只显示当前目录及其子目录里已经转化出的永久笔记，不展示原始导入资料；写作中心入口默认从已有观点开始。`;
    scopeHint.textContent = entryContextText ? `${scopeText} ${entryContextText}` : scopeText;
  }
  renderWritingStatusStripDom(deps);
  if (themeIndexesHint) {
    if (writingState.loadingThemeIndexes && writingState.themeIndexes.length) {
      themeIndexesHint.textContent = `正在刷新主题索引... 当前显示 ${writingState.themeIndexes.length} 个。`;
    } else if (writingState.loadingThemeIndexes) {
      themeIndexesHint.textContent = "正在读取主题索引...";
    } else if (writingState.themeIndexes.length) {
      themeIndexesHint.textContent = `${sourceIndexSummary ? `${sourceIndexSummary}；` : ""}当前范围内有 ${writingState.themeIndexes.length} 个主题索引可作为可续接的写作入口。`;
    } else {
      themeIndexesHint.textContent = "当前范围还没有可写主题。先把一组成熟永久笔记组织成相关笔记，再保存为可写主题。";
    }
  }
  if (themeIndexList) {
    if (writingState.loadingThemeIndexes) {
      themeIndexList.innerHTML = writingState.themeIndexes.length
        ? writingState.themeIndexes.map((indexCard) => renderWritingThemeIndexCardDom(deps, indexCard)).join("")
        : `<div class="writing-empty">正在加载主题索引...</div>`;
    } else if (writingState.themeIndexes.length) {
      themeIndexList.innerHTML = writingState.themeIndexes.map((indexCard) => renderWritingThemeIndexCardDom(deps, indexCard)).join("");
    } else {
      themeIndexList.innerHTML = `<div class="writing-empty">还没有可写主题。用当前相关笔记保存一个，后续就能从这里继续写。</div>`;
    }
  }

  const selectedTheme = resolveWritingThemeSelectionForPanel(deps);
  if (themeDetailHint) {
    themeDetailHint.textContent = selectedTheme
      ? writingThemeDetailHintText(selectedTheme)
      : writingThemeDetailHintText(null);
  }
  if (themeDetail) {
    themeDetail.innerHTML = renderWritingThemeDetailDom(deps, selectedTheme);
  }

  if (toplineMetrics) {
    toplineMetrics.innerHTML = panelState.toplineMetrics
      .map((metric) => renderWritingToplineMetric(metric.label, metric.value, metric.note, metric.tone))
      .join("");
  }
  if (basketSummary) {
    const sourcePart = sourceIndexSummary ? `可续接的写作入口：${sourceIndexSummary}。` : "可续接的写作入口：尚未记录。";
    basketSummary.textContent = basketEntries.length
      ? `已选择 ${basketEntries.length} 条相关笔记。当前阶段：${relationCountsErrored ? "关系读取失败" : relationCountsReady ? basketReadiness.status : "正在读取关系"}。${relationCountsErrored ? "正式关系暂时读取失败，先稍后重试或回到笔记里确认关系。" : relationCountsReady ? basketReadiness.hint : "等正式关系读取完成后，再判断是否能形成文章。"} ${sourcePart}`
      : `还没有选择相关笔记。先确认一个值得推进的主题，再挑选 2-5 条能支撑论证的永久笔记。${sourcePart}`;
  }
  if (basketList) {
    basketList.innerHTML = basketEntries.length
      ? basketEntries.map((entry) => renderWritingNoteCard(entry, { selected: true, action: "remove", actionLabel: "移出相关笔记" })).join("")
      : `<div class="writing-empty">先在左侧打开一条原创笔记，点击“加入当前笔记”，或从下面选择已经成熟的永久笔记。</div>`;
  }
  const basketIdSet = new Set(parseWritingBasketIds());
  if (candidateSummary) {
    candidateSummary.textContent = candidates.length
      ? candidateFocusPlan.usingFocusedScope
        ? `${candidateFocusPlan.scopeLabel}里有 ${candidates.length} 条可作为相关笔记的永久笔记，${writingThemeSummary(candidates)}。先沿着这段图谱结构推进，再决定哪些笔记适合写进同一篇文章。`
        : `当前目录内有 ${candidates.length} 条永久笔记，${writingThemeSummary(candidates)}。先确认自己的判断，再选择哪些笔记适合写进同一篇文章。`
      : candidateFocusPlan.usingFocusedScope
        ? `${candidateFocusPlan.scopeLabel}里暂时还没有可作为相关笔记的永久笔记。可以先回图谱继续补关系，或回到目录范围挑选成熟观点。`
        : "当前目录里还没有已加载的永久笔记。可以先回到永久笔记目录形成几条自己的观点，再来组织可写主题。";
  }
  if (candidateList) {
    candidateList.innerHTML = candidates.length
      ? candidates
          .map((entry) =>
            renderWritingNoteCard(entry, {
              selected: basketIdSet.has(entry.id),
              action: basketIdSet.has(entry.id) ? "remove" : "add",
              actionLabel: basketIdSet.has(entry.id) ? "移出相关笔记" : "加入相关笔记"
            })
          )
          .join("")
      : `<div class="writing-empty">${candidateFocusPlan.usingFocusedScope ? `${candidateFocusPlan.scopeLabel}里还没有可用的永久笔记。` : "当前目录还没有可用的永久笔记。"}</div>`;
  }
  if ($("btnWritingAddVisible")) {
    $("btnWritingAddVisible").textContent = candidateFocusPlan.addActionLabel;
    $("btnWritingAddVisible").disabled = candidates.length === 0;
  }

  if (openDraftButton) {
    openDraftButton.disabled = panelState.openDraftButtonState.disabled;
    openDraftButton.textContent = panelState.openDraftButtonState.text;
  }
  if (createProjectButton) {
    createProjectButton.disabled = hasProject || !projectEntry.canCreateProject;
    createProjectButton.textContent = hasProject ? "主题已确定" : projectEntry.actionLabel;
  }
  if (createScaffoldButton) {
    createScaffoldButton.disabled = panelState.scaffoldButtonState.disabled;
    createScaffoldButton.textContent = panelState.scaffoldButtonState.text;
  }
  if (copyScaffoldButton) copyScaffoldButton.disabled = !writingState.project?.scaffold_id;
  if (exportScaffoldButton) exportScaffoldButton.disabled = !writingState.project?.scaffold_id;
  if (saveDraftButton) {
    const canSaveDraft = Boolean(writingState.scaffold?.id) && projectPreflightSummary.level === "ready";
    saveDraftButton.disabled = !canSaveDraft;
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
      : projectPreflightSummary.level === "needs_clarification"
        ? "先澄清主题问题"
        : projectPreflightSummary.level === "has_gaps"
          ? "先补主题缺口"
          : "保存为草稿笔记";
  }
  const strongModelBasketIds = renderWritingStrongModelSummaryDom({
    writingState,
    panelState,
    strongModelState,
    basketIds,
    strongModelButton,
    strongModelSummary,
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
