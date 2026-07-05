function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const GRAPH_READING_LENS_META = {
  insight: {
    key: "insight",
    label: "下一步做什么",
    hint: "系统把孤立笔记、中心笔记和关系密集区提到前面，适合不知道从哪里开始时使用。"
  },
  bridge: {
    key: "bridge",
    label: "哪里还缺",
    hint: "突出还没连起来、缺证据、缺反方或缺边界的地方，适合补强知识网络。"
  },
  argument: {
    key: "argument",
    label: "核心观点",
    hint: "突出证据、反方和边界，帮助你判断哪些想法已经能进入写作。"
  }
};

export function graphReadingLensMeta(value = "insight") {
  const key = String(value || "insight").trim().toLowerCase();
  return GRAPH_READING_LENS_META[key] || GRAPH_READING_LENS_META.insight;
}

export function renderGraphReadingLensControls(activeLens = "insight", legendOpen = false, trailingMarkup = "", deps = {}) {
  const escapeHtml = deps.escapeHtml || defaultEscapeHtml;
  const active = graphReadingLensMeta(activeLens);
  return `
    <div class="graph-reading-lens-row">
      <div class="graph-reading-lens" aria-label="图谱当前任务">
        <span>现在看</span>
        ${Object.values(GRAPH_READING_LENS_META)
          .map((item) => {
            const selected = item.key === active.key;
            return `<button class="graph-reading-lens-btn${selected ? " is-active" : ""}" type="button" data-graph-reading-lens="${escapeHtml(item.key)}" aria-pressed="${selected}" title="${escapeHtml(item.hint)}">${escapeHtml(item.label)}</button>`;
          })
          .join("")}
        <small>${escapeHtml(active.hint)}</small>
      </div>
      <div class="graph-reading-lens-side">
        ${trailingMarkup || ""}
        <button class="mini-btn is-ghost graph-legend-inline-btn" id="graphLegendToggle" type="button" aria-expanded="${legendOpen}" aria-label="${legendOpen ? "隐藏图例" : "查看图例"}">${legendOpen ? "隐藏图例" : "图例"}</button>
      </div>
    </div>
  `;
}
