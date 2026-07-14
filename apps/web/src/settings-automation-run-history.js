const SNAPSHOT_LABELS = Object.freeze({
  inboxList: "待处理内容列表",
  inboxDetail: "待处理内容详情",
  inboxDecision: "待处理内容结果",
  suggestionsList: "待处理建议列表",
  suggestionDetail: "建议详情",
  suggestionDecision: "建议处理结果",
  scheduledTasksList: "整理规则列表",
  scheduledTaskAction: "整理规则操作"
});

const SNAPSHOT_ORDER = Object.freeze([
  "suggestionDecision",
  "scheduledTaskAction",
  "suggestionsList",
  "scheduledTasksList",
  "inboxDecision",
  "inboxList",
  "inboxDetail",
  "suggestionDetail"
]);

function escapeHtmlValue(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCapturedAt(value = "") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value || "刚刚");
  return date.toLocaleString("zh-CN");
}

export function automationRunHistoryItems(snapshots = {}) {
  return SNAPSHOT_ORDER
    .map((key) => {
      const snapshot = snapshots?.[key] || null;
      if (!snapshot) return null;
      return {
        key,
        title: SNAPSHOT_LABELS[key] || key,
        capturedAt: snapshot.capturedAt || "",
        runtime: snapshot.runtime || null,
        canonical: snapshot.canonical || null
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const timeA = new Date(a.capturedAt).getTime();
      const timeB = new Date(b.capturedAt).getTime();
      return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
    });
}

function renderDiagnosticPayload(item) {
  return `
    <details class="settings-automation-run-diagnostics">
      <summary>查看细节</summary>
      <div class="settings-canonical-grid">
        <div class="settings-canonical-block">
          <div class="settings-canonical-label">整理状态</div>
          <pre class="settings-code settings-canonical-code">${escapeHtmlValue(JSON.stringify(item.runtime, null, 2) || "null")}</pre>
        </div>
        <div class="settings-canonical-block">
          <div class="settings-canonical-label">记录内容</div>
          <pre class="settings-code settings-canonical-code">${escapeHtmlValue(JSON.stringify(item.canonical, null, 2) || "null")}</pre>
        </div>
      </div>
    </details>
  `;
}

export function renderSettingsAutomationRunHistory({ snapshots = {} } = {}) {
  const items = automationRunHistoryItems(snapshots);
  if (!items.length) {
    return `<div class="settings-canonical-empty">还没有整理记录。</div>`;
  }
  return `
    <div class="settings-automation-run-list">
      ${items.slice(0, 5).map((item) => `
        <article class="settings-automation-run-row">
          <div class="settings-automation-run-main">
            <strong>${escapeHtmlValue(item.title)}</strong>
            <span>${escapeHtmlValue(formatCapturedAt(item.capturedAt))}</span>
          </div>
          ${renderDiagnosticPayload(item)}
        </article>
      `).join("")}
    </div>
  `;
}
