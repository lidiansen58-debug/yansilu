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
    label: "重点笔记",
    hint: "突出最值得先点开的笔记，帮你发现可能长出新观点的地方。"
  },
  bridge: {
    key: "bridge",
    label: "找连接",
    hint: "突出还没连起来的笔记，帮你判断哪里需要关联另一条笔记。"
  },
  argument: {
    key: "argument",
    label: "查观点",
    hint: "突出证据、反方和边界，帮你检查这个想法站不站得住。"
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
      <div class="graph-reading-lens" aria-label="图谱优先查看内容">
        <span>先看什么</span>
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
