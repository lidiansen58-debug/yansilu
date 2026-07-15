import {
  normalizeWritingOutlineSections
} from "./writing-workbench-model.js";

export function renderWritingScaffoldPreviewDom(deps = {}) {
  const {
    $,
    writingState,
    escapeHtml
  } = deps;
  const el = $("writingScaffoldPreview");
  if (!el) return;

  if (!writingState.scaffold) {
    el.innerHTML = `<div class="writing-empty">先回到主题页生成提纲。</div>`;
    return;
  }

  const sections = normalizeWritingOutlineSections(writingState.scaffold);
  el.innerHTML = sections.length
    ? `<div class="writing-outline-section-list">${sections
        .map((section, index) => `
          <article class="writing-outline-section" data-writing-outline-index="${escapeHtml(index)}">
            <div class="writing-outline-section-head">
              <span>${escapeHtml(index + 1)}</span>
              <input data-writing-outline-field="heading" data-writing-outline-index="${escapeHtml(index)}" value="${escapeHtml(section.heading)}" aria-label="章节标题" />
              <div class="writing-outline-section-actions">
                <button class="mini-btn icon-btn" type="button" data-writing-outline-action="up" data-writing-outline-index="${escapeHtml(index)}" aria-label="上移" title="上移">↑</button>
                <button class="mini-btn icon-btn" type="button" data-writing-outline-action="down" data-writing-outline-index="${escapeHtml(index)}" aria-label="下移" title="下移">↓</button>
                <button class="mini-btn icon-btn" type="button" data-writing-outline-action="add" data-writing-outline-index="${escapeHtml(index)}" aria-label="添加章节" title="添加章节">＋</button>
                <button class="mini-btn icon-btn" type="button" data-writing-outline-action="delete" data-writing-outline-index="${escapeHtml(index)}" aria-label="删除章节" title="删除章节">×</button>
              </div>
            </div>
            <textarea data-writing-outline-field="purpose" data-writing-outline-index="${escapeHtml(index)}" rows="3" aria-label="章节要点" placeholder="这一节要说明什么？">${escapeHtml(section.purpose)}</textarea>
          </article>
        `)
        .join("")}</div>`
    : `<div class="writing-empty">还没有章节。</div><button class="mini-btn" type="button" data-writing-outline-action="add" data-writing-outline-index="0">添加第一节</button>`;
}
