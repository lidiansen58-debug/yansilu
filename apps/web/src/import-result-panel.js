function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderImportResultPanel({
  data = {},
  title = "操作结果",
  subtitle = "",
  tone = "ok",
  statusLabel = "完成",
  metrics = [],
  warnings = [],
  actions = [],
  writingActionsHtml = "",
  skipBreakdownHtml = "",
  candidatePreviewHtml = "",
  writingDetailsHtml = "",
  raw = ""
} = {}) {
  const stage = String(data.stage || "");
  return `
    <div class="result-card" data-result-stage="${escapeHtml(stage)}">
      <div class="result-card-head">
        <div>
          <div class="result-title">${escapeHtml(title)}</div>
          ${subtitle ? `<div class="result-subtitle">${escapeHtml(subtitle)}</div>` : ""}
        </div>
        <div class="result-status ${tone === "ok" ? "" : tone}">${escapeHtml(statusLabel)}</div>
      </div>
      ${
        metrics.length
          ? `<div class="result-metrics">${metrics
              .map((item) => `<div class="result-metric"><span>${escapeHtml(item.label)}</span><strong title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</strong></div>`)
              .join("")}</div>`
          : ""
      }
      ${
        warnings.length
          ? `<div class="result-warnings"><div class="result-warnings-title">需要注意</div><ul>${warnings
              .map((item) => `<li><strong>${escapeHtml(item.code || "WARNING")}</strong> ${escapeHtml(item.message || JSON.stringify(item))}</li>`)
              .join("")}</ul></div>`
          : ""
      }
      ${
        actions.length
          ? `<div class="result-actions"><div class="result-actions-title">建议动作</div><ol>${actions
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ol></div>`
          : ""
      }
      ${writingActionsHtml}
      ${skipBreakdownHtml}
      ${candidatePreviewHtml}
      ${writingDetailsHtml}
      <details class="result-json" open>
        <summary>原始 JSON</summary>
        <pre>${escapeHtml(raw)}</pre>
      </details>
    </div>
  `;
}
