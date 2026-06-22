import {
  renderWritingFlowStepsView,
  writingFlowStepItems
} from "./writing-workspace-view.js";

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

export function renderWritingScaffoldPreviewDom(deps = {}) {
  const {
    $,
    state,
    writingState,
    currentWritingContinuationEntry,
    describeWritingProjectPreflight,
    describeProjectPreflight,
    groupWritingPreflightChecks,
    writingDraftDirectoryId,
    folderById,
    parseWritingBasketIds,
    describeWritingNextActionFromState,
    escapeHtml
  } = deps;
  const el = $("writingScaffoldPreview");
  if (!el) return;
  const projectEntry = (!writingState.project?.id && currentWritingContinuationEntry("当前写作篮")) || null;
  const projectPreflightSummary = describeWritingProjectPreflight(writingState.project?.preflight || null);
  if (!writingState.scaffold) {
    el.innerHTML = `
      <h4>草稿骨架预览</h4>
      <div class="writing-empty">${
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `当前写作篮已经对应${escapeHtml(projectEntry.status)}。先用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，再回来查看草稿骨架预览。`
          : `当前写作篮入口：${escapeHtml(projectEntry?.status || "先补写作材料")}。${escapeHtml(projectEntry?.hint || "先补齐写作材料，再回来查看草稿骨架预览。")}`
      }</div>
    `;
    return;
  }

  const sections = Array.isArray(writingState.scaffold.sections) ? writingState.scaffold.sections : [];
  const questions = Array.isArray(writingState.scaffold.open_questions) ? writingState.scaffold.open_questions : [];
  const preflight = writingState.scaffold.preflight || null;
  const preflightSummary = describeProjectPreflight(preflight);
  const { checks: preflightChecks, blocking: blockingChecks, warnings: warningChecks, passes: passingChecks } = groupWritingPreflightChecks(preflight);
  const markdown = String(writingState.scaffoldMarkdown || "").trim();
  const targetDirectoryId = writingDraftDirectoryId();
  const targetFolder = folderById(state, targetDirectoryId);
  const nextAction = describeWritingNextActionFromState({
    basketCount: parseWritingBasketIds().length,
    hasProject: Boolean(writingState.project?.id),
    hasScaffold: Boolean(writingState.scaffold?.id),
    hasDraft: Boolean(writingState.project?.draft_note_id),
    projectEntryProjectId: Boolean(writingState.project?.id) ? "" : String(projectEntry?.projectId || "").trim(),
    projectEntryAction: Boolean(writingState.project?.id) ? "" : String(projectEntry?.action || "").trim(),
    projectEntryActionLabel: Boolean(writingState.project?.id) ? "" : String(projectEntry?.actionLabel || "").trim(),
    projectPreflightLevel: Boolean(writingState.project?.id) ? projectPreflightSummary.level : "",
    projectPreflightHint: Boolean(writingState.project?.id) ? projectPreflightSummary.hint : "",
    projectPreflightChecksLength: Array.isArray(writingState.project?.preflight?.checks) ? writingState.project.preflight.checks.length : 0,
    blockingCount: blockingChecks.length,
    warningCount: warningChecks.length
  });
  el.innerHTML = `
    <h4>草稿骨架预览</h4>
    <div class="writing-summary">
      草稿骨架：${escapeHtml(writingState.scaffold.id || "未命名")}；章节 ${escapeHtml(sections.length || 0)} 个；开放问题 ${escapeHtml(questions.length || 0)} 个。
    </div>
    <div class="writing-summary">
      保存草稿时会写入：${escapeHtml(targetFolder?.name || targetDirectoryId)}。
    </div>
    <div class="writing-summary">
      下一步：${escapeHtml(nextAction.title)}。${escapeHtml(nextAction.note)}
    </div>
    ${
      preflightChecks.length
        ? `<div>
            <h4>生成前检查</h4>
            <div class="writing-summary">
              ${escapeHtml(preflightSummary.level === "ready" ? preflightSummary.status : preflightSummary.hint)}
            </div>
            ${
              warningChecks.length
                ? `<div class="writing-summary">提醒项：${escapeHtml(String(warningChecks.length))} 个，建议先补齐再保存草稿。</div>`
                : ""
            }
            ${
              passingChecks.length
                ? `<div class="writing-summary">已通过：${escapeHtml(String(passingChecks.length))} 项。</div>`
                : ""
            }
            <ul>
              ${preflightChecks
                .map(
                  (check) =>
                    `<li><strong>${escapeHtml(check.status === "pass" ? "通过" : "提醒")}：${escapeHtml(check.label || "")}</strong> ${escapeHtml(check.message || "")}</li>`
                )
                .join("")}
            </ul>
          </div>`
        : ""
    }
    <div>
      <h4>章节结构</h4>
      ${
        sections.length
          ? `<ol>${sections
              .map((section) => {
                const gaps = Array.isArray(section.gaps) ? section.gaps : [];
                const counterpoints = Array.isArray(section.counterpoints) ? section.counterpoints : [];
                const sectionQuestions = Array.isArray(section.open_questions) ? section.open_questions : [];
                return `
                  <li>
                    <strong>${escapeHtml(section.heading || `Section ${section.order || ""}`)}</strong> ${escapeHtml(section.purpose || "")}
                    ${
                      gaps.length
                        ? `<div class="writing-summary">待补缺口：${escapeHtml(gaps.join(" / "))}</div>`
                        : ""
                    }
                    ${
                      counterpoints.length
                        ? `<div class="writing-summary">反方/边界：${escapeHtml(counterpoints.join(" / "))}</div>`
                        : ""
                    }
                    ${
                      sectionQuestions.length
                        ? `<div class="writing-summary">待回答问题：${escapeHtml(sectionQuestions.join(" / "))}</div>`
                        : ""
                    }
                  </li>
                `;
              })
              .join("")}</ol>`
          : `<div class="writing-empty">当前草稿骨架还没有章节。</div>`
      }
    </div>
    <div>
      <h4>待处理的反方与漏洞</h4>
      ${
        questions.length
          ? `<ul>${questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>`
          : `<div class="writing-empty">当前草稿骨架还没有开放问题。</div>`
      }
    </div>
    <div>
      <h4>Markdown 预览</h4>
      ${markdown ? `<pre>${escapeHtml(markdown)}</pre>` : `<div class="writing-empty">本次返回里还没有 Markdown 内容。</div>`}
    </div>
  `;
}

export function renderWritingBookDesignDom(deps = {}) {
  const {
    $,
    writingState,
    writingBasketEntries,
    normalizeWritingBookStructure,
    deriveWritingBookDesign,
    writingBookStructureStats,
    escapeHtml
  } = deps;
  const summaryEl = $("writingBookDesignSummary");
  const structureEl = $("writingBookStructure");
  const poolsEl = $("writingBookPools");
  const ideasEl = $("writingBookLocalIdeas");
  const button = $("btnWritingLocalBookIdeas");
  if (!summaryEl && !structureEl && !poolsEl && !ideasEl) return;
  const notes = writingBasketEntries();
  if (button) button.disabled = notes.length === 0;
  if (!notes.length) {
    if (summaryEl) summaryEl.textContent = "先把易经材料加入写作篮，这里会把文章级材料重排成主线、部、章、节、案例池和反方池。";
    if (structureEl) structureEl.innerHTML = `<div class="writing-empty">还没有可用于书稿设计的材料。先加入写作篮，再让本地模型入口生成三种书稿方向。</div>`;
    if (poolsEl) poolsEl.innerHTML = `<div class="writing-book-pool-kicker">材料池</div><div class="writing-book-pool-title">等待材料</div><div class="writing-section-note">案例池、反方池和开放问题会跟随写作篮刷新。</div>`;
    if (ideasEl) ideasEl.innerHTML = `<div class="writing-book-pool-kicker">本地建议</div><div class="writing-book-pool-title">等待生成</div><div class="writing-section-note">不会上传材料；只在本机先给三个成书方向。</div>`;
    return;
  }
  const persistedStructure = normalizeWritingBookStructure(writingState.project?.book_structure || {});
  const design = persistedStructure.parts.length ? persistedStructure : deriveWritingBookDesign({ notes });
  const stats = writingBookStructureStats(design);
  if (summaryEl) {
    summaryEl.textContent = `主线：${design.mainline} 已按书稿级结构保存为 ${stats.partCount} 部、${stats.chapterCount} 章、${stats.sectionCount} 节；材料 ${notes.length} 条。`;
  }
  if (structureEl) {
    structureEl.innerHTML = design.parts
      .map(
        (part) => `
          <article class="writing-book-part">
            <div class="writing-book-part-head">
              <div class="writing-book-part-kicker">${escapeHtml(part.label)}</div>
              <div class="writing-book-part-title">${escapeHtml(part.title)}</div>
            </div>
            <ul class="writing-book-chapter-list">
              ${part.chapters
                .map(
                  (chapter) => `
                    <li>
                      <strong>${escapeHtml(chapter.title)}</strong>
                      <small>${escapeHtml(chapter.sections.map((section) => section.title).join(" / "))}</small>
                      <small>${escapeHtml(chapter.evidence_note_ids.length ? `来源笔记：${chapter.evidence_note_ids.join(", ")}` : "需要补充来源笔记")}</small>
                    </li>
                  `
                )
                .join("")}
            </ul>
          </article>
        `
      )
      .join("");
  }
  if (poolsEl) {
    poolsEl.innerHTML = `
      <div class="writing-book-pool-kicker">材料池</div>
      <div class="writing-book-pool-title">案例池、反方池、开放问题</div>
      <strong>案例池</strong>
      <ul>${design.pools.cases.map((item) => `<li>${escapeHtml(item.title || item.note_ids.join(", "))}</li>`).join("")}</ul>
      <strong>反方池</strong>
      <ul>${design.pools.counterarguments.map((item) => `<li>${escapeHtml(item.title || item.note_ids.join(", "))}</li>`).join("")}</ul>
      <strong>开放问题</strong>
      <ul>${design.pools.open_questions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    `;
  }
  if (ideasEl) {
    const ideas = Array.isArray(writingState.localBookIdeas) && writingState.localBookIdeas.length
      ? writingState.localBookIdeas
      : Array.isArray(design.direction_ideas) ? design.direction_ideas : [];
    ideasEl.innerHTML = `
      <div class="writing-book-pool-kicker">本地建议</div>
      <div class="writing-book-pool-title">${ideas.length ? "三种成书方向" : "等待本地生成"}</div>
      ${
        ideas.length
          ? `<div class="writing-book-idea-list">${ideas
              .map(
                (idea) => `
                  <div class="writing-book-idea">
                    <strong>${escapeHtml(idea.title)}</strong>
                    <small>读者：${escapeHtml(idea.reader)}</small>
                    <small>承诺：${escapeHtml(idea.promise)}</small>
                    <small>风险：${escapeHtml(idea.risk)}</small>
                    <small>依据笔记：${escapeHtml((idea.noteIds || idea.note_ids || []).join(", ") || "当前写作篮")}</small>
                  </div>
                `
              )
              .join("")}</div>`
          : `<div class="writing-section-note">点击按钮后，本地规则/模型入口会先给三种书稿方向；这些建议不会自动写入项目，也不会发送到远程模型。</div>`
      }
    `;
  }
}

export function renderWritingStrongModelRequestDetailDom(deps = {}, { noteIds = null, strongModelReady = false } = {}) {
  const {
    $,
    writingState,
    parseWritingBasketIds,
    writingKnownNoteById,
    writingBookProjectGoal,
    writingBookProjectAudience,
    escapeHtml
  } = deps;
  const resolvedNoteIds = Array.isArray(noteIds) ? noteIds : parseWritingBasketIds();
  const el = $("writingStrongModelRequestDetail");
  if (!el) return;
  const notes = resolvedNoteIds.map((noteId) => writingKnownNoteById(noteId) || { id: noteId, title: noteId });
  const result = writingState.strongModelResult;
  const request = result?.request || null;
  const modelName = request?.model?.model || "strong_model";
  const goal = writingBookProjectGoal() || "请强模型检查书稿主线、章节结构、材料缺口和反方压力。";
  const audience = writingBookProjectAudience() || "尚未填写";
  if (!notes.length) {
    el.innerHTML = `
      <strong>强模型请求包</strong>
      <div class="writing-section-note">先加入写作篮并创建项目后，这里会显示用了哪些笔记、准备问模型什么，以及哪些内容不会发送。</div>
    `;
    return;
  }
  const plannedQuestions = [
    "这组易经材料适合写成哪三种书？各自的读者、主线和风险是什么？",
    "如果写《AI时代易经与人生》，部 / 章 / 节应该如何重排？",
    "哪些案例、反方和开放问题必须补齐，才像完整书稿而不是长文大纲？",
    "哪些材料只适合放入案例池或反方池，不应该进入主线？"
  ];
  const notSent = [
    "不会发送未加入写作篮的其它笔记、其它草稿或整个库。",
    "不会发送本地设置、系统消息、图谱 UI 状态和无关文件路径。",
    "不会自动写入笔记、不会自动改图谱，也不会自动采纳模型建议。",
    "当前实现先准备请求包；只有你确认后才进入远程强模型流程。"
  ];
  el.innerHTML = `
    <strong>强模型请求包${request ? `：${escapeHtml(modelName)}` : ""}</strong>
    <ul>
      <li>使用笔记：${escapeHtml(notes.map((note) => `${note.title || note.id}（${note.id}）`).join("；"))}</li>
      <li>写作目标：${escapeHtml(goal)}</li>
      <li>目标读者：${escapeHtml(audience)}</li>
      <li>状态：${escapeHtml(request ? "请求包已准备，可复核后处理返回建议" : strongModelReady ? "条件已满足，可以准备请求包" : "等待项目、关系读取或材料成熟度满足")}</li>
    </ul>
    <strong>准备问模型什么</strong>
    <ul>${plannedQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
    <strong>不会发送 / 不会自动做</strong>
    <ul>${notSent.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
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
    describeWritingProjectEntryState,
    describeWritingProjectPreflight,
    isWritingStrongModelReady,
    describeWritingStrongModelStatus,
    currentWritingContinuationEntry,
    writingOpenDraftButtonState,
    writingScaffoldButtonState,
    writingStrongModelButtonState,
    renderWritingStatusStrip,
    selectedWritingThemeIndex,
    writingThemeIndexNoteIds,
    shouldHydrateWritingThemeNotes,
    hydrateWritingThemeNotes,
    shouldRefreshWritingThemeRelationCounts,
    refreshWritingThemeRelationCounts,
    clearWritingThemeRelationCounts,
    writingThemeDetailHintText,
    renderWritingThemeDetail,
    renderWritingToplineMetric,
    renderWritingThemeIndexCard,
    writingThemeSummary,
    renderWritingNoteCard,
    renderWritingProjectCard,
    renderScaffoldVersionCard,
    renderDraftVersionCard,
    describeWritingStrongModelIdleSummary,
    escapeHtml
  } = deps;
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
    scopeHint.textContent = candidateFocusPlan.usingFocusedScope
      ? `当前作用范围：${scopeRoot?.name || "永久笔记"} / ${scopeFolder?.name || "当前目录"}。你是从图谱切片进入写作中心的，候选区会优先显示${candidateFocusPlan.scopeLabel}里的永久笔记；写作篮和主题索引仍保持当前目录范围。`
      : `当前作用范围：${scopeRoot?.name || "永久笔记"} / ${scopeFolder?.name || "当前目录"}。这里只显示当前目录及其子目录里已经转化出的永久笔记，不展示原始导入资料；写作中心入口默认从已有观点开始。`;
  }
  renderWritingStatusStrip();
  if (themeIndexesHint) {
    if (writingState.loadingThemeIndexes && writingState.themeIndexes.length) {
      themeIndexesHint.textContent = `正在刷新主题索引... 当前显示 ${writingState.themeIndexes.length} 个。`;
    } else if (writingState.loadingThemeIndexes) {
      themeIndexesHint.textContent = "正在读取主题索引...";
    } else if (writingState.themeIndexes.length) {
      themeIndexesHint.textContent = `${sourceIndexSummary ? `${sourceIndexSummary}；` : ""}当前范围内有 ${writingState.themeIndexes.length} 个主题索引可作为可续接的写作入口。`;
    } else {
      themeIndexesHint.textContent = "当前范围还没有主题索引。先把一组成熟永久笔记组织进写作篮，再保存为主题索引。";
    }
  }
  if (themeIndexList) {
    if (writingState.loadingThemeIndexes) {
      themeIndexList.innerHTML = writingState.themeIndexes.length
        ? writingState.themeIndexes.map(renderWritingThemeIndexCard).join("")
        : `<div class="writing-empty">正在加载主题索引...</div>`;
    } else if (writingState.themeIndexes.length) {
      themeIndexList.innerHTML = writingState.themeIndexes.map(renderWritingThemeIndexCard).join("");
    } else {
      themeIndexList.innerHTML = `<div class="writing-empty">还没有主题索引。用当前写作篮里的成熟永久笔记保存一个，后续就能从这里继续一条可续接的写作入口。</div>`;
    }
  }

  const selectedTheme = selectedWritingThemeIndex();
  if (selectedTheme) {
    const selectedThemeNoteIds = writingThemeIndexNoteIds(selectedTheme);
    if (shouldHydrateWritingThemeNotes(selectedThemeNoteIds)) {
      void hydrateWritingThemeNotes(selectedThemeNoteIds);
    }
    if (shouldRefreshWritingThemeRelationCounts(selectedThemeNoteIds)) {
      void refreshWritingThemeRelationCounts(selectedThemeNoteIds);
    }
  } else if (
    writingState.themeRelationNoteIds.length ||
    Object.keys(writingState.themeRelationCounts).length ||
    writingState.themeNoteDetailIds.length
  ) {
    writingState.themeNoteDetailIds = [];
    writingState.loadingThemeNoteDetails = false;
    clearWritingThemeRelationCounts();
  }
  if (themeDetailHint) {
    themeDetailHint.textContent = selectedTheme
      ? writingThemeDetailHintText(selectedTheme)
      : writingThemeDetailHintText(null);
  }
  if (themeDetail) {
    themeDetail.innerHTML = renderWritingThemeDetail(selectedTheme);
  }

  if (toplineMetrics) {
    toplineMetrics.innerHTML = panelState.toplineMetrics
      .map((metric) => renderWritingToplineMetric(metric.label, metric.value, metric.note, metric.tone))
      .join("");
  }
  if (basketSummary) {
    const sourcePart = sourceIndexSummary ? `可续接的写作入口：${sourceIndexSummary}。` : "可续接的写作入口：尚未记录。";
    basketSummary.textContent = basketEntries.length
      ? `写作篮已有 ${basketEntries.length} 条永久笔记。当前阶段：${relationCountsErrored ? "关系读取失败" : relationCountsReady ? basketReadiness.status : "正在读取关系"}。${relationCountsErrored ? "正式关系暂时读取失败，先稍后重试或回到笔记里确认关系。" : relationCountsReady ? basketReadiness.hint : "等正式关系读取完成后，再判断是否能建项目。"} ${sourcePart}`
      : `写作篮还没有笔记。先确认一个值得推进的主题，再挑选 2-5 条能支撑论证的永久笔记。${sourcePart}`;
  }
  if (basketList) {
    basketList.innerHTML = basketEntries.length
      ? basketEntries.map((entry) => renderWritingNoteCard(entry, { selected: true, action: "remove", actionLabel: "移出写作篮" })).join("")
      : `<div class="writing-empty">\u5148\u5728\u5de6\u4fa7\u6253\u5f00\u4e00\u6761\u539f\u521b\u7b14\u8bb0\u70b9\u51fb“\u628a\u5f53\u524d\u7b14\u8bb0\u52a0\u5165\u5199\u4f5c\u7bee”\uff0c\u6216\u5148\u770b\u4e0b\u9762\u54ea\u4e9b\u4e3b\u9898\u5df2\u7ecf\u6210\u5f62\uff0c\u518d\u628a\u76f8\u5173\u7b14\u8bb0\u6279\u91cf\u52a0\u5165\u5199\u4f5c\u7bee\u3002</div>`;
  }
  const basketIdSet = new Set(parseWritingBasketIds());
  if (candidateSummary) {
    candidateSummary.textContent = candidates.length
      ? candidateFocusPlan.usingFocusedScope
        ? `${candidateFocusPlan.scopeLabel}里有 ${candidates.length} 条可加入写作篮的永久笔记，${writingThemeSummary(candidates)}。先沿着这段图谱结构推进，再决定哪些笔记加入写作篮。`
        : `当前目录内有 ${candidates.length} 条永久笔记，${writingThemeSummary(candidates)}。先确认自己的判断，再决定哪些笔记加入写作篮。`
      : candidateFocusPlan.usingFocusedScope
        ? `${candidateFocusPlan.scopeLabel}里暂时还没有可加入写作篮的永久笔记。可以先回图谱继续补关系，或回到目录范围挑选成熟观点。`
        : "当前目录里还没有已加载的永久笔记。可以先回到永久笔记目录形成几条自己的观点，再来组织可写主题。";
  }
  if (candidateList) {
    candidateList.innerHTML = candidates.length
      ? candidates
          .map((entry) =>
            renderWritingNoteCard(entry, {
              selected: basketIdSet.has(entry.id),
              action: basketIdSet.has(entry.id) ? "remove" : "add",
              actionLabel: basketIdSet.has(entry.id) ? "移出写作篮" : "加入写作篮"
            })
          )
          .join("")
      : `<div class="writing-empty">${candidateFocusPlan.usingFocusedScope ? `${candidateFocusPlan.scopeLabel}里还没有可用的永久笔记候选。` : "当前目录还没有可用的永久笔记候选。"}</div>`;
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
    createProjectButton.textContent = hasProject ? "项目已创建" : projectEntry.actionLabel;
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
          : projectEntry?.actionLabel === "创建项目"
            ? "先创建项目"
            : projectEntry?.actionLabel || "先补写作材料"
        : projectPreflightSummary.level === "needs_clarification"
          ? "先澄清项目问题"
          : projectPreflightSummary.level === "has_gaps"
            ? "先补项目缺口"
            : "先生成草稿骨架"
      : projectPreflightSummary.level === "needs_clarification"
        ? "先澄清项目问题"
        : projectPreflightSummary.level === "has_gaps"
          ? "先补项目缺口"
          : "保存为草稿笔记";
  }
  const strongModelBasketIds = basketIds;
  if (strongModelButton) {
    strongModelButton.disabled = panelState.strongModelButtonState.disabled;
    strongModelButton.textContent = panelState.strongModelButtonState.text;
  }
  if (strongModelSummary) {
    const result = writingState.strongModelResult;
    const request = result?.request;
    const artifactCount = Number(result?.result?.summary?.artifactCount || result?.result?.artifacts?.length || 0);
    if (writingState.strongModelError) {
      strongModelSummary.textContent = `强模型分析准备失败：${writingState.strongModelError}`;
    } else if (writingState.strongModelLoading) {
      strongModelSummary.textContent = "正在准备强模型分析请求...";
    } else if (request) {
      strongModelSummary.textContent = result?.result
        ? `已归一化 ${artifactCount} 条写作待审建议，全部进入系统消息中的 AI 建议复核后再决定是否采用。`
        : `已准备 ${request.model?.model || "strong_model"} 请求包；当前没有直接调用远程模型。`;
    } else {
      strongModelSummary.textContent = describeWritingStrongModelIdleSummary({
        basketCount: strongModelBasketIds.length,
        strongModelStateHint: strongModelState.hint
      });
    }
  }
  renderWritingStrongModelRequestDetailDom(deps, { noteIds: strongModelBasketIds, strongModelReady });
  renderWritingBookDesignDom(deps);

  if (projectsHint) {
    const filterSummary = [
      writingState.projectFilters.q ? `搜索“${writingState.projectFilters.q}”` : "",
      writingState.projectFilters.status !== "all" ? `状态 ${writingState.projectFilters.status}` : "",
      writingState.projectFilters.hasDraft === "true" ? "仅看有草稿" : "",
      writingState.projectFilters.hasDraft === "false" ? "仅看无草稿" : ""
    ]
      .filter(Boolean)
      .join("，");
    if (writingState.loadingProjects && writingState.projects.length) projectsHint.textContent = `正在刷新最近项目... 当前显示 ${writingState.projects.length} 个项目。`;
    else if (writingState.loadingProjects) projectsHint.textContent = "正在读取最近项目...";
    else if (writingState.projects.length) projectsHint.textContent = `${filterSummary ? `${filterSummary}，` : ""}共找到 ${writingState.projects.length} 个项目。`;
    else if (filterSummary) projectsHint.textContent = `${filterSummary}，但暂时没有匹配项目。`;
    else if (!hasProject && projectEntry.projectId) projectsHint.textContent = `当前写作篮入口：${projectEntry.status}。${projectEntry.hint}`;
    else projectsHint.textContent = `当前写作篮入口：${projectEntry.status}。${projectEntry.hint}`;
  }
  if (projectsList) {
    if (writingState.loadingProjects) {
      projectsList.innerHTML = writingState.projects.length
        ? writingState.projects.map(renderWritingProjectCard).join("")
        : `<div class="writing-empty">正在加载最近项目...</div>`;
    } else if (writingState.projects.length) {
      projectsList.innerHTML = writingState.projects.map(renderWritingProjectCard).join("");
    } else {
      projectsList.innerHTML = !hasProject && projectEntry.projectId
        ? `<div class="writing-empty">当前写作篮已经对应 ${escapeHtml(projectEntry.status)}。直接用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，会比重新创建项目更连续。</div>`
        : `<div class="writing-empty">当前写作篮入口：${escapeHtml(projectEntry.status)}。${escapeHtml(projectEntry.hint)}</div>`;
    }
  }

  if (scaffoldVersionsHint) {
    if (!writingState.project?.id) {
      scaffoldVersionsHint.textContent =
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `当前写作篮已经对应${projectEntry.status}。先用上面的“${projectEntry.actionLabel}”继续，这里就会显示当前项目的草稿骨架版本。`
          : `当前写作篮入口：${projectEntry.status}。${projectEntry.hint}`;
    }
    else if (writingState.loadingScaffoldVersions && writingState.scaffoldVersions.length) {
      scaffoldVersionsHint.textContent = `正在刷新草稿骨架版本... 当前显示 ${writingState.scaffoldVersions.length} 个版本。`;
    } else if (writingState.loadingScaffoldVersions) scaffoldVersionsHint.textContent = "正在读取草稿骨架版本...";
    else if (writingState.scaffoldVersions.length) scaffoldVersionsHint.textContent = `当前项目共有 ${writingState.scaffoldVersions.length} 个草稿骨架版本。`;
    else scaffoldVersionsHint.textContent = "当前项目还没有草稿骨架版本。";
  }
  if (scaffoldVersionsList) {
    if (!writingState.project?.id) {
      scaffoldVersionsList.innerHTML =
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `<div class="writing-empty">当前写作篮已经对应${escapeHtml(projectEntry.status)}。先用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，这里就会显示当前项目的历史草稿骨架版本。</div>`
          : `<div class="writing-empty">当前写作篮入口：${escapeHtml(projectEntry.status)}。${escapeHtml(projectEntry.hint)}</div>`;
    } else if (writingState.loadingScaffoldVersions) {
      scaffoldVersionsList.innerHTML = writingState.scaffoldVersions.length
        ? writingState.scaffoldVersions.map(renderScaffoldVersionCard).join("")
        : `<div class="writing-empty">正在加载草稿骨架版本...</div>`;
    } else if (writingState.scaffoldVersions.length) {
      scaffoldVersionsList.innerHTML = writingState.scaffoldVersions.map(renderScaffoldVersionCard).join("");
    } else {
      scaffoldVersionsList.innerHTML = `<div class="writing-empty">还没有草稿骨架版本。点击“生成草稿骨架”后会开始累积版本。</div>`;
    }
  }

  if (draftVersionsHint) {
    if (!writingState.project?.id) {
      draftVersionsHint.textContent =
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `当前写作篮已经对应${projectEntry.status}。先用上面的“${projectEntry.actionLabel}”继续，这里就会显示当前项目的草稿版本。`
          : `当前写作篮入口：${projectEntry.status}。${projectEntry.hint}`;
    }
    else if (writingState.loadingDraftVersions && writingState.draftVersions.length) {
      draftVersionsHint.textContent = `正在刷新草稿版本... 当前显示 ${writingState.draftVersions.length} 个版本。`;
    } else if (writingState.loadingDraftVersions) draftVersionsHint.textContent = "正在读取草稿版本...";
    else if (writingState.draftVersions.length) draftVersionsHint.textContent = `当前项目共有 ${writingState.draftVersions.length} 个草稿版本。`;
    else draftVersionsHint.textContent = "当前项目还没有草稿版本。";
  }
  if (draftVersionsList) {
    if (!writingState.project?.id) {
      draftVersionsList.innerHTML =
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `<div class="writing-empty">当前写作篮已经对应${escapeHtml(projectEntry.status)}。先用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，这里就会显示当前项目的草稿版本。</div>`
          : `<div class="writing-empty">当前写作篮入口：${escapeHtml(projectEntry.status)}。${escapeHtml(projectEntry.hint)}</div>`;
    } else if (writingState.loadingDraftVersions) {
      draftVersionsList.innerHTML = writingState.draftVersions.length
        ? writingState.draftVersions.map(renderDraftVersionCard).join("")
        : `<div class="writing-empty">正在加载草稿版本...</div>`;
    } else if (writingState.draftVersions.length) {
      draftVersionsList.innerHTML = writingState.draftVersions.map(renderDraftVersionCard).join("");
    } else {
      draftVersionsList.innerHTML = `<div class="writing-empty">还没有草稿版本。点击“保存为草稿笔记”后会开始累积版本。</div>`;
    }
  }

  renderWritingFlowStepsDom(deps, {
    basketCount: basketEntries.length,
    hasProject: Boolean(writingState.project?.id),
    projectId: writingState.project?.id || "",
    projectEntry
  });
  renderWritingScaffoldPreviewDom(deps);
}
