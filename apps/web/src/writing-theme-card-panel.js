export function renderWritingThemeIndexCardDom(deps = {}, indexCard) {
  const {
    writingState,
    writingThemeIndexNoteIds,
    findExistingWritingProjectForTheme,
    describeWritingContinuationAction,
    renderThinkingStatusBadge,
    escapeHtml
  } = deps;
  const itemTitles = (Array.isArray(indexCard?.items) ? indexCard.items : [])
    .map((item) => item?.note?.title || item?.short_label || item?.note_id)
    .filter(Boolean)
    .slice(0, 3);
  const preview = itemTitles.join("、");
  const noteIds = writingThemeIndexNoteIds(indexCard);
  const noteCount = Number(indexCard?.note_count || indexCard?.items?.length || 0);
  const directoryLabel = indexCard?.directory_title || indexCard?.directory_id || "";
  const existingProject = findExistingWritingProjectForTheme(indexCard, noteIds);
  const themeContinuation = describeWritingContinuationAction({
    existingProjectId: existingProject?.id || "",
    existingProjectHasScaffold: Boolean(existingProject?.scaffold_id),
    existingProjectHasDraft: Boolean(existingProject?.draft_note_id),
    scopeLabel: "当前主题"
  });
  const thinkingBadge = renderThinkingStatusBadge(indexCard?.thinkingStatus, "thinking-status-badge writing-thinking-status");
  return `
    <article class="writing-note-card ${writingState.sourceIndexIds.includes(indexCard.id) || writingState.selectedThemeIndexId === indexCard.id ? "selected" : ""}" data-writing-index-card-id="${escapeHtml(indexCard.id)}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(indexCard.title || indexCard.id)}</div>
          <div class="writing-note-meta">可写主题 · 相关笔记 ${escapeHtml(noteCount)}</div>
        </div>
        ${thinkingBadge}
      </div>
      <div class="writing-note-meta">为什么可写：${escapeHtml(indexCard.summary || "这组永久笔记已经能指向一个可继续展开的问题。")}</div>
      <div class="writing-note-meta">相关笔记：${preview ? `${escapeHtml(preview)}${noteCount > itemTitles.length ? " 等" : ""}` : escapeHtml(directoryLabel || "等待补充")}</div>
      <div class="writing-note-meta">建议提纲入口：${escapeHtml(indexCard.central_question || indexCard.centralQuestion || "先把这组笔记整理成一个中心问题。")}</div>
      ${
        existingProject?.id
          ? `<div class="writing-note-meta">继续状态：${existingProject.draft_note_id ? "已有草稿" : existingProject.scaffold_id ? "已有文章提纲" : "主题已确定"}</div>`
          : ""
      }
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-index-action="use" data-writing-index-id="${escapeHtml(indexCard.id)}">查看这些笔记</button>
        ${
          themeContinuation?.projectId
            ? `<button class="mini-btn" type="button" data-writing-index-action="${escapeHtml(themeContinuation?.action || "resume-project")}" data-writing-project-id="${escapeHtml(themeContinuation.projectId)}">${escapeHtml(themeContinuation?.actionLabel || "继续当前主题")}</button>`
            : ""
        }
      </div>
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
    writingThemeProjectEntry,
    writingKnownNoteById,
    renderThinkingStatusBadge,
    escapeHtml
  } = deps;
  if (!indexCard?.id) {
    return `
      <div class="writing-empty">
        先从左侧可写主题里选一组笔记，或把当前相关笔记保存成写作主题。这里会显示这组笔记在说什么、为什么值得写，以及下一步先写什么提纲。
      </div>
    `;
  }

  const { noteIds: itemIds, readiness, projectEntry } = writingThemeProjectEntry(indexCard);
  const items = itemIds.map((noteId) => {
    const item = (Array.isArray(indexCard.items) ? indexCard.items : []).find((entry) => entry?.note_id === noteId) || null;
    const note = writingKnownNoteById(noteId) || item?.note || null;
    return {
      noteId,
      note,
      shortLabel: String(item?.short_label || note?.title || noteId).trim(),
      rationale: String(item?.rationale || "").trim()
    };
  });

  const summaryLines = [0, 1, 2].map((idx) => String((indexCard.three_line_summary || indexCard.threeLineSummary || [])[idx] || "").trim());
  const noteCount = Number(indexCard.note_count || items.length || 0);
  const themeId = escapeHtml(indexCard.id);
  const thinkingBadge = renderThinkingStatusBadge(indexCard.thinkingStatus, "thinking-status-badge writing-thinking-status");
  const primaryThemeAction = String(projectEntry.action || "create-project").trim() || "create-project";
  const primaryThemeProjectId = String(projectEntry.projectId || "").trim();
  const worthWritingText = writingThemeWorthWritingText({ noteCount, readiness, projectEntry });

  return `
    <section class="writing-theme-detail-card" data-writing-theme-id="${themeId}">
      <div class="writing-theme-detail-head">
        <div>
          <div class="writing-note-title">${escapeHtml(indexCard.title || indexCard.id)}</div>
          <div class="writing-note-meta">${escapeHtml(indexCard.id)} · 条目 ${escapeHtml(noteCount)} · ${escapeHtml(indexCard.index_type || "topic")}</div>
        </div>
        ${thinkingBadge}
      </div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-theme-action="use" data-writing-theme-id="${themeId}">查看相关笔记</button>
        <button class="mini-btn primary" type="button" data-writing-theme-action="${escapeHtml(primaryThemeAction)}" data-writing-theme-id="${themeId}" data-writing-project-id="${escapeHtml(primaryThemeProjectId)}" ${projectEntry.canCreateProject ? "" : "disabled"}>${escapeHtml(projectEntry.actionLabel)}</button>
      </div>
      <div class="writing-summary" style="margin-top:12px;">
        写作助手会先帮你看三件事：这组笔记为什么值得写、会用到哪些永久笔记、下一步先生成哪份文章提纲。
      </div>
      <div class="writing-summary" style="margin-top:12px;" data-writing-theme-worth-writing="${themeId}">
        为什么这组笔记值得写：${escapeHtml(worthWritingText)}
      </div>
      <div class="writing-summary" style="margin-top:12px;" data-writing-theme-outline-entry="${themeId}">
        先写什么提纲：${escapeHtml(summaryLines[2] || indexCard.central_question || indexCard.centralQuestion || projectEntry.actionLabel || "先从这组笔记整理出一份短提纲。")}
      </div>
      <div class="writing-summary" style="margin-top:12px;" data-writing-theme-project-summary="${themeId}">
        下一步：${escapeHtml(projectEntry.status)}。${escapeHtml(projectEntry.hint || readiness.hint || "先补齐条件，再从主题继续写。")}
      </div>
      <div class="import-grid" style="margin-top:12px;">
        <label for="writingThemeDetailTitle">主题标题</label>
        <input id="writingThemeDetailTitle" value="${escapeHtml(indexCard.title || "")}" />

        <label for="writingThemeDetailSummary">这组笔记在说什么</label>
        <textarea id="writingThemeDetailSummary" rows="3" placeholder="这组永久笔记现在共同在讨论什么？">${escapeHtml(indexCard.summary || "")}</textarea>

        <label for="writingThemeDetailThesis">这篇文章想成立的判断</label>
        <textarea id="writingThemeDetailThesis" rows="3" placeholder="这个主题真正想成立的判断是什么？">${escapeHtml(indexCard.thesis || "")}</textarea>

        <label for="writingThemeDetailSummary1">这组笔记在说什么</label>
        <textarea id="writingThemeDetailSummary1" rows="2" placeholder="这组主题在说什么？">${escapeHtml(summaryLines[0])}</textarea>

        <label for="writingThemeDetailSummary2">为什么值得写</label>
        <textarea id="writingThemeDetailSummary2" rows="2" placeholder="为什么它重要？">${escapeHtml(summaryLines[1])}</textarea>

        <label for="writingThemeDetailSummary3">下一步可以写什么</label>
        <textarea id="writingThemeDetailSummary3" rows="2" placeholder="从这个主题索引进入写作中心后，先写哪一段或哪一个小提纲？">${escapeHtml(summaryLines[2])}</textarea>

        <label for="writingThemeDetailCentralQuestion">中心问题</label>
        <textarea id="writingThemeDetailCentralQuestion" rows="3" placeholder="这组笔记真正围绕哪个中心问题组织？">${escapeHtml(indexCard.central_question || indexCard.centralQuestion || "")}</textarea>
      </div>
      <div class="writing-note-actions" style="margin-top:12px;">
        <button class="mini-btn primary" type="button" data-writing-theme-action="save" data-writing-theme-id="${themeId}">保存这个写作主题</button>
        <button class="mini-btn" type="button" data-writing-theme-action="replace-from-basket" data-writing-theme-id="${themeId}">改用当前相关笔记</button>
        <button class="mini-btn" type="button" data-writing-theme-action="append-from-basket" data-writing-theme-id="${themeId}">加入当前相关笔记</button>
      </div>
      <div style="margin-top:12px;">
        <h4>会用到的永久笔记</h4>
        ${
          items.length
            ? `<div class="writing-note-list">${items
                .map(
                  (item) => `
                    <article class="writing-note-card">
                      <div class="writing-note-card-head">
                        <div>
                          <div class="writing-note-title">${escapeHtml(item.note?.title || item.shortLabel || item.noteId)}</div>
                          <div class="writing-note-meta">${escapeHtml(item.noteId)}</div>
                        </div>
                      </div>
                      ${item.rationale ? `<div class="writing-note-meta">${escapeHtml(item.rationale)}</div>` : ""}
                      <div class="writing-note-actions">
                        <button class="mini-btn" type="button" data-writing-theme-action="open-note" data-writing-theme-id="${themeId}" data-writing-note-id="${escapeHtml(item.noteId)}">打开笔记</button>
                        <button class="mini-btn" type="button" data-writing-theme-action="remove-note" data-writing-theme-id="${themeId}" data-writing-note-id="${escapeHtml(item.noteId)}">移出主题</button>
                      </div>
                    </article>
                  `
                )
                .join("")}</div>`
            : `<div class="writing-empty">这个主题索引还没有挂上永久笔记。</div>`
        }
      </div>
    </section>
  `;
}
