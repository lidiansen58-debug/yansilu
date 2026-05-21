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

export function describeWritingNextActionFromState({
  basketCount = 0,
  hasProject = false,
  hasScaffold = false,
  hasDraft = false,
  blockingCount = 0,
  warningCount = 0
} = {}) {
  if (!basketCount) {
    return {
      title: "先选材料",
      note: "先把 2-5 条能支撑论证的永久笔记放进写作篮。"
    };
  }
  if (!hasProject) {
    return {
      title: "创建项目",
      note: "确认题目、目标读者和材料后，先创建项目再往下走。"
    };
  }
  if (!hasScaffold) {
    return {
      title: "生成草稿骨架",
      note: "项目已创建，下一步先生成草稿骨架，检查章节、缺口和反方。"
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
      hint: "项目已创建；系统正在判断这个项目还缺什么。"
    };
  }

  const status = String(preflight?.status || "").trim().toLowerCase();
  if (status === "ready") {
    return {
      level: "ready",
      status: "项目条件已齐",
      hint: "项目目标、材料和主题入口已经基本齐备，可以继续生成草稿骨架。"
    };
  }
  if (status === "needs_clarification") {
    const first = clarificationChecks[0] || checks[0] || null;
    return {
      level: "needs_clarification",
      status: "先澄清关键缺口",
      hint: first?.message || "先补齐项目的关键问题，再继续生成草稿骨架。"
    };
  }
  const firstGap = gapChecks[0] || checks[0] || null;
  return {
    level: "has_gaps",
    status: "仍有项目缺口",
    hint: firstGap?.message || `当前项目还有 ${checks.length} 项建议先补齐。`
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
      hint: "显式关系读取失败，先稍后重试或回到笔记里手动确认关系。",
      actionLabel: "关系读取失败",
      canCreateProject: false
    };
  }
  if (!relationCountsReady) {
    return {
      level: "loading",
      status: "读取中",
      hint: "正在读取显式关系，再判断是否能建项目。",
      actionLabel: "正在读取关系",
      canCreateProject: false
    };
  }
  const cleanLevel = String(readinessLevel || "").trim();
  if (cleanLevel === "project_ready" || cleanLevel === "strong_model_ready") {
    return {
      level: "ready",
      status: "先创建项目",
      hint: "当前材料已经到创建项目阶段；接下来明确题目和读者。",
      actionLabel: "创建项目",
      canCreateProject: true
    };
  }
  if (cleanLevel === "basket_ready") {
    return {
      level: "needs_structure",
      status: "待创建",
      hint: "还没到建项目时机；先补边界或关系。",
      actionLabel: "先补条件再建项目",
      canCreateProject: false
    };
  }
  if (cleanLevel === "needs_distillation") {
    return {
      level: "needs_distillation",
      status: "待创建",
      hint: "先把 thesis 和三句话确认下来。",
      actionLabel: "先补条件再建项目",
      canCreateProject: false
    };
  }
  if (cleanLevel === "blocked_authorship" || cleanLevel === "blocked_draft") {
    return {
      level: cleanLevel,
      status: "待创建",
      hint: "先让材料完成作者/原创确认，再进入写作中心。",
      actionLabel: "先补条件再建项目",
      canCreateProject: false
    };
  }
  return {
    level: cleanLevel || "needs_basket",
    status: "待创建",
    hint: String(readinessHint || "").trim() || "先补齐写作材料，再创建项目。",
    actionLabel: "先补条件再建项目",
    canCreateProject: false
  };
}

export function describeWritingProjectStepState({
  basketCount = 0,
  hasProject = false,
  projectId = "",
  projectEntryStatus = "",
  projectEntryHint = "",
  canCreateProject = false
} = {}) {
  if (hasProject) {
    return {
      title: "创建项目",
      note: String(projectId || "").trim() || "已创建项目"
    };
  }
  if (!basketCount) {
    return {
      title: "创建项目",
      note: "先选出能支撑论证的永久笔记，再创建项目。"
    };
  }
  if (!canCreateProject) {
    return {
      title: "创建项目",
      note: String(projectEntryHint || "").trim() || String(projectEntryStatus || "").trim() || "先补齐建项目条件。"
    };
  }
  return {
    title: "创建项目",
    note: "先明确题目和读者，再创建项目"
  };
}

export function describeWritingScaffoldStepState({
  hasScaffold = false,
  blockingCount = 0,
  warningCount = 0
} = {}) {
  if (!hasScaffold) {
    return {
      title: "生成草稿骨架",
      note: "检查证据、缺口和反方"
    };
  }
  if (Number(blockingCount || 0) > 0) {
    return {
      title: "生成草稿骨架",
      note: `先补 ${Number(blockingCount || 0)} 个阻塞项`
    };
  }
  if (Number(warningCount || 0) > 0) {
    return {
      title: "生成草稿骨架",
      note: `可继续，但建议先补 ${Number(warningCount || 0)} 个提醒`
    };
  }
  return {
    title: "生成草稿骨架",
    note: "骨架已生成"
  };
}

export function describeWritingDraftStepState({
  hasDraft = false,
  hasScaffold = false
} = {}) {
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
    note: "生成草稿骨架后再保存"
  };
}

export function describeWritingMaterialStepState({
  basketCount = 0
} = {}) {
  const count = Number(basketCount || 0);
  return {
    title: "选材料",
    note: count > 0 ? `${count} 条永久笔记已在写作篮` : "把 2-5 条永久笔记加入写作篮"
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

export function resolveWritingEntryTitle({
  entryMode = "replace",
  requestedTitle = "",
  existingTitle = ""
} = {}) {
  const cleanRequestedTitle = String(requestedTitle || "").trim();
  const cleanExistingTitle = String(existingTitle || "").trim();
  if (String(entryMode || "").trim() === "append" && cleanExistingTitle) return cleanExistingTitle;
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
  if (nextAddedCount > 0) return `已把${cleanLabel}加入写作篮：${nextAddedCount} 条`;
  if (nextTotalCount > 0) return `${cleanLabel}已都在写作篮中`;
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
      addActionLabel: "把当前目录观点加入写作篮"
    };
  }

  const candidateIdSet = new Set(cleanCandidateIds);
  return {
    noteIds: cleanFocusedIds.filter((id) => candidateIdSet.has(id)),
    usingFocusedScope: true,
    scopeLabel: cleanScopeLabel,
    addActionLabel: `把${cleanScopeLabel}加入写作篮`
  };
}

export function describeWritingMaterialStatus({
  readinessLevel = "",
  readinessStatus = "",
  readinessHint = "",
  hasProject = false
} = {}) {
  const cleanLevel = String(readinessLevel || "").trim();
  const cleanStatus = String(readinessStatus || "").trim();
  const cleanHint = String(readinessHint || "").trim();

  if (!hasProject && cleanLevel === "strong_model_ready") {
    return {
      status: "先创建项目",
      hint: "当前材料已经到强模型分析前的就绪阶段；先创建项目，再继续后续分析。"
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
  projectPreflightLevel = "",
  projectPreflightChecksLength = 0,
  strongModelReady = false
} = {}) {
  if (relationCountsErrored) {
    return {
      status: "读取失败",
      hint: "显式关系读取失败，先重试或回到笔记里确认关系。",
      buttonLabel: "关系读取失败"
    };
  }
  if (!relationCountsReady) {
    return {
      status: "读取中",
      hint: "正在读取显式关系，等结果回来后再判断是否能进入强模型分析。",
      buttonLabel: "正在读取关系"
    };
  }
  if (!hasProject && String(readinessLevel || "").trim() === "strong_model_ready") {
    return {
      status: "先创建项目",
      hint: "当前材料已经到强模型分析前的就绪阶段；先创建项目，再继续后续分析。",
      buttonLabel: "先创建项目"
    };
  }
  if (hasProject && String(projectPreflightLevel || "").trim() !== "ready") {
    return {
      status: "先补条件",
      hint: `先处理项目预检里的 ${Number(projectPreflightChecksLength || 0)} 项缺口，再做强模型分析。`,
      buttonLabel: "先补条件"
    };
  }
  if (strongModelReady) {
    return {
      status: "可分析",
      hint: "当前材料已经适合进入强模型分析。",
      buttonLabel: "准备强模型分析"
    };
  }
  if (String(readinessLevel || "").trim() === "project_ready") {
    return {
      status: "先补条件",
      hint: "先补更多主题线索，再做强模型分析。",
      buttonLabel: "先补条件"
    };
  }
  return {
    status: "先补条件",
    hint: String(readinessHint || "").trim(),
    buttonLabel: "先补条件"
  };
}

export function describeWritingStrongModelIdleSummary({
  basketCount = 0,
  strongModelStateHint = ""
} = {}) {
  if (!basketCount) return "先把永久笔记加入写作篮，再准备强模型分析。";
  return String(strongModelStateHint || "").trim() || "尚未准备强模型分析。需要你确认后，才会把写作篮发送给远程强模型。";
}

export function describeWritingStrongModelButtonLabel({
  basketCount = 0,
  loading = false,
  stateButtonLabel = ""
} = {}) {
  if (loading) return "准备中...";
  if (!basketCount) return "先加入写作篮";
  return String(stateButtonLabel || "").trim() || "先补条件";
}

export function describeWritingThemeProjectEntryState({
  notesLoaded = false,
  loadingNoteDetails = false,
  relationCountsReady = false,
  relationCountsErrored = false,
  readinessLevel = "",
  readinessHint = ""
} = {}) {
  if (!notesLoaded || loadingNoteDetails) {
    return {
      level: "loading",
      status: "读取中",
      hint: "正在读取主题里的永久笔记，再判断是否能直接创建项目。",
      actionLabel: "正在读取主题",
      canCreateProject: false
    };
  }
  return describeWritingProjectEntryState({
    relationCountsReady,
    relationCountsErrored,
    readinessLevel,
    readinessHint
  });
}
