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
  const recovery = data.importRecord?.recoveryResult;
  if (recovery) {
    const labels = { verified: "内容已核对", changed: "内容已变化", missing: "文件已缺失" };
    return `<div class="result-file-inventory"><strong>中断后的文件核查</strong>
      <ul>${recovery.files.map(file => `<li>${escapeHtml(labels[file.status] || "待核查")}：${escapeHtml(file.relativePath)}</li>`).join("")}
      ${recovery.pending ? `<li>结果未确认：${escapeHtml(recovery.pending.noteId)}</li>` : ""}</ul>
      <p>${recovery.checkpointAvailable ? "未确认项不会自动重导，请核对后再处理。" : "旧记录没有逐项检查点，请手动核对笔记库。"}</p></div>`;
  }
  const createdFiles = createdFilesFromResultData(data);
  if (!createdFiles.length) return "";
  return `
    <div class="result-file-inventory">
      <strong>本次写入</strong>
      <div class="result-file-types">${fileTypeSummary(createdFiles).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
  `;
}

function warningText(item = {}, includeCode = true) {
  const code = includeCode ? String(item.code || "").trim() : "";
  const message = String(item.message || "").trim();
  const detail = String(item.detail || "").trim();
  if (code && message && detail) return `${code}: ${message} 详情：${detail}`;
  if (code && message) return `${code}: ${message}`;
  return message && detail ? `${message} 详情：${detail}` : message || code || JSON.stringify(item);
}

function renderDetailSection(title = "", content = "", extraClass = "", open = false) {
  if (!content) return "";
  const className = ["result-detail-section", extraClass].filter(Boolean).join(" ");
  return `
    <details class="${escapeHtml(className)}"${open ? " open" : ""}>
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
  const previewing = stage === "preview" || (stage === "record" && data.importRecord?.status === "preview");
  const completedImport = stage === "confirm" || (stage === "record" && data.importRecord?.status === "completed");
  const metricsHtml = metrics.length && !(previewing && candidatePreviewHtml)
    ? `<div class="result-metrics compact">${metrics.map(item => `<div class="result-metric"><span>${escapeHtml(item.label)}</span><strong title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</strong></div>`).join("")}</div>` : "";
  const hasSpecificOriginalityWarning = warnings.some(item => ["ORIGINALITY_BLOCKED", "ORIGINALITY_WARNING"].includes(item.code));
  const visibleWarnings = warnings.filter(item =>
    !(data.importRecord?.recoveryResult && ["IMPORT_INTERRUPTED", "IMPORT_RECOVERY_FILE", "IMPORT_RECOVERY_PENDING"].includes(item.code))
    && !(hasSpecificOriginalityWarning && ["ORIGINALITY_GUARD_BLOCKED", "ORIGINALITY_GUARD_WARNING"].includes(item.code)));
  return `
    <div class="result-card" data-result-stage="${escapeHtml(stage)}">
      <div class="result-card-head">
        <div>
          <div class="result-title">${escapeHtml(title)}</div>
          ${subtitle && !previewing && !completedImport ? `<div class="result-subtitle">${escapeHtml(subtitle)}</div>` : ""}
        </div>
        <div class="result-status ${tone === "ok" ? "" : tone}">${escapeHtml(statusLabel)}</div>
      </div>
      ${brief ? `<div class="result-brief ${tone === "ok" ? "" : tone}">${escapeHtml(brief)}</div>` : ""}
      ${completedImport ? "" : metricsHtml}
      ${renderFileInventory(data)}
      ${writingActionsHtml}
      ${
        visibleWarnings.length
          ? `<div class="result-warnings simple"><div class="result-warnings-title">需要处理</div><ul>${visibleWarnings
              .slice(0, 3)
              .map((item) => `<li>${escapeHtml(warningText(item, !previewing))}</li>`)
              .join("")}</ul></div>`
          : ""
      }
      ${previewing ? renderDetailSection("导入明细", candidatePreviewHtml, "result-candidates-detail", true) : ""}
      ${
        actions.length
          ? `<div class="result-actions simple"><div class="result-actions-title">建议下一步</div><ul>${actions
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul></div>`
          : ""
      }
      ${!previewing ? renderDetailSection("导入明细", `${completedImport ? metricsHtml : ""}${candidatePreviewHtml}`, "result-candidates-detail") : ""}
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
