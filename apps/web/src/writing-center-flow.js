export function groupWritingPreflightChecks(preflight = null) {
  const checks = Array.isArray(preflight?.checks) ? preflight.checks : [];
  const blocking = checks.filter((check) => {
    const status = String(check?.status || "").trim().toLowerCase();
    return status === "fail" || status === "blocking" || status === "blocked" || status === "error";
  });
  const warnings = checks.filter((check) => String(check?.status || "").trim().toLowerCase() === "warning");
  const passes = checks.filter((check) => String(check?.status || "").trim().toLowerCase() === "pass");
  return { checks, blocking, warnings, passes };
}

export function describeWritingContinuationAction({
  existingProjectId = "",
  existingProjectHasScaffold = false,
  existingProjectHasDraft = false,
  scopeLabel = "当前笔记"
} = {}) {
  const currentProjectId = String(existingProjectId || "").trim();
  if (!currentProjectId) return null;
  if (existingProjectHasDraft) {
    return {
      level: "current_draft",
      status: "打开当前草稿",
      hint: `${scopeLabel}已经有草稿。直接打开当前草稿继续写，会比重新开始更连续。`,
      actionLabel: "打开当前草稿",
      action: "open-draft",
      projectId: currentProjectId,
      canCreateProject: true
    };
  }
  if (existingProjectHasScaffold) {
    return {
      level: "current_scaffold",
      status: "继续文章提纲",
      hint: `${scopeLabel}已经有文章提纲。先回到这组笔记继续完善提纲，会比重新开始更连续。`,
      actionLabel: "继续文章提纲",
      action: "resume-scaffold",
      projectId: currentProjectId,
      canCreateProject: true
    };
  }
  return {
    level: "current_project",
    status: "继续这个主题",
    hint: `${scopeLabel}已经确定过可写主题。直接回到这个主题继续推进，会比重新开始更连续。`,
    actionLabel: "继续这个主题",
    action: "resume-project",
    projectId: currentProjectId,
    canCreateProject: true
  };
}

export function describeWritingNextActionFromState({
  basketCount = 0,
  hasProject = false,
  hasScaffold = false,
  hasDraft = false,
  projectEntryProjectId = "",
  projectEntryAction = "",
  projectEntryActionLabel = "",
  projectPreflightLevel = "",
  projectPreflightHint = "",
  projectPreflightChecksLength = 0,
  blockingCount = 0,
  warningCount = 0
} = {}) {
  if (!basketCount) {
    return {
      title: "选择相关笔记",
      note: "先把 2-5 条能支撑同一主题的永久笔记放到一起。"
    };
  }
  const continuationProjectId = String(projectEntryProjectId || "").trim();
  const continuationAction = String(projectEntryAction || "").trim();
  const continuationActionLabel = String(projectEntryActionLabel || "").trim();
  if (!hasProject && continuationProjectId && continuationActionLabel) {
    if (continuationAction === "open-draft") {
      return {
        title: "打开当前草稿",
        note: `这组笔记已经有草稿，先打开当前草稿继续写作。`
      };
    }
    if (continuationAction === "resume-scaffold") {
      return {
        title: "继续文章提纲",
        note: `这组笔记已经有文章提纲，先回到提纲，再继续检查证据、缺口和开放问题。`
      };
    }
    return {
      title: "继续这个主题",
      note: `这组笔记已经确定过可写主题，先继续这个主题，再决定是否生成文章提纲或开始草稿。`
    };
  }
  if (!hasProject) {
    return {
      title: "确定可写主题",
      note: "确认题目、读者和相关笔记后，先确定这篇文章要写什么。"
    };
  }
  const cleanProjectPreflightLevel = String(projectPreflightLevel || "").trim();
  const cleanProjectPreflightHint = String(projectPreflightHint || "").trim();
  if (!hasScaffold && cleanProjectPreflightLevel && cleanProjectPreflightLevel !== "ready") {
    if (cleanProjectPreflightLevel === "needs_clarification") {
      return {
        title: "先澄清主题问题",
        note: cleanProjectPreflightHint || "主题已确定，但还需要先处理关键问题，再生成文章提纲。"
      };
    }
    if (cleanProjectPreflightLevel === "has_gaps") {
      return {
        title: "先补主题缺口",
        note:
          cleanProjectPreflightHint ||
          `主题已确定，但还有 ${Number(projectPreflightChecksLength || 0)} 项缺口需要先补齐，再生成文章提纲。`
      };
    }
    return {
      title: "先检查主题条件",
      note: cleanProjectPreflightHint || "主题已确定，先等系统完成检查，再决定是否生成文章提纲。"
    };
  }
  if (!hasScaffold) {
    return {
      title: "生成文章提纲",
      note: "这组笔记已经足够形成一篇文章。下一步先生成文章提纲，检查章节、缺口和反方。"
    };
  }
  if (!hasDraft) {
    if (blockingCount > 0) {
      return {
        title: "先处理阻塞项",
        note: `当前有 ${blockingCount} 个阻塞项，建议先处理后再保存草稿。`
      };
    }
    if (warningCount > 0) {
      return {
        title: "保存草稿",
        note: `可以继续保存草稿，但最好先处理 ${warningCount} 个提醒项。`
      };
    }
    return {
      title: "保存草稿",
      note: "骨架已生成，确认缺口和反方后，把当前版本保存成草稿。"
    };
  }
  return {
    title: "打开当前草稿",
    note: "草稿已绑定，下一步回到编辑器继续写作。"
  };
}

export function describeWritingProjectPreflight(preflight = null) {
  const checks = Array.isArray(preflight?.checks) ? preflight.checks : [];
  const clarificationChecks = checks.filter((check) => String(check?.severity || "").trim().toLowerCase() === "next");
  const gapChecks = checks.filter((check) => String(check?.severity || "").trim().toLowerCase() !== "next");

  if (!preflight) {
    return {
      level: "unknown",
      status: "待检查",
      hint: "主题已确定；系统正在判断这篇文章还缺什么。"
    };
  }

  const status = String(preflight?.status || "").trim().toLowerCase();
  if (status === "ready") {
    return {
      level: "ready",
      status: "可以生成提纲",
      hint: "题目、相关笔记和主题方向已经基本齐备，可以继续生成文章提纲。"
    };
  }
  if (status === "needs_clarification") {
    const first = clarificationChecks[0] || checks[0] || null;
    return {
      level: "needs_clarification",
      status: "先澄清关键问题",
      hint: first?.message || "先补齐主题的关键问题，再继续生成文章提纲。"
    };
  }
  const firstGap = gapChecks[0] || checks[0] || null;
  return {
    level: "has_gaps",
    status: "仍有主题缺口",
    hint: firstGap?.message || `当前主题还有 ${checks.length} 项建议先补齐。`
  };
}

export function isWritingStrongModelReady({ readinessLevel = "", projectPreflightLevel = "" } = {}) {
  return String(readinessLevel || "").trim() === "strong_model_ready" && String(projectPreflightLevel || "").trim() === "ready";
}

export function describeWritingProjectEntryState({
  relationCountsReady = false,
  relationCountsErrored = false,
  readinessLevel = "",
  readinessHint = ""
} = {}) {
  if (relationCountsErrored) {
    return {
      level: "error",
      status: "读取失败",
      hint: "正式关系读取失败，先稍后重试或回到笔记里手动确认关系。",
      actionLabel: "关系读取失败",
      canCreateProject: false
    };
  }
  if (!relationCountsReady) {
    return {
      level: "loading",
      status: "读取中",
      hint: "正在读取正式关系，再判断是否能形成可写主题。",
      actionLabel: "正在读取关系",
      canCreateProject: false
    };
  }
  const cleanLevel = String(readinessLevel || "").trim();
  if (cleanLevel === "project_ready" || cleanLevel === "strong_model_ready") {
    return {
      level: "ready",
      status: "先确定可写主题",
      hint: "这组笔记已经足够形成一篇文章；接下来明确题目和读者。",
      actionLabel: "确定可写主题",
      canCreateProject: true
    };
  }
  if (cleanLevel === "basket_ready") {
    return {
      level: "needs_structure",
      status: "先补关系/边界",
      hint: "还没到写文章的时机；先补边界或关系。",
      actionLabel: "先补关系/边界",
      canCreateProject: false
    };
  }
  if (cleanLevel === "needs_distillation") {
    return {
      level: "needs_distillation",
      status: "先确认判断",
      hint: "先把 thesis 和三句话确认下来。",
      actionLabel: "先确认判断/三句话",
      canCreateProject: false
    };
  }
  if (cleanLevel === "blocked_authorship" || cleanLevel === "blocked_draft") {
    return {
      level: cleanLevel,
      status: "先完成作者/原创确认",
      hint: "先让材料完成作者/原创确认，再进入写作中心。",
      actionLabel: "先完成作者/原创确认",
      canCreateProject: false
    };
  }
  return {
    level: cleanLevel || "needs_basket",
    status: "先补相关笔记",
    hint: String(readinessHint || "").trim() || "先补齐相关笔记，再确定可写主题。",
    actionLabel: "先补相关笔记",
    canCreateProject: false
  };
}

export function describeWritingProjectStepState({
  basketCount = 0,
  hasProject = false,
  projectId = "",
  projectEntryStatus = "",
  projectEntryHint = "",
  projectEntryProjectId = "",
  projectEntryActionLabel = "",
  canCreateProject = false,
  projectPreflightLevel = "",
  projectPreflightHint = "",
  projectPreflightChecksLength = 0
} = {}) {
  if (hasProject) {
    const cleanProjectId = String(projectId || "").trim();
    const cleanProjectPreflightLevel = String(projectPreflightLevel || "").trim();
    const cleanProjectPreflightHint = String(projectPreflightHint || "").trim();
    if (cleanProjectPreflightLevel && cleanProjectPreflightLevel !== "ready") {
      return {
        title: "确定可写主题",
        note:
          cleanProjectPreflightHint ||
          (cleanProjectPreflightLevel === "has_gaps"
            ? `${cleanProjectId || "主题已确定"}，还有 ${Number(projectPreflightChecksLength || 0)} 项缺口需要先补齐。`
            : cleanProjectId || "主题已确定，但还需要先处理后续条件。")
      };
    }
    return {
      title: "确定可写主题",
      note: String(projectId || "").trim() || "已确定可写主题"
    };
  }
  if (!basketCount) {
    return {
      title: "确定可写主题",
      note: "先选出能支撑同一主题的永久笔记。"
    };
  }
  const continuationProjectId = String(projectEntryProjectId || "").trim();
  const continuationActionLabel = String(projectEntryActionLabel || "").trim();
  if (continuationProjectId && continuationActionLabel) {
    return {
      title: "确定可写主题",
      note: String(projectEntryHint || "").trim() || `这组笔记已经对应 ${continuationProjectId}。先${continuationActionLabel}，再继续写作准备。`
    };
  }
  if (!canCreateProject) {
    return {
      title: "确定可写主题",
      note: String(projectEntryHint || "").trim() || String(projectEntryStatus || "").trim() || "先补齐可写主题条件。"
    };
  }
  return {
    title: "确定可写主题",
    note: "先明确题目和读者"
  };
}

export function isWritingScaffoldReadyForDraft({
  hasScaffold = false,
  blockingCount = 0
} = {}) {
  return Boolean(hasScaffold) && Number(blockingCount || 0) <= 0;
}

export function describeWritingScaffoldStepState({
  hasScaffold = false,
  hasProject = false,
  projectEntryProjectId = "",
  projectEntryActionLabel = "",
  blockingCount = 0,
  warningCount = 0
} = {}) {
  if (!hasScaffold) {
    const continuationActionLabel = String(projectEntryActionLabel || "").trim();
    if (!hasProject && String(projectEntryProjectId || "").trim() && continuationActionLabel) {
      return {
        title: continuationActionLabel,
        note: `先${continuationActionLabel}，再检查证据、缺口和反方`
      };
    }
    return {
        title: "生成文章提纲",
      note: "检查证据、缺口和反方"
    };
  }
  if (Number(blockingCount || 0) > 0) {
    return {
      title: "生成文章提纲",
      note: `先补 ${Number(blockingCount || 0)} 个阻塞项`
    };
  }
  if (Number(warningCount || 0) > 0) {
    return {
      title: "生成文章提纲",
      note: `可继续，但建议先补 ${Number(warningCount || 0)} 个提醒`
    };
  }
  return {
    title: "生成文章提纲",
    note: "提纲已生成"
  };
}

export function describeWritingDraftStepState({
  hasDraft = false,
  hasScaffold = false,
  projectEntryProjectId = "",
  projectEntryAction = "",
  projectPreflightLevel = "",
  projectPreflightHint = ""
} = {}) {
  const continuationProjectId = String(projectEntryProjectId || "").trim();
  const continuationAction = String(projectEntryAction || "").trim();
  const cleanProjectPreflightLevel = String(projectPreflightLevel || "").trim();
  const cleanProjectPreflightHint = String(projectPreflightHint || "").trim();
  if (continuationProjectId && continuationAction === "open-draft") {
    return {
      title: "打开当前草稿",
      note: "先打开当前草稿，再继续当前写作。"
    };
  }
  if (continuationProjectId && continuationAction === "resume-scaffold") {
    return {
      title: "继续文章提纲",
      note: "先回到文章提纲，再继续开始草稿。"
    };
  }
  if (continuationProjectId && continuationAction === "resume-project") {
    return {
      title: "继续这个主题",
      note: "先继续这个主题，再生成文章提纲并开始草稿。"
    };
  }
  if (hasDraft) {
    return {
      title: "打开当前草稿",
      note: "草稿已保存，下一步打开当前草稿继续写作。"
    };
  }
  if (hasScaffold && cleanProjectPreflightLevel === "needs_clarification") {
    return {
      title: "先澄清主题问题",
      note: cleanProjectPreflightHint || "先澄清主题关键问题，再开始草稿。"
    };
  }
  if (hasScaffold && cleanProjectPreflightLevel === "has_gaps") {
    return {
      title: "先补主题缺口",
      note: cleanProjectPreflightHint || "先补主题缺口，再开始草稿。"
    };
  }
  if (hasDraft) {
    return {
      title: "保存草稿",
      note: "草稿已保存，下一步打开继续写"
    };
  }
  if (hasScaffold) {
    return {
      title: "保存草稿",
      note: "可继续保存草稿"
    };
  }
  return {
    title: "保存草稿",
    note: "生成文章提纲后再开始草稿"
  };
}

export function describeWritingMaterialStepState({
  basketCount = 0
} = {}) {
  const count = Number(basketCount || 0);
  return {
    title: "相关笔记",
    note: count > 0 ? `${count} 条永久笔记已选为相关笔记` : "把 2-5 条永久笔记放到一起"
  };
}

export function planWritingBasketEntry({
  existingNoteIds = [],
  incomingNoteIds = []
} = {}) {
  const existingIds = [...new Set((existingNoteIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const nextIds = [...new Set((incomingNoteIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const mergedIds = [...new Set([...existingIds, ...nextIds])];
  const addedNoteIds = nextIds.filter((id) => !existingIds.includes(id));

  return {
    basketNoteIds: mergedIds,
    addedNoteIds,
    hasExistingBasket: existingIds.length > 0,
    entryMode: existingIds.length ? "append" : "replace"
  };
}

export function planImportedPermanentNotesWritingEntry({
  noteIds = [],
  title = ""
} = {}) {
  const normalizedNoteIds = [...new Set((noteIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!normalizedNoteIds.length) {
    return {
      action: "empty",
      noteIds: [],
      title: "",
      source: "import_create_project",
      shouldBeginEntry: false
    };
  }
  return {
    action: "begin-entry",
    noteIds: normalizedNoteIds,
    title: String(title || "").trim(),
    source: "import_create_project",
    shouldBeginEntry: true
  };
}

export function planWritingThemeIndexEntry({
  existingNoteIds = [],
  themeNoteIds = [],
  resetContext = false,
  replaceBasket = false
} = {}) {
  const entryPlan = planWritingBasketEntry({
    existingNoteIds,
    incomingNoteIds: themeNoteIds
  });
  if (resetContext && replaceBasket) {
    return {
      ...entryPlan,
      action: "begin-entry",
      preserveSourceIndexIds: false,
      shouldResetContext: true
    };
  }
  if (replaceBasket) {
    return {
      ...entryPlan,
      action: "replace-entry",
      preserveSourceIndexIds: false,
      shouldResetContext: false
    };
  }
  if (entryPlan.addedNoteIds.length) {
    return {
      ...entryPlan,
      action: "append-entry",
      preserveSourceIndexIds: true,
      shouldResetContext: false
    };
  }
  return {
    ...entryPlan,
    action: "metadata-only",
    preserveSourceIndexIds: true,
    shouldResetContext: false
  };
}

export function resolveWritingSourceIndexIds({
  existingSourceIndexIds = [],
  incomingSourceIndexIds = [],
  preserveExisting = true
} = {}) {
  const existingIds = preserveExisting
    ? [...new Set((existingSourceIndexIds || []).map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  const incomingIds = [...new Set((incomingSourceIndexIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  return [...new Set([...existingIds, ...incomingIds])];
}

export function resolveWritingSelectedThemeIndexId({
  currentSelectedThemeIndexId = "",
  nextSourceIndexIds = []
} = {}) {
  const currentId = String(currentSelectedThemeIndexId || "").trim();
  const sourceIds = [...new Set((nextSourceIndexIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (currentId && sourceIds.includes(currentId)) return currentId;
  if (sourceIds.length === 1) return sourceIds[0];
  return "";
}

export function shouldPreserveWritingThemeContext({
  noteIds = [],
  loadedThemeNoteIds = [],
  relationThemeNoteIds = [],
  sameSet = null
} = {}) {
  const same = typeof sameSet === "function"
    ? sameSet
    : (left = [], right = []) => {
        const leftIds = [...new Set((left || []).map((id) => String(id || "").trim()).filter(Boolean))].sort();
        const rightIds = [...new Set((right || []).map((id) => String(id || "").trim()).filter(Boolean))].sort();
        return leftIds.length === rightIds.length && leftIds.every((id, index) => id === rightIds[index]);
      };
  return same(noteIds, loadedThemeNoteIds) && same(noteIds, relationThemeNoteIds);
}

export function writingThemeIndexContinuationRoute({ action = "", projectId = "" } = {}) {
  const cleanAction = String(action || "").trim();
  const cleanProjectId = String(projectId || "").trim();
  if (cleanAction !== "open-draft" && cleanAction !== "resume-project" && cleanAction !== "resume-scaffold") {
    return { kind: "ignored", handled: false };
  }
  if (!cleanProjectId) return { kind: "missing-project", handled: false };
  const actionLabel =
    cleanAction === "open-draft"
      ? "打开当前草稿"
      : cleanAction === "resume-scaffold"
        ? "回到文章提纲"
        : "继续这个主题";
  return {
    kind: "continue-project",
    handled: true,
    action: cleanAction,
    projectId: cleanProjectId,
    openDraft: cleanAction === "open-draft",
    statusMessage:
      cleanAction === "open-draft"
        ? `已从主题索引打开当前草稿：${cleanProjectId}`
        : cleanAction === "resume-scaffold"
          ? `已从可写主题回到文章提纲：${cleanProjectId}`
          : `已从可写主题继续：${cleanProjectId}`,
    failurePrefix: `从主题索引${actionLabel}`
  };
}

export function resolveWritingEntryTitle({
  entryMode = "replace",
  requestedTitle = "",
  existingTitle = ""
} = {}) {
  const cleanRequestedTitle = String(requestedTitle || "").trim();
  const cleanExistingTitle = String(existingTitle || "").trim();
  if (cleanExistingTitle) return cleanExistingTitle;
  return cleanRequestedTitle || cleanExistingTitle;
}

export function describeWritingBatchAppendStatus({
  scopeLabel = "当前目录观点",
  addedCount = 0,
  totalCount = 0
} = {}) {
  const cleanLabel = String(scopeLabel || "当前目录观点").trim() || "当前目录观点";
  const nextAddedCount = Number(addedCount || 0);
  const nextTotalCount = Number(totalCount || 0);
  if (nextAddedCount > 0) return `已把${cleanLabel}加入相关笔记：${nextAddedCount} 条`;
  if (nextTotalCount > 0) return `${cleanLabel}已都在相关笔记中`;
  return `${cleanLabel}暂时没有可加入的永久笔记`;
}

export function planWritingCandidateFocus({
  candidateNoteIds = [],
  focusedNoteIds = [],
  focusedScopeLabel = "当前图谱切片"
} = {}) {
  const cleanCandidateIds = [...new Set((candidateNoteIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const cleanFocusedIds = [...new Set((focusedNoteIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const cleanScopeLabel = String(focusedScopeLabel || "当前图谱切片").trim() || "当前图谱切片";

  if (!cleanFocusedIds.length) {
    return {
      noteIds: cleanCandidateIds,
      usingFocusedScope: false,
      scopeLabel: "当前目录观点",
      addActionLabel: "加入当前目录笔记"
    };
  }

  const candidateIdSet = new Set(cleanCandidateIds);
  return {
    noteIds: cleanFocusedIds.filter((id) => candidateIdSet.has(id)),
    usingFocusedScope: true,
    scopeLabel: cleanScopeLabel,
    addActionLabel: `加入${cleanScopeLabel}`
  };
}

export function describeWritingMaterialStatus({
  readinessLevel = "",
  readinessStatus = "",
  readinessHint = "",
  hasProject = false,
  projectEntryProjectId = "",
  projectEntryActionLabel = ""
} = {}) {
  const cleanLevel = String(readinessLevel || "").trim();
  const cleanStatus = String(readinessStatus || "").trim();
  const cleanHint = String(readinessHint || "").trim();

  if (!hasProject && cleanLevel === "strong_model_ready") {
    return {
      status: "先确定可写主题",
      hint: "这组笔记已经足够形成一篇文章；先确定可写主题，再继续后续分析。"
    };
  }
  if (hasProject && cleanLevel === "strong_model_ready") {
    return {
      status: "相关笔记就绪",
      hint: "相关笔记已经进入当前主题；可以继续生成文章提纲或准备 AI 写作检查。"
    };
  }
  if (hasProject && cleanLevel === "project_ready") {
    return {
      status: "相关笔记就绪",
      hint: "相关笔记已经进入当前主题；下一步生成文章提纲。"
    };
  }

  return {
    status: cleanStatus,
    hint: cleanHint
  };
}

export function describeWritingStrongModelStatus({
  hasProject = false,
  relationCountsReady = false,
  relationCountsErrored = false,
  readinessLevel = "",
  readinessHint = "",
  projectEntryProjectId = "",
  projectEntryActionLabel = "",
  projectPreflightLevel = "",
  projectPreflightChecksLength = 0,
  strongModelReady = false
} = {}) {
  const cleanReadinessLevel = String(readinessLevel || "").trim();
  const cleanProjectEntryActionLabel = String(projectEntryActionLabel || "").trim();
  const cleanProjectEntryProjectId = String(projectEntryProjectId || "").trim();
  const cleanProjectPreflightLevel = String(projectPreflightLevel || "").trim();
  const cleanReadinessHint = String(readinessHint || "").trim();
  if (relationCountsErrored) {
    return {
      status: "读取失败",
      hint: "正式关系读取失败，先重试或回到笔记里确认关系。",
      buttonLabel: "关系读取失败"
    };
  }
  if (!relationCountsReady) {
    return {
      status: "读取中",
      hint: "正在读取正式关系，等结果回来后再判断是否适合让 AI 辅助写作。",
      buttonLabel: "正在读取关系"
    };
  }
  if (!hasProject && (cleanReadinessLevel === "project_ready" || cleanReadinessLevel === "strong_model_ready")) {
    return {
      status: "先确定可写主题",
      hint:
        cleanReadinessLevel === "strong_model_ready"
          ? "这组笔记已经足够形成一篇文章；先确定可写主题，再继续后续分析。"
          : "这组笔记已经到可写主题阶段；先确定可写主题，再继续准备 AI 写作检查。",
      buttonLabel: "先确定可写主题"
    };
  }
  if (!hasProject && cleanReadinessLevel === "basket_ready") {
    return {
      status: "先补关系/边界",
      hint: "还没到 AI 写作分析时机；先补边界或关系，再继续准备主题。",
      buttonLabel: "先补关系/边界"
    };
  }
  if (!hasProject && cleanReadinessLevel === "needs_distillation") {
    return {
      status: "先确认判断",
      hint: "先把一句话观点和三句话压缩确认下来，再继续准备主题。",
      buttonLabel: "先确认判断/三句话"
    };
  }
  if (!hasProject && (cleanReadinessLevel === "blocked_authorship" || cleanReadinessLevel === "blocked_draft")) {
    return {
      status: "先完成作者/原创确认",
      hint: "先让材料完成作者/原创确认，再继续准备主题。",
      buttonLabel: "先完成作者/原创确认"
    };
  }
  if (hasProject && cleanProjectPreflightLevel !== "ready") {
    if (cleanProjectPreflightLevel === "needs_clarification") {
      return {
        status: "先澄清主题问题",
        hint: "先澄清主题关键问题，再做 AI 写作分析。",
        buttonLabel: "先澄清主题问题"
      };
    }
    if (cleanProjectPreflightLevel === "has_gaps") {
      return {
        status: "先补主题缺口",
        hint: `先补齐这篇文章里的 ${Number(projectPreflightChecksLength || 0)} 项缺口，再做 AI 写作分析。`,
        buttonLabel: "先补主题缺口"
      };
    }
    return {
      status: "先检查主题条件",
      hint: `先确认这篇文章里的 ${Number(projectPreflightChecksLength || 0)} 项条件，再做 AI 写作分析。`,
      buttonLabel: "先检查主题条件"
    };
  }
  if (strongModelReady) {
    return {
      status: "可分析",
      hint: "这组笔记已经适合让 AI 帮你检查结构和缺口。",
      buttonLabel: "准备 AI 写作检查"
    };
  }
  return {
    status: "先补相关笔记",
    hint: cleanReadinessHint || "先补齐相关笔记，再继续准备主题和 AI 写作检查。",
    buttonLabel: "先补相关笔记"
  };
}

export function describeWritingStrongModelIdleSummary({
  basketCount = 0,
  strongModelStateHint = ""
} = {}) {
  if (!basketCount) return "先选择相关笔记，再准备 AI 写作分析。";
  return String(strongModelStateHint || "").trim() || "尚未准备 AI 写作分析。需要你确认后，才会把相关笔记发送给远程模型。";
}

export function describeWritingStrongModelButtonLabel({
  basketCount = 0,
  loading = false,
  stateButtonLabel = ""
} = {}) {
  if (loading) return "准备中...";
  if (!basketCount) return "先选择相关笔记";
  return String(stateButtonLabel || "").trim() || "先补相关笔记";
}

export function writingCenterContinuationStatusMessage(continuation = {}, { sourceLabel = "写作中心", scaffoldLabel = "文章提纲" } = {}) {
  const projectId = String(continuation?.projectId || "").trim();
  const source = String(sourceLabel || "写作中心").trim() || "写作中心";
  const scaffold = String(scaffoldLabel || "文章提纲").trim() || "文章提纲";
  if (!projectId) return "";
  if (continuation?.action === "open-draft") return `已从${source}打开当前草稿：${projectId}`;
  if (continuation?.action === "resume-scaffold") return `已从${source}回到${scaffold}：${projectId}`;
  if (continuation?.action === "resume-project") return `已从${source}继续这个主题：${projectId}`;
  return "";
}

export function writingCenterContinuationFailureMessage(continuation = {}, error = "", { sourceLabel = "写作中心", scaffoldLabel = "文章提纲" } = {}) {
  const detail = String(error?.message || error || "");
  const source = String(sourceLabel || "写作中心").trim() || "写作中心";
  const scaffold = String(scaffoldLabel || "文章提纲").trim() || "文章提纲";
  if (continuation?.action === "open-draft") return `从${source}打开当前草稿失败：${detail}`;
  if (continuation?.action === "resume-scaffold") return `从${source}回到${scaffold}失败：${detail}`;
  return `从${source}继续这个主题失败：${detail}`;
}

export function writingOpenDraftButtonState({ hasDraft = false, draftContinuation = null } = {}) {
  const canContinueProjectedDraft = Boolean(draftContinuation?.projectId) && Boolean(draftContinuation?.actionLabel);
  return {
    disabled: !(hasDraft || canContinueProjectedDraft),
    canContinueProjectedDraft,
    text: hasDraft
      ? "打开当前草稿"
      : draftContinuation?.projectId && draftContinuation?.action === "open-draft"
        ? "打开当前草稿"
        : draftContinuation?.projectId && draftContinuation?.actionLabel
          ? `先${draftContinuation.actionLabel}`
          : "暂无草稿"
  };
}

export function writingScaffoldButtonState({
  hasProject = false,
  projectPreflightLevel = "",
  projectEntry = null
} = {}) {
  const canContinueProjectedProject = Boolean(projectEntry?.projectId) && Boolean(projectEntry?.actionLabel);
  const cleanLevel = String(projectPreflightLevel || "").trim();
  const canGenerateScaffold = Boolean(hasProject) && cleanLevel === "ready";
  return {
    disabled: !(canGenerateScaffold || canContinueProjectedProject),
    canContinueProjectedProject,
    canGenerateScaffold,
    text: hasProject
      ? cleanLevel === "needs_clarification"
        ? "先澄清主题问题"
        : cleanLevel === "has_gaps"
          ? "先补主题缺口"
          : "生成文章提纲"
      : projectEntry?.projectId && projectEntry?.actionLabel
        ? `先${projectEntry.actionLabel}`
        : projectEntry?.actionLabel === "确定可写主题"
          ? "先确定可写主题"
          : projectEntry?.actionLabel || "先补相关笔记"
  };
}

export function writingScaffoldPreflightWarning(projectPreflightSummary = {}) {
  if (projectPreflightSummary?.level === "ready") return "";
  return projectPreflightSummary?.hint ||
    (projectPreflightSummary?.level === "needs_clarification"
      ? "先澄清主题关键问题，再生成文章提纲。"
      : projectPreflightSummary?.level === "has_gaps"
        ? "先补主题缺口，再生成文章提纲。"
        : "先检查主题条件，再生成文章提纲。");
}

export function writingStrongModelButtonState({
  loading = false,
  basketCount = 0,
  strongModelReady = false,
  stateButtonLabel = ""
} = {}) {
  return {
    disabled: Boolean(loading) || Number(basketCount || 0) === 0 || !strongModelReady,
    text: describeWritingStrongModelButtonLabel({
      basketCount,
      loading,
      stateButtonLabel
    })
  };
}

export function describeWritingThemeProjectEntryState({
  notesLoaded = false,
  loadingNoteDetails = false,
  existingProjectId = "",
  existingProjectHasScaffold = false,
  existingProjectHasDraft = false,
  relationCountsReady = false,
  relationCountsErrored = false,
  readinessLevel = "",
  readinessHint = ""
} = {}) {
  if (!notesLoaded || loadingNoteDetails) {
    return {
      level: "loading",
      status: "读取中",
      hint: "正在读取主题里的永久笔记，再判断是否能直接继续写。",
      actionLabel: "正在读取主题",
      canCreateProject: false
    };
  }
  const currentProjectId = String(existingProjectId || "").trim();
  const continuation = currentProjectId
    ? describeWritingContinuationAction({
        existingProjectId: currentProjectId,
        existingProjectHasScaffold,
        existingProjectHasDraft,
        scopeLabel: "当前主题"
      })
    : null;
  if (continuation) {
    return {
      ...continuation,
      level: "current_project",
      canCreateProject: true
    };
  }
  if (currentProjectId) {
    return {
      level: "current_project",
      status: "继续这个主题",
      hint: existingProjectHasDraft
        ? `当前主题已经有草稿。直接回到这篇草稿继续写作会更连续。`
        : existingProjectHasScaffold
          ? `当前主题已经有文章提纲。直接回到这篇提纲继续推进会更连续。`
          : `当前主题已经确定。直接回到这个主题继续推进，会比重新开始更连续。`,
      actionLabel: "继续这个主题",
      canCreateProject: true
    };
  }
  return describeWritingProjectEntryState({
    relationCountsReady,
    relationCountsErrored,
    readinessLevel,
    readinessHint
  });
}
