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
