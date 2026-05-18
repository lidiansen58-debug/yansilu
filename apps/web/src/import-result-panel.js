function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function noteTypeLabel(noteType = "") {
  const labels = {
    source: "来源",
    literature: "文献",
    permanent: "永久",
    asset: "资源"
  };
  return labels[String(noteType || "").trim()] || "文件";
}

function createdFilesFromResultData(data = {}) {
  const stage = String(data.stage || "").trim();
  if (stage === "confirm") return Array.isArray(data.result?.createdFiles) ? data.result.createdFiles : [];
  if (stage === "record") return Array.isArray(data.importRecord?.confirmResult?.createdFiles) ? data.importRecord.confirmResult.createdFiles : [];
  return [];
}

function fileTypeCounts(files = []) {
  const counts = new Map();
  for (const file of files) {
    const type = String(file?.noteType || "file").trim() || "file";
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return [...counts.entries()];
}

function renderFileInventory(data = {}) {
  const createdFiles = createdFilesFromResultData(data);
  if (!createdFiles.length) return "";
  const shown = createdFiles.slice(0, 8);
  const hiddenCount = Math.max(0, createdFiles.length - shown.length);
  return `
    <div class="result-file-inventory">
      <div class="result-file-inventory-head">
        <strong>写入文件</strong>
        <span>${createdFiles.length} 项</span>
      </div>
      <div class="result-file-types">
        ${fileTypeCounts(createdFiles)
          .map(([type, count]) => `<span>${escapeHtml(noteTypeLabel(type))} ${count}</span>`)
          .join("")}
      </div>
      <div class="result-file-list">
        ${shown
          .map(
            (file) => `
              <div class="result-file-row">
                <span class="result-file-type">${escapeHtml(noteTypeLabel(file.noteType))}</span>
                <code>${escapeHtml(file.path || file.noteId || "")}</code>
              </div>
            `
          )
          .join("")}
        ${hiddenCount ? `<div class="result-file-more">还有 ${hiddenCount} 项未展开</div>` : ""}
      </div>
    </div>
  `;
}

export function renderImportResultPanel({
  data = {},
  title = "操作结果",
  subtitle = "",
  brief = "",
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
      ${brief ? `<div class="result-brief ${tone === "ok" ? "" : tone}">${escapeHtml(brief)}</div>` : ""}
      ${
        metrics.length
          ? `<div class="result-metrics">${metrics
              .map((item) => `<div class="result-metric"><span>${escapeHtml(item.label)}</span><strong title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</strong></div>`)
              .join("")}</div>`
          : ""
      }
      ${renderFileInventory(data)}
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
      <details class="result-json">
        <summary>原始 JSON</summary>
        <pre>${escapeHtml(raw)}</pre>
      </details>
    </div>
  `;
}
