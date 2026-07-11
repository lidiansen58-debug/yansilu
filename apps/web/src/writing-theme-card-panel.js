export function renderWritingThemeIndexCardDom(deps = {}, indexCard) {
  const {
    writingState,
    writingThemeIndexNoteIds,
    findExistingWritingProjectForTheme,
    describeWritingContinuationAction,
    escapeHtml
  } = deps;
  const noteIds = writingThemeIndexNoteIds(indexCard);
  const noteCount = Number(indexCard?.note_count || indexCard?.items?.length || 0);
  const existingProject = findExistingWritingProjectForTheme(indexCard, noteIds);
  const themeContinuation = describeWritingContinuationAction({
    existingProjectId: existingProject?.id || "",
    existingProjectHasScaffold: Boolean(existingProject?.scaffold_id),
    existingProjectHasDraft: Boolean(existingProject?.draft_note_id),
    scopeLabel: "当前主题"
  });
  const centralQuestion = String(indexCard?.central_question || indexCard?.centralQuestion || indexCard?.summary || "").trim();
  const actionLabel = themeContinuation?.projectId
    ? existingProject?.draft_note_id
      ? "继续草稿"
      : existingProject?.scaffold_id
        ? "继续提纲"
        : "继续写"
    : "开始写";
  const actionAttrs = themeContinuation?.projectId
    ? `data-writing-index-action="${escapeHtml(themeContinuation?.action || "resume-project")}" data-writing-project-id="${escapeHtml(themeContinuation.projectId)}"`
    : `data-writing-index-action="use" data-writing-index-id="${escapeHtml(indexCard.id)}"`;
  return `
    <article class="writing-start-topic ${writingState.sourceIndexIds.includes(indexCard.id) || writingState.selectedThemeIndexId === indexCard.id ? "selected" : ""}" data-writing-index-card-id="${escapeHtml(indexCard.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(indexCard.title || indexCard.id)}</div>
          <div class="writing-note-meta">相关笔记 ${escapeHtml(noteCount)} 条</div>
        </div>
        <button class="mini-btn primary" type="button" ${actionAttrs}>${escapeHtml(actionLabel)}</button>
      </div>
      <div class="writing-start-topic-question">${escapeHtml(centralQuestion || "先用这组笔记生成提纲，再进入草稿。")}</div>
    </article>
  `;
}

function writingThemeWorthWritingText({ noteCount = 0, readiness = {}, projectEntry = {} } = {}) {
  const count = Number(noteCount || 0);
  const countText = count > 0 ? `这组主题已经聚合 ${count} 条永久笔记` : "这组主题已经聚合一组永久笔记";
  const readinessLevel = String(readiness?.level || "").trim();
  const readinessHint = String(projectEntry?.hint || readiness?.hint || "").trim();
  const nextStep = String(projectEntry?.actionLabel || readiness?.actionLabel || "").trim() || "先确定写作问题";
  const readyToWrite = ["project_ready", "strong_model_ready"].includes(readinessLevel) || Boolean(projectEntry?.canCreateProject);
  if (!readyToWrite) {
    return `${countText}，但现在更适合继续整理。它值得继续推进，是因为这些判断可能在回答同一个问题；下一步：${nextStep}。${readinessHint}`;
  }
  return `${countText}，并且已经有共同问题和关系理由。它值得写，不是因为笔记数量多，而是因为这些判断能互相说明。下一步：${nextStep}。${readinessHint}`;
}

export function renderWritingThemeDetailDom(deps = {}, indexCard) {
  const {
    escapeHtml
  } = deps;
  if (!indexCard?.id) {
    return "";
  }
  const summaryLines = [0, 1, 2].map((idx) => String((indexCard.three_line_summary || indexCard.threeLineSummary || [])[idx] || "").trim());
  const centralQuestion = String(indexCard.central_question || indexCard.centralQuestion || "").trim();
  return `
    <div class="writing-theme-hidden-fields" hidden>
      <input id="writingThemeDetailTitle" value="${escapeHtml(indexCard.title || "")}" />
      <textarea id="writingThemeDetailSummary">${escapeHtml(indexCard.summary || "")}</textarea>
      <textarea id="writingThemeDetailThesis">${escapeHtml(indexCard.thesis || "")}</textarea>
      <textarea id="writingThemeDetailSummary1">${escapeHtml(summaryLines[0])}</textarea>
      <textarea id="writingThemeDetailSummary2">${escapeHtml(summaryLines[1])}</textarea>
      <textarea id="writingThemeDetailSummary3">${escapeHtml(summaryLines[2])}</textarea>
      <textarea id="writingThemeDetailCentralQuestion">${escapeHtml(centralQuestion)}</textarea>
    </div>
  `;
}
