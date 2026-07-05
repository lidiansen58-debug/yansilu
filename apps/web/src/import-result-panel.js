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

function fileTypeSummary(files = []) {
  const counts = new Map();
  for (const file of files) {
    const type = String(file?.noteType || "file").trim() || "file";
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return [...counts.entries()].map(([type, count]) => `${noteTypeLabel(type)} ${count}`);
}

function renderFileInventory(data = {}) {
  const createdFiles = createdFilesFromResultData(data);
  if (!createdFiles.length) return "";
  return `
    <div class="result-file-inventory">
      <strong>本次写入</strong>
      <div class="result-file-types">${fileTypeSummary(createdFiles).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
  `;
}

function organizingOverviewFromData(data = {}) {
  return data.result?.organizingOverview || data.importRecord?.confirmResult?.organizingOverview || null;
}

function renderOrganizingOverview(data = {}) {
  const overview = organizingOverviewFromData(data);
  if (!overview || Number(overview.permanentCount || 0) <= 0) return "";
  const recommended = Array.isArray(overview.recommendedFirst) ? overview.recommendedFirst : [];
  const themes = Array.isArray(overview.themeCandidates) ? overview.themeCandidates : [];
  const firstRecommended = recommended.find((item) => item?.noteId || item?.id) || null;
  const firstTheme = themes.find((item) => item?.title) || null;
  return `
    <section class="import-organizing-home" aria-label="导入后的整理首页">
      <div class="import-organizing-home-head">
        <div>
          <strong>导入完成，回到首页</strong>
          <p>今天只保留三件事：未关联笔记、可成主题、可进入写作。</p>
        </div>
        <button class="mini-btn primary" type="button" data-import-writing-action="open-today">
          去首页
        </button>
      </div>
      <div class="import-organizing-home-actions" aria-label="导入后的主操作">
        <div><span>未关联笔记</span><strong>${escapeHtml(firstRecommended?.title || firstRecommended?.noteId || "已完成")}</strong></div>
        <div><span>可成主题</span><strong>${escapeHtml(firstTheme?.title || "先完成建联")}</strong></div>
        <div><span>可进入写作</span><strong>${escapeHtml(overview.writingReady ? firstTheme?.title || "已有主题" : "先整理主题")}</strong></div>
      </div>
      <div class="import-organizing-home-metrics">
        <div><span>导入永久笔记</span><strong>${escapeHtml(overview.permanentCount)}</strong></div>
        <div><span>还未关联</span><strong>${escapeHtml(overview.isolatedCount || 0)}</strong></div>
        <div><span>已有关系</span><strong>${escapeHtml(overview.connectedCount || 0)}</strong></div>
      </div>
    </section>
  `;
}

function warningText(item = {}) {
  const code = String(item.code || "").trim();
  const message = String(item.message || "").trim();
  const detail = String(item.detail || "").trim();
  if (code && message && detail) return `${code}: ${message} 详情：${detail}`;
  if (code && message) return `${code}: ${message}`;
  return message || code || JSON.stringify(item);
}

function renderDetailSection(title = "", content = "", extraClass = "") {
  if (!content) return "";
  const className = ["result-detail-section", extraClass].filter(Boolean).join(" ");
  return `
    <details class="${escapeHtml(className)}">
      <summary>${escapeHtml(title)}</summary>
      <div class="result-detail-body">${content}</div>
    </details>
  `;
}

export function renderImportResultPanel({
  data = {},
  title = "最近一次执行结果",
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
          ? `<div class="result-metrics compact">${metrics
              .map((item) => `<div class="result-metric"><span>${escapeHtml(item.label)}</span><strong title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</strong></div>`)
              .join("")}</div>`
          : ""
      }
      ${renderFileInventory(data)}
      ${renderOrganizingOverview(data)}
      ${
        warnings.length
          ? `<div class="result-warnings simple"><div class="result-warnings-title">需要处理</div><ul>${warnings
              .slice(0, 3)
              .map((item) => `<li>${escapeHtml(warningText(item))}</li>`)
              .join("")}</ul></div>`
          : ""
      }
      ${
        actions.length
          ? `<div class="result-actions simple"><div class="result-actions-title">建议下一步</div><ul>${actions
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul></div>`
          : ""
      }
      ${writingActionsHtml}
      ${renderDetailSection("导入明细", candidatePreviewHtml, "result-candidates-detail")}
      ${renderDetailSection("跳过与保留", skipBreakdownHtml, "result-skip-detail")}
      ${renderDetailSection("写作后续", writingDetailsHtml, "result-writing-detail")}
      ${
        raw
          ? `<details class="result-json result-detail-section">
              <summary>原始数据</summary>
              <div class="result-detail-body">
                <pre>${escapeHtml(raw)}</pre>
              </div>
            </details>`
          : ""
      }
    </div>
  `;
}
