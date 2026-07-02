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
          <div class="writing-note-meta">${escapeHtml(indexCard.id)} · ${escapeHtml(indexCard.index_type || "topic")} · 条目 ${escapeHtml(noteCount)}</div>
        </div>
        ${thinkingBadge}
      </div>
      <div class="writing-note-meta">${escapeHtml(indexCard.summary || "把一组成熟永久笔记当成后续可续接的写作入口。")}</div>
      <div class="writing-note-meta">${escapeHtml(directoryLabel)}${preview ? ` · 例如：${escapeHtml(preview)}${noteCount > itemTitles.length ? " 等" : ""}` : ""}</div>
      ${
        existingProject?.id
          ? `<div class="writing-note-meta">当前主题：${escapeHtml(existingProject.id)}${existingProject.draft_note_id ? " · 已有草稿" : existingProject.scaffold_id ? " · 已有文章提纲" : ""}</div>`
          : ""
      }
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-index-action="use" data-writing-index-id="${escapeHtml(indexCard.id)}">把整组作为相关笔记</button>
        ${
          themeContinuation?.projectId
            ? `<button class="mini-btn" type="button" data-writing-index-action="${escapeHtml(themeContinuation?.action || "resume-project")}" data-writing-project-id="${escapeHtml(themeContinuation.projectId)}">${escapeHtml(themeContinuation?.actionLabel || "继续当前主题")}</button>`
            : ""
        }
      </div>
    </article>
  `;
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
        先从左侧可写主题列表里选一张卡，或先把当前相关笔记保存成可写主题。这里会显示中心问题、主题压缩和关联笔记。
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
        <button class="mini-btn" type="button" data-writing-theme-action="use" data-writing-theme-id="${themeId}">把整组作为相关笔记</button>
        <button class="mini-btn primary" type="button" data-writing-theme-action="${escapeHtml(primaryThemeAction)}" data-writing-theme-id="${themeId}" data-writing-project-id="${escapeHtml(primaryThemeProjectId)}" ${projectEntry.canCreateProject ? "" : "disabled"}>${escapeHtml(projectEntry.actionLabel)}</button>
      </div>
      <div class="writing-summary" style="margin-top:12px;">
        这个可写主题应该把一组永久笔记压缩成可复用的中心问题、主题判断和可续接的写作中心入口。详情里仍会保留主题索引笔记，方便追溯。
      </div>
      <div class="writing-summary" style="margin-top:12px;" data-writing-theme-project-summary="${themeId}">
        写作状态：${escapeHtml(projectEntry.status)}。${escapeHtml(projectEntry.hint || readiness.hint || "先补齐条件，再从主题继续写。")}
      </div>
      <div class="import-grid" style="margin-top:12px;">
        <label for="writingThemeDetailTitle">主题标题</label>
        <input id="writingThemeDetailTitle" value="${escapeHtml(indexCard.title || "")}" />

        <label for="writingThemeDetailSummary">主题摘要</label>
        <textarea id="writingThemeDetailSummary" rows="3" placeholder="这组永久笔记现在共同在讨论什么？">${escapeHtml(indexCard.summary || "")}</textarea>

        <label for="writingThemeDetailThesis">主题一句话判断</label>
        <textarea id="writingThemeDetailThesis" rows="3" placeholder="这个主题真正想成立的判断是什么？">${escapeHtml(indexCard.thesis || "")}</textarea>

        <label for="writingThemeDetailSummary1">三句话压缩 1</label>
        <textarea id="writingThemeDetailSummary1" rows="2" placeholder="这组主题在说什么？">${escapeHtml(summaryLines[0])}</textarea>

        <label for="writingThemeDetailSummary2">三句话压缩 2</label>
        <textarea id="writingThemeDetailSummary2" rows="2" placeholder="为什么它重要？">${escapeHtml(summaryLines[1])}</textarea>

        <label for="writingThemeDetailSummary3">三句话压缩 3</label>
        <textarea id="writingThemeDetailSummary3" rows="2" placeholder="它会把写作推进到哪里？">${escapeHtml(summaryLines[2])}</textarea>

        <label for="writingThemeDetailCentralQuestion">中心问题</label>
        <textarea id="writingThemeDetailCentralQuestion" rows="3" placeholder="这组笔记真正围绕哪个中心问题组织？">${escapeHtml(indexCard.central_question || indexCard.centralQuestion || "")}</textarea>
      </div>
      <div class="writing-note-actions" style="margin-top:12px;">
        <button class="mini-btn primary" type="button" data-writing-theme-action="save" data-writing-theme-id="${themeId}">保存主题</button>
        <button class="mini-btn" type="button" data-writing-theme-action="replace-from-basket" data-writing-theme-id="${themeId}">用当前相关笔记覆盖</button>
        <button class="mini-btn" type="button" data-writing-theme-action="append-from-basket" data-writing-theme-id="${themeId}">追加当前相关笔记</button>
      </div>
      <div style="margin-top:12px;">
        <h4>主题内的永久笔记</h4>
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
            : `<div class="writing-empty">这个可写主题还没有挂上永久笔记。</div>`
        }
      </div>
    </section>
  `;
}
