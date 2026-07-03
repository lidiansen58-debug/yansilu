function escape(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dataAttrs(item = {}) {
  return [
    ["data-today-action", item.action],
    ["data-review-type", item.type],
    ["data-review-note-id", item.noteId],
    ["data-review-target-note-id", item.targetNoteId],
    ["data-review-theme-id", item.themeId],
    ["data-review-note-ids", Array.isArray(item.noteIds) ? item.noteIds.join(",") : ""],
    ["data-review-tag", item.tag]
  ]
    .filter(([, value]) => String(value || "").trim())
    .map(([key, value]) => `${key}="${escape(value)}"`)
    .join(" ");
}

function renderItem(item = {}) {
  return `
    <article class="today-action-card tone-${escape(item.type || "review")}">
      <div>
        <span class="today-action-kicker">${escape(item.title)}</span>
        <strong>${escape(item.objectTitle || "待回顾项目")}</strong>
        <p>${escape(item.summary)}</p>
        ${item.aiSuggestion ? `<p>AI 补充：${escape(item.aiSuggestion)}</p>` : ""}
        ${item.meta ? `<small>${escape(item.meta)}</small>` : ""}
      </div>
      <button class="mini-btn primary" type="button" ${dataAttrs(item)}>
        ${escape(item.actionLabel || "处理")}
      </button>
    </article>
  `;
}

export function renderReviewChecklistPanel(checklist = {}) {
  const items = Array.isArray(checklist.items) ? checklist.items : [];
  if (!items.length) {
    return `
      <section class="today-action-card" aria-label="定期回顾清单">
        <div>
          <span class="today-action-kicker">定期回顾清单</span>
          <strong>当前没有必须处理的回顾动作</strong>
          <p>每周或每次打开时，这里只会出现能立刻推进卡片盒维护的行动项。</p>
        </div>
        <button class="mini-btn is-ghost" type="button" data-today-action="open-writing">
          去写作中心
        </button>
      </section>
    `;
  }
  return `
    <section class="today-review-checklist" aria-label="定期回顾清单">
      <div class="today-review-heading">
        <span class="today-action-kicker">定期回顾清单</span>
        <strong>本次先处理 ${escape(items.length)} 个卡片盒维护动作</strong>
      </div>
      <div class="today-action-grid">
        ${items.map((item) => renderItem(item)).join("")}
      </div>
    </section>
  `;
}
