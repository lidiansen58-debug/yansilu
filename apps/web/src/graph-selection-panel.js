function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultIcon(name = "") {
  return `<span aria-hidden="true">${defaultEscapeHtml(name)}</span>`;
}

function defaultSafeActionAttrs(value = "") {
  return String(value || "").trim();
}

function graphSelectionPanelDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    renderGraphIcon: deps.renderGraphIcon || defaultIcon,
    graphSafeActionAttrs: deps.graphSafeActionAttrs || defaultSafeActionAttrs
  };
}

export function renderGraphSelectionMetricsView(items = [], deps = {}) {
  const { escapeHtml } = graphSelectionPanelDeps(deps);
  return items
    .filter((item) => item && String(item.value || "").trim())
    .map(
      (item) => `
        <span>
          <small>${escapeHtml(item.label)}</small>
          <strong>${escapeHtml(item.value)}</strong>
          ${item.hint ? `<em>${escapeHtml(item.hint)}</em>` : ""}
        </span>
      `
    )
    .join("");
}

export function renderGraphSelectionTaskView(task = null, deps = {}) {
  const { escapeHtml, graphSafeActionAttrs } = graphSelectionPanelDeps(deps);
  if (!task || typeof task !== "object") return "";
  const tone = String(task.tone || "neutral").trim().toLowerCase() || "neutral";
  const status = String(task.status || "").trim();
  const detail = String(task.detail || "").trim();
  const badge = String(task.badge || "").trim();
  const actionLabel = String(task.actionLabel || "").trim();
  const actionAttrs = graphSafeActionAttrs(task.actionAttrs);
  if (!status && !detail) return "";
  return `
    <section class="graph-selection-task is-${escapeHtml(tone)}" aria-label="建议下一步">
      <div>
        <span>下一步</span>
        ${status ? `<strong>${escapeHtml(status)}</strong>` : ""}
        ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
      </div>
      <div class="graph-selection-task-actions">
        ${badge ? `<small>${escapeHtml(badge)}</small>` : ""}
        ${actionLabel && actionAttrs ? `<button class="graph-selection-action is-primary" type="button" ${actionAttrs}>${escapeHtml(actionLabel)}</button>` : ""}
      </div>
    </section>
  `;
}

export function renderGraphPromptDetailsView(title = "思考提示", prompts = [], deps = {}) {
  const { escapeHtml } = graphSelectionPanelDeps(deps);
  const items = (Array.isArray(prompts) ? prompts : []).map((prompt) => String(prompt || "").trim()).filter(Boolean);
  if (!items.length) return "";
  return `
    <details class="graph-selection-details graph-selection-prompt-details">
      <summary>${escapeHtml(title)}</summary>
      <section class="graph-selection-prompts">
        ${items.map((prompt) => `<p>${escapeHtml(prompt)}</p>`).join("")}
      </section>
    </details>
  `;
}

export function renderGraphSelectionShellView({ className = "", ariaLabel = "", kicker = "", title = "", meta = "", closeLabel = "关闭", roleLabel = "", roleDetail = "", task = null, body = "", actions = "" } = {}, deps = {}) {
  const { escapeHtml, renderGraphIcon } = graphSelectionPanelDeps(deps);
  const classes = ["graph-selection-panel", String(className || "").trim()].filter(Boolean).join(" ");
  return `
    <aside class="${escapeHtml(classes)}" aria-label="${escapeHtml(ariaLabel || title || "图谱详情")}">
      <div class="graph-selection-head">
        <div>
          <span class="graph-selection-kicker">${escapeHtml(kicker || "详情")}</span>
          <strong>${escapeHtml(title || "未命名对象")}</strong>
          ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
        </div>
        <button class="graph-overlay-close graph-selection-close" type="button" data-graph-selection-close aria-label="${escapeHtml(closeLabel)}" title="${escapeHtml(closeLabel)}">${renderGraphIcon("close")}</button>
      </div>
      ${
        roleLabel || roleDetail
          ? `<section class="graph-selection-role">
              ${roleLabel ? `<span>${escapeHtml(roleLabel)}</span>` : ""}
              ${roleDetail ? `<p>${escapeHtml(roleDetail)}</p>` : ""}
            </section>`
          : ""
      }
      ${renderGraphSelectionTaskView(task, deps)}
      ${body ? `<div class="graph-selection-body">${body}</div>` : ""}
      ${actions ? `<div class="graph-selection-actions">${actions}</div>` : ""}
    </aside>
  `;
}
