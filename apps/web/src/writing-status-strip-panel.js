import {
  renderWritingStatusCardView
} from "./writing-workspace-view.js";

export function renderWritingStatusStripDom(deps = {}) {
  const {
    $,
    writingState,
    parseWritingBasketIds,
    currentWritingBasketEligibility,
    writingRelationCountsReady,
    writingRelationCountsErrored,
    deriveBasketWritingReadiness,
    writingKnownNoteById,
    describeWritingProjectPreflight,
    describeWritingProjectEntryState,
    describeWritingMaterialStatus,
    writingIneligibleSummary,
    isWritingStrongModelReady,
    describeWritingStrongModelStatus,
    escapeHtml
  } = deps;
  const renderWritingStatusCard = (label, value, note, tone = "") => renderWritingStatusCardView(label, value, note, tone, { escapeHtml });
  const el = $("writingStatusStrip");
  if (!el) return;
  const basketIds = parseWritingBasketIds();
  const eligibility = currentWritingBasketEligibility();
  const relationCounts = writingState.relationCounts || {};
  const relationCountErrors = writingState.relationCountErrors || {};
  const relationCountsReady = writingRelationCountsReady(basketIds, relationCounts) && !writingState.loadingRelationCounts;
  const relationCountsErrored = writingRelationCountsErrored(basketIds, relationCountErrors);
  const relationState = relationCountsErrored ? "error" : relationCountsReady ? "loaded" : "loading";
  const readiness = deriveBasketWritingReadiness(basketIds, writingKnownNoteById, relationCounts, { relationState });
  const hasProject = Boolean(writingState.project?.id);
  const hasScaffold = Boolean(writingState.scaffold?.id || writingState.project?.scaffold_id);
  const hasDraft = Boolean(writingState.project?.draft_note_id);
  const projectPreflight = writingState.project?.preflight || null;
  const projectPreflightSummary = describeWritingProjectPreflight(projectPreflight);
  const projectPreflightChecks = Array.isArray(projectPreflight?.checks) ? projectPreflight.checks : [];
  const basketTone =
    readiness.level === "strong_model_ready" || readiness.level === "project_ready"
      ? "good"
      : readiness.level === "basket_ready"
        ? "warn"
        : readiness.level === "needs_basket"
          ? "warn"
          : "warn";
  const projectEntry = describeWritingProjectEntryState({
    relationCountsReady,
    relationCountsErrored,
    readinessLevel: readiness.level,
    readinessHint: readiness.hint
  });
  const materialStatus = describeWritingMaterialStatus({
    readinessLevel: readiness.level,
    readinessStatus: readiness.status,
    readinessHint: readiness.hint,
    hasProject,
    projectEntryProjectId: hasProject ? "" : String(projectEntry?.projectId || "").trim(),
    projectEntryActionLabel: hasProject ? "" : String(projectEntry?.actionLabel || "").trim()
  });
  const basketNote = materialStatus.hint || (eligibility.ineligible.length ? writingIneligibleSummary(eligibility.ineligible) : "从永久笔记开始");
  const canContinueProjectedProjectStatus = !hasProject && Boolean(projectEntry?.projectId) && Boolean(projectEntry?.actionLabel);
  const projectTone =
    hasProject && projectPreflightSummary.level !== "ready"
      ? "warn"
      : hasProject || canContinueProjectedProjectStatus || readiness.level === "project_ready" || readiness.level === "strong_model_ready"
        ? "good"
        : "warn";
  const projectStatus = hasProject
    ? projectPreflightSummary.level === "needs_clarification"
      ? "先澄清项目问题"
      : projectPreflightSummary.level === "has_gaps"
        ? "先补项目缺口"
        : "已创建"
    : projectEntry.status;
  const projectNote = hasProject
    ? projectPreflightSummary.level !== "ready"
      ? `${writingState.project.id}；${projectPreflightSummary.hint}`
      : writingState.project.id
    : projectEntry.hint;
  const scaffoldNote = hasScaffold
    ? "章节、证据、缺口已返回"
    : hasProject && projectPreflightSummary.level === "needs_clarification"
      ? projectPreflightSummary.hint || "先澄清项目关键问题，再生成草稿骨架。"
      : hasProject && projectPreflightSummary.level === "has_gaps"
        ? projectPreflightSummary.hint || "先补项目缺口，再生成草稿骨架。"
        : hasProject
          ? "项目条件已齐；下一步生成草稿骨架，检查证据、缺口和反方。"
    : !hasProject && projectEntry?.projectId && projectEntry?.action === "open-draft"
      ? "当前草稿已经存在。先打开当前草稿继续写作。"
      : !hasProject && projectEntry?.projectId && projectEntry?.action === "resume-scaffold"
        ? "先回到草稿骨架，再检查证据、缺口和开放问题。"
        : !hasProject && projectEntry?.projectId && projectEntry?.actionLabel
          ? `先${projectEntry.actionLabel}，再生成草稿骨架`
          : projectEntry.hint;
  const scaffoldStatus = hasScaffold
    ? "可预览"
    : hasProject && projectPreflightSummary.level === "needs_clarification"
      ? "先澄清项目问题"
      : hasProject && projectPreflightSummary.level === "has_gaps"
        ? "先补项目缺口"
        : hasProject
          ? "可生成"
    : !hasProject && projectEntry?.projectId && projectEntry?.action === "open-draft"
      ? "先打开当前草稿"
      : !hasProject && projectEntry?.projectId && projectEntry?.action === "resume-scaffold"
        ? "先回到草稿骨架"
        : !hasProject && projectEntry?.projectId && projectEntry?.actionLabel
          ? `先${projectEntry.actionLabel}`
          : projectEntry.status;
  const scaffoldTone =
    hasScaffold
      ? "good"
      : hasProject && projectPreflightSummary.level !== "ready"
        ? "warn"
        : (!hasProject &&
      projectEntry?.projectId &&
      (projectEntry?.action === "open-draft" || projectEntry?.action === "resume-scaffold" || projectEntry?.action === "resume-project"))
      ? "good"
      : "";
  const draftStatus = hasDraft
    ? "已绑定"
    : hasProject && hasScaffold && projectPreflightSummary.level === "needs_clarification"
      ? "先澄清项目问题"
      : hasProject && hasScaffold && projectPreflightSummary.level === "has_gaps"
        ? "先补项目缺口"
        : hasProject && hasScaffold
          ? "可保存"
          : hasProject
            ? "先生成草稿骨架"
    : !hasProject && projectEntry?.projectId && projectEntry?.action === "open-draft"
      ? projectEntry.status
      : !hasProject && projectEntry?.projectId && projectEntry?.action === "resume-scaffold"
        ? projectEntry.status
        : !hasProject && projectEntry?.projectId && projectEntry?.action === "resume-project"
          ? projectEntry.status
          : projectEntry.status;
  const draftNote = hasDraft
    ? writingState.project?.draft_note?.title || writingState.project.draft_note_id
    : hasProject && hasScaffold && projectPreflightSummary.level === "needs_clarification"
      ? projectPreflightSummary.hint || "先澄清项目关键问题，再保存草稿。"
      : hasProject && hasScaffold && projectPreflightSummary.level === "has_gaps"
        ? projectPreflightSummary.hint || "先补项目缺口，再保存草稿。"
        : hasProject && hasScaffold
          ? "草稿骨架已生成；确认缺口和反方后保存草稿。"
          : hasProject
            ? "先生成草稿骨架，再保存草稿。"
    : !hasProject && projectEntry?.projectId && projectEntry?.action === "open-draft"
      ? projectEntry.hint
      : !hasProject && projectEntry?.projectId && projectEntry?.action === "resume-scaffold"
        ? "当前草稿骨架已经存在。先回到草稿骨架，再继续保存草稿。"
        : !hasProject && projectEntry?.projectId && projectEntry?.action === "resume-project"
          ? "当前项目已经存在。先继续当前项目，再生成草稿骨架并保存草稿。"
          : projectEntry.hint;
  const draftTone =
    hasDraft
      ? "good"
      : hasProject && hasScaffold && projectPreflightSummary.level !== "ready"
        ? "warn"
        : (!hasProject &&
      projectEntry?.projectId &&
      (projectEntry?.action === "open-draft" || projectEntry?.action === "resume-scaffold" || projectEntry?.action === "resume-project"))
      ? "good"
      : "";
  const strongModelReady = isWritingStrongModelReady({
    readinessLevel: readiness.level,
    projectPreflightLevel: projectPreflightSummary.level
  });
  const strongModelState = describeWritingStrongModelStatus({
    hasProject,
    relationCountsReady,
    relationCountsErrored,
    readinessLevel: readiness.level,
    readinessHint: readiness.hint,
    projectEntryProjectId: hasProject ? "" : String(projectEntry?.projectId || "").trim(),
    projectEntryActionLabel: hasProject ? "" : String(projectEntry?.actionLabel || "").trim(),
    projectPreflightLevel: projectPreflightSummary.level,
    projectPreflightChecksLength: projectPreflightChecks.length,
    strongModelReady
  });
  const strongModelTone = strongModelReady ? "good" : "warn";
  el.innerHTML = [
    renderWritingStatusCard("材料", materialStatus.status, basketNote, basketTone),
    renderWritingStatusCard("项目", projectStatus, projectNote, projectTone),
    renderWritingStatusCard("草稿骨架", scaffoldStatus, scaffoldNote, scaffoldTone),
    renderWritingStatusCard("强模型", strongModelState.status, strongModelState.hint, strongModelTone),
    renderWritingStatusCard("草稿", draftStatus, draftNote, draftTone)
  ].join("");
}
